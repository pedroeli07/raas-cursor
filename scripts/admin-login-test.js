import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Para obter o __dirname em ambiente ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Constantes
const BASE_URL = 'http://localhost:3000';
const EMAIL = 'pedro-eli@hotmail.com';
const PASSWORD = 'galod1234';
const LOG_FILE = path.join(__dirname, 'admin-test.log');

// Função para logar com timestamp
function log(message) {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] ${message}\n`;
  console.log(logMessage.trim());
  fs.appendFileSync(LOG_FILE, logMessage);
}

// Limpar arquivo de log anterior
fs.writeFileSync(LOG_FILE, '');

async function testAdminAccess() {
  log('Iniciando teste de acesso administrativo');
  
  const browser = await puppeteer.launch({ 
    headless: true, // Modo headless para não abrir janela do navegador
    defaultViewport: { width: 1280, height: 800 }
  });
  
  const page = await browser.newPage();
  
  // Capturar logs do console
  page.on('console', message => {
    log(`CONSOLE: ${message.type().toUpperCase()}: ${message.text()}`);
  });
  
  // Monitorar requisições de rede
  page.on('response', async response => {
    const url = response.url();
    const status = response.status();
    
    if (url.includes('/api/')) {
      log(`API RESPONSE: ${url} - Status: ${status}`);
      
      if (status >= 400) {
        try {
          const text = await response.text();
          log(`ERROR RESPONSE: ${text}`);
        } catch (e) {
          log(`Não foi possível obter o corpo da resposta: ${e.message}`);
        }
      }
    }
  });
  
  try {
    // Ir diretamente para a página de login
    log(`Navegando para ${BASE_URL}/login`);
    await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle2' });
    
    // Esperar pelos campos de login
    log('Aguardando campos de login...');
    await page.waitForSelector('input[type="email"]', { timeout: 5000 });
    await page.waitForSelector('input[type="password"]', { timeout: 5000 });
    
    // Preencher credenciais
    log(`Preenchendo email: ${EMAIL}`);
    await page.type('input[type="email"]', EMAIL);
    
    log('Preenchendo senha');
    await page.type('input[type="password"]', PASSWORD);
    
    // Tirar screenshot do formulário preenchido
    await page.screenshot({ path: path.join(__dirname, 'login-form.png') });
    
    // Clicar no botão de login
    log('Clicando no botão de login');
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'networkidle2' }),
      page.click('button[type="submit"]')
    ]);
    
    // Verificar se o login foi bem-sucedido
    const loginSuccess = await page.evaluate(() => {
      return document.body.textContent.includes('Sair') || 
             document.body.textContent.includes('Logout') ||
             document.body.textContent.includes('Dashboard');
    });
    
    if (loginSuccess) {
      log('Login bem-sucedido!');
      await page.screenshot({ path: path.join(__dirname, 'after-login.png') });
    } else {
      log('ERRO: Login falhou');
      await page.screenshot({ path: path.join(__dirname, 'login-failed.png') });
      throw new Error('Falha no login');
    }
    
    // Testar acesso às páginas administrativas
    const adminPages = [
      { url: '/dashboard', name: 'Dashboard' },
      { url: '/distributors', name: 'Distribuidoras' },
      { url: '/installations', name: 'Instalações' },
      { url: '/invitations', name: 'Convites' },
      { url: '/users', name: 'Usuários' }
    ];
    
    for (const page of adminPages) {
      log(`Testando acesso a ${page.name}: ${BASE_URL}${page.url}`);
      await testPageAccess(browser, `${BASE_URL}${page.url}`, page.name);
    }
    
    // Testar API de distribuidoras
    log('Testando API de distribuidoras');
    const apiPage = await browser.newPage();
    const response = await apiPage.goto(`${BASE_URL}/api/distributors`, { waitUntil: 'networkidle2' });
    const responseText = await response.text();
    log(`Resposta da API de distribuidoras: ${response.status()}`);
    log(`Conteúdo: ${responseText.substring(0, 500)}${responseText.length > 500 ? '...' : ''}`);
    
    log('Teste concluído com sucesso!');
    
    // Manter o navegador aberto para inspeção
    log('Navegador aberto para inspeção. Pressione Ctrl+C para finalizar.');
    
  } catch (error) {
    log(`ERRO: ${error.message}`);
    await page.screenshot({ path: path.join(__dirname, 'error.png') });
  }
  
  // Não fechar o navegador para permitir inspeção manual
  // await browser.close();
}

async function testPageAccess(browser, url, pageName) {
  const page = await browser.newPage();
  
  try {
    await page.goto(url, { waitUntil: 'networkidle2' });
    
    // Capturar screenshot da página
    await page.screenshot({ path: path.join(__dirname, `${pageName.toLowerCase()}.png`) });
    
    // Verificar se o acesso foi bem-sucedido (não há mensagem de erro)
    const hasError = await page.evaluate(() => {
      return document.body.textContent.includes('não autorizado') || 
             document.body.textContent.includes('unauthorized') ||
             document.body.textContent.includes('access denied') ||
             document.body.textContent.includes('acesso negado');
    });
    
    if (hasError) {
      log(`ERRO: Acesso a ${pageName} falhou - Permissão negada`);
    } else {
      log(`Acesso a ${pageName} bem-sucedido`);
    }
    
  } catch (error) {
    log(`ERRO ao acessar ${pageName}: ${error.message}`);
  } finally {
    await page.close();
  }
}

// Executar o teste
testAdminAccess().catch(error => {
  log(`ERRO FATAL: ${error.message}`);
}); 