import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/db';
import log from '@/lib/logs/logger';
import { Role } from '@prisma/client';
import jwt from 'jsonwebtoken';
import { getPermissionLevel, hasPermission, PERMISSION_LEVELS } from './permissions';

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

// GET - Listar configurações (filtrar por categoria)
export async function GET(req: NextRequest) {
  log.info('Received request to fetch app settings');
  
  // Verificar autenticação
  const authCheck = validateAuthentication(req);
  if (!authCheck.isAuthenticated) {
    return authCheck.errorResponse;
  }

  const { userId, userRole } = getUserFromRequest(req);
  
  try {
    const url = new URL(req.url);
    const category = url.searchParams.get('category');
    
    // Buscar configurações no banco de dados
    const whereClause = category ? { category } : {};
    
    // Verificar se a tabela existe no schema do Prisma
    // Nota: Pode ser necessário adicionar o modelo AppSettings ao schema.prisma
    let settings = [];
    
    try {
    
      settings = await db.appSettings.findMany({
        where: whereClause,
        orderBy: [
          { category: 'asc' },
          { key: 'asc' }
        ],
      });
    } catch (dbError) {
      log.error('Error accessing appSettings model', { error: dbError });
      return NextResponse.json({ 
        error: 'O modelo AppSettings não está configurado no schema do Prisma' 
      }, { status: 500 });
    }
    
    // Se não existem configurações, inicializar com valores padrão
    if (settings.length === 0 && !category) {
      log.info('Initializing default settings');
      try {
      
        await db.appSettings.createMany({
          data: DEFAULT_SETTINGS,
        });
        
        // Buscar novamente após criar
      
        settings = await db.appSettings.findMany({
          orderBy: [
            { category: 'asc' },
            { key: 'asc' }
          ],
        });
      } catch (dbError) {
        log.error('Error creating default settings', { error: dbError });
        return NextResponse.json({ 
          error: 'Não foi possível criar configurações padrão' 
        }, { status: 500 });
      }
    }
    // Filtrar configurações baseado na permissão do usuário
    const filteredSettings = settings.filter((setting) => {
      const permLevel = getPermissionLevel(setting.key);
      return hasPermission(userRole as Role, permLevel);
    });
    log.info('Retrieved app settings successfully', { 
      settingsCount: filteredSettings.length, 
      category 
    });
    
    return NextResponse.json({ settings: filteredSettings });
    
  } catch (error) {
    log.error('Error fetching app settings', { error });
    return NextResponse.json(
      { error: 'Erro ao buscar configurações' },
      { status: 500 }
    );
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
      
      existing = await db.appSettings.findUnique({
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
  
      newSetting = await db.appSettings.create({
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