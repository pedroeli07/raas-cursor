// path: src/lib/email/emailUtils.ts
import { Resend } from 'resend';

// Type definitions
export interface ResendResponse {
  id?: string;
  [key: string]: unknown;
}

export interface EmailTemplate {
  subject: string;
  getContent: (...args: unknown[]) => string;
}

// Environment configuration
export class EnvironmentConfig {
  static get isDev(): boolean {
    // Remove the forced false return and use the actual environment variable
    return process.env.NODE_ENV === 'development';
  }

  static get isTest(): boolean {
    // Remove the forced false return and use the actual environment variable
    return process.env.NODE_ENV === 'test';
  }

  static get resendApiKey(): string {
    return process.env.RESEND_API_KEY || 're_Uyc7aGLB_795G4WeBC5TdMwDRSbZBYfyq';
  }

  static get supportEmail(): string {
    return process.env.SUPPORT_EMAIL || 'pedro-eli@hotmail.com';
  }

  static get devEmailRecipient(): string {
    return process.env.DEV_EMAIL_RECIPIENT || 'pedro-eli@hotmail.com';
  }

  static get defaultFromEmail(): string {
    return process.env.DEFAULT_FROM_EMAIL || 'onboarding@resend.dev';
  }

  static get baseUrl(): string {
    return process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
  }

  static shouldUseSafeRecipient(): boolean {
    // Enable safe recipient in development and test environments
    return this.isDev || this.isTest;
  }
}

// Email client initialization
export const resend = new Resend(EnvironmentConfig.resendApiKey);

// Email utilities
export class EmailAddressHelper {
  static getSafeRecipient(originalEmail: string): string {
    return EnvironmentConfig.shouldUseSafeRecipient() 
      ? EnvironmentConfig.devEmailRecipient 
      : originalEmail;
  }
}

// Email templates
export class EmailTemplates {
  static readonly invite = {
    subject: 'Convite para RaaS Solar',
    getContent: (name: string, role: string, invitationLink: string, originalEmail: string, message?: string): string => `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Convite para RaaS Solar</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
          .container { max-width: 600px; margin: 0 auto; padding: 0; }
          .header { background-color: #0ea5e9; color: white; padding: 20px; text-align: center; }
          .header h1 { margin: 0; font-size: 24px; }
          .content { padding: 20px; background-color: #f9fafb; }
          .button-container { text-align: center; margin: 25px 0; }
          .button { display: inline-block; background-color: #0ea5e9; color: white; text-decoration: none; padding: 12px 24px; border-radius: 4px; font-weight: bold; }
          .link-box { background-color: #f3f4f6; padding: 12px; border-radius: 4px; word-break: break-all; margin: 15px 0; }
          .footer { font-size: 12px; color: #6b7280; padding: 20px; border-top: 1px solid #e5e7eb; text-align: center; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>RaaS Solar - Energia Limpa e Inteligente</h1>
          </div>
          <div class="content">
            ${message ? 
              `<div>${message}</div>` : 
              `<p>Olá <strong>${name || 'Usuário'}</strong>,</p>
              <p>Você foi convidado para se juntar à plataforma RaaS Solar como <strong>${role}</strong>.</p>
              <p>Utilize o botão abaixo para completar seu registro. Este convite expira em 24 horas:</p>`
            }
            
            <div class="button-container">
              <a href="${invitationLink}" class="button">Aceitar Convite</a>
            </div>
            
            <p>Se o botão acima não funcionar, copie e cole o link abaixo no seu navegador:</p>
            <div class="link-box">${invitationLink}</div>
            
            <p>Se você não estava esperando este convite, por favor ignore este email.</p>
          </div>
          <div class="footer">
            <p>Este email foi enviado para ${originalEmail}</p>
            <p>&copy; ${new Date().getFullYear()} RaaS Solar - Todos os direitos reservados</p>
          </div>
        </div>
      </body>
      </html>
    `
  };

