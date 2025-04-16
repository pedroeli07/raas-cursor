import { NextRequest, NextResponse } from 'next/server';
import { db, prisma } from '@/lib/db/db';
import log from '@/lib/logs/logger';
import { Prisma } from '@prisma/client';
import { getUserFromRequest } from '@/lib/utils/utils';
import { validateAuthentication, createErrorResponse } from '@/lib/validators/validators';
import { installations } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const installationId = params.id;
  log.info('Received request to fetch installation details', { installationId });

  const authCheck = validateAuthentication(req);
  if (!authCheck.isAuthenticated) {
    return authCheck.errorResponse;
  }

  const { userId, userRole } = getUserFromRequest(req);

  try {
    // Use Prisma directly for this complex query with multiple includes
    const installation = await prisma.installation.findUnique({
      where: { id: installationId },
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            role: true,
            contact: { select: { emails: true } }
          }
        },
        distributor: true,
        address: true,
        cemigEnergyBills: {
          orderBy: {
            period: 'asc'
          }
        }
      },
    });

    if (!installation) {
      log.warn('Installation not found', { installationId });
      return createErrorResponse('Installation not found', 404);
    }

    // Check if user is authorized to view this installation
    const isOwner = installation.ownerId === userId;
    const isAdmin = userRole === 'ADMIN' || userRole === 'SUPER_ADMIN';

    if (!isOwner && !isAdmin) {
      log.warn('Unauthorized access to installation details', {
        installationId,
        userId,
        userRole,
      });
      return createErrorResponse('Forbidden: You do not have permission to view this installation', 403);
    }

    log.info('Installation details fetched successfully', { installationId });
    return NextResponse.json(installation);
  } catch (error) {
    log.error('Error fetching installation details', { error, installationId });
    return createErrorResponse('Internal Server Error', 500);
  }
}

// PUT - Update an installation
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const installationId = params.id;
  log.info('Received request to update installation', { installationId });

  const authCheck = validateAuthentication(req);
  if (!authCheck.isAuthenticated) {
    return authCheck.errorResponse;
  }

  const { userRole } = getUserFromRequest(req);
  if (userRole !== 'ADMIN' && userRole !== 'SUPER_ADMIN') {
    log.warn('Unauthorized attempt to update installation', { userRole });
    return createErrorResponse('Forbidden: Admin privileges required', 403);
  }

  try {
    const requestData = await req.json();
    
    // Check if installation exists
    const installation = await prisma.installation.findUnique({
      where: { id: installationId },
    });

    if (!installation) {
      log.warn('Installation update failed: Installation not found', { installationId });
      return createErrorResponse('Installation not found', 404);
    }

    // Transform the request data to handle relationships properly
    let updateData: Prisma.InstallationUpdateInput = {};
    
    // Handle basic fields
    if (requestData.installationNumber) {
      updateData.installationNumber = requestData.installationNumber;
    }
    if (requestData.type) {
      updateData.type = requestData.type;
    }
    if (requestData.status) {
      updateData.status = requestData.status;
    }
    
    // Handle relationships properly
    if (requestData.distributorId) {
      updateData.distributor = {
        connect: { id: requestData.distributorId }
      };
    }
    
    if (requestData.ownerId === null) {
      updateData.owner = { disconnect: true };
    } else if (requestData.ownerId) {
      updateData.owner = {
        connect: { id: requestData.ownerId }
      };
    }
    
    // Handle address updates if provided
    if (requestData.address) {
      // If installation has an existing address, update it
      if (installation.addressId) {
        updateData.address = {
          update: requestData.address
        };
      } else {
        // Otherwise create a new address
        updateData.address = {
          create: requestData.address
        };
      }
    }
    
    // Update installation with properly formatted data
    const updatedInstallation = await prisma.installation.update({
      where: { id: installationId },
      data: updateData,
      include: {
        owner: { select: { id: true, name: true, role: true } },
        distributor: true,
        address: true,
      },
    });

    log.info('Installation updated successfully', { installationId });

    return NextResponse.json({ 
      message: 'Installation updated successfully',
      installation: updatedInstallation
    });
  } catch (error) {
    log.error('Error updating installation', { error, installationId });
    return createErrorResponse('Internal Server Error', 500);
  }
}

// DELETE - Delete an installation
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const installationId = params.id;
  log.info('Received request to delete installation', { installationId });
  console.log('[API] Deleting installation', { installationId });

  const authCheck = validateAuthentication(req);
  if (!authCheck.isAuthenticated) {
    log.warn('Unauthorized attempt to delete installation', { installationId });
    console.log('[API] Authentication failed for installation deletion');
    return authCheck.errorResponse;
  }

  const { userRole } = getUserFromRequest(req);
  if (userRole !== 'ADMIN' && userRole !== 'SUPER_ADMIN') {
    log.warn('Unauthorized role for installation deletion', { userRole, installationId });
    console.log('[API] Unauthorized role for installation deletion', { userRole });
    return createErrorResponse('Forbidden: Admin privileges required', 403);
  }

  try {
    // Check if installation exists
    const installation = await prisma.installation.findUnique({
      where: { id: installationId },
      select: {
        id: true,
        installationNumber: true,
        addressId: true
      }
    });

    if (!installation) {
      log.warn('Installation deletion failed: Installation not found', { installationId });
      console.log('[API] Installation not found for deletion', { installationId });
      return createErrorResponse('Installation not found', 404);
    }

    console.log('[API] Starting installation deletion process', { 
      installationId,
      installationNumber: installation.installationNumber
    });
    
    // First delete the installation
    await prisma.installation.delete({
      where: { id: installationId }
    });
    
    // Then try to delete the address if it exists
    const addressId = installation.addressId;
    if (addressId) {
      try {
        await prisma.address.delete({
          where: { id: addressId }
        });
        console.log('[API] Address deleted successfully', { addressId });
      } catch (addressError) {
        // Log but don't fail if address deletion fails
        console.warn('[API] Could not delete address', { 
          addressId, 
          error: addressError instanceof Error ? addressError.message : 'Unknown error' 
        });
      }
    }

    log.info('Installation deleted successfully', { installationId });
    console.log('[API] Installation deleted successfully', { installationId });

    return NextResponse.json({ 
      message: 'Installation deleted successfully'
    });
  } catch (error) {
    log.error('Error deleting installation', { error, installationId });
    console.error('[API] Error deleting installation', { 
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      installationId
    });
    
    // Provide more detailed error information
    let errorMessage = 'Internal Server Error';
    let statusCode = 500;
    
    if (error instanceof Error) {
      // Check for common database errors
      if (error.message.includes('Foreign key constraint failed')) {
        errorMessage = 'Não é possível excluir esta instalação porque existem registros relacionados. Por favor, remova-os primeiro.';
        statusCode = 400;
      } else if (error.message.includes('Record to delete does not exist')) {
        errorMessage = 'A instalação já foi excluída ou não existe.';
        statusCode = 404;
      }
    }
    
    return createErrorResponse(errorMessage, statusCode);
  }
} 