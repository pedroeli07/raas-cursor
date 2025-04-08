import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcrypt';
import { db } from '@/lib/db/db';
import log from '@/lib/logs/logger';
import { z } from 'zod';

// Schema for reset password request
const resetPasswordSchema = z.object({
  token: z.string().min(1, { message: 'Token is required' }),
  password: z.string().min(8, { message: 'Password must be at least 8 characters' }),
});

export async function POST(req: NextRequest) {
  log.info('Received password reset request');
  try {
    const body = await req.json();
    const validation = resetPasswordSchema.safeParse(body);

    if (!validation.success) {
      log.warn('Password reset validation failed', { errors: validation.error.errors });
      return NextResponse.json({ errors: validation.error.errors }, { status: 400 });
    }

    const { token, password } = validation.data;
    log.debug('Validated password reset data');

    // Find token in database
    const resetToken = await db.passwordReset.findFirst({
      where: {
        token,
        expiresAt: { gt: new Date() }, // Token not expired
        usedAt: null, // Token not used yet
      },
      include: {
        user: true, // Include user to get ID for updating password
      },
    });

    if (!resetToken) {
      log.warn('Password reset failed: Invalid or expired token', { token: token.substring(0, 10) + '...' });
      return NextResponse.json({ message: 'Token inválido ou expirado' }, { status: 400 });
    }

    // Hash the new password
    const hashedPassword = await bcrypt.hash(password, 10);
    log.debug('Password hashed successfully');

    // Update user's password
    await db.user.update({
      where: { id: resetToken.userId },
      data: { password: hashedPassword },
    });

    // Mark the token as used
    await db.passwordReset.update({
      where: { id: resetToken.id },
      data: { usedAt: new Date() },
    });

    log.info('Password reset successful', { userId: resetToken.userId });

    return NextResponse.json({ message: 'Senha redefinida com sucesso' });

  } catch (error) {
    log.error('Error during password reset', { error });
    return NextResponse.json({ message: 'Erro interno do servidor' }, { status: 500 });
  }
} 