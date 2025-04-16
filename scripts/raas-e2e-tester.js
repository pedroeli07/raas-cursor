/**
 * RaaS Platform E2E Testing Script
 * Tests super admin functionality, user flows, and CRUD operations
 */

const puppeteer = require('puppeteer');
const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');

// Configuration
const config = {
  baseUrl: 'http://localhost:3000',
  superAdminEmail: 'pedro-eli@hotmail.com',
  superAdminPassword: 'password123', // Replace with actual password
  screenshotsDir: path.join(__dirname, 'test-screenshots'),
  logFile: path.join(__dirname, 'test-results.log'),
  users: {
    customer: {
      email: `customer-${Date.now()}@test.com`,
      name: 'Test Customer',
      password: 'TestPass123!'
    },
    renter: {
      email: `renter-${Date.now()}@test.com`,
      name: 'Test Energy Renter',
      password: 'TestPass123!'
    }
  }
};

// Ensure screenshots directory exists
if (!fs.existsSync(config.screenshotsDir)) {
  fs.mkdirSync(config.screenshotsDir, { recursive: true });
}

// Set up logging
const logger = {
  log: (message) => {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] INFO: ${message}`;
    console.log(logMessage);
    fs.appendFileSync(config.logFile, logMessage + '\n');
  },
  error: (message, error = null) => {
    const timestamp = new Date().toISOString();
    const errorDetails = error ? `\n${error.stack || error}` : '';
    const logMessage = `[${timestamp}] ERROR: ${message}${errorDetails}`;
    console.error(logMessage);
    fs.appendFileSync(config.logFile, logMessage + '\n');
  },
  success: (message) => {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] SUCCESS: ${message}`;
    console.log('\x1b[32m%s\x1b[0m', logMessage); // Green color
    fs.appendFileSync(config.logFile, logMessage + '\n');
  }
};

// Initialize log file
fs.writeFileSync(config.logFile, `=== RaaS E2E Test Run - ${new Date().toISOString()} ===\n\n`);

// Helper functions
async function takeScreenshot(page, name) {
  const screenshotPath = path.join(config.screenshotsDir, `${name}-${Date.now()}.png`);
  await page.screenshot({ path: screenshotPath, fullPage: true });
  logger.log(`Screenshot saved: ${screenshotPath}`);
  return screenshotPath;
}

async function waitForNavigation(page) {
  try {
    await page.waitForNavigation({ timeout: 10000, waitUntil: 'networkidle0' });
  } catch (error) {
    logger.log('Navigation timeout - continuing anyway');
  }
}

// Main test runner
async function runTests() {
  let browser;
  let page;
  
  try {
    logger.log('Starting E2E tests for RaaS platform');
    
    // Launch browser
    logger.log('Launching browser');
    browser = await puppeteer.launch({
      headless: false, // Set to true for production runs
      defaultViewport: null,
      args: ['--start-maximized']
    });
    
    page = await browser.newPage();
    
    // Log in as super admin
    await loginAsSuperAdmin(page);
    
    // Test dashboard access
    await testDashboardAccess(page);
    
    // Test user management
    const inviteUrls = await testUserInvites(page);
    
    // Test installation management
    await testInstallationManagement(page);
    
    // Test distributor management
    await testDistributorManagement(page);
    
    // Test energy data uploads
    await testEnergyDataUploads(page);
    
    // Test invited user registration (in new browser contexts)
    await testInvitedUserRegistration(browser, inviteUrls);
    
    // Test API endpoints
    await testApiEndpoints();
    
    logger.success('All tests completed successfully!');
  } catch (error) {
    logger.error('Test run failed', error);
    if (page) {
      await takeScreenshot(page, 'test-failure');
    }
  } finally {
    if (browser) {
      await browser.close();
    }
    logger.log('Browser closed. Test run completed.');
  }
}

