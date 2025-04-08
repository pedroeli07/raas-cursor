// Path: src/app/api/auth/register/route.ts
import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcrypt';
import { db } from '@/lib/db/db';
import log from '@/lib/logs/logger';
import { Role, InvitationStatus, VerificationType } from '@prisma/client';
import { EmailService } from '@/lib/email/emailService';
import { registerSchema } from '@/lib/schemas/schemas';
import { UserResponse } from '@/lib/types/types';
import { createAndSendVerificationCode } from '@/lib/utils/verification';
import jwt from 'jsonwebtoken';

export async function POST(req: NextRequest) {
  log.info('Received registration request');
  try {
    const body = await req.json();
    const validation = registerSchema.safeParse(body);

    if (!validation.success) {
      log.warn('Registration validation failed', { errors: validation.error.errors });
      return NextResponse.json({ errors: validation.error.errors }, { status: 400 });
    }

    const { email, password, name, token } = validation.data;

    log.debug('Validated registration data', { email, name, hasToken: !!token });

    // Check if user with this email already exists
    const existingContact = await db.contact.findFirst({ 
      where: { 
        emails: {
          has: email
        } 
      } 
    });
    
    if (existingContact) {
      const existingUser = await db.user.findFirst({ where: { contactId: existingContact.id } });
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
      log.info('Attempting registration via invitation token', { email });
      const invitation = await db.invitation.findUnique({
        where: { token, status: InvitationStatus.PENDING, expiresAt: { gt: new Date() } },
      });

      if (!invitation || invitation.email !== email) {
        log.warn('Registration failed: Invalid or expired token', { email, token });
        return NextResponse.json({ message: 'Invalid or expired invitation token' }, { status: 400 });
      }

      log.debug('Valid invitation token found', { invitationId: invitation.id, role: invitation.role });
      userRole = invitation.role;
      invitationId = invitation.id;

      // Mark token as used
      await db.invitation.update({
        where: { id: invitation.id },
        data: { status: InvitationStatus.ACCEPTED },
      });
      log.info('Invitation token marked as accepted', { invitationId: invitation.id });

    }
    // Regular user trying to register directly (not allowed, but we'll handle it nicely)
    else {
      log.warn('Direct registration attempted for non-superadmin', { email });
      
      // Send emails to acknowledge the registration attempt
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
      contact = await db.contact.create({
        data: {
          emails: [email],
          phones: []
        }
      });
      log.debug('New contact created successfully', { contactId: contact.id });
    }

    // Create user with contactId
    const newUser = await db.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        role: userRole,
        contactId: contact.id,
        emailVerified: false,
        isTwoFactorEnabled: true
      },
    });

    log.info('User registered, needs verification', { userId: newUser.id, email, role: userRole });

    // Marcar token de convite como usado (se aplicável) APÓS criar o usuário
    if (invitationId) {
      await db.invitation.update({
        where: { id: invitationId },
        data: { status: InvitationStatus.ACCEPTED },
      });
      log.info('Invitation token marked as accepted', { invitationId });
    }

    // Send verification email
    const verificationSent = await createAndSendVerificationCode(
      newUser.id,
      email,
      name || '',
      VerificationType.EMAIL_VERIFICATION
    );

    if (!verificationSent) {
      // Log error but proceed, user can request resend
      log.error('Failed to send initial verification email', { userId: newUser.id });
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

    return NextResponse.json({
      ...userResponse,
      message: 'Conta criada com sucesso. Por favor, verifique seu email.',
      requiresVerification: true,
      id: newUser.id,
      email: newUser.email,
      name: newUser.name,
      role: newUser.role,
    }, { status: 201 });

  } catch (error) {
    log.error('Error during registration', { error });
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}
