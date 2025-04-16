import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/db';
import log from '@/lib/logs/logger';

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const token = url.searchParams.get('token');

  log.info('Received token validation request');

  if (!token) {
    log.warn('Token validation failed: No token provided');
    return NextResponse.json({ message: 'Token não fornecido' }, { status: 400 });
  }

  try {
    // Find token in database
    const resetToken = await prisma.passwordReset.findFirst({
      where: {
        token,
        expiresAt: { gt: new Date() }, // Token not expired
        usedAt: null, // Token not used
      },
    });

    if (!resetToken) {
      log.warn('Token validation failed: Invalid or expired token', { token: token.substring(0, 10) + '...' });
      return NextResponse.json({ message: 'Token inválido ou expirado' }, { status: 400 });
    }

    log.info('Token validation successful', { userId: resetToken.userId });
    return NextResponse.json({ valid: true });

  } catch (error) {
    log.error('Error during token validation', { error, token: token.substring(0, 10) + '...' });
    return NextResponse.json({ message: 'Erro interno do servidor' }, { status: 500 });
  }
} 