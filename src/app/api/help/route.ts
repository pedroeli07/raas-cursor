import { NextRequest, NextResponse } from 'next/server';
import { db, prisma } from '@/lib/db/db';
import log from '@/lib/logs/logger';
import { EmailService } from '@/lib/email/emailService';
import { NotificationService } from '@/lib/notification/notificationService';
import { createHelpRequestSchema, helpRequestStatusUpdateSchema, helpRequestAssignSchema } from '../../../lib/schemas/schemas';
import { getUserFromRequest, isAdmin } from '@/lib/utils/utils';
import { validateRequestBody, validateAuthentication, createErrorResponse } from '@/lib/validators/validators';
import { Role } from '@prisma/client';
// GET - List help requests (all for admins, only own for regular users)
export async function GET(req: NextRequest) {
  log.info('Received request to list help requests');

  // Check authentication
  const authCheck = validateAuthentication(req);
  if (!authCheck.isAuthenticated) {
    return authCheck.errorResponse;
  }

  const { userId, userRole } = getUserFromRequest(req);
  
  // Devido ao check de autenticação, sabemos que userId não é null aqui
  const userIdSafe = userId as string;

  try {
    // Determine which help requests to fetch based on user role
    let helpRequests;
    
    if (isAdmin(userRole as Role)) {
      // Admins can see all help requests
      helpRequests = await prisma.helpRequest.findMany({
        orderBy: { createdAt: 'desc' },
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
          }
        }
      });
      
      log.info('Retrieved all help requests for admin', { userId: userIdSafe, count: helpRequests.length });
    } else {
      // Regular users can only see their own requests
      helpRequests = await prisma.helpRequest.findMany({
        where: { userId: userIdSafe }, // Usando userId como string garantida
        orderBy: { createdAt: 'desc' },
        include: {
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
          }
        }
      });
      
      log.info('Retrieved user\'s help requests', { userId: userIdSafe, count: helpRequests.length });
    }

    return NextResponse.json({ helpRequests });
  } catch (error) {
    log.error('Error retrieving help requests', { error });
    return createErrorResponse('Internal Server Error', 500);
  }
}

// POST - Create a new help request
export async function POST(req: NextRequest) {
  log.info('Received request to create help request');

  // Check authentication
  const authCheck = validateAuthentication(req);
  if (!authCheck.isAuthenticated) {
    return authCheck.errorResponse;
  }

  const { userId, userEmail } = getUserFromRequest(req);
  
  // Devido ao check de autenticação, sabemos que userId e userEmail não são null aqui
  const userIdSafe = userId as string;
  const userEmailSafe = userEmail || 'user@example.com'; // Fallback para casos extremos

  try {
    // Validate request data
    const validation = await validateRequestBody(
      req, 
      createHelpRequestSchema,
      'Help request validation'
    );
    
    if (!validation.success) {
      return validation.error;
    }

    const { title, message } = validation.data;
    
    // Get user name
    const user = await prisma.user.findUnique({
      where: { id: userIdSafe },
      select: { name: true }
    });

    // Create help request
    const helpRequest = await prisma.helpRequest.create({
      data: {
        userId: userIdSafe,
        title,
        message,
      }
    });

    log.info('Help request created successfully', { helpRequestId: helpRequest.id, userId: userIdSafe });

    // Notify admins through notifications
    await NotificationService.notifyAdminsAboutHelpRequest(
      helpRequest.id,
      user?.name || userEmailSafe,
      title
    );

    // Send email notification to support
    const contactInfo = await prisma.contact.findFirst({
      where: { users: { some: { id: userIdSafe } } }
    });
    
    if (contactInfo) {
      await EmailService.sendHelpRequestNotification(
        contactInfo.emails[0],
        title,
        message
      );
    }

    return NextResponse.json({ 
      message: 'Help request created successfully',
      helpRequest
    }, { status: 201 });

  } catch (error) {
    log.error('Error creating help request', { error });
    return createErrorResponse('Internal Server Error', 500);
  }
}

// PUT - Update a help request (admin assigns themselves, mark as resolved, etc.)
export async function PUT(req: NextRequest) {
  log.info('Received request to update help request');

  // Check authentication
  const authCheck = validateAuthentication(req);
  if (!authCheck.isAuthenticated) {
    return authCheck.errorResponse;
  }

  const { userId, userRole } = getUserFromRequest(req);
  
  // Devido ao check de autenticação, sabemos que userId não é null aqui
  const userIdSafe = userId as string;

  try {
    const body = await req.json();
    
    // Check if the operation is to assign the request to an admin
    if (body.operation === 'assign') {
      // Validate request data
      const validation = helpRequestAssignSchema.safeParse(body);
      if (!validation.success) {
        return createErrorResponse('Invalid request data', 400, validation.error.errors);
      }
      
      const { helpRequestId } = validation.data;
      
      // Only admins can assign requests
      if (!isAdmin(userRole as Role)) {
        log.warn('Non-admin attempted to assign help request', { userId: userIdSafe, userRole });
        return createErrorResponse('Forbidden: Admin privileges required', 403);
      }

      const helpRequest = await prisma.helpRequest.update({
        where: { id: helpRequestId },
        data: {
          adminId: userIdSafe,
          status: 'IN_PROGRESS'
        }
      });

      log.info('Help request assigned to admin', { 
        helpRequestId: helpRequest.id, 
        adminId: userIdSafe 
      });

      return NextResponse.json({ 
        message: 'Help request assigned successfully',
        helpRequest
      });
    }
    
    // Check if the operation is to change the status (resolve/close)
    if (body.operation === 'updateStatus') {
      // Validate request data
      const validation = helpRequestStatusUpdateSchema.safeParse(body);
      if (!validation.success) {
        return createErrorResponse('Invalid request data', 400, validation.error.errors);
      }
      
      const { helpRequestId, status } = validation.data;
      
      const helpRequest = await prisma.helpRequest.findUnique({
        where: { id: helpRequestId }
      });

      if (!helpRequest) {
        log.warn('Attempt to update non-existent help request', { helpRequestId });
        return createErrorResponse('Help request not found', 404);
      }

      // Verify permission to update
      const isUserAdmin = isAdmin(userRole as Role);
      const isOwner = helpRequest.userId === userIdSafe;
      const isAssignedAdmin = helpRequest.adminId === userIdSafe;

      if (!(isUserAdmin || isOwner)) {
        log.warn('Unauthorized attempt to update help request status', { 
          userId: userIdSafe, 
          helpRequestId: helpRequest.id 
        });
        return createErrorResponse('Forbidden: Insufficient privileges', 403);
      }

      // Regular users can only close their own requests, not resolve them
      if (status === 'RESOLVED' && !(isUserAdmin || isAssignedAdmin)) {
        log.warn('Regular user attempted to mark request as resolved', { userId: userIdSafe });
        return createErrorResponse('Only admins can mark requests as resolved', 403);
      }

        const updatedHelpRequest = await prisma.helpRequest.update({
        where: { id: helpRequestId },
        data: { status }
      });

      log.info('Help request status updated', { 
        helpRequestId: updatedHelpRequest.id, 
        userId: userIdSafe,
        newStatus: status
      });

      return NextResponse.json({ 
        message: 'Help request status updated successfully',
        helpRequest: updatedHelpRequest
      });
    }

    log.warn('Invalid update operation', { body });
    return createErrorResponse('Invalid operation', 400);

  } catch (error) {
    log.error('Error updating help request', { error });
    return createErrorResponse('Internal Server Error', 500);
  }
} 