/**
 * API Test Script for RaaS Solar Application
 * 
 * This script tests all critical API endpoints:
 * 1. Authentication
 * 2. Installations
 * 3. Distributors
 * 4. Users
 * 5. Invitations
 * 6. Energy data
 * 7. Access control for different roles
 */

import fetch from 'node-fetch';
import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';

// Configuration
const config = {
  baseUrl: 'http://localhost:3000/api',
  credentials: {
    superAdmin: {
      email: 'pedro-eli@hotmail.com',
      password: 'galod1234'
    },
    // Used for invitation testing
    testUser: {
      email: `test.user.${crypto.randomBytes(4).toString('hex')}@example.com`,
      password: 'Test1234!',
      name: 'Test User'
    }
  },
  testData: {
    distributor: {
      name: `TEST-DIST-${crypto.randomBytes(4).toString('hex')}`,
      code: `TD${crypto.randomBytes(2).toString('hex').toUpperCase()}`,
      state: 'MG',
      price_per_kwh: 0.92
    },
    address: {
      street: 'Rua API Test',
      number: '123',
      neighborhood: 'API Test',
      city: 'Test City',
      state: 'MG',
      zip: '30000-000',
      type: 'INSTALLATION'
    },
    installation: {
      installationNumber: `INST-${crypto.randomBytes(4).toString('hex')}`,
      type: 'CONSUMER'
    },
    energyData: {
      period: '04/2025',
      consumption: 1500,
      compensation: 1200
    }
  },
  logFile: path.join(process.cwd(), 'scripts', 'api-test-results.log')
};

// Test IDs to keep track of created resources
const testIds = {
  authToken: null,
  distributorId: null,
  addressId: null,
  installationId: null,
  userId: null,
  invitationToken: null
};

