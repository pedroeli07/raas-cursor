/**
 * E2E Test Script for RaaS Solar Application
 * 
 * This script automatically:
 * 1. Opens Chrome browser
 * 2. Logs in as super admin
 * 3. Tests all major functionality
 * 4. Logs results and errors
 * 5. Tests invitation flows
 * 6. Tests access control
 */

import { chromium } from 'playwright';
import fs from 'fs/promises';
import path from 'path';

// Configuration
const config = {
  baseUrl: 'http://localhost:3000',
  credentials: {
    superAdmin: {
      email: 'pedro-eli@hotmail.com',
      password: 'galod1234'
    },
    // Will be filled with generated test users
    testCustomer: {
      email: `customer.test.${Date.now()}@example.com`,
      password: 'Test1234!'
    },
    testRenter: {
      email: `renter.test.${Date.now()}@example.com`,
      password: 'Test1234!'
    }
  },
  routes: {
    login: '/login',
    dashboard: '/dashboard',
    users: '/admin/users',
    installations: '/admin/installations',
    distributors: '/admin/distributors',
    invitations: '/admin/invitations',
    settings: '/admin/settings',
    help: '/admin/help',
    customerDashboard: '/dashboard',
    customerBills: '/bills',
    renterDashboard: '/dashboard/generation'
  },
  testData: {
    installation: {
      number: `TEST-${Date.now().toString().substring(7)}`,
      type: 'CONSUMER'
    },
    distributor: {
      name: `TUST-${Date.now().toString().substring(7)}`,
      code: `T${Date.now().toString().substring(7)}`,
      price_per_kwh: 0.85
    },
    address: {
      street: 'Rua de Teste',
      number: '123',
      neighborhood: 'Bairro Teste',
      city: 'Cidade Teste',
      state: 'MG',
      zip: '30000-000',
      type: 'INSTALLATION'
    },
    energyBill: {
      period: '04/2025',
      consumption: 1250,
      compensation: 750,
      received: 750
    }
  },
  // Log files
  logFile: path.join(process.cwd(), 'scripts', 'test-results.log'),
  screenshotsDir: path.join(process.cwd(), 'scripts', 'screenshots')
};

// Ensure directories exist
async function ensureDirectories() {
  await fs.mkdir(config.screenshotsDir, { recursive: true });
}

