// Script para debugar a criação de distribuidora
// Execute com: node debug-distributor-creation.js

import fetch from 'node-fetch';

// URL base da aplicação
const BASE_URL = 'http://localhost:3000';

// Credenciais
const credentials = {
  email: 'pedro-eli@hotmail.com',
  password: 'galod1234'
};

// Dados da distribuidora para criar
const distributorData = {
  name: 'Distribuidora Teste Debug',
  pricePerKwh: 0.976, // Campo correto para backend
  // pricePerKwh: 0.85, // Este nome de campo está incorreto, o backend usa price_per_kwh
  code: 'CEMIG-MD',
  address: {
    street: 'Rua de Testeee',
    number: '1232',
    complement: 'Apto 101',
    neighborhood: 'Centro',
    city: 'Belo Horizontee',
    state: 'MG',
    zipCode: '30000-100',
    country: 'Brasil'
  }
};

// Versão incorreta dos dados (como está acontecendo no frontend)
const incorrectDistributorData = {
  name: 'Distribuidora Teste Incorreta',
  pricePerKwh: 0.85, // Campo incorreto (frontend usa camelCase)
  // price_per_kwh: undefined - não existe aqui, por isso falha na validação
  code: 'AUTO',
  address: {
    street: 'Rua de Teste',
    number: '123',
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
async function createDistributor(useCorrectData = true) {
  const data = useCorrectData ? distributorData : incorrectDistributorData;
  console.log('\n🔍 [DEBUG] Iniciando criação de distribuidora...');
  console.log(`📦 [DEBUG] Usando dados ${useCorrectData ? 'CORRETOS' : 'INCORRETOS'}`);
  console.log('📦 [DEBUG] Dados enviados:', JSON.stringify(data, null, 2));
  
  try {
    // Verifique especificamente os campos relevantes
    if (useCorrectData) {
      console.log(`💰 [DEBUG] price_per_kwh: ${data.price_per_kwh} (tipo: ${typeof data.price_per_kwh})`);
    } else {
      console.log(`💰 [DEBUG] pricePerKwh: ${data.pricePerKwh} (tipo: ${typeof data.pricePerKwh})`);
      console.log(`💰 [DEBUG] price_per_kwh: ${data.price_per_kwh} (esperado undefined)`);
    }
    
    const response = await fetch(`${BASE_URL}/api/distributors`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify(data)
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
    console.log('🚀 [DEBUG] Iniciando script de debug para criação de distribuidora');
    
    // Fazer login
    await login();
    
    // Testar com dados incorretos (como está ocorrendo atualmente)
    try {
      console.log('\n🔴 [TESTE] Tentando criar distribuidora com dados INCORRETOS...');
      await createDistributor(false);
    } catch (error) {
      console.log('✅ [EXPECTATIVA] Falha esperada com dados incorretos:', error.message);
    }
    
    // Testar com dados corretos
    console.log('\n🟢 [TESTE] Tentando criar distribuidora com dados CORRETOS...');
    await createDistributor(true);
    
    console.log('\n✅ [DEBUG] Script finalizado com sucesso!');
  } catch (error) {
    console.error('❌ [ERRO] Falha no script:', error);
  }
}

// Executar o script
main(); 