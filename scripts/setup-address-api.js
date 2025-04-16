// Script para criar API de endereços
import fs from 'fs/promises';
import path from 'path';

async function createAddressAPI() {
  console.log('🚀 Criando API de endereços');
  
  // Criar diretório se não existir
  const apiDir = '../src/app/api/addresses';
  try {
    await fs.mkdir(apiDir, { recursive: true });
    console.log(`✅ Diretório ${apiDir} criado ou já existe`);
  } catch (error) {
    console.error(`❌ Erro ao criar diretório: ${error.message}`);
    return;
  }
  
  // Criar schema para endereços
  const schemaCode = `
// Adicionar ao arquivo schemas.ts
export const createAddressSchema = z.object({
  street: z.string().min(1, { message: 'Street is required' }),
  number: z.string().min(1, { message: 'Number is required' }),
  complement: z.string().optional(),
  neighborhood: z.string().min(1, { message: 'Neighborhood is required' }),
  city: z.string().min(1, { message: 'City is required' }),
  state: z.string().min(2, { message: 'State is required' }),
  zip: z.string().min(1, { message: 'ZIP code is required' }),
  type: z.enum(['USER', 'INSTALLATION', 'DISTRIBUTOR']).optional(),
});
  `;
  
  console.log('ℹ️ Schema para endereços:');
  console.log(schemaCode);
  
  // Criar arquivo route.ts para /api/addresses
  const routeCode = `import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/db';
import log from '@/lib/logs/logger';
import { AddressType } from '@prisma/client';
import { createAddressSchema } from '@/lib/schemas/schemas';
import { getUserFromRequest } from '@/lib/utils/utils';
import { validateRequestBody, validateAuthentication, createErrorResponse } from '@/lib/validators/validators';

export async function GET(req: NextRequest) {
  log.info('Received request to list addresses');

  const authCheck = validateAuthentication(req);
  if (!authCheck.isAuthenticated) {
    return authCheck.errorResponse;
  }

  try {
    const addresses = await db.address.findMany({
      orderBy: { createdAt: 'desc' },
    });

    log.info('Addresses fetched successfully', { count: addresses.length });
    return NextResponse.json({ addresses });
  } catch (error) {
    log.error('Error fetching addresses', { error });
    return createErrorResponse('Internal Server Error', 500);
  }
}

export async function POST(req: NextRequest) {
  log.info('Received request to create address');

  const authCheck = validateAuthentication(req);
  if (!authCheck.isAuthenticated) {
    return authCheck.errorResponse;
  }

  // Validate request body
  const validation = await validateRequestBody(
    req,
    createAddressSchema,
    'Address creation validation'
  );

  if (!validation.success) {
    return validation.error;
  }

  const { street, number, complement, neighborhood, city, state, zip, type } = validation.data;

  try {
    // Create address
    const address = await db.address.create({
      data: {
        street,
        number,
        complement,
        neighborhood,
        city,
        state,
        zip,
        type: type as AddressType || AddressType.USER,
      },
    });

    log.info('Address created successfully', { addressId: address.id });

    return NextResponse.json({ 
        message: 'Address created successfully',
        address
     }, { status: 201 });
  } catch (error) {
    log.error('Error creating address', { error });
    return createErrorResponse('Internal Server Error', 500);
  }
}
`;

  try {
    const routePath = path.join(apiDir, 'route.ts');
    await fs.writeFile(routePath, routeCode);
    console.log(`✅ Arquivo ${routePath} criado com sucesso`);
    
    // Instrução adicional
    console.log('\n🔹 Não esqueça de adicionar o schema ao arquivo src/lib/schemas/schemas.ts');
    console.log(schemaCode);
  } catch (error) {
    console.error(`❌ Erro ao criar arquivo: ${error.message}`);
  }
}

// Executar setup
createAddressAPI().catch(console.error); 