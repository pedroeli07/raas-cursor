import { Resend } from 'resend';
import { backendLog as log } from '../logs/logger';
import { Role } from '@prisma/client';

const isDev = process.env.NODE_ENV === 'development';

// Create a Resend client instance
const resend = new Resend(process.env.RESEND_API_KEY || 're_Uyc7aGLB_795G4WeBC5TdMwDRSbZBYfyq');

// Support email address
const SUPPORT_EMAIL = process.env.SUPPORT_EMAIL || 'pedro-eli@hotmail.com';
// In development, we can override the recipient to direct all emails to the developer
// This must be the verified email in Resend's free tier
const DEV_EMAIL_RECIPIENT = process.env.DEV_EMAIL_RECIPIENT || 'pedro-eli@hotmail.com';
const DEFAULT_FROM_EMAIL = process.env.DEFAULT_FROM_EMAIL || 'onboarding@resend.dev'; // Use your verified domain

/**
 * Helper function to process email addresses for Resend
 * With a test account, all emails MUST be sent to the verified email address
 */
function getSafeRecipient(originalEmail: string): string {
  // In test mode or development, we must use the verified email
  // Resend's free tier only allows sending to verified emails
  return isDev || process.env.NODE_ENV === 'test' ? DEV_EMAIL_RECIPIENT : originalEmail;
}

// Type definition for Resend response with 'id' property
interface ResendResponse {
  id?: string;
  [key: string]: unknown;
}

/**
 * Email service to handle all email-related operations
 */
export class EmailService {
  /**
   * Send an invitation email
   */
  static async sendInvitationEmail(email: string, name: string | null, role: Role, token: string): Promise<boolean> {
    try {
      const invitationLink = `${process.env.NEXT_PUBLIC_BASE_URL}/register?token=${token}`;
      
      // In development, direct emails to developer
      const recipient = getSafeRecipient(email);
      
      log.debug('Preparing to send invitation email', { 
        from: DEFAULT_FROM_EMAIL,
        to: recipient,
        originalEmail: email,
        token,
        invitationLink
      });

      const response = await resend.emails.send({
        from: DEFAULT_FROM_EMAIL,
        to: recipient,
        subject: 'Convite para RaaS Solar',
        html: `
          <p>Olá ${name || 'Usuário'},</p>
          <p>Você foi convidado para se juntar à plataforma RaaS Solar como ${role}.</p>
          <p>Clique no link abaixo para completar seu registro. Este link expira em 24 horas:</p>
          <p><a href="${invitationLink}">Aceitar Convite</a></p>
          <p>Se você não estava esperando este convite, por favor ignore este email.</p>
          <p>--</p>
          <p><small>Email original: ${email}</small></p>
        `,
      }) as unknown as ResendResponse;
      
      log.info('Invitation email sent successfully', { 
        email,
        recipient,
        messageId: response?.id || 'unknown',
        data: isDev ? response : undefined
      });
      return true;
    } catch (error) {
      log.error('Failed to send invitation email', { email, error });
      return false;
    }
  }

  /**
   * Send email to user who tried to register without invitation
   */
  static async sendRegistrationRequestAcknowledgement(email: string, name?: string): Promise<boolean> {
    try {
      // In development, direct emails to developer
      const recipient = getSafeRecipient(email);
      
      log.debug('Preparing to send registration acknowledgement', { 
        from: DEFAULT_FROM_EMAIL,
        to: recipient,
        originalEmail: email
      });

      const response = await resend.emails.send({
        from: DEFAULT_FROM_EMAIL,
        to: recipient,
        subject: 'Solicitação de Registro RaaS Solar',
        html: `
          <p>Olá ${name || 'Usuário'},</p>
          <p>Recebemos sua solicitação para se juntar à plataforma RaaS Solar.</p>
          <p>Nossa equipe irá analisar sua solicitação e entraremos em contato em breve.</p>
          <p>Agradecemos seu interesse!</p>
          <p>Atenciosamente,</p>
          <p>Equipe RaaS Solar</p>
          <p>--</p>
          <p><small>Email original: ${email}</small></p>
        `,
      }) as unknown as ResendResponse;
      
      log.info('Registration request acknowledgement email sent', { 
        email,
        recipient,
        messageId: response?.id || 'unknown',
        data: isDev ? response : undefined
      });
      return true;
    } catch (error) {
      log.error('Failed to send registration request acknowledgement', { email, error });
      return false;
    }
  }

