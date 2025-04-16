import { Role } from '@prisma/client';

// Definições de permissões para configurações
export const PERMISSION_LEVELS = {
  // Configurações que somente SUPER_ADMIN podem modificar
  superAdminOnly: [
    'PRIMARY_ADMIN_EMAIL', 
    'PLATFORM_NAME', 
    'PLATFORM_FEE_PERCENTAGE',
    'API_BASE_URL',
    'DEFAULT_SUPER_ADMIN_EMAIL',
    'MAX_UPLOAD_SIZE_MB',
    'ENABLE_ADVANCED_SECURITY'
  ],
  
  // Configurações que SUPER_ADMIN e ADMIN podem modificar
  adminLevel: [
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
  adminStaffLevel: [
    'MAINTENANCE_MODE',
    'MAINTENANCE_MESSAGE',
    'HELP_DESK_MESSAGE',
    'WELCOME_MESSAGE',
    'TERMS_AND_CONDITIONS_VERSION'
  ]
};

// Obter o nível de permissão para uma configuração específica
export function getPermissionLevel(key: string): 'superAdminOnly' | 'adminLevel' | 'adminStaffLevel' | 'ANY' {
  if (PERMISSION_LEVELS.superAdminOnly.includes(key)) {
    return 'superAdminOnly';
  }
  if (PERMISSION_LEVELS.adminLevel.includes(key)) {
    return 'adminLevel';
  }
  if (PERMISSION_LEVELS.adminStaffLevel.includes(key)) {
    return 'adminStaffLevel';
  }
  return 'ANY'; // Padrão para outras configurações
}

// Verificar se o usuário tem permissão para acessar/modificar uma configuração
export function hasPermission(userRole: Role, permLevel: 'superAdminOnly' | 'adminLevel' | 'adminStaffLevel' | 'ANY'): boolean {
  switch(permLevel) {
    case 'superAdminOnly':
      return userRole === 'SUPER_ADMIN';
    case 'adminLevel':
      return userRole === 'SUPER_ADMIN' || userRole === 'ADMIN';
    case 'adminStaffLevel':
      return userRole === 'SUPER_ADMIN' || userRole === 'ADMIN' || userRole === 'ADMIN_STAFF';
    case 'ANY':
      return true;
    default:
      return false;
  }
} 