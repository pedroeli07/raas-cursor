import { prisma } from '@/lib/db/db';
import { VerificationType } from '@prisma/client';
import * as crypto from 'crypto';
import { backendLog as log } from '@/lib/logs/logger';
import { EmailService } from '@/lib/email/emailService';
import * as fs from 'fs';
import * as path from 'path';
import { addMinutes } from 'date-fns';
import { z } from 'zod';

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

// Schema for verification code validation
export const verificationCodeSchema = z.object({
  code: z.string().min(6).max(6),
  email: z.string().email(),
  type: z.enum(['EMAIL_VERIFICATION', 'LOGIN'])
});

// Generate a random 6-digit code
export function generateVerificationCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Generate a unique token for password reset or email verification
export function generateToken(length = 32): string {
  return crypto.randomBytes(length).toString('hex');
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
    const verificationCode = await prisma.verificationCode.create({
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

// Create a verification code in the database
export async function createVerificationCode(
  userId: string, 
  type: VerificationType,
  expiresInMinutes = 15
): Promise<string> {
  // Generate a random 6-digit code
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  
  // Calculate expiration time
  const expiresAt = new Date();
  expiresAt.setMinutes(expiresAt.getMinutes() + expiresInMinutes);
  
  // Save to database
  await prisma.verificationCode.create({
    data: {
      userId,
      code,
      type,
      expiresAt
    }
  });
  
  log.info('Verification code created', { userId, type, expiresAt });
  return code;
}

// Validate a verification code
export async function validateVerificationCode(
  userId: string,
  code: string,
  type: VerificationType
): Promise<boolean> {
  try {
    // Find the most recent verification code for this user and type
    const verification = await prisma.verificationCode.findFirst({
      where: {
        userId,
        code,
        type,
        expiresAt: {
          gt: new Date() // Not expired
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
    
    if (!verification) {
      log.warn('Invalid or expired verification code', { userId, type });
      return false;
    }
    
    // Optionally invalidate the code after use
    await prisma.verificationCode.update({
      where: { id: verification.id },
      data: { used: true }
    });
    
    log.info('Verification code validated successfully', { userId, type });
    return true;
  } catch (error) {
    log.error('Error validating verification code', { userId, type, error });
    return false;
  }
}
