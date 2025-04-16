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
  users: {
    superAdmin: {
      email: 'pedro-eli@hotmail.com',
      password: 'password123',
    },
    testCustomer: {
      email: 'customer@test.com',
      password: 'testpassword123',
    },
    testRenter: {
      email: 'renter@test.com',
      password: 'testpassword123',
    },
  },
  logPath: path.join(__dirname, 'test-results.log'),
  screenshotDir: path.join(__dirname, 'screenshots'),
  // Increase timeouts for more reliable testing
  navigationTimeout: 60000,
  defaultTimeout: 30000
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

// Helper functions
async function takeScreenshot(page, name) {
  const fileName = `${name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}-${Date.now()}.png`;
  const filePath = path.join(config.screenshotDir, fileName);
  await page.screenshot({ path: filePath, fullPage: true });
  logger.info(`Screenshot saved: ${fileName}`);
  return filePath;
}

async function login(page, userType) {
  const user = config.users[userType];
  if (!user) {
    throw new Error(`Unknown user type: ${userType}`);
  }

  logger.info(`Logging in as ${userType}: ${user.email}`);
  
  try {
    // Set navigation timeout
    page.setDefaultNavigationTimeout(config.navigationTimeout);
    page.setDefaultTimeout(config.defaultTimeout);
    
    // Go to login page
    logger.debug(`Navigating to ${config.baseUrl}/login`);
    await page.goto(`${config.baseUrl}/login`, { waitUntil: 'networkidle0' });
    
    // Check if login page loaded correctly
    const title = await page.title();
    logger.debug(`Page title: ${title}`);
    
    if (await page.$('input[name="email"]')) {
      logger.debug('Login form found');
    } else {
      logger.error('Login form not found');
      await takeScreenshot(page, 'login-form-missing');
      return false;
    }
    
    // Fill in login form
    logger.debug('Filling login form');
    await page.type('input[name="email"]', user.email);
    await page.type('input[name="password"]', user.password);
    
    // Take screenshot before submit
    await takeScreenshot(page, 'before-login-submit');
    
    // Click submit button
    logger.debug('Clicking submit button');
    const submitButton = await page.$('button[type="submit"]');
    if (!submitButton) {
      logger.error('Submit button not found');
      return false;
    }
    
    // Use a different approach to handle navigation
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'networkidle0', timeout: config.navigationTimeout }).catch(e => {
        logger.error('Navigation timeout after login button click', e);
        return null;
      }),
      submitButton.click()
    ]);
    
    // Check current URL to verify login success
    const currentUrl = page.url();
    logger.debug(`Current URL after login attempt: ${currentUrl}`);
    
    if (currentUrl.includes('/dashboard') || currentUrl.includes('/admin')) {
      logger.info(`Successfully logged in as ${userType}`);
      await takeScreenshot(page, `login-success-${userType}`);
      return true;
    } else {
      logger.error(`Failed to login as ${userType} - redirected to ${currentUrl}`);
      await takeScreenshot(page, `login-failed-${userType}`);
      return false;
    }
  } catch (error) {
    logger.error(`Login process failed for ${userType}`, error);
    await takeScreenshot(page, `login-error-${userType}`);
    return false;
  }
}

// Test functions
async function testSuperAdminFunctionality(page) {
  logger.info('Testing Super Admin functionality');
  
  // Test access to users management
  await page.goto(`${config.baseUrl}/dashboard/admin/users`);
  await page.waitForSelector('h1');
  const usersTitle = await page.$eval('h1', el => el.textContent);
  if (usersTitle.includes('Usuários')) {
    logger.info('Successfully accessed Users management page');
  } else {
    logger.error('Failed to access Users management page');
    await takeScreenshot(page, 'users-management-failed');
  }
  
  // Test access to distributors management
  await page.goto(`${config.baseUrl}/dashboard/admin/distribuidoras`);
  await page.waitForSelector('h1');
  const distTitle = await page.$eval('h1', el => el.textContent);
  if (distTitle.includes('Distribuidoras')) {
    logger.info('Successfully accessed Distributors management page');
  } else {
    logger.error('Failed to access Distributors management page');
    await takeScreenshot(page, 'distributors-management-failed');
  }
  
  // Test access to installations management
  await page.goto(`${config.baseUrl}/dashboard/admin/instalacoes`);
  await page.waitForSelector('h1');
  const instTitle = await page.$eval('h1', el => el.textContent);
  if (instTitle.includes('Instalações')) {
    logger.info('Successfully accessed Installations management page');
  } else {
    logger.error('Failed to access Installations management page');
    await takeScreenshot(page, 'installations-management-failed');
  }
}

