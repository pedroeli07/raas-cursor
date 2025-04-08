import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/db';
import log from '@/lib/logs/logger';
import { toggleTwoFactorSchema } from '@/lib/schemas/schemas';

export async function PUT(req: NextRequest) {
  log.info('Received two-factor settings update request');
  
  // Get user ID from auth headers set by middleware
  const userId = req.headers.get('x-user-id');
  
  if (!userId) {
    log.warn('Two-factor settings update failed: Unauthorized');
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }
  
  try {
    const body = await req.json();
    const validation = toggleTwoFactorSchema.safeParse(body);

    if (!validation.success) {
      log.warn('Two-factor settings validation failed', { errors: validation.error.errors });
      return NextResponse.json({ errors: validation.error.errors }, { status: 400 });
    }

    const { enabled } = validation.data;
    log.debug('Validated two-factor settings data', { userId, enabled });

    // Find user
    const user = await db.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      log.warn('Two-factor settings update failed: User not found', { userId });
      return NextResponse.json({ message: 'Usuário não encontrado' }, { status: 404 });
    }

    // Ensure email is verified before allowing disabling 2FA
    if (!user.emailVerified && !enabled) {
      log.warn('Cannot disable 2FA for unverified user', { userId });
      return NextResponse.json({ 
        message: 'Você precisa verificar seu email antes de desativar a autenticação de dois fatores',
      }, { status: 400 });
    }

    // Update 2FA settings
    await db.user.update({
      where: { id: userId },
      data: { isTwoFactorEnabled: enabled },
    });

    log.info('Two-factor settings updated successfully', { userId, enabled });
    return NextResponse.json({ 
      message: enabled 
        ? 'Autenticação de dois fatores ativada com sucesso' 
        : 'Autenticação de dois fatores desativada com sucesso',
      enabled
    });

  } catch (error) {
    log.error('Error updating two-factor settings', { error, userId });
    return NextResponse.json({ message: 'Erro interno do servidor' }, { status: 500 });
  }
} 