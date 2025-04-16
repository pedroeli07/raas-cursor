// Debug script to create an installation with detailed logging
// Usage: node scripts/create-installation-debug.js

import { PrismaClient, InstallationType } from '@prisma/client';
const prisma = new PrismaClient({
  log: ['query', 'info', 'warn', 'error'],
});

async function createInstallationDebug() {
  console.log('=== INSTALLATION CREATION DEBUG SCRIPT ===');
  console.log(`Start time: ${new Date().toISOString()}`);
  
  try {
    // Step 1: Find a distributor to use
    console.log('\n[STEP 1] Finding a distributor...');
    const distributor = await prisma.distributor.findFirst();
    
    if (!distributor) {
      console.error('❌ ERROR: No distributor found in the database. Please create a distributor first.');
      return;
    }
    
    console.log(`✅ Found distributor: ${distributor.name} (${distributor.id})`);
    
    // Step 2: Find a potential owner (optional)
    console.log('\n[STEP 2] Looking for a potential owner...');
    const owner = await prisma.user.findFirst({
      where: { 
        OR: [
          { role: 'CUSTOMER' },
          { role: 'ENERGY_RENTER' }
        ]
      }
    });
    
    if (owner) {
      console.log(`✅ Found potential owner: ${owner.name || owner.email} (${owner.id})`);
    } else {
      console.log('⚠️ No suitable owner found. Installation will be created without an owner.');
    }
    
    // Step 3: Create an address
    console.log('\n[STEP 3] Creating a new address...');
    const address = await prisma.address.create({
      data: {
        street: 'Rua de Teste',
        number: '123',
        complement: 'Apto 101',
        neighborhood: 'Centro',
        city: 'Belo Horizonte',
        state: 'MG',
        zip: '30130-110',
        type: 'INSTALLATION'
      }
    });
    
    console.log(`✅ Address created with ID: ${address.id}`);
    
    // Step 4: Create the installation (WITHOUT status field)
    console.log('\n[STEP 4] Creating the installation (without status field)...');
    console.log('Installation data to be sent:');
    
    const installationData = {
      installationNumber: `TEST-${Date.now().toString().slice(-8)}`,
      type: InstallationType.GENERATOR,
      distributorId: distributor.id,
      addressId: address.id,
      ...(owner ? { ownerId: owner.id } : {})
    };
    
    console.log(JSON.stringify(installationData, null, 2));
    
    // Perform the creation
    const installation = await prisma.installation.create({
      data: installationData,
      include: {
        distributor: true,
        address: true,
        owner: true
      }
    });
    
    console.log(`✅ Installation successfully created!`);
    console.log('Installation details:');
    console.log(JSON.stringify({
      id: installation.id,
      installationNumber: installation.installationNumber,
      type: installation.type,
      distributorId: installation.distributorId,
      ownerId: installation.ownerId,
      addressId: installation.addressId,
      createdAt: installation.createdAt,
      updatedAt: installation.updatedAt
    }, null, 2));
    
    // Step 5: Verify the installation was saved correctly
    console.log('\n[STEP 5] Verifying installation in database...');
    const savedInstallation = await prisma.installation.findUnique({
      where: { id: installation.id },
      include: {
        distributor: true,
        address: true,
        owner: true
      }
    });
    
    if (savedInstallation) {
      console.log(`✅ Installation verified in database with ID: ${savedInstallation.id}`);
    } else {
      console.error('❌ ERROR: Could not find the installation in the database after creation!');
    }
    
    // Step 6: Diagnosis
    console.log('\n[DIAGNOSIS]');
    console.log('The key issue appears to be that the Installation model in the Prisma schema does not have a "status" field,');
    console.log('but the API and frontend code are trying to set and use this field.');
    console.log('\nPossible solutions:');
    console.log('1. Add a status field to the Installation model in the Prisma schema and run a migration');
    console.log('2. Remove all references to the status field in the frontend and API code');
    console.log('3. Handle the status separately in the application code without storing it in the database');
    
  } catch (error) {
    console.error('\n❌ ERROR DURING INSTALLATION CREATION:');
    console.error(error);
    
    // Detailed error analysis
    if (error.name === 'PrismaClientValidationError') {
      console.log('\n[ERROR ANALYSIS] PrismaClientValidationError detected');
      console.log('This typically means you\'re trying to use fields that don\'t exist in the schema');
      console.log('Check if you\'re trying to use a "status" field that doesn\'t exist in the Installation model');
    }
  } finally {
    await prisma.$disconnect();
    console.log('\n=== DEBUG SCRIPT COMPLETED ===');
    console.log(`End time: ${new Date().toISOString()}`);
  }
}

createInstallationDebug()
  .catch(e => {
    console.error('Unhandled error:', e);
    prisma.$disconnect();
    process.exit(1);
  });
