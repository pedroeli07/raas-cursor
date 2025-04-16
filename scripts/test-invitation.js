#!/usr/bin/env node
/**
 * RaaS Solar - Invitation Testing Script
 * Node.js alternative to test the invitation functionality
 */

import fetch from 'node-fetch';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get the directory name correctly in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const BASE_URL = 'http://localhost:3000/api';
const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
const LOG_FILE = path.join(__dirname, `invitation-test-${timestamp}.log`);

// Test data
const SUPER_ADMIN_CREDENTIALS = {
  email: 'pedro-eli@hotmail.com',
  password: 'Test@123456'
};

const TEST_INVITATIONS = [
  {
    email: `customer-test-${Date.now()}@example.com`,
    name: 'Test Customer',
    role: 'CUSTOMER',
    message: 'Test invitation for customer'
  },
  {
    email: `admin-test-${Date.now()}@example.com`,
    name: 'Test Admin',
    role: 'ADMIN',
    message: 'Test invitation for admin'
  },
  {
    email: `energy-renter-test-${Date.now()}@example.com`,
    name: 'Test Energy Renter',
    role: 'ENERGY_RENTER',
    message: 'Test invitation for energy renter'
  }
];

// Global state
let authToken = null;
const invitationIds = [];

// Logging utility
const logger = {
  INFO: '\x1b[36m%s\x1b[0m',    // Cyan
  SUCCESS: '\x1b[32m%s\x1b[0m',  // Green
  ERROR: '\x1b[31m%s\x1b[0m',    // Red
  WARNING: '\x1b[33m%s\x1b[0m',  // Yellow

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
  }
};

// Initialize log file
fs.writeFileSync(LOG_FILE, `Invitation Test Log - ${new Date().toISOString()}\n\n`);

// API helper functions
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

async function login() {
  logger.log('Testing login with super admin credentials...');
  
  try {
    const response = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(SUPER_ADMIN_CREDENTIALS)
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || `HTTP error ${response.status}`);
    }
    
    authToken = data.token;
    logger.log('Login successful. Token received.', 'SUCCESS');
    logger.log(`User info: ${JSON.stringify(data.user)}`, 'INFO');
    return true;
  } catch (error) {
    logger.log(`Login failed: ${error.message}`, 'ERROR');
    return false;
  }
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
    
    const invitationId = data.invitation.id;
    invitationIds.push(invitationId);
    
    logger.log(`Invitation created successfully. ID: ${invitationId}`, 'SUCCESS');
    logger.log(`Invitation details: ${JSON.stringify(data.invitation)}`, 'INFO');
    
    return invitationId;
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
    
    return data;
  } catch (error) {
    logger.log(`Failed to retrieve invitation: ${error.message}`, 'ERROR');
    return null;
  }
}

async function revokeInvitation(id) {
  logger.log(`Revoking invitation with ID: ${id}...`);
  
  try {
    const response = await fetch(`${BASE_URL}/invite/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${authToken}` }
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || `HTTP error ${response.status}`);
    }
    
    logger.log('Invitation revoked successfully', 'SUCCESS');
    logger.log(`Response: ${JSON.stringify(data)}`, 'INFO');
    
    return true;
  } catch (error) {
    logger.log(`Failed to revoke invitation: ${error.message}`, 'ERROR');
    return false;
  }
}

async function testInvalidInvitations() {
  logger.log('Testing invalid invitation scenarios...', 'INFO');
  
  // Test duplicate email
  try {
    const duplicateInvitation = { ...TEST_INVITATIONS[0] };
    logger.log('Testing duplicate email invitation...', 'INFO');
    
    const response = await fetch(`${BASE_URL}/invite`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(duplicateInvitation)
    });
    
    const data = await response.json();
    
    if (response.ok) {
      logger.log('Expected duplicate email to fail, but it succeeded', 'WARNING');
    } else {
      logger.log(`Duplicate email correctly rejected: ${data.message}`, 'SUCCESS');
    }
  } catch (error) {
    logger.log(`Duplicate email correctly rejected: ${error.message}`, 'SUCCESS');
  }
  
  // Test invalid role
  try {
    const invalidRoleInvitation = {
      email: `invalid-role-${Date.now()}@example.com`,
      name: 'Invalid Role User',
      role: 'INVALID_ROLE',
      message: 'Test with invalid role'
    };
    
    logger.log('Testing invalid role invitation...', 'INFO');
    
    const response = await fetch(`${BASE_URL}/invite`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(invalidRoleInvitation)
    });
    
    const data = await response.json();
    
    if (response.ok) {
      logger.log('Expected invalid role to fail, but it succeeded', 'WARNING');
    } else {
      logger.log(`Invalid role correctly rejected: ${data.message}`, 'SUCCESS');
    }
  } catch (error) {
    logger.log(`Invalid role correctly rejected: ${error.message}`, 'SUCCESS');
  }
  
  // Test missing required fields
  try {
    const missingFieldsInvitation = {
      name: 'Missing Email User',
      role: 'CUSTOMER'
    };
    
    logger.log('Testing invitation with missing required fields...', 'INFO');
    
    const response = await fetch(`${BASE_URL}/invite`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(missingFieldsInvitation)
    });
    
    const data = await response.json();
    
    if (response.ok) {
      logger.log('Expected missing fields to fail, but it succeeded', 'WARNING');
    } else {
      logger.log(`Missing fields correctly rejected: ${data.message}`, 'SUCCESS');
    }
  } catch (error) {
    logger.log(`Missing fields correctly rejected: ${error.message}`, 'SUCCESS');
  }
}

