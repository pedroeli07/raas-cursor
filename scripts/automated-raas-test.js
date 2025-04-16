/**
 * RaaS Solar Platform - Full Automated Test Suite
 * 
 * This script automates testing for the RaaS platform, including:
 * - Registration with super_admin account (pedro-eli@hotmail.com)
 * - Profile completion
 * - Admin dashboard verification
 * - CRUD operations for distributors, installations, and users
 * - Invitation flow testing
 * - Log analysis and error detection
 */

import { chromium } from 'playwright';
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
    password: 'galod1234',
  },
  profile: {
    fullName: 'Pedro Administrador',
    phoneNumber: '11987654321',
    cpf: '12345678901',
    rg: '112233445',
    postalCode: '01234-567',
    street: 'Rua das Placas Solares',
    number: '123',
    neighborhood: 'Energias Renováveis',
    city: 'São Paulo',
    state: 'SP',
  },
  invitations: [
    { email: 'admin-teste@raas.com', name: 'Admin Teste', role: 'admin' },
    { email: 'cliente-teste@raas.com', name: 'Cliente Teste', role: 'customer' },
    { email: 'renter-teste@raas.com', name: 'Renter Teste', role: 'energy_renter' },
  ],
  distributor: {
    name: 'CEMIG Teste',
    price: '0.85',
  },
  installation: {
    number: '123456789',
    type: 'generator', // generator or consumer
    capacity: '5000',
  },
  logPath: path.join(__dirname, 'logs', 'automated-test.log'),
  screenshotDir: path.join(__dirname, 'screenshots'),
  navigationTimeout: 60000,
  defaultTimeout: 30000,
};

// Ensure directories exist
if (!fs.existsSync(config.screenshotDir)) {
  fs.mkdirSync(config.screenshotDir, { recursive: true });
}

if (!fs.existsSync(path.dirname(config.logPath))) {
  fs.mkdirSync(path.dirname(config.logPath), { recursive: true });
}

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
  },
  step: (stepNumber, message) => {
    const logEntry = `\n[STEP ${stepNumber}] [${new Date().toISOString()}] ${message}`;
    console.log(logEntry);
    fs.appendFileSync(config.logPath, logEntry + '\n');
  },
  success: (message) => {
    const logEntry = `[SUCCESS] [${new Date().toISOString()}] ${message}`;
    console.log(`\x1b[32m${logEntry}\x1b[0m`); // Green color
    fs.appendFileSync(config.logPath, logEntry + '\n');
  },
};

// Helper functions
async function takeScreenshot(page, name) {
  const fileName = `${name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}-${Date.now()}.png`;
  const filePath = path.join(config.screenshotDir, fileName);
  await page.screenshot({ path: filePath, fullPage: true });
  logger.debug(`Screenshot saved: ${fileName}`);
  return filePath;
}

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Test functions
async function registerAccount(page) {
  logger.step(1, 'Checking if registration is needed');
  
  try {
    // Go to login page
    await page.goto(`${config.baseUrl}/login`);
    
    // Fill in credentials
    await page.waitForSelector('input[name="email"]');
    await page.fill('input[name="email"]', config.credentials.email);
    await page.fill('input[name="password"]', config.credentials.password);
    
    // Take screenshot
    await takeScreenshot(page, 'login-form');
    
    // Try to login
    await page.click('button[type="submit"]');
    
    // Wait for navigation
    await page.waitForNavigation({ timeout: config.navigationTimeout })
      .catch(() => logger.debug('No navigation after login attempt'));
    
    // Check current URL to determine action
    const currentUrl = page.url();
    logger.debug(`Current URL after login attempt: ${currentUrl}`);
    
    if (currentUrl.includes('/login')) {
      // Login failed, check if we need to register
      logger.info('Login failed, trying to register');
      
      try {
        // Look for register link
        const registerLink = await page.$('a[href*="/register"]');
        if (registerLink) {
          await registerLink.click();
          await page.waitForNavigation();
          
          // Fill registration form
          await page.fill('input[name="email"]', config.credentials.email);
          await page.fill('input[name="password"]', config.credentials.password);
          await page.fill('input[name="name"]', config.profile.fullName);
          
          await takeScreenshot(page, 'registration-form');
          
          await page.click('button[type="submit"]');
          await page.waitForNavigation();
          
          logger.success('Registration successful');
          return 'registered';
        } else {
          // No register link, something else is wrong
          logger.error('Login failed and no registration link found');
          await takeScreenshot(page, 'login-failed');
          return 'error';
        }
      } catch (error) {
        logger.error('Error during registration', error);
        await takeScreenshot(page, 'registration-error');
        return 'error';
      }
    } else if (currentUrl.includes('/completar-perfil')) {
      // Need to complete profile
      logger.info('Login successful, need to complete profile');
      return 'complete-profile';
    } else if (currentUrl.includes('/dashboard')) {
      // Already logged in
      logger.success('Login successful, already has complete profile');
      return 'logged-in';
    } else {
      // Unknown state
      logger.error(`Unknown state after login, URL: ${currentUrl}`);
      await takeScreenshot(page, 'unknown-state');
      return 'error';
    }
  } catch (error) {
    logger.error('Error during login/registration', error);
    await takeScreenshot(page, 'login-registration-error');
    return 'error';
  }
}

