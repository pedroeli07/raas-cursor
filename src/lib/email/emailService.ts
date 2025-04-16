// path: src/lib/email/emailService.ts
import { Resend } from 'resend';
import { log } from '../logs/logger';
import { Role } from '@prisma/client';
import { 
  EnvironmentConfig,
  resend, 
  EmailAddressHelper,
  EmailTemplates,
  ResendResponse,
  UrlBuilder
} from './emailUtils';

const resendInstance = new Resend(EnvironmentConfig.resendApiKey);

/**
 * Email service to handle all email-related operations
 */
export class EmailService {
  /**
   * Core method to send an email with proper error handling and logging
   */
  private static async sendEmail(
    params: {
      to: string, 
      originalEmail: string,
      subject: string,
      html: string,
      logContext: Record<string, unknown>
    }
  ): Promise<boolean> {
    const { to, originalEmail, subject, html, logContext } = params;
    
    try {
      // Get safe recipient (developer email in dev/test mode)
      const recipient = EmailAddressHelper.getSafeRecipient(to);
      
      log.debug('Preparing to send email', { 
        from: EnvironmentConfig.defaultFromEmail,
        to: recipient,
        originalEmail,
        subject,
        apiKey: EnvironmentConfig.resendApiKey ? 'Set (masked)' : 'Not set',
        ...logContext
      });

      // In development mode, log the email content but don't actually send it
      if (EnvironmentConfig.isDev) {
        log.info('DEV MODE: Email would be sent', {
          to: recipient,
          from: EnvironmentConfig.defaultFromEmail,
          subject,
          // Include a preview of the HTML content
          htmlPreview: html.substring(0, 200) + (html.length > 200 ? '...' : ''),
          ...logContext
        });
        return true;
      }

      const response = await resendInstance.emails.send({
        from: EnvironmentConfig.defaultFromEmail,
        to: recipient,
        subject,
        html,
      }) as unknown as ResendResponse;
      
      log.info('Email sent successfully', { 
        to: originalEmail,
        recipient,
        subject,
        messageId: response?.id || 'unknown',
        data: EnvironmentConfig.isDev ? response : undefined,
        ...logContext
      });
      
      return true;
    } catch (error) {
      log.error('Failed to send email', { 
        to: originalEmail, 
        subject,
        error,
        apiKey: EnvironmentConfig.resendApiKey ? 'Set (masked, length: ' + EnvironmentConfig.resendApiKey.length + ')' : 'Not set',
        isDev: EnvironmentConfig.isDev,
        defaultFromEmail: EnvironmentConfig.defaultFromEmail,
        ...logContext
      });
      
      // In development, we'll consider it a success to prevent blocking the workflow
      if (EnvironmentConfig.isDev) {
        log.info('DEV MODE: Treating email error as success to continue workflow', {
          to: originalEmail,
          ...logContext
        });
        return true;
      }
      
      return false;
    }
  }

  /**
   * Send an invitation email
   */
  static async sendInvitationEmail(
    email: string, 
    name: string | null, 
    role: Role, 
    token: string,
    message?: string
  ): Promise<boolean> {
    const invitationLink = UrlBuilder.buildInvitationLink(token);
    const template = EmailTemplates.invite;
    
    return this.sendEmail({
      to: email,
      originalEmail: email,
      subject: template.subject,
      html: template.getContent(name || 'Usuário', role, invitationLink, email, message),
      logContext: { 
        operation: 'sendInvitationEmail',
        token, 
        invitationLink, 
        hasCustomMessage: !!message 
      }
    });
  }

  /**
   * Send email to user who tried to register without invitation
   */
  static async sendRegistrationRequestAcknowledgement(
    email: string, 
    name?: string
  ): Promise<boolean> {
    const template = EmailTemplates.registrationAcknowledgement;
    
    return this.sendEmail({
      to: email,
      originalEmail: email,
      subject: template.subject,
      html: template.getContent(name || 'Usuário'),
      logContext: { operation: 'sendRegistrationRequestAcknowledgement' }
    });
  }

  /**
   * Notify RaaS support about a registration attempt without invitation
   */
  static async notifySupportAboutRegistrationAttempt(
    email: string, 
    name?: string
  ): Promise<boolean> {
    const template = EmailTemplates.supportRegistrationNotification;
    
    return this.sendEmail({
      to: EnvironmentConfig.supportEmail,
      originalEmail: email,
      subject: template.subject,
      html: template.getContent(email, name || 'Não informado'),
      logContext: { operation: 'notifySupportAboutRegistrationAttempt' }
    });
  }

  /**
   * Send notification about new help request
   */
  static async sendHelpRequestNotification(
    email: string, 
    title: string, 
    message: string
  ): Promise<boolean> {
    const template = EmailTemplates.helpRequest;
    
    return this.sendEmail({
      to: EnvironmentConfig.supportEmail,
      originalEmail: email,
      subject: template.subject(title),
      html: template.getContent(email, title, message),
      logContext: { 
        operation: 'sendHelpRequestNotification',
        title 
      }
    });
  }

  /**
   * Send password reset email
   */
  static async sendPasswordResetEmail(
    email: string, 
    name: string, 
    resetLink: string
  ): Promise<boolean> {
    const template = EmailTemplates.passwordReset;
    
    return this.sendEmail({
      to: email,
      originalEmail: email,
      subject: template.subject,
      html: template.getContent(name || 'Usuário', resetLink),
      logContext: { 
        operation: 'sendPasswordResetEmail',
        resetLink 
      }
    });
  }

  /**
   * Send email verification code
   */
  static async sendEmailVerificationCode(
    email: string, 
    name: string, 
    code: string
  ): Promise<boolean> {
    const template = EmailTemplates.emailVerification;
    
    return this.sendEmail({
      to: email,
      originalEmail: email,
      subject: template.subject,
      html: template.getContent(name || 'Usuário', code, email),
      logContext: { 
        operation: 'sendEmailVerificationCode',
        code: EnvironmentConfig.isDev ? code : '***'
      }
    });
  }

  /**
   * Send two-factor authentication code
   */
  static async sendTwoFactorCode(
    email: string, 
    name: string, 
    code: string
  ): Promise<boolean> {
    const template = EmailTemplates.twoFactorCode;
    
    return this.sendEmail({
      to: email,
      originalEmail: email,
      subject: template.subject,
      html: template.getContent(name || 'Usuário', code, email),
      logContext: { 
        operation: 'sendTwoFactorCode',
        code: EnvironmentConfig.isDev ? code : '***'
      }
    });
  }

  /**
   * Send a test email for diagnostic purposes
   */
  static async sendTestEmail(
    email: string, 
    subject: string,
    message: string
  ): Promise<boolean> {
    return this.sendEmail({
      to: email,
      originalEmail: email,
      subject: `[TEST] ${subject}`,
      html: `
        <h1>Test Email</h1>
        <p>This is a test email sent from RaaS Solar application.</p>
        <pre>${message}</pre>
        <p>Time: ${new Date().toISOString()}</p>
      `,
      logContext: { operation: 'sendTestEmail' }
    });
  }
}