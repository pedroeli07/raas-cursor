// Path: src/app/api/auth/login/route.ts
import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { db } from '@/lib/db/db';
import log from '@/lib/logs/logger';
import { VerificationType } from '@prisma/client';
import { loginSchema } from '@/lib/schemas/schemas';
import { createAndSendVerificationCode } from '@/lib/utils/verification';

export async function POST(req: NextRequest) {
  log.info('Received login request');
  try {
    const body = await req.json();
    const validation = loginSchema.safeParse(body);

    if (!validation.success) {
      log.warn('Login validation failed', { errors: validation.error.errors });
      return NextResponse.json({ errors: validation.error.errors }, { status: 400 });
    }

    const { email, password } = validation.data;
    log.debug('Validated login data', { email });

    // Buscar usuário diretamente pelo email
    const user = await db.user.findUnique({ 
      where: { email },
      include: {
        contact: true // Ainda incluímos o contato para caso seja necessário
      }
    });
    
    if (!user) {
      log.warn('Login failed: No user found with email', { email });
      return NextResponse.json({ message: 'Invalid credentials' }, { status: 401 });
    }

    const passwordMatch = await bcrypt.compare(password, user.password);

    if (!passwordMatch) {
      log.warn('Login failed: Incorrect password', { email });
      return NextResponse.json({ message: 'Invalid credentials' }, { status: 401 });
    }

    log.debug('Password matched successfully', { email });

    // Check if email is verified
    if (!user.emailVerified) {
      log.warn('Login failed: Email not verified', { email, userId: user.id });
      
      // Send a new verification code
      await createAndSendVerificationCode(
        user.id,
        email,
        user.name || '',
        VerificationType.EMAIL_VERIFICATION
      );
      
      return NextResponse.json({ 
        message: 'Por favor, verifique seu email antes de fazer login. Enviamos um novo código de verificação.',
        requiresEmailVerification: true,
        userId: user.id
      }, { status: 403 });
    }

    // Check if 2FA is enabled
    if (user.isTwoFactorEnabled) {
      log.info('Two-factor authentication required', { userId: user.id, email });
      
      // Send 2FA code
      await createAndSendVerificationCode(
        user.id,
        email,
        user.name || '',
        VerificationType.LOGIN
      );
      
      return NextResponse.json({ 
        message: 'Código de verificação enviado para seu email.',
        requiresTwoFactor: true,
        userId: user.id
      }, { status: 200 });
    }

    // If 2FA is not required, proceed with login
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      log.error('JWT_SECRET environment variable is not set');
      throw new Error('JWT secret is not configured.');
    }

    const tokenPayload = {
      userId: user.id,
      email: email,
      role: user.role,
    };

    const token = jwt.sign(tokenPayload, jwtSecret, { expiresIn: '1h' });
    log.info('User logged in successfully, JWT generated', { userId: user.id, email });

    return NextResponse.json({ token });

  } catch (error) {
    log.error('Error during login', { error });
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}
