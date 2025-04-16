import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Obter o diretório atual em ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Criar diretório para screenshots se não existir
const screenshotsDir = path.join(__dirname, 'screenshots');
if (!fs.existsSync(screenshotsDir)) {
  fs.mkdirSync(screenshotsDir);
}

// Função para registrar logs
function log(message) {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] ${message}`;
  console.log(logMessage);
  
  fs.appendFileSync(
    path.join(__dirname, 'boleto-manual-test.log'),
    logMessage + '\n'
  );
}

// Função utilitária para esperar
const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function runTest() {
  log('Iniciando teste manual da página de geração de boletos');
  
  const browser = await puppeteer.launch({
    headless: false, // Para visualizar o teste
    defaultViewport: null, // Usar viewport completo
    args: ['--start-maximized'], // Iniciar maximizado
  });
  
  try {
    const page = await browser.newPage();
    log('Navegador aberto com sucesso');
    
    // Configurar interceção de console logs do navegador
    page.on('console', message => {
      log(`Browser Console: ${message.text()}`);
    });
    
    // Navegar para a página de boletos diretamente
    log('Navegando para página de geração de boletos');
    await page.goto('http://localhost:3000/admin/gerar-boleto', { 
      waitUntil: 'domcontentloaded',
      timeout: 60000 // 60 segundos para carregar
    });
    
    // Esperar por 5 segundos para garantir que a página carregue visualmente
    await wait(5000);
    
    log('Tirando screenshot da página de boletos');
    await page.screenshot({ 
      path: path.join(screenshotsDir, 'boleto-page.png'),
      fullPage: true
    });
    
    // Mensagem para o usuário
    log('Screenshot capturado! Agora você pode interagir manualmente com a página.');
    log('O navegador permanecerá aberto por 2 minutos para testes manuais.');
    log('Você pode arrastar e redimensionar o componente React-Rnd para testar.');
    
    // Manter o navegador aberto por 2 minutos para testes manuais
    await wait(120000); // 2 minutos
    
    log('Teste manual concluído');
  } catch (error) {
    log(`ERRO: ${error.message}`);
    console.error(error);
    
    // Tirar screenshot do erro
    const page = (await browser.pages())[0];
    if (page) {
      await page.screenshot({ path: path.join(screenshotsDir, 'error.png') });
    }
  } finally {
    await browser.close();
    log('Navegador fechado');
  }
}

// Executar o teste
runTest().catch(error => {
  console.error('Erro fatal ao executar o teste:', error);
  process.exit(1);
}); 