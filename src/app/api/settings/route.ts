import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/db';
import log from '@/lib/logs/logger';
import { Role } from '@prisma/client';
import jwt from 'jsonwebtoken';
import pino from 'pino';
import { 
  getAllSettings, 
  getSetting, 
  updateSetting 
} from '@/lib/services/settingsService';

const loggerSettings = pino({
  name: 'settings-api',
  level: process.env.LOG_LEVEL || 'info',
});

// Interface para as configurações
interface AppSetting {
  id: string;
  key: string;
  value: string;
  type: string;
  category: string;
  description?: string;
}

// Extrair usuário do token JWT
function getUserFromRequest(req: NextRequest): { userId: string | null; userRole: Role | null } {
  const authHeader = req.headers.get('Authorization');
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { userId: null, userRole: null };
  }

  const token = authHeader.substring(7);
  const jwtSecret = process.env.JWT_SECRET;

  if (!jwtSecret) {
    log.error('JWT_SECRET environment variable is not set');
    return { userId: null, userRole: null };
  }

  try {
    const decoded = jwt.verify(token, jwtSecret) as { userId: string; role: Role };
    return { userId: decoded.userId, userRole: decoded.role };
  } catch (error) {
    log.error('Error verifying JWT token', { error });
    return { userId: null, userRole: null };
  }
}

// Verificar autenticação
function validateAuthentication(req: NextRequest) {
  const { userId, userRole } = getUserFromRequest(req);
  
  if (!userId || !userRole) {
    return { 
      isAuthenticated: false, 
      errorResponse: NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401 }
      )
    };
  }
  
  return { isAuthenticated: true, errorResponse: null };
}

// Valores padrão iniciais para quando o banco de dados está vazio
const DEFAULT_SETTINGS = [
  // Configurações do Sistema (SUPER_ADMIN)
  { 
    key: 'PRIMARY_ADMIN_EMAIL', 
    value: 'pedro-eli@hotmail.com',
    description: 'Email principal do administrador da plataforma',
    type: 'string',
    category: 'system'
  },
  { 
    key: 'PLATFORM_NAME', 
    value: 'RaaS Solar',
    description: 'Nome da plataforma',
    type: 'string',
    category: 'system'
  },
  { 
    key: 'API_BASE_URL', 
    value: '',
    description: 'URL base da API (para integrações externas)',
    type: 'string',
    category: 'system'
  },
  { 
    key: 'MAINTENANCE_MODE', 
    value: 'false',
    description: 'Sistema em modo de manutenção',
    type: 'boolean',
    category: 'system'
  },
  { 
    key: 'MAINTENANCE_MESSAGE', 
    value: 'Sistema em manutenção. Voltaremos em breve!',
    description: 'Mensagem exibida durante manutenção',
    type: 'string',
    category: 'system'
  },
  
  // Configurações de autenticação
  { 
    key: 'AUTH_TOKEN_EXPIRY_HOURS', 
    value: '24',
    description: 'Duração do token de autenticação em horas',
    type: 'number',
    category: 'auth'
  },
  
  // Configurações de Faturamento
  { 
    key: 'DEFAULT_DISCOUNT_RATE', 
    value: '15',
    description: 'Taxa de desconto padrão para clientes (%)',
    type: 'number',
    category: 'billing'
  },
  { 
    key: 'PLATFORM_FEE_PERCENTAGE', 
    value: '5',
    description: 'Taxa da plataforma (%)',
    type: 'number',
    category: 'billing'
  },
  { 
    key: 'MIN_PAYMENT_AMOUNT', 
    value: '5000',
    description: 'Valor mínimo para emissão de fatura (centavos)',
    type: 'number',
    category: 'billing'
  },
  { 
    key: 'BILLING_DATE', 
    value: '10',
    description: 'Dia do mês para geração de faturas',
    type: 'number',
    category: 'billing'
  },
  { 
    key: 'PAYMENT_TERM_DAYS', 
    value: '15',
    description: 'Prazo de pagamento em dias após emissão',
    type: 'number',
    category: 'billing'
  },
  { 
    key: 'EARLY_PAYMENT_DISCOUNT', 
    value: '2',
    description: 'Desconto para pagamento antecipado (%)',
    type: 'number',
    category: 'billing'
  },
  
  // Configurações de Créditos
  { 
    key: 'CREDIT_EXPIRATION_MONTHS', 
    value: '60',
    description: 'Meses até expiração de créditos (padrão 60 = 5 anos)',
    type: 'number',
    category: 'credits'
  },
  { 
    key: 'MIN_ALLOCATION_QUOTA', 
    value: '5',
    description: 'Cota mínima de alocação (%)',
    type: 'number',
    category: 'credits'
  },
  { 
    key: 'MAX_ALLOCATION_QUOTA', 
    value: '100',
    description: 'Cota máxima de alocação (%)',
    type: 'number',
    category: 'credits'
  },
  { 
    key: 'DEFAULT_GENERATION_QUOTA', 
    value: '20',
    description: 'Quota padrão para novas alocações (%)',
    type: 'number',
    category: 'credits'
  },
  
  // Configurações de Notificações
  { 
    key: 'NOTIFICATION_EMAIL', 
    value: 'notificacoes@raas-solar.com',
    description: 'Email para envio de notificações do sistema',
    type: 'string',
    category: 'notifications'
  },
  { 
    key: 'INVOICE_DUE_NOTIFICATION_DAYS', 
    value: '5',
    description: 'Dias de antecedência para aviso de vencimento',
    type: 'number',
    category: 'notifications'
  },
  { 
    key: 'CREDIT_EXPIRATION_NOTIFICATION_DAYS', 
    value: '30',
    description: 'Dias de antecedência para aviso de expiração de créditos',
    type: 'number',
    category: 'notifications'
  },
];

