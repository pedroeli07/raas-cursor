/**
 * Enhanced script to check if the server is running
 * Tries multiple ports and saves screenshots
 */

import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function checkServer() {
  console.log('Checking server connection...');
  
  const browser = await chromium.launch({
    headless: false,
  });
  
  const page = await browser.newPage();
  
  try {
    // Try to connect to different ports and paths
    const urls = [
      'http://localhost:3000',
      'http://127.0.0.1:3000',
      'http://localhost:3001',
      'http://127.0.0.1:3001',
      'http://localhost:3000/login',
      'http://localhost:3001/login',
      'http://localhost:3000/completar-perfil',
      'http://localhost:3001/completar-perfil',
    ];
    
    for (const url of urls) {
      console.log(`\nTrying to connect to ${url}...`);
      
      try {
        // Increase timeout and wait for network idle
        const response = await page.goto(url, { 
          timeout: 15000,
          waitUntil: 'networkidle'
        });
        
        if (response) {
          const status = response.status();
          const title = await page.title();
          
          console.log(`✓ Connected to ${url}`);
          console.log(`  Status: ${status}`);
          console.log(`  Title: ${title}`);
          
          // Check what's visible on the page
          const h1Text = await page.evaluate(() => {
            const h1 = document.querySelector('h1');
            return h1 ? h1.textContent : 'No H1 found';
          });
          
          console.log(`  Page H1: ${h1Text}`);
          
          // Check if login form is visible
          const hasLoginForm = await page.evaluate(() => {
            return !!document.querySelector('form input[type="email"], form input[name="email"]');
          });
          
          console.log(`  Login form visible: ${hasLoginForm ? 'Yes' : 'No'}`);
          
          // Take screenshot with descriptive name
          const urlForFilename = url.replace(/[^a-z0-9]/gi, '-');
          const screenshotPath = path.join(__dirname, `server-check-${urlForFilename}-${Date.now()}.png`);
          await page.screenshot({ path: screenshotPath, fullPage: true });
          console.log(`  Screenshot saved to: ${path.basename(screenshotPath)}`);
          
          // Try to check DOM structure
          const domInfo = await page.evaluate(() => {
            return {
              forms: document.querySelectorAll('form').length,
              inputs: document.querySelectorAll('input').length,
              buttons: document.querySelectorAll('button').length
            };
          });
          
          console.log(`  DOM info: Forms=${domInfo.forms}, Inputs=${domInfo.inputs}, Buttons=${domInfo.buttons}`);
        }
      } catch (err) {
        console.log(`✗ Failed to connect to ${url}: ${err.message}`);
        
        // Take error screenshot anyway
        try {
          const urlForFilename = url.replace(/[^a-z0-9]/gi, '-');
          const screenshotPath = path.join(__dirname, `server-error-${urlForFilename}-${Date.now()}.png`);
          await page.screenshot({ path: screenshotPath });
          console.log(`  Error screenshot saved to: ${path.basename(screenshotPath)}`);
        } catch (e) {
          console.log(`  Could not capture error screenshot: ${e.message}`);
        }
      }
    }
  } catch (error) {
    console.error('Error during server check:', error);
  } finally {
    await browser.close();
    console.log('\nServer check completed');
  }
}

// Run the check
checkServer().catch(console.error); 