// Invoice API Testing Script
// Run with: node scripts/test-invoice-apis.js

import fetch from 'node-fetch';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// Get current file path in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Config
const BASE_URL = 'http://localhost:3000';
const LOG_FILE = './invoice-api-test.log';
const SUPER_ADMIN_EMAIL = 'pedro-eli@hotmail.com';
const SUPER_ADMIN_PASSWORD = '123456'; // Replace with actual password

// Helper for logging
function log(message, data = null) {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] ${message}${data ? `\nData: ${JSON.stringify(data, null, 2)}` : ''}`;
  console.log(logMessage);
  fs.appendFileSync(LOG_FILE, logMessage + '\n\n');
}

// Clear log file
fs.writeFileSync(LOG_FILE, '');
log('Starting Invoice API Test Script');

// Helper for fetch with auth
let authCookies = null;

async function fetchWithAuth(url, options = {}) {
  const fullUrl = url.startsWith('http') ? url : `${BASE_URL}${url}`;
  
  // Add auth cookies if available
  if (authCookies) {
    options.headers = {
      ...options.headers,
      Cookie: authCookies,
    };
  }
  
  // Add credentials
  options.credentials = 'include';
  
  log(`Fetching: ${fullUrl}`, { method: options.method || 'GET' });
  
  try {
    const response = await fetch(fullUrl, options);
    
    // Log response status
    log(`Response status: ${response.status} ${response.statusText}`);
    
    // Store cookies for session
    const cookies = response.headers.get('set-cookie');
    if (cookies) {
      authCookies = cookies;
      log('Cookies updated');
    }
    
    // Parse response
    let data;
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      data = await response.json();
    } else {
      data = await response.text();
    }
    
    log(`Response data:`, data);
    
    return { ok: response.ok, status: response.status, data };
  } catch (error) {
    log(`Fetch error: ${error.message}`);
    return { ok: false, error: error.message };
  }
}

// Main test function
async function runTests() {
  try {
    // Step 1: Login as super admin
    log('Step 1: Login as super admin');
    const loginResponse = await fetchWithAuth('/api/auth/callback/credentials', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: SUPER_ADMIN_EMAIL,
        password: SUPER_ADMIN_PASSWORD,
        redirect: false,
      }),
    });
    
    if (!loginResponse.ok) {
      log('Login failed. Aborting tests.');
      return;
    }
    
    log('Login successful. Proceeding with tests...');
    
    // Step 2: Get user session/profile
    log('Step 2: Get user session/profile');
    const sessionResponse = await fetchWithAuth('/api/auth/session');
    
    if (!sessionResponse.ok || !sessionResponse.data) {
      log('Failed to get session. Aborting tests.');
      return;
    }
    
    // Step 3: List all invoices
    log('Step 3: List all invoices');
    const invoicesResponse = await fetchWithAuth('/api/invoices');
    
    if (!invoicesResponse.ok) {
      log('Failed to list invoices. Check authorization.');
    } else {
      const invoices = invoicesResponse.data.invoices || [];
      log(`Found ${invoices.length} invoices`);
    }
    
    // Step 4: Get stats
    log('Step 4: Get invoice stats');
    const statsResponse = await fetchWithAuth('/api/invoices/stats');
    
    if (!statsResponse.ok) {
      log('Failed to get invoice stats. Check authorization.');
    }
    
    // Step 5: Get list of customers to use for testing
    log('Step 5: Get list of customers');
    const usersResponse = await fetchWithAuth('/api/users?role=CUSTOMER');
    
    if (!usersResponse.ok || !usersResponse.data) {
      log('Failed to get users. Skipping invoice creation test.');
      return;
    }
    
    const customers = Array.isArray(usersResponse.data.users) 
      ? usersResponse.data.users.filter(user => user.role === 'CUSTOMER') 
      : [];
    
    if (customers.length === 0) {
      log('No customers found. Skipping invoice creation test.');
      return;
    }
    
    const testCustomerId = customers[0].id;
    log(`Selected test customer ID: ${testCustomerId}`);
    
    // Step 6: Create a new invoice (initiate)
    log('Step 6: Initiate a new invoice');
    const initiateResponse = await fetchWithAuth('/api/invoices/initiate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ customerId: testCustomerId }),
    });
    
    if (!initiateResponse.ok || !initiateResponse.data) {
      log('Failed to initiate invoice. Check request format and authorization.');
    } else {
      const newInvoiceId = initiateResponse.data.id;
      log(`Successfully created invoice with ID: ${newInvoiceId}`);
      
      if (newInvoiceId) {
        // Step 7: Get the new invoice details
        log(`Step 7: Get details for invoice ${newInvoiceId}`);
        const invoiceDetailResponse = await fetchWithAuth(`/api/invoices/${newInvoiceId}`);
        
        if (!invoiceDetailResponse.ok) {
          log('Failed to get invoice details. Check authorization.');
        }
        
        // Step 8: Update the invoice
        log(`Step 8: Update invoice ${newInvoiceId}`);
        const updateResponse = await fetchWithAuth(`/api/invoices/${newInvoiceId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            status: 'PENDING',
            dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days from now
            description: 'Updated via test script',
          }),
        });
        
        if (!updateResponse.ok) {
          log('Failed to update invoice. Check authorization and request format.');
        }
        
        // Step 9: Verify update by getting details again
        log(`Step 9: Verify update for invoice ${newInvoiceId}`);
        const verifyUpdateResponse = await fetchWithAuth(`/api/invoices/${newInvoiceId}`);
        
        if (!verifyUpdateResponse.ok) {
          log('Failed to verify invoice update.');
        }
        
        // Step 10: List all invoices again to see if our new one appears
        log('Step 10: List all invoices again to check for new invoice');
        const invoicesAfterResponse = await fetchWithAuth('/api/invoices');
        
        if (!invoicesAfterResponse.ok) {
          log('Failed to list invoices after creation.');
        } else {
          const invoicesAfter = invoicesAfterResponse.data.invoices || [];
          log(`Found ${invoicesAfter.length} invoices after creation`);
          
          // Check if our new invoice is in the list
          const foundNew = invoicesAfter.some(inv => inv.id === newInvoiceId);
          log(`New invoice found in list: ${foundNew}`);
          
          if (!foundNew) {
            log('WARNING: The newly created invoice is not appearing in the list', {
              newInvoiceId,
              firstFewIds: invoicesAfter.slice(0, 5).map(inv => inv.id)
            });
          }
        }
      }
    }
    
    log('All tests completed.');
  } catch (error) {
    log(`Test error: ${error.message}`);
  }
}

// Run the tests
runTests().catch(error => {
  log(`Fatal error: ${error.message}`);
}); 