async function completeProfile(page) {
  logger.step(2, 'Completing profile');
  
  try {
    // Check if we're on the profile completion page
    const currentUrl = page.url();
    logger.debug(`Current URL before profile completion: ${currentUrl}`);
    
    if (!currentUrl.includes('/completar-perfil')) {
      logger.debug('Not on profile completion page, navigating there...');
      await page.goto(`${config.baseUrl}/completar-perfil`);
      await page.waitForLoadState('networkidle');
      logger.debug('Page loaded, waiting for form elements...');
    }
    
    // Enable request/response logging
    page.on('request', request => {
      logger.debug(`Request: ${request.method()} ${request.url()}`);
    });
    
    page.on('response', response => {
      const status = response.status();
      const url = response.url();
      if (status >= 400) {
        logger.error(`Response Error: ${status} for ${url}`);
      } else {
        logger.debug(`Response: ${status} for ${url}`);
      }
    });
    
    // Check for visible elements before trying to fill form
    logger.debug('Checking for form visibility...');
    const formVisible = await page.isVisible('form');
    if (!formVisible) {
      logger.error('Form not visible on profile completion page');
      await takeScreenshot(page, 'profile-form-not-visible');
      return false;
    }
    
    // Personal Information Tab
    logger.debug('Waiting for fullName input...');
    await page.waitForSelector('input[name="fullName"]', { timeout: 10000 })
      .catch(e => {
        logger.error('Timeout waiting for fullName input', e);
        return false;
      });
    
    logger.debug('Filling personal information form...');
    await page.fill('input[name="fullName"]', config.profile.fullName);
    await page.fill('input[name="phoneNumber"]', config.profile.phoneNumber);
    await page.fill('input[name="cpf"]', config.profile.cpf);
    await page.fill('input[name="rg"]', config.profile.rg);
    
    // Check DOM state
    logger.debug('Getting page HTML for debugging...');
    const html = await page.content();
    logger.debug(`Page HTML length: ${html.length} characters`);
    
    // Switch to address tab
    logger.debug('Switching to address tab...');
    await page.click('button[role="tab"]:has-text("Endereço")');
    
    // Address Tab
    logger.debug('Filling address form...');
    await page.fill('input[name="postalCode"]', config.profile.postalCode);
    await page.fill('input[name="street"]', config.profile.street);
    await page.fill('input[name="number"]', config.profile.number);
    await page.fill('input[name="neighborhood"]', config.profile.neighborhood);
    await page.fill('input[name="city"]', config.profile.city);
    await page.fill('input[name="state"]', config.profile.state);
    
    await takeScreenshot(page, 'profile-form-completed');
    
    // Submit the form
    logger.debug('Submitting profile form...');
    await page.click('form button[type="submit"]');
    
    // Wait for redirection to dashboard
    logger.debug('Waiting for navigation after form submission...');
    await page.waitForNavigation({ timeout: config.navigationTimeout })
      .catch(() => logger.debug('No navigation after profile completion'));
    
    // Check if we're now on the dashboard
    const newUrl = page.url();
    logger.debug(`URL after form submission: ${newUrl}`);
    
    if (newUrl.includes('/dashboard')) {
      logger.success('Profile completion successful');
      return true;
    } else {
      logger.error(`Profile completion failed, URL: ${newUrl}`);
      await takeScreenshot(page, 'profile-completion-error');
      
      // Check for error messages on the page
      const errorMessages = await page.$$eval('.error, .toast-error, [role="alert"]', 
        elements => elements.map(el => el.textContent));
      
      if (errorMessages.length > 0) {
        logger.error(`Error messages found: ${errorMessages.join(', ')}`);
      }
      
      return false;
    }
  } catch (error) {
    logger.error('Error during profile completion', error);
    await takeScreenshot(page, 'profile-completion-exception');
    return false;
  }
}