async function testInvitationFlow(invitation) {
  // Create invitation
  const invitationId = await createInvitation(invitation);
  if (!invitationId) {
    logger.log('Skipping further tests for this invitation as creation failed', 'WARNING');
    return false;
  }
  
  // Get invitation details
  const invitationDetails = await getInvitationById(invitationId);
  if (!invitationDetails) {
    logger.log('Could not retrieve invitation details', 'ERROR');
    return false;
  }
  
  // Verify invitation details match what we sent
  const matchesEmail = invitationDetails.invitation.email === invitation.email;
  const matchesRole = invitationDetails.invitation.role === invitation.role;
  const matchesName = invitationDetails.invitation.name === invitation.name;
  
  if (matchesEmail && matchesRole && matchesName) {
    logger.log('Invitation details match the submitted data', 'SUCCESS');
  } else {
    logger.log('Invitation details do not match the submitted data', 'ERROR');
    logger.log(`Expected: ${JSON.stringify(invitation)}`, 'ERROR');
    logger.log(`Actual: ${JSON.stringify(invitationDetails.invitation)}`, 'ERROR');
    return false;
  }
  
  // Verify token and expiration date are set
  if (invitationDetails.invitation.token && invitationDetails.invitation.expiresAt) {
    logger.log('Invitation has a token and expiration date', 'SUCCESS');
  } else {
    logger.log('Invitation is missing token or expiration date', 'ERROR');
    return false;
  }
  
  // For one test, try to revoke the invitation
  if (invitation.role === 'CUSTOMER') {
    const revokeResult = await revokeInvitation(invitationId);
    if (revokeResult) {
      logger.log('Successfully revoked invitation', 'SUCCESS');
      
      // Verify invitation is revoked
      const invitationAfterRevoke = await getInvitationById(invitationId);
      if (invitationAfterRevoke && invitationAfterRevoke.invitation.status === 'REVOKED') {
        logger.log('Invitation status correctly updated to REVOKED', 'SUCCESS');
      } else {
        logger.log('Invitation status not updated after revocation', 'ERROR');
        return false;
      }
    } else {
      logger.log('Failed to revoke invitation', 'ERROR');
      return false;
    }
  }
  
  return true;
}

async function runTests() {
  logger.log(`Starting invitation tests at ${new Date().toISOString()}`);
  
  // Test server health
  if (!await checkServerHealth()) {
    logger.log('Aborting tests as server is not healthy', 'ERROR');
    return;
  }
  
  // Login to get auth token
  if (!await login()) {
    logger.log('Aborting tests as login failed', 'ERROR');
    return;
  }
  
  // Get current invitations (before test)
  const initialInvitations = await getInvitations();
  
  // Run tests for each test invitation
  for (const invitation of TEST_INVITATIONS) {
    const result = await testInvitationFlow(invitation);
    if (result) {
      logger.log(`Invitation flow test PASSED for ${invitation.email}`, 'SUCCESS');
    } else {
      logger.log(`Invitation flow test FAILED for ${invitation.email}`, 'ERROR');
    }
  }
  
  // Test invalid invitation scenarios
  await testInvalidInvitations();
  
  // Get final invitations (after tests)
  const finalInvitations = await getInvitations();
  
  // Calculate difference
  if (initialInvitations && finalInvitations) {
    const newCount = finalInvitations.length - initialInvitations.length;
    logger.log(`Created ${newCount} new invitations during testing`, 'INFO');
  }
  
  logger.log(`All invitation tests completed at ${new Date().toISOString()}`, 'INFO');
  logger.log(`See log file for details: ${LOG_FILE}`, 'INFO');
}

// Execute tests
runTests().catch(error => {
  logger.log(`Unhandled error in test execution: ${error.message}`, 'ERROR');
  logger.log(error.stack, 'ERROR');
}); 