// Script de monitoramento aprimorado para análise do aplicativo RaaS
// Execute com: node --experimental-modules monitor-app.js

import puppeteer from 'puppeteer';
import fs from 'fs-extra';
import path from 'path';
import { setTimeout as sleep } from 'timers/promises';
import chalk from 'chalk';
import dotenv from 'dotenv';

// Carregar variáveis de ambiente do arquivo .env
dotenv.config();

// Configurações
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
const LOGIN_URL = `${APP_URL}/login`;
const DISTRIBUIDORAS_URL = `${APP_URL}/admin/distribuidoras`;
const INSTALACOES_URL = `${APP_URL}/admin/instalacoes`;
const USUARIOS_URL = `${APP_URL}/admin/usuarios`;
const CONVITE_URL = `${APP_URL}/admin/convites`;
const SCREENSHOTS_DIR = './screenshots';
const LOGS_DIR = './logs';

// Credenciais
const CREDENTIALS = {
  email: process.env.TEST_USER_EMAIL || 'pedro-eli@hotmail.com',
  password: process.env.TEST_USER_PASSWORD || 'galod1234'
};

// Configuração do navegador
const BROWSER_CONFIG = {
  headless: process.env.HEADLESS === 'true', // Define como false para visualizar o navegador
  defaultViewport: { width: 1366, height: 768 },
  args: [
    '--start-maximized',
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-dev-shm-usage',
    '--disable-accelerated-2d-canvas',
    '--disable-gpu'
  ],
  slowMo: 20 // Desacelera a automação para evitar problemas
};

// Estado global para acompanhar o progresso dos testes
const testState = {
  totalTests: 0,
  passedTests: 0,
  failedTests: 0,
  skippedTests: 0,
  createdDistributors: [],
  createdInstallations: [],
  createdUsers: [],
  createdConvites: []
};

// Cores para logs
const log = {
  info: (message) => console.log(chalk.blue(`ℹ️ INFO: ${message}`)),
  success: (message) => console.log(chalk.green(`✅ SUCESSO: ${message}`)),
  warning: (message) => console.log(chalk.yellow(`⚠️ AVISO: ${message}`)),
  error: (message) => console.log(chalk.red(`❌ ERRO: ${message}`)),
  highlight: (message) => console.log(chalk.cyan(`🔍 ${message}`)),
  test: (name, status) => {
    if (status === 'passed') {
      console.log(chalk.green(`✅ TESTE PASSOU: ${name}`));
      testState.passedTests++;
    } else if (status === 'skipped') {
      console.log(chalk.yellow(`⏭️ TESTE PULADO: ${name}`));
      testState.skippedTests++;
    } else {
      console.log(chalk.red(`❌ TESTE FALHOU: ${name}`));
      testState.failedTests++;
    }
    testState.totalTests++;
  }
};

// Função para criar diretórios
async function ensureDirectories() {
  try {
    await fs.ensureDir(SCREENSHOTS_DIR);
    await fs.ensureDir(LOGS_DIR);
    log.success(`Diretórios criados: ${SCREENSHOTS_DIR} e ${LOGS_DIR}`);
  } catch (error) {
    log.error(`Erro ao criar diretórios: ${error.message}`);
  }
}

// Função para salvar log de erros
async function saveErrorLog(error, context = 'geral') {
  const timestamp = new Date().toISOString().replace(/:/g, '-');
  const logFilePath = path.join(LOGS_DIR, `erro-${context}-${timestamp}.log`);
  const errorData = {
    timestamp: new Date().toISOString(),
    context,
    message: error.message,
    stack: error.stack,
  };
  
  try {
    await fs.writeJSON(logFilePath, errorData, { spaces: 2 });
    log.info(`Log de erro salvo em ${logFilePath}`);
  } catch (writeError) {
    log.error(`Falha ao salvar log de erro: ${writeError.message}`);
  }
}