async function testAdminDashboard(page) {
  logger.step(3, 'Testing admin dashboard access');
  
  try {
    // Ensure we're on the dashboard
    await page.goto(`${config.baseUrl}/dashboard`);
    
    // Check for admin-specific elements
    const adminElements = [
      { selector: 'a[href*="/admin/usuarios"], a[href*="/usuarios"]', name: 'Users Management' },
      { selector: 'a[href*="/admin/distribuidoras"], a[href*="/distribuidoras"]', name: 'Distributors Management' },
      { selector: 'a[href*="/admin/instalacoes"], a[href*="/instalacoes"]', name: 'Installations Management' },
      { selector: 'a[href*="/admin/convites"], a[href*="/convites"]', name: 'Invitations Management' },
    ];
    
    let allFound = true;
    for (const element of adminElements) {
      const found = await page.$(element.selector) !== null;
      if (found) {
        logger.debug(`Found ${element.name} in admin dashboard`);
      } else {
        logger.error(`${element.name} not found in admin dashboard`);
        allFound = false;
      }
    }
    
    await takeScreenshot(page, 'admin-dashboard');
    
    if (allFound) {
      logger.success('Admin dashboard verified successfully');
      return true;
    } else {
      logger.error('Some admin dashboard elements are missing');
      return false;
    }
  } catch (error) {
    logger.error('Error testing admin dashboard', error);
    await takeScreenshot(page, 'admin-dashboard-error');
    return false;
  }
}

async function testInvitationFlow(page) {
  logger.step(4, 'Testing invitation flow');
  
  try {
    // Navigate to invitation page
    await page.goto(`${config.baseUrl}/dashboard/admin/convites`);
    await page.waitForSelector('h1, h2');
    
    const inviteResults = [];
    
    // Create invites for different user types
    for (const invitation of config.invitations) {
      logger.debug(`Creating invitation for ${invitation.email} (${invitation.role})`);
      
      // Click on new invitation button
      await page.click('button:has-text("Novo Convite"), button:has-text("Adicionar")');
      await page.waitForSelector('form');
      
      // Fill invitation form
      await page.fill('input[name="email"]', invitation.email);
      await page.fill('input[name="name"]', invitation.name);
      
      // Select role
      await page.click('button:has-text("Selecione"), select[name="role"]');
      await page.click(`button:has-text("${invitation.role}"), option[value="${invitation.role}"]`);
      
      await takeScreenshot(page, `invitation-form-${invitation.role}`);
      
      // Submit invitation
      await Promise.all([
        page.waitForResponse(response => response.url().includes('/api/') && response.status() === 200),
        page.click('button[type="submit"]')
      ]).catch(() => {
        logger.debug('No matching response found after invitation submission');
      });
      
      // Check for success toast or message
      const success = await page.isVisible('.toast-success, [role="status"]');
      
      if (success) {
        logger.success(`Invitation to ${invitation.email} (${invitation.role}) sent successfully`);
        inviteResults.push({ email: invitation.email, role: invitation.role, status: 'success' });
      } else {
        logger.error(`Failed to send invitation to ${invitation.email}`);
        inviteResults.push({ email: invitation.email, role: invitation.role, status: 'error' });
        await takeScreenshot(page, `invitation-error-${invitation.role}`);
      }
      
      // Wait a moment before next invitation
      await sleep(2000);
    }
    
    // Check overall success
    const allSuccessful = inviteResults.every(result => result.status === 'success');
    
    if (allSuccessful) {
      logger.success('All invitations sent successfully');
    } else {
      logger.error('Some invitations failed');
    }
    
    return inviteResults;
  } catch (error) {
    logger.error('Error in invitation flow', error);
    await takeScreenshot(page, 'invitation-flow-error');
    return [];
  }
}

