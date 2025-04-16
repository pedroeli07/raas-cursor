/**
 * Test Script for Installation Analysis Filters
 * 
 * This Node.js script tests the enhanced API endpoints for installation analysis,
 * including range filters for energy metrics. It handles authentication and logs
 * results for debugging.
 * 
 * Run with: node ./src/app/(main)/(private-pages)/admin/instalacoes/analisar/test-filters.js
 */

const fetch = require('node-fetch');
const { promises: fs } = require('fs');

// Configuration
const BASE_URL = 'http://localhost:3000';
const LOG_FILE = './filter-tests.log';

// Test cases for different filter combinations
const TEST_CASES = [
  {
    name: 'Basic consumption range filter',
    filters: {
      consumption_min: 500,
      consumption_max: 1000
    },
    expectedResults: {
      minCount: 0,
      description: 'Should return installations with consumption between 500-1000 kWh'
    }
  },
  {
    name: 'Generation range with period',
    filters: {
      generation_min: 800,
      period: '01/2023'
    },
    expectedResults: {
      minCount: 0, 
      description: 'Should return installations with generation above 800 kWh in January 2023'
    }
  },
  {
    name: 'Complex multi-filter test',
    filters: {
      consumption_min: 300,
      received_max: 1500,
      transferred_min: 50
    },
    expectedResults: {
      minCount: 0,
      description: 'Should return installations with consumption>300, received<1500, transferred>50'
    }
  }
];

// Helper function to log messages to console and file
async function log(message, data = null) {
  const timestamp = new Date().toISOString();
  const logMsg = `[${timestamp}] ${message}${data ? '\n' + JSON.stringify(data, null, 2) : ''}`;
  
  console.log(logMsg);
  
  try {
    await fs.appendFile(LOG_FILE, logMsg + '\n');
  } catch (error) {
    console.error('Failed to write to log file:', error);
  }
}

// Helper function to build URL with query parameters
function buildUrl(endpoint, params = {}) {
  const url = new URL(`${BASE_URL}${endpoint}`);
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      url.searchParams.append(key, value);
    }
  });
  return url.toString();
}

// Simulate login to get authentication token
async function login() {
  try {
    log('Attempting to login...');
    
    // In a real scenario, you would authenticate via your auth API
    // For testing purposes, you might need to extract a session token/cookie
    // from a browser session or use a pre-authenticated token
    
    // Mock login for now - in a real implementation, replace with actual auth
    const response = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'admin@example.com',  // Replace with valid credentials
        password: 'password123'      // Replace with valid credentials
      })
    });
    
    if (!response.ok) {
      throw new Error(`Login failed: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    log('Login successful', { userId: data.user?.id });
    
    // Return auth token or session cookie for subsequent requests
    return {
      token: data.token,
      cookies: response.headers.get('set-cookie')
    };
  } catch (error) {
    log('Login error', { error: error.message });
    throw error;
  }
}

// Test a specific filter
async function testFilter(auth, testCase) {
  try {
    log(`Running test: ${testCase.name}`);
    log('Filters', testCase.filters);
    
    const url = buildUrl('/api/installations', testCase.filters);
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${auth.token}`,
        'Cookie': auth.cookies,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error(`API request failed: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    
    // Validate results
    const passed = data.installations.length >= testCase.expectedResults.minCount;
    log(`Test result: ${passed ? 'PASSED' : 'FAILED'}`, {
      expectedMinCount: testCase.expectedResults.minCount,
      actualCount: data.installations.length,
      description: testCase.expectedResults.description,
      firstFewResults: data.installations.slice(0, 2).map(i => ({
        id: i.id,
        installationNumber: i.installationNumber,
        type: i.type,
        latestEnergyData: i.latestEnergyData
      }))
    });
    
    return {
      passed,
      actualCount: data.installations.length,
      results: data.installations
    };
  } catch (error) {
    log(`Test error for ${testCase.name}`, { error: error.message });
    return {
      passed: false,
      error: error.message
    };
  }
}

// Main test runner
async function runTests() {
  try {
    log('Starting filter tests');
    
    // Clear previous log file
    await fs.writeFile(LOG_FILE, '');
    
    // Get authentication
    const auth = await login();
    
    let passedTests = 0;
    let failedTests = 0;
    
    // Run each test case
    for (const testCase of TEST_CASES) {
      const result = await testFilter(auth, testCase);
      
      if (result.passed) {
        passedTests++;
      } else {
        failedTests++;
      }
    }
    
    // Log summary
    log('Tests completed', {
      total: TEST_CASES.length,
      passed: passedTests,
      failed: failedTests
    });
    
  } catch (error) {
    log('Test execution error', { error: error.message });
  }
}

// Run the tests
runTests(); 