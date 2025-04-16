import fetch from 'node-fetch';

console.log('Starting registration test');

const registerData = {
    email: 'customer-test-1744480333785@example.com',
    name: 'Cliente Teste',
    password: 'Teste@12345', 
    passwordConfirm: 'Teste@12345'
};

fetch('http://localhost:3000/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(registerData)
})
.then(res => {
    console.log('Status:', res.status);
    return res.json();
})
.then(data => {
    console.log('Registration response:', data);
})
.catch(err => {
    console.error('Error:', err);
}); 