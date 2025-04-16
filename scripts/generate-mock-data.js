/**
 * RaaS Solar Platform - Mock Data Generator
 * 
 * This script generates mock energy bill data for testing purposes.
 * It creates sample energy consumption and generation data in CSV format
 * that can be used for testing the data upload functionality.
 */

const fs = require('fs');
const path = require('path');

// Configuration
const OUTPUT_DIR = path.join(__dirname, 'mock-data');
const MONTHS = [
  'JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 
  'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'
];
const CURRENT_YEAR = new Date().getFullYear();

// Ensure output directory exists
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

/**
 * Generate a random number within a range
 */
function randomBetween(min, max) {
  return Math.floor(Math.random() * (max - min + 1) + min);
}

/**
 * Generate random installation number
 */
function generateInstallationNumber() {
  return `${randomBetween(1000000, 9999999)}`;
}

/**
 * Generate mock generator installation data
 */
function generateGeneratorData(count = 5, monthIndex = new Date().getMonth()) {
  const month = MONTHS[monthIndex];
  const filename = path.join(OUTPUT_DIR, `cemig_generators_${month}_${CURRENT_YEAR}.csv`);
  
  let csvContent = 'instalacao,geracao_kwh,injecao_kwh\n';
  
  for (let i = 0; i < count; i++) {
    const installationNumber = generateInstallationNumber();
    const generation = randomBetween(800, 5000); // kWh
    const injection = Math.floor(generation * 0.95); // 95% of generation is injected
    
    csvContent += `${installationNumber},${generation},${injection}\n`;
  }
  
  fs.writeFileSync(filename, csvContent);
  console.log(`Generated generator data: ${filename}`);
  return filename;
}

/**
 * Generate mock consumer installation data
 */
function generateConsumerData(count = 10, monthIndex = new Date().getMonth()) {
  const month = MONTHS[monthIndex];
  const filename = path.join(OUTPUT_DIR, `cemig_consumers_${month}_${CURRENT_YEAR}.csv`);
  
  let csvContent = 'instalacao,consumo_kwh,recebimento_kwh,compensacao_kwh\n';
  
  for (let i = 0; i < count; i++) {
    const installationNumber = generateInstallationNumber();
    const consumption = randomBetween(200, 1200); // kWh
    const receipt = randomBetween(100, consumption * 0.9); // up to 90% of consumption
    const compensation = Math.min(receipt, consumption); // can't compensate more than consumed
    
    csvContent += `${installationNumber},${consumption},${receipt},${compensation}\n`;
  }
  
  fs.writeFileSync(filename, csvContent);
  console.log(`Generated consumer data: ${filename}`);
  return filename;
}

/**
 * Generate mock CEMIG energy bill data (TSV format)
 */
