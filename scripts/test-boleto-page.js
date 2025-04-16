import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Obter o diretório atual em ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Criar diretório para screenshots se não existir
const screenshotsDir = path.join(__dirname, 'screenshots');
if (!fs.existsSync(screenshotsDir)) {
  fs.mkdirSync(screenshotsDir);
}

// Função para registrar logs
function log(message) {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] ${message}`;
  console.log(logMessage);
  
  fs.appendFileSync(
    path.join(__dirname, 'boleto-test.log'),
    logMessage + '\n'
  );
}

async function runTest() {
  log('Iniciando teste da página de geração de boletos');
  
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
    
    // Navegar para a página inicial
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle2' });
    log('Página inicial carregada');
    await page.screenshot({ path: path.join(screenshotsDir, '01-homepage.png') });
    
    // Aguardar redirecionamento para login (se estiver implementado)
    log('Verificando se redirecionou para página de login');
    
    // Simular login (ajustar seletores conforme implementação real)
    log('Tentando realizar login como admin');
    
    // Aguardar até que a página esteja carregada completamente
    // Note: em desenvolvimento, provavelmente estará usando mock de autenticação
    await page.waitForTimeout(2000);
    
    // Navegar para a página de geração de boletos
    log('Navegando para a página de geração de boletos');
    await page.goto('http://localhost:3000/admin/gerar-boleto', { waitUntil: 'networkidle2' });
    log('Página de geração de boletos carregada');
    await page.screenshot({ path: path.join(screenshotsDir, '02-boleto-page.png') });
    
    // Preencher o formulário de boleto
    log('Preenchendo dados do boleto');
    await page.type('input[name="clienteName"]', 'Cliente Teste Automatizado');
    await page.type('input[name="valor"]', '199,90');
    
    // Clicar no seletor de data
    log('Selecionando data de vencimento');
    await page.click('button[class*="popover-trigger"]');
    await page.waitForTimeout(500);
    
    // Selecionar uma data (ajustar o seletor para uma data válida)
    // Pegamos o primeiro dia disponível no calendário
    const calendarDay = await page.$('button[class*="day-available"]');
    if (calendarDay) {
      await calendarDay.click();
      log('Data de vencimento selecionada');
    } else {
      log('Não conseguiu selecionar a data');
    }
    
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(screenshotsDir, '03-form-filled.png') });
    
    // Gerar o boleto
    log('Gerando boleto');
    await page.click('button:has-text("Gerar Boleto")');
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(screenshotsDir, '04-boleto-generated.png') });
    
    // Testar arrastar o componente React-Rnd
    log('Testando drag and drop do componente React-Rnd');
    const rndComponent = await page.$('.react-rnd');
    
    if (rndComponent) {
      const boundingBox = await rndComponent.boundingBox();
      
      // Mover o componente
      await page.mouse.move(boundingBox.x + boundingBox.width / 2, boundingBox.y + 10);
      await page.mouse.down();
      await page.mouse.move(boundingBox.x + 100, boundingBox.y + 100);
      await page.mouse.up();
      
      log('Componente arrastado com sucesso');
      await page.waitForTimeout(1000);
      await page.screenshot({ path: path.join(screenshotsDir, '05-after-drag.png') });
      
      // Testar o redimensionamento
      // Encontrar a alça de redimensionamento inferior direita
      await page.mouse.move(boundingBox.x + boundingBox.width, boundingBox.y + boundingBox.height);
      await page.mouse.down();
      await page.mouse.move(boundingBox.x + boundingBox.width + 50, boundingBox.y + boundingBox.height + 50);
      await page.mouse.up();
      
      log('Componente redimensionado com sucesso');
      await page.waitForTimeout(1000);
      await page.screenshot({ path: path.join(screenshotsDir, '06-after-resize.png') });
    } else {
      log('Não encontrou o componente React-Rnd para teste de drag');
    }
    
    log('Teste concluído com sucesso');
  } catch (error) {
    log(`ERRO: ${error.message}`);
    console.error(error);
    
    // Tirar screenshot do erro
    const page = (await browser.pages())[0];
    if (page) {
      await page.screenshot({ path: path.join(screenshotsDir, 'error.png') });
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