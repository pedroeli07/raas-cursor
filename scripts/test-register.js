// Test script for register and login with invitation
import fetch from 'node-fetch';

const baseUrl = 'http://localhost:3000/api';

// Test data
const testEmail = 'customer-test-1744480333785@example.com';
const testName = 'Cliente Teste';
const testPassword = 'Teste@12345';

async function registerWithInvitedEmail() {
    console.log(`Registering user with email: ${testEmail}`);
    
    try {
        const response = await fetch(`${baseUrl}/auth/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                email: testEmail,
                name: testName,
                password: testPassword,
                passwordConfirm: testPassword
            })
        });
        
        const data = await response.json();
        
        console.log(`Registration status: ${response.status}`);
        console.log('Registration response:', data);
        
        if (response.ok && data.token) {
            console.log('Registration successful! Auth token received.');
            return data.token;
        } else {
            console.error('Registration failed:', data.message || 'Unknown error');
            return null;
        }
    } catch (error) {
        console.error('Error during registration:', error.message);
        return null;
    }
}

async function loginWithRegisteredEmail(token) {
    console.log(`\nLogging in with email: ${testEmail}`);
    
    try {
        const response = await fetch(`${baseUrl}/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                email: testEmail,
                password: testPassword
            })
        });
        
        const data = await response.json();
        
        console.log(`Login status: ${response.status}`);
        console.log('Login response:', data);
        
        if (response.ok && data.token) {
            console.log('Login successful! Auth token received.');
            return data.token;
        } else {
            console.error('Login failed:', data.message || 'Unknown error');
            return null;
        }
    } catch (error) {
        console.error('Error during login:', error.message);
        return null;
    }
}

async function getUserProfile(token) {
    console.log('\nFetching user profile');
    
    try {
        const response = await fetch(`${baseUrl}/users/profile`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        const data = await response.json();
        
        console.log(`Profile fetch status: ${response.status}`);
        console.log('Profile data:', data);
        
        if (response.ok) {
            console.log('Profile fetch successful!');
            return data;
        } else {
            console.error('Profile fetch failed:', data.message || 'Unknown error');
            return null;
        }
    } catch (error) {
        console.error('Error fetching profile:', error.message);
        return null;
    }
}

async function runTest() {
    console.log('Starting test - Register and login with invited email');
    console.log('---------------------------------------------------');
    
    // First register
    const registerToken = await registerWithInvitedEmail();
    
    if (!registerToken) {
        console.log('Skipping login test as registration failed');
        return;
    }
    
    // Then login
    const loginToken = await loginWithRegisteredEmail();
    
    if (!loginToken) {
        console.log('Skipping profile test as login failed');
        return;
    }
    
    // Fetch profile
    await getUserProfile(loginToken);
    
    console.log('\nTest completed!');
}

// Run the test
runTest().catch(error => {
    console.error('Unhandled error in test execution:', error);
}); 