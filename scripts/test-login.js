// scripts/test-login.js
// Script para testar o login manualmente

import fetch from 'node-fetch';

// Configurações
const BASE_URL = 'http://localhost:3000';
const EMAIL = 'pedro-eli@hotmail.com';
const PASSWORD = 'galod1234';

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function testLogin() {
  console.log('🚀 Iniciando teste de login manual');
  console.log('=============================================');

  try {
    // 1. Tentar fazer login
    console.log(`\n🔹 Tentando login com ${EMAIL}`);
    
    const loginResponse = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: EMAIL,
        password: PASSWORD
      })
    });

    // Se o servidor não está respondendo
    if (!loginResponse.ok) {
      console.error(`❌ Erro na requisição: ${loginResponse.status} ${loginResponse.statusText}`);
      if (loginResponse.status === 0) {
        console.error('💡 O servidor parece estar offline ou não responde na porta 3000');
        console.error('   Certifique-se de que o servidor esteja rodando com: npm run dev');
      }
      return;
    }

    const loginData = await loginResponse.json();
    console.log('📄 Resposta completa:', JSON.stringify(loginData, null, 2));

    // Verificar se o login requer verificação de email
    if (loginData.requiresEmailVerification) {
      console.log('🔶 Login requer verificação de email');
      console.log(`👤 ID do usuário: ${loginData.userId}`);
      return;
    }

    // Verificar se o login requer 2FA
    if (loginData.requiresTwoFactor) {
      console.log('🔶 Login requer autenticação de dois fatores');
      console.log(`👤 ID do usuário: ${loginData.userId}`);

      // Buscar código 2FA
      await sleep(2000);
      
      console.log('\n🔹 Buscando código 2FA');
      const codeResponse = await fetch(`${BASE_URL}/api/dev/verification-codes?userId=${loginData.userId}`);
      
      if (!codeResponse.ok) {
        console.error('❌ Erro ao buscar código 2FA');
        return;
      }

      const codeData = await codeResponse.json();
      const twoFactorCode = codeData.code;

      if (!twoFactorCode) {
        console.error('❌ Código 2FA não encontrado');
        return;
      }

      console.log(`✅ Código 2FA obtido: ${twoFactorCode}`);

      // Verificar 2FA
      console.log('\n🔹 Verificando 2FA');
      const verifyResponse = await fetch(`${BASE_URL}/api/auth/verify-two-factor`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userId: loginData.userId,
          code: twoFactorCode
        })
      });

      if (!verifyResponse.ok) {
        console.error('❌ Erro na verificação 2FA');
        return;
      }

      const verifyData = await verifyResponse.json();
      console.log('📄 Resposta:', JSON.stringify(verifyData, null, 2));

      if (verifyData.token) {
        console.log('✅ Login com 2FA bem-sucedido!');
        console.log('🔑 Token JWT recebido');
      } else {
        console.error('❌ Token não recebido após 2FA');
      }
    }
    // Login normal com token
    else if (loginData.token) {
      console.log('✅ Login bem-sucedido!');
      console.log('🔑 Token JWT recebido');
    }
    // Resposta inesperada
    else {
      console.error('❓ Resposta de login inesperada (sem token, sem 2FA, sem verificação de email)');
    }

  } catch (error) {
    console.error('❌ Erro durante o teste:', error);
  }
}

testLogin(); 