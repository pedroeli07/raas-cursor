import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/db';
import log from '@/lib/logs/logger';
import { validateAuthentication, createErrorResponse } from '@/lib/validators/validators';
import { getUserFromRequest, isAdmin } from '@/lib/utils/utils';

// GET - Fetch a specific help request by ID
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  log.info('Received request to fetch help request by ID', { id: params.id });

  // Check authentication
  const authCheck = validateAuthentication(req);
  if (!authCheck.isAuthenticated) {
    return authCheck.errorResponse;
  }

  const { userId, userRole } = getUserFromRequest(req);
  
  // Devido ao check de autenticação, sabemos que userId não é null aqui
  const userIdSafe = userId as string;

  try {
    // Fetch the help request with all associated data
    const helpRequest = await db.helpRequest.findUnique({
      where: { id: params.id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            role: true,
            contact: {
              select: {
                emails: true,
                phones: true
              }
            }
          }
        },
        responses: {
          orderBy: { createdAt: 'asc' },
          include: {
            user: {
              select: {
                id: true,
                name: true,
                role: true
              }
            }
          }
        },
        admin: {
          select: {
            id: true,
            name: true,
            role: true
          }
        }
      }
    });

    if (!helpRequest) {
      log.warn('Help request not found', { helpRequestId: params.id });
      return createErrorResponse('Help request not found', 404);
    }

    // Verify permissions - only the owner, assigned admin, or any admin can view
    const isUserAdmin = isAdmin(userRole);
    const isOwner = helpRequest.userId === userIdSafe;
    const isAssignedAdmin = helpRequest.adminId === userIdSafe;

    if (!(isUserAdmin || isOwner || isAssignedAdmin)) {
      log.warn('Unauthorized attempt to access help request', { 
        userId: userIdSafe, 
        helpRequestId: helpRequest.id 
      });
      return createErrorResponse('Forbidden: Insufficient privileges', 403);
    }

    log.info('Retrieved help request details', { helpRequestId: helpRequest.id });
    return NextResponse.json({ helpRequest });
  } catch (error) {
    log.error('Error retrieving help request', { error });
    return createErrorResponse('Internal Server Error', 500);
  }
} 