// Nome do cookie de autenticação
export const AUTH_COOKIE_NAME = 'auth_token';

// Duração dos tokens (em segundos)
export const TOKEN_EXPIRY = {
  // 7 dias
  auth: 7 * 24 * 60 * 60, // 7 days in seconds
  // 1 hora
  passwordReset: 60 * 60,
  // 15 minutos
  verification: 60 * 15,
};

// Tipos de notificações
export const NOTIFICATION_TYPES = {
  SYSTEM: 'SYSTEM',
  HELP: 'HELP',
};

// Status de notificações
export const NOTIFICATION_STATUS = {
  UNREAD: 'UNREAD',
  READ: 'READ',
  ARCHIVED: 'ARCHIVED',
}; 

export const SESSION_MAX_AGE_SECONDS = 7 * 24 * 60 * 60; // 7 days in seconds
export const PASSWORD_RESET_EXPIRY_SECONDS = 60 * 60; // 1 hour in seconds
export const VERIFICATION_EXPIRY_SECONDS = 60 * 15; // 15 minutes in seconds
