import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Obter o diretório atual em ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Criar diretório para screenshots se não existir
const screenshotsDir = path.join(__dirname, 'screenshots', 'boleto-template');
if (!fs.existsSync(screenshotsDir)) {
  fs.mkdirSync(screenshotsDir, { recursive: true });
}

// Função para registrar logs
function log(message) {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] ${message}`;
  console.log(logMessage);
  
  fs.appendFileSync(
    path.join(__dirname, 'boleto-template-test.log'),
    logMessage + '\n'
  );
}

// Função utilitária para esperar
const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function runTest() {
  log('Iniciando teste do template de boleto');
  
  const browser = await puppeteer.launch({
    headless: false, // Para visualizar o teste
    defaultViewport: null, // Usar viewport completo
    args: ['--start-maximized'], // Iniciar maximizado
  });
  
  try {
    const page = await browser.newPage();
    log('Navegador aberto com sucesso');
    
    // Configurar interceção de console logs do navegador
    page.on('console', message => {
      log(`Browser Console: ${message.text()}`);
    });
    
    // Navegar para a página de boletos diretamente
    log('Navegando para página de geração de boletos');
    await page.goto('http://localhost:3000/admin/gerar-boleto', { 
      waitUntil: 'domcontentloaded',
      timeout: 60000 // 60 segundos para carregar
    });
    
    // Esperar por 5 segundos para garantir que a página carregue visualmente
    await wait(5000);
    
    log('Tirando screenshot da página inicial');
    await page.screenshot({ 
      path: path.join(screenshotsDir, '01-inicial.png'),
      fullPage: true
    });
    
    log('Selecionando cliente');
    // Localizar e clicar no selector de cliente
    const clienteSelector = await page.$('.select-trigger');
    if (clienteSelector) {
      await clienteSelector.click();
      await wait(1000);
      
      // Selecionar o primeiro cliente na lista
      const primeiroCliente = await page.$('.select-item');
      if (primeiroCliente) {
        await primeiroCliente.click();
        log('Cliente selecionado');
        await wait(1000);
        
        await page.screenshot({ 
          path: path.join(screenshotsDir, '02-cliente-selecionado.png'),
          fullPage: true
        });
        
        log('Selecionando instalações');
        // Selecionar todas as instalações
        const checkboxes = await page.$$('input[type="checkbox"]');
        for (const checkbox of checkboxes) {
          await checkbox.click();
          await wait(200);
        }
        
        log('Preenchendo o mês de referência');
        // Abrir o seletor de mês
        const btnMesReferencia = await page.$('button:has-text("Selecione o mês de referência")');
        if (btnMesReferencia) {
          await btnMesReferencia.click();
          await wait(1000);
          
          // Selecionar um mês qualquer
          const diaCalendario = await page.$('.day:not(.day-outside)');
          if (diaCalendario) {
            await diaCalendario.click();
            log('Mês de referência selecionado');
            await wait(1000);
          }
        }
        
        log('Preenchendo o vencimento');
        // Abrir o seletor de vencimento
        const btnVencimento = await page.$('button:has-text("Selecione a data de vencimento")');
        if (btnVencimento) {
          await btnVencimento.click();
          await wait(1000);
          
          // Selecionar um dia qualquer
          const diaCalendario = await page.$('.day:not(.day-outside)');
          if (diaCalendario) {
            await diaCalendario.click();
            log('Data de vencimento selecionada');
            await wait(1000);
          }
        }
        
        log('Acessando a aba de valores');
        // Clicar na aba de valores
        const abaValores = await page.$('button:has-text("Valores")');
        if (abaValores) {
          await abaValores.click();
          await wait(1000);
          
          // Alterar alguns valores
          await page.type('input[name="valorKwhCemig"]', '0.987', { delay: 100 });
          await page.type('input[name="desconto"]', '15', { delay: 100 });
          await page.type('input[name="valorAPagar"]', '9.250,00', { delay: 100 });
          
          log('Valores preenchidos');
          await wait(1000);
          
          await page.screenshot({ 
            path: path.join(screenshotsDir, '03-valores-preenchidos.png'),
            fullPage: true
          });
        }
        
        log('Gerando boleto');
        // Clicar no botão de gerar boleto
        const btnGerarBoleto = await page.$('button:has-text("Gerar Boleto")');
        if (btnGerarBoleto) {
          await btnGerarBoleto.click();
          log('Boleto gerado');
          await wait(2000);
          
          await page.screenshot({ 
            path: path.join(screenshotsDir, '04-boleto-gerado.png'),
            fullPage: true
          });
        }
        
        // Teste de arrasto de um elemento de texto
        log('Testando arrastar elementos de texto');
        
        // Localizar e mover um dos elementos de texto draggable
        const elements = await page.$$('.react-rnd');
        if (elements.length > 0) {
          // Pegar o primeiro elemento depois do template (que seria o índice 1)
          const textElement = elements[1]; // O índice 0 é o container do template
          
          if (textElement) {
            const box = await textElement.boundingBox();
            
            // Arrastar o elemento
            await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
            await page.mouse.down();
            await page.mouse.move(box.x + 100, box.y + 50);
            await page.mouse.up();
            
            log('Elemento arrastado');
            await wait(1000);
            
            await page.screenshot({ 
              path: path.join(screenshotsDir, '05-elemento-arrastado.png'),
              fullPage: true
            });
          }
        }
      }
    }
    
    log('Mantendo o navegador aberto por 10 segundos para visualização final');
    await wait(10000);
    
    log('Teste concluído com sucesso');
  } catch (error) {
    log(`ERRO: ${error.message}`);
    console.error(error);
    
    // Tirar screenshot do erro
    const page = (await browser.pages())[0];
    if (page) {
      await page.screenshot({ path: path.join(screenshotsDir, 'erro.png') });
    }
  } finally {
    await browser.close();
    log('Navegador fechado');
  }
}

// Executar o teste
runTest().catch(error => {
  console.error('Erro fatal ao executar o teste:', error);
  process.exit(1);
}); 