async function testDistributorCreation(page) {
  logger.step(5, 'Testing distributor creation');
  
  try {
    // Navigate to distributors page
    await page.goto(`${config.baseUrl}/dashboard/admin/distribuidoras`);
    await page.waitForSelector('h1, h2');
    
    // Create new distributor
    await page.click('button:has-text("Nova Distribuidora"), button:has-text("Adicionar")');
    await page.waitForSelector('form');
    
    // Fill distributor form
    await page.fill('input[name="name"]', config.distributor.name);
    await page.fill('input[name="price"]', config.distributor.price);
    
    await takeScreenshot(page, 'distributor-form');
    
    // Submit form
    await Promise.all([
      page.waitForNavigation({ timeout: 10000 }).catch(() => {}),
      page.click('button[type="submit"]')
    ]);
    
    // Check if distributor was created
    await page.waitForTimeout(2000); // Wait for UI to update
    
    // Try to find the distributor in the list
    const distributorInList = await page.isVisible(`text="${config.distributor.name}"`);
    
    if (distributorInList) {
      logger.success(`Distributor ${config.distributor.name} created successfully`);
      return true;
    } else {
      logger.error(`Failed to create distributor ${config.distributor.name}`);
      await takeScreenshot(page, 'distributor-creation-error');
      return false;
    }
  } catch (error) {
    logger.error('Error creating distributor', error);
    await takeScreenshot(page, 'distributor-creation-exception');
    return false;
  }
}

async function testInstallationCreation(page) {
  logger.step(6, 'Testing installation creation');
  
  try {
    // Navigate to installations page
    await page.goto(`${config.baseUrl}/dashboard/admin/instalacoes`);
    await page.waitForSelector('h1, h2');
    
    // Create new installation
    await page.click('button:has-text("Nova Instalação"), button:has-text("Adicionar")');
    await page.waitForSelector('form');
    
    // Fill installation form
    await page.fill('input[name="number"]', config.installation.number);
    
    // Select type
    await page.click('button:has-text("Selecione o tipo"), select[name="type"]');
    await page.click(`button:has-text("${config.installation.type === 'generator' ? 'Geradora' : 'Consumidora'}"), option[value="${config.installation.type}"]`);
    
    // Fill capacity if it's a generator
    if (config.installation.type === 'generator') {
      await page.fill('input[name="capacity"]', config.installation.capacity);
    }
    
    // Select distributor
    await page.click('button:has-text("Selecione a distribuidora"), select[name="distributor"]');
    await page.click(`button:has-text("${config.distributor.name}"), option:has-text("${config.distributor.name}")`);
    
    await takeScreenshot(page, 'installation-form');
    
    // Submit form
    await Promise.all([
      page.waitForNavigation({ timeout: 10000 }).catch(() => {}),
      page.click('button[type="submit"]')
    ]);
    
    // Check if installation was created
    await page.waitForTimeout(2000); // Wait for UI to update
    
    // Try to find the installation in the list
    const installationInList = await page.isVisible(`text="${config.installation.number}"`);
    
    if (installationInList) {
      logger.success(`Installation ${config.installation.number} created successfully`);
      return true;
    } else {
      logger.error(`Failed to create installation ${config.installation.number}`);
      await takeScreenshot(page, 'installation-creation-error');
      return false;
    }
  } catch (error) {
    logger.error('Error creating installation', error);
    await takeScreenshot(page, 'installation-creation-exception');
    return false;
  }
}

