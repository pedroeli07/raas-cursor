// Script for directly checking installations in the database
// Usage: node scripts/check-installations.js

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkInstallations() {
  try {
    console.log('Checking installations in database directly...');
    
    // Count installations
    const count = await prisma.installation.count();
    console.log(`Total installations in database: ${count}`);
    
    if (count === 0) {
      console.log('No installations found in the database!');
      
      // Check if distributors exist
      const distributorCount = await prisma.distributor.count();
      console.log(`Total distributors in database: ${distributorCount}`);
      
      // No installations - let's create a test one if we have a distributor
      if (distributorCount > 0) {
        const distributor = await prisma.distributor.findFirst();
        
        if (distributor) {
          console.log(`Found distributor to use: ${distributor.name} (${distributor.id})`);
          
          // Create address for the installation
          const address = await prisma.address.create({
            data: {
              street: 'Rua de Teste Script',
              number: '123',
              complement: 'Apto 101',
              neighborhood: 'Centro',
              city: 'Belo Horizonte',
              state: 'MG',
              zip: '30130-110',
              type: 'INSTALLATION'
            }
          });
          
          console.log(`Created address: ${address.id}`);
          
          // Create test installation
          const installation = await prisma.installation.create({
            data: {
              installationNumber: `TEST-SCRIPT-${Date.now().toString().slice(-6)}`,
              type: 'GENERATOR',
              distributorId: distributor.id,
              addressId: address.id
            }
          });
          
          console.log(`Created test installation: ${installation.id} (${installation.installationNumber})`);
          console.log('Installation data:', installation);
        }
      } else {
        console.log('Cannot create test installation: no distributors found');
      }
    } else {
      // Get and display first 5 installations
      const installations = await prisma.installation.findMany({
        take: 5,
        include: {
          distributor: true,
          address: true,
          owner: true
        }
      });
      
      console.log('Found installations (showing max 5):');
      installations.forEach((installation, index) => {
        console.log(`[${index + 1}] ID: ${installation.id}`);
        console.log(`    Number: ${installation.installationNumber}`);
        console.log(`    Type: ${installation.type}`);
        console.log(`    Distributor: ${installation.distributor?.name || 'None'}`);
        console.log(`    Address: ${installation.address?.city || 'None'}, ${installation.address?.state || ''}`);
        console.log(`    Owner: ${installation.owner?.name || 'None'}`);
        console.log('---');
      });
    }
  } catch (error) {
    console.error('Error checking installations:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkInstallations().catch(error => {
  console.error('Unhandled error:', error);
  prisma.$disconnect();
  process.exit(1);
}); 