// Test implementations
async function loginAsSuperAdmin(page) {
  try {
    logger.log('Navigating to login page');
    await page.goto(`${config.baseUrl}/login`);
    
    logger.log(`Logging in as super admin: ${config.superAdminEmail}`);
    await page.waitForSelector('input[name="email"]');
    await page.type('input[name="email"]', config.superAdminEmail);
    await page.type('input[name="password"]', config.superAdminPassword);
    
    await Promise.all([
      page.click('button[type="submit"]'),
      page.waitForNavigation({ waitUntil: 'networkidle0' })
    ]);
    
    // Verify login successful
    const currentUrl = page.url();
    if (currentUrl.includes('/dashboard')) {
      logger.success('Super admin login successful');
      await takeScreenshot(page, 'login-success');
    } else {
      throw new Error(`Login failed. Current URL: ${currentUrl}`);
    }
  } catch (error) {
    logger.error('Super admin login failed', error);
    await takeScreenshot(page, 'login-failed');
    throw error;
  }
}

async function testDashboardAccess(page) {
  try {
    logger.log('Testing dashboard access');
    
    // Test main dashboard
    await page.goto(`${config.baseUrl}/dashboard`);
    await page.waitForSelector('h1', { timeout: 5000 });
    logger.success('Dashboard access verified');
    
    // Test users page
    await page.goto(`${config.baseUrl}/dashboard/users`);
    await page.waitForSelector('table', { timeout: 5000 });
    logger.success('Users page access verified');
    
    // Test installations page
    await page.goto(`${config.baseUrl}/dashboard/installations`);
    await page.waitForSelector('table', { timeout: 5000 });
    logger.success('Installations page access verified');
    
    // Test distributors page
    await page.goto(`${config.baseUrl}/dashboard/distributors`);
    await page.waitForSelector('table', { timeout: 5000 });
    logger.success('Distributors page access verified');
    
    await takeScreenshot(page, 'dashboard-access');
  } catch (error) {
    logger.error('Dashboard access test failed', error);
    await takeScreenshot(page, 'dashboard-access-failed');
    throw error;
  }
}

async function testUserInvites(page) {
  try {
    logger.log('Testing user invite functionality');
    const inviteUrls = [];
    
    // Navigate to users page
    await page.goto(`${config.baseUrl}/dashboard/users`);
    await page.waitForSelector('button:has-text("Convidar Usuário")', { timeout: 5000 });
    
    // Invite customer user
    logger.log('Creating invite for customer user');
    await page.click('button:has-text("Convidar Usuário")');
    await page.waitForSelector('form[data-testid="invite-form"]', { timeout: 5000 });
    
    await page.type('input[name="email"]', config.users.customer.email);
    await page.select('select[name="role"]', 'customer');
    
    await Promise.all([
      page.click('button[type="submit"]'),
      page.waitForSelector('.toast-success', { timeout: 10000 })
    ]);
    
    // Extract invite URL from the page or find it in the users list
    const customerInviteUrl = await extractInviteUrl(page, config.users.customer.email);
    inviteUrls.push({ type: 'customer', url: customerInviteUrl });
    
    // Invite energy renter user
    logger.log('Creating invite for energy renter');
    await page.click('button:has-text("Convidar Usuário")');
    await page.waitForSelector('form[data-testid="invite-form"]', { timeout: 5000 });
    
    await page.type('input[name="email"]', config.users.renter.email);
    await page.select('select[name="role"]', 'energy_renter');
    
    await Promise.all([
      page.click('button[type="submit"]'),
      page.waitForSelector('.toast-success', { timeout: 10000 })
    ]);
    
    // Extract invite URL
    const renterInviteUrl = await extractInviteUrl(page, config.users.renter.email);
    inviteUrls.push({ type: 'renter', url: renterInviteUrl });
    
    logger.success('User invites created successfully');
    await takeScreenshot(page, 'user-invites');
    
    return inviteUrls;
  } catch (error) {
    logger.error('User invite test failed', error);
    await takeScreenshot(page, 'user-invites-failed');
    throw error;
  }
}