  static readonly registrationAcknowledgement = {
    subject: 'Solicitação de Registro RaaS Solar',
    getContent: (name: string): string => `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Solicitação de Registro RaaS Solar</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
          .container { max-width: 600px; margin: 0 auto; padding: 0; }
          .header { background-color: #0ea5e9; color: white; padding: 20px; text-align: center; }
          .header h1 { margin: 0; font-size: 24px; }
          .content { padding: 20px; background-color: #f9fafb; }
          .footer { font-size: 12px; color: #6b7280; padding: 20px; border-top: 1px solid #e5e7eb; text-align: center; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>RaaS Solar - Energia Limpa e Inteligente</h1>
          </div>
          <div class="content">
            <p>Olá <strong>${name || 'Usuário'}</strong>,</p>
            <p>Recebemos sua solicitação para se juntar à plataforma RaaS Solar.</p>
            <p>Nossa equipe irá analisar sua solicitação e entraremos em contato em breve.</p>
            <p>Agradecemos seu interesse!</p>
            <p>Atenciosamente,</p>
            <p><strong>Equipe RaaS Solar</strong></p>
          </div>
          <div class="footer">
            <p>&copy; ${new Date().getFullYear()} RaaS Solar - Todos os direitos reservados</p>
          </div>
        </div>
      </body>
      </html>
    `
  };

  static readonly supportRegistrationNotification = {
    subject: 'Nova Tentativa de Registro sem Convite',
    getContent: (email: string, name: string): string => `
      <p>Uma nova tentativa de registro sem convite foi detectada:</p>
      <p><strong>Email:</strong> ${email}</p>
      <p><strong>Nome:</strong> ${name || 'Não informado'}</p>
    `
  };

  static readonly helpRequest = {
    subject: (title: string): string => `Nova Solicitação de Ajuda: ${title}`,
    getContent: (email: string, title: string, message: string): string => `
      <p>Uma nova solicitação de ajuda foi enviada:</p>
      <p><strong>De:</strong> ${email}</p>
      <p><strong>Título:</strong> ${title}</p>
      <p><strong>Mensagem:</strong></p>
      <p>${message}</p>
    `
  };

  static readonly passwordReset = {
    subject: 'Redefinição de Senha - RaaS Solar',
    getContent: (name: string, resetLink: string): string => `
      <p>Olá ${name || 'Usuário'},</p>
      <p>Recebemos uma solicitação para redefinir sua senha.</p>
      <p>Clique no link abaixo para criar uma nova senha. Este link expira em 1 hora:</p>
      <p><a href="${resetLink}">Redefinir Senha</a></p>
    `
  };

  static readonly emailVerification = {
    subject: 'Verificação de Email - RaaS Solar',
    getContent: (name: string, code: string, email: string): string => `  
      <p>Olá ${name || 'Usuário'},</p>
      <p>Bem-vindo à plataforma RaaS Solar! Para confirmar seu endereço de email, utilize o código abaixo:</p>
      <p style="font-size: 24px; font-weight: bold; text-align: center; padding: 12px; background-color: #f3f4f6; margin: 16px 0; letter-spacing: 3px;">${code}</p>
      <p>Este código expirará em 30 minutos.</p>
      <p>Se você não criou uma conta na RaaS Solar, por favor ignore este email.</p>
      <p>Atenciosamente,</p>
      <p>Equipe RaaS Solar</p>
      <p>--</p>
      <p><small>Email original: ${email}</small></p>
    `
  };

  static readonly twoFactorCode = {
    subject: 'Código de Autenticação - RaaS Solar',
    getContent: (name: string, code: string, email: string): string => `  
      <p>Olá ${name || 'Usuário'},</p>
      <p>Para continuar seu login na plataforma RaaS Solar, utilize o código de verificação abaixo:</p>
      <p style="font-size: 24px; font-weight: bold; text-align: center; padding: 12px; background-color: #f3f4f6; margin: 16px 0; letter-spacing: 3px;">${code}</p>
    `
  };
}

// URL Helpers
export class UrlBuilder {
  static buildInvitationLink(token: string): string {
    return `${EnvironmentConfig.baseUrl}/register?token=${token}`;
  }
}