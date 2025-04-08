import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/db';
import log from '@/lib/logs/logger';
import { Role, InstallationType } from '@prisma/client';
import { createInstallationSchema } from '@/lib/schemas/schemas';
import { getUserFromRequest, isAdminOrSuperAdmin } from '@/lib/utils/utils';
import { validateRequestBody, validateAuthentication, createErrorResponse } from '@/lib/validators/validators';

// GET - List all installations (consider pagination for large datasets)
export async function GET(req: NextRequest) {
  log.info('Received request to list installations');

  const authCheck = validateAuthentication(req);
  if (!authCheck.isAuthenticated) {
    return authCheck.errorResponse;
  }

  const { userRole } = getUserFromRequest(req);
  if (!isAdminOrSuperAdmin(userRole)) {
    log.warn('Unauthorized attempt to list installations', { userRole });
    return createErrorResponse('Forbidden: Admin privileges required', 403);
  }

  try {
    const installations = await db.installation.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        owner: { select: { id: true, name: true, role: true, contact: { select: { emails: true } } } },
        distributor: { select: { id: true, name: true } },
        address: true // Include full address details
      }
    });

    log.info('Installations fetched successfully', { count: installations.length });
    return NextResponse.json({ installations });
  } catch (error) {
    log.error('Error fetching installations', { error });
    return createErrorResponse('Internal Server Error', 500);
  }
}

// POST - Create a new installation
export async function POST(req: NextRequest) {
  log.info('Received request to create installation');

  const authCheck = validateAuthentication(req);
  if (!authCheck.isAuthenticated) {
    return authCheck.errorResponse;
  }

  const { userRole } = getUserFromRequest(req);
  if (!isAdminOrSuperAdmin(userRole)) {
    log.warn('Unauthorized attempt to create installation', { userRole });
    return createErrorResponse('Forbidden: Admin privileges required', 403);
  }

  const validation = await validateRequestBody(
    req,
    createInstallationSchema,
    'Installation creation validation'
  );

  if (!validation.success) {
    return validation.error;
  }

  const { installationNumber, type, distributorId, ownerId, addressId } = validation.data;

  try {
    // 1. Validate Distributor exists
    const distributor = await db.distributor.findUnique({
      where: { id: distributorId },
    });
    if (!distributor) {
      log.warn('Installation creation failed: Distributor not found', { distributorId });
      return createErrorResponse('Distributor not found', 404);
    }

    // 2. Validate Owner exists and has the correct role
    const owner = await db.user.findUnique({
      where: { id: ownerId },
      select: { role: true },
    });
    if (!owner) {
      log.warn('Installation creation failed: Owner user not found', { ownerId });
      return createErrorResponse('Owner user not found', 404);
    }

    const expectedRole = type === InstallationType.GENERATOR ? Role.ENERGY_RENTER : Role.CUSTOMER;
    if (owner.role !== expectedRole) {
      log.warn('Installation creation failed: Owner has incorrect role', { ownerId, expectedRole, actualRole: owner.role });
      return createErrorResponse(`Invalid owner role. Expected ${expectedRole}, got ${owner.role}`, 400);
    }

    // 3. Validate Address exists (if provided)
    if (addressId) {
      const address = await db.address.findUnique({ where: { id: addressId } });
      if (!address) {
        log.warn('Installation creation failed: Address not found', { addressId });
        return createErrorResponse('Address not found', 404);
      }
    }
    
    // 4. Check for duplicate installation number for the same distributor
    // The @@unique constraint handles this at the DB level, but an early check is good practice
    const existingInstallation = await db.installation.findUnique({
      where: { installationNumber_distributorId: { installationNumber, distributorId } },
    });
    if (existingInstallation) {
        log.warn('Installation creation failed: Duplicate installation number for this distributor', { installationNumber, distributorId });
        return createErrorResponse('Installation number already exists for this distributor', 409);
    }

    // 5. Create installation
    const createData: any = {
      installationNumber,
      type,
      distributorId,
      ownerId,
    };
    
    // Adiciona addressId apenas se ele existir
    if (addressId) {
      createData.addressId = addressId;
    }
    
    const installation = await db.installation.create({
      data: createData,
      include: { // Include related data in the response
        owner: { select: { id: true, name: true, role: true, contact: { select: { emails: true } } } },
        distributor: { select: { id: true, name: true } },
        address: true
      }
    });

    log.info('Installation created successfully', { installationId: installation.id, installationNumber });

    return NextResponse.json({ 
        message: 'Installation created successfully',
        installation
     }, { status: 201 });

  } catch (error) {
    log.error('Error creating installation', { error, installationNumber });
    // Handle potential database constraint errors (like unique index violation if the early check fails)
    // You might want to check error codes (e.g., PrismaClientKnownRequestError with code P2002 for unique constraint)
    return createErrorResponse('Internal Server Error', 500);
  }
} 