async function extractInviteUrl(page, email) {
  // This is a placeholder function - implementation depends on how invites are displayed in your app
  // For example, if invite URLs are shown in a table:
  await page.waitForSelector(`tr:has-text("${email}")`);
  const row = await page.$(`tr:has-text("${email}")`);
  await row.click('button:has-text("Ver Link")');
  await page.waitForSelector('.modal');
  const inviteUrl = await page.$eval('.invite-link', el => el.textContent);
  await page.click('.modal button:has-text("Fechar")');
  return inviteUrl;
}

async function testInstallationManagement(page) {
  try {
    logger.log('Testing installation management');
    
    // Navigate to installations page
    await page.goto(`${config.baseUrl}/dashboard/installations`);
    await page.waitForSelector('button:has-text("Nova Instalação")', { timeout: 5000 });
    
    // Create a new installation
    await page.click('button:has-text("Nova Instalação")');
    await page.waitForSelector('form[data-testid="installation-form"]', { timeout: 5000 });
    
    // Fill installation form
    const installationNumber = `INS${Date.now().toString().slice(-6)}`;
    await page.type('input[name="installationNumber"]', installationNumber);
    await page.select('select[name="type"]', 'consumer');
    await page.select('select[name="distributorId"]', '1'); // Select first distributor
    
    await Promise.all([
      page.click('button[type="submit"]'),
      page.waitForSelector('.toast-success', { timeout: 10000 })
    ]);
    
    // Verify installation was created
    await page.waitForSelector(`tr:has-text("${installationNumber}")`);
    
    logger.success(`Installation created: ${installationNumber}`);
    await takeScreenshot(page, 'installation-created');
    
    // Test editing the installation
    const editButton = await page.$(`tr:has-text("${installationNumber}") button:has-text("Editar")`);
    await editButton.click();
    
    await page.waitForSelector('form[data-testid="installation-form"]', { timeout: 5000 });
    
    // Update some field
    const updatedNumber = `${installationNumber}-UPDATED`;
    await page.$eval('input[name="installationNumber"]', input => input.value = '');
    await page.type('input[name="installationNumber"]', updatedNumber);
    
    await Promise.all([
      page.click('button[type="submit"]'),
      page.waitForSelector('.toast-success', { timeout: 10000 })
    ]);
    
    await page.waitForSelector(`tr:has-text("${updatedNumber}")`);
    logger.success(`Installation updated: ${updatedNumber}`);
    
    // Test deleting the installation
    const deleteButton = await page.$(`tr:has-text("${updatedNumber}") button:has-text("Excluir")`);
    await deleteButton.click();
    
    await page.waitForSelector('.confirmation-dialog', { timeout: 5000 });
    await page.click('.confirmation-dialog button:has-text("Confirmar")');
    
    await page.waitForSelector('.toast-success', { timeout: 10000 });
    logger.success(`Installation deleted: ${updatedNumber}`);
    
  } catch (error) {
    logger.error('Installation management test failed', error);
    await takeScreenshot(page, 'installation-management-failed');
    throw error;
  }
}

