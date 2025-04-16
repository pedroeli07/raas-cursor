const fs = require('fs');
const path = require('path');

const searchDirectories = [
  path.join(__dirname, 'src', 'components', 'ui'),
  path.join(__dirname, 'src', 'components'),
  path.join(__dirname, 'src', 'app')
];

const oldImport = 'import { cn } from "@/lib/utils/utils"';
const newImport = 'import { cn } from "@/lib/utils/utils"';

// Função para ler arquivos recursivamente em um diretório
function processDirectory(directoryPath) {
  const files = fs.readdirSync(directoryPath);

  files.forEach(file => {
    const filePath = path.join(directoryPath, file);
    const stats = fs.statSync(filePath);

    if (stats.isDirectory()) {
      processDirectory(filePath);
    } else if (stats.isFile() && (filePath.endsWith('.tsx') || filePath.endsWith('.ts'))) {
      replaceInFile(filePath);
    }
  });
}

// Função para substituir texto em um arquivo
function replaceInFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    
    if (content.includes(oldImport)) {
      console.log(`Updating import in ${filePath}`);
      content = content.replace(new RegExp(oldImport, 'g'), newImport);
      fs.writeFileSync(filePath, content, 'utf8');
    }
  } catch (error) {
    console.error(`Error processing ${filePath}:`, error);
  }
}

// Iniciar processamento em todos os diretórios alvo
searchDirectories.forEach(dir => {
  try {
    if (fs.existsSync(dir)) {
      console.log(`Processing directory: ${dir}`);
      processDirectory(dir);
    } else {
      console.log(`Directory doesn't exist: ${dir}`);
    }
  } catch (err) {
    console.error(`Error accessing directory ${dir}:`, err);
  }
});

console.log('Import updates completed!'); 