// Debug script to create an installation by directly interacting with the API
// Usage: node scripts/create-installation-direct.js

import fetch from 'node-fetch';

async function createInstallationDebug() {
  console.log('=== INSTALLATION CREATION DEBUG SCRIPT ===');
  console.log(`Start time: ${new Date().toISOString()}`);
  
  try {
    // Step 1: Get a distributor ID
    console.log('\n[STEP 1] Finding a distributor...');
    
    const distributorsResponse = await fetch('http://localhost:3000/api/distributors', {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });
    
    if (!distributorsResponse.ok) {
      console.error('❌ ERROR: Failed to fetch distributors');
      return;
    }
    
    const distributorsData = await distributorsResponse.json();
    
    if (!distributorsData.distributors || distributorsData.distributors.length === 0) {
      console.error('❌ ERROR: No distributors found in the database. Please create a distributor first.');
      return;
    }
    
    const distributor = distributorsData.distributors[0];
    console.log(`✅ Found distributor: ${distributor.name} (${distributor.id})`);
    
    // Step 2: Create the installation (WITHOUT status field)
    console.log('\n[STEP 2] Creating the installation...');
    
    const installationData = {
      installationNumber: `TEST-${Date.now().toString().slice(-8)}`,
      type: 'GENERATOR',
      distributorId: distributor.id,
      address: {
        street: 'Rua de Teste',
        number: '123',
        complement: 'Apto 101',
        neighborhood: 'Centro',
        city: 'Belo Horizonte',
        state: 'MG',
        zip: '30130-110'
      }
      // Explicitly not including status field
    };
    
    console.log('Installation data to be sent:');
    console.log(JSON.stringify(installationData, null, 2));
    
    // Make the API call
    const installationResponse = await fetch('http://localhost:3000/api/installations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(installationData)
    });
    
    // Get response data
    const responseText = await installationResponse.text();
    
    // Check if successful
    if (installationResponse.ok) {
      try {
        const responseData = JSON.parse(responseText);
        console.log('\n✅ Installation successfully created!');
        console.log('Installation details:');
        console.log(JSON.stringify(responseData, null, 2));
      } catch (e) {
        console.log('\n✅ Installation created but got non-JSON response:');
        console.log(responseText);
      }
    } else {
      console.error(`\n❌ ERROR: Failed to create installation (${installationResponse.status})`);
      console.error('Response:');
      console.error(responseText);
    }
    
  } catch (error) {
    console.error('\n❌ ERROR DURING INSTALLATION CREATION:');
    console.error(error);
  } finally {
    console.log('\n=== DEBUG SCRIPT COMPLETED ===');
    console.log(`End time: ${new Date().toISOString()}`);
  }
}

createInstallationDebug()
  .catch(e => {
    console.error('Unhandled error:', e);
    process.exit(1);
  }); 