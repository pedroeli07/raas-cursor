// Path: src/app/api/auth/verify-email/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/db';
import log from '@/lib/logs/logger';
import { VerificationType } from '@prisma/client';
import { validateVerificationCode } from '@/lib/utils/verification';
import { verifyEmailSchema } from '../../../../lib/schemas/schemas';
import jwt from 'jsonwebtoken';

export async function POST(req: NextRequest) {
  log.info('Received email verification request');
  try {
    const body = await req.json();
    const validation = verifyEmailSchema.safeParse(body);

    if (!validation.success) {
      log.warn('Email verification validation failed', { errors: validation.error.errors });
      return NextResponse.json({ errors: validation.error.errors }, { status: 400 });
    }

    const { userId, code } = validation.data;
    log.debug('Validated email verification data', { userId });

    // Find user
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      log.warn('Email verification failed: User not found', { userId });
      return NextResponse.json({ message: 'Usuário não encontrado' }, { status: 404 });
    }

    if (user.emailVerified) {
      log.info('Email already verified for user', { userId });
      
      // Gerar token JWT para login automático mesmo que já esteja verificado
      const token = generateAuthToken(user);
      
      return NextResponse.json({ 
        message: 'Email já verificado anteriormente',
        verified: true,
        token // Retornar o token para login automático
      });
    }

    // Validate the verification code
    const isValid = await validateVerificationCode(userId, code, VerificationType.EMAIL_VERIFICATION);

    if (!isValid) {
      log.warn('Email verification failed: Invalid code', { userId });
      return NextResponse.json({ 
        message: 'Código de verificação inválido ou expirado',
        verified: false 
      }, { status: 400 });
    }

    // Atualizar status de verificação
    await prisma.user.update({
      where: { id: userId },
      data: { emailVerified: true }
    });

    // Gerar token JWT para login automático
    const token = generateAuthToken(user);

    log.info('Email verified successfully, user can now login automatically', { userId, email: user.email });
    return NextResponse.json({ 
      message: 'Email verificado com sucesso. Você será redirecionado automaticamente.',
      verified: true,
      token // Retornar o token para login automático
    });

  } catch (error) {
    log.error('Error during email verification', { error });
    return NextResponse.json({ message: 'Erro interno do servidor' }, { status: 500 });
  }
}

// Função auxiliar para gerar token JWT
function generateAuthToken(user: any) {
  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) {
    log.error('JWT_SECRET environment variable is not set');
    throw new Error('JWT secret is not configured.');
  }

  // Check if the user has completed their profile
  const isProfileCompleted = (user as any).profileCompleted || false;

  const tokenPayload = {
    userId: user.id,
    email: user.email,
    role: user.role,
    profileCompleted: isProfileCompleted
  };

  return jwt.sign(tokenPayload, jwtSecret, { expiresIn: '24h' });
} 