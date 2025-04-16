import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/db';
import log from '@/lib/logs/logger';
import { createHelpResponseSchema } from '../../../../../lib/schemas/schemas';
import { getUserFromRequest, isAdmin } from '@/lib/utils/utils';
import { validateRequestBody, validateAuthentication, createErrorResponse } from '@/lib/validators/validators';


// POST - Add response to a help request
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const helpRequestId = params.id;
  log.info('Received request to add response to help request', { helpRequestId });
  
  // Check authentication
  const authCheck = validateAuthentication(req);
  if (!authCheck.isAuthenticated) {
    return authCheck.errorResponse;
  }

  const { userId, userRole } = getUserFromRequest(req);
  const userIdSafe = userId as string;  // Garantido pelo validateAuthentication
  
  try {
    // Validate request data
    const validation = await validateRequestBody(
      req, 
      createHelpResponseSchema,
      'Help response validation'
    );
    
    if (!validation.success) {
      return validation.error;
    }

    const { message } = validation.data;
    
    // Get help request
    const helpRequest = await db.helpRequest.findUnique({
      where: { id: helpRequestId }
    });

    if (!helpRequest) {
      log.warn('Attempt to respond to non-existent help request', { helpRequestId });
      return createErrorResponse('Help request not found', 404);
    }

    // Check if user can respond to help request
    const isHelpRequestOwner = helpRequest.userId === userIdSafe;
    const isAssignedAdmin = helpRequest.adminId === userIdSafe;
    const canRespondToHelpRequest = isAdmin(userRole) || isHelpRequestOwner || isAssignedAdmin;

    if (!canRespondToHelpRequest) {
      log.warn('Unauthorized attempt to respond to help request', { 
        userId: userIdSafe, 
        helpRequestId
      });
      return createErrorResponse('Forbidden: Insufficient privileges', 403);
    }

    // If request was closed, reopen it
    if (helpRequest.status === 'CLOSED' || helpRequest.status === 'RESOLVED') {
      await db.helpRequest.update({
        where: { id: helpRequestId },
        data: { status: 'IN_PROGRESS' }
      });

      log.info('Reopened help request due to new response', { helpRequestId });
    }

    // Add response
    const response = await db.helpResponse.create({
      data: {
        helpRequestId,
        userId: userIdSafe,
        message,
      }
    });

    log.info('Added response to help request', { 
      helpResponseId: response.id, 
      helpRequestId, 
      userId: userIdSafe
    });

    // If admin responding for first time, assign them
    if (isAdmin(userRole) && !isHelpRequestOwner && !helpRequest.adminId) {
      await db.helpRequest.update({
        where: { id: helpRequestId },
        data: { adminId: userIdSafe }
      });
      
      log.info('Auto-assigned admin to help request', { 
        helpRequestId, 
        adminId: userIdSafe 
      });
    }

    return NextResponse.json({ 
      message: 'Response added successfully',
      response
    }, { status: 201 });
    
  } catch (error) {
    log.error('Error adding response to help request', { error, helpRequestId });
    return createErrorResponse('Internal Server Error', 500);
  }
}

// GET - List responses for a help request
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const helpRequestId = params.id;
  log.info('Received request to fetch responses for help request', { helpRequestId });
  
  // Check authentication
  const authCheck = validateAuthentication(req);
  if (!authCheck.isAuthenticated) {
    return authCheck.errorResponse;
  }

  const { userId, userRole } = getUserFromRequest(req);
  const userIdSafe = userId as string;  // Garantido pelo validateAuthentication
  
  try {
    // Get help request
    const helpRequest = await db.helpRequest.findUnique({
      where: { id: helpRequestId }
    });

    if (!helpRequest) {
      log.warn('Attempt to fetch responses for non-existent help request', { helpRequestId });
      return createErrorResponse('Help request not found', 404);
    }

    // Check if user can view responses
    const isHelpRequestOwner = helpRequest.userId === userIdSafe;
    const canViewHelpRequest = isAdmin(userRole) || isHelpRequestOwner;

    if (!canViewHelpRequest) {
      log.warn('Unauthorized attempt to view help request responses', { 
        userId: userIdSafe, 
        helpRequestId
      });
      return createErrorResponse('Forbidden: Insufficient privileges', 403);
    }

    // Get responses
    const responses = await db.helpResponse.findMany({
      where: { helpRequestId },
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
    });

    log.info('Retrieved responses for help request', { 
      helpRequestId, 
      responsesCount: responses.length 
    });

    return NextResponse.json({ responses });
    
  } catch (error) {
    log.error('Error fetching responses for help request', { error, helpRequestId });
    return createErrorResponse('Internal Server Error', 500);
  }
} 