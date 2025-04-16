#!/usr/bin/env node
/**
 * RaaS Solar - Comprehensive Testing Script
 * Tests multiple user flows, distributor creation, installation management and page rendering
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
const BASE_URL = 'http://localhost:3000/api';
const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
const LOG_FILE = path.join(__dirname, `comprehensive-test-${timestamp}.log`);

// Global state
let authToken = null;
let currentUser = null;
const testData = {
  invitations: [],
  users: {},
  distributors: [],
  installations: []
};

// User credentials
const SUPER_ADMIN_CREDENTIALS = {
  email: 'pedro-eli@hotmail.com',
  password: 'galod1234', // Alternative: 'Test@123456'
  role: 'SUPER_ADMIN'
};

// Test users to create
const TEST_USERS = {
  ADMIN: {
    email: `admin-${Date.now()}@example.com`,
    name: 'Test Admin',
    role: 'ADMIN',
    password: 'Test@123456',
    message: 'Test invitation for admin'
  },
  ADMIN_STAFF: {
    email: `admin-staff-${Date.now()}@example.com`,
    name: 'Test Admin Staff',
    role: 'ADMIN_STAFF',
    password: 'Test@123456',
    message: 'Test invitation for admin staff'
  },
  CUSTOMER: {
    email: `customer-${Date.now()}@example.com`,
    name: 'Test Customer',
    role: 'CUSTOMER',
    password: 'Test@123456',
    message: 'Test invitation for customer'
  },
  ENERGY_RENTER: {
    email: `energy-renter-${Date.now()}@example.com`,
    name: 'Test Energy Renter',
    role: 'ENERGY_RENTER',
    password: 'Test@123456',
    message: 'Test invitation for energy renter'
  }
};

// Test distributor data
const TEST_DISTRIBUTOR = {
  name: `Test Distributor ${Date.now()}`,
  code: `DIST-${Date.now()}`.substring(0, 10),
  description: 'This is a test distributor created via API testing'
};

// Test installation data
const TEST_INSTALLATION = {
  name: `Test Installation ${Date.now()}`,
  installationNumber: `INST-${Date.now()}`.substring(0, 10),
  type: 'GENERATOR', // or CONSUMER
  address: {
    street: 'Rua de Teste',
    number: '123',
    complement: 'Apto 456',
    neighborhood: 'Bairro Teste',
    city: 'Cidade Teste',
    state: 'MG',
    zipCode: '31000000',
    country: 'Brasil'
  }
};

// Test KWH price data
const TEST_KWH_PRICE = {
  price: 0.85,
  startDate: new Date().toISOString(),
  endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString() // 1 year from now
};

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
fs.writeFileSync(LOG_FILE, `Comprehensive Test Log - ${new Date().toISOString()}\n\n`);

// --------------------------
// API HELPER FUNCTIONS
// --------------------------

async function checkServerHealth() {
  logger.log('Testing server health...');
  
  try {
    const response = await fetch(`${BASE_URL}/health`);
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
    const response = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: credentials.email,
        password: credentials.password
      })
    });
    
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
    logger.log(`User info: ${JSON.stringify(data.user)}`, 'INFO');
    
    testData.users[credentials.role] = {
      ...credentials,
      ...data.user,
      token: authToken
    };
    
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

async function createInvitation(invitationData) {
  logger.log(`Creating invitation for ${invitationData.email} with role ${invitationData.role}...`);
  
  try {
    const response = await fetch(`${BASE_URL}/invite`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(invitationData)
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || `HTTP error ${response.status}`);
    }
    
    const invitation = data.invitation;
    testData.invitations.push(invitation);
    
    logger.log(`Invitation created successfully. ID: ${invitation.id}`, 'SUCCESS');
    logger.log(`Invitation details: ${JSON.stringify(invitation)}`, 'INFO');
    
    return invitation;
  } catch (error) {
    logger.log(`Failed to create invitation: ${error.message}`, 'ERROR');
    return null;
  }
}

async function getInvitations() {
  logger.log('Retrieving all invitations...');
  
  try {
    const response = await fetch(`${BASE_URL}/invite`, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${authToken}` }
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || `HTTP error ${response.status}`);
    }
    
    logger.log(`Retrieved ${data.invitations.length} invitations`, 'SUCCESS');
    logger.log(`All invitations: ${JSON.stringify(data.invitations)}`, 'INFO', true);
    
    return data.invitations;
  } catch (error) {
    logger.log(`Failed to retrieve invitations: ${error.message}`, 'ERROR');
    return null;
  }
}

async function getInvitationById(id) {
  logger.log(`Retrieving invitation with ID: ${id}...`);
  
  try {
    const response = await fetch(`${BASE_URL}/invite/${id}`, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${authToken}` }
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || `HTTP error ${response.status}`);
    }
    
    logger.log('Retrieved invitation details successfully', 'SUCCESS');
    logger.log(`Invitation details: ${JSON.stringify(data.invitation)}`, 'INFO');
    
    return data.invitation;
  } catch (error) {
    logger.log(`Failed to retrieve invitation: ${error.message}`, 'ERROR');
    return null;
  }
}

async function registerUser(invitationToken, userData) {
  logger.log(`Registering user with email ${userData.email}...`);
  
  try {
    const response = await fetch(`${BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        token: invitationToken,
        email: userData.email,
        name: userData.name,
        password: userData.password,
        passwordConfirm: userData.password
      })
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || `HTTP error ${response.status}`);
    }
    
    logger.log(`User registered successfully: ${userData.email}`, 'SUCCESS');
    logger.log(`Registration response: ${JSON.stringify(data)}`, 'INFO');
    
    return data.user;
  } catch (error) {
    logger.log(`Failed to register user: ${error.message}`, 'ERROR');
    return null;
  }
}

async function completeUserProfile(userData) {
  logger.log(`Completing profile for user ${userData.email}...`);
  
  const profileData = {
    name: userData.name,
    address: {
      street: 'Rua de Exemplo',
      number: '123',
      complement: 'Apto 456',
      neighborhood: 'Bairro Teste',
      city: 'Cidade Teste',
      state: 'MG',
      zipCode: '31000000',
      country: 'Brasil'
    },
    contact: {
      phone: '31999999999',
      mobilePhone: '31988888888'
    }
  };
  
  try {
    const response = await fetch(`${BASE_URL}/users/profile`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(profileData)
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || `HTTP error ${response.status}`);
    }
    
    logger.log(`Profile completed successfully for ${userData.email}`, 'SUCCESS');
    logger.log(`Profile data: ${JSON.stringify(data)}`, 'INFO');
    
    return data.user;
  } catch (error) {
    logger.log(`Failed to complete profile: ${error.message}`, 'ERROR');
    return null;
  }
}

async function createDistributor(distributorData) {
  logger.log(`Creating distributor: ${distributorData.name}...`);
  
  try {
    const response = await fetch(`${BASE_URL}/distributors`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(distributorData)
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || `HTTP error ${response.status}`);
    }
    
    logger.log(`Distributor created successfully: ${distributorData.name}`, 'SUCCESS');
    logger.log(`Distributor data: ${JSON.stringify(data.distributor)}`, 'INFO');
    
    testData.distributors.push(data.distributor);
    
    return data.distributor;
  } catch (error) {
    logger.log(`Failed to create distributor: ${error.message}`, 'ERROR');
    return null;
  }
}

async function setKwhPrice(distributorId, priceData) {
  logger.log(`Setting kWh price for distributor ID ${distributorId}...`);
  
  try {
    const response = await fetch(`${BASE_URL}/distributors/${distributorId}/prices`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(priceData)
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || `HTTP error ${response.status}`);
    }
    
    logger.log(`kWh price set successfully: ${priceData.price}`, 'SUCCESS');
    logger.log(`Price data: ${JSON.stringify(data.price)}`, 'INFO');
    
    return data.price;
  } catch (error) {
    logger.log(`Failed to set kWh price: ${error.message}`, 'ERROR');
    return null;
  }
}

async function createInstallation(installationData) {
  logger.log(`Creating installation: ${installationData.name}...`);
  
  try {
    const response = await fetch(`${BASE_URL}/installations`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(installationData)
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || `HTTP error ${response.status}`);
    }
    
    logger.log(`Installation created successfully: ${installationData.name}`, 'SUCCESS');
    logger.log(`Installation data: ${JSON.stringify(data.installation)}`, 'INFO');
    
    testData.installations.push(data.installation);
    
    return data.installation;
  } catch (error) {
    logger.log(`Failed to create installation: ${error.message}`, 'ERROR');
    return null;
  }
}

async function getInstallations() {
  logger.log('Retrieving all installations...');
  
  try {
    const response = await fetch(`${BASE_URL}/installations`, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${authToken}` }
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || `HTTP error ${response.status}`);
    }
    
    logger.log(`Retrieved ${data.installations.length} installations`, 'SUCCESS');
    logger.log(`Installations: ${JSON.stringify(data.installations)}`, 'INFO', true);
    
    return data.installations;
  } catch (error) {
    logger.log(`Failed to retrieve installations: ${error.message}`, 'ERROR');
    return null;
  }
}

async function testPageRendering(pageUrl, expectedStatus = 200) {
  const fullUrl = `http://localhost:3000${pageUrl}`;
  logger.log(`Testing page rendering: ${fullUrl}...`);
  
  try {
    const response = await fetch(fullUrl, {
      headers: authToken ? { 'Cookie': `auth=${authToken}` } : {}
    });
    
    if (response.status !== expectedStatus) {
      throw new Error(`Expected status ${expectedStatus}, got ${response.status}`);
    }
    
    logger.log(`Page rendered successfully with status ${response.status}`, 'SUCCESS');
    return true;
  } catch (error) {
    logger.log(`Page rendering failed: ${error.message}`, 'ERROR');
    return false;
  }
}

// --------------------------
// TEST FLOW FUNCTIONS
// --------------------------

async function testSuperAdminFlow() {
  logger.section('SUPER ADMIN FLOW');
  
  // Login as super admin
  if (!await login(SUPER_ADMIN_CREDENTIALS)) {
    logger.log('Aborting super admin flow as login failed', 'ERROR');
    return false;
  }
  
  // Get initial invitations
  const initialInvitations = await getInvitations();
  
  // Create invitations for all test users
  for (const role in TEST_USERS) {
    const userData = TEST_USERS[role];
    const invitation = await createInvitation({
      email: userData.email,
      name: userData.name,
      role: userData.role,
      message: userData.message
    });
    
    if (invitation) {
      // Store token for later registration
      TEST_USERS[role].invitationToken = invitation.token;
    } else {
      logger.log(`Failed to create invitation for ${role}, skipping user tests`, 'ERROR');
    }
    
    // Short delay between invitations
    await setTimeout(1000);
  }
  
  // Get updated invitations
  const updatedInvitations = await getInvitations();
  
  if (initialInvitations && updatedInvitations) {
    const newCount = updatedInvitations.length - initialInvitations.length;
    logger.log(`Created ${newCount} new invitations`, 'INFO');
  }
  
  // Test page rendering for super admin
  await testPageRendering('/dashboard');
  await testPageRendering('/users');
  await testPageRendering('/invitations');
  await testPageRendering('/distributors');
  await testPageRendering('/installations');
  
  // Log out super admin
  await logout();
  
  return true;
}

async function testAdminFlow() {
  logger.section('ADMIN FLOW');
  
  // Register admin user
  const adminData = TEST_USERS.ADMIN;
  if (!adminData.invitationToken) {
    logger.log('No invitation token for admin, skipping admin flow', 'ERROR');
    return false;
  }
  
  const registeredAdmin = await registerUser(adminData.invitationToken, adminData);
  if (!registeredAdmin) {
    logger.log('Admin registration failed, skipping admin flow', 'ERROR');
    return false;
  }
  
  // Login as admin
  if (!await login(adminData)) {
    logger.log('Admin login failed, skipping admin flow', 'ERROR');
    return false;
  }
  
  // Complete admin profile
  const updatedAdmin = await completeUserProfile(adminData);
  if (!updatedAdmin) {
    logger.log('Admin profile completion failed', 'ERROR');
  }
  
  // Create distributor
  const distributor = await createDistributor(TEST_DISTRIBUTOR);
  if (!distributor) {
    logger.log('Distributor creation failed', 'ERROR');
    await logout();
    return false;
  }
  
  // Set KWh price for the distributor
  const kwhPrice = await setKwhPrice(distributor.id, TEST_KWH_PRICE);
  if (!kwhPrice) {
    logger.log('Setting KWh price failed', 'ERROR');
  }
  
  // Create installation (generator)
  const installationData = {
    ...TEST_INSTALLATION,
    distributorId: distributor.id,
    type: 'GENERATOR'
  };
  
  const installation = await createInstallation(installationData);
  if (!installation) {
    logger.log('Installation creation failed', 'ERROR');
  }
  
  // Test page rendering for admin
  await testPageRendering('/dashboard');
  await testPageRendering('/users');
  await testPageRendering('/invitations');
  await testPageRendering('/distributors');
  await testPageRendering('/installations');
  
  // Log out admin
  await logout();
  
  return true;
}

async function testAdminStaffFlow() {
  logger.section('ADMIN STAFF FLOW');
  
  // Register admin staff user
  const staffData = TEST_USERS.ADMIN_STAFF;
  if (!staffData.invitationToken) {
    logger.log('No invitation token for admin staff, skipping admin staff flow', 'ERROR');
    return false;
  }
  
  const registeredStaff = await registerUser(staffData.invitationToken, staffData);
  if (!registeredStaff) {
    logger.log('Admin staff registration failed, skipping admin staff flow', 'ERROR');
    return false;
  }
  
  // Login as admin staff
  if (!await login(staffData)) {
    logger.log('Admin staff login failed, skipping admin staff flow', 'ERROR');
    return false;
  }
  
  // Complete admin staff profile
  const updatedStaff = await completeUserProfile(staffData);
  if (!updatedStaff) {
    logger.log('Admin staff profile completion failed', 'ERROR');
  }
  
  // Get installations (should have access)
  const installations = await getInstallations();
  logger.log(`Admin staff can view ${installations ? installations.length : 0} installations`, 'INFO');
  
  // Test page rendering for admin staff
  await testPageRendering('/dashboard');
  await testPageRendering('/installations');
  
  // Log out admin staff
  await logout();
  
  return true;
}

async function testCustomerFlow() {
  logger.section('CUSTOMER FLOW');
  
  // Register customer user
  const customerData = TEST_USERS.CUSTOMER;
  if (!customerData.invitationToken) {
    logger.log('No invitation token for customer, skipping customer flow', 'ERROR');
    return false;
  }
  
  const registeredCustomer = await registerUser(customerData.invitationToken, customerData);
  if (!registeredCustomer) {
    logger.log('Customer registration failed, skipping customer flow', 'ERROR');
    return false;
  }
  
  // Login as customer
  if (!await login(customerData)) {
    logger.log('Customer login failed, skipping customer flow', 'ERROR');
    return false;
  }
  
  // Complete customer profile
  const updatedCustomer = await completeUserProfile(customerData);
  if (!updatedCustomer) {
    logger.log('Customer profile completion failed', 'ERROR');
  }
  
  // Test page rendering for customer
  await testPageRendering('/dashboard');
  await testPageRendering('/consumption');
  await testPageRendering('/invoices');
  
  // Test access to admin pages (should be denied)
  await testPageRendering('/users', 403);
  await testPageRendering('/distributors', 403);
  
  // Log out customer
  await logout();
  
  return true;
}

async function testEnergyRenterFlow() {
  logger.section('ENERGY RENTER FLOW');
  
  // Register energy renter user
  const renterData = TEST_USERS.ENERGY_RENTER;
  if (!renterData.invitationToken) {
    logger.log('No invitation token for energy renter, skipping energy renter flow', 'ERROR');
    return false;
  }
  
  const registeredRenter = await registerUser(renterData.invitationToken, renterData);
  if (!registeredRenter) {
    logger.log('Energy renter registration failed, skipping energy renter flow', 'ERROR');
    return false;
  }
  
  // Login as energy renter
  if (!await login(renterData)) {
    logger.log('Energy renter login failed, skipping energy renter flow', 'ERROR');
    return false;
  }
  
  // Complete energy renter profile
  const updatedRenter = await completeUserProfile(renterData);
  if (!updatedRenter) {
    logger.log('Energy renter profile completion failed', 'ERROR');
  }
  
  // Test page rendering for energy renter
  await testPageRendering('/dashboard');
  await testPageRendering('/generation');
  await testPageRendering('/earnings');
  
  // Test access to admin pages (should be denied)
  await testPageRendering('/users', 403);
  await testPageRendering('/distributors', 403);
  
  // Log out energy renter
  await logout();
  
  return true;
}

async function runTests() {
  logger.log(`Starting comprehensive tests at ${new Date().toISOString()}`);
  
  // Test server health
  if (!await checkServerHealth()) {
    logger.log('Aborting tests as server is not healthy', 'ERROR');
    return;
  }
  
  // Run all test flows
  await testSuperAdminFlow();
  await testAdminFlow();
  await testAdminStaffFlow();
  await testCustomerFlow();
  await testEnergyRenterFlow();
  
  // Final summary
  logger.section('TEST SUMMARY');
  logger.log(`Test data summary:`, 'INFO');
  logger.log(`- Users created: ${Object.keys(testData.users).length - 1}`, 'INFO'); // -1 for SUPER_ADMIN which existed
  logger.log(`- Invitations created: ${testData.invitations.length}`, 'INFO');
  logger.log(`- Distributors created: ${testData.distributors.length}`, 'INFO');
  logger.log(`- Installations created: ${testData.installations.length}`, 'INFO');
  
  logger.log(`All tests completed at ${new Date().toISOString()}`, 'INFO');
  logger.log(`See log file for details: ${LOG_FILE}`, 'INFO');
}

// Execute tests
runTests().catch(error => {
  logger.log(`Unhandled error in test execution: ${error.message}`, 'ERROR');
  logger.log(error.stack, 'ERROR');
}); 