// Path: src/app/api/auth/login/route.ts
import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { prisma } from '@/lib/db/db';
import log from '@/lib/logs/logger';
import { VerificationType } from '@prisma/client';
import { loginSchema } from '@/lib/schemas/schemas';
import { createAndSendVerificationCode } from '@/lib/utils/verification';

export async function POST(req: NextRequest) {
  log.info('Received login request');
  try {
    let body;
    try {
      body = await req.json();
    } catch (e) {
      log.warn('Failed to parse request body as JSON', { error: e });
      return NextResponse.json({ message: 'Invalid JSON request body' }, { status: 400 });
    }

    const validation = loginSchema.safeParse(body);

    if (!validation.success) {
      log.warn('Login validation failed', { errors: validation.error.errors });
      return NextResponse.json({ errors: validation.error.errors }, { status: 400 });
    }

    const { email, password } = validation.data;
    log.debug('Validated login data', { email });

    // Buscar usuário diretamente pelo email
    try {
      const user = await prisma.user.findUnique({ 
        where: { email },
        include: {
          contact: true // Ainda incluímos o contato para caso seja necessário
        }
      });
      
      if (!user) {
        log.warn('Login failed: No user found with email', { email });
        return NextResponse.json({ message: 'Invalid credentials' }, { status: 401 });
      }

      let passwordMatch;
      try {
        passwordMatch = await bcrypt.compare(password, user.password);
      } catch (error) {
        log.error('Error comparing passwords', { error, email });
        return NextResponse.json({ message: 'Authentication error' }, { status: 500 });
      }

      if (!passwordMatch) {
        log.warn('Login failed: Incorrect password', { email });
        return NextResponse.json({ message: 'Invalid credentials' }, { status: 401 });
      }

      log.debug('Password matched successfully', { email });

      /* Email verification is now disabled by default
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
      */

      // Proceed with login
      const jwtSecret = process.env.JWT_SECRET;
      if (!jwtSecret) {
        log.error('JWT_SECRET environment variable is not set');
        return NextResponse.json({ message: 'Server authentication configuration error' }, { status: 500 });
      }

      // Check if the user has completed their profile
      const isProfileCompleted = (user as any).profileCompleted || false;
      
      const tokenPayload = {
        userId: user.id,
        email: email,
        role: user.role,
        profileCompleted: isProfileCompleted
      };

      try {
        const token = jwt.sign(tokenPayload, jwtSecret, { expiresIn: '168h' });
        log.info('User logged in successfully, JWT generated', { 
          userId: user.id, 
          email,
          profileCompleted: isProfileCompleted
        });

        return NextResponse.json({ token });
      } catch (error) {
        log.error('Error signing JWT', { error, email });
        return NextResponse.json({ message: 'Authentication error' }, { status: 500 });
      }
    } catch (dbError) {
      log.error('Database error during login', { error: dbError, email });
      return NextResponse.json({ message: 'Authentication service unavailable' }, { status: 503 });
    }
  } catch (error) {
    log.error('Unhandled error during login', { error });
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}
