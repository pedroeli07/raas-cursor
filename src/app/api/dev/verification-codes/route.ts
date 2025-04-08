// ATENÇÃO: Esta rota só funciona em ambiente de desenvolvimento
// Path: src/app/api/dev/verification-codes/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { getAllTestVerificationCodes, getTestVerificationCode } from '@/lib/utils/verification';
import { backendLog as log } from '@/lib/logs/logger';

export async function GET(req: NextRequest) {
  // Verificar se estamos em ambiente de desenvolvimento
  if (process.env.NODE_ENV !== 'development') {
    log.warn('Attempted to access development-only verification codes API in production');
    return NextResponse.json({ error: 'This endpoint is only available in development mode' }, { status: 403 });
  }

  // Verificar se queremos um código específico ou todos
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get('userId');

  if (userId) {
    const code = getTestVerificationCode(userId);
    if (!code) {
      return NextResponse.json({ error: 'No verification code found for this user' }, { status: 404 });
    }
    return NextResponse.json({ userId, code });
  }

  // Retornar todos os códigos
  const allCodes = getAllTestVerificationCodes();
  return NextResponse.json(allCodes);
} 