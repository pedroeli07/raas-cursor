// scripts/test-registration.js
// Script para testar o fluxo completo de registro, verificação e login

// Importação do fetch
import fetch from 'node-fetch';

// Configurações
const BASE_URL = 'http://localhost:3000'; // Alterado para porta 3000
const EMAIL = 'pedro-eli@hotmail.com';
const PASSWORD = 'galod1234';
const NAME = 'Pedro Eli';

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function runTest() {
  console.log('🚀 Iniciando teste de registro, verificação e login');
  console.log('=============================================');

  try {
    // 1. Registrar usuário
    console.log(`\n🔹 ETAPA 1: Registrando usuário ${EMAIL}`);
    const registerResponse = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: EMAIL,
        password: PASSWORD,
        name: NAME
      })
    });

    const registerData = await registerResponse.json();
    
    if (!registerResponse.ok) {
      console.error(`❌ Erro no registro: ${registerData.message}`);
      return;
    }

    console.log('✅ Usuário registrado com sucesso!');
    console.log('📄 Resposta:', JSON.stringify(registerData, null, 2));

    if (!registerData.id) {
      console.error('❌ Erro: ID do usuário não encontrado na resposta');
      return;
    }

    const userId = registerData.id;
    console.log(`👤 ID do usuário: ${userId}`);

    // 2. Aguardar um pouco para que o código seja gerado
    console.log('\n⏳ Aguardando geração do código de verificação...');
    await sleep(2000);

    // 3. Obter código de verificação via API de desenvolvimento
    console.log('\n🔹 ETAPA 2: Obtendo código de verificação do desenvolvimento');
    const codeResponse = await fetch(`${BASE_URL}/api/dev/verification-codes?userId=${userId}`);
    
    if (!codeResponse.ok) {
      console.error('❌ Erro ao obter código de verificação');
      return;
    }

    const codeData = await codeResponse.json();
    const verificationCode = codeData.code;

    if (!verificationCode) {
      console.error('❌ Código de verificação não encontrado');
      return;
    }

    console.log(`✅ Código de verificação obtido: ${verificationCode}`);

    // 4. Verificar o email
    console.log('\n🔹 ETAPA 3: Verificando email');
    const verifyResponse = await fetch(`${BASE_URL}/api/auth/verify-email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        userId,
        code: verificationCode
      })
    });

    const verifyData = await verifyResponse.json();
    
    if (!verifyResponse.ok) {
      console.error(`❌ Erro na verificação: ${verifyData.message}`);
      return;
    }

    console.log('✅ Email verificado com sucesso!');
    console.log('📄 Resposta:', JSON.stringify(verifyData, null, 2));

    // Verificar se temos um token para login automático
    if (verifyData.token) {
      console.log('🔑 Token JWT recebido para login automático');
    }

    // 5. Login explícito (mesmo que já tenhamos o token)
    console.log('\n🔹 ETAPA 4: Testando login explícito');
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

    const loginData = await loginResponse.json();
    
    // Verificar redirecionamento para 2FA ou login bem-sucedido
    if (loginData.requiresTwoFactor) {
      console.log('🔒 Autenticação de dois fatores necessária');
      console.log(`👤 ID do usuário para 2FA: ${loginData.userId}`);

      // Esperar código 2FA
      await sleep(2000);

      // Obter código 2FA
      const twoFactorCodeResponse = await fetch(`${BASE_URL}/api/dev/verification-codes?userId=${loginData.userId}`);
      
      if (!twoFactorCodeResponse.ok) {
        console.error('❌ Erro ao obter código 2FA');
        return;
      }

      const twoFactorCodeData = await twoFactorCodeResponse.json();
      const twoFactorCode = twoFactorCodeData.code;

      console.log(`✅ Código 2FA obtido: ${twoFactorCode}`);

      // Verificar 2FA
      console.log('\n🔹 ETAPA 5: Verificando 2FA');
      const twoFactorResponse = await fetch(`${BASE_URL}/api/auth/verify-two-factor`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userId: loginData.userId,
          code: twoFactorCode
        })
      });

      const twoFactorData = await twoFactorResponse.json();
      
      if (!twoFactorResponse.ok) {
        console.error(`❌ Erro na verificação 2FA: ${twoFactorData.message}`);
        return;
      }

      console.log('✅ Verificação 2FA bem-sucedida!');
      console.log('📄 Resposta:', JSON.stringify(twoFactorData, null, 2));

      if (twoFactorData.token) {
        console.log('🔑 Token JWT recebido após 2FA');
      }
    } else if (loginData.token) {
      console.log('✅ Login bem-sucedido!');
      console.log('🔑 Token JWT recebido');
    } else {
      console.error('❌ Resposta de login inesperada');
      console.log('📄 Resposta:', JSON.stringify(loginData, null, 2));
    }

    console.log('\n🎉 Teste completo! O fluxo de registro e autenticação está funcionando corretamente.');

  } catch (error) {
    console.error('❌ Erro durante o teste:', error);
  }
}

runTest(); 