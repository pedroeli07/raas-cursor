/**
 * Script para testar as APIs do sistema RaaS
 * Execute usando: node test-api.mjs <comando>
 * 
 * Comandos disponíveis:
 * - login <email> <senha>: Faz login e salva o token para uso posterior
 * - invite <email> <role>: Envia um convite para um usuário
 * - upload <arquivo>: Faz upload de um arquivo de dados de energia
 */

import fs from 'fs';
import path from 'path';
import fetch from 'node-fetch';
import { FormData } from 'form-data';
import { fileURLToPath } from 'url';

// Configurações
const BASE_URL = 'http://localhost:3000';
const TOKEN_FILE = '.auth_token.json';

// Função para salvar o token
function saveToken(token) {
  fs.writeFileSync(TOKEN_FILE, JSON.stringify({ token, timestamp: Date.now() }));
  console.log('Token salvo com sucesso!');
}

// Função para carregar o token
function loadToken() {
  try {
    if (fs.existsSync(TOKEN_FILE)) {
      const data = JSON.parse(fs.readFileSync(TOKEN_FILE));
      return data.token;
    }
  } catch (error) {
    console.error('Erro ao carregar token:', error.message);
  }
  return null;
}

// Função para login
async function login(email, password) {
  try {
    const response = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });

    const data = await response.json();
    
    if (response.ok && data.token) {
      saveToken(data.token);
      console.log('Login realizado com sucesso!');
      console.log('Dados do usuário:', data.user);
    } else {
      console.error('Erro ao fazer login:', data.message || 'Resposta inválida');
    }
  } catch (error) {
    console.error('Erro ao fazer login:', error.message);
  }
}

// Função para enviar convite
async function invite(email, role) {
  const token = loadToken();
  if (!token) {
    console.error('Você precisa fazer login primeiro! Use: node test-api.mjs login <email> <senha>');
    return;
  }

  try {
    const response = await fetch(`${BASE_URL}/api/invitations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ email, role }),
    });

    const data = await response.json();
    
    if (response.ok) {
      console.log('Convite enviado com sucesso!');
      console.log('Dados do convite:', data.invitation);
    } else {
      console.error('Erro ao enviar convite:', data.message || 'Resposta inválida');
    }
  } catch (error) {
    console.error('Erro ao enviar convite:', error.message);
  }
}

// Função para upload de arquivo
async function upload(filePath) {
  const token = loadToken();
  if (!token) {
    console.error('Você precisa fazer login primeiro! Use: node test-api.mjs login <email> <senha>');
    return;
  }

  if (!fs.existsSync(filePath)) {
    console.error(`Arquivo não encontrado: ${filePath}`);
    return;
  }

  const form = new FormData();
  form.append('file', fs.createReadStream(filePath));

  try {
    const response = await fetch(`${BASE_URL}/api/energy-data/upload`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      body: form,
    });

    const data = await response.json();
    
    if (response.ok) {
      console.log('Upload realizado com sucesso!');
      console.log('Estatísticas:', data.stats);
    } else {
      console.error('Erro ao fazer upload:', data.message || 'Resposta inválida');
    }
  } catch (error) {
    console.error('Erro ao fazer upload:', error.message);
  }
}

// Processamento dos argumentos da linha de comando
const args = process.argv.slice(2);
const command = args[0];

if (!command) {
  console.log('Uso: node test-api.mjs <comando>');
  console.log('Comandos disponíveis:');
  console.log('  login <email> <senha>: Faz login e salva o token');
  console.log('  invite <email> <role>: Envia um convite');
  console.log('  upload <arquivo>: Faz upload de um arquivo de dados');
  process.exit(1);
}

switch (command) {
  case 'login':
    if (args.length < 3) {
      console.error('Uso: node test-api.mjs login <email> <senha>');
      process.exit(1);
    }
    login(args[1], args[2]);
    break;

  case 'invite':
    if (args.length < 3) {
      console.error('Uso: node test-api.mjs invite <email> <role>');
      console.error('Valores válidos para role: ADMIN, ADMIN_STAFF, CUSTOMER, ENERGY_RENTER');
      process.exit(1);
    }
    invite(args[1], args[2]);
    break;

  case 'upload':
    if (args.length < 2) {
      console.error('Uso: node test-api.mjs upload <arquivo>');
      process.exit(1);
    }
    upload(args[1]);
    break;

  default:
    console.error(`Comando desconhecido: ${command}`);
    process.exit(1);
} 