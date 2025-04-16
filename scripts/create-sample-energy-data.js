/**
 * Sample Energy Data Generator
 * 
 * This script creates sample energy data in XLSX format for testing the upload feature
 */

const ExcelJS = require('exceljs');
const path = require('path');
const fs = require('fs');

// Create a new workbook
const workbook = new ExcelJS.Workbook();
const worksheet = workbook.addWorksheet('Energy Data');

// Add headers
worksheet.columns = [
  { header: 'Número Instalação', key: 'installationNumber', width: 20 },
  { header: 'Tipo', key: 'type', width: 15 },
  { header: 'Geração (kWh)', key: 'generation', width: 15 },
  { header: 'Consumo (kWh)', key: 'consumption', width: 15 },
  { header: 'Transferência (kWh)', key: 'transfer', width: 20 },
  { header: 'Recebimento (kWh)', key: 'receipt', width: 20 },
  { header: 'Compensação (kWh)', key: 'compensation', width: 20 },
  { header: 'Saldo (kWh)', key: 'balance', width: 15 },
  { header: 'Data', key: 'date', width: 15 },
];

// Style the header row
worksheet.getRow(1).font = { bold: true };
worksheet.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };

// Sample data for 5 installations (3 consumers, 2 generators)
const sampleData = [
  // Generators
  {
    installationNumber: '3001234567',
    type: 'generator',
    generation: 5000,
    consumption: 200,
    transfer: 4800,
    receipt: 0,
    compensation: 0,
    balance: 0,
    date: new Date(2024, 2, 15) // March 15, 2024
  },
  {
    installationNumber: '3001234568',
    type: 'generator',
    generation: 8000,
    consumption: 300,
    transfer: 7700,
    receipt: 0,
    compensation: 0,
    balance: 0,
    date: new Date(2024, 2, 15) // March 15, 2024
  },
  
  // Consumers
  {
    installationNumber: '3001234569',
    type: 'consumer',
    generation: 0,
    consumption: 1200,
    transfer: 0,
    receipt: 1000,
    compensation: 1000,
    balance: 0,
    date: new Date(2024, 2, 15) // March 15, 2024
  },
  {
    installationNumber: '3001234570',
    type: 'consumer',
    generation: 0,
    consumption: 2500,
    transfer: 0,
    receipt: 2300,
    compensation: 2300,
    balance: 0,
    date: new Date(2024, 2, 15) // March 15, 2024
  },
  {
    installationNumber: '3001234571',
    type: 'consumer',
    generation: 0,
    consumption: 3800,
    transfer: 0,
    receipt: 3500,
    compensation: 3500,
    balance: 0,
    date: new Date(2024, 2, 15) // March 15, 2024
  },
  
  // Add the test installation we'll create in the browser test
  {
    installationNumber: '12345678',
    type: 'consumer',
    generation: 0,
    consumption: 500,
    transfer: 0,
    receipt: 450,
    compensation: 450,
    balance: 0,
    date: new Date(2024, 2, 15) // March 15, 2024
  }
];

// Add data rows
sampleData.forEach(data => {
  worksheet.addRow(data);
});

// Format date cells
worksheet.getColumn('date').numFmt = 'dd/mm/yyyy';

// Calculate balance values (demonstration of formula)
for (let i = 2; i <= sampleData.length + 1; i++) {
  const row = worksheet.getRow(i);
  if (row.getCell('type').value === 'consumer') {
    // For consumers: balance = receipt - compensation
    const receipt = row.getCell('receipt').value;
    const compensation = row.getCell('compensation').value;
    row.getCell('balance').value = receipt - compensation;
  }
}

// Create output directory if it doesn't exist
const outputDir = path.join(__dirname);
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// Write to file
const outputPath = path.join(outputDir, 'sample-energy-data.xlsx');
console.log(`Generating sample energy data at: ${outputPath}`);

workbook.xlsx.writeFile(outputPath)
  .then(() => {
    console.log('Sample energy data file created successfully!');
  })
  .catch(err => {
    console.error('Error creating sample energy data:', err);
  }); 