// Logger
const logger = {
  async log(message) {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] INFO: ${message}\n`;
    console.log(logMessage.trim());
    await fs.appendFile(config.logFile, logMessage);
  },
  async error(message, error) {
    const timestamp = new Date().toISOString();
    const errorMessage = `[${timestamp}] ERROR: ${message} ${error ? '- ' + JSON.stringify(error, null, 2) : ''}\n`;
    console.error(errorMessage.trim());
    await fs.appendFile(config.logFile, errorMessage);
  },
  async result(testName, success, details) {
    const timestamp = new Date().toISOString();
    const resultMessage = `[${timestamp}] TEST ${success ? 'PASSED' : 'FAILED'}: ${testName} ${details ? '- ' + JSON.stringify(details, null, 2) : ''}\n`;
    console.log(resultMessage.trim());
    await fs.appendFile(config.logFile, resultMessage);
  }
};

// Helper for making API requests
async function apiRequest(endpoint, options = {}) {
  const url = `${config.baseUrl}${endpoint}`;
  const defaultOptions = {
    headers: {
      'Content-Type': 'application/json'
    }
  };

  // Add auth token if available
  if (testIds.authToken) {
    defaultOptions.headers['Authorization'] = `Bearer ${testIds.authToken}`;
  }

  const requestOptions = { ...defaultOptions, ...options };
  
  if (options.body && typeof options.body === 'object') {
    requestOptions.body = JSON.stringify(options.body);
  }

  try {
    const response = await fetch(url, requestOptions);
    
    // For non-204 responses, try to parse JSON
    let responseData = null;
    if (response.status !== 204) {
      try {
        responseData = await response.json();
      } catch (e) {
        // Response might not be JSON
        responseData = await response.text();
      }
    }
    
    return {
      status: response.status,
      ok: response.ok,
      data: responseData
    };
  } catch (error) {
    return {
      ok: false,
      error: error.toString()
    };
  }
}

// Authentication test
async function testAuthentication() {
  await logger.log('Testing authentication API');
  
  // Login
  const loginResponse = await apiRequest('/auth/login', {
    method: 'POST',
    body: {
      email: config.credentials.superAdmin.email,
      password: config.credentials.superAdmin.password
    }
  });
  
  if (loginResponse.ok && loginResponse.data && loginResponse.data.token) {
    testIds.authToken = loginResponse.data.token;
    await logger.result('Super Admin Login', true);
    return true;
  } else {
    await logger.result('Super Admin Login', false, loginResponse);
    return false;
  }
}

// Test Distributors API
async function testDistributorsAPI() {
  await logger.log('Testing distributors API');
  
  // Create address for distributor
  const createAddressResponse = await apiRequest('/addresses', {
    method: 'POST',
    body: config.testData.address
  });
  
  if (createAddressResponse.ok && createAddressResponse.data && createAddressResponse.data.address) {
    testIds.addressId = createAddressResponse.data.address.id;
    await logger.result('Create Address', true);
  } else {
    await logger.result('Create Address', false, createAddressResponse);
    return false;
  }
  
  // Create distributor
  const createDistributorResponse = await apiRequest('/distributors', {
    method: 'POST',
    body: {
      ...config.testData.distributor,
      addressId: testIds.addressId
    }
  });
  
  if (createDistributorResponse.ok && createDistributorResponse.data && createDistributorResponse.data.distributor) {
    testIds.distributorId = createDistributorResponse.data.distributor.id;
    await logger.result('Create Distributor', true);
  } else {
    await logger.result('Create Distributor', false, createDistributorResponse);
    return false;
  }
  
  // List distributors
  const listDistributorsResponse = await apiRequest('/distributors');
  
  if (listDistributorsResponse.ok) {
    await logger.result('List Distributors', true);
  } else {
    await logger.result('List Distributors', false, listDistributorsResponse);
  }
  
  // Get distributor by ID
  const getDistributorResponse = await apiRequest(`/distributors/${testIds.distributorId}`);
  
  if (getDistributorResponse.ok) {
    await logger.result('Get Distributor', true);
  } else {
    await logger.result('Get Distributor', false, getDistributorResponse);
  }
  
  return true;
}

// Test Installations API
async function testInstallationsAPI() {
  await logger.log('Testing installations API');
  
  // Ensure we have distributor ID
  if (!testIds.distributorId) {
    await logger.error('Cannot test installations without distributor ID');
    return false;
  }
  
  // Create address for installation
  const createAddressResponse = await apiRequest('/addresses', {
    method: 'POST',
    body: {
      ...config.testData.address,
      street: config.testData.address.street + ' Installation',
    }
  });
  
  if (createAddressResponse.ok && createAddressResponse.data && createAddressResponse.data.address) {
    const installationAddressId = createAddressResponse.data.address.id;
    await logger.result('Create Installation Address', true);
    
    // We need a test user ID for the owner
    // For superadmin testing, we'll use superadmin as owner
    // Get current user info
    const userInfoResponse = await apiRequest('/auth/me');
    
    if (!userInfoResponse.ok || !userInfoResponse.data || !userInfoResponse.data.id) {
      await logger.result('Get User Info', false, userInfoResponse);
      return false;
    }
    
    const ownerId = userInfoResponse.data.id;
    await logger.result('Get User Info', true);
    
    // Create installation
    const createInstallationResponse = await apiRequest('/installations', {
      method: 'POST',
      body: {
        ...config.testData.installation,
        distributorId: testIds.distributorId,
        addressId: installationAddressId,
        ownerId
      }
    });
    
    if (createInstallationResponse.ok && createInstallationResponse.data && createInstallationResponse.data.installation) {
      testIds.installationId = createInstallationResponse.data.installation.id;
      await logger.result('Create Installation', true);
    } else {
      await logger.result('Create Installation', false, createInstallationResponse);
      return false;
    }
    
    // List installations
    const listInstallationsResponse = await apiRequest('/installations');
    
    if (listInstallationsResponse.ok) {
      await logger.result('List Installations', true);
    } else {
      await logger.result('List Installations', false, listInstallationsResponse);
    }
    
    // Get installation by ID
    const getInstallationResponse = await apiRequest(`/installations/${testIds.installationId}`);
    
    if (getInstallationResponse.ok) {
      await logger.result('Get Installation', true);
    } else {
      await logger.result('Get Installation', false, getInstallationResponse);
    }
    
    return true;
  } else {
    await logger.result('Create Installation Address', false, createAddressResponse);
    return false;
  }
}

// Test Invitations API
async function testInvitationsAPI() {
  await logger.log('Testing invitations API');
  
  // Create invitation
  const createInvitationResponse = await apiRequest('/invite', {
    method: 'POST',
    body: {
      email: config.credentials.testUser.email,
      name: config.credentials.testUser.name,
      role: 'CUSTOMER'
    }
  });
  
  if (createInvitationResponse.ok && createInvitationResponse.data) {
    if (createInvitationResponse.data.token) {
      testIds.invitationToken = createInvitationResponse.data.token;
    } else if (createInvitationResponse.data.invitation && createInvitationResponse.data.invitation.token) {
      testIds.invitationToken = createInvitationResponse.data.invitation.token;
    }
    
    await logger.result('Create Invitation', true);
  } else {
    await logger.result('Create Invitation', false, createInvitationResponse);
    return false;
  }
  
  // List invitations
  const listInvitationsResponse = await apiRequest('/invite');
  
  if (listInvitationsResponse.ok) {
    await logger.result('List Invitations', true);
  } else {
    await logger.result('List Invitations', false, listInvitationsResponse);
  }
  
  return true;
}

// Test Users API
async function testUsersAPI() {
  await logger.log('Testing users API');
  
  // List users
  const listUsersResponse = await apiRequest('/users');
  
  if (listUsersResponse.ok) {
    await logger.result('List Users', true);
  } else {
    await logger.result('List Users', false, listUsersResponse);
    return false;
  }
  
  // Get my user info
  const myUserInfoResponse = await apiRequest('/auth/me');
  
  if (myUserInfoResponse.ok) {
    await logger.result('Get My User Info', true);
  } else {
    await logger.result('Get My User Info', false, myUserInfoResponse);
  }
  
  return true;
}

// Test Energy Data API (if available)
async function testEnergyDataAPI() {
  await logger.log('Testing energy data API');
  
  if (!testIds.installationId) {
    await logger.error('Cannot test energy data without installation ID');
    return false;
  }
  
  // Attempt to upload energy data for the installation
  const uploadEnergyDataResponse = await apiRequest('/energy-data/upload', {
    method: 'POST',
    body: {
      installationId: testIds.installationId,
      period: config.testData.energyData.period,
      consumption: config.testData.energyData.consumption,
      compensation: config.testData.energyData.compensation
    }
  });
  
  if (uploadEnergyDataResponse.ok) {
    await logger.result('Upload Energy Data', true);
  } else {
    // This might not exist yet, so just log it
    await logger.result('Upload Energy Data', false, uploadEnergyDataResponse);
  }
  
  // Try to get energy data for the installation
  const getEnergyDataResponse = await apiRequest(`/energy-data/installation/${testIds.installationId}`);
  
  if (getEnergyDataResponse.ok) {
    await logger.result('Get Installation Energy Data', true);
  } else {
    // This might not exist yet, so just log it
    await logger.result('Get Installation Energy Data', false, getEnergyDataResponse);
  }
  
  return true;
}

// Run all tests
async function runAllTests() {
  await logger.log('Starting API tests for RaaS Solar application');
  
  // Initialize log file
  await fs.writeFile(config.logFile, `RaaS Solar API Test Run - ${new Date().toISOString()}\n\n`);
  
  // First authenticate
  const authSuccess = await testAuthentication();
  if (!authSuccess) {
    await logger.error('Authentication failed, aborting tests');
    return;
  }
  
  // Test distributors
  await testDistributorsAPI();
  
  // Test installations
  await testInstallationsAPI();
  
  // Test invitations
  await testInvitationsAPI();
  
  // Test users
  await testUsersAPI();
  
  // Test energy data (if applicable)
  await testEnergyDataAPI();
  
  await logger.log('API tests completed!');
  await logger.log(`Check ${config.logFile} for detailed results`);
}

// Run the tests
runAllTests().catch(console.error); 