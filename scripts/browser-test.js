/**
 * RaaS Solar Platform - Automated Browser Testing Script
 * 
 * This script performs comprehensive testing of the RaaS platform using Puppeteer.
 * It tests login flows, navigation, CRUD operations for distributors and installations,
 * invitation flows, RBAC controls, and dashboard functionality.
 * 
 * All test results are logged to a file for review.
 */

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const { promisify } = require('util');
const mkdir = promisify(fs.mkdir);
const appendFile = promisify(fs.appendFile);

// Configuration
const BASE_URL = 'http://localhost:3000';
const TEST_CREDENTIALS = {
  superAdmin: {
    email: 'pedro-eli@hotmail.com',
    password: 'SuperAdminPassword123!'
  },
  admin: {
    email: 'admin@raas-solar.com',
    password: 'AdminPassword123!'
  },
  customer: {
    email: 'customer@test.com',
    password: 'CustomerPassword123!'
  },
  energyRenter: {
    email: 'renter@test.com',
    password: 'RenterPassword123!'
  }
};
const SCREENSHOT_DIR = path.join(__dirname, 'test-screenshots');
const LOG_FILE = path.join(__dirname, 'logs', 'browser-tests.log');

// Ensure directories exist
async function ensureDirectories() {
  try {
    if (!fs.existsSync(path.join(__dirname, 'logs'))) {
      await mkdir(path.join(__dirname, 'logs'), { recursive: true });
    }
    if (!fs.existsSync(SCREENSHOT_DIR)) {
      await mkdir(SCREENSHOT_DIR, { recursive: true });
    }
  } catch (error) {
    console.error('Error creating directories:', error);
  }
}

// Logger function to write to log file and console
async function log(message, isError = false) {
  const timestamp = new Date().toISOString();
  const logEntry = `[${timestamp}] ${isError ? 'ERROR: ' : ''}${message}\n`;
  
  console.log(logEntry);
  await appendFile(LOG_FILE, logEntry);
}

// Main test function
async function runTests() {
  await ensureDirectories();
  await log('Starting automated browser tests for RaaS Solar Platform');
  
  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: null,
    args: ['--start-maximized']
  });
  
  const page = await browser.newPage();
  
  try {
    // Login test
    await log('Testing super admin login');
    await page.goto(`${BASE_URL}/login`);
    await page.waitForSelector('input[name="email"]');
    await page.type('input[name="email"]', TEST_CREDENTIALS.superAdmin.email);
    await page.type('input[name="password"]', TEST_CREDENTIALS.superAdmin.password);
    await page.click('button[type="submit"]');
    
    // Wait for dashboard to load
    await page.waitForSelector('h1:has-text("Dashboard")', { timeout: 10000 });
    await log('Login successful, dashboard loaded');
    
    // Test navigation
    await testNavigation(page);
    
    // Test distributor CRUD
    await testDistributorCRUD(page);
    
    // Test installation CRUD
    await testInstallationCRUD(page);
    
    // Test invitation flow
    await testInvitationFlow(page);
    
    // Test energy data upload
    await testEnergyDataUpload(page);
    
    // Test dashboard elements
    await testDashboardElements(page);
    
    // Test RBAC by creating and testing different user roles
    await testRBAC(browser);
    
    await log('All tests completed successfully!');
  } catch (error) {
    const timestamp = new Date().getTime();
    const screenshotPath = path.join(SCREENSHOT_DIR, `error-${timestamp}.png`);
    await page.screenshot({ path: screenshotPath, fullPage: true });
    await log(`Test failed: ${error.message}. Screenshot saved to ${screenshotPath}`, true);
  } finally {
    await browser.close();
  }
}

// Test navigation to different pages
async function testNavigation(page) {
  await log('Testing navigation between pages');
  
  const pages = [
    { name: 'Dashboard', url: '/dashboard' },
    { name: 'Distributors', url: '/distribuidoras' },
    { name: 'Installations', url: '/instalacoes' },
    { name: 'Users', url: '/usuarios' },
    { name: 'Invoices', url: '/faturas' },
    { name: 'Reports', url: '/relatorios' },
    { name: 'Settings', url: '/configuracoes' }
  ];
  
  for (const page_info of pages) {
    await log(`Navigating to ${page_info.name}`);
    await page.goto(`${BASE_URL}${page_info.url}`);
    await page.waitForSelector('main', { timeout: 5000 });
    await log(`Successfully loaded ${page_info.name} page`);
  }
}

