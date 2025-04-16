const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    // Check upload batches
    console.log('Checking recent upload batches:');
    const batches = await prisma.energyDataUploadBatch.findMany({
      take: 3,
      orderBy: { createdAt: 'desc' },
      include: { distributor: true }
    });
    
    console.log(`Found ${batches.length} batches`);
    batches.forEach(batch => {
      console.log(`- ${batch.fileName} (${batch.status}), processed: ${batch.processedCount}/${batch.totalCount}`);
    });
    
    // Check if we have any CemigEnergyBillData
    console.log('\nChecking CemigEnergyBillData:');
    const cemigData = await prisma.cemigEnergyBillData.findMany({
      take: 3,
      include: { installation: true }
    });
    
    console.log(`Found ${cemigData.length} records`);
    cemigData.forEach(record => {
      console.log(`- Period: ${record.period}, Installation: ${record.installation.installationNumber}`);
    });
    
    // Check installations
    console.log('\nChecking installations:');
    const installations = await prisma.installation.findMany({ take: 5 });
    console.log(`Found ${installations.length} installations`);
    installations.forEach(installation => {
      console.log(`- ${installation.installationNumber} (${installation.type})`);
    });
    
  } catch (error) {
    console.error('Error:', error);
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