async function analyzeLogs() {
  logger.step(7, 'Analyzing logs for errors');
  
  try {
    const logContent = fs.readFileSync(config.logPath, 'utf8');
    const lines = logContent.split('\n');
    
    const errors = lines.filter(line => line.includes('[ERROR]'));
    const warnings = lines.filter(line => line.includes('[WARN]') || line.includes('Warning'));
    
    logger.info(`Found ${errors.length} errors and ${warnings.length} warnings in logs`);
    
    // Log summary
    if (errors.length > 0) {
      logger.error(`Error summary: ${errors.length} errors found`);
      errors.forEach((error, index) => {
        if (index < 10) { // Limit to first 10 errors
          logger.error(`- ${error}`);
        }
      });
      
      if (errors.length > 10) {
        logger.error(`... and ${errors.length - 10} more errors`);
      }
    }
    
    return {
      errorCount: errors.length,
      warningCount: warnings.length,
      errors: errors.slice(0, 10), // First 10 errors
      warnings: warnings.slice(0, 10), // First 10 warnings
    };
  } catch (error) {
    logger.error('Error analyzing logs', error);
    return {
      errorCount: -1,
      warningCount: -1,
      errors: [],
      warnings: [],
    };
  }
}

/**
 * Specialized test for the profile completion page
 */
async function testProfileCompletionOnly(page) {
  logger.step('P', 'SPECIALIZED TEST: Profile completion page debugging');
  
  try {
    // First try direct navigation to profile completion page
    logger.debug('Directly navigating to profile completion page...');
    await page.goto(`${config.baseUrl}/completar-perfil`);
    
    // Wait for network to be idle to ensure all resources are loaded
    await page.waitForLoadState('networkidle', { timeout: 30000 })
      .catch(e => logger.error('Timeout waiting for network idle', e));
    
    // Take a screenshot immediately after load
    await takeScreenshot(page, 'profile-direct-navigation');
    
    // Check DOM structure
    logger.debug('Analyzing DOM structure...');
    const formExists = await page.isVisible('form');
    logger.debug(`Form visibility: ${formExists}`);
    
    // Dump important DOM elements
    const elements = await page.$$eval('form, input, button, div.loading, div.error', 
      els => els.map(el => ({ 
        tag: el.tagName, 
        id: el.id, 
        class: el.className,
        type: el.type,
        visible: el.offsetParent !== null
      })));
    
    logger.debug(`Found ${elements.length} critical elements on the page`);
    elements.forEach(el => {
      logger.debug(`Element: ${el.tag} | ID: ${el.id} | Class: ${el.class} | Type: ${el.type} | Visible: ${el.visible}`);
    });
    
    // Check for loading indicators
    const loadingElements = await page.$$('.loading, .spinner, [aria-busy="true"]');
    if (loadingElements.length > 0) {
      logger.debug(`Found ${loadingElements.length} loading indicators`);
      
      // Wait a bit more to see if loading completes
      logger.debug('Waiting 10 more seconds to see if loading completes...');
      await page.waitForTimeout(10000);
      
      // Check if they're still visible
      const stillLoading = await page.isVisible('.loading, .spinner, [aria-busy="true"]');
      logger.debug(`After waiting, loading indicators still visible: ${stillLoading}`);
      
      await takeScreenshot(page, 'profile-after-waiting');
    }
    
    // Try to check React component rendering
    logger.debug('Checking for React errors...');
    const errors = await page.evaluate(() => {
      const errorElements = Array.from(document.querySelectorAll('*')).filter(el => 
        el.__reactFiber$ && el.textContent.includes('Error'));
      return errorElements.map(el => el.textContent);
    });
    
    if (errors.length > 0) {
      logger.error(`Found React errors: ${errors.join(', ')}`);
    } else {
      logger.debug('No visible React errors found');
    }
    
    // Check network requests for failed API calls
    logger.debug('Checking for failed API calls...');
    const requests = [];
    const responses = [];
    
    // Set up request/response listeners
    page.on('request', request => requests.push({
      url: request.url(),
      method: request.method(),
      time: new Date().toISOString()
    }));
    
    page.on('response', response => responses.push({
      url: response.url(),
      status: response.status(),
      time: new Date().toISOString()
    }));
    
    // Try to refresh the page
    logger.debug('Refreshing page to observe requests...');
    await page.reload({ waitUntil: 'networkidle' });
    
    // Log the requests and responses
    logger.debug(`Captured ${requests.length} requests and ${responses.length} responses`);
    
    // Log failed responses
    const failedResponses = responses.filter(r => r.status >= 400);
    if (failedResponses.length > 0) {
      logger.error(`Found ${failedResponses.length} failed API responses:`);
      failedResponses.forEach(r => {
        logger.error(`  ${r.status} - ${r.url}`);
      });
    }
    
    // Try to interact with the form if it exists
    if (formExists) {
      logger.debug('Attempting to interact with the form...');
      
      // Try to locate the first input
      const firstInput = await page.$('input');
      
      if (firstInput) {
        logger.debug('Found an input field, trying to interact with it');
        
        // Try to focus and type into it
        await firstInput.focus();
        await firstInput.type('Test');
        
        logger.debug('Interaction with input field succeeded');
      } else {
        logger.error('No input fields found despite form being visible');
      }
    }
    
    logger.debug('Profile completion debugging test completed');
    await takeScreenshot(page, 'profile-debug-complete');
    
    return {
      formExists,
      elementsFound: elements.length,
      loadingIndicators: loadingElements.length,
      failedRequests: failedResponses.length
    };
    
  } catch (error) {
    logger.error('Error during profile completion debugging', error);
    await takeScreenshot(page, 'profile-debug-error');
    return { error: error.message };
  }
}

