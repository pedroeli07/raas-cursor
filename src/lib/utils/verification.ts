import { db } from '@/lib/db/db';
import { VerificationType } from '@prisma/client';
import crypto from 'crypto';
import { backendLog as log } from '@/lib/logs/logger';
import { EmailService } from '@/lib/email/emailService';
import * as fs from 'fs';
import * as path from 'path';

const isDev = process.env.NODE_ENV === 'development';

// Armazenar os códigos para desenvolvimento
const VERIFICATION_CODES: Record<string, {code: string, type: string, email: string}> = {};

// Função para salvar códigos em arquivo para fácil acesso durante testes
function saveVerificationCodes() {
  if (isDev) {
    try {
      const codesDirectory = path.join(process.cwd(), 'temp');
      if (!fs.existsSync(codesDirectory)) {
        fs.mkdirSync(codesDirectory, { recursive: true });
      }
      const filePath = path.join(codesDirectory, 'verification_codes.json');
      fs.writeFileSync(filePath, JSON.stringify(VERIFICATION_CODES, null, 2), 'utf8');
      
      log.info('Verification codes saved to file for testing', { 
        path: filePath,
        codesCount: Object.keys(VERIFICATION_CODES).length
      });
    } catch (error) {
      log.error('Failed to save verification codes to file', { error });
    }
  }
}

/**
 * Generates a random numeric code with specified length
 */
export function generateVerificationCode(length: number = 6): string {
  try {
    // Generate a more secure random code using crypto
    const buffer = crypto.randomBytes(length);
    let code = '';
    
    // Convert to numeric code
    for (let i = 0; i < buffer.length; i++) {
      // Use modulo 10 to get a digit (0-9)
      code += (buffer[i] % 10).toString();
    }
    
    return code;
  } catch (error) {
    // Fallback to Math.random if crypto fails
    log.warn('Failed to use crypto for verification code, falling back to Math.random');
    return Array.from(
      { length }, 
      () => Math.floor(Math.random() * 10).toString()
    ).join('');
  }
}

/**
 * Creates and sends a verification code
 */
export async function createAndSendVerificationCode(
  userId: string,
  email: string,
  name: string,
  type: VerificationType
): Promise<boolean> {
  try {
    // Generate a random code - always use random codes, even in development
    const code = generateVerificationCode();
    
    // Set expiry time based on verification type
    const expiresInMinutes = type === VerificationType.EMAIL_VERIFICATION ? 30 : 10;
    const expiresAt = new Date(Date.now() + expiresInMinutes * 60 * 1000);
    
    log.debug('Generated verification code', { 
      userId, 
      type, 
      code: isDev ? code : '[MASKED]',
      expiresAt
    });
    
    // Store the code in the database
    const verificationCode = await db.verificationCode.create({
      data: {
        code,
        userId,
        type,
        expiresAt
      }
    });
    
    // Salvar em memória e arquivo para testes em desenvolvimento
    if (isDev) {
      VERIFICATION_CODES[userId] = {
        code,
        type: type.toString(),
        email
      };
      log.info('⚠️ DEVELOPMENT MODE: Verification code for testing', { 
        userId, email, type, code
      });
      
      // Salvar em arquivo
      saveVerificationCodes();
    }
    
    log.debug('Verification code created', { 
      userId, 
      type, 
      verificationId: verificationCode.id,
      code: isDev ? code : '[MASKED]'
    });
    
    // Send the verification code via email
    let emailSent = false;
    if (type === VerificationType.EMAIL_VERIFICATION) {
      emailSent = await EmailService.sendEmailVerificationCode(email, name, code);
    } else {
      emailSent = await EmailService.sendTwoFactorCode(email, name, code);
    }
    
    if (!emailSent) {
      log.error('Failed to send verification email', { userId, type });
      return false;
    }
    
    return true;
  } catch (error) {
    log.error('Error creating verification code', { userId, type, error });
    return false;
  }
}

// DESENVOLVIMENTO: obtém o código de verificação mais recente para um usuário
export function getTestVerificationCode(userId: string): string | null {
  if (!isDev) return null;
  
  const codeData = VERIFICATION_CODES[userId];
  if (codeData) {
    return codeData.code;
  }
  return null;
}

// Rota para testes em desenvolvimento
export function getAllTestVerificationCodes(): Record<string, {code: string, type: string, email: string}> | null {
  if (!isDev) return null;
  return VERIFICATION_CODES;
}

/**
 * Validates a verification code
 */
export async function validateVerificationCode(
  userId: string,
  code: string,
  type: VerificationType
): Promise<boolean> {
  try {
    log.debug('Validating verification code', { 
      userId, 
      code: isDev ? code : '[MASKED]', 
      type 
    });
    
    // Find the most recent valid code for the user
    const verificationCode = await db.verificationCode.findFirst({
      where: {
        userId,
        code,
        type,
        expiresAt: { gt: new Date() },
        usedAt: null,
      },
      orderBy: { createdAt: 'desc' }
    });
    
    if (!verificationCode) {
      log.warn('Invalid or expired verification code', { 
        userId, 
        type,
        enteredCode: isDev ? code : '[MASKED]'
      });
      return false;
    }
    
    // Mark the code as used
    await db.verificationCode.update({
      where: { id: verificationCode.id },
      data: { usedAt: new Date() }
    });
    
    log.debug('Verification code marked as used', { 
      userId, 
      verificationId: verificationCode.id,
      type 
    });
    
    // If this is an email verification code, mark the user's email as verified
    if (type === VerificationType.EMAIL_VERIFICATION) {
      await db.user.update({
        where: { id: userId },
        data: { emailVerified: true }
      });
      log.info('User email verified', { userId });
    }
    
    log.info('Verification code validated successfully', { userId, type });
    return true;
  } catch (error) {
    log.error('Error validating verification code', { userId, type, error });
    return false;
  }
}