  /**
   * Notify RaaS support about a registration attempt without invitation
   */
  static async notifySupportAboutRegistrationAttempt(email: string, name?: string): Promise<boolean> {
    try {
      // In development, direct emails to developer
      const recipient = getSafeRecipient(SUPPORT_EMAIL);
      
      log.debug('Preparing to send registration attempt notification', { 
        from: DEFAULT_FROM_EMAIL,
        to: recipient,
        originalEmail: email
      });

      const response = await resend.emails.send({
        from: DEFAULT_FROM_EMAIL,
        to: recipient,
        subject: 'Nova Tentativa de Registro sem Convite',
        html: `
          <p>Uma nova tentativa de registro sem convite foi detectada:</p>
          <p><strong>Email:</strong> ${email}</p>
          <p><strong>Nome:</strong> ${name || 'Não informado'}</p>
          <p>Esta pessoa pode estar interessada em se tornar cliente da plataforma RaaS Solar.</p>
        `,
      }) as unknown as ResendResponse;
      
      log.info('Support notified about registration attempt', { 
        email,
        recipient,
        messageId: response?.id || 'unknown',
        data: isDev ? response : undefined
      });
      return true;
    } catch (error) {
      log.error('Failed to notify support about registration attempt', { email, error });
      return false;
    }
  }

  /**
   * Send notification about new help request
   */
  static async sendHelpRequestNotification(email: string, title: string, message: string): Promise<boolean> {
    try {
      // In development, direct emails to developer
      const recipient = getSafeRecipient(SUPPORT_EMAIL);
      
      log.debug('Preparing to send help request notification', { 
        from: DEFAULT_FROM_EMAIL,
        to: recipient,
        originalEmail: email,
        title
      });

      const response = await resend.emails.send({
        from: DEFAULT_FROM_EMAIL,
        to: recipient,
        subject: `Nova Solicitação de Ajuda: ${title}`,
        html: `
          <p>Uma nova solicitação de ajuda foi enviada:</p>
          <p><strong>De:</strong> ${email}</p>
          <p><strong>Título:</strong> ${title}</p>
          <p><strong>Mensagem:</strong></p>
          <p>${message}</p>
        `,
      }) as unknown as ResendResponse;
      
      log.info('Help request notification email sent', { 
        email,
        recipient,
        title,
        messageId: response?.id || 'unknown',
        data: isDev ? response : undefined
      });
      return true;
    } catch (error) {
      log.error('Failed to send help request notification', { email, title, error });
      return false;
    }
  }

  /**
   * Send password reset email
   */
  static async sendPasswordResetEmail(email: string, name: string, resetLink: string): Promise<boolean> {
    try {
      // In development, direct emails to developer
      const recipient = getSafeRecipient(email);
      
      log.debug('Preparing to send password reset email', { 
        from: DEFAULT_FROM_EMAIL,
        to: recipient,
        originalEmail: email,
        resetLink
      });

      const response = await resend.emails.send({
        from: DEFAULT_FROM_EMAIL,
        to: recipient,
        subject: 'Redefinição de Senha - RaaS Solar',
        html: `
          <p>Olá ${name || 'Usuário'},</p>
          <p>Recebemos uma solicitação para redefinir sua senha.</p>
          <p>Clique no link abaixo para criar uma nova senha. Este link expira em 1 hora:</p>
          <p><a href="${resetLink}">Redefinir Senha</a></p>
          <p>Se você não solicitou esta redefinição, por favor ignore este email.</p>
          <p>Atenciosamente,</p>
          <p>Equipe RaaS Solar</p>
          <p>--</p>
          <p><small>Email original: ${email}</small></p>
        `,
      }) as unknown as ResendResponse;
      
      log.info('Password reset email sent', { 
        email,
        recipient,
        messageId: response?.id || 'unknown',
        data: isDev ? response : undefined
      });
      return true;
    } catch (error) {
      log.error('Failed to send password reset email', { email, error });
      return false;
    }
  }

