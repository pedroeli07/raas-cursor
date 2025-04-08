import { Role } from '@prisma/client';

// Definições de permissões para configurações
export const PERMISSION_LEVELS = {
  // Configurações que somente SUPER_ADMIN podem modificar
  SUPER_ADMIN_ONLY: [
    'PRIMARY_ADMIN_EMAIL', 
    'PLATFORM_NAME', 
    'PLATFORM_FEE_PERCENTAGE',
    'API_BASE_URL',
    'DEFAULT_SUPER_ADMIN_EMAIL',
    'MAX_UPLOAD_SIZE_MB',
    'ENABLE_ADVANCED_SECURITY'
  ],
  
  // Configurações que SUPER_ADMIN e ADMIN podem modificar
  ADMIN_LEVEL: [
    'DEFAULT_DISCOUNT_RATE',
    'BILLING_DATE',
    'PAYMENT_TERM_DAYS',
    'EARLY_PAYMENT_DISCOUNT',
    'MIN_PAYMENT_AMOUNT',
    'CREDIT_EXPIRATION_MONTHS',
    'MIN_ALLOCATION_QUOTA',
    'MAX_ALLOCATION_QUOTA',
    'DEFAULT_GENERATION_QUOTA',
    'NOTIFICATION_EMAIL',
    'INVOICE_DUE_NOTIFICATION_DAYS',
    'CREDIT_EXPIRATION_NOTIFICATION_DAYS',
    'SMTP_HOST',
    'SMTP_PORT',
    'SUPPORT_EMAIL'
  ],
  
  // Configurações que todos os usuários administrativos podem modificar
  ADMIN_STAFF_LEVEL: [
    'MAINTENANCE_MODE',
    'MAINTENANCE_MESSAGE',
    'HELP_DESK_MESSAGE',
    'WELCOME_MESSAGE',
    'TERMS_AND_CONDITIONS_VERSION'
  ]
};

// Obter o nível de permissão para uma configuração específica
export function getPermissionLevel(key: string): 'SUPER_ADMIN_ONLY' | 'ADMIN_LEVEL' | 'ADMIN_STAFF_LEVEL' | 'ANY' {
  if (PERMISSION_LEVELS.SUPER_ADMIN_ONLY.includes(key)) {
    return 'SUPER_ADMIN_ONLY';
  }
  if (PERMISSION_LEVELS.ADMIN_LEVEL.includes(key)) {
    return 'ADMIN_LEVEL';
  }
  if (PERMISSION_LEVELS.ADMIN_STAFF_LEVEL.includes(key)) {
    return 'ADMIN_STAFF_LEVEL';
  }
  return 'ANY'; // Padrão para outras configurações
}

// Verificar se o usuário tem permissão para acessar/modificar uma configuração
export function hasPermission(userRole: Role, permLevel: 'SUPER_ADMIN_ONLY' | 'ADMIN_LEVEL' | 'ADMIN_STAFF_LEVEL' | 'ANY'): boolean {
  switch(permLevel) {
    case 'SUPER_ADMIN_ONLY':
      return userRole === 'SUPER_ADMIN';
    case 'ADMIN_LEVEL':
      return userRole === 'SUPER_ADMIN' || userRole === 'ADMIN';
    case 'ADMIN_STAFF_LEVEL':
      return userRole === 'SUPER_ADMIN' || userRole === 'ADMIN' || userRole === 'ADMIN_STAFF';
    case 'ANY':
      return true;
    default:
      return false;
  }
} 