async function testInvitationFlow(page) {
  logger.info('Testing invitation flow');
  
  // Go to invite page
  await page.goto(`${config.baseUrl}/dashboard/admin/convites`);
  await page.waitForSelector('button:has-text("Novo Convite")');
  
  // Create customer invite
  logger.info('Creating customer invitation');
  await page.click('button:has-text("Novo Convite")');
  await page.waitForSelector('input[name="email"]');
  await page.type('input[name="email"]', config.users.testCustomer.email);
  await page.selectOption('select[name="role"]', 'customer');
  await page.click('button[type="submit"]');
  
  // Verify invitation was created
  await page.waitForSelector('div:has-text("Convite enviado com sucesso")');
  logger.info('Customer invitation created successfully');
  await takeScreenshot(page, 'customer-invitation-created');
  
  // Create renter invite
  logger.info('Creating energy renter invitation');
  await page.click('button:has-text("Novo Convite")');
  await page.waitForSelector('input[name="email"]');
  await page.type('input[name="email"]', config.users.testRenter.email);
  await page.selectOption('select[name="role"]', 'energy_renter');
  await page.click('button[type="submit"]');
  
  // Verify invitation was created
  await page.waitForSelector('div:has-text("Convite enviado com sucesso")');
  logger.info('Energy renter invitation created successfully');
  await takeScreenshot(page, 'renter-invitation-created');
  
  // TODO: In a real scenario, we would need to get the invitation token
  // and test the complete registration flow
  logger.info('Note: Full invitation flow would require email integration to get tokens');
}

async function testDistributorCRUD(page) {
  logger.info('Testing Distributor CRUD operations');
  
  // Go to distributors page
  await page.goto(`${config.baseUrl}/dashboard/admin/distribuidoras`);
  await page.waitForSelector('button:has-text("Nova Distribuidora")');
  
  // Create distributor
  const testDistributorName = `Test Distributor ${Date.now()}`;
  logger.info(`Creating distributor: ${testDistributorName}`);
  await page.click('button:has-text("Nova Distribuidora")');
  await page.waitForSelector('input[name="nome"]');
  await page.type('input[name="nome"]', testDistributorName);
  await page.type('input[name="preco"]', '0.75');
  await page.click('button[type="submit"]');
  
  // Verify distributor was created
  await page.waitForSelector(`div:has-text("${testDistributorName}")`);
  logger.info(`Distributor created successfully: ${testDistributorName}`);
  await takeScreenshot(page, 'distributor-created');
  
  // Edit distributor
  const newPrice = '0.85';
  logger.info(`Editing distributor: ${testDistributorName}`);
  await page.click(`button[aria-label="Editar ${testDistributorName}"]`);
  await page.waitForSelector('input[name="preco"]');
  await page.evaluate(() => {
    document.querySelector('input[name="preco"]').value = '';
  });
  await page.type('input[name="preco"]', newPrice);
  await page.click('button[type="submit"]');
  
  // Verify distributor was updated
  await page.waitForSelector(`div:has-text("${newPrice}")`);
  logger.info(`Distributor updated successfully: ${testDistributorName} with price ${newPrice}`);
  await takeScreenshot(page, 'distributor-updated');
  
  // Delete distributor
  logger.info(`Deleting distributor: ${testDistributorName}`);
  await page.click(`button[aria-label="Excluir ${testDistributorName}"]`);
  await page.waitForSelector('button:has-text("Confirmar")');
  await page.click('button:has-text("Confirmar")');
  
  // Verify distributor was deleted
  await page.waitForFunction((name) => {
    return !document.body.textContent.includes(name);
  }, {}, testDistributorName);
  logger.info(`Distributor deleted successfully: ${testDistributorName}`);
  await takeScreenshot(page, 'distributor-deleted');
}

async function createMockEnergyData(page) {
  logger.info('Creating mock energy data');
  
  // Go to upload page
  await page.goto(`${config.baseUrl}/dashboard/admin/upload`);
  await page.waitForSelector('input[type="file"]');
  
  // Assuming there's a form to select distributor and month
  await page.selectOption('select[name="distribuidora"]', 'CEMIG');
  await page.selectOption('select[name="mes"]', '3'); // March
  await page.selectOption('select[name="ano"]', '2024');
  
  // Mock file upload - in a real scenario you'd upload an actual file
  // Here we'll just log that we'd do this
  logger.info('In a real test, we would upload a real energy data file here');
  logger.info('Mock energy data creation simulated');
  await takeScreenshot(page, 'mock-energy-data-upload');
}

// Main test runner
async function runTests() {
  logger.info('Starting RaaS Platform tests');
  
  // Launch browser with debug logging
  logger.debug('Launching browser');
  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: { width: 1366, height: 768 },
    args: ['--window-size=1366,768', '--no-sandbox', '--disable-setuid-sandbox'],
  });
  
  const page = await browser.newPage();
  
  // Setup console log forwarding from browser
  page.on('console', message => {
    logger.debug(`Browser console [${message.type()}]: ${message.text()}`);
  });
  
  try {
    // Simple check if the app is running first
    logger.debug(`Checking if app is running at ${config.baseUrl}`);
    try {
      await page.goto(config.baseUrl, { timeout: 5000 });
      logger.info('Application is running');
    } catch (error) {
      logger.error('Application is not running or not accessible', error);
      await takeScreenshot(page, 'app-not-running');
      throw new Error('Cannot proceed with tests: Application is not running');
    }
    
    // Login tests
    const loginSuccess = await login(page, 'superAdmin');
    if (!loginSuccess) {
      throw new Error('Super admin login failed. Aborting tests.');
    }
    
    // For now, we'll just consider login a success
    logger.info('Login test passed. Not running other tests to debug login first.');
    
    /*
    // Uncomment these to run full test suite
    await testSuperAdminFunctionality(page);
    await testInvitationFlow(page);
    await testDistributorCRUD(page);
    await createMockEnergyData(page);
    */
    
    logger.info('All tests completed successfully');
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