// Função para fazer o login
async function login(page) {
  try {
    log.info('Fazendo login...');
    await page.goto(LOGIN_URL);
    await page.waitForSelector('input[name="email"]');
    await page.type('input[name="email"]', CREDENTIALS.email);
    await page.type('input[name="password"]', CREDENTIALS.password);
    await page.click('button[type="submit"]');
    
    // Esperar pelo redirecionamento após login
    await page.waitForNavigation();
    log.success('Login realizado com sucesso');
    
    // Capturar screenshot da tela inicial
    await page.screenshot({ path: `${SCREENSHOTS_DIR}/dashboard.png` });
    return true;
  } catch (error) {
    log.error(`Falha no login: ${error.message}`);
    await page.screenshot({ path: `${SCREENSHOTS_DIR}/login-error.png` });
    await saveErrorLog(error, 'login');
    return false;
  }
}

// Função para testar a página de distribuidoras
async function testDistribuidoras(page) {
  log.highlight('INICIANDO TESTE DE DISTRIBUIDORAS');
  try {
    // Acessar página de distribuidoras
    log.info('Acessando página de distribuidoras...');
    await page.goto(DISTRIBUIDORAS_URL);
    await page.waitForSelector('h1');
    
    // Capturar screenshot
    await page.screenshot({ path: `${SCREENSHOTS_DIR}/distribuidoras-inicial.png` });
    
    // Verificar se há cards/registros de distribuidoras
    const cardsCount = await page.evaluate(() => {
      return document.querySelectorAll('.distributor-card, [data-card="true"]').length;
    });
    
    log.info(`Encontrados ${cardsCount} cards de distribuidoras`);
    
    // Verificar elementos com NaN ou undefined
    const nanElements = await page.evaluate(() => {
      const elements = Array.from(document.querySelectorAll('*'));
      return elements
        .filter(el => el.textContent.includes('NaN') || el.textContent.includes('undefined'))
        .map(el => ({
          tagName: el.tagName,
          className: el.className,
          id: el.id,
          text: el.textContent.trim().substring(0, 100)
        }));
    });
    
    if (nanElements.length > 0) {
      log.warning(`Encontrados ${nanElements.length} elementos com 'NaN' ou 'undefined'`);
      await fs.writeJSON(
        `${LOGS_DIR}/nan-elements.json`, 
        nanElements, 
        { spaces: 2 }
      );
      log.test('Verificação de elementos NaN/undefined', 'failed');
    } else {
      log.test('Verificação de elementos NaN/undefined', 'passed');
    }
    
    // Testar o formulário de nova distribuidora
    await testCriarDistribuidora(page);
    
    // Testar a visualização em tabela
    await testTabelaDistribuidoras(page);
    
    return true;
  } catch (error) {
    log.error(`Erro nos testes de distribuidoras: ${error.message}`);
    await page.screenshot({ path: `${SCREENSHOTS_DIR}/distribuidoras-erro.png` });
    await saveErrorLog(error, 'distribuidoras');
    return false;
  }
}

