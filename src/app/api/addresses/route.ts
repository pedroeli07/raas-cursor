import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/db';
import log from '@/lib/logs/logger';
import { AddressType } from '@prisma/client';
import { createAddressSchema } from '@/lib/schemas/schemas';
import { validateRequestBody, validateAuthentication, createErrorResponse } from '@/lib/validators/validators';

export async function GET(req: NextRequest) {
  log.info('Received request to list addresses');

  const authCheck = validateAuthentication(req);
  if (!authCheck.isAuthenticated) {
    return authCheck.errorResponse;
  }

  try {
    const addresses = await prisma.address.findMany({
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
    const address = await prisma.address.create({
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