  /**
   * Send email verification code
   */
  static async sendEmailVerificationCode(email: string, name: string, code: string): Promise<boolean> {
    try {
      // In development, direct emails to developer
      const recipient = getSafeRecipient(email);
      
      log.debug('Preparing to send email verification code', { 
        from: DEFAULT_FROM_EMAIL,
        to: recipient,
        originalEmail: email,
        code
      });

      const response = await resend.emails.send({
        from: DEFAULT_FROM_EMAIL,
        to: recipient,
        subject: 'Verificação de Email - RaaS Solar',
        html: `
          <p>Olá ${name || 'Usuário'},</p>
          <p>Bem-vindo à plataforma RaaS Solar! Para confirmar seu endereço de email, utilize o código abaixo:</p>
          <p style="font-size: 24px; font-weight: bold; text-align: center; padding: 12px; background-color: #f3f4f6; margin: 16px 0; letter-spacing: 3px;">${code}</p>
          <p>Este código expirará em 30 minutos.</p>
          <p>Se você não criou uma conta na RaaS Solar, por favor ignore este email.</p>
          <p>Atenciosamente,</p>
          <p>Equipe RaaS Solar</p>
          <p>--</p>
          <p><small>Email original: ${email}</small></p>
        `,
      }) as unknown as ResendResponse;
      
      log.info('Email verification code sent', { 
        email,
        recipient,
        code: isDev ? code : '***',
        messageId: response?.id || 'unknown',
        data: isDev ? response : undefined
      });
      return true;
    } catch (error) {
      log.error('Failed to send email verification code', { email, error });
      return false;
    }
  }

  /**
   * Send two-factor authentication code
   */
  static async sendTwoFactorCode(email: string, name: string, code: string): Promise<boolean> {
    try {
      // In development, direct emails to developer
      const recipient = getSafeRecipient(email);
      
      log.debug('Preparing to send two-factor authentication code', { 
        from: DEFAULT_FROM_EMAIL,
        to: recipient,
        originalEmail: email,
        code
      });

      const response = await resend.emails.send({
        from: DEFAULT_FROM_EMAIL,
        to: recipient,
        subject: 'Código de Autenticação - RaaS Solar',
        html: `
          <p>Olá ${name || 'Usuário'},</p>
          <p>Para continuar seu login na plataforma RaaS Solar, utilize o código de verificação abaixo:</p>
          <p style="font-size: 24px; font-weight: bold; text-align: center; padding: 12px; background-color: #f3f4f6; margin: 16px 0; letter-spacing: 3px;">${code}</p>
          <p>Este código expirará em 10 minutos.</p>
          <p>Se você não tentou fazer login na RaaS Solar, alguém pode estar tentando acessar sua conta. Recomendamos que você altere sua senha imediatamente.</p>
          <p>Atenciosamente,</p>
          <p>Equipe RaaS Solar</p>
          <p>--</p>
          <p><small>Email original: ${email}</small></p>
        `,
      }) as unknown as ResendResponse;
      
      log.info('Two-factor authentication code sent', { 
        email,
        recipient,
        code: isDev ? code : '***',
        messageId: response?.id || 'unknown',
        data: isDev ? response : undefined
      });
      return true;
    } catch (error) {
      log.error('Failed to send two-factor code', { email, error });
      return false;
    }
  }
} 