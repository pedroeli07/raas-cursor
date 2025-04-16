import { db } from '../lib/db/db';
import { PrismaClient } from '@prisma/client';

async function main() {
  console.log('======= CemigEnergyBillData Debug Script =======');
  
  // 1. Check existing data
  const energyDataBatches = await db.energyDataUploadBatch.findMany({
    orderBy: { createdAt: 'desc' },
    take: 5,
    include: {
      distributor: {
        select: { name: true }
      }
    }
  });
  
  console.log(`\nFound ${energyDataBatches.length} recent upload batches:`);
  for (const batch of energyDataBatches) {
    console.log(`- Batch ${batch.id}: ${batch.fileName} [${batch.status}] (${batch.createdAt.toISOString()})`);
    console.log(`  Distributor: ${batch.distributor.name}`);
    console.log(`  Total: ${batch.totalCount}, Processed: ${batch.processedCount}, Errors: ${batch.errorCount}, NotFound: ${batch.notFoundCount}`);
    
    // Check if any data was inserted for this batch
    const cemigData = await db.cemigEnergyBillData.findMany({
      where: { uploadBatchId: batch.id },
      take: 1
    });
    
    console.log(`  Data in CemigEnergyBillData: ${cemigData.length > 0 ? 'YES' : 'NO'}`);
  }

  // 2. Check installations
  const testInstallations = [
    '3014657899', 
    '3004402254',
    '3015031311',  
    '3011883117'
  ];
  
  console.log('\nChecking known problematic installation numbers:');
  for (const installNumber of testInstallations) {
    const installation = await db.installation.findFirst({
      where: { installationNumber: installNumber }
    });
    
    console.log(`- Installation ${installNumber}: ${installation ? 'FOUND' : 'NOT FOUND'}`);
  }

  // 3. Check distributor
  const distributor = await db.distributor.findFirst({
    where: { id: 'cm9efh3sw0001f7l0xzcc4gt1' }
  });
  
  console.log(`\nDistributor cm9efh3sw0001f7l0xzcc4gt1: ${distributor ? distributor.name : 'NOT FOUND'}`);

  // 4. Create a test installation if needed
  console.log('\nCreating a test installation for diagnostics...');
  const testInstallation = await db.installation.upsert({
    where: {
      installationNumber_distributorId: {
        installationNumber: '3015031311',
        distributorId: 'cm9efh3sw0001f7l0xzcc4gt1'
      }
    },
    update: {},
    create: {
      installationNumber: '3015031311',
      type: 'GENERATOR',
      status: 'ACTIVE',
      distributorId: 'cm9efh3sw0001f7l0xzcc4gt1',
      addressId: (await db.address.findFirst())?.id || '',
    }
  });
  
  console.log(`Test installation created/updated: ${testInstallation.id}`);

  // 5. Try adding a test CemigEnergyBillData record
  if (energyDataBatches.length > 0 && testInstallation) {
    const batchId = energyDataBatches[0].id;
    
    console.log('\nCreating test CemigEnergyBillData record...');
    try {
      const testData = await db.cemigEnergyBillData.create({
        data: {
          uploadBatchId: batchId,
          installationId: testInstallation.id,
          period: '11/2023',
          modality: 'Auto Consumo-Geradora',
          quota: 0,
          tariffPost: 'Fora Ponta/Geral',
          previousBalance: 0,
          expiredBalance: 0,
          consumption: 200,
          generation: 19040,
          compensation: 100,
          transferred: 18940,
          received: 0,
          currentBalance: 0,
          expiringBalanceAmount: 0,
          dataSource: 'debug_script',
        }
      });
      
      console.log(`Test CemigEnergyBillData created: ${testData.id}`);
    } catch (error) {
      console.error('Failed to create test CemigEnergyBillData:', error);
    }
  }
  
  console.log('\nDebug script completed.');
}

main()
  .then(async () => {
    await db.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await db.$disconnect();
    process.exit(1);
  }); 