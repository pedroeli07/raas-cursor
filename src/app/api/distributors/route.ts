import { NextRequest, NextResponse } from 'next/server';
import { db, prisma } from '@/lib/db/db';
import log from '@/lib/logs/logger';
import { createDistributorSchema } from '../../../lib/schemas/schemas';
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

// GET - Fetch all distributors
export async function GET(req: NextRequest) {
  log.info('Received request to fetch all distributors');
  console.log('[API] Fetching all distributors');

  const authCheck = validateAuthentication(req);
  if (!authCheck.isAuthenticated) {
    log.warn('Authentication failed for distributors list request');
    console.log('[API] Authentication failed for distributors list request');
    return authCheck.errorResponse;
  }

  try {
    const distributors = await prisma.distributor.findMany({
      include: {
        address: true,
        kwhPrices: {
          orderBy: { startDate: 'desc' },
          take: 1
        }
      },
      orderBy: {
        name: 'asc'
      }
    });

    // For each distributor, calculate the current price from the most recent kwhPrice
    const distributorsWithPrices = distributors.map(distributor => {
      let pricePerKwh = 0;
      if (distributor.kwhPrices && distributor.kwhPrices.length > 0) {
        // Convert from integer (stored as centavos) to decimal
        pricePerKwh = distributor.kwhPrices[0].price / 1000;
      }

      return {
        ...distributor,
        pricePerKwh
      };
    });

    log.info('[API] Distributors fetched successfully', { count: distributors.length });
    console.log('[API] Distributors fetched successfully', { count: distributors.length });

    // Log the final structure being sent
    log.debug('[API GET /distributors] Sending response', { distributors: distributorsWithPrices });
    console.log('[API GET /distributors] Sending response structure', { distributors: distributorsWithPrices });
    
    // Return the distributors wrapped in an object with a 'distributors' key
    return NextResponse.json({ distributors: distributorsWithPrices });
  } catch (error) {
    log.error('Error fetching distributors', { error });
    console.error('[API] Error fetching distributors', { 
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    return createErrorResponse('Internal Server Error', 500);
  }
}

// POST - Create a new distributor
export async function POST(req: NextRequest) {
  log.info('Received request to create a new distributor');
  console.log('[API] Creating a new distributor');

  const authCheck = validateAuthentication(req);
  if (!authCheck.isAuthenticated) {
    log.warn('Authentication failed for distributor creation request');
    console.log('[API] Authentication failed for distributor creation request');
    return authCheck.errorResponse;
  }

  const { userRole } = getUserFromRequest(req);
  if (userRole !== 'ADMIN' && userRole !== 'SUPER_ADMIN') {
    log.warn('Unauthorized attempt to create distributor', { userRole });
    console.log('[API] Unauthorized attempt to create distributor', { userRole });
    return createErrorResponse('Forbidden: Admin privileges required', 403);
  }

  try {
    const requestData = await req.json();
    console.log('[API] Distributor creation request data', requestData);

    // Validate required fields
    if (!requestData.name) {
      log.warn('Distributor creation failed: Missing name');
      console.log('[API] Distributor creation failed: Missing name');
      return createErrorResponse('Distributor name is required', 400);
    }

    // Create address if provided
    let addressId = null;
    if (requestData.address) {
      const addressData = requestData.address;
      const newAddress = await prisma.address.create({
        data: {
          street: addressData.street || '',
          number: addressData.number || '',
          complement: addressData.complement || '',
          neighborhood: addressData.neighborhood || '',
          city: addressData.city || '',
          state: addressData.state || '',
          zip: addressData.zip || addressData.zipCode || '',
        }
      });
      addressId = newAddress.id;
      log.info('Created address for new distributor', { addressId });
      console.log('[API] Created address for new distributor', { addressId });
    }

    // Handle price information
    const pricePerKwh = requestData.price_per_kwh || requestData.pricePerKwh || 0;

    // Prepare data for distributor creation
    const distributorData = {
      name: requestData.name,
      code: requestData.code || '',
      addressId: addressId,
      state: requestData.address?.state || ''
    };

    // Log the data being sent to Prisma
    log.debug('[API POST /distributors] Data for prisma.distributor.create', { distributorData });
    console.log('[API POST /distributors] Data for prisma.distributor.create', distributorData);

    // Create distributor
    const newDistributor = await prisma.distributor.create({
      data: distributorData
    });

    // Create price record if price was provided
    if (pricePerKwh > 0) {
      await prisma.kwhPrice.create({
        data: {
          distributorId: newDistributor.id,
          price: Math.round(pricePerKwh * 1000), // Convert to integer (price in centavos)
          startDate: new Date()
        }
      });
      log.info('Created price record for new distributor', { 
        distributorId: newDistributor.id, 
        pricePerKwh 
      });
      console.log('[API] Created price record for new distributor', { 
        distributorId: newDistributor.id, 
        pricePerKwh 
      });
    }

    // Get the complete distributor with address and price
    const createdDistributor = await prisma.distributor.findUnique({
      where: { id: newDistributor.id },
      include: {
        address: true,
        kwhPrices: {
          orderBy: { startDate: 'desc' },
          take: 1
        }
      }
    });

    // Add the pricePerKwh to the response
    const response = {
      ...createdDistributor,
      pricePerKwh
    };

    log.info('Distributor created successfully', { 
      distributorId: newDistributor.id, 
      name: newDistributor.name 
    });
    console.log('[API] Distributor created successfully', { 
      distributorId: newDistributor.id, 
      name: newDistributor.name 
    });

    return NextResponse.json(response, { status: 201 });
  } catch (error) {
    log.error('Error creating distributor', { error });
    console.error('[API] Error creating distributor', { 
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    return createErrorResponse('Internal Server Error', 500);
  }
} 