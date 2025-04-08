import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/db';
import log from '@/lib/logs/logger';
import { createDistributorSchema } from '@/lib/schemas/schemas';
import { getUserFromRequest, isAdminOrSuperAdmin } from '@/lib/utils/utils';
import { validateRequestBody, validateAuthentication, createErrorResponse } from '@/lib/validators/validators';

interface DistributorCreateInput {
  name: string;
  kwhPrices: {
    create: {
      price: number;
      startDate: Date;
    }[];
  };
  code: string;
  state: string;
  address: {
    create: {
      street: string;
      city: string;
      state: string;
      number: number;
      neighborhood: string;
      zip: string;
    };
  };
}

// GET - List all distributors
export async function GET(_request: NextRequest) {
  try {
    // Obter todas as distribuidoras ordenadas por nome
    const distributors = await db.distributor.findMany({
      select: {
        id: true,
        name: true,
        kwhPrices: true,
        createdAt: true,
      },
      orderBy: {
        name: 'asc',
      },
    });

    log.info('Distribuidores listados com sucesso', { count: distributors.length });
    
    return NextResponse.json({
      success: true,
      distributors,
    });
  } catch (error) {
    log.error('Erro ao listar distribuidores', { error });
    
    return NextResponse.json(
      {
        success: false,
        message: 'Erro ao listar distribuidores',
      },
      { status: 500 }
    );
  }
}

// POST - Create a new distributor
export async function POST(req: NextRequest) {
  log.info('Received request to create distributor');

  // Check authentication and authorization
  const authCheck = validateAuthentication(req);
  if (!authCheck.isAuthenticated) {
    return authCheck.errorResponse;
  }

  const { userRole } = getUserFromRequest(req);
  if (!isAdminOrSuperAdmin(userRole)) {
    log.warn('Unauthorized attempt to create distributor', { userRole });
    return createErrorResponse('Forbidden: Admin privileges required', 403);
  }

  // Validate request body
  const validation = await validateRequestBody(
    req,
    createDistributorSchema,
    'Distributor creation validation'
  );

  if (!validation.success) {
    return validation.error;
  }

  const { name, price_per_kwh } = validation.data;

  try {
    // Check if distributor with the same name already exists
    const existingDistributor = await db.distributor.findUnique({
      where: { name },
    });

    if (existingDistributor) {
      log.warn('Distributor creation failed: Name already exists', { name });
      return createErrorResponse('Distributor with this name already exists', 409);
    }

    // Create distributor
    const createData: unknown = {
      name,
      kwhPrices: {
        create: {
          price: price_per_kwh,
          startDate: new Date(),
        },
      },
      // Adicionando campos obrigatórios com valores padrão
      code: name.substring(0, 3).toUpperCase(),
      state: 'ACTIVE',
      address: {},
    };
    const distributor = await db.distributor.create({
      data: {
        name,
        kwhPrices: {
          create: {
            price: price_per_kwh,
            startDate: new Date(),
          },
        },
        code: name.substring(0, 3).toUpperCase(),
        state: 'ACTIVE',
        address: {
          create: {
            street: '',
            city: '',
            state: '',
            number: '',
            neighborhood: '',
            zip: ''
          }
        }
      },
    });

    log.info('Distributor created successfully', { distributorId: distributor.id, name });

    return NextResponse.json({ 
        message: 'Distributor created successfully',
        distributor
     }, { status: 201 });
  } catch (error) {
    log.error('Error creating distributor', { error, name });
    // Handle potential database constraint errors if needed
    return createErrorResponse('Internal Server Error', 500);
  }
} 