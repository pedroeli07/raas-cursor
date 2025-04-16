// Testa o endpoint de geração de faturas
const fetch = require('node-fetch');

// Configurações do teste
const TEST_ENDPOINT = 'http://localhost:3000/api/invoices/generate';
const ISSUE_DATE = new Date().toISOString();
const DUE_DATE = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

// Dados de teste para compensação
const compensationTestData = {
  clientId: "cust_001",
  installationNumbers: ["3013110767", "3013096188"],
  calculationType: "compensation",
  period: "01/2025",
  kwhRate: 0.956,
  discount: 20,
  issueDate: ISSUE_DATE,
  dueDate: DUE_DATE,
  selectedColumns: ["periodo", "consumo", "geracao", "compensacao"]
};

// Dados de teste para recebimento
const receiptTestData = {
  clientId: "cust_001",
  installationNumbers: ["3013110767", "3013096188"],
  calculationType: "receipt",
  period: "01/2025",
  kwhRate: 0.956,
  discount: 20,
  issueDate: ISSUE_DATE,
  dueDate: DUE_DATE,
  selectedColumns: ["periodo", "consumo", "recebimento"]
};

// Função para testar o endpoint
async function testEndpoint(data, testName) {
  console.log(`Executando teste: ${testName}`);
  try {
    const response = await fetch(TEST_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    });
    
    const result = await response.json();
    
    console.log(`Status: ${response.status}`);
    console.log('Resposta:', JSON.stringify(result, null, 2));
    
    return { success: response.ok, data: result };
  } catch (error) {
    console.error('Erro:', error.message);
    return { success: false, error: error.message };
  }
}

// Executa os testes
async function runTests() {
  console.log('==== INICIANDO TESTES DE API ====');
  
  console.log('\n1. Teste de geração de fatura por compensação');
  const compensationResult = await testEndpoint(compensationTestData, 'Fatura por Compensação');
  
  console.log('\n2. Teste de geração de fatura por recebimento');
  const receiptResult = await testEndpoint(receiptTestData, 'Fatura por Recebimento');
  
  console.log('\n==== RESUMO DOS TESTES ====');
  console.log(`Fatura por Compensação: ${compensationResult.success ? 'SUCESSO' : 'FALHA'}`);
  console.log(`Fatura por Recebimento: ${receiptResult.success ? 'SUCESSO' : 'FALHA'}`);
  console.log('\n==== TESTES CONCLUÍDOS ====');
}

// Executa os testes
runTests(); 