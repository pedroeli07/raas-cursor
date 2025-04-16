// Script para testar a API de geração de faturas

const fetch = require('node-fetch');
const fs = require('fs');

// URL da API
const API_URL = 'http://localhost:3000/api/invoices/generate';

// Dados de teste baseados no exemplo
const testData = {
  clientId: "cust_001", // GBBH Lojas
  installationNumbers: ["3013110767", "3013096188"], // GBBH - Lj 02, GBBH - Lj 01
  calculationType: "compensation", // Compensação
  period: "01/2025",
  kwhRate: 0.956, // Valor do kWh da CEMIG
  discount: 20, // Desconto de 20%
  issueDate: new Date().toISOString(),
  dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 dias após hoje
  selectedColumns: ["periodo", "consumo", "geracao", "compensacao", "recebimento"]
};

// Função para teste com compensação
async function testCompensationInvoice() {
  console.log('Testando geração de fatura com cálculo por Compensação...');
  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testData)
    });

    const result = await response.json();
    
    if (response.ok) {
      console.log('Fatura gerada com sucesso!');
      console.log('Detalhes da fatura:');
      console.log(JSON.stringify(result, null, 2));
      
      // Salva o resultado em um arquivo para análise
      fs.writeFileSync('invoice-compensation-result.json', JSON.stringify(result, null, 2));
    } else {
      console.error('Erro ao gerar fatura:');
      console.error(result);
    }
  } catch (error) {
    console.error('Erro na requisição:', error.message);
  }
}

// Função para teste com recebimento
async function testReceiptInvoice() {
  console.log('Testando geração de fatura com cálculo por Recebimento...');
  const receiptData = {
    ...testData,
    calculationType: "receipt" // Muda para recebimento
  };
  
  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(receiptData)
    });

    const result = await response.json();
    
    if (response.ok) {
      console.log('Fatura gerada com sucesso!');
      console.log('Detalhes da fatura:');
      console.log(JSON.stringify(result, null, 2));
      
      // Salva o resultado em um arquivo para análise
      fs.writeFileSync('invoice-receipt-result.json', JSON.stringify(result, null, 2));
    } else {
      console.error('Erro ao gerar fatura:');
      console.error(result);
    }
  } catch (error) {
    console.error('Erro na requisição:', error.message);
  }
}

// Executa os testes
async function runTests() {
  console.log('Iniciando testes de API de faturamento...');
  await testCompensationInvoice();
  await testReceiptInvoice();
  console.log('Testes concluídos.');
}

runTests(); 