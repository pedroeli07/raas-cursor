// Path: src/app/api/auth/register/route.ts
import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcrypt';
import { prisma } from '@/lib/db/db';
import log from '@/lib/logs/logger';
import { Role, InvitationStatus, VerificationType } from '@prisma/client';
import { EmailService } from '@/lib/email/emailService';
import { registerSchema } from '../../../../lib/schemas/schemas';
import { UserResponse } from '@/lib/types/types';
import { createAndSendVerificationCode } from '@/lib/utils/verification';
import { EnvironmentConfig } from '@/lib/config/environmentConfig';
import jwt from 'jsonwebtoken';

export async function POST(req: NextRequest) {
  log.info('Received registration request');
  try {
    const body = await req.json();
    
    // Debug: Log raw payload
    log.debug('Registration payload received', { 
      payload: JSON.stringify(body),
      hasToken: !!body.token,
      tokenLength: body.token ? body.token.length : 0,
      tokenPreview: body.token ? `${body.token.substring(0, 10)}...` : 'none'
    });
    
    const validation = registerSchema.safeParse(body);

    if (!validation.success) {
      log.warn('Registration validation failed', { errors: validation.error.errors });
      return NextResponse.json({ errors: validation.error.errors }, { status: 400 });
    }

    const { email, password, name, token } = validation.data;

    log.debug('Validated registration data', { 
      email, 
      name, 
      hasToken: !!token,
      token: token ? `${token.substring(0, 10)}...` : undefined
    });

    // Check if user with this email already exists
    const existingContact = await prisma.contact.findFirst({ 
      where: { 
        emails: {
          has: email
        } 
      } 
    });
    
    if (existingContact) {
      const existingUser = await prisma.user.findFirst({ where: { contactId: existingContact.id } });
      if (existingUser) {
        log.warn('Registration failed: Email already exists', { email });
        return NextResponse.json({ message: 'Email already exists' }, { status: 409 });
      }
      // Se existe contato mas não usuário, vamos usar este contato existente
      log.info('Found existing contact without user, will use it for registration', { contactId: existingContact.id, email });
    }

    let userRole: Role = Role.CUSTOMER;
    let invitationId: string | null = null;

    // Super Admin Registration (Direct)
    if (email === 'pedro-eli@hotmail.com' && !token) {
      log.info('Attempting super_admin registration', { email });
      userRole = Role.SUPER_ADMIN;
    }
    // Invitation Token Registration
    else if (token) {
      log.info('Attempting registration via invitation token', { 
        email, 
        tokenPreview: token ? `${token.substring(0, 10)}...` : undefined 
      });
      
      // Debug: Log query parameters for invitation lookup
      log.debug('Looking up invitation with token', { 
        token: token ? `${token.substring(0, 10)}...` : undefined,
        status: InvitationStatus.PENDING, 
        expiresAt: 'greater than current time'
      });
      
      const invitation = await prisma.invitation.findUnique({
        where: { token, status: InvitationStatus.PENDING, expiresAt: { gt: new Date() } },
      });

      // Debug: Log the result of invitation lookup
      log.debug('Invitation lookup result', {
        found: !!invitation,
        invitationId: invitation?.id,
        invitationEmail: invitation?.email,
        registrationEmail: email,
        tokenMatch: invitation?.token === token,
        statusMatch: invitation?.status === InvitationStatus.PENDING,
        expiryValid: invitation?.expiresAt ? new Date(invitation.expiresAt) > new Date() : false
      });

      if (!invitation) {
        log.warn('Registration failed: Invalid or expired token', { email, token });
        return NextResponse.json({ message: 'Invalid or expired invitation token' }, { status: 400 });
      }

      // Check if email differs from invitation
      if (invitation.email !== email) {
        // Get the configured strictness level
        const isStrictMode = EnvironmentConfig.strictInvitationEmailMatching;
        
        log.debug('Email match check for invitation', {
          invitationEmail: invitation.email,
          registrationEmail: email,
          matches: invitation.email === email,
          isStrictMode
        });
        
        if (isStrictMode) {
          // In strict mode (typically production), require exact email match
          log.warn('Registration failed: Email does not match invitation', { 
            registrationEmail: email, 
            invitationEmail: invitation.email 
          });
          return NextResponse.json({ 
            message: 'O email utilizado não corresponde ao email convidado. Por favor, use o mesmo email para o qual o convite foi enviado.' 
          }, { status: 400 });
        } else {
          // In non-strict mode (development/testing), allow but log a warning
          log.warn('Registration email differs from invitation email, but proceeding in non-strict mode', { 
            registrationEmail: email, 
            invitationEmail: invitation.email,
            isStrictMode
          });
        }
      }

      log.debug('Valid invitation token found', { invitationId: invitation.id, role: invitation.role });
      userRole = invitation.role;
      invitationId = invitation.id;

      // Mark token as used
      await prisma.invitation.update({
        where: { id: invitation.id },
        data: { status: InvitationStatus.ACCEPTED },
      });
      log.info('Invitation token marked as accepted', { invitationId: invitation.id });

    }
    // Regular user trying to register directly (not allowed, but we'll handle it nicely)
    else {
      log.warn('Direct registration attempted for non-superadmin', { email });
      
      // Check if this email has any pending invitations
      const pendingInvitations = await prisma.invitation.findMany({
        where: { 
          email: email,
          status: InvitationStatus.PENDING,
          expiresAt: { gt: new Date() }
        },
        orderBy: { createdAt: 'desc' },
        take: 1
      });
      
      // Debug: Log if there are pending invitations for this email
      log.debug('Checked for pending invitations without token', {
        email,
        hasPendingInvitations: pendingInvitations.length > 0,
        invitationId: pendingInvitations[0]?.id,
        invitationToken: pendingInvitations[0]?.token ? 
          `${pendingInvitations[0].token.substring(0, 10)}...` : undefined
      });
      
      // If there is a pending invitation, allow registration
      if (pendingInvitations.length > 0) {
        log.info('User attempted direct registration and has pending invitation - allowing registration', { 
          email, 
          invitationId: pendingInvitations[0].id 
        });
        
        // Use the invitation details
        const invitation = pendingInvitations[0];
        userRole = invitation.role;
        invitationId = invitation.id;
        
        // Mark invitation as used
        await prisma.invitation.update({
          where: { id: invitation.id },
          data: { status: InvitationStatus.ACCEPTED },
        });
        log.info('Invitation marked as accepted for direct registration', { invitationId: invitation.id });
      } else {
        // Send emails to acknowledge the registration attempt for users without invitations
        const registrationAcknowledged = await EmailService.sendRegistrationRequestAcknowledgement(email, name);
        const supportNotified = await EmailService.notifySupportAboutRegistrationAttempt(email, name);
        
        if (registrationAcknowledged && supportNotified) {
          log.info('Sent registration request acknowledgement emails', { email });
          return NextResponse.json({ 
            message: 'Obrigado pelo seu interesse. Nós iremos analisar sua solicitação e entraremos em contato em breve.', 
            status: 'pending_approval' 
          }, { status: 202 });
        } else {
          log.error('Failed to send registration acknowledgement emails', { email });
          return NextResponse.json({ 
            message: 'Não foi possível processar sua solicitação no momento. Por favor, tente novamente mais tarde.' 
          }, { status: 500 });
        }
      }
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    log.debug('Password hashed successfully', { email });

    // Create or reuse contact
    let contact;
    if (existingContact) {
      // Reuse existing contact
      contact = existingContact;
      log.debug('Reusing existing contact', { contactId: contact.id });
    } else {
      // Create new contact
      contact = await prisma.contact.create({
        data: {
          emails: [email],
          phones: []
        }
      });
      log.debug('New contact created successfully', { contactId: contact.id });
    }

    // Set profileCompleted to true for admin users
    const isAdminRole = userRole === Role.SUPER_ADMIN || userRole === Role.ADMIN || userRole === Role.ADMIN_STAFF;
    
    // Create user with contactId
    const newUser = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        role: userRole,
        contactId: contact.id,
        emailVerified: true,
        isTwoFactorEnabled: false,
        profileCompleted: isAdminRole // Auto-complete profile for admins
      },
    });

    log.info('User registered successfully', { userId: newUser.id, email, role: userRole });

    // Marcar token de convite como usado (se aplicável) APÓS criar o usuário
    if (invitationId) {
      await prisma.invitation.update({
        where: { id: invitationId },
        data: { status: InvitationStatus.ACCEPTED },
      });
      log.info('Invitation token marked as accepted', { invitationId });
    }

    // Omit password from response
    const { password: _, ...userWithoutPassword } = newUser;

    // Create user response with email, converting null values to undefined for type compatibility
    const userResponse: UserResponse = {
      id: userWithoutPassword.id,
      email,
      name: userWithoutPassword.name || undefined,
      role: userWithoutPassword.role,
      contactId: userWithoutPassword.contactId || undefined,
      addressId: userWithoutPassword.addressId || undefined,
      createdAt: userWithoutPassword.createdAt,
      updatedAt: userWithoutPassword.updatedAt
    };

    // Generate JWT token for automatic login
    const jwtSecret = process.env.JWT_SECRET;
    let authToken = null;
    
    if (jwtSecret) {
      authToken = jwt.sign(
        { 
          userId: newUser.id, 
          email: newUser.email, 
          role: newUser.role,
          profileCompleted: newUser.profileCompleted || true
        }, 
        jwtSecret, 
        { expiresIn: '168h' }
      );
      log.info('Generated JWT token for new user', { userId: newUser.id, role: newUser.role });
    } else {
      log.error('JWT_SECRET environment variable is not set');
    }

    return NextResponse.json({
      ...userResponse,
      message: 'Conta criada com sucesso.',
      requiresVerification: false,
      id: newUser.id,
      email: newUser.email,
      name: newUser.name,
      role: newUser.role,
      token: authToken
    }, { status: 201 });

  } catch (error) {
    log.error('Error during registration', { error });
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}
