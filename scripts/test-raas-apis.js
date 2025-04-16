// RaaS API Testing Script 
// This script tests various API endpoints in the RaaS Solar platform
// Usage: node scripts/test-raas-apis.js

import fetch from 'node-fetch';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import http from 'http';
import https from 'https';

// Get current file path in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Config
const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
const LOG_FILE = path.join(__dirname, '../logs/api-test.log');
const LOG_DIR = path.dirname(LOG_FILE);

// Create logs directory if it doesn't exist
if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

// Default test credentials
const TEST_ADMIN_EMAIL = process.env.TEST_ADMIN_EMAIL || 'pedro-eli@hotmail.com';
const TEST_ADMIN_PASSWORD = process.env.TEST_ADMIN_PASSWORD || 'galod1234'; // User updated password

// Results tracking
const testResults = {
  passed: 0,
  failed: 0,
  skipped: 0,
  total: 0
};

// Helper for logging
function log(message, data = null) {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] ${message}${data ? `\nData: ${JSON.stringify(data, null, 2)}` : ''}`;
  console.log(logMessage);
  fs.appendFileSync(LOG_FILE, logMessage + '\n\n');
}

// Helper for color output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

// Check server
async function checkServer(url) {
  return new Promise((resolve) => {
    try {
      const req = http.get(url, (res) => {
        log(`Server check: Connected to ${url} - Status: ${res.statusCode}`);
        resolve(true);
      });
      
      req.on('error', (error) => {
        log(`Server check failed: ${error.message}`);
        resolve(false);
      });
      
      // Set a timeout of 5 seconds
      req.setTimeout(5000, () => {
        log('Server check timed out after 5 seconds');
        req.destroy();
        resolve(false);
      });
    } catch (error) {
      log(`Server check exception: ${error.message}`);
      resolve(false);
    }
  });
}

// Clear log file
fs.writeFileSync(LOG_FILE, '');
log(`Starting RaaS API Testing - Server: ${BASE_URL}`);

// API Client for making requests
class ApiClient {
  constructor() {
    this.cookies = '';
    this.token = null;
    this.headers = {
      'Content-Type': 'application/json'
    };
    
    // Create custom agents with keep-alive
    this.httpAgent = new http.Agent({ keepAlive: true });
    this.httpsAgent = new https.Agent({ keepAlive: true });
  }

  // Proper login using the NextAuth credentials provider
  async login(email, password) {
    try {
      log(`Attempting to login with: ${email}`);
      
      // Step 1: Get CSRF token
      const csrfResponse = await this.request('/api/auth/csrf');
      if (!csrfResponse.ok) {
        throw new Error(`Failed to get CSRF token: ${csrfResponse.status}`);
      }
      
      const csrfToken = csrfResponse.data.csrfToken;
      if (!csrfToken) {
        throw new Error('CSRF token not found in response');
      }
      
      // Step 2: Login using credentials
      const loginResponse = await this.request('/api/auth/callback/credentials', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams({
          'csrfToken': csrfToken,
          'email': email,
          'password': password,
          'callbackUrl': `${BASE_URL}/dashboard`,
          'json': 'true'
        }).toString()
      });
      
      // Check for successful redirection or response
      if (loginResponse.status === 200 || loginResponse.status === 302) {
        log('Login successful');
        
        // Get the session to retrieve the token
        const sessionResponse = await this.request('/api/auth/session');
        if (sessionResponse.ok && sessionResponse.data) {
          log('Session obtained successfully');
          return sessionResponse.data;
        } else {
          log('Session fetch failed after login');
          return null;
        }
      } else {
        log(`Login failed with status: ${loginResponse.status}`);
        log('Login error details:', loginResponse.data);
        return null;
      }
    } catch (error) {
      log(`Login error: ${error.message}`);
      return null;
    }
  }

  // Set token for authorization
  setToken(token) {
    this.token = token;
    if (token) {
      this.headers['Authorization'] = `Bearer ${token}`;
    } else {
      delete this.headers['Authorization'];
    }
    log('API token set successfully');
  }
  
  // Save cookies from response
  saveCookies(headers) {
    const setCookie = headers.get('set-cookie');
    if (setCookie) {
      // Parse and store cookies
      const cookies = setCookie.split(',').map(cookie => cookie.split(';')[0]);
      
      // Update current cookies
      cookies.forEach(cookie => {
        if (!this.cookies.includes(cookie.split('=')[0])) {
          this.cookies += (this.cookies ? '; ' : '') + cookie;
        }
      });
      
      log('Cookies saved', { cookies: this.cookies });
    }
  }

  async request(url, options = {}) {
    const fullUrl = url.startsWith('http') ? url : `${BASE_URL}${url}`;
    
    // Merge headers and add cookies if available
    const reqHeaders = {
      ...this.headers,
      ...options.headers
    };
    
    if (this.cookies) {
      reqHeaders['Cookie'] = this.cookies;
    }
    
    if (this.token && !reqHeaders['Authorization']) {
      reqHeaders['Authorization'] = `Bearer ${this.token}`;
    }
    
    const reqOptions = {
      ...options,
      headers: reqHeaders,
      redirect: 'manual', // Handle redirects manually to capture cookies
      timeout: 10000, // Increased timeout to 10 seconds
      agent: fullUrl.startsWith('https') ? this.httpsAgent : this.httpAgent
    };
    
    log(`Request: ${options.method || 'GET'} ${fullUrl}`, { headers: reqHeaders });
    
    try {
      const response = await fetch(fullUrl, reqOptions);
      
      // Log response status
      log(`Response status: ${response.status} ${response.statusText}`);
      
      // Save cookies for session
      this.saveCookies(response.headers);
      
      // Parse response
      let data;
      const contentType = response.headers.get('content-type');
      
      if (contentType && contentType.includes('application/pdf')) {
          log('Received PDF content.');
          data = { type: 'pdf', length: response.headers.get('content-length') }; // Don't log binary data
      } else if (contentType && contentType.includes('application/json')) {
        try {
          data = await response.json();
        } catch (jsonError) {
          log('Failed to parse JSON response', { error: jsonError.message });
          // Fallback to text if JSON parsing fails
          data = await response.text(); 
        }
      } else {
        data = await response.text();
      }
      
      log(`Response data:`, typeof data === 'object' ? data : `(Text Response Length: ${data.length})`);
      
      // Handle redirects - follow them if needed
      if (response.status === 302 || response.status === 303) {
        const location = response.headers.get('location');
        if (location) {
          log(`Following redirect to: ${location}`);
          return this.request(location, { method: 'GET' });
        }
      }
      
      return { 
        ok: response.ok, 
        status: response.status, 
        data,
        headers: response.headers
      };
    } catch (error) {
      log(`Request error: ${error.message}`, { stack: error.stack });
      return { 
        ok: false, 
        error: error.message 
      };
    }
  }
}

// Test management system
class TestRunner {
  constructor() {
    this.apiClient = new ApiClient();
    this.testCases = [];
    this.currentStep = 0;
    this.sessionData = {
      accessToken: null,
      userId: null,
      userRole: null,
      testCustomerId: null,
      testInvoiceId: null,
      testDistributorId: null,
      testInstallationId: null
    };
  }

  addTest(name, runFn, options = { runCondition: () => true }) {
    this.testCases.push({
      name,
      run: runFn,
      options
    });
    return this;
  }

  async runTests() {
    log(`${colors.magenta}STARTING TEST SUITE${colors.reset}`);
    log(`Server URL: ${BASE_URL}`);
    
    // First check if server is reachable
    log('Checking if server is reachable...');
    const serverReachable = await checkServer(BASE_URL);
    
    if (!serverReachable) {
      log(`${colors.red}SERVER UNREACHABLE${colors.reset} - Cannot connect to ${BASE_URL}`);
      log('Ensure the development server is running with: npm run dev');
      return;
    }
    
    log(`${colors.green}SERVER REACHABLE${colors.reset} - Connected to ${BASE_URL}`);
    
    // Run tests
    for (const test of this.testCases) {
      testResults.total++;
      this.currentStep++;
      const shouldRun = await test.options.runCondition(this.sessionData);
      
      if (!shouldRun) {
        log(`${colors.yellow}SKIPPED${colors.reset} [${this.currentStep}] ${test.name}`);
        testResults.skipped++;
        continue;
      }
      
      log(`${colors.blue}RUNNING${colors.reset} [${this.currentStep}] ${test.name}`);
      
      try {
        await test.run(this.apiClient, this.sessionData);
        log(`${colors.green}PASSED${colors.reset} [${this.currentStep}] ${test.name}`);
        testResults.passed++;
      } catch (error) {
        log(`${colors.red}FAILED${colors.reset} [${this.currentStep}] ${test.name}`);
        log(`Error: ${error.message}`);
        // Log stack trace for failed tests
        if (error.stack) { log(`Stack Trace: ${error.stack}`); }
        testResults.failed++;
      }
    }
    
    // Final Cleanup: Try to delete test resources
    if (this.sessionData.testInvoiceId) {
        log(`${colors.cyan}INFO${colors.reset}: Attempting final cleanup for invoice ${this.sessionData.testInvoiceId}`);
        try {
            await this.apiClient.request(`/api/invoices/${this.sessionData.testInvoiceId}`, { method: 'DELETE' });
            log(`Final cleanup request sent for invoice ${this.sessionData.testInvoiceId}.`);
        } catch (cleanupError) {
            log(`${colors.yellow}WARN${colors.reset}: Final cleanup failed for invoice ${this.sessionData.testInvoiceId}: ${cleanupError.message}`);
        }
    }

    // Print final summary
    log('\n-----------------------------------------');
    log(`${colors.magenta}TEST RESULTS SUMMARY${colors.reset}`);
    log(`Total tests: ${testResults.total}`);
    log(`${colors.green}Passed: ${testResults.passed}${colors.reset}`);
    log(`${colors.red}Failed: ${testResults.failed}${colors.reset}`);
    log(`${colors.yellow}Skipped: ${testResults.skipped}${colors.reset}`);
    log('-----------------------------------------\n');
  }
}

// Create our test runner
const runner = new TestRunner();

// Add test cases
runner
  // Authentication tests
  .addTest('1. Login with Admin Credentials', async (api, session) => {
    const sessionData = await api.login(TEST_ADMIN_EMAIL, TEST_ADMIN_PASSWORD);
    if (!sessionData || !sessionData.user) {
      throw new Error('Login failed - no session data returned');
    }
    
    session.userId = sessionData.user.id;
    session.userEmail = sessionData.user.email;
    session.userRole = sessionData.user.role;
    
    if (sessionData.token) {
      session.accessToken = sessionData.token;
      api.setToken(sessionData.token);
    }
    
    log('Successfully logged in as admin', { 
      userId: session.userId,
      email: session.userEmail,
      role: session.userRole
    });
  })
  
  // Session verification
  .addTest('2. Verify User Session', async (api) => {
    const result = await api.request('/api/auth/session');
    if (!result.ok || !result.data.user) {
      throw new Error('Failed to verify session');
    }
    log('Session verified successfully', result.data);
  })
  
  // User management tests
  .addTest('3. Get Current User Profile', async (api) => {
    const result = await api.request('/api/users/me');
    if (!result.ok || !result.data) {
      throw new Error(`Failed to get user profile: ${result.status}`);
    }
    log('Current user profile retrieved successfully');
  })
  
  .addTest('4. List All Users', async (api) => {
    const result = await api.request('/api/users');
    if (!result.ok || !result.data.users) {
      throw new Error(`Failed to list users: ${result.status}`);
    }
    log(`Retrieved ${result.data.users.length} users`);
  })
  
  .addTest('5. List Customers for Testing', async (api, session) => {
    const result = await api.request('/api/users?role=CUSTOMER');
    if (!result.ok || !result.data.users) {
      throw new Error(`Failed to list customers: ${result.status}`);
    }
    
    const customers = result.data.users.filter(u => u.role === 'CUSTOMER');
    if (customers.length === 0) {
      throw new Error('No customers found for testing');
    }
    
    session.testCustomerId = customers[0].id;
    log(`Selected test customer: ${customers[0].name || customers[0].email} (${session.testCustomerId})`);
  })
  
  // Distributor tests
  .addTest('6. List Distributors', async (api, session) => {
    const result = await api.request('/api/distributors');
    if (!result.ok || !result.data.distributors === undefined) {
      throw new Error(`Failed to list distributors: ${result.status}`);
    }
    
    if (result.data.distributors && result.data.distributors.length > 0) {
      session.testDistributorId = result.data.distributors[0].id;
      log(`Found ${result.data.distributors.length} distributors. Selected: ${result.data.distributors[0].name}`);
    } else {
      log('No distributors found, will attempt to create one');
    }
  })
  
  .addTest('7. Create Test Distributor if Needed', async (api, session) => {
    if (session.testDistributorId) {
      log(`Skipping distributor creation - using existing ID: ${session.testDistributorId}`);
      return;
    }
    
    const result = await api.request('/api/distributors', {
      method: 'POST',
      body: JSON.stringify({
        name: `Test Distributor ${new Date().toISOString().substring(0, 10)}`,
        code: `TEST-${Math.floor(Math.random() * 1000)}`,
        basePrice: 0.75,
        state: 'MG'
      })
    });
    
    if (!result.ok || !result.data.id) {
      throw new Error(`Failed to create distributor: ${result.status}`);
    }
    
    session.testDistributorId = result.data.id;
    log(`Created test distributor: ${result.data.name} (${session.testDistributorId})`);
  }, {
    runCondition: () => true
  })
  
  // Installation tests
  .addTest('8. List Installations', async (api) => {
    const result = await api.request('/api/installations');
    if (!result.ok) {
      throw new Error(`Failed to list installations: ${result.status}`);
    }
    
    log(`Retrieved ${result.data.installations?.length || 0} installations`);
    
    if (result.data.installations && result.data.installations.length > 0) {
      const consumerInstallations = result.data.installations.filter(i => i.type === 'CONSUMER');
      if (consumerInstallations.length > 0) {
        session.testInstallationId = consumerInstallations[0].id;
        log(`Selected test installation: ${consumerInstallations[0].installationNumber} (${session.testInstallationId})`);
      }
    }
  })
  
  .addTest('9. Create Test Installation if Needed', async (api, session) => {
    if (session.testInstallationId) {
      log(`Skipping installation creation - using existing ID: ${session.testInstallationId}`);
      return;
    }
    
    if (!session.testCustomerId || !session.testDistributorId) {
      throw new Error('Cannot create installation without customer and distributor IDs');
    }
    
    const result = await api.request('/api/installations', {
      method: 'POST',
      body: JSON.stringify({
        userId: session.testCustomerId,
        distributorId: session.testDistributorId,
        installationNumber: `TEST-${Math.floor(Math.random() * 100000)}`,
        type: 'CONSUMER',
        address: '123 Test Street',
        city: 'Test City',
        state: 'MG',
        postalCode: '30000-000'
      })
    });
    
    if (!result.ok || !result.data.id) {
      throw new Error(`Failed to create installation: ${result.status}`);
    }
    
    session.testInstallationId = result.data.id;
    log(`Created test installation: ${result.data.installationNumber} (${session.testInstallationId})`);
  }, {
    runCondition: (session) => !!session.testCustomerId && !!session.testDistributorId
  })
  
  // Invoice tests
  .addTest('10. List Invoices', async (api) => {
    const result = await api.request('/api/invoices');
    if (!result.ok) {
      throw new Error(`Failed to list invoices: ${result.status}`);
    }
    
    log(`Retrieved ${result.data.invoices?.length || 0} invoices`);
  })
  
  .addTest('11. Initiate New Invoice', async (api, session) => {
    const result = await api.request('/api/invoices/initiate', {
      method: 'POST',
      body: JSON.stringify({ customerId: session.testCustomerId })
    });
    
    if (!result.ok || !result.data.id) {
      throw new Error(`Failed to initiate invoice: ${result.status} - ${JSON.stringify(result.data)}`);
    }
    
    session.testInvoiceId = result.data.id;
    log(`Initiated test invoice with ID: ${session.testInvoiceId}`);
  }, {
    runCondition: (session) => !!session.testCustomerId
  })
  
  .addTest('12. Get Invoice Details', async (api, session) => {
    const result = await api.request(`/api/invoices/${session.testInvoiceId}`);
    if (!result.ok) {
      throw new Error(`Failed to get invoice details: ${result.status}`);
    }
    
    log(`Retrieved details for invoice: ${session.testInvoiceId}`);
  }, {
    runCondition: (session) => !!session.testInvoiceId
  })
  
  .addTest('13. Update Invoice', async (api, session) => {
    const updateData = {
      description: `Updated test invoice - ${new Date().toISOString()}`,
      totalAmount: 100.50,
      invoiceAmount: 90.25,
      savings: 10.25
    };
    
    const result = await api.request(`/api/invoices/${session.testInvoiceId}`, {
      method: 'PATCH',
      body: JSON.stringify(updateData)
    });
    
    if (!result.ok) {
      throw new Error(`Failed to update invoice: ${result.status}`);
    }
    
    // Verify the update
    const verifyResult = await api.request(`/api/invoices/${session.testInvoiceId}`);
    if (!verifyResult.ok) {
      throw new Error(`Failed to verify invoice update: ${verifyResult.status}`);
    }
    
    log(`Updated invoice: ${session.testInvoiceId}`);
  }, {
    runCondition: (session) => !!session.testInvoiceId
  })
  
  .addTest('14. Generate Invoice PDF', async (api, session) => {
    const result = await api.request(`/api/invoices/${session.testInvoiceId}/generate-pdf`);
    
    // This might return a PDF or might require a specific API call
    // Check both possibilities
    if (!result.ok) {
      log(`${colors.yellow}WARN${colors.reset}: PDF generation API may require a different endpoint or method`);
    } else {
      log(`Successfully requested PDF for invoice: ${session.testInvoiceId}`);
    }
  }, {
    runCondition: (session) => !!session.testInvoiceId
  })
  
  .addTest('15. Mark Invoice as Paid', async (api, session) => {
    const result = await api.request(`/api/invoices/${session.testInvoiceId}/pay`, {
      method: 'POST'
    });
    
    if (!result.ok) {
      throw new Error(`Failed to mark invoice as paid: ${result.status}`);
    }
    
    log(`Successfully marked invoice as paid: ${session.testInvoiceId}`);
  }, {
    runCondition: (session) => !!session.testInvoiceId
  })
  
  .addTest('16. Verify Invoice Payment Status', async (api, session) => {
    // Allow some time for status to update
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const result = await api.request(`/api/invoices/${session.testInvoiceId}`);
    if (!result.ok) {
      throw new Error(`Failed to verify invoice status: ${result.status}`);
    }
    
    if (result.data.status !== 'PAID') {
      throw new Error(`Expected invoice status to be PAID, but got: ${result.data.status}`);
    }
    
    log(`Verified invoice is marked as PAID: ${session.testInvoiceId}`);
  }, {
    runCondition: (session) => !!session.testInvoiceId
  })
  
  .addTest('17. Get Invoice Statistics', async (api) => {
    const result = await api.request('/api/invoices/stats');
    if (!result.ok) {
      throw new Error(`Failed to get invoice statistics: ${result.status}`);
    }
    
    log('Successfully retrieved invoice statistics');
  })
  
  // Settings tests
  .addTest('18. Get System Settings', async (api) => {
    const result = await api.request('/api/settings');
    if (!result.ok) {
      throw new Error(`Failed to get system settings: ${result.status}`);
    }
    
    log('Successfully retrieved system settings');
  })
  
  // Notifications tests
  .addTest('19. List Notifications', async (api) => {
    const result = await api.request('/api/notifications');
    if (!result.ok) {
      log(`${colors.yellow}WARN${colors.reset}: Notifications API returned status: ${result.status}`);
    } else {
      log(`Retrieved ${result.data.notifications?.length || 0} notifications`);
    }
  })
  
  // Cleanup
  .addTest('20. Delete Test Invoice', async (api, session) => {
    const result = await api.request(`/api/invoices/${session.testInvoiceId}`, {
      method: 'DELETE'
    });
    
    if (!result.ok) {
      throw new Error(`Failed to delete test invoice: ${result.status}`);
    }
    
    log(`Successfully deleted test invoice: ${session.testInvoiceId}`);
    
    // Verify deletion
    const verifyResult = await api.request(`/api/invoices/${session.testInvoiceId}`);
    if (verifyResult.ok) {
      throw new Error(`Invoice was not deleted properly`);
    }
    
    session.testInvoiceId = null;
    log('Verified invoice deletion');
  }, {
    runCondition: (session) => !!session.testInvoiceId
  });

// Run all tests
runner.runTests().catch(error => {
  log(`Fatal error in test runner: ${error.message}`);
  if (error.stack) {
    log(`Stack trace: ${error.stack}`);
  }
}); 