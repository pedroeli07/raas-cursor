#!/usr/bin/env node

import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get directory name in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const config = {
  baseUrl: 'http://localhost:3000',
  credentials: {
    email: 'pedro-eli@hotmail.com',
    password: 'password123', // Substitua pela senha correta
  },
  routes: [
    { path: '/dashboard/admin/distribuidoras', name: 'Distribuidoras' },
    { path: '/dashboard/admin/instalacoes', name: 'Instalações' },
    { path: '/dashboard/admin/users', name: 'Usuários' },
    { path: '/dashboard/admin/convites', name: 'Convites' }
  ],
  logPath: path.join(__dirname, 'debug-access.log'),
  screenshotDir: path.join(__dirname, 'debug-screenshots')
};

// Ensure screenshot directory exists
if (!fs.existsSync(config.screenshotDir)) {
  fs.mkdirSync(config.screenshotDir, { recursive: true });
}

// Clear log file
fs.writeFileSync(config.logPath, '');

// Logger
const logger = {
  info: (message) => {
    const logEntry = `[INFO] [${new Date().toISOString()}] ${message}`;
    console.log(logEntry);
    fs.appendFileSync(config.logPath, logEntry + '\n');
  },
  error: (message, error = null) => {
    const errorMessage = error ? `${message}: ${error.message || error}` : message;
    const logEntry = `[ERROR] [${new Date().toISOString()}] ${errorMessage}`;
    console.error(logEntry);
    fs.appendFileSync(config.logPath, logEntry + '\n');
    if (error && error.stack) {
      fs.appendFileSync(config.logPath, `${error.stack}\n`);
    }
  },
  debug: (message) => {
    const logEntry = `[DEBUG] [${new Date().toISOString()}] ${message}`;
    console.log(logEntry);
    fs.appendFileSync(config.logPath, logEntry + '\n');
  }
};

// Helper function to take screenshots
async function takeScreenshot(page, name) {
  const fileName = `${name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}-${Date.now()}.png`;
  const filePath = path.join(config.screenshotDir, fileName);
  await page.screenshot({ path: filePath, fullPage: true });
  logger.info(`Screenshot salvo: ${fileName}`);
  return filePath;
}

// Main function
async function runDebugCheck() {
  logger.info('Iniciando verificação de acesso administrativo');
  
  // Launch browser with visible window
  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: { width: 1366, height: 768 },
    args: ['--window-size=1366,768', '--no-sandbox', '--disable-setuid-sandbox'],
  });
  
  const page = await browser.newPage();
  
  // Forward console logs from browser
  page.on('console', message => {
    const type = message.type();
    const text = message.text();
    
    if (type === 'error') {
      logger.error(`Console do navegador: ${text}`);
    } else {
      logger.debug(`Console do navegador [${type}]: ${text}`);
    }
  });
  
  // Capture network errors
  page.on('requestfailed', request => {
    const failure = request.failure();
    logger.error(`Falha de requisição: ${request.url()} - ${failure ? failure.errorText : 'Erro desconhecido'}`);
  });
  
  // Capture network responses
  page.on('response', response => {
    const status = response.status();
    const url = response.url();
    
    if (status >= 400) {
      logger.error(`Resposta HTTP ${status}: ${url}`);
    } else if (url.includes('/api/') || url.includes('/_next/data/')) {
      logger.debug(`Resposta HTTP ${status}: ${url}`);
    }
  });
  
  try {
    // Check if app is running
    logger.info(`Verificando se a aplicação está rodando em ${config.baseUrl}`);
    try {
      await page.goto(config.baseUrl, { 
        timeout: 10000,
        waitUntil: 'networkidle2'
      });
      logger.info('Aplicação acessível');
      await takeScreenshot(page, 'homepage');
    } catch (error) {
      logger.error('Aplicação não está acessível', error);
      await takeScreenshot(page, 'app-not-running');
      throw new Error('Não foi possível acessar a aplicação');
    }
    
    // Try to login
    logger.info(`Fazendo login como ${config.credentials.email}`);
    try {
      await page.goto(`${config.baseUrl}/login`, { waitUntil: 'networkidle2' });
      
      // Wait for login form to appear
      await page.waitForSelector('input[name="email"]', { timeout: 5000 });
      
      // Fill login form
      await page.type('input[name="email"]', config.credentials.email);
      await page.type('input[name="password"]', config.credentials.password);
      
      // Take screenshot before submitting
      await takeScreenshot(page, 'login-form-filled');
      
      // Submit form
      await Promise.all([
        page.click('button[type="submit"]'),
        page.waitForNavigation({ waitUntil: 'networkidle2' })
      ]);
      
      // Check if login was successful (should be redirected to dashboard)
      const currentUrl = page.url();
      if (currentUrl.includes('/dashboard')) {
        logger.info('Login bem-sucedido');
        await takeScreenshot(page, 'after-login');
      } else {
        logger.error(`Login falhou - redirecionado para ${currentUrl}`);
        await takeScreenshot(page, 'login-failed');
        throw new Error('Falha no login');
      }
    } catch (error) {
      logger.error('Erro durante o processo de login', error);
      await takeScreenshot(page, 'login-error');
      throw new Error('Falha no processo de login');
    }
    
    // Access each admin route and check for errors
    for (const route of config.routes) {
      logger.info(`Acessando rota administrativa: ${route.name} (${route.path})`);
      
      try {
        await page.goto(`${config.baseUrl}${route.path}`, { 
          waitUntil: 'networkidle2',
          timeout: 15000
        });
        
        // Wait for page to load completely
        await page.waitForTimeout(2000);
        
        // Check if we're still on the correct page (not redirected to login)
        const currentUrl = page.url();
        if (currentUrl.includes(route.path)) {
          logger.info(`Acesso bem-sucedido à rota: ${route.name}`);
          
          // Look for error messages on the page
          const errorElements = await page.$$('text/erro, text/falha, text/error, .error, .alert-error');
          if (errorElements.length > 0) {
            logger.error(`Encontrados ${errorElements.length} elementos de erro na página ${route.name}`);
          }
          
          // Take screenshot of the page
          await takeScreenshot(page, `route-${route.name.toLowerCase()}`);
          
          // Check for specific API errors related to this page
          const pageContent = await page.content();
          if (pageContent.includes('ERR_CONNECTION_REFUSED') || 
              pageContent.includes('Failed to fetch') ||
              pageContent.includes('Network Error')) {
            logger.error(`Erros de conexão detectados na página ${route.name}`);
          }
        } else {
          logger.error(`Redirecionado inesperadamente para ${currentUrl} ao tentar acessar ${route.name}`);
          await takeScreenshot(page, `redirect-from-${route.name.toLowerCase()}`);
        }
      } catch (error) {
        logger.error(`Erro ao acessar rota ${route.name}`, error);
        await takeScreenshot(page, `error-${route.name.toLowerCase()}`);
      }
    }
    
    logger.info('Verificação de acesso administrativo concluída');
  } catch (error) {
    logger.error('Erro fatal na verificação de acesso', error);
  } finally {
    // Get all cookies for debugging
    try {
      const cookies = await page.cookies();
      logger.debug(`Cookies: ${JSON.stringify(cookies, null, 2)}`);
    } catch (e) {
      logger.error('Erro ao obter cookies', e);
    }
    
    // Close browser
    logger.info('Fechando navegador');
    await browser.close();
  }
}

// Run the debug check
(async () => {
  try {
    await runDebugCheck();
  } catch (error) {
    logger.error('Erro na execução principal', error);
    process.exit(1);
  }
})(); 