// Função para testar o cadastro de uma nova distribuidora
async function testCriarDistribuidora(page) {
  log.info('Testando criação de nova distribuidora...');
  try {
    // Abrir formulário
    await page.click('button:has-text("Nova Distribuidora")');
    await page.waitForSelector('form');
    
    await page.screenshot({ path: `${SCREENSHOTS_DIR}/form-distribuidora.png` });
    
    // Preencher formulário com dados para teste
    const uniqueId = Date.now().toString().slice(-4);
    const testData = {
      name: `Distribuidora Teste ${uniqueId}`,
      pricePerKwh: '0.85',
      street: 'Rua de Testes',
      number: '123',
      complement: 'Bloco A',
      neighborhood: 'Centro',
      city: 'Belo Horizonte',
      state: 'MG',
      zip: '30123-456'
    };
    
    // Registrar distribuidora para testes futuros
    testState.createdDistributors.push(testData);
    
    await page.type('input[name="name"]', testData.name);
    await page.type('input[placeholder="0.85"]', testData.pricePerKwh);
    await page.type('input[name="address.street"]', testData.street);
    await page.type('input[name="address.number"]', testData.number);
    await page.type('input[name="address.complement"]', testData.complement);
    await page.type('input[name="address.neighborhood"]', testData.neighborhood);
    await page.type('input[name="address.city"]', testData.city);
    await page.type('input[name="address.state"]', testData.state);
    await page.type('input[name="address.zip"]', testData.zip);
    
    // Capturar screenshot do formulário preenchido
    await page.screenshot({ path: `${SCREENSHOTS_DIR}/form-preenchido.png` });
    
    // Enviar formulário
    log.info('Enviando formulário...');
    await page.click('button[type="submit"]:has-text("Cadastrar")');
    
    // Esperar pelo toast de sucesso ou erro
    await page.waitForFunction(
      () => document.querySelector('[role="status"]') !== null
    );
    
    // Capturar screenshot após envio
    await page.screenshot({ path: `${SCREENSHOTS_DIR}/apos-envio.png` });
    
    // Analisar mensagem de resposta
    const toastText = await page.evaluate(() => {
      const toast = document.querySelector('[role="status"]');
      return toast ? toast.textContent : null;
    });
    
    log.info(`Mensagem de resposta: ${toastText}`);
    
    // Verificar se a operação foi bem-sucedida (toast deve conter "sucesso")
    if (toastText && toastText.toLowerCase().includes('sucesso')) {
      log.test('Criação de distribuidora', 'passed');
    } else {
      log.test('Criação de distribuidora', 'failed');
    }
    
    // Esperar a página atualizar
    await sleep(2000);
    
    // Verificar se a nova distribuidora aparece na lista
    const newDistributorVisible = await page.evaluate((name) => {
      const cards = document.querySelectorAll('.distributor-card, [data-card="true"]');
      for (const card of cards) {
        if (card.textContent.includes(name)) return true;
      }
      return false;
    }, testData.name);
    
    if (newDistributorVisible) {
      log.test('Exibição da nova distribuidora', 'passed');
    } else {
      log.test('Exibição da nova distribuidora', 'failed');
    }
    
    return true;
  } catch (error) {
    log.error(`Erro ao criar distribuidora: ${error.message}`);
    await page.screenshot({ path: `${SCREENSHOTS_DIR}/criar-distribuidora-erro.png` });
    await saveErrorLog(error, 'criar-distribuidora');
    return false;
  }
}

// Função para testar a visualização em tabela das distribuidoras
async function testTabelaDistribuidoras(page) {
  log.info('Testando visualização em tabela...');
  try {
    // Alternar para visualização de tabela
    await page.click('button[aria-label="Alternar para visualização em tabela"]');
    await sleep(1000);
    
    // Capturar screenshot da tabela
    await page.screenshot({ path: `${SCREENSHOTS_DIR}/visualizacao-tabela.png` });
    
    // Analisar dados da tabela
    const tableData = await page.evaluate(() => {
      const rows = Array.from(document.querySelectorAll('table tbody tr'));
      return rows.map(row => {
        const cells = Array.from(row.querySelectorAll('td'));
        return {
          name: cells[0] ? cells[0].textContent.trim() : 'N/A',
          price: cells[1] ? cells[1].textContent.trim() : 'N/A',
          address: cells[2] ? cells[2].textContent.trim() : 'N/A',
          date: cells[3] ? cells[3].textContent.trim() : 'N/A'
        };
      });
    });
    
    log.info(`Tabela contém ${tableData.length} linhas`);
    
    if (tableData.length > 0) {
      log.test('Visualização em tabela', 'passed');
      await fs.writeJSON(
        `${LOGS_DIR}/table-data.json`, 
        tableData, 
        { spaces: 2 }
      );
    } else {
      log.test('Visualização em tabela', 'failed');
    }
    
    return true;
  } catch (error) {
    log.error(`Erro ao testar tabela: ${error.message}`);
    await page.screenshot({ path: `${SCREENSHOTS_DIR}/tabela-erro.png` });
    await saveErrorLog(error, 'tabela-distribuidoras');
    return false;
  }
}

