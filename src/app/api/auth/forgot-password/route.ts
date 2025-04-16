import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/db';
import log from '@/lib/logs/logger';
import { z } from 'zod';
import crypto from 'crypto';
import { EmailService } from '@/lib/email/emailService';

// Schema for forgot password request
const forgotPasswordSchema = z.object({
  email: z.string().email({ message: 'Invalid email format' }),
});

export async function POST(req: NextRequest) {
  log.info('Received forgot password request');
  try {
    const body = await req.json();
    const validation = forgotPasswordSchema.safeParse(body);

    if (!validation.success) {
      log.warn('Forgot password validation failed', { errors: validation.error.errors });
      return NextResponse.json({ errors: validation.error.errors }, { status: 400 });
    }

    const { email } = validation.data;
    log.debug('Validated forgot password data', { email });

    // Find contact by email
    const contact = await prisma.contact.findFirst({ 
      where: { emails: { has: email } },
      include: {
        users: true
      }
    });
    
    // For security reasons, always return the same response whether user exists or not
    // This prevents user enumeration attacks
    if (!contact || contact.users.length === 0) {
      log.info('Forgot password requested for nonexistent email', { email });
      // Return success even though no email is sent to prevent user enumeration
      return NextResponse.json({ 
        message: 'Se um email associado a esta conta existir, um link de redefinição de senha foi enviado.' 
      });
    }

    // Get the user (assuming one user per contact)
    const user = contact.users[0];

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExpiry = new Date(Date.now() + 3600000); // 1 hour from now

    // Store token in database
    await prisma.passwordReset.create({
      data: {
        token: resetToken,
        userId: user.id,
        expiresAt: resetTokenExpiry
      }
    });

    log.debug('Password reset token created', { userId: user.id });

    // Send email with reset link
    const resetLink = `${process.env.NEXT_PUBLIC_BASE_URL}/reset-password?token=${resetToken}`;
    const emailSent = await EmailService.sendPasswordResetEmail(email, user.name || '', resetLink);

    if (emailSent) {
      log.info('Password reset email sent', { email });
    } else {
      log.error('Failed to send password reset email', { email });
      // Return error but don't expose whether user exists
      return NextResponse.json({ 
        message: 'Ocorreu um erro ao processar sua solicitação. Por favor, tente novamente mais tarde.' 
      }, { status: 500 });
    }

    return NextResponse.json({ 
      message: 'Se um email associado a esta conta existir, um link de redefinição de senha foi enviado.' 
    });

  } catch (error) {
    log.error('Error during forgot password process', { error });
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}
