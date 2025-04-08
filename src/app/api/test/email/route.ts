// Path: src/app/api/test/email/route.ts
// This is only for testing email during development and should be removed in production

import { NextRequest, NextResponse } from 'next/server';
import { backendLog as log } from '@/lib/logs/logger';
import { EmailService } from '@/lib/email/emailService';
import { Role } from '@prisma/client';

// Only allow this endpoint in development
const isDev = process.env.NODE_ENV === 'development';

export async function GET(req: NextRequest) {
  // Block in production
  if (!isDev) {
    return NextResponse.json({ message: 'This endpoint is only available in development mode' }, { status: 403 });
  }

  const type = req.nextUrl.searchParams.get('type') || 'verification';
  // Use the email from the query or default to the verified email to avoid errors
  const email = req.nextUrl.searchParams.get('email') || process.env.DEV_EMAIL_RECIPIENT || 'pedro-eli@hotmail.com';
  const name = req.nextUrl.searchParams.get('name') || 'Test User';

  log.debug('Test email requested', { type, email, name });

  let result = false;

  try {
    switch (type) {
      case 'verification':
        result = await EmailService.sendEmailVerificationCode(email, name, '123456');
        break;
      case '2fa':
        result = await EmailService.sendTwoFactorCode(email, name, '123456');
        break;
      case 'invitation':
        result = await EmailService.sendInvitationEmail(email, name, Role.ADMIN, 'test-token-12345');
        break;
      case 'reset':
        result = await EmailService.sendPasswordResetEmail(email, name, `${process.env.NEXT_PUBLIC_BASE_URL}/reset-password?token=test-token-12345`);
        break;
      default:
        return NextResponse.json({ message: 'Invalid email type' }, { status: 400 });
    }

    if (result) {
      return NextResponse.json({ message: 'Test email sent successfully', type, email });
    } else {
      return NextResponse.json({ message: 'Failed to send test email' }, { status: 500 });
    }
  } catch (error) {
    log.error('Error sending test email', { error, type, email });
    return NextResponse.json({ message: 'Error sending test email', error }, { status: 500 });
  }
} 