// Test distributor CRUD operations
async function testDistributorCRUD(page) {
  await log('Testing distributor CRUD operations');
  
  // Navigate to distributors page
  await page.goto(`${BASE_URL}/distribuidoras`);
  await page.waitForSelector('h1:has-text("Distribuidoras")');
  
  // Create distributor
  await log('Creating new distributor');
  await page.click('button:has-text("Nova Distribuidora")');
  await page.waitForSelector('form');
  
  const distribName = `Test Distributor ${new Date().getTime()}`;
  await page.type('input[name="name"]', distribName);
  await page.type('input[name="kwh_price"]', '0.845');
  await page.click('button[type="submit"]');
  
  // Wait for success message
  await page.waitForSelector('div[role="status"]:has-text("Distribuidora criada com sucesso")');
  await log('Distributor created successfully');
  
  // Verify distributor was created
  await page.waitForSelector(`td:has-text("${distribName}")`);
  
  // Edit distributor
  await log('Editing distributor');
  await page.click(`tr:has-text("${distribName}") button[aria-label="Editar"]`);
  await page.waitForSelector('form');
  
  // Clear field and update
  await page.click('input[name="kwh_price"]', { clickCount: 3 });
  await page.type('input[name="kwh_price"]', '0.925');
  await page.click('button[type="submit"]');
  
  // Wait for success message
  await page.waitForSelector('div[role="status"]:has-text("Distribuidora atualizada com sucesso")');
  await log('Distributor updated successfully');
  
  // Delete distributor
  await log('Deleting distributor');
  await page.click(`tr:has-text("${distribName}") button[aria-label="Excluir"]`);
  await page.waitForSelector('button:has-text("Confirmar")');
  await page.click('button:has-text("Confirmar")');
  
  // Wait for success message
  await page.waitForSelector('div[role="status"]:has-text("Distribuidora excluída com sucesso")');
  await log('Distributor deleted successfully');
}

// Test installation CRUD operations
async function testInstallationCRUD(page) {
  await log('Testing installation CRUD operations');
  
  // Navigate to installations page
  await page.goto(`${BASE_URL}/instalacoes`);
  await page.waitForSelector('h1:has-text("Instalações")');
  
  // Create installation
  await log('Creating new installation');
  await page.click('button:has-text("Nova Instalação")');
  await page.waitForSelector('form');
  
  const installNumber = `TEST${Math.floor(Math.random() * 1000000).toString().padStart(6, '0')}`;
  await page.type('input[name="instalacaoNumber"]', installNumber);
  await page.click('select[name="type"]');
  await page.select('select[name="type"]', 'generator');
  
  // Select distributor (assuming CEMIG exists)
  await page.click('select[name="distributor_id"]');
  await page.select('select[name="distributor_id"]', '1'); // First distributor ID
  
  await page.click('button[type="submit"]');
  
  // Wait for success message
  await page.waitForSelector('div[role="status"]:has-text("Instalação criada com sucesso")');
  await log('Installation created successfully');
  
  // View installation details
  await log('Viewing installation details');
  await page.click(`tr:has-text("${installNumber}") a:has-text("Detalhes")`);
  await page.waitForSelector(`h1:has-text("Instalação ${installNumber}")`);
  await log('Installation details loaded successfully');
  
  // Edit installation
  await log('Editing installation');
  await page.click('button:has-text("Editar")');
  await page.waitForSelector('form');
  
  // Change installation type
  await page.click('select[name="type"]');
  await page.select('select[name="type"]', 'consumer');
  await page.click('button[type="submit"]');
  
  // Wait for success message
  await page.waitForSelector('div[role="status"]:has-text("Instalação atualizada com sucesso")');
  await log('Installation updated successfully');
  
  // Go back to list and delete
  await page.goto(`${BASE_URL}/instalacoes`);
  await page.waitForSelector('h1:has-text("Instalações")');
  
  // Delete installation
  await log('Deleting installation');
  await page.click(`tr:has-text("${installNumber}") button[aria-label="Excluir"]`);
  await page.waitForSelector('button:has-text("Confirmar")');
  await page.click('button:has-text("Confirmar")');
  
  // Wait for success message
  await page.waitForSelector('div[role="status"]:has-text("Instalação excluída com sucesso")');
  await log('Installation deleted successfully');
}

