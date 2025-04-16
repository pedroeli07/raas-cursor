#!/usr/bin/env node

import { execSync } from 'child_process';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

// Get directory name in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Clear previous test results
const logFile = path.join(__dirname, 'test-results.log');
if (fs.existsSync(logFile)) {
  fs.unlinkSync(logFile);
  console.log('Previous test log cleared');
}

// Configuration
const config = {
  tests: [
    {
      name: 'RaaS Platform Test Suite',
      script: path.join(__dirname, 'raas-test-suite.js'),
      enabled: true
    }
  ]
};

console.log('Starting RaaS testing automation...');
console.log('=================================');

let hasFailures = false;

config.tests.forEach(test => {
  if (!test.enabled) {
    console.log(`Skipping disabled test: ${test.name}`);
    return;
  }
  
  console.log(`\nRunning test: ${test.name}`);
  console.log('---------------------------------');
  
  try {
    execSync(`node "${test.script}"`, { stdio: 'inherit' });
    console.log(`✅ Test completed: ${test.name}`);
  } catch (error) {
    console.error(`❌ Test failed: ${test.name}`);
    console.error(error.message);
    hasFailures = true;
  }
});

console.log('\n=================================');
console.log(`Test run ${hasFailures ? 'FAILED' : 'COMPLETED SUCCESSFULLY'}`);
console.log(`Detailed logs saved to: ${logFile}`);
console.log('=================================');

process.exit(hasFailures ? 1 : 0); 