// Path: src/app/api/auth/resend-verification/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/db';
import { backendLog as log } from '@/lib/logs/logger';
import { z } from 'zod';
import { VerificationType } from '@prisma/client';
import { createAndSendVerificationCode } from '@/lib/utils/verification';

// Schema for resending verification code
const resendVerificationSchema = z.object({
  userId: z.string().min(1, { message: 'ID do usuário é obrigatório' }),
  type: z.enum([VerificationType.EMAIL_VERIFICATION, VerificationType.LOGIN], { 
    errorMap: () => ({ message: 'Tipo de verificação inválido' }) 
  }),
});

export async function POST(req: NextRequest) {
  log.info('Received request to resend verification code');
  try {
    const body = await req.json();
    const validation = resendVerificationSchema.safeParse(body);

    if (!validation.success) {
      log.warn('Resend verification validation failed', { errors: validation.error.errors });
      return NextResponse.json({ errors: validation.error.errors }, { status: 400 });
    }

    const { userId, type } = validation.data;
    log.debug('Validated resend verification data', { userId, type });

    // Find user
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { contact: true }
    });

    if (!user || !user.contact) {
      log.warn('Resend verification failed: User not found', { userId });
      return NextResponse.json({ message: 'Usuário não encontrado' }, { status: 404 });
    }

    // Check existing codes to prevent abuse (throttling)
    const recentCodes = await prisma.verificationCode.findMany({
      where: {
        userId,
        type,
        createdAt: { gt: new Date(Date.now() - 5 * 60 * 1000) }, // Codes sent in the last 5 minutes
      },
      orderBy: { createdAt: 'desc' },
    });

    if (recentCodes.length >= 3) {
      log.warn('Too many verification code requests', { userId, type, recentCodesCount: recentCodes.length });
      return NextResponse.json({ 
        message: 'Muitos códigos solicitados recentemente. Por favor, aguarde alguns minutos antes de tentar novamente.' 
      }, { status: 429 });
    }

    // Send a new verification code
    const isCodeSent = await createAndSendVerificationCode(
      userId,
      user.contact.emails[0],
      user.name || '',
      type
    );

    if (!isCodeSent) {
      log.error('Failed to send verification code', { userId, type });
      return NextResponse.json({ 
        message: 'Não foi possível enviar o código de verificação. Por favor, tente novamente mais tarde.' 
      }, { status: 500 });
    }

    log.info('Verification code resent successfully', { 
      userId, 
      email: user.contact.emails[0],
      type 
    });

    return NextResponse.json({ 
      message: 'Código de verificação enviado com sucesso.' 
    });

  } catch (error) {
    log.error('Error during verification code resend', { error });
    return NextResponse.json({ message: 'Erro interno do servidor' }, { status: 500 });
  }
} 