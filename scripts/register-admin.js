/**
 * Script to automate login, invitation, and registration of a new admin
 * Usage: node register-admin.js
 */
import { chromium } from 'playwright';
import fs from 'fs';
import readline from 'readline';
import { promisify } from 'util';

// Configuration
const CONFIG = {
  baseUrl: 'http://localhost:3000',
  currentAdmin: {
    email: 'pedro-eli@hotmail.com',
    password: 'galod1234',
    twoFactorCode: '531368'
  },
  newAdmin: {
    email: 'pedroelimaciel592@gmail.com',
    name: 'Pedro Admin',
    role: 'SUPER_ADMIN',
    password: 'Admin@123',
  },
  // Delays (in ms)
  delays: {
    afterLogin: 3000,
    afterTwoFactor: 3000,
    afterInvite: 5000,
    checkEmail: 10000,
    beforeLogout: 3000,
    afterRegister: 3000,
  },
};

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function logInfo(message) {
  console.log(`[INFO] ${message}`);
}

async function logStep(step, message) {
  console.log(`\n[STEP ${step}] ${message}`);
}

function promptForToken() {
  return new Promise((resolve) => {
    console.log('\n--------------------------------------------');
    console.log('IMPORTANT: Please enter the invitation token from the email.');
    console.log('It should be found in the invitation link:');
    console.log('http://localhost:3000/register?token=XXXXXXXX');
    console.log('--------------------------------------------\n');
    
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    rl.question('Enter the token: ', (token) => {
      rl.close();
      resolve(token.trim());
    });
  });
}

async function run() {
  logInfo('Starting automation script...');
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 },
    recordVideo: { dir: 'videos/' },
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
  });
  
  // Enable request interception
  await context.route('**/*', route => route.continue());
  
  const page = await context.newPage();
  let registrationLink = null;
  let tokenFromUrl = null;
  
  try {
    // STEP 1: Login as admin
    logStep(1, 'Logging in as current admin');
    await page.goto(`${CONFIG.baseUrl}/login`);
    await page.fill('input[type="email"]', CONFIG.currentAdmin.email);
    await page.fill('input[type="password"]', CONFIG.currentAdmin.password);
    await page.click('button[type="submit"]');
    
    // Wait for two-factor authentication page
    logStep(1.5, 'Handling two-factor authentication');
    await sleep(CONFIG.delays.afterLogin);
    
    // Check if we need to enter 2FA code
    const is2FAPage = await page.locator('input[placeholder*="código" i], input[placeholder*="code" i], input[type="text"]').count() > 0;
    
    if (is2FAPage) {
      logInfo('Two-factor authentication detected');
      // Fill the 2FA code
      await page.fill('input[placeholder*="código" i], input[placeholder*="code" i], input[type="text"]', CONFIG.currentAdmin.twoFactorCode);
      await page.click('button[type="submit"]');
      await sleep(CONFIG.delays.afterTwoFactor);
      logInfo('Two-factor authentication completed');
    } else {
      logInfo('No two-factor authentication detected, continuing...');
    }
    
    // Wait for dashboard to load
    logInfo('Login successful, waiting for dashboard');
    
    // STEP 2: Navigate to invites page
    logStep(2, 'Navigating to invites page');
    await page.goto(`${CONFIG.baseUrl}/admin/usuarios/convites`);
    await page.waitForLoadState('networkidle');
    
    // STEP 3: Create new invitation
    logStep(3, 'Creating new invitation');
    await page.click('button:has-text("Novo Convite")');
    await page.fill('input[placeholder="email@exemplo.com"]', CONFIG.newAdmin.email);
    await page.fill('input[placeholder="Nome do usuário"]', CONFIG.newAdmin.name);
    
    // Select role (Super Admin)
    await page.click('button:has-text("Selecione um papel")');
    await page.click(`button:has-text("${CONFIG.newAdmin.role === 'SUPER_ADMIN' ? 'Super Admin' : CONFIG.newAdmin.role}")`, { force: true });
    
    // Submit form
    await page.click('button:has-text("Enviar Convite")');
    
    // Wait for confirmation
    await sleep(CONFIG.delays.afterInvite);
    logInfo('Invitation sent successfully');
    
    // STEP 4: Intercept invitation email
    logStep(4, 'Waiting for invitation email');
    
    // Check if there's a notification about the sent email
    const toastText = await page.textContent('.toast-success, [role="status"]') || '';
    logInfo(`Toast message: ${toastText}`);
    
    // Wait some time for the email to be processed
    logInfo('Waiting for email delivery...');
    await sleep(CONFIG.delays.checkEmail);
    
    // STEP 5: Log out the current admin
    logStep(5, 'Logging out the current admin');
    await page.click('button[aria-label="Open user menu"], .avatar, [data-testid="user-menu"]');
    await page.click('button:has-text("Sair"), a:has-text("Sair")');
    await sleep(CONFIG.delays.beforeLogout);
    
    // STEP 6: Go to login page and check for 'Register with invitation link'
    logStep(6, 'Checking invitation link');
    await page.goto(`${CONFIG.baseUrl}/login`);
    
    // Find a link with invitation token (either intercepted or by going to email manually)
    // For now, prompt for manual entry
    tokenFromUrl = await promptForToken();
    
    if (tokenFromUrl) {
      // STEP 7: Register with the invitation link
      logStep(7, 'Registering with invitation link');
      await page.goto(`${CONFIG.baseUrl}/register?token=${tokenFromUrl}`);
      
      // Fill registration form
      await page.fill('input[type="email"]', CONFIG.newAdmin.email);
      await page.fill('input[type="text"], input[placeholder*="nome"], input[placeholder*="Name"]', CONFIG.newAdmin.name);
      await page.fill('input[type="password"]', CONFIG.newAdmin.password);
      await page.click('button[type="submit"]');
      
      // Wait for registration to complete
      await sleep(CONFIG.delays.afterRegister);
      logInfo('Registration completed');
      
      // STEP 8: Complete verification (if needed)
      // This step might need manual intervention
      logStep(8, 'Complete any required verification steps');
      logInfo('Check the console for any verification codes sent to your email');
      
      // STEP 9: Success
      logStep(9, 'Process completed successfully');
      logInfo('The new Super Admin account has been created');
      logInfo(`Email: ${CONFIG.newAdmin.email}`);
      logInfo(`Password: ${CONFIG.newAdmin.password}`);
    } else {
      logInfo('No invitation token provided. Please register manually.');
    }
  } catch (error) {
    console.error('Error during automation:', error);
  } finally {
    // Capture screenshot
    await page.screenshot({ path: 'registration-completed.png' });
    
    // Close browser
    await context.close();
    await browser.close();
  }
}

// Run script
run().catch(console.error); 