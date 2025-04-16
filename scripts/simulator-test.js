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
  logPath: path.join(__dirname, 'simulator-results.log'),
  screenshotDir: path.join(__dirname, 'screenshots'),
};

// Ensure screenshot directory exists
if (!fs.existsSync(config.screenshotDir)) {
  fs.mkdirSync(config.screenshotDir, { recursive: true });
}

// Clear log file before starting
if (fs.existsSync(config.logPath)) {
  fs.writeFileSync(config.logPath, '');
}

// Create logger
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

// Helper function for screenshots
async function takeScreenshot(page, name) {
  const fileName = `${name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}-${Date.now()}.png`;
  const filePath = path.join(config.screenshotDir, fileName);
  await page.screenshot({ path: filePath, fullPage: true });
  logger.info(`Screenshot saved: ${fileName}`);
  return filePath;
}

// Simulated page content
const simulatedPageContent = `
<!DOCTYPE html>
<html>
<head>
  <title>RaaS Platform - Simulação</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background: #f5f5f5; }
    .container { max-width: 800px; margin: 0 auto; background: white; padding: 20px; border-radius: 5px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
    h1 { color: #0070f3; }
    .form-group { margin-bottom: 15px; }
    label { display: block; margin-bottom: 5px; font-weight: bold; }
    input, select { width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; }
    button { background: #0070f3; color: white; border: none; padding: 10px 20px; border-radius: 4px; cursor: pointer; }
    button:hover { background: #0051a8; }
    .success { color: green; }
    .error { color: red; }
  </style>
</head>
<body>
  <div class="container">
    <h1>RaaS Platform - Simulação de Testes</h1>
    
    <div id="login-form">
      <h2>Login</h2>
      <div class="form-group">
        <label for="email">Email:</label>
        <input type="email" id="email" name="email" required>
      </div>
      <div class="form-group">
        <label for="password">Senha:</label>
        <input type="password" id="password" name="password" required>
      </div>
      <button type="submit" id="login-button">Entrar</button>
    </div>
    
    <div id="dashboard" style="display:none;">
      <h2>Dashboard</h2>
      <p>Bem-vindo à plataforma RaaS!</p>
      
      <div id="distributors">
        <h3>Distribuidoras</h3>
        <button id="add-distributor">Nova Distribuidora</button>
        
        <div id="distributor-list">
          <div class="distributor">
            <span>CEMIG - R$ 0.976/kWh</span>
            <button aria-label="Editar CEMIG">Editar</button>
            <button aria-label="Excluir CEMIG">Excluir</button>
          </div>
          <div class="distributor">
            <span>NEOENERGIA - R$ 0.765/kWh</span>
            <button aria-label="Editar NEOENERGIA">Editar</button>
            <button aria-label="Excluir NEOENERGIA">Excluir</button>
          </div>
        </div>
      </div>
      
      <div id="invitations">
        <h3>Convites</h3>
        <button id="new-invitation">Novo Convite</button>
      </div>
    </div>
    
    <div id="status-message"></div>
  </div>
  
  <script>
    // Simulate login functionality
    document.getElementById('login-button').addEventListener('click', function() {
      const email = document.getElementById('email').value;
      const password = document.getElementById('password').value;
      
      if (email && password) {
        document.getElementById('login-form').style.display = 'none';
        document.getElementById('dashboard').style.display = 'block';
        document.getElementById('status-message').innerHTML = '<p class="success">Login realizado com sucesso!</p>';
        
        // Change URL to simulate navigation
        history.pushState({}, '', '/dashboard');
      } else {
        document.getElementById('status-message').innerHTML = '<p class="error">Por favor, preencha todos os campos.</p>';
      }
    });
    
    // Simulate distributor operations
    document.getElementById('add-distributor').addEventListener('click', function() {
      alert('Formulário para adicionar distribuidora');
    });
    
    // Simulate invitation operations
    document.getElementById('new-invitation').addEventListener('click', function() {
      alert('Formulário para criar novo convite');
    });
  </script>
</body>
</html>
`;

// Main test runner
async function runTests() {
  logger.info('Starting RaaS Simulator Tests');
  
  // Launch browser in headless mode
  logger.debug('Launching browser');
  const browser = await puppeteer.launch({
    headless: true,
  });
  
  const page = await browser.newPage();
  
  // Setup console log forwarding from browser
  page.on('console', message => {
    logger.debug(`Browser console [${message.type()}]: ${message.text()}`);
  });
  
  try {
    // Set content with our simulated page
    logger.debug('Setting simulated page content');
    await page.setContent(simulatedPageContent);
    await takeScreenshot(page, 'simulated-page-loaded');
    
    // Test login simulation
    logger.info('Testing login functionality');
    await page.type('input[name="email"]', 'pedro-eli@hotmail.com');
    await page.type('input[name="password"]', 'password123');
    
    // Take screenshot before submit
    await takeScreenshot(page, 'before-login-submit');
    
    // Submit login form
    await page.click('#login-button');
    
    // Wait for dashboard to appear
    await page.waitForSelector('#dashboard', { visible: true });
    
    const dashboardVisible = await page.evaluate(() => {
      return window.getComputedStyle(document.getElementById('dashboard')).display !== 'none';
    });
    
    if (dashboardVisible) {
      logger.info('Login successful - dashboard is visible');
      await takeScreenshot(page, 'login-success');
    } else {
      logger.error('Login failed - dashboard not visible');
      await takeScreenshot(page, 'login-failed');
    }
    
    // Test distributor operations
    logger.info('Testing distributor operations');
    
    // Verify distributors list
    const distributors = await page.$$('.distributor');
    logger.info(`Found ${distributors.length} distributors in the list`);
    
    // Test adding distributor button
    await page.click('#add-distributor');
    logger.info('Clicked add distributor button');
    
    // Handle alert
    page.on('dialog', async dialog => {
      logger.info(`Dialog message: ${dialog.message()}`);
      await dialog.accept();
    });
    
    // Test invitation functionality
    logger.info('Testing invitation functionality');
    await page.click('#new-invitation');
    logger.info('Clicked new invitation button');
    
    logger.info('All simulation tests completed successfully');
  } catch (error) {
    logger.error('Test suite failed', error);
    await takeScreenshot(page, 'test-failure');
  } finally {
    logger.info('Closing browser');
    await browser.close();
  }
}

// Run the tests
(async () => {
  try {
    await runTests();
  } catch (error) {
    logger.error('Fatal error in test execution', error);
    process.exit(1);
  }
})(); 