async function testDistributorManagement(page) {
  try {
    logger.log('Testing distributor management');
    
    // Navigate to distributors page
    await page.goto(`${config.baseUrl}/dashboard/distributors`);
    await page.waitForSelector('button:has-text("Nova Distribuidora")', { timeout: 5000 });
    
    // Create a new distributor
    await page.click('button:has-text("Nova Distribuidora")');
    await page.waitForSelector('form[data-testid="distributor-form"]', { timeout: 5000 });
    
    // Fill distributor form
    const distributorName = `TESTE ${Date.now().toString().slice(-6)}`;
    const kwhPrice = '0.78';
    
    await page.type('input[name="name"]', distributorName);
    await page.type('input[name="kwhPrice"]', kwhPrice);
    
    await Promise.all([
      page.click('button[type="submit"]'),
      page.waitForSelector('.toast-success', { timeout: 10000 })
    ]);
    
    // Verify distributor was created
    await page.waitForSelector(`tr:has-text("${distributorName}")`);
    
    logger.success(`Distributor created: ${distributorName}`);
    await takeScreenshot(page, 'distributor-created');
    
    // Test editing the distributor
    const editButton = await page.$(`tr:has-text("${distributorName}") button:has-text("Editar")`);
    await editButton.click();
    
    await page.waitForSelector('form[data-testid="distributor-form"]', { timeout: 5000 });
    
    // Update kWh price
    const updatedPrice = '0.82';
    await page.$eval('input[name="kwhPrice"]', input => input.value = '');
    await page.type('input[name="kwhPrice"]', updatedPrice);
    
    await Promise.all([
      page.click('button[type="submit"]'),
      page.waitForSelector('.toast-success', { timeout: 10000 })
    ]);
    
    await page.waitForSelector(`tr:has-text("${distributorName}") td:has-text("${updatedPrice}")`);
    logger.success(`Distributor updated: ${distributorName} with price ${updatedPrice}`);
    
  } catch (error) {
    logger.error('Distributor management test failed', error);
    await takeScreenshot(page, 'distributor-management-failed');
    throw error;
  }
}

async function testEnergyDataUploads(page) {
  try {
    logger.log('Testing energy data uploads');
    
    // Navigate to energy data page
    await page.goto(`${config.baseUrl}/dashboard/energy-data`);
    await page.waitForSelector('button:has-text("Fazer Upload")', { timeout: 5000 });
    
    // Create mock energy data file
    const mockDataPath = path.join(__dirname, 'mock-energy-data.csv');
    createMockEnergyDataFile(mockDataPath);
    
    // Upload file
    const uploadInput = await page.$('input[type="file"]');
    await uploadInput.uploadFile(mockDataPath);
    
    // Select distributor for the upload
    await page.select('select[name="distributorId"]', '1'); // Select first distributor
    
    // Select month/year
    await page.select('select[name="month"]', '3'); // March
    await page.select('select[name="year"]', '2024');
    
    await Promise.all([
      page.click('button:has-text("Enviar")'),
      page.waitForSelector('.toast-success', { timeout: 20000 })
    ]);
    
    logger.success('Energy data uploaded successfully');
    await takeScreenshot(page, 'energy-data-upload');
    
    // Clean up the mock file
    fs.unlinkSync(mockDataPath);
    
  } catch (error) {
    logger.error('Energy data upload test failed', error);
    await takeScreenshot(page, 'energy-data-upload-failed');
    throw error;
  }
}

function createMockEnergyDataFile(filePath) {
  const mockData = `instalacaoNumber,consumption,generation,transfer,receipt,compensation,balance
INS123456,1000,,,,,
INS234567,,2000,1800,,,
INS345678,1500,,,,,
`;
  fs.writeFileSync(filePath, mockData);
  logger.log(`Created mock energy data file at ${filePath}`);
}