/**
 * GET /api/settings - Obter todas as configurações
 * GET /api/settings?key=KEY - Obter uma configuração específica
 */
export async function GET(req: NextRequest) {
  try {
    // Autenticar usuário
    const user = await authenticate(req);
    
    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }
    
    // Verificar se o usuário tem permissão (apenas admin e super_admin)
    if (!['super_admin', 'admin'].includes(user.role)) {
      return NextResponse.json({ error: 'Permissão negada' }, { status: 403 });
    }
    
    const url = new URL(req.url);
    const key = url.searchParams.get('key');
    
    if (key) {
      // Obter configuração específica
      const setting = await getSetting(key as any);
      
      if (!setting) {
        return NextResponse.json({ error: 'Configuração não encontrada' }, { status: 404 });
      }
      
      return NextResponse.json(setting);
    } else {
      // Obter todas as configurações
      const settings = await getAllSettings();
      return NextResponse.json(settings);
    }
  } catch (error) {
    loggerSettings.error({ error }, 'Erro ao processar requisição GET /api/settings');
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}

/**
 * PUT /api/settings - Atualizar uma configuração
 */
export async function PUT(req: NextRequest) {
  try {
    // Autenticar usuário
    const user = await authenticate(req);
    
    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }
    
    // Verificar se o usuário tem permissão (apenas admin e super_admin)
    if (!['super_admin', 'admin'].includes(user.role)) {
      return NextResponse.json({ error: 'Permissão negada' }, { status: 403 });
    }
    
    const body = await req.json();
    
    if (!body.key || body.value === undefined) {
      return NextResponse.json({ error: 'Parâmetros inválidos' }, { status: 400 });
    }
    
  const { key, value   } = body;
    
    // Validar configuração específica
    if (key === 'AUTH_TOKEN_EXPIRY_HOURS') {
      const hours = parseInt(value, 10);
      if (isNaN(hours) || hours < 1 || hours > 720) { // Máximo 30 dias
        return NextResponse.json({ 
          error: 'Valor inválido. O tempo de expiração deve ser entre 1 e 720 horas.' 
        }, { status: 400 });
      }
    }
    
    // Atualizar configuração
    const setting = await updateSetting(key, value.toString());
    
    if (setting === null || setting === undefined) {
      return NextResponse.json({ error: 'Erro ao atualizar configuração' }, { status: 500 });
    }
    
    loggerSettings.info({ key, value }, 'Configuração atualizada com sucesso');
    return NextResponse.json(setting);
  } catch (error) {
    loggerSettings.error({ error }, 'Erro ao processar requisição PUT /api/settings');
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}

// POST - Criar nova configuração (apenas SUPER_ADMIN)
export async function POST(req: NextRequest) {
  log.info('Received request to create app setting');
  
  // Verificar autenticação
  const authCheck = validateAuthentication(req);
  if (!authCheck.isAuthenticated) {
    return authCheck.errorResponse;
  }

  const { userId, userRole } = getUserFromRequest(req);
  
  // Verificar permissão
  if (userRole !== 'SUPER_ADMIN') {
    log.warn('Unauthorized attempt to create app setting', { userId, role: userRole });
    return NextResponse.json(
      { error: 'Apenas super administradores podem criar novas configurações' },
      { status: 403 }
    );
  }
  
  try {
    const data = await req.json();
    
    // Validar dados
    const { key, value, description, type, category } = data;
    
    if (!key || !value || !type || !category) {
      return NextResponse.json(
        { error: 'Campos obrigatórios: key, value, type, category' },
        { status: 400 }
      );
    }
    
    // Verificar se já existe
    let existing = null;
    try {
      
      existing = await prisma.appSettings.findUnique({
        where: { key },
      });
    } catch (dbError) {
      log.error('Error checking existing settings', { error: dbError });
      return NextResponse.json({ 
        error: 'Não foi possível verificar configurações existentes' 
      }, { status: 500 });
    }
    
    if (existing) {
      log.warn('Attempt to create duplicate app setting', { key });
      return NextResponse.json(
        { error: `Configuração com chave ${key} já existe` },
        { status: 409 }
      );
    }
    
    // Criar nova configuração
    let newSetting;
    try {
  
      newSetting = await prisma.appSettings.create({
        data: {
          key,
          value,
          description,
          type,
          category,
          createdById: userId,
          lastUpdatedById: userId,
        },
      });
    } catch (dbError) {
      log.error('Error creating app setting', { error: dbError });
      return NextResponse.json({ 
        error: 'Não foi possível criar a configuração' 
      }, { status: 500 });
    }
    
    log.info('Created new app setting', { 
      settingId: newSetting.id, 
      key: newSetting.key 
    });
    
    return NextResponse.json(newSetting, { status: 201 });
    
  } catch (error) {
    log.error('Error creating app setting', { error });
    return NextResponse.json(
      { error: 'Erro ao criar configuração' },
      { status: 500 }
    );
  }
} 