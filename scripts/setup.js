/**
 * Setup script for installation of required packages
 * Run this first: node scripts/setup.js
 */
import { exec as execCallback } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { promisify } from 'util';

const exec = promisify(execCallback);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Make sure the scripts directory exists
if (!fs.existsSync(path.join(__dirname))) {
  fs.mkdirSync(path.join(__dirname), { recursive: true });
}

console.log('Installing required packages for automation...');

try {
  // Install Playwright
  const { stdout } = await exec('npm install --save-dev playwright@latest');
  console.log(stdout);
  console.log('Installation completed successfully!');
  console.log('\nNow you can run the automation script:');
  console.log('node scripts/register-admin.js');
} catch (error) {
  console.error(`Error installing packages: ${error.message}`);
} 