async function testInvitedUserRegistration(browser, inviteUrls) {
  if (!inviteUrls || inviteUrls.length === 0) {
    logger.error('No invite URLs available for testing user registration');
    return;
  }
  
  for (const invite of inviteUrls) {
    try {
      logger.log(`Testing registration for ${invite.type} user with invite: ${invite.url}`);
      
      // Open a new incognito context for this registration
      const context = await browser.createIncognitoBrowserContext();
      const page = await context.newPage();
      
      // Navigate to the invite URL
      await page.goto(invite.url);
      
      // Wait for the registration form
      await page.waitForSelector('form[data-testid="registration-form"]', { timeout: 10000 });
      
      // Fill the registration form
      const userData = config.users[invite.type];
      await page.type('input[name="name"]', userData.name);
      await page.type('input[name="password"]', userData.password);
      await page.type('input[name="confirmPassword"]', userData.password);
      
      // Submit the form
      await Promise.all([
        page.click('button[type="submit"]'),
        page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 10000 })
      ]);
      
      // Check if registration was successful (should be redirected to dashboard)
      const currentUrl = page.url();
      if (currentUrl.includes('/dashboard')) {
        logger.success(`${invite.type} user registered successfully`);
        
        // Check what they can access based on their role
        await testUserAccess(page, invite.type);
      } else {
        throw new Error(`Registration failed. Current URL: ${currentUrl}`);
      }
      
      await takeScreenshot(page, `${invite.type}-registration-success`);
      
      // Close this context
      await context.close();
      
    } catch (error) {
      logger.error(`${invite.type} user registration test failed`, error);
      // Continue with next invite
    }
  }
}

async function testUserAccess(page, userType) {
  // Test what pages this user can access based on their role
  const pagesToTest = [
    { path: '/dashboard', shouldBeAccessible: true },
    { path: '/dashboard/users', shouldBeAccessible: userType === 'admin' },
    { path: '/dashboard/installations', shouldBeAccessible: true },
    { path: '/dashboard/distributors', shouldBeAccessible: userType === 'admin' },
    { path: '/dashboard/energy-data', shouldBeAccessible: userType === 'admin' },
    { path: '/dashboard/billing', shouldBeAccessible: true }
  ];
  
  for (const testPage of pagesToTest) {
    try {
      await page.goto(`${config.baseUrl}${testPage.path}`);
      
      // Check for access denied or success
      const hasAccessDenied = await page.evaluate(() => {
        return document.body.textContent.includes('Acesso Negado') || 
               document.body.textContent.includes('Não Autorizado');
      });
      
      if (testPage.shouldBeAccessible && hasAccessDenied) {
        logger.error(`${userType} should have access to ${testPage.path} but was denied`);
      } else if (!testPage.shouldBeAccessible && !hasAccessDenied) {
        logger.error(`${userType} should NOT have access to ${testPage.path} but was allowed`);
      } else {
        logger.success(`${userType} access to ${testPage.path}: ${testPage.shouldBeAccessible ? 'Granted as expected' : 'Denied as expected'}`);
      }
      
    } catch (error) {
      logger.error(`Error testing ${userType} access to ${testPage.path}`, error);
    }
  }
}

async function testApiEndpoints() {
  logger.log('Testing API endpoints directly');
  
  try {
    // First login to get an auth token
    const loginResponse = await fetch(`${config.baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: config.superAdminEmail,
        password: config.superAdminPassword
      })
    });
    
    if (!loginResponse.ok) {
      throw new Error(`API login failed: ${loginResponse.status} ${loginResponse.statusText}`);
    }
    
    const loginData = await loginResponse.json();
    const token = loginData.token;
    
    logger.success('API login successful');
    
    // Test various API endpoints
    const endpoints = [
      { method: 'GET', path: '/api/users', name: 'Get Users' },
      { method: 'GET', path: '/api/installations', name: 'Get Installations' },
      { method: 'GET', path: '/api/distributors', name: 'Get Distributors' },
      { method: 'GET', path: '/api/energy-data', name: 'Get Energy Data' }
    ];
    
    for (const endpoint of endpoints) {
      const response = await fetch(`${config.baseUrl}${endpoint.path}`, {
        method: endpoint.method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        logger.success(`API ${endpoint.name} successful. Items: ${Array.isArray(data) ? data.length : 'N/A'}`);
      } else {
        logger.error(`API ${endpoint.name} failed: ${response.status} ${response.statusText}`);
      }
    }
  } catch (error) {
    logger.error('API endpoints test failed', error);
  }
}

// Run the tests
runTests().catch(err => {
  console.error('Unhandled error in test run:', err);
  process.exit(1);
}); 