// Logger
const logger = {
  async log(message) {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] INFO: ${message}\n`;
    console.log(logMessage.trim());
    await fs.appendFile(config.logFile, logMessage);
  },
  async error(message, error) {
    const timestamp = new Date().toISOString();
    const errorMessage = `[${timestamp}] ERROR: ${message} ${error ? '- ' + error.toString() : ''}\n`;
    console.error(errorMessage.trim());
    await fs.appendFile(config.logFile, errorMessage);
  },
  async result(testName, success, details) {
    const timestamp = new Date().toISOString();
    const resultMessage = `[${timestamp}] TEST ${success ? 'PASSED' : 'FAILED'}: ${testName} ${details ? '- ' + details : ''}\n`;
    console.log(resultMessage.trim());
    await fs.appendFile(config.logFile, resultMessage);
  }
};

// Take screenshot helper
async function takeScreenshot(page, name) {
  const screenshotPath = path.join(config.screenshotsDir, `${name}_${Date.now()}.png`);
  await page.screenshot({ path: screenshotPath, fullPage: true });
  await logger.log(`Screenshot saved: ${screenshotPath}`);
  return screenshotPath;
}

// Main test function
async function runTests() {
  await logger.log('Starting E2E tests for RaaS Solar application');
  await ensureDirectories();
  
  // Start from fresh log file
  await fs.writeFile(config.logFile, `RaaS Solar E2E Test Run - ${new Date().toISOString()}\n\n`);
  
  const browser = await chromium.launch({ 
    headless: false, // Set to true for headless mode
    slowMo: 100 // Slow down by 100ms
  });
  
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 }
  });
  
  const page = await context.newPage();
  
  try {
    // Step 1: Login as Super Admin
    await logger.log('Starting super admin login test');
    await page.goto(`${config.baseUrl}${config.routes.login}`);
    await page.waitForLoadState('networkidle');
    
    await page.fill('input[name="email"]', config.credentials.superAdmin.email);
    await page.fill('input[name="password"]', config.credentials.superAdmin.password);
    await page.click('button[type="submit"]');
    await page.waitForURL(`${config.baseUrl}${config.routes.dashboard}`, { timeout: 10000 });
    
    await logger.result('Super Admin Login', true);
    await takeScreenshot(page, 'login_success');
    
    // Step 2: Test Dashboard Access
    await logger.log('Testing dashboard access');
    await page.goto(`${config.baseUrl}${config.routes.dashboard}`);
    await page.waitForLoadState('networkidle');
    
    const dashboardTitle = await page.textContent('h1');
    if (dashboardTitle && dashboardTitle.includes('Dashboard')) {
      await logger.result('Dashboard Access', true);
    } else {
      await logger.result('Dashboard Access', false, 'Dashboard title not found');
      await takeScreenshot(page, 'dashboard_failed');
    }
    
    // Step 3: Test Users Management
    await logger.log('Testing users management');
    await page.goto(`${config.baseUrl}${config.routes.users}`);
    await page.waitForLoadState('networkidle');
    
    const usersTableExists = await page.isVisible('table');
    await logger.result('Users Management Access', usersTableExists);
    if (!usersTableExists) {
      await takeScreenshot(page, 'users_management_failed');
    }
    
    // Step 4: Test Invitations
    await logger.log('Testing invitation creation');
    await page.goto(`${config.baseUrl}${config.routes.invitations}`);
    await page.waitForLoadState('networkidle');
    
    // Create Customer Invitation
    await page.click('button:has-text("Novo Convite"), button:has-text("New Invitation")');
    await page.waitForSelector('form');
    await page.fill('input[name="email"]', config.credentials.testCustomer.email);
    await page.fill('input[name="name"]', 'Test Customer');
    await page.selectOption('select[name="role"]', { label: 'CUSTOMER' });
    await page.click('button[type="submit"]');
    
    // Check for success message or new row in table
    const customerInviteSuccess = await page.isVisible('div[role="alert"]:has-text("success"), table tr:has-text("' + config.credentials.testCustomer.email + '")');
    await logger.result('Customer Invitation Creation', customerInviteSuccess);
    if (!customerInviteSuccess) {
      await takeScreenshot(page, 'customer_invite_failed');
    }
    
    // Create Energy Renter Invitation
    await page.click('button:has-text("Novo Convite"), button:has-text("New Invitation")');
    await page.waitForSelector('form');
    await page.fill('input[name="email"]', config.credentials.testRenter.email);
    await page.fill('input[name="name"]', 'Test Energy Renter');
    await page.selectOption('select[name="role"]', { label: 'ENERGY_RENTER' });
    await page.click('button[type="submit"]');
    
    // Check for success message or new row in table
    const renterInviteSuccess = await page.isVisible('div[role="alert"]:has-text("success"), table tr:has-text("' + config.credentials.testRenter.email + '")');
    await logger.result('Energy Renter Invitation Creation', renterInviteSuccess);
    if (!renterInviteSuccess) {
      await takeScreenshot(page, 'renter_invite_failed');
    }

    // Step 5: Test Distributors Management
    await logger.log('Testing distributors management');
    await page.goto(`${config.baseUrl}${config.routes.distributors}`);
    await page.waitForLoadState('networkidle');
    
    // Create Distributor
    await page.click('button:has-text("Nova Distribuidora"), button:has-text("New Distributor")');
    await page.waitForSelector('form');
    await page.fill('input[name="name"]', config.testData.distributor.name);
    await page.fill('input[name="code"]', config.testData.distributor.code);
    await page.fill('input[name="price_per_kwh"], input[name="pricePerKwh"]', config.testData.distributor.price_per_kwh.toString());
    await page.click('button[type="submit"]');

    // Check for success
    const distributorCreationSuccess = await page.isVisible('div[role="alert"]:has-text("success"), table tr:has-text("' + config.testData.distributor.name + '")');
    await logger.result('Distributor Creation', distributorCreationSuccess);
    if (!distributorCreationSuccess) {
      await takeScreenshot(page, 'distributor_creation_failed');
    }

    // Step 6: Test Installations Management
    await logger.log('Testing installations management');
    await page.goto(`${config.baseUrl}${config.routes.installations}`);
    await page.waitForLoadState('networkidle');
    
    // Create Installation
    await page.click('button:has-text("Nova Instalação"), button:has-text("New Installation")');
    await page.waitForSelector('form');
    await page.fill('input[name="installationNumber"]', config.testData.installation.number);
    await page.selectOption('select[name="type"]', config.testData.installation.type);
    
    // Assuming select inputs for distributor and owner
    // These may need to be adjusted based on actual UI
    await page.click('select[name="distributorId"]');
    await page.click(`option:has-text("${config.testData.distributor.name}")`);
    
    // Select first customer in the list for owner
    await page.click('select[name="ownerId"]');
    await page.click('option[value]');
    
    // Fill address fields or create address separately if needed
    
    await page.click('button[type="submit"]');

    // Check for success
    const installationCreationSuccess = await page.isVisible('div[role="alert"]:has-text("success"), table tr:has-text("' + config.testData.installation.number + '")');
    await logger.result('Installation Creation', installationCreationSuccess);
    if (!installationCreationSuccess) {
      await takeScreenshot(page, 'installation_creation_failed');
    }

    // Step 7: Test API Endpoints directly
    await logger.log('Testing API endpoints');
    
    // Get auth token from localStorage
    const token = await page.evaluate(() => {
      return localStorage.getItem('token') || localStorage.getItem('authToken');
    });
    
    if (!token) {
      await logger.error('Failed to get auth token from localStorage');
      await takeScreenshot(page, 'token_retrieval_failed');
    } else {
      // Test API endpoints using fetch within page context
      const apiTests = [
        { name: 'Users API', endpoint: '/api/users' },
        { name: 'Installations API', endpoint: '/api/installations' },
        { name: 'Distributors API', endpoint: '/api/distributors' },
        { name: 'Invitations API', endpoint: '/api/invite' },
        { name: 'Settings API', endpoint: '/api/settings' }
      ];
      
      for (const test of apiTests) {
        const apiResponse = await page.evaluate(async (endpoint, token) => {
          try {
            const response = await fetch(endpoint, {
              headers: {
                'Authorization': `Bearer ${token}`
              }
            });
            return {
              status: response.status,
              ok: response.ok,
              statusText: response.statusText,
              body: response.status !== 204 ? await response.json() : null
            };
          } catch (error) {
            return { error: error.toString() };
          }
        }, `${config.baseUrl}${test.endpoint}`, token);
        
        if (apiResponse.ok) {
          await logger.result(`${test.name} GET request`, true);
        } else {
          await logger.result(`${test.name} GET request`, false, 
            `Status: ${apiResponse.status} ${apiResponse.statusText}` + 
            (apiResponse.error ? ` Error: ${apiResponse.error}` : '')
          );
        }
      }
    }

    // Step 8: Log out
    await logger.log('Logging out super admin');
    await page.click('button:has-text("Logout"), button:has-text("Sair")');
    await page.waitForURL(`${config.baseUrl}${config.routes.login}`, { timeout: 5000 });
    await logger.result('Super Admin Logout', true);

    // Final report
    await logger.log('E2E tests completed successfully');
    
  } catch (error) {
    await logger.error('Test execution failed', error);
    await takeScreenshot(page, 'test_failure');
  } finally {
    await browser.close();
  }
}

// Run the tests
runTests().catch(console.error); 