async function runTests() {
  logger.info('Starting RaaS automated testing');
  logger.info(`Test time: ${new Date().toISOString()}`);
  logger.info(`Base URL: ${config.baseUrl}`);
  
  // Clear log file
  fs.writeFileSync(config.logPath, '');
  
  // Set to true for headless testing
  const headless = false;
  
  logger.info(`Running in ${headless ? 'headless' : 'headed'} mode`);
  
  const browser = await chromium.launch({ 
    headless: headless,
    slowMo: 100, // Increased slowdown for stability
    args: ['--disable-web-security', '--disable-features=IsolateOrigins', '--disable-site-isolation-trials'],
    timeout: 60000
  });
  
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    recordVideo: { dir: path.join(__dirname, 'videos/') },
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
    // Ignore HTTPS errors
    ignoreHTTPSErrors: true,
    // Use permissive permissions
    permissions: ['geolocation', 'notifications'],
    // Increase timeouts
    navigationTimeout: config.navigationTimeout,
    // Pass browser console logs to our logger
    logger: {
      isEnabled: () => true,
      log: (name, severity, message) => {
        if (severity === 'error' || severity === 'warning') {
          logger.error(`Browser console ${severity}: ${message}`);
        } else {
          logger.debug(`Browser console ${severity}: ${message}`);
        }
      }
    }
  });
  
  // Create videos directory if it doesn't exist
  const videosDir = path.join(__dirname, 'videos/');
  if (!fs.existsSync(videosDir)) {
    fs.mkdirSync(videosDir, { recursive: true });
  }
  
  const page = await context.newPage();
  page.setDefaultTimeout(config.defaultTimeout);
  
  // Listen for console messages
  page.on('console', msg => {
    const type = msg.type();
    const text = msg.text();
    if (type === 'error') {
      logger.error(`Console Error: ${text}`);
    } else if (type === 'warning') {
      logger.debug(`Console Warning: ${text}`);
    } else {
      logger.debug(`Console ${type}: ${text}`);
    }
  });
  
  // Listen for page errors
  page.on('pageerror', exception => {
    logger.error(`Page Error: ${exception.message}`);
  });
  
  // Listen for dialog events
  page.on('dialog', async dialog => {
    logger.debug(`Dialog: ${dialog.type()} - ${dialog.message()}`);
    await dialog.dismiss();
  });
  
  const results = {
    registrationStatus: null,
    profileCompletion: false,
    adminDashboardVerified: false,
    invitationResults: [],
    distributorCreated: false,
    installationCreated: false,
    logAnalysis: null,
  };
  
  try {
    // Step 1: Register/Login
    results.registrationStatus = await registerAccount(page);
    
    // Step 2: Complete profile if needed
    if (results.registrationStatus === 'complete-profile') {
      results.profileCompletion = await completeProfile(page);
    } else if (results.registrationStatus === 'logged-in') {
      results.profileCompletion = true;
    }
    
    // Stop if registration or profile completion failed
    if (results.registrationStatus === 'error' || !results.profileCompletion) {
      logger.error('Cannot proceed due to registration or profile completion failure');
      return results;
    }
    
    // Step 3: Verify admin dashboard
    results.adminDashboardVerified = await testAdminDashboard(page);
    
    // Stop if admin dashboard verification failed
    if (!results.adminDashboardVerified) {
      logger.error('Cannot proceed due to admin dashboard verification failure');
      return results;
    }
    
    // Step 4: Test invitation flow
    results.invitationResults = await testInvitationFlow(page);
    
    // Step 5: Create distributor
    results.distributorCreated = await testDistributorCreation(page);
    
    // Step 6: Create installation if distributor was created
    if (results.distributorCreated) {
      results.installationCreated = await testInstallationCreation(page);
    }
    
    // Step 7: Analyze logs
    results.logAnalysis = await analyzeLogs();
    
    if (results.registrationStatus === 'complete-profile' || results.registrationStatus === 'error') {
      logger.info('Running specialized profile completion debugging...');
      const debugResults = await testProfileCompletionOnly(page);
      logger.info(`Debug results: ${JSON.stringify(debugResults)}`);
    }
    
  } catch (error) {
    logger.error('Unhandled error during test execution', error);
  } finally {
    // Take final screenshot
    await takeScreenshot(page, 'test-completion');
    
    // Print test summary
    logger.info('\n==== TEST SUMMARY ====');
    logger.info(`Registration: ${results.registrationStatus}`);
    logger.info(`Profile Completion: ${results.profileCompletion ? 'Success' : 'Failed'}`);
    logger.info(`Admin Dashboard: ${results.adminDashboardVerified ? 'Verified' : 'Failed'}`);
    logger.info(`Invitations: ${results.invitationResults.filter(r => r.status === 'success').length}/${results.invitationResults.length} successful`);
    logger.info(`Distributor Creation: ${results.distributorCreated ? 'Success' : 'Failed'}`);
    logger.info(`Installation Creation: ${results.installationCreated ? 'Success' : 'Failed'}`);
    
    if (results.logAnalysis) {
      logger.info(`Log Analysis: ${results.logAnalysis.errorCount} errors, ${results.logAnalysis.warningCount} warnings`);
    }
    
    // Calculate overall success
    const overallSuccess = 
      results.registrationStatus !== 'error' && 
      results.profileCompletion && 
      results.adminDashboardVerified &&
      results.distributorCreated &&
      results.installationCreated;
    
    if (overallSuccess) {
      logger.success('ALL TESTS PASSED SUCCESSFULLY!');
    } else {
      logger.error('SOME TESTS FAILED. See log for details.');
    }
    
    // Close browser
    await context.close();
    await browser.close();
  }
  
  return results;
}

// Run the tests
runTests().catch(error => {
  console.error('Fatal error:', error);
}); 