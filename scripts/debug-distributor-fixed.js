// Script para debugar a criação de distribuidora - Versão corrigida
// Execute com: node --experimental-modules debug-distributor-fixed.js
// Ou adicione "type": "module" ao package.json e execute: node debug-distributor-fixed.js

import fetch from 'node-fetch';

// URL base da aplicação
const BASE_URL = 'http://localhost:3000';

// Credenciais
const credentials = {
  email: 'pedro-eli@hotmail.com',
  password: 'galod1234'
};

// Dados da distribuidora com o campo CORRETO
const correctDistributorData = {
  name: 'Distribuidora Test Fix 02',
  pricePerKwh: 0.85, // Usando camelCase conforme o padrão do projeto
  code: 'AUTO',
  address: {
    street: 'Rua de Testes',
    number: '12345',
    complement: 'Apto 101',
    neighborhood: 'Centro',
    city: 'Belo Horizonte',
    state: 'MG',
    zipCode: '30000-000',
    country: 'Brasil'
  }
};

let authToken;

// Função para fazer login
async function login() {
  console.log('🔍 [DEBUG] Iniciando processo de login...');
  
  try {
    const response = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(credentials)
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      console.error('❌ [ERRO] Falha no login:', data);
      throw new Error(`Falha no login: ${data.message || 'Erro desconhecido'}`);
    }
    
    authToken = data.token;
    console.log('✅ [DEBUG] Login realizado com sucesso!');
    console.log(`🔑 [DEBUG] Token: ${authToken.substring(0, 15)}...`);
    
    return data;
  } catch (error) {
    console.error('❌ [ERRO] Exceção durante login:', error);
    throw error;
  }
}

// Função para criar distribuidora
async function createDistributor() {
  console.log('\n🔍 [DEBUG] Iniciando criação de distribuidora...');
  console.log('📦 [DEBUG] Dados enviados:', JSON.stringify(correctDistributorData, null, 2));
  
  try {
    // Verificação explícita do campo correto
    console.log(`💰 [DEBUG] pricePerKwh: ${correctDistributorData.pricePerKwh} (tipo: ${typeof correctDistributorData.pricePerKwh})`);
    
    // Garantindo que o payload tem exatamente o que queremos
    const payload = {
      name: correctDistributorData.name,
      ['price_per_kwh']: correctDistributorData.pricePerKwh, // Convertendo para snake_case para a API
      code: correctDistributorData.code,
      address: correctDistributorData.address
    };
    
    console.log('🔄 [DEBUG] Payload final:', JSON.stringify(payload, null, 2));
    
    const response = await fetch(`${BASE_URL}/api/distributors`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify(payload)
    });
    
    // Tentativa de obter o corpo da resposta mesmo se houver erro
    const responseText = await response.text();
    let responseData;
    
    try {
      responseData = JSON.parse(responseText);
    } catch (e) {
      console.log('⚠️ [DEBUG] Resposta não é JSON válido:', responseText);
      responseData = { raw: responseText };
    }
    
    console.log(`🔄 [DEBUG] Código de status: ${response.status}`);
    console.log(`🔄 [DEBUG] Headers resposta: ${JSON.stringify(Object.fromEntries(response.headers.entries()), null, 2)}`);
    
    if (!response.ok) {
      console.error('❌ [ERRO] Falha ao criar distribuidora:', responseData);
      console.error(`❌ [ERRO] Status: ${response.status}`);
      throw new Error(`Falha ao criar distribuidora: ${responseData.message || responseText || 'Erro desconhecido'}`);
    }
    
    console.log('✅ [DEBUG] Distribuidora criada com sucesso!');
    console.log('📋 [DEBUG] Resposta:', responseData);
    
    return responseData;
  } catch (error) {
    console.error('❌ [ERRO] Exceção durante criação de distribuidora:', error);
    throw error;
  }
}

// Função principal
async function main() {
  try {
    console.log('🚀 [DEBUG] Iniciando script de debug CORRIGIDO para criação de distribuidora');
    
    // Fazer login
    await login();
    
    // Criar distribuidora com dados corretos
    await createDistributor();
    
    console.log('\n✅ [DEBUG] Script finalizado com sucesso!');
  } catch (error) {
    console.error('❌ [ERRO] Falha no script:', error);
  }
}

// Executar o script
main(); 