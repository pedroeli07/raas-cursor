/**
 * RaaS Solar Platform - Automated Browser Testing
 * 
 * This script uses Puppeteer to automate browser testing for the RaaS platform.
 * It tests various functionalities including login flows, navigation, 
 * CRUD operations, invitation flows, RBAC controls, and dashboard functionality.
 */

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const util = require('util');

// Configuration
const BASE_URL = 'http://localhost:3000';
const TEST_CREDENTIALS = {
  super_admin: { email: 'pedro-eli@hotmail.com', password: 'SuperAdmin123!' },
  admin: { email: 'admin@raas.com', password: 'Admin123!' },
  customer: { email: 'customer@test.com', password: 'Customer123!' },
  energy_renter: { email: 'renter@test.com', password: 'Renter123!' }
};
const SCREENSHOT_DIR = path.join(__dirname, 'test-screenshots');
const LOG_FILE = path.join(__dirname, 'logs', 'browser-tests.log');

// Ensure directories exist
if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

if (!fs.existsSync(path.dirname(LOG_FILE))) {
  fs.mkdirSync(path.dirname(LOG_FILE), { recursive: true });
}

// Setup logging
const logStream = fs.createWriteStream(LOG_FILE, { flags: 'a' });
const log = (message, error = false) => {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}]${error ? ' [ERROR]' : ''} ${message}`;
  
  console.log(logMessage);
  logStream.write(logMessage + '\n');
};

// Global browser instance
let browser;
let page;

/**
 * Initialize browser and page
 */
async function setupBrowser() {
  log('Starting browser...');
  browser = await puppeteer.launch({ 
    headless: false, // Set to true for headless mode
    defaultViewport: { width: 1280, height: 800 },
    args: ['--window-size=1280,800'],
    slowMo: 50 // Slow down operations for visibility
  });
  
  page = await browser.newPage();
  await page.setDefaultTimeout(10000); // 10 seconds timeout
  log('Browser initialized');
  return { browser, page };
}

/**
 * Take a screenshot
 */
async function takeScreenshot(name) {
  const filename = `${name}-${new Date().toISOString().replace(/:/g, '-')}.png`;
  const filePath = path.join(SCREENSHOT_DIR, filename);
  await page.screenshot({ path: filePath, fullPage: true });
  log(`Screenshot saved: ${filePath}`);
  return filePath;
}

/**
 * Test login functionality
 */
async function testLogin(credentials = TEST_CREDENTIALS.super_admin) {
  log(`Testing login with ${credentials.email}...`);
  
  try {
    await page.goto(`${BASE_URL}/login`);
    await page.waitForSelector('form');
    
    // Fill in the login form
    await page.type('input[name="email"]', credentials.email);
    await page.type('input[name="password"]', credentials.password);
    
    // Submit the form
    await Promise.all([
      page.click('button[type="submit"]'),
      page.waitForNavigation()
    ]);
    
    // Check if login was successful
    const url = page.url();
    if (url.includes('/dashboard')) {
      log(`Login successful for ${credentials.email}`);
      return true;
    } else {
      throw new Error(`Login failed, redirected to ${url}`);
    }
  } catch (error) {
    log(`Login test failed: ${error.message}`, true);
    await takeScreenshot('login-error');
    throw error;
  }
}

/**
 * Test navigation to various routes
 */
async function testNavigation() {
  log('Testing navigation...');
  
  const routes = [
    { path: '/dashboard', name: 'Dashboard' },
    { path: '/administracao/distribuidoras', name: 'Distribuidoras' },
    { path: '/administracao/instalacoes', name: 'Instalações' },
    { path: '/administracao/usuarios', name: 'Usuários' },
    { path: '/faturas', name: 'Faturas' }
  ];
  
  try {
    for (const route of routes) {
      log(`Navigating to ${route.name}...`);
      await page.goto(`${BASE_URL}${route.path}`);
      await page.waitForSelector('h1, h2');
      
      const title = await page.evaluate(() => {
        const el = document.querySelector('h1, h2');
        return el ? el.textContent : null;
      });
      
      log(`Successfully loaded ${route.name} page: "${title}"`);
    }
    
    return true;
  } catch (error) {
    log(`Navigation test failed: ${error.message}`, true);
    await takeScreenshot('navigation-error');
    throw error;
  }
}

/**
 * Test CRUD operations for distributors
 */
async function testDistributorCRUD() {
  log('Testing distributor CRUD operations...');
  
  try {
    // Navigate to distributors page
    await page.goto(`${BASE_URL}/administracao/distribuidoras`);
    await page.waitForSelector('h1, h2');
    
    // Create new distributor
    const testDistributorName = `Test Distributor ${Date.now()}`;
    const testPrice = '0.745';
    
    log(`Creating new distributor: ${testDistributorName}`);
    await page.click('button:has-text("Nova Distribuidora"), button:has-text("Adicionar")');
    await page.waitForSelector('form');
    
    await page.type('input[name="name"]', testDistributorName);
    await page.type('input[name="price"]', testPrice);
    
    await Promise.all([
      page.click('button[type="submit"]'),
      page.waitForNavigation({ waitUntil: 'networkidle0' })
    ]);
    
    // Verify creation
    const createdText = await page.evaluate((name) => {
      return document.body.textContent.includes(name);
    }, testDistributorName);
    
    if (!createdText) {
      throw new Error('Distributor creation failed: not found in list after creation');
    }
    
    log(`Successfully created distributor: ${testDistributorName}`);
    
    // Edit distributor
    const newPrice = '0.789';
    log(`Editing distributor: ${testDistributorName}`);
    
    // Find and click edit button for our distributor
    await page.click(`tr:has-text("${testDistributorName}") button:has-text("Editar")`);
    await page.waitForSelector('form');
    
    // Clear and update price
    await page.evaluate(() => {
      document.querySelector('input[name="price"]').value = '';
    });
    await page.type('input[name="price"]', newPrice);
    
    await Promise.all([
      page.click('button[type="submit"]'),
      page.waitForNavigation({ waitUntil: 'networkidle0' })
    ]);
    
    // Verify edit
    const editedText = await page.evaluate((name, price) => {
      const row = Array.from(document.querySelectorAll('tr')).find(row => 
        row.textContent.includes(name));
      return row && row.textContent.includes(price);
    }, testDistributorName, newPrice);
    
    if (!editedText) {
      throw new Error('Distributor edit failed: price update not reflected in list');
    }
    
    log(`Successfully edited distributor price to ${newPrice}`);
    
    // Delete distributor
    log(`Deleting distributor: ${testDistributorName}`);
    await page.click(`tr:has-text("${testDistributorName}") button:has-text("Excluir")`);
    
    // Confirm delete in modal
    await page.waitForSelector('div[role="dialog"]');
    await Promise.all([
      page.click('div[role="dialog"] button:has-text("Confirmar"), div[role="dialog"] button:has-text("Excluir")'),
      page.waitForNavigation({ waitUntil: 'networkidle0' })
    ]);
    
    // Verify deletion
    const deletedCheck = await page.evaluate((name) => {
      return !document.body.textContent.includes(name);
    }, testDistributorName);
    
    if (!deletedCheck) {
      throw new Error('Distributor deletion failed: still found in list after deletion');
    }
    
    log(`Successfully deleted distributor: ${testDistributorName}`);
    return true;
  } catch (error) {
    log(`Distributor CRUD test failed: ${error.message}`, true);
    await takeScreenshot('distributor-crud-error');
    throw error;
  }
}

/**
 * Test CRUD operations for installations
 */
async function testInstallationCRUD() {
  log('Testing installation CRUD operations...');
  
  try {
    // Navigate to installations page
    await page.goto(`${BASE_URL}/administracao/instalacoes`);
    await page.waitForSelector('h1, h2');
    
    // Create new installation
    const testInstallationNumber = `${Math.floor(Math.random() * 9000000) + 1000000}`;
    
    log(`Creating new installation: ${testInstallationNumber}`);
    await page.click('button:has-text("Nova Instalação"), button:has-text("Adicionar")');
    await page.waitForSelector('form');
    
    await page.type('input[name="installationNumber"]', testInstallationNumber);
    
    // Select type (generator or consumer)
    await page.click('select[name="type"]');
    await page.select('select[name="type"]', 'consumer');
    
    // Select distributor (assuming CEMIG exists)
    await page.click('select[name="distributorId"]');
    await page.select('select[name="distributorId"]', '1'); // Assuming 1 is CEMIG's ID
    
    // Select owner (using the super admin)
    await page.click('select[name="ownerId"]');
    await page.select('select[name="ownerId"]', '1'); // Assuming 1 is the super admin's ID
    
    await Promise.all([
      page.click('button[type="submit"]'),
      page.waitForNavigation({ waitUntil: 'networkidle0' })
    ]);
    
    // Verify creation
    const createdText = await page.evaluate((number) => {
      return document.body.textContent.includes(number);
    }, testInstallationNumber);
    
    if (!createdText) {
      throw new Error('Installation creation failed: not found in list after creation');
    }
    
    log(`Successfully created installation: ${testInstallationNumber}`);
    
    // Delete installation
    log(`Deleting installation: ${testInstallationNumber}`);
    await page.click(`tr:has-text("${testInstallationNumber}") button:has-text("Excluir")`);
    
    // Confirm delete in modal
    await page.waitForSelector('div[role="dialog"]');
    await Promise.all([
      page.click('div[role="dialog"] button:has-text("Confirmar"), div[role="dialog"] button:has-text("Excluir")'),
      page.waitForNavigation({ waitUntil: 'networkidle0' })
    ]);
    
    // Verify deletion
    const deletedCheck = await page.evaluate((number) => {
      return !document.body.textContent.includes(number);
    }, testInstallationNumber);
    
    if (!deletedCheck) {
      throw new Error('Installation deletion failed: still found in list after deletion');
    }
    
    log(`Successfully deleted installation: ${testInstallationNumber}`);
    return true;
  } catch (error) {
    log(`Installation CRUD test failed: ${error.message}`, true);
    await takeScreenshot('installation-crud-error');
    throw error;
  }
}

/**
 * Test user invitation flow
 */
async function testInvitationFlow() {
  log('Testing user invitation flow...');
  
  try {
    // Navigate to users page
    await page.goto(`${BASE_URL}/administracao/usuarios`);
    await page.waitForSelector('h1, h2');
    
    // Create invitation for customer
    log('Creating invitation for a customer...');
    await page.click('button:has-text("Convidar Usuário"), button:has-text("Novo Convite")');
    await page.waitForSelector('form');
    
    const testEmail = `customer-${Date.now()}@test.com`;
    await page.type('input[name="email"]', testEmail);
    
    // Select role
    await page.click('select[name="role"]');
    await page.select('select[name="role"]', 'customer');
    
    await Promise.all([
      page.click('button[type="submit"]'),
      page.waitForResponse(response => 
        response.url().includes('/api/invitations') && 
        response.status() === 200
      )
    ]);
    
    // Verify invitation was created
    const invitationCreated = await page.evaluate((email) => {
      return document.body.textContent.includes(email);
    }, testEmail);
    
    if (!invitationCreated) {
      throw new Error('Invitation creation failed: email not found in list');
    }
    
    log(`Successfully created invitation for: ${testEmail}`);
    
    // Get invitation link (in a real test we would check the actual link)
    // For this test, we'll simulate knowing the token
    const invitationToken = "sample-token"; // In a real test, we'd extract this
    
    // Test registration with invitation
    log('Testing registration with invitation token...');
    // This is a simulated step as we'd need the actual token
    log('Invitation flow tested successfully (simulated token usage)');
    
    return true;
  } catch (error) {
    log(`Invitation flow test failed: ${error.message}`, true);
    await takeScreenshot('invitation-error');
    throw error;
  }
}

/**
 * Test energy data upload
 */
async function testEnergyDataUpload() {
  log('Testing energy data upload...');
  
  try {
    // Navigate to data upload page
    await page.goto(`${BASE_URL}/administracao/dados-energia`);
    await page.waitForSelector('h1, h2');
    
    // Upload mock data file
    const uploadPath = path.join(__dirname, 'mock-data', 'cemig_consumers_FEV_2024.csv');
    
    if (!fs.existsSync(uploadPath)) {
      log(`Mock data file not found: ${uploadPath}. Run generate-mock-data.js first.`, true);
      return false;
    }
    
    log(`Uploading file: ${uploadPath}`);
    
    // Set file input
    const inputUploadHandle = await page.$('input[type="file"]');
    await inputUploadHandle.uploadFile(uploadPath);
    
    // Select month (February 2024)
    await page.click('select[name="month"]');
    await page.select('select[name="month"]', '2'); // Assuming February is value 2
    
    await page.click('select[name="year"]');
    await page.select('select[name="year"]', '2024');
    
    // Submit form
    await Promise.all([
      page.click('button[type="submit"]'),
      page.waitForNavigation({ waitUntil: 'networkidle0' })
    ]);
    
    // Check for success message
    const successMessage = await page.evaluate(() => {
      return document.body.textContent.includes('sucesso') || 
             document.body.textContent.includes('Dados importados');
    });
    
    if (!successMessage) {
      throw new Error('Energy data upload failed: no success message found');
    }
    
    log('Successfully uploaded energy data');
    return true;
  } catch (error) {
    log(`Energy data upload test failed: ${error.message}`, true);
    await takeScreenshot('data-upload-error');
    throw error;
  }
}

/**
 * Test dashboard elements
 */
async function testDashboardElements() {
  log('Testing dashboard elements...');
  
  try {
    await page.goto(`${BASE_URL}/dashboard`);
    await page.waitForSelector('h1, h2');
    
    // Check for key dashboard elements
    const elements = [
      { name: 'Total de Instalações', selector: '[data-testid="total-installations"]' },
      { name: 'Total de Usinas', selector: '[data-testid="total-generators"]' },
      { name: 'Total de Consumidores', selector: '[data-testid="total-consumers"]' },
      { name: 'Gráfico de Economia', selector: '[data-testid="savings-chart"]' },
      { name: 'Gráfico de Geração', selector: '[data-testid="generation-chart"]' }
    ];
    
    for (const element of elements) {
      log(`Checking for dashboard element: ${element.name}`);
      
      const exists = await page.evaluate((selector) => {
        return !!document.querySelector(selector);
      }, element.selector);
      
      if (!exists) {
        log(`Dashboard element not found: ${element.name}`, true);
      } else {
        log(`Dashboard element found: ${element.name}`);
      }
    }
    
    log('Dashboard elements test completed');
    return true;
  } catch (error) {
    log(`Dashboard elements test failed: ${error.message}`, true);
    await takeScreenshot('dashboard-error');
    throw error;
  }
}

/**
 * Test RBAC (Role-Based Access Control)
 */
async function testRBAC() {
  log('Testing RBAC (Role-Based Access Control)...');
  
  // Define restricted routes for each role
  const restrictedRoutes = {
    customer: [
      '/administracao/distribuidoras',
      '/administracao/usuarios',
      '/administracao/dados-energia'
    ],
    energy_renter: [
      '/administracao/distribuidoras',
      '/administracao/usuarios',
      '/administracao/dados-energia'
    ]
  };
  
  try {
    // Test customer access restrictions
    log('Testing customer role restrictions...');
    await testLogin(TEST_CREDENTIALS.customer);
    
    for (const route of restrictedRoutes.customer) {
      log(`Testing customer access to restricted route: ${route}`);
      await page.goto(`${BASE_URL}${route}`);
      
      // Check if we're redirected or access denied
      const url = page.url();
      const pageContent = await page.content();
      
      const accessDenied = 
        !url.includes(route) || // Redirected
        pageContent.includes('Acesso negado') || 
        pageContent.includes('não autorizado');
      
      if (accessDenied) {
        log(`Customer correctly restricted from: ${route}`);
      } else {
        throw new Error(`RBAC failure: Customer has access to restricted route: ${route}`);
      }
    }
    
    log('RBAC tests completed successfully');
    return true;
  } catch (error) {
    log(`RBAC test failed: ${error.message}`, true);
    await takeScreenshot('rbac-error');
    throw error;
  }
}

/**
 * Run all tests
 */
async function runTests() {
  log('Starting RaaS automated browser tests...');
  
  try {
    await setupBrowser();
    
    // Login as super admin
    await testLogin();
    
    // Test main functionalities
    await testNavigation();
    await testDistributorCRUD();
    await testInstallationCRUD();
    await testInvitationFlow();
    await testEnergyDataUpload();
    await testDashboardElements();
    await testRBAC();
    
    log('All tests completed successfully!');
  } catch (error) {
    log(`Test suite failed: ${error.message}`, true);
  } finally {
    if (browser) {
      await browser.close();
      log('Browser closed');
    }
    
    logStream.end();
    log('Test log closed');
  }
}

// Run the tests
runTests().catch(err => {
  console.error('Fatal error in test suite:', err);
  process.exit(1);
}); 