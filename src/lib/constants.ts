// Nome do cookie de autenticação
export const AUTH_COOKIE_NAME = 'auth_token';

// Duração dos tokens (em segundos)
export const TOKEN_EXPIRY = {
  // 7 dias
  AUTH: 60 * 60 * 24 * 7,
  // 1 hora
  PASSWORD_RESET: 60 * 60,
  // 15 minutos
  VERIFICATION: 60 * 15,
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