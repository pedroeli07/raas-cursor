// Script para executar a migração do Prisma
// Execute com: node --experimental-modules migrate-db.js

import { exec } from 'child_process';
import { promisify } from 'util';

const execPromise = promisify(exec);

async function runCommand(command) {
  console.log(`🚀 Executando: ${command}`);
  try {
    const { stdout, stderr } = await execPromise(command);
    if (stdout) console.log(stdout);
    if (stderr) console.error(stderr);
    return true;
  } catch (error) {
    console.error(`❌ Erro ao executar ${command}:`, error);
    return false;
  }
}

async function migrateDatabase() {
  console.log('🔄 Iniciando migração do banco de dados');
  
  // Gera o arquivo de migração com base nas alterações no schema
  const migrationName = `update_distributor_contact_${Date.now()}`;
  const migrationSuccess = await runCommand(`npx prisma migrate dev --name ${migrationName}`);
  
  if (!migrationSuccess) {
    console.error('❌ Falha ao criar/aplicar migração. Abortando.');
    return;
  }
  
  console.log('✅ Migração concluída com sucesso!');
  console.log('🔍 Gerando cliente Prisma atualizado...');
  
  // Gera o cliente Prisma atualizado
  const generateSuccess = await runCommand('npx prisma generate');
  
  if (!generateSuccess) {
    console.error('❌ Falha ao gerar cliente Prisma.');
    return;
  }
  
  console.log('✅ Cliente Prisma atualizado com sucesso!');
}

// Executar migração
migrateDatabase()
  .then(() => console.log('🏁 Script de migração finalizado'))
  .catch(error => console.error('💥 Erro fatal durante migração:', error)); 