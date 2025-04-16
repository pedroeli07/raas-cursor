import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { prisma } from '@/lib/db/db';
import log from '@/lib/logs/logger';
import { VerificationType } from '@prisma/client';
import { validateVerificationCode } from '@/lib/utils/verification';
import { twoFactorSchema } from '../../../../lib/schemas/schemas';

export async function POST(req: NextRequest) {
  log.info('Received two-factor verification request');
  try {
    const body = await req.json();
    const validation = twoFactorSchema.safeParse(body);

    if (!validation.success) {
      log.warn('Two-factor validation failed', { errors: validation.error.errors });
      return NextResponse.json({ errors: validation.error.errors }, { status: 400 });
    }

    const { userId, code } = validation.data;
    log.debug('Validated two-factor data', { userId });

    // Find user
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { contact: true }
    });

    if (!user || !user.contact) {
      log.warn('Two-factor verification failed: User not found', { userId });
      return NextResponse.json({ message: 'Usuário não encontrado' }, { status: 404 });
    }

    // Validate the 2FA code
    const isValid = await validateVerificationCode(userId, code, VerificationType.LOGIN);

    if (!isValid) {
      log.warn('Two-factor verification failed: Invalid code', { userId });
      return NextResponse.json({ 
        message: 'Código de verificação inválido ou expirado',
        verified: false 
      }, { status: 400 });
    }

    // Generate JWT token after successful 2FA
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      log.error('JWT_SECRET environment variable is not set');
      throw new Error('JWT secret is not configured.');
    }

    // Check if the user has completed their profile
    const isProfileCompleted = (user as any).profileCompleted || false;

    const tokenPayload = {
      userId: user.id,
      email: user.contact.emails[0],
      role: user.role,
      profileCompleted: isProfileCompleted
    };

    const token = jwt.sign(tokenPayload, jwtSecret, { expiresIn: '24h' });
    log.info('Two-factor verification successful, JWT generated', { 
      userId, 
      email: user.contact.emails[0],
      profileCompleted: isProfileCompleted
    });

    return NextResponse.json({ 
      message: 'Autenticação bem-sucedida',
      verified: true,
      token
    });

  } catch (error) {
    log.error('Error during two-factor verification', { error });
    return NextResponse.json({ message: 'Erro interno do servidor' }, { status: 500 });
  }
} 