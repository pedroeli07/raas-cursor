// Script para testar os endpoints de instalações
import fetch from 'node-fetch';

// Função para decodificar um token JWT sem verificação
function decodeJwt(token) {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );

    return JSON.parse(jsonPayload);
  } catch (error) {
    console.error('Erro ao decodificar token:', error);
    return null;
  }
}

// Polyfill para atob no Node.js
const atob = str => Buffer.from(str, 'base64').toString('binary');

async function testInstallations() {
  console.log('🚀 Teste de API de Instalações RaaS Solar');
  console.log('=============================================');

  // URL base da aplicação local
  const baseUrl = 'http://localhost:3000/api';
  
  try {
    // Login como super admin
    console.log('\n🔹 Autenticando com usuário Super Admin');
    const loginResponse = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'pedro-eli@hotmail.com',
        password: 'galod1234'
      })
    });

    if (!loginResponse.ok) {
      const error = await loginResponse.json();
      throw new Error(`Falha na autenticação: ${error.message || 'Erro desconhecido'}`);
    }

    const loginData = await loginResponse.json();
    console.log('✅ Login bem-sucedido');
    
    // Verificar a estrutura de dados retornada
    console.log('Estrutura de dados do login:', JSON.stringify(loginData, null, 2));
    
    // Extrair token e ID do usuário com segurança
    const token = loginData.token;
    let userId = null;
    
    if (loginData.user && loginData.user.id) {
      userId = loginData.user.id;
    } else if (loginData.userId) {
      userId = loginData.userId;
    } else if (token) {
      // Tentar extrair userId do token
      const decodedToken = decodeJwt(token);
      if (decodedToken && decodedToken.userId) {
        userId = decodedToken.userId;
      }
    }
    
    if (!token) {
      throw new Error('Token de autenticação não encontrado na resposta');
    }
    
    console.log(`Token obtido: ${token.substring(0, 10)}...`);
    console.log(`ID do usuário: ${userId || 'Não disponível'}`);
    
    // Headers com token de autenticação
    const authHeaders = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    };

    // 1. Buscar todas as instalações
    console.log('\n🔹 Buscando todas as instalações');
    const installationsResponse = await fetch(`${baseUrl}/installations`, {
      method: 'GET',
      headers: authHeaders
    });

    if (!installationsResponse.ok) {
      const error = await installationsResponse.json();
      throw new Error(`Falha ao buscar instalações: ${error.message || 'Erro desconhecido'}`);
    }

    const installationsData = await installationsResponse.json();
    console.log(`✅ Instalações encontradas: ${installationsData.installations ? installationsData.installations.length : 0}`);
    
    if (installationsData.installations && installationsData.installations.length > 0) {
      installationsData.installations.forEach((installation, index) => {
        console.log(`  ${index + 1}. ${installation.installationNumber} (${installation.type})`);
      });
    } else {
      console.log('  Nenhuma instalação encontrada no banco de dados.');
    }

    // 2. Criar uma nova instalação de teste
    const distributorResponse = await fetch(`${baseUrl}/distributors`, {
      method: 'GET',
      headers: authHeaders
    });
    
    if (!distributorResponse.ok) {
      throw new Error('Falha ao buscar distribuidoras');
    }
    
    const distributorsData = await distributorResponse.json();
    
    if (!distributorsData.distributors || distributorsData.distributors.length === 0) {
      console.log('\n🔹 Criando distribuidora de teste');
      const newDistributor = {
        name: 'CEMIG Teste',
        code: 'CMGTES',
        state: 'MG',
        price_per_kwh: 0.976
      };
      
      const createDistributorResponse = await fetch(`${baseUrl}/distributors`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify(newDistributor)
      });
      
      if (!createDistributorResponse.ok) {
        const errorData = await createDistributorResponse.json();
        console.log('❌ Erro detalhado ao criar distribuidora:', JSON.stringify(errorData, null, 2));
        throw new Error(`Falha ao criar distribuidora de teste: ${errorData.message || 'Erro desconhecido'}`);
      }
      
      const createdDistributor = await createDistributorResponse.json();
      console.log(`✅ Distribuidora criada: ${createdDistributor.distributor.name}`);
      var distributorId = createdDistributor.distributor.id;
    } else {
      console.log('\n🔹 Usando distribuidora existente');
      var distributorId = distributorsData.distributors[0].id;
      console.log(`  Distribuidora: ${distributorsData.distributors[0].name}`);
    }
    
    // Buscar usuários para associar à instalação
    const usersResponse = await fetch(`${baseUrl}/users?roles=ENERGY_RENTER`, {
      method: 'GET',
      headers: authHeaders
    });
    
    if (!usersResponse.ok) {
      throw new Error('Falha ao buscar usuários');
    }
    
    const usersData = await usersResponse.json();
    let ownerId;
    
    if (!usersData.users || usersData.users.length === 0) {
      console.log('  ⚠️ Não há usuários ENERGY_RENTER para associar à instalação');
      
      // Usar o ID do próprio usuário logado
      if (userId) {
        ownerId = userId;
      } else {
        throw new Error('Não foi possível determinar um ID de usuário para a instalação');
      }
    } else {
      ownerId = usersData.users[0].id;
    }
    
    // Criar endereço para a instalação
    console.log('\n🔹 Criando endereço para a instalação');
    const newAddress = {
      street: 'Rua Teste',
      number: '123',
      neighborhood: 'Bairro Teste',
      city: 'Cidade Teste',
      state: 'MG',
      zip: '30000-000',
      type: 'INSTALLATION'
    };
    
    const createAddressResponse = await fetch(`${baseUrl}/addresses`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify(newAddress)
    });
    
    let addressId;
    
    if (!createAddressResponse.ok) {
      console.log('❌ Falha ao criar endereço, usando um ID genérico para teste');
      // Usar uma solução alternativa: receber a instalação sem endereço
      addressId = null;
    } else {
      const addressData = await createAddressResponse.json();
      addressId = addressData.address.id;
      console.log(`✅ Endereço criado com ID: ${addressId}`);
    }
    
    console.log('\n🔹 Criando nova instalação de teste');
    const newInstallation = {
      installationNumber: `TEST-${Math.floor(Math.random() * 100000)}`,
      type: 'CONSUMER',
      distributorId,
      ownerId
    };
    
    // Adicionar o addressId apenas se ele existir
    if (addressId) {
      newInstallation.addressId = addressId;
    }
    
    const createInstallationResponse = await fetch(`${baseUrl}/installations`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify(newInstallation)
    });
    
    if (!createInstallationResponse.ok) {
      const error = await createInstallationResponse.json();
      console.log('❌ Falha ao criar instalação:', error);
      
      // Ver detalhes do erro
      if (error.errors) {
        console.log('  Detalhes do erro:');
        error.errors.forEach((err, index) => {
          console.log(`    ${index + 1}. ${err.field || 'Geral'}: ${err.message}`);
        });
      }
    } else {
      const createdInstallation = await createInstallationResponse.json();
      console.log(`✅ Instalação criada: ${createdInstallation.installation.installationNumber}`);
      
      // 3. Buscar a instalação recém-criada
      const installationId = createdInstallation.installation.id;
      console.log(`\n🔹 Buscando detalhes da instalação ${installationId}`);
      
      const installationDetailResponse = await fetch(`${baseUrl}/installations/${installationId}`, {
        method: 'GET',
        headers: authHeaders
      });
      
      if (!installationDetailResponse.ok) {
        throw new Error('Falha ao buscar detalhes da instalação');
      }
      
      const installationDetail = await installationDetailResponse.json();
      console.log('✅ Detalhes da instalação recuperados com sucesso:');
      console.log(`  Número: ${installationDetail.installationNumber}`);
      console.log(`  Tipo: ${installationDetail.type}`);
      console.log(`  Distribuidora: ${installationDetail.distributor?.name || 'N/A'}`);
    }
    
  } catch (error) {
    console.log('❌ Erro durante o teste:', error.message);
    console.error(error);
  }
}

// Executar teste
testInstallations(); 