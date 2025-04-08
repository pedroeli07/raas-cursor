import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/db';
import log from '@/lib/logs/logger';
import jwt from 'jsonwebtoken';

// Função helper para verificar JWT do usuário
async function verifyAdminToken(req: NextRequest) {
  try {
    // Extrair o token do cabeçalho Authorization
    const authHeader = req.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null;
    }

    const token = authHeader.split(' ')[1];
    const secret = process.env.JWT_SECRET;
    
    if (!secret) {
      log.error('JWT_SECRET environment variable is not set');
      return null;
    }

    // Verificar e decodificar o token
    const decoded = jwt.verify(token, secret) as { userId: string; email: string; role: string };
    
    // Verificar se é um Super Admin
    if (decoded.role !== 'SUPER_ADMIN') {
      return null;
    }

    return decoded;
  } catch (error) {
    log.error('Error verifying admin token', { error });
    return null;
  }
}

// Rota protegida para administradores corrigirem registros duplicados
export async function POST(req: NextRequest) {
  try {
    // Verificação de autenticação (apenas SUPER_ADMIN pode executar)
    const user = await verifyAdminToken(req);
    if (!user) {
      log.warn('Unauthorized attempt to fix duplicate data');
      return NextResponse.json({ message: 'Unauthorized' }, { status: 403 });
    }

    // Obter emails duplicados na tabela Contact
    const duplicates = await db.$queryRaw`
      SELECT email, COUNT(*) as count, array_agg(id) as contact_ids
      FROM "Contact"
      GROUP BY email
      HAVING COUNT(*) > 1
    `;

    if (!Array.isArray(duplicates) || duplicates.length === 0) {
      return NextResponse.json({ message: 'No duplicate contacts found' }, { status: 200 });
    }

    log.info('Found duplicate contacts', { count: duplicates.length });

    const results = [];

    // Para cada email duplicado
    for (const dup of duplicates) {
      const email = dup.email;
      const contactIds = dup.contact_ids;
      
      log.info(`Processing duplicate email: ${email}`, { contactIds });

      // Obter todos os usuários associados a estes contatos
      const users = await db.user.findMany({
        where: {
          contactId: {
            in: contactIds
          }
        }
      });

      if (users.length === 0) {
        log.info(`No users found for contacts with email ${email}`, { contactIds });
        
        // Manter apenas o primeiro contato e excluir os outros
        const keepContactId = contactIds[0];
        for (let i = 1; i < contactIds.length; i++) {
          await db.contact.delete({
            where: { id: contactIds[i] }
          });
          log.info(`Deleted duplicate contact without users`, { deletedId: contactIds[i], keepId: keepContactId });
        }
        
        results.push({
          email,
          action: 'deleted_contacts_without_users',
          keptContactId: keepContactId,
          deletedContactIds: contactIds.slice(1)
        });
        continue;
      }

      // Identificar o ID do contato a ser mantido (aquele com usuário)
      let keepContactId = null;
      
      // Primeiro, procurar contato que tenha um usuário com emailVerified = true
      const verifiedUser = users.find(u => u.emailVerified);
      if (verifiedUser) {
        keepContactId = verifiedUser.contactId;
      } 
      // Se não houver usuário com email verificado, usar o ID do contato do primeiro usuário
      else if (users.length > 0 && users[0].contactId) {
        keepContactId = users[0].contactId;
      }
      // Se ainda não encontramos um ID para manter, usar o primeiro da lista
      else {
        keepContactId = contactIds[0];
      }

      log.info(`Selected contact ID to keep: ${keepContactId}`, { email });

      // Atualizar todos os usuários para apontar para o contato a ser mantido
      for (const user of users) {
        if (user.contactId !== keepContactId) {
          await db.user.update({
            where: { id: user.id },
            data: { contactId: keepContactId }
          });
          log.info(`Updated user contact reference`, { 
            userId: user.id, 
            oldContactId: user.contactId, 
            newContactId: keepContactId 
          });
        }
      }

      // Excluir contatos duplicados (exceto o que está sendo mantido)
      for (const contactId of contactIds) {
        if (contactId !== keepContactId) {
          try {
            await db.contact.delete({
              where: { id: contactId }
            });
            log.info(`Deleted duplicate contact`, { deletedId: contactId, keepId: keepContactId });
          } catch (error) {
            log.error(`Failed to delete contact ${contactId}`, { error });
          }
        }
      }

      results.push({
        email,
        action: 'users_updated_and_contacts_merged',
        keptContactId: keepContactId,
        updatedUserIds: users.filter(u => u.contactId !== keepContactId).map(u => u.id),
        deletedContactIds: contactIds.filter(id => id !== keepContactId)
      });
    }

    return NextResponse.json({ 
      message: 'Duplicate contacts processed successfully',
      processed: results.length,
      results
    }, { status: 200 });

  } catch (error) {
    log.error('Error processing duplicate contacts', { error });
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}

// Rota para verificar emails duplicados
export async function GET(req: NextRequest) {
  try {
    // Verificação de autenticação (apenas SUPER_ADMIN pode visualizar)
    const user = await verifyAdminToken(req);
    if (!user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 403 });
    }

    // Obter emails duplicados
    const duplicates = await db.$queryRaw`
      SELECT email, COUNT(*) as count, array_agg(id) as contact_ids
      FROM "Contact"
      GROUP BY email
      HAVING COUNT(*) > 1
    `;

    if (!Array.isArray(duplicates) || duplicates.length === 0) {
      return NextResponse.json({ message: 'No duplicate contacts found' }, { status: 200 });
    }

    // Para cada email duplicado, obter detalhes adicionais
    const detailedResults = [];
    for (const dup of duplicates) {
      const email = dup.email;
      const contactIds = dup.contact_ids;
      
      // Obter usuários associados a estes contatos
      const users = await db.user.findMany({
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

      detailedResults.push({
        email,
        contactCount: contactIds.length,
        contactIds,
        users
      });
    }

    return NextResponse.json({ 
      duplicateCount: duplicates.length,
      duplicates: detailedResults
    }, { status: 200 });

  } catch (error) {
    log.error('Error checking for duplicate contacts', { error });
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
} 