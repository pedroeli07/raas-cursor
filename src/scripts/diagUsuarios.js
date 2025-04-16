// Script de diagnóstico para a página de usuários
// Execute com: node src/scripts/diagUsuarios.js

const fetch = require('node-fetch');
const cookieParser = require('cookie');

// Configurações
const BASE_URL = 'http://localhost:3000'; // Ajuste para a URL correta do seu ambiente
const API_ROUTES = {
  login: '/api/auth/login',
  users: '/api/users',
  me: '/api/users/me',
  invitations: '/api/invite'
};

// Credenciais de login
const LOGIN_CREDENTIALS = {
  email: 'pedro-eli@hotmail.com',
  password: 'galod1234'
};

// Armazenar cookies entre requisições
let cookies = '';

// Função para fazer requisições HTTP
async function makeRequest(url, method = 'GET', body = null, includeAuth = true) {
  console.log(`\n[${method}] Fazendo requisição para: ${url}`);
  
  const headers = {
    'Content-Type': 'application/json',
  };
  
  if (includeAuth && cookies) {
    headers['Cookie'] = cookies;
  }
  
  const options = {
    method,
    headers,
  };
  
  if (body) {
    options.body = JSON.stringify(body);
  }
  
  try {
    const response = await fetch(BASE_URL + url, options);
    
    // Captura cookies das respostas
    const setCookieHeader = response.headers.get('set-cookie');
    if (setCookieHeader) {
      cookies = setCookieHeader;
      console.log('Cookies recebidos e armazenados');
    }
    
    console.log(`Status: ${response.status} ${response.statusText}`);
    
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      const data = await response.json();
      console.log('Resposta:', JSON.stringify(data, null, 2));
      return { success: response.ok, data, status: response.status };
    } else {
      const text = await response.text();
      console.log('Resposta (texto):', text.substring(0, 500) + (text.length > 500 ? '...' : ''));
      return { success: response.ok, text, status: response.status };
    }
  } catch (error) {
    console.error('Erro na requisição:', error);
    return { success: false, error: error.message };
  }
}

// Função para fazer login
async function login() {
  console.log('\n=== REALIZANDO LOGIN ===');
  const result = await makeRequest(
    API_ROUTES.login, 
    'POST', 
    LOGIN_CREDENTIALS,
    false
  );
  
  return result.success;
}

// Função para buscar informações do usuário atual
async function getCurrentUser() {
  console.log('\n=== BUSCANDO USUÁRIO ATUAL ===');
  return await makeRequest(API_ROUTES.me);
}

// Função para buscar todos os usuários
async function getAllUsers() {
  console.log('\n=== BUSCANDO TODOS OS USUÁRIOS ===');
  return await makeRequest(API_ROUTES.users);
}

// Função para buscar todos os convites
async function getAllInvitations() {
  console.log('\n=== BUSCANDO TODOS OS CONVITES ===');
  return await makeRequest(API_ROUTES.invitations);
}

// Executor principal
async function main() {
  console.log('Iniciando diagnóstico da API de usuários...');
  console.log('Data/Hora:', new Date().toISOString());
  
  // 1. Login
  const loggedIn = await login();
  if (!loggedIn) {
    console.log('❌ Falha no login. Abortando testes.');
    return;
  }
  console.log('✅ Login realizado com sucesso.');
  
  // 2. Buscar informações do usuário atual
  const currentUser = await getCurrentUser();
  if (!currentUser.success) {
    console.log('❌ Falha ao buscar usuário atual.');
  } else {
    console.log('✅ Usuário atual carregado com sucesso.');
  }
  
  // 3. Buscar todos os usuários
  const allUsers = await getAllUsers();
  if (!allUsers.success) {
    console.log('❌ Falha ao buscar todos os usuários.');
  } else {
    console.log('✅ Lista de usuários carregada com sucesso.');
    if (allUsers.data && Array.isArray(allUsers.data)) {
      console.log(`Total de usuários: ${allUsers.data.length}`);
    }
  }
  
  // 4. Buscar todos os convites
  const allInvitations = await getAllInvitations();
  if (!allInvitations.success) {
    console.log('❌ Falha ao buscar todos os convites.');
  } else {
    console.log('✅ Lista de convites carregada com sucesso.');
    if (allInvitations.data && allInvitations.data.invitations && Array.isArray(allInvitations.data.invitations)) {
      console.log(`Total de convites: ${allInvitations.data.invitations.length}`);
    }
  }
  
  console.log('\n=== DIAGNÓSTICO CONCLUÍDO ===');
}

// Executa o script
main().catch(error => {
  console.error('Erro no script:', error);
}); 