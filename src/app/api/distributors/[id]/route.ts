import { NextRequest, NextResponse } from 'next/server';
import { db, prisma } from '@/lib/db/db';
import log from '@/lib/logs/logger';
import { getUserFromRequest } from '@/lib/utils/utils';
import { validateAuthentication, createErrorResponse } from '@/lib/validators/validators';

// GET - Fetch a specific distributor by ID
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const { id } = params;
  log.info('Received request to fetch distributor', { distributorId: id });
  console.log('[API] Fetching distributor', { distributorId: id });

  const authCheck = validateAuthentication(req);
  if (!authCheck.isAuthenticated) {
    log.warn('Authentication failed for distributor fetch request', { distributorId: id });
    console.log('[API] Authentication failed for distributor fetch request', { distributorId: id });
    return authCheck.errorResponse;
  }

  try {
    const distributor = await prisma.distributor.findUnique({
      where: { id },
      include: {
        address: true,
        kwhPrices: {
          orderBy: { startDate: 'desc' }
        }
      }
    });

    if (!distributor) {
      log.warn('Distributor not found', { distributorId: id });
      console.log('[API] Distributor not found', { distributorId: id });
      return createErrorResponse(`Distributor with ID ${id} not found`, 404);
    }

    // Calculate current price from the most recent kwhPrice
    let pricePerKwh = 0;
    if (distributor.kwhPrices && distributor.kwhPrices.length > 0) {
      // Convert from integer (stored as centavos) to decimal
      pricePerKwh = distributor.kwhPrices[0].price / 1000;
    }

    // Add the pricePerKwh to the response
    const response = {
      ...distributor,
      pricePerKwh
    };

    log.info('Distributor fetched successfully', { distributorId: id });
    console.log('[API] Distributor fetched successfully', { distributorId: id });

    return NextResponse.json(response);
  } catch (error) {
    log.error('Error fetching distributor', { distributorId: id, error });
    console.error('[API] Error fetching distributor', { 
      distributorId: id,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    return createErrorResponse('Internal Server Error', 500);
  }
}

// PUT - Update a distributor by ID
export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const { id } = params;
  log.info('Received request to update distributor', { distributorId: id });
  console.log('[API] Updating distributor', { distributorId: id });

  const authCheck = validateAuthentication(req);
  if (!authCheck.isAuthenticated) {
    log.warn('Authentication failed for distributor update request', { distributorId: id });
    console.log('[API] Authentication failed for distributor update request', { distributorId: id });
    return authCheck.errorResponse;
  }

  const { userRole } = getUserFromRequest(req);
  if (userRole !== 'ADMIN' && userRole !== 'SUPER_ADMIN') {
    log.warn('Unauthorized attempt to update distributor', { userRole, distributorId: id });
    console.log('[API] Unauthorized attempt to update distributor', { userRole, distributorId: id });
    return createErrorResponse('Forbidden: Admin privileges required', 403);
  }

  try {
    // Check if distributor exists
    const existingDistributor = await prisma.distributor.findUnique({
      where: { id },
      include: { address: true }
    });

    if (!existingDistributor) {
      log.warn('Distributor not found for update', { distributorId: id });
      console.log('[API] Distributor not found for update', { distributorId: id });
      return createErrorResponse(`Distributor with ID ${id} not found`, 404);
    }

    const requestData = await req.json();
    console.log('[API] Distributor update request data', requestData);

    // Update distributor data
    const updatedDistributor = await prisma.distributor.update({
      where: { id },
      data: {
        name: requestData.name || existingDistributor.name,
        code: requestData.code || existingDistributor.code
      }
    });

    // Update address if provided
    if (requestData.address && existingDistributor.addressId) {
      const addressData = requestData.address;
      await prisma.address.update({
        where: { id: existingDistributor.addressId },
        data: {
          street: addressData.street !== undefined ? addressData.street : existingDistributor.address?.street,
          number: addressData.number !== undefined ? addressData.number : existingDistributor.address?.number,
          complement: addressData.complement !== undefined ? addressData.complement : existingDistributor.address?.complement,
          neighborhood: addressData.neighborhood !== undefined ? addressData.neighborhood : existingDistributor.address?.neighborhood,
          city: addressData.city !== undefined ? addressData.city : existingDistributor.address?.city,
          state: addressData.state !== undefined ? addressData.state : existingDistributor.address?.state,
          zip: addressData.zip || addressData.zipCode || existingDistributor.address?.zip || '',
        }
      });
      log.info('Updated address for distributor', { distributorId: id, addressId: existingDistributor.addressId });
      console.log('[API] Updated address for distributor', { distributorId: id, addressId: existingDistributor.addressId });
    }

    // Create new price record if price was provided
    const pricePerKwh = requestData.price_per_kwh || requestData.pricePerKwh;
    if (pricePerKwh !== undefined && pricePerKwh > 0) {
      await prisma.kwhPrice.create({
        data: {
          distributorId: id,
          price: Math.round(pricePerKwh * 1000), // Convert to integer (price in centavos)
          startDate: new Date()
        }
      });
      log.info('Created new price record for distributor', { distributorId: id, pricePerKwh });
      console.log('[API] Created new price record for distributor', { distributorId: id, pricePerKwh });
    }

    // Get the updated distributor with address and latest price
    const completeDistributor = await prisma.distributor.findUnique({
      where: { id },
      include: {
        address: true,
        kwhPrices: {
          orderBy: { startDate: 'desc' },
          take: 1
        }
      }
    });

    // Calculate current price from the most recent kwhPrice
    let currentPrice = 0;
    if (completeDistributor?.kwhPrices && completeDistributor.kwhPrices.length > 0) {
      // Convert from integer (stored as centavos) to decimal
      currentPrice = completeDistributor.kwhPrices[0].price / 1000;
    }

    // Add the pricePerKwh to the response
    const response = {
      ...completeDistributor,
      pricePerKwh: currentPrice
    };

    log.info('Distributor updated successfully', { distributorId: id });
    console.log('[API] Distributor updated successfully', { distributorId: id });

    return NextResponse.json(response);
  } catch (error) {
    log.error('Error updating distributor', { distributorId: id, error });
    console.error('[API] Error updating distributor', { 
      distributorId: id,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    return createErrorResponse('Internal Server Error', 500);
  }
}

// DELETE - Delete a distributor by ID
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const { id } = params;
  log.info('Received request to delete distributor', { distributorId: id });
  console.log('[API] Deleting distributor', { distributorId: id });

  const authCheck = validateAuthentication(req);
  if (!authCheck.isAuthenticated) {
    log.warn('Authentication failed for distributor deletion request', { distributorId: id });
    console.log('[API] Authentication failed for distributor deletion request', { distributorId: id });
    return authCheck.errorResponse;
  }

  const { userRole } = getUserFromRequest(req);
  if (userRole !== 'ADMIN' && userRole !== 'SUPER_ADMIN') {
    log.warn('Unauthorized attempt to delete distributor', { userRole, distributorId: id });
    console.log('[API] Unauthorized attempt to delete distributor', { userRole, distributorId: id });
    return createErrorResponse('Forbidden: Admin privileges required', 403);
  }

  try {
    // Check if distributor exists and has installations
    const existingDistributor = await prisma.distributor.findUnique({
      where: { id },
      include: {
        // eslint-disable-next-line @typescript-eslint/naming-convention
        _count: {
          select: { installations: true }
        }
      }
    });

    if (!existingDistributor) {
      log.warn('Distributor not found for deletion', { distributorId: id });
      console.log('[API] Distributor not found for deletion', { distributorId: id });
      return createErrorResponse(`Distributor with ID ${id} not found`, 404);
    }

    // Check if distributor has installations
    if (existingDistributor._count.installations > 0) {
      log.warn('Cannot delete distributor with installations', { 
        distributorId: id, 
        installationsCount: existingDistributor._count.installations 
      });
      console.log('[API] Cannot delete distributor with installations', { 
        distributorId: id, 
        installationsCount: existingDistributor._count.installations 
      });
      return createErrorResponse('Cannot delete distributor that has installations associated with it', 400);
    }

    // Delete kWh prices associated with this distributor
    await prisma.kwhPrice.deleteMany({
      where: { distributorId: id }
    });
    log.info('Deleted price records for distributor', { distributorId: id });
    console.log('[API] Deleted price records for distributor', { distributorId: id });

    // Get address ID before deleting distributor
    const addressId = existingDistributor.addressId;

    // Delete distributor
    await prisma.distributor.delete({
      where: { id }
    });
    log.info('Distributor deleted successfully', { distributorId: id });
    console.log('[API] Distributor deleted successfully', { distributorId: id });

    // Delete associated address if exists
    if (addressId) {
      await prisma.address.delete({
        where: { id: addressId }
      });
      log.info('Deleted address for distributor', { distributorId: id, addressId });
      console.log('[API] Deleted address for distributor', { distributorId: id, addressId });
    }

    return NextResponse.json({ 
      message: 'Distributor deleted successfully' 
    });
  } catch (error) {
    log.error('Error deleting distributor', { distributorId: id, error });
    console.error('[API] Error deleting distributor', { 
      distributorId: id,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    return createErrorResponse('Internal Server Error', 500);
  }
}