function generateCemigBillData(installationNumber, monthIndex = new Date().getMonth()) {
  const month = MONTHS[monthIndex];
  const filename = path.join(OUTPUT_DIR, `cemig_bill_${installationNumber}_${month}_${CURRENT_YEAR}.tsv`);
  
  const referenceDate = new Date(CURRENT_YEAR, monthIndex, 15);
  const formattedDate = `${referenceDate.getDate().toString().padStart(2, '0')}/${(referenceDate.getMonth() + 1).toString().padStart(2, '0')}/${referenceDate.getFullYear()}`;
  
  // Random data
  const consumption = randomBetween(200, 1200);
  const basePrice = 0.976; // R$ per kWh for CEMIG
  const energyCharge = (consumption * basePrice).toFixed(2);
  const publicLighting = (consumption * 0.05).toFixed(2);
  const taxes = (parseFloat(energyCharge) * 0.3).toFixed(2);
  const totalBill = (parseFloat(energyCharge) + parseFloat(publicLighting) + parseFloat(taxes)).toFixed(2);
  
  // Create TSV content in CEMIG format
  let tsvContent = [
    `CEMIG DISTRIBUIÇÃO S.A.\tNº DA INSTALAÇÃO: ${installationNumber}`,
    `FATURA DE ENERGIA ELÉTRICA\tREFERÊNCIA: ${month}/${CURRENT_YEAR}`,
    `DATA DE EMISSÃO: ${formattedDate}\tVENCIMENTO: ${randomBetween(5, 15)}/${(monthIndex + 2 > 12 ? (monthIndex + 2 - 12) : monthIndex + 2).toString().padStart(2, '0')}/${monthIndex + 2 > 12 ? CURRENT_YEAR + 1 : CURRENT_YEAR}`,
    '---',
    'DADOS DE CONSUMO',
    `Consumo Ativo (kWh):\t${consumption}`,
    `Início Período:\t${randomBetween(1, 5)}/${(monthIndex + 1).toString().padStart(2, '0')}/${CURRENT_YEAR}`,
    `Fim Período:\t${randomBetween(25, 30)}/${(monthIndex + 1).toString().padStart(2, '0')}/${CURRENT_YEAR}`,
    '---',
    'VALORES FATURADOS',
    `Energia Elétrica:\tR$ ${energyCharge}`,
    `Contrib. Ilum. Pública:\tR$ ${publicLighting}`,
    `Impostos e Taxas:\tR$ ${taxes}`,
    `VALOR TOTAL:\tR$ ${totalBill}`,
    '---',
    'DADOS DA COMPENSAÇÃO DE ENERGIA',
    `Energia injetada (kWh):\t${randomBetween(0, 100)}`,
    `Energia compensada (kWh):\t${randomBetween(0, consumption)}`,
    `Saldo Mês Anterior (kWh):\t${randomBetween(0, 500)}`,
    `Saldo Atual (kWh):\t${randomBetween(0, 600)}`,
  ].join('\n');
  
  fs.writeFileSync(filename, tsvContent);
  console.log(`Generated CEMIG bill: ${filename}`);
  return filename;
}

/**
 * Generate full dataset for a specific month
 */
function generateDataForMonth(monthIndex = new Date().getMonth()) {
  console.log(`Generating mock data for ${MONTHS[monthIndex]}/${CURRENT_YEAR}`);
  
  const generatorFile = generateGeneratorData(5, monthIndex);
  const consumerFile = generateConsumerData(10, monthIndex);
  
  // Generate sample bills for a few installations
  const genInstallations = fs.readFileSync(generatorFile, 'utf8')
    .split('\n')
    .slice(1) // Skip header
    .filter(line => line.trim() !== '')
    .map(line => line.split(',')[0]); // Get installation numbers
    
  const consumerInstallations = fs.readFileSync(consumerFile, 'utf8')
    .split('\n')
    .slice(1) // Skip header
    .filter(line => line.trim() !== '')
    .map(line => line.split(',')[0]); // Get installation numbers
  
  // Generate 2 generator bills and 3 consumer bills
  for (let i = 0; i < Math.min(2, genInstallations.length); i++) {
    generateCemigBillData(genInstallations[i], monthIndex);
  }
  
  for (let i = 0; i < Math.min(3, consumerInstallations.length); i++) {
    generateCemigBillData(consumerInstallations[i], monthIndex);
  }
  
  console.log(`Completed generating mock data for ${MONTHS[monthIndex]}/${CURRENT_YEAR}`);
}

/**
 * Generate realistic data for a specific installation over time
 */
function generateHistoricalData(installationNumber, months = 6) {
  console.log(`Generating ${months} months of historical data for installation ${installationNumber}`);
  
  const currentMonth = new Date().getMonth();
  
  for (let i = 0; i < months; i++) {
    const monthIndex = (currentMonth - i + 12) % 12; // Go back i months
    generateCemigBillData(installationNumber, monthIndex);
  }
  
  console.log(`Completed generating historical data for installation ${installationNumber}`);
}

// Generate data for current and previous month
const currentMonth = new Date().getMonth();
generateDataForMonth(currentMonth);
generateDataForMonth((currentMonth - 1 + 12) % 12);

// Generate 6 months of historical data for a specific installation
const sampleInstallation = generateInstallationNumber();
generateHistoricalData(sampleInstallation, 6);

console.log('Mock data generation completed!');
console.log(`All files saved to: ${OUTPUT_DIR}`); 