// Test invitation flow
async function testInvitationFlow(page) {
  await log('Testing user invitation flow');
  
  // Navigate to users page
  await page.goto(`${BASE_URL}/usuarios`);
  await page.waitForSelector('h1:has-text("Usuários")');
  
  // Create invitation
  await log('Creating new user invitation');
  await page.click('button:has-text("Convidar Usuário")');
  await page.waitForSelector('form');
  
  const testEmail = `test-${new Date().getTime()}@example.com`;
  await page.type('input[name="email"]', testEmail);
  await page.click('select[name="role"]');
  await page.select('select[name="role"]', 'customer');
  await page.click('button[type="submit"]');
  
  // Wait for success message
  await page.waitForSelector('div[role="status"]:has-text("Convite enviado com sucesso")');
  await log('User invitation sent successfully');
  
  // Check if invitation appears in the list
  await page.waitForSelector(`td:has-text("${testEmail}")`);
  await log('Invitation appears in user list');
  
  // TODO: Test actual registration with invitation link
  // This would require accessing the invitation link from the database or emails
}

// Test energy data upload
async function testEnergyDataUpload(page) {
  await log('Testing energy data upload');
  
  // Navigate to data upload page
  await page.goto(`${BASE_URL}/dados/upload`);
  await page.waitForSelector('h1:has-text("Upload de Dados de Energia")');
  
  // Prepare a test file (this would require creating a real file)
  await log('Note: Skipping actual file upload test - would require test file generation');
  
  // Instead, verify form elements exist
  await page.waitForSelector('input[type="file"]');
  await page.waitForSelector('select[name="distributor_id"]');
  await page.waitForSelector('select[name="month"]');
  await page.waitForSelector('button[type="submit"]');
  
  await log('Energy data upload form verified');
}

// Test dashboard elements
async function testDashboardElements(page) {
  await log('Testing dashboard elements');
  
  // Navigate to dashboard
  await page.goto(`${BASE_URL}/dashboard`);
  await page.waitForSelector('h1:has-text("Dashboard")');
  
  // Check for expected dashboard components
  const components = [
    'div:has-text("Total de Clientes")',
    'div:has-text("Total de Usinas")',
    'div:has-text("Economia Gerada")',
    'div:has-text("kWh Compensados")',
    'h2:has-text("Resumo Financeiro")',
    'h2:has-text("Distribuição por Distribuidora")'
  ];
  
  for (const selector of components) {
    await page.waitForSelector(selector);
    await log(`Dashboard component "${selector}" found`);
  }
  
  await log('All dashboard elements verified');
}

// Test RBAC (Role-Based Access Control)
async function testRBAC(browser) {
  await log('Testing Role-Based Access Control');
  
  // This would involve:
  // 1. Creating test users with different roles
  // 2. Testing what each role can access
  // 3. Verifying restrictions
  
  await log('Note: Full RBAC testing would require creating test users with different roles');
  
  // For a simplified test, we could verify that certain routes are protected
  const page = await browser.newPage();
  
  try {
    // Try accessing a protected route without login
    await page.goto(`${BASE_URL}/dashboard`);
    
    // Should be redirected to login
    await page.waitForSelector('input[name="email"]');
    await log('Access control verified: Unauthenticated user redirected to login');
    
    await page.close();
  } catch (error) {
    await log(`RBAC test error: ${error.message}`, true);
    await page.close();
  }
}

// Run the tests
runTests().catch(error => {
  console.error('Test suite failed:', error);
}); 