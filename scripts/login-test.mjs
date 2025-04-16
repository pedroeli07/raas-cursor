import fetch from 'node-fetch';

console.log('Starting login test');

const loginData = {
    email: 'customer-test-1744480333785@example.com',
    password: 'Teste@12345'
};

fetch('http://localhost:3000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(loginData)
})
.then(res => {
    console.log('Status:', res.status);
    return res.json();
})
.then(data => {
    console.log('Login response:', data);
    
    // If login successful, try to fetch user profile
    if (data.token) {
        console.log('\nFetching user profile...');
        return fetch('http://localhost:3000/api/users/profile', {
            method: 'GET',
            headers: { 
                'Authorization': `Bearer ${data.token}`,
                'Content-Type': 'application/json'
            }
        })
        .then(res => {
            console.log('Profile Status:', res.status);
            return res.json();
        })
        .then(profileData => {
            console.log('Profile response:', profileData);
        })
        .catch(err => {
            console.error('Profile fetch error:', err);
        });
    }
})
.catch(err => {
    console.error('Login error:', err);
}); 