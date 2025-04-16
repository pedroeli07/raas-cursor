const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');

const prisma = new PrismaClient();

async function parseFloatSafe(value) {
  if (value === undefined || value === null || value === '') {
    return null;
  }
  
  // If value is already a number, return it
  if (typeof value === 'number') {
    return value;
  }
  
  // Convert to string and try to parse
  const strValue = String(value).replace(',', '.');
  const parsed = parseFloat(strValue);
  
  return isNaN(parsed) ? null : parsed;
}

async function processFile(filePath, distributorId) {
  console.log(`Processing file: ${filePath}`);
  
  try {
    // Get the distributor
    const distributor = await prisma.distributor.findUnique({
      where: { id: distributorId }
    });
    
    if (!distributor) {
      console.error(`Distributor with ID ${distributorId} not found`);
      return;
    }
    
    // Get a default address for auto-creating installations
    const defaultAddress = await prisma.address.findFirst();
    if (!defaultAddress) {
      console.error('No default address found for auto-creating installations');
      return;
    }

    // Read the Excel file
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet);
    
    if (!data || data.length === 0) {
      console.error('File is empty or has invalid format');
      return;
    }

    console.log(`File has ${data.length} rows`);

    // Create a new upload batch
    const batchId = `manual-${Date.now()}`;
    const uploadBatch = await prisma.energyDataUploadBatch.create({
      data: {
        id: batchId,
        fileName: path.basename(filePath),
        distributorId,
        status: 'processing',
        totalCount: data.length,
        processedCount: 0,
        errorCount: 0,
        notFoundCount: 0,
        processingType: 'cemig'
      }
    });

    // Track counts
    let processedCount = 0;
    let errorCount = 0;
    let notFoundCount = 0;
    let autoCreatedCount = 0;

    // First collect all installation numbers
    const installationNumbers = new Set();
    for (const row of data) {
      const installationNumber = String(row['Instalação'] || row['Instalacao'] || row['instalacao'] || row['instalação'] || '').trim();
      if (installationNumber) {
        installationNumbers.add(installationNumber);
      }
    }

    console.log(`Found ${installationNumbers.size} unique installation numbers`);

    // Create a map of installation numbers to IDs
    const installationMap = new Map();
    
    // Find existing installations
    const existingInstallations = await prisma.installation.findMany({
      where: {
        installationNumber: { in: Array.from(installationNumbers) },
        distributorId
      },
      select: { id: true, installationNumber: true }
    });
    
    // Add existing installations to map
    for (const installation of existingInstallations) {
      installationMap.set(installation.installationNumber, installation.id);
    }
    
    console.log(`Found ${existingInstallations.length} existing installations`);

    // Auto-create missing installations
    const missingInstallationNumbers = Array.from(installationNumbers).filter(
      number => !installationMap.has(number)
    );
    
    if (missingInstallationNumbers.length > 0) {
      console.log(`Auto-creating ${missingInstallationNumbers.length} missing installations`);
      
      // Create missing installations
      for (const installationNumber of missingInstallationNumbers) {
        try {
          // Determine installation type based on data (if we can)
          let installationType = 'CONSUMER';
          
          // Look for this installation in data to determine type
          const rowWithInstallation = data.find(row => 
            String(row['Instalação'] || row['Instalacao'] || row['instalacao'] || row['instalação'] || '').trim() === installationNumber
          );
          
          if (rowWithInstallation) {
            const modality = String(rowWithInstallation['Modalidade'] || '');
            if (modality.includes('Geradora')) {
              installationType = 'GENERATOR';
            }
          }
          
          // Create the installation
          const newInstallation = await prisma.installation.create({
            data: {
              installationNumber,
              distributorId,
              type: installationType,
              addressId: defaultAddress.id,
              status: 'ACTIVE'
            }
          });
          
          installationMap.set(installationNumber, newInstallation.id);
          autoCreatedCount++;
          console.log(`Created installation ${installationNumber} as ${installationType}`);
        } catch (error) {
          console.error(`Failed to auto-create installation ${installationNumber}:`, error);
          errorCount++;
        }
      }
    }

    // Prepare data for insertion
    const billDataToCreate = [];
    
    // Process each row
    for (const row of data) {
      try {
        const installationNumber = String(row['Instalação'] || row['Instalacao'] || row['instalacao'] || row['instalação'] || '').trim();
        
        if (!installationNumber) {
          console.warn('Row has no installation number');
          errorCount++;
          continue;
        }
        
        // Get installation ID
        const installationId = installationMap.get(installationNumber);
        
        if (!installationId) {
          console.warn(`Installation not found or created: ${installationNumber}`);
          notFoundCount++;
          continue;
        }
        
        // Extract period (MM/AAAA)
        const period = String(row['Período'] || row['Periodo'] || row['Data'] || '');
        if (!period) {
          console.warn(`Row has no period defined for installation ${installationNumber}`);
          errorCount++;
          continue;
        }
        
        // Prepare data
        billDataToCreate.push({
          uploadBatchId: batchId,
          installationId,
          period,
          modality: String(row['Modalidade'] || ''),
          quota: await parseFloatSafe(row['Quota'] || row['Quota (%)'] || 0),
          tariffPost: String(row['Posto Horário'] || row['Posto Horario'] || ''),
          previousBalance: await parseFloatSafe(row['Saldo Anterior'] || 0),
          expiredBalance: await parseFloatSafe(row['Saldo Expirado'] || 0),
          consumption: await parseFloatSafe(row['Consumo'] || 0),
          generation: await parseFloatSafe(row['Geração'] || row['Geracao'] || 0),
          compensation: await parseFloatSafe(row['Compensação'] || row['Compensacao'] || 0),
          transferred: await parseFloatSafe(row['Transferido'] || 0),
          received: await parseFloatSafe(row['Recebimento'] || row['Recebido'] || 0),
          currentBalance: await parseFloatSafe(row['Saldo Atual'] || 0),
          expiringBalanceAmount: await parseFloatSafe(row['Quantidade Saldo a Expirar'] || 0),
          expiringBalancePeriod: String(row['Período Saldo a Expirar'] || row['Periodo Saldo a Expirar'] || ''),
          dataSource: 'manual_migration',
        });
        
        processedCount++;
      } catch (error) {
        console.error('Error processing row:', error);
        errorCount++;
      }
    }
    
    // Insert data
    console.log(`Inserting ${billDataToCreate.length} records into CemigEnergyBillData`);
    if (billDataToCreate.length > 0) {
      try {
        const result = await prisma.cemigEnergyBillData.createMany({
          data: billDataToCreate,
          skipDuplicates: true,
        });
        console.log(`Inserted ${result.count} records`);
      } catch (error) {
        console.error('Error inserting data:', error);
        throw new Error(`Failed to insert data: ${error.message}`);
      }
    }
    
    // Update batch status
    const status = processedCount > 0 ? 'success' : 'failed';
    await prisma.energyDataUploadBatch.update({
      where: { id: batchId },
      data: {
        status,
        processedCount,
        errorCount,
        notFoundCount,
        completedAt: new Date()
      }
    });
    
    console.log('Migration completed');
    console.log(`Total rows: ${data.length}`);
    console.log(`Processed: ${processedCount}`);
    console.log(`Errors: ${errorCount}`);
    console.log(`Not found: ${notFoundCount}`);
    console.log(`Auto-created installations: ${autoCreatedCount}`);
    
  } catch (error) {
    console.error('Error processing file:', error);
  }
}

async function main() {
  try {
    // Configure these values for your migration
    const filePath = 'C:\\temp\\Consulta_Saldo_GD.xlsx'; // Update with your actual file path
    const distributorId = 'cm9efh3sw0001f7l0xzcc4gt1'; // Update with your actual distributor ID
    
    // Check if distributor exists
    const distributor = await prisma.distributor.findUnique({
      where: { id: distributorId }
    });
    
    console.log(`Using distributor: ${distributor?.name || 'UNKNOWN (ID NOT FOUND)'}`);
    
    // Process the file
    await processFile(filePath, distributorId);
    
  } catch (error) {
    console.error('Migration error:', error);
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  }); 