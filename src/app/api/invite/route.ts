// Path: src/app/api/auth/invite/route.ts
import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { prisma } from '@/lib/db/db';
import log from '@/lib/logs/logger';
import { Role, InvitationStatus } from '@prisma/client';
import { EmailService } from '@/lib/email/emailService';
import { NotificationService } from '@/lib/notification/notificationService';
import { inviteSchema } from '../../../lib/schemas/schemas';
import { RequestUser, InvitationResponse } from '@/lib/types/types';

// Helper function to get user information from request headers set by middleware
function getUserFromRequest(req: NextRequest): RequestUser {
  const userId = req.headers.get('x-user-id');
  const userEmail = req.headers.get('x-user-email');
  const userRole = req.headers.get('x-user-role') as Role | null;

  return { userId, userEmail, userRole };
}

// Helper function to get the name of a user from their ID
async function getUserName(userId: string | null): Promise<string | null> {
  if (!userId) return null;
  
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { name: true, email: true }
    });
    
    if (!user) return null;
    
    return user.name || user.email || null;
  } catch (error) {
    log.error('Error fetching user name', { error, userId });
    return null;
  }
}

// GET method to retrieve invitations
export async function GET(req: NextRequest) {
  log.info('Received request to fetch invitations');

  // Authorization check
  const { userRole } = getUserFromRequest(req);
  if (!(userRole === Role.SUPER_ADMIN || userRole === Role.ADMIN || userRole === Role.ADMIN_STAFF)) {
    log.warn('Unauthorized attempt to fetch invitations', { roleAttempted: userRole });
    return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
  }

  log.debug('Request authorized for invitation fetch', { userRole });

  try {
    // Get all invitations, ordered by creation date (newest first)
    const invitations = await prisma.invitation.findMany({
      orderBy: {
        createdAt: 'desc'
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        status: true,
        message: true,
        sender: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        createdAt: true,
        expiresAt: true,
        // Exclude token for security reasons
      }
    });

    log.info('Invitations fetched successfully', { count: invitations.length });
    return NextResponse.json({ invitations });
  } catch (error) {
    log.error('Error fetching invitations', { error });
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  log.info('Received invitation request');

  try {
    // Get user information for creating notifications later
    const { userId, userEmail, userRole } = getUserFromRequest(req);
    // Get the name of the admin who sent the invitation
    const adminName = await getUserName(userId);

    log.debug('Admin details', { userId, userEmail, userRole, adminName });

    // Authorization check
    if (!(userRole === Role.SUPER_ADMIN || userRole === Role.ADMIN || userRole === Role.ADMIN_STAFF)) {
        log.warn('Unauthorized attempt to create invitation', { roleAttempted: userRole });
        return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }

    log.debug('Request authorized', { userRole, userEmail });

    const body = await req.json();
    const validation = inviteSchema.safeParse(body);

    if (!validation.success) {
      log.warn('Invitation validation failed', { errors: validation.error.errors });
      return NextResponse.json({ errors: validation.error.errors }, { status: 400 });
    }

    const { email, name, role, message } = validation.data;
    log.debug('Validated invitation data', { email, name, role, message: !!message });

    // Check if user already exists through contact with this email
    const existingContact = await prisma.contact.findFirst({ where: { emails: { has: email } } });
    
    if (existingContact) {
      const existingUser = await prisma.user.findFirst({ where: { contactId: existingContact.id } });
      if (existingUser) {
        log.warn('Invitation failed: User already exists with this email', { email });
        return NextResponse.json({ message: 'Usuário com este email já existe no sistema.' }, { status: 409 });
      }
    }

    // Check for existing non-used invitation
    const existingInvitation = await prisma.invitation.findFirst({
        where: { email: email, status: InvitationStatus.PENDING, expiresAt: { gt: new Date() } }
    });
    if(existingInvitation){
        log.warn('Invitation failed: Active invitation already exists for this email', { email });
        return NextResponse.json({ message: 'Já existe um convite ativo para este email.' }, { status: 409 });
    }

    // Generate unique token
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // Token expires in 24 hours

    log.debug('Generated invitation token', { email, token, expiresAt });

    // Store invitation in database
    const invitation = await prisma.invitation.create({
      data: {
        email,
        name: name || undefined,
        role,
        token,    
        expiresAt,
        message: message || undefined,
        senderId: userId || undefined
      },
    });

    log.info('Invitation created successfully in DB', { 'invitationId': invitation.id, 'inviteEmail': email, 'creator': adminName });

    // Send invitation email
    try {
      const emailSent = await EmailService.sendInvitationEmail(email, name || null, role, token, message);
      
      if (!emailSent) {
        log.warn('Failed to send invitation email, but invitation created in DB', { email });
        // Continue processing instead of returning error
      } else {
        log.info('Invitation email sent successfully', { email });
      }
    } catch (emailError) {
      log.error('Error sending invitation email, but invitation created in DB', { email, error: emailError });
      // Continue processing instead of returning error
    }
    
    // Create notifications for admins about the new invitation
    try {
      await NotificationService.notifyAdminsAboutInvitation(email, name || null, role);
      log.info('Admin notifications created for invitation', { email, adminName });
    } catch (notifyError) {
      log.error('Error creating admin notifications for invitation', { email, error: notifyError });
      // Continue processing instead of returning error
    }

    const invitationResponse: InvitationResponse = {
      id: invitation.id,
      email: invitation.email,
      name: invitation.name || undefined,
      role: invitation.role,
      status: invitation.status,
      message: invitation.message || undefined,
      sender: adminName || undefined,
      createdAt: invitation.createdAt,
      expiresAt: invitation.expiresAt
    };

    return NextResponse.json({ 
      message: 'Invitation created successfully',
      invitation: invitationResponse
    }, { status: 201 });

  } catch (error) {
    log.error('Error during invitation creation', { error });
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}

// PUT method to update invitations
export async function PUT(req: NextRequest) {
  log.info('Received invitation update request');

  // Get user information for creating notifications later
  const { userId, userEmail, userRole } = getUserFromRequest(req);

  // Authorization check
  if (!(userRole === Role.SUPER_ADMIN || userRole === Role.ADMIN || userRole === Role.ADMIN_STAFF)) {
    log.warn('Unauthorized attempt to update invitation', { roleAttempted: userRole });
    return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
  }

  log.debug('Request authorized for update', { userRole, userEmail });

  try {
    const body = await req.json();
    
    // Validate required fields
    if (!body.id) {
      return NextResponse.json({ message: 'ID do convite é obrigatório' }, { status: 400 });
    }

    const invitationId = body.id;
    const { email, name, role, message, resend = false } = body;

    // Find the existing invitation
    const existingInvitation = await prisma.invitation.findUnique({
      where: { id: invitationId }
    });

    if (!existingInvitation) {
      log.warn('Update failed: Invitation not found', { invitationId });
      return NextResponse.json({ message: 'Convite não encontrado' }, { status: 404 });
    }

    // Check if the invitation is in a state that can be edited
    if (existingInvitation.status !== InvitationStatus.PENDING) {
      log.warn('Update failed: Cannot edit non-pending invitation', { invitationId, status: existingInvitation.status });
      return NextResponse.json({ 
        message: 'Apenas convites pendentes podem ser editados'
      }, { status: 400 });
    }

    // Check if the email is being changed
    const emailChanged = email && email !== existingInvitation.email;

    // If email is changing, check if there's already a user or another invitation with that email
    if (emailChanged) {
      // Check if a user with the new email already exists
      const existingContact = await prisma.contact.findFirst({ where: { emails: { has: email } } });
      
      if (existingContact) {
        const existingUser = await prisma.user.findFirst({ where: { contactId: existingContact.id } });
        if (existingUser) {
          log.warn('Update failed: User already exists with the new email', { email });
          return NextResponse.json({ message: 'Usuário com este email já existe no sistema.' }, { status: 409 });
        }
      }

      // Check if there's already another active invitation with the new email
      const duplicateInvitation = await prisma.invitation.findFirst({
        where: { 
          email: email, 
          status: InvitationStatus.PENDING, 
          expiresAt: { gt: new Date() },
          id: { not: invitationId } // Exclude the current invitation
        }
      });
      
      if (duplicateInvitation) {
        log.warn('Update failed: Another active invitation exists for this email', { email });
        return NextResponse.json({ message: 'Já existe um convite ativo para este email.' }, { status: 409 });
      }
    }

    // Check if any data has changed
    const nameChanged = name !== undefined && name !== existingInvitation.name;
    const roleChanged = role && role !== existingInvitation.role;
    const messageChanged = message !== undefined && message !== existingInvitation.message;
    const hasChanges = emailChanged || nameChanged || roleChanged || messageChanged;

    // If forced resend or any changes were made and resend is requested
    const shouldResend = resend || (hasChanges && resend);

    // If there are no changes and not forcing resend, return early
    if (!hasChanges && !shouldResend) {
      return NextResponse.json({ 
        message: 'Nenhuma alteração detectada',
        invitation: existingInvitation
      });
    }

    let updatedInvitation;
    let newToken;

    // If resending, generate a new token and update expiry
    if (shouldResend) {
      newToken = crypto.randomBytes(32).toString('hex');
      const newExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // New token expires in 24 hours

        updatedInvitation = await prisma.invitation.update({
        where: { id: invitationId },
        data: {
          email: email || existingInvitation.email,
          name: name !== undefined ? (name || null) : existingInvitation.name,
          role: role || existingInvitation.role,
          message: message !== undefined ? (message || null) : existingInvitation.message,
          token: newToken,
          expiresAt: newExpiresAt,
        }
      });

      log.info('Invitation updated with new token', { 
        invitationId, 
        email: updatedInvitation.email, 
        expiresAt: updatedInvitation.expiresAt 
      });
    } else {
      // Just update the details without changing token or expiry
      updatedInvitation = await prisma.invitation.update({
        where: { id: invitationId },
        data: {
          email: email || existingInvitation.email,
          name: name !== undefined ? (name || null) : existingInvitation.name,
          role: role || existingInvitation.role,
          message: message !== undefined ? (message || null) : existingInvitation.message,
        }
      });

      log.info('Invitation details updated', { 
        invitationId, 
        email: updatedInvitation.email 
      });
    }

    // If resending, send the email with the new token
    if (shouldResend) {
      const emailSent = await EmailService.sendInvitationEmail(
        updatedInvitation.email, 
        updatedInvitation.name, 
        updatedInvitation.role, 
        newToken as string,
        updatedInvitation.message || undefined
      );
      
      if (!emailSent) {
        log.error('Failed to send updated invitation email', { email: updatedInvitation.email });
        return NextResponse.json({ 
          message: 'Convite atualizado, mas falha ao reenviar email',
          invitation: updatedInvitation
        }, { status: 207 }); // Partial success
      }
      
      log.info('Updated invitation email sent successfully', { email: updatedInvitation.email });
      
      // Get the name of the admin who updated the invitation
      const adminName = await getUserName(userId);
      
      // Create notifications for admins about the updated invitation
      await NotificationService.notifyAdminsAboutInvitation(
        updatedInvitation.email, 
        adminName || null, 
        updatedInvitation.role,
        true // is update
      );
    }

    return NextResponse.json({ 
      message: shouldResend 
        ? 'Convite atualizado e reenviado com sucesso' 
        : 'Convite atualizado com sucesso',
      invitation: updatedInvitation
    });

  } catch (error) {
    log.error('Error during invitation update', { error });
    return NextResponse.json({ message: 'Erro interno do servidor' }, { status: 500 });
  }
}

// PATCH method to revoke an invitation
export async function PATCH(req: NextRequest) {
  log.info('Received invitation revoke request');

  // Get user information
  const { userId, userEmail, userRole } = getUserFromRequest(req);

  // Authorization check
  if (!(userRole === Role.SUPER_ADMIN || userRole === Role.ADMIN || userRole === Role.ADMIN_STAFF )) {
    log.warn('Unauthorized attempt to revoke invitation', { roleAttempted: userRole });
    return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
  }

  log.debug('Request authorized for revoke', { userRole, userEmail });

  try {
    const body = await req.json();
    
    // Validate required fields
    if (!body.id) {
      return NextResponse.json({ message: 'ID do convite é obrigatório' }, { status: 400 });
    }

    const invitationId = body.id;

    // Find the existing invitation
    const existingInvitation = await prisma.invitation.findUnique({
      where: { id: invitationId }
    });

    if (!existingInvitation) {
      log.warn('Revoke failed: Invitation not found', { invitationId });
      return NextResponse.json({ message: 'Convite não encontrado' }, { status: 404 });
    }

    // Only PENDING invitations can be revoked
    if (existingInvitation.status !== InvitationStatus.PENDING) {
      log.warn('Revoke failed: Can only revoke pending invitations', { 
        invitationId, 
        status: existingInvitation.status 
      });
      
      return NextResponse.json({ 
        message: 'Apenas convites pendentes podem ser revogados' 
      }, { status: 400 });
    }

    // Update the invitation status to REVOKED
    const revokedInvitation = await prisma.invitation.update({
      where: { id: invitationId },
      data: {
        status: InvitationStatus.REVOKED
      }
    });

    log.info('Invitation revoked successfully', { 
      invitationId, 
      email: revokedInvitation.email
    });

    // Notify admins
    const adminName = await getUserName(userId);
    await NotificationService.notifyAdminsAboutRevokedInvitation(
      revokedInvitation.email,
      revokedInvitation.name || null,
      adminName || 'Um administrador'
    );

    return NextResponse.json({ 
      message: 'Convite revogado com sucesso',
      invitation: revokedInvitation
    });
  } catch (error) {
    log.error('Error during invitation revoke', { error });
    return NextResponse.json({ message: 'Erro interno do servidor' }, { status: 500 });
  }
}

// DELETE method to remove an invitation
export async function DELETE(req: NextRequest) {
  log.info('Received invitation delete request');
  
  // Get user information
  const { userId, userEmail, userRole } = getUserFromRequest(req);

  // Authorization check
  if (!(userRole === Role.SUPER_ADMIN || userRole === Role.ADMIN || userRole === Role.ADMIN_STAFF)) {
    log.warn('Unauthorized attempt to delete invitation', { roleAttempted: userRole });
    return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
  }

  log.debug('Request authorized for delete', { userRole, userEmail });

  try {
    const url = new URL(req.url);
    const id = url.searchParams.get('id');
    const ids = url.searchParams.get('ids');

    // Handle bulk delete if "ids" parameter is provided
    if (ids) {
      const idsArray = ids.split(',');
      
      if (!idsArray.length) {
        return NextResponse.json({ message: 'Nenhum ID fornecido para exclusão' }, { status: 400 });
      }
      
      log.info('Bulk delete requested', { count: idsArray.length });
      
      // Find all invitations to log details
      const invitations = await prisma.invitation.findMany({
        where: { id: { in: idsArray } }
      });
      
      // Delete the invitations
      const result = await prisma.invitation.deleteMany({
        where: { id: { in: idsArray } }
      });
      
      log.info('Bulk invitation delete successful', { 
        requested: idsArray.length,
        deleted: result.count,
        emails: invitations.map(inv => inv.email)
      });
      
      return NextResponse.json({ 
        message: 'Convites excluídos com sucesso',
        count: result.count
      });
    }
    
    // Handle single delete if only "id" parameter is provided
    else if (id) {
      // Find the invitation first to log details
      const invitation = await prisma.invitation.findUnique({
        where: { id }
      });

      if (!invitation) {
        log.warn('Delete failed: Invitation not found', { id });
        return NextResponse.json({ message: 'Convite não encontrado' }, { status: 404 });
      }

      // Delete the invitation
      await prisma.invitation.delete({
        where: { id }
      });

      log.info('Invitation deleted successfully', { 
        id, 
        email: invitation.email,
        status: invitation.status
      });

      return NextResponse.json({ 
        message: 'Convite excluído com sucesso'
      });
    }
    
    // No id or ids provided
    else {
      return NextResponse.json({ message: 'ID do convite é obrigatório' }, { status: 400 });
    }
  } catch (error) {
    log.error('Error during invitation delete', { error });
    return NextResponse.json({ message: 'Erro interno do servidor' }, { status: 500 });
  }
} 