// Função para testar o módulo de instalações (a ser implementado)
async function testInstalacoes(page) {
  log.highlight('INICIANDO TESTE DE INSTALAÇÕES');
  try {
    // Acessar página de instalações
    log.info('Acessando página de instalações...');
    await page.goto(INSTALACOES_URL);
    
    // Verificar se a página carregou corretamente
    try {
      await page.waitForSelector('h1', { timeout: 5000 });
      await page.screenshot({ path: `${SCREENSHOTS_DIR}/instalacoes-inicial.png` });
      log.test('Carregamento da página de instalações', 'passed');
    } catch (error) {
      log.test('Carregamento da página de instalações', 'failed');
      log.error(`Erro ao carregar página de instalações: ${error.message}`);
      return false;
    }
    
    // Verificar se o botão de nova instalação existe
    const hasNewButton = await page.evaluate(() => {
      return !!document.querySelector('button:has-text("Nova Instalação")');
    });
    
    if (hasNewButton) {
      log.test('Botão de nova instalação', 'passed');
    } else {
      log.test('Botão de nova instalação', 'failed');
      // Pulamos o resto do teste se o botão não existe
      return false;
    }
    
    // Testes adicionais para instalações podem ser implementados aqui
    
    return true;
  } catch (error) {
    log.error(`Erro nos testes de instalações: ${error.message}`);
    await page.screenshot({ path: `${SCREENSHOTS_DIR}/instalacoes-erro.png` });
    await saveErrorLog(error, 'instalacoes');
    return false;
  }
}

// Função para testar o módulo de usuários (a ser implementado)
async function testUsuarios(page) {
  log.highlight('INICIANDO TESTE DE USUÁRIOS');
  try {
    // Acessar página de usuários
    log.info('Acessando página de usuários...');
    await page.goto(USUARIOS_URL);
    
    // Verificar se a página carregou corretamente
    try {
      await page.waitForSelector('h1', { timeout: 5000 });
      await page.screenshot({ path: `${SCREENSHOTS_DIR}/usuarios-inicial.png` });
      log.test('Carregamento da página de usuários', 'passed');
    } catch (error) {
      log.test('Carregamento da página de usuários', 'failed');
      log.error(`Erro ao carregar página de usuários: ${error.message}`);
      return false;
    }
    
    // Testes adicionais para usuários podem ser implementados aqui
    
    return true;
  } catch (error) {
    log.error(`Erro nos testes de usuários: ${error.message}`);
    await page.screenshot({ path: `${SCREENSHOTS_DIR}/usuarios-erro.png` });
    await saveErrorLog(error, 'usuarios');
    return false;
  }
}

// Função para testar o módulo de usuários (a ser implementado)
async function testConvites(page) {
  log.highlight('INICIANDO TESTE DE CONVITES');
  try {
    // Acessar página de usuários
    log.info('Acessando página de convites...');
    await page.goto(CONVITE_URL);
    
    // Verificar se a página carregou corretamente
    try {
      await page.waitForSelector('h1', { timeout: 5000 });
      await page.screenshot({ path: `${SCREENSHOTS_DIR}/convites-inicial.png` });
      log.test('Carregamento da página de convites', 'passed');
    } catch (error) {
      log.test('Carregamento da página de convites', 'failed');
      log.error(`Erro ao carregar página de convites: ${error.message}`);
      return false;
    }
    
    // Testes adicionais para usuários podem ser implementados aqui
    
    return true;
  } catch (error) {
    log.error(`Erro nos testes de convites: ${error.message}`);
    await page.screenshot({ path: `${SCREENSHOTS_DIR}/convites-erro.png` });
    await saveErrorLog(error, 'convites');
    return false;
  }
}

