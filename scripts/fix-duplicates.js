// scripts/fix-duplicates.js - Script para corrigir contatos duplicados no banco de dados
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Este script:
 * 1. Identifica contatos com emails duplicados
 * 2. Para cada email duplicado:
 *    - Encontra todos os usuários associados aos contatos duplicados
 *    - Escolhe um contato para manter (prefere aquele que já tem um usuário com email verificado)
 *    - Atualiza todos os usuários para apontarem para o contato mantido
 *    - Exclui os contatos duplicados
 */
async function fixDuplicateContacts() {
  console.log('🔍 Procurando por contatos duplicados...');

  // Encontrar emails duplicados
  const duplicateEmails = await prisma.$queryRaw`
    SELECT email, COUNT(*) as count, array_agg(id) as contact_ids
    FROM "Contact"
    GROUP BY email
    HAVING COUNT(*) > 1
  `;

  if (!duplicateEmails.length) {
    console.log('✅ Nenhum contato duplicado encontrado!');
    return;
  }

  console.log(`🚨 Encontrados ${duplicateEmails.length} emails duplicados no banco de dados.`);

  // Para cada email duplicado
  for (const duplicate of duplicateEmails) {
    const email = duplicate.email;
    const contactIds = duplicate.contact_ids;
    
    console.log(`\n📧 Processando email: ${email}`);
    console.log(`   IDs dos contatos duplicados: ${contactIds.join(', ')}`);

    // Encontrar todos os usuários associados a estes contatos
    const users = await prisma.user.findMany({
      where: {
        contactId: {
          in: contactIds
        }
      },
      select: {
        id: true,
        name: true,
        contactId: true,
        emailVerified: true,
        role: true
      }
    });

    console.log(`   Encontrados ${users.length} usuários conectados a estes contatos.`);

    // Se não houver usuários para nenhum dos contatos
    if (users.length === 0) {
      console.log('   🔄 Nenhum usuário encontrado, mantendo apenas o primeiro contato.');
      const keepContactId = contactIds[0];
      
      // Excluir os outros contatos
      let deletedCount = 0;
      for (let i = 1; i < contactIds.length; i++) {
        try {
          await prisma.contact.delete({
            where: { id: contactIds[i] }
          });
          deletedCount++;
        } catch (error) {
          console.error(`   ❌ Erro ao excluir contato ${contactIds[i]}: ${error.message}`);
        }
      }
      
      console.log(`   ✅ Mantido contato ${keepContactId}, excluídos ${deletedCount} contatos.`);
      continue;
    }

    // Decidir qual contato manter (prioriza o que tem usuário com email verificado)
    let keepContactId = null;
    
    // Primeiro, procurar usuários com email verificado
    const verifiedUser = users.find(u => u.emailVerified);
    if (verifiedUser && verifiedUser.contactId) {
      keepContactId = verifiedUser.contactId;
      console.log(`   🔄 Selecionado contato ${keepContactId} (tem usuário verificado).`);
    } 
    // Se não houver usuários verificados, usar o contato do primeiro usuário
    else if (users.length > 0 && users[0].contactId) {
      keepContactId = users[0].contactId;
      console.log(`   🔄 Selecionado contato ${keepContactId} (primeiro usuário encontrado).`);
    }
    // Se por algum motivo nenhum usuário tiver contactId, usar o primeiro ID da lista
    else {
      keepContactId = contactIds[0];
      console.log(`   🔄 Selecionado contato ${keepContactId} (primeiro contato da lista).`);
    }

    // Atualizar todos os usuários para usar o contactId mantido
    let updatedUserCount = 0;
    for (const user of users) {
      if (user.contactId !== keepContactId) {
        try {
          await prisma.user.update({
            where: { id: user.id },
            data: { contactId: keepContactId }
          });
          updatedUserCount++;
          console.log(`   ✅ Atualizado usuário ${user.id} (${user.name || 'sem nome'}) para apontar para o contato ${keepContactId}`);
        } catch (error) {
          console.error(`   ❌ Erro ao atualizar usuário ${user.id}: ${error.message}`);
        }
      }
    }

    // Excluir contatos duplicados
    let deletedContactCount = 0;
    for (const contactId of contactIds) {
      if (contactId !== keepContactId) {
        try {
          await prisma.contact.delete({
            where: { id: contactId }
          });
          deletedContactCount++;
          console.log(`   ✅ Excluído contato duplicado ${contactId}`);
        } catch (error) {
          console.error(`   ❌ Erro ao excluir contato ${contactId}: ${error.message}`);
        }
      }
    }

    console.log(`   📊 Resumo: Mantido contato ${keepContactId}, atualizados ${updatedUserCount} usuários, excluídos ${deletedContactCount} contatos.`);
  }

  console.log('\n✅ Processo concluído!');
}

// Executar o script
fixDuplicateContacts()
  .catch(error => {
    console.error('❌ Erro durante a execução:', error);
  })
  .finally(async () => {
    await prisma.$disconnect();
  }); 