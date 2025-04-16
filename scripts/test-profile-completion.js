/**
 * RaaS Solar Platform - Profile Completion Page Test
 * 
 * This script focuses exclusively on testing the profile completion page,
 * which appears to have rendering issues.
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
  baseUrl: 'http://localhost:3000', // Server is confirmed working on port 3000
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
  logPath: path.join(__dirname, 'logs', 'profile-completion-test.log'),
  screenshotDir: path.join(__dirname, 'screenshots', 'profile-completion'),
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

/**
 * Login to get access to profile completion page
 */
async function login(page) {
  logger.info('Logging in to access profile completion');
  
  try {
    await page.goto(`${config.baseUrl}/login`);
    await page.waitForLoadState('networkidle');
    
    await takeScreenshot(page, 'login-page');
    
    // Fill in login form
    await page.fill('input[name="email"]', config.credentials.email);
    await page.fill('input[name="password"]', config.credentials.password);
    
    // Login
    await Promise.all([
      page.waitForNavigation({ timeout: config.navigationTimeout }).catch(() => {}),
      page.click('button[type="submit"]')
    ]);
    
    // Check where we landed
    const currentUrl = page.url();
    logger.debug(`Current URL after login: ${currentUrl}`);
    
    if (currentUrl.includes('/completar-perfil')) {
      logger.info('Successfully landed on profile completion page');
      return true;
    } else if (currentUrl.includes('/dashboard')) {
      logger.info('Logged in but redirected to dashboard (profile already completed)');
      return false;
    } else {
      logger.error(`Unexpected redirect to ${currentUrl}`);
      await takeScreenshot(page, 'unexpected-redirect');
      return false;
    }
  } catch (error) {
    logger.error('Error during login', error);
    await takeScreenshot(page, 'login-error');
    return false;
  }
}

/**
 * Test different methods to access and interact with the profile completion page
 */
async function testProfileCompletion(page) {
  logger.info('Testing profile completion page');
  
  try {
    // Method 1: Direct navigation
    logger.debug('Method 1: Testing direct navigation to /completar-perfil');
    await page.goto(`${config.baseUrl}/completar-perfil`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForLoadState('networkidle').catch(() => {});
    
    await takeScreenshot(page, 'direct-navigation');
    
    // Check form visibility
    const formVisibleDirect = await page.isVisible('form');
    logger.debug(`Form visibility via direct navigation: ${formVisibleDirect}`);
    
    // Method 2: Reload page
    logger.debug('Method 2: Testing page reload');
    await page.reload();
    await page.waitForLoadState('networkidle').catch(() => {});
    
    await takeScreenshot(page, 'after-reload');
    
    // Method 3: New context with cookies preserved
    logger.debug('Method 3: Testing with fresh context but preserved auth');
    
    // Get cookies from current context
    const cookies = await page.context().cookies();
    const localStorage = await page.evaluate(() => JSON.stringify(localStorage));
    
    // Create new context with same cookies
    const newContext = await page.browser().newContext();
    await newContext.addCookies(cookies);
    
    // Create new page
    const newPage = await newContext.newPage();
    
    // Restore localStorage if available
    await newPage.goto(config.baseUrl);
    await newPage.evaluate(storageData => {
      try {
        const parsedData = JSON.parse(storageData);
        for (const [key, value] of Object.entries(parsedData)) {
          localStorage.setItem(key, value);
        }
      } catch (e) {
        console.error('Failed to restore localStorage', e);
      }
    }, localStorage);
    
    // Navigate to profile completion page
    await newPage.goto(`${config.baseUrl}/completar-perfil`);
    await newPage.waitForLoadState('networkidle').catch(() => {});
    
    await takeScreenshot(newPage, 'new-context');
    
    // Check form visibility
    const formVisibleNewContext = await newPage.isVisible('form');
    logger.debug(`Form visibility in new context: ${formVisibleNewContext}`);
    
    // Method 4: With delayed filling
    if (formVisibleNewContext) {
      logger.debug('Method 4: Testing form filling with delays');
      
      try {
        // Carefully fill each field with delays between actions
        await sleep(1000);
        await newPage.fill('input[name="fullName"]', config.profile.fullName);
        await sleep(500);
        
        await newPage.fill('input[name="phoneNumber"]', config.profile.phoneNumber);
        await sleep(500);
        
        await newPage.fill('input[name="cpf"]', config.profile.cpf);
        await sleep(500);
        
        await newPage.fill('input[name="rg"]', config.profile.rg);
        await sleep(500);
        
        // Take screenshot after filling personal info
        await takeScreenshot(newPage, 'personal-info-filled');
        
        // Switch to address tab
        await newPage.click('button[role="tab"]:has-text("Endereço")');
        await sleep(1000);
        
        // Fill address fields
        await newPage.fill('input[name="postalCode"]', config.profile.postalCode);
        await sleep(500);
        
        await newPage.fill('input[name="street"]', config.profile.street);
        await sleep(500);
        
        await newPage.fill('input[name="number"]', config.profile.number);
        await sleep(500);
        
        await newPage.fill('input[name="neighborhood"]', config.profile.neighborhood);
        await sleep(500);
        
        await newPage.fill('input[name="city"]', config.profile.city);
        await sleep(500);
        
        await newPage.fill('input[name="state"]', config.profile.state);
        await sleep(500);
        
        // Take screenshot after filling address info
        await takeScreenshot(newPage, 'address-info-filled');
        
        // Submit the form
        await Promise.all([
          newPage.waitForNavigation({ timeout: config.navigationTimeout }).catch(() => {}),
          newPage.click('form button[type="submit"]')
        ]);
        
        // Check result
        const finalUrl = newPage.url();
        logger.debug(`URL after form submission: ${finalUrl}`);
        
        await takeScreenshot(newPage, 'after-submission');
        
        if (finalUrl.includes('/dashboard')) {
          logger.info('Successfully completed profile!');
          return true;
        } else {
          logger.error(`Failed to complete profile. Current URL: ${finalUrl}`);
          return false;
        }
      } catch (error) {
        logger.error('Error during form filling', error);
        await takeScreenshot(newPage, 'form-fill-error');
        return false;
      } finally {
        await newContext.close();
      }
    } else {
      logger.error('Form not visible in any context, cannot proceed with testing');
      await newContext.close();
      return false;
    }
  } catch (error) {
    logger.error('Error testing profile completion', error);
    await takeScreenshot(page, 'profile-test-error');
    return false;
  }
}

/**
 * Debug the DOM state of the profile completion page
 */
async function debugProfileCompletionPage(page) {
  logger.info('Debugging profile completion page DOM');
  
  try {
    await page.goto(`${config.baseUrl}/completar-perfil`);
    await page.waitForLoadState('domcontentloaded');
    
    // Take screenshot immediately
    await takeScreenshot(page, 'debug-initial');
    
    // Analyze DOM structure
    const htmlContent = await page.content();
    logger.debug(`Page HTML size: ${htmlContent.length} bytes`);
    
    // Check for key elements
    const elementCounts = await page.evaluate(() => {
      return {
        forms: document.querySelectorAll('form').length,
        inputs: document.querySelectorAll('input').length,
        buttons: document.querySelectorAll('button').length,
        loadingIndicators: document.querySelectorAll('.loading, .spinner, [aria-busy="true"]').length,
        errors: document.querySelectorAll('.error, [role="alert"]').length,
        tabs: document.querySelectorAll('[role="tab"]').length
      };
    });
    
    logger.debug(`DOM analysis: ${JSON.stringify(elementCounts)}`);
    
    // Check console errors
    const consoleErrors = await page.evaluate(() => {
      if (window.console && console.error) {
        const originalError = console.error;
        const errors = [];
        
        console.error = function() {
          errors.push(Array.from(arguments).join(' '));
          originalError.apply(console, arguments);
        };
        
        // Force a render cycle
        setTimeout(() => {}, 100);
        
        return errors;
      }
      return [];
    });
    
    if (consoleErrors.length > 0) {
      logger.error(`Console errors: ${consoleErrors.join('\n')}`);
    }
    
    // Check network requests
    const [failures] = await Promise.all([
      page.waitForResponse(response => response.status() >= 400, { timeout: 5000 })
        .then(response => [{ url: response.url(), status: response.status() }])
        .catch(() => []),
      page.reload() // Trigger network requests
    ]);
    
    if (failures.length > 0) {
      logger.error(`Failed network requests: ${JSON.stringify(failures)}`);
    }
    
    // Try to debug React component state
    const reactDebug = await page.evaluate(() => {
      // Find React elements
      const reactElements = Array.from(document.querySelectorAll('*'))
        .filter(el => el._reactRootContainer || el.__reactFiber$ || el.__reactInternalInstance$);
      
      return {
        reactElementsCount: reactElements.length,
        hasReactRoot: !!document.querySelector('[data-reactroot]'),
        possibleErrors: Array.from(document.querySelectorAll('*'))
          .filter(el => el.textContent && el.textContent.includes('Error'))
          .map(el => el.textContent.slice(0, 100))
      };
    });
    
    logger.debug(`React debug info: ${JSON.stringify(reactDebug)}`);
    
    return {
      elementCounts,
      hasConsoleErrors: consoleErrors.length > 0,
      hasNetworkFailures: failures.length > 0,
      reactInfo: reactDebug
    };
  } catch (error) {
    logger.error('Error debugging profile completion page', error);
    return { error: error.message };
  }
}

/**
 * Run the tests
 */
async function runTest() {
  logger.info('Starting profile completion page test');
  
  const browser = await chromium.launch({ 
    headless: false, // Set to true for headless mode
    slowMo: 100
  });
  
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    recordVideo: { dir: path.join(__dirname, 'videos/') }
  });
  
  // Create videos directory
  const videosDir = path.join(__dirname, 'videos/');
  if (!fs.existsSync(videosDir)) {
    fs.mkdirSync(videosDir, { recursive: true });
  }
  
  const page = await context.newPage();
  
  // Set up logging for console messages and errors
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
  
  page.on('pageerror', error => {
    logger.error(`Page Error: ${error.message}`);
  });
  
  try {
    // Step 1: Try to login
    const loggedIn = await login(page);
    
    if (loggedIn) {
      // Step 2: Test profile completion page
      const completed = await testProfileCompletion(page);
      
      if (!completed) {
        // Step 3: If not completed, run debug routines
        logger.info('Running debug routines for profile completion page');
        const debugInfo = await debugProfileCompletionPage(page);
        logger.info(`Debug information: ${JSON.stringify(debugInfo, null, 2)}`);
      }
    } else {
      // If not logged in to profile completion page, try direct debugging
      logger.info('Not redirected to profile completion. Running direct debug.');
      const debugInfo = await debugProfileCompletionPage(page);
      logger.info(`Direct debug information: ${JSON.stringify(debugInfo, null, 2)}`);
    }
  } catch (error) {
    logger.error('Fatal error during test execution', error);
  } finally {
    // Take final screenshot
    await takeScreenshot(page, 'test-completion');
    
    // Close browser
    await context.close();
    await browser.close();
    
    logger.info('Test completed. Check logs and screenshots for results.');
  }
}

// Run test
runTest().catch(console.error); 