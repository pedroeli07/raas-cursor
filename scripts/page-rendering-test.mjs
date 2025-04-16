#!/usr/bin/env node
/**
 * RaaS Solar - Page Rendering Test Script
 * Tests page rendering for different user roles
 */

import fetch from 'node-fetch';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { setTimeout } from 'timers/promises';

// Get the directory name correctly in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const BASE_URL = 'http://localhost:3000';
const API_URL = `${BASE_URL}/api`;
const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
const LOG_FILE = path.join(__dirname, `page-rendering-test-${timestamp}.log`);

// Global state
let authToken = null;
let currentUser = null;
const pageTestResults = {};

// Test users
const TEST_USERS = [
  {
    email: 'pedro-eli@hotmail.com',
    password: 'galod1234',
    role: 'SUPER_ADMIN',
    expectedPages: {
      '/dashboard': 200,
      '/users': 200,
      '/invitations': 200,
      '/distributors': 200,
      '/installations': 200,
      '/profile': 200,
      '/admin': 200,
      '/configuration': 200
    },
    forbiddenPages: {
      '/consumption': 403,
      '/invoices': 403,
      '/generation': 403,
      '/earnings': 403
    }
  }
  // Add more users as you identify their credentials
  // Examples:
  // {
  //   email: 'admin@example.com',
  //   password: 'password',
  //   role: 'ADMIN',
  //   expectedPages: { ... },
  //   forbiddenPages: { ... }
  // },
  // {
  //   email: 'customer@example.com',
  //   password: 'password',
  //   role: 'CUSTOMER',
  //   expectedPages: { ... },
  //   forbiddenPages: { ... }
  // }
];

// Logging utility
const logger = {
  INFO: '\x1b[36m%s\x1b[0m',    // Cyan
  SUCCESS: '\x1b[32m%s\x1b[0m',  // Green
  ERROR: '\x1b[31m%s\x1b[0m',    // Red
  WARNING: '\x1b[33m%s\x1b[0m',  // Yellow
  SECTION: '\x1b[35m%s\x1b[0m',  // Magenta
  
  log(message, level = 'INFO', skipConsole = false) {
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] [${level}] ${message}\n`;
    
    // Always write to log file
    fs.appendFileSync(LOG_FILE, logEntry);
    
    // Output to console with color unless skipped
    if (!skipConsole) {
      const colorFormat = this[level] || '%s';
      console.log(colorFormat, `[${level}] ${message}`);
    }
  },
  
  section(title) {
    const separator = '='.repeat(50);
    this.log(separator, 'SECTION');
    this.log(`  ${title.toUpperCase()}  `, 'SECTION');
    this.log(separator, 'SECTION');
  }
};

// Initialize log file
fs.writeFileSync(LOG_FILE, `Page Rendering Test Log - ${new Date().toISOString()}\n\n`);

// API helper functions
async function checkServerHealth() {
  logger.log('Testing server health...');
  
  try {
    const response = await fetch(`${API_URL}/health`);
    const data = await response.json();
    
    logger.log(`Server is healthy: ${JSON.stringify(data)}`, 'SUCCESS');
    return true;
  } catch (error) {
    logger.log(`Server health check failed: ${error.message}`, 'ERROR');
    return false;
  }
}

async function login(credentials) {
  logger.log(`Logging in as ${credentials.email} (${credentials.role})...`);
  
  try {
    const response = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: credentials.email,
        password: credentials.password
      })
    });
    
    if (response.status === 503) {
      logger.log('Authentication service unavailable. Database connection issue?', 'ERROR');
      return false;
    }
    
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || `HTTP error ${response.status}`);
    }
    
    authToken = data.token;
    currentUser = {
      email: credentials.email,
      role: credentials.role,
      ...data.user
    };
    
    logger.log(`Login successful as ${credentials.role}`, 'SUCCESS');
    logger.log(`User info: ${JSON.stringify(data.user || 'Not provided')}`, 'INFO');
    logger.log(`Token: ${authToken ? 'Received' : 'Not provided'}`, 'INFO');
    
    return true;
  } catch (error) {
    logger.log(`Login failed: ${error.message}`, 'ERROR');
    return false;
  }
}

async function logout() {
  logger.log('Logging out current user...');
  authToken = null;
  currentUser = null;
  logger.log('User logged out successfully', 'SUCCESS');
  return true;
}

async function getPageContent(url) {
  const fullUrl = `${BASE_URL}${url}`;
  
  try {
    const response = await fetch(fullUrl, {
      headers: authToken ? { 
        'Cookie': `auth=${authToken}; Path=/; HttpOnly; SameSite=Strict` 
      } : {}
    });
    
    let content = '';
    try {
      content = await response.text();
      // Extract title and h1 if possible
      const titleMatch = content.match(/<title>(.*?)<\/title>/i);
      const h1Match = content.match(/<h1[^>]*>(.*?)<\/h1>/i);
      
      const title = titleMatch ? titleMatch[1] : 'No title found';
      const heading = h1Match ? h1Match[1] : 'No heading found';
      
      logger.log(`Page title: "${title}"`, 'INFO');
      logger.log(`Page heading: "${heading}"`, 'INFO');
    } catch (e) {
      logger.log(`Could not parse page content: ${e.message}`, 'WARNING');
    }
    
    return {
      status: response.status,
      content: content.substring(0, 200) + '...' // Just log the first part for debugging
    };
  } catch (error) {
    logger.log(`Failed to fetch page: ${error.message}`, 'ERROR');
    return {
      status: 0,
      content: null,
      error: error.message
    };
  }
}

async function testPageRendering(pageUrl, expectedStatus = 200) {
  logger.log(`Testing page rendering: ${BASE_URL}${pageUrl}...`);
  
  try {
    const result = await getPageContent(pageUrl);
    
    if (result.status !== expectedStatus) {
      logger.log(`Page rendering failed: Expected status ${expectedStatus}, got ${result.status}`, 'ERROR');
      logger.log(`Content preview: ${result.content || 'No content'}`, 'ERROR');
      return false;
    }
    
    logger.log(`Page rendered successfully with status ${result.status}`, 'SUCCESS');
    return true;
  } catch (error) {
    logger.log(`Page rendering failed: ${error.message}`, 'ERROR');
    return false;
  }
}

async function testUserPagesRender(user) {
  logger.section(`TESTING PAGES FOR ${user.role}`);
  
  // Login as the user
  if (!await login(user)) {
    logger.log(`Aborting page tests for ${user.role} as login failed`, 'ERROR');
    return false;
  }
  
  // Initialize results for this user
  pageTestResults[user.role] = {
    expectedPages: {},
    forbiddenPages: {}
  };
  
  // First, test all expected accessible pages
  logger.log(`Testing ${Object.keys(user.expectedPages).length} accessible pages for ${user.role}...`, 'INFO');
  
  for (const [page, expectedStatus] of Object.entries(user.expectedPages)) {
    const result = await testPageRendering(page, expectedStatus);
    pageTestResults[user.role].expectedPages[page] = result;
    
    // Short delay between requests to avoid overwhelming the server
    await setTimeout(500);
  }
  
  // Then, test pages that should be forbidden
  if (user.forbiddenPages) {
    logger.log(`Testing ${Object.keys(user.forbiddenPages).length} forbidden pages for ${user.role}...`, 'INFO');
    
    for (const [page, expectedStatus] of Object.entries(user.forbiddenPages)) {
      const result = await testPageRendering(page, expectedStatus);
      pageTestResults[user.role].forbiddenPages[page] = result;
      
      // Short delay between requests
      await setTimeout(500);
    }
  }
  
  // Logout when done
  await logout();
  
  return true;
}

async function runTests() {
  logger.log(`Starting page rendering tests at ${new Date().toISOString()}`);
  
  // Test server health
  if (!await checkServerHealth()) {
    logger.log('Aborting tests as server is not healthy', 'ERROR');
    return;
  }
  
  // Run tests for each user
  for (const user of TEST_USERS) {
    await testUserPagesRender(user);
  }
  
  // Final summary
  logger.section('TEST SUMMARY');
  
  for (const [role, results] of Object.entries(pageTestResults)) {
    logger.log(`Results for ${role}:`, 'INFO');
    
    // Count successes and failures for expected pages
    const expectedSuccesses = Object.values(results.expectedPages).filter(r => r === true).length;
    const expectedTotal = Object.keys(results.expectedPages).length;
    
    logger.log(`- Expected pages: ${expectedSuccesses}/${expectedTotal} successful`, 
      expectedSuccesses === expectedTotal ? 'SUCCESS' : 'WARNING');
    
    // Count successes and failures for forbidden pages
    if (results.forbiddenPages) {
      const forbiddenSuccesses = Object.values(results.forbiddenPages).filter(r => r === true).length;
      const forbiddenTotal = Object.keys(results.forbiddenPages).length;
      
      logger.log(`- Forbidden pages: ${forbiddenSuccesses}/${forbiddenTotal} correctly forbidden`, 
        forbiddenSuccesses === forbiddenTotal ? 'SUCCESS' : 'WARNING');
    }
  }
  
  logger.log(`All tests completed at ${new Date().toISOString()}`, 'INFO');
  logger.log(`See log file for details: ${LOG_FILE}`, 'INFO');
}

// Execute tests
runTests().catch(error => {
  logger.log(`Unhandled error in test execution: ${error.message}`, 'ERROR');
  logger.log(error.stack, 'ERROR');
}); 