// Função para testar problemas com formatação de números
async function testFormatacao(page) {
  log.highlight('TESTANDO FORMATAÇÃO DE NÚMEROS');
  try {
    await page.goto(DISTRIBUIDORAS_URL);
    
    // Testar formatação de números via JavaScript
    const formatResults = await page.evaluate(() => {
      // Criar funções de teste
      const tests = [
        { value: 0.85, name: 'Número válido (0.85)' },
        { value: null, name: 'Valor nulo' },
        { value: undefined, name: 'Valor indefinido' },
        { value: NaN, name: 'NaN' },
        { value: '', name: 'String vazia' },
      ];
      
      const results = [];
      
      // Testar cada valor
      for (const test of tests) {
        try {
          let formatResult;
          
          // Testar formatação segura
          try {
            // Primeiro verificamos se o valor é válido
            const isValidNumber = 
              test.value !== null && 
              test.value !== undefined && 
              !isNaN(test.value) && 
              test.value !== '';
            
            // Só formatar se for um número válido
            if (isValidNumber) {
              formatResult = new Intl.NumberFormat('pt-BR', {
                style: 'currency',
                currency: 'BRL'
              }).format(test.value);
            } else {
              formatResult = 'R$ 0,00'; // Valor padrão
            }
          } catch (formatError) {
            formatResult = `[ERRO: ${formatError.message}]`;
          }
          
          results.push({
            test: test.name,
            value: String(test.value),
            formatResult,
            isSuccess: !formatResult.includes('[ERRO')
          });
        } catch (e) {
          results.push({
            test: test.name,
            value: String(test.value),
            formatResult: `[ERRO: ${e.message}]`,
            isSuccess: false
          });
        }
      }
      
      return results;
    });
    
    // Salvar resultados
    await fs.writeJSON(
      `${LOGS_DIR}/formatacao-testes.json`, 
      formatResults, 
      { spaces: 2 }
    );
    
    // Verificar resultados
    const allPassed = formatResults.every(r => r.isSuccess);
    
    if (allPassed) {
      log.test('Formatação segura de números', 'passed');
    } else {
      log.test('Formatação segura de números', 'failed');
      log.warning('Problemas na formatação de alguns valores. Verifique logs para detalhes.');
    }
    
    return allPassed;
  } catch (error) {
    log.error(`Erro nos testes de formatação: ${error.message}`);
    await saveErrorLog(error, 'formatacao');
    return false;
  }
}

// Função principal que orquestra todos os testes
async function monitorApp() {
  log.highlight('🚀 INICIANDO MONITORAMENTO DO APLICATIVO');
  
  await ensureDirectories();
  
  const startTime = Date.now();
  const browser = await puppeteer.launch(BROWSER_CONFIG);
  const page = await browser.newPage();
  
  // Configurar o tamanho da janela
  await page.setViewport({ width: 1366, height: 768 });
  
  // Capturar logs do console
  page.on('console', msg => {
    const type = msg.type().padEnd(7);
    console.log(chalk.gray(`[BROWSER ${type}] ${msg.text()}`));
  });
  
  // Capturar erros de página
  page.on('pageerror', error => {
    log.error(`Erro de JavaScript na página: ${error.message}`);
  });
  
  // Capturar requisições com falha
  page.on('requestfailed', request => {
    log.warning(`Requisição falhou: ${request.url()}`);
  });
  
  try {
    // Fazer login primeiro
    const loggedIn = await login(page);
    
    if (!loggedIn) {
      throw new Error('Falha no login, abortando testes');
    }
    
    // Executar testes nos diferentes módulos
    await testDistribuidoras(page);
    await testInstalacoes(page);
    await testUsuarios(page);
    await testFormatacao(page); 
    await testConvites(page);
    // Relatório final
    const elapsedTime = ((Date.now() - startTime) / 1000).toFixed(2);
    
    log.highlight('\n📊 RELATÓRIO DE TESTES');
    log.info(`Total de testes: ${testState.totalTests}`);
    log.success(`Testes que passaram: ${testState.passedTests}`);
    log.error(`Testes que falharam: ${testState.failedTests}`);
    log.warning(`Testes pulados: ${testState.skippedTests}`);
    log.info(`Tempo total de execução: ${elapsedTime} segundos`);
    
    // Salvar relatório
    await fs.writeJSON(
      `${LOGS_DIR}/teste-report-${new Date().toISOString().replace(/:/g, '-')}.json`, 
      {
        timestamp: new Date().toISOString(),
        duration: `${elapsedTime}s`,
        tests: {
          total: testState.totalTests,
          passed: testState.passedTests,
          failed: testState.failedTests,
          skipped: testState.skippedTests
        },
        created: {
          distributors: testState.createdDistributors,
          installations: testState.createdInstallations,
          users: testState.createdUsers,
          convites: testState.createdConvites
        }
      }, 
      { spaces: 2 }
    );
    
    log.success('✅ Monitoramento concluído com sucesso');
  } catch (error) {
    log.error(`❌ Erro durante o monitoramento: ${error.message}`);
    await page.screenshot({ path: `${SCREENSHOTS_DIR}/fatal-error.png` });
    await saveErrorLog(error, 'fatal');
  } finally {
    await browser.close();
  }
}

// Executar o script
monitorApp()
  .then(() => log.highlight('🏁 Script finalizado'))
  .catch(error => log.error(`💥 Erro fatal: ${error.message}`)); 