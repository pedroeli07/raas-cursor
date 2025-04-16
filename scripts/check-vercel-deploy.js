// Script para verificar erros que podem impedir o deploy no Vercel
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🔍 Iniciando verificação para deploy no Vercel');
console.log('================================================');

// Função para executar comandos e capturar saída
function runCommand(command, successMessage, errorMessage) {
  try {
    const output = execSync(command, { encoding: 'utf8' });
    console.log(`✅ ${successMessage}`);
    return { success: true, output };
  } catch (error) {
    console.error(`❌ ${errorMessage}`);
    console.error(`Erro: ${error.message}`);
    return { success: false, error: error.message, output: error.stdout };
  }
}

// Verificar arquivos importantes
console.log('\n📁 Verificando arquivos importantes...');

// Verificar next.config.js
if (fs.existsSync('next.config.js')) {
  console.log('✅ next.config.js encontrado');
} else {
  console.error('❌ next.config.js não encontrado');
}

// Verificar package.json
if (fs.existsSync('package.json')) {
  console.log('✅ package.json encontrado');
  
  // Verificar scripts no package.json
  try {
    const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    if (packageJson.scripts && packageJson.scripts.build) {
      console.log('✅ Script de build encontrado no package.json');
    } else {
      console.error('❌ Script de build não encontrado no package.json');
    }
  } catch (error) {
    console.error('❌ Erro ao ler package.json', error.message);
  }
} else {
  console.error('❌ package.json não encontrado');
}

// Verificar .env
console.log('\n🔐 Verificando variáveis de ambiente...');
if (fs.existsSync('.env')) {
  console.log('✅ Arquivo .env encontrado');
} else {
  console.log('ℹ️ Arquivo .env não encontrado. Certifique-se de configurar variáveis de ambiente no Vercel');
}

// Verificar dependências
console.log('\n📦 Verificando dependências...');
runCommand('npm list --depth=0', 'Dependências listadas com sucesso', 'Erro ao listar dependências');

// Executar lint
console.log('\n🧹 Executando verificação de lint...');
const lintResult = runCommand('npm run lint', 'Verificação de lint concluída sem erros', 'Erros de lint encontrados');

// Verificar conflitos de TypeScript
console.log('\n📘 Verificando TypeScript...');
const tsResult = runCommand('npx tsc --noEmit', 'Verificação de TypeScript concluída sem erros', 'Erros de TypeScript encontrados');

// Executar build
console.log('\n🏗️ Executando build...');
const buildResult = runCommand('npm run build', 'Build concluído com sucesso', 'Erro no build');

// Verificar problemas comuns
console.log('\n🔍 Verificando problemas comuns...');

// Função para procurar padrões em arquivos
function findInFiles(pattern, extensions, directories) {
  const results = [];
  
  for (const dir of directories) {
    if (!fs.existsSync(dir)) continue;
    
    const searchDir = (currentDir) => {
      const files = fs.readdirSync(currentDir, { withFileTypes: true });
      
      for (const file of files) {
        const filePath = path.join(currentDir, file.name);
        
        if (file.isDirectory() && file.name !== 'node_modules' && file.name !== '.next') {
          searchDir(filePath);
        } else if (file.isFile() && extensions.some(ext => file.name.endsWith(ext))) {
          const content = fs.readFileSync(filePath, 'utf8');
          if (content.match(pattern)) {
            results.push(filePath);
          }
        }
      }
    };
    
    searchDir(dir);
  }
  
  return results;
}

// Verificar importações incorretas
const incorrectImports = findInFiles(/from ['"]\.(?!\.|\/)|from ['"]\/(?!api)/, ['.ts', '.tsx'], ['src']);
if (incorrectImports.length > 0) {
  console.log('⚠️ Potenciais problemas de importação encontrados nos seguintes arquivos:');
  incorrectImports.forEach(file => console.log(`   - ${file}`));
} else {
  console.log('✅ Nenhum problema de importação encontrado');
}

// Verificar handlers de API sem retorno
const apiHandlersWithoutReturn = findInFiles(/export async function\s+\w+[^{]*{(?![^}]*return)/, ['.ts'], ['src/app/api']);
if (apiHandlersWithoutReturn.length > 0) {
  console.log('⚠️ Funções de API que podem não retornar nada encontradas nos seguintes arquivos:');
  apiHandlersWithoutReturn.forEach(file => console.log(`   - ${file}`));
} else {
  console.log('✅ Todos os handlers de API parecem retornar valores');
}

// Resumo
console.log('\n================================================');
console.log('📊 RESUMO DA VERIFICAÇÃO:');
console.log('================================================');

const allOk = lintResult.success && tsResult.success && buildResult.success && 
              incorrectImports.length === 0 && apiHandlersWithoutReturn.length === 0;

if (allOk) {
  console.log('✅ Tudo parece estar em ordem para deploy no Vercel!');
} else {
  console.log('⚠️ Foram encontrados problemas que podem afetar o deploy no Vercel:');
  
  if (!lintResult.success) console.log('  - Erros de lint');
  if (!tsResult.success) console.log('  - Erros de TypeScript');
  if (!buildResult.success) console.log('  - Erros de build');
  if (incorrectImports.length > 0) console.log('  - Problemas de importação');
  if (apiHandlersWithoutReturn.length > 0) console.log('  - Handlers de API sem retorno');
  
  console.log('\nRecomendação: Corrija os problemas antes de fazer deploy no Vercel.');
}

console.log('================================================'); 