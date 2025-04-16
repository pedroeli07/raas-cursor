import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db, prisma } from '@/lib/db/db';
import log from '@/lib/logs/logger';
import { Role } from '@prisma/client';
import { NotificationService } from '@/lib/notification/notificationService';
import { EmailService } from '@/lib/email/emailService';
import { createHelpResponseSchema } from '@/lib/schemas/schemas';
import { validateRequestBody, validateAuthentication, createErrorResponse } from '@/lib/validators/validators';
import { getUserFromRequest } from '@/lib/utils/utils';

// Schema for adding a response to a help request
const addResponseSchema = z.object({
  helpRequestId: z.string().min(1, { message: 'Help request ID is required' }),
  message: z.string().min(5, { message: 'Response must be at least 5 characters long' }),
});


// POST - Add a response to a help request
export async function POST(req: NextRequest) {
  log.info('Received request to add response to help request');

  // Check authentication
  const authCheck = validateAuthentication(req);
  if (!authCheck.isAuthenticated) {
    return authCheck.errorResponse;
  }

  const { userId, userEmail } = getUserFromRequest(req);
  
  // Devido ao check de autenticação, sabemos que userId não é null aqui
  const userIdSafe = userId as string;

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

    const { helpRequestId, message } = validation.data;
    
    // Get the help request to verify access and update status
    const helpRequest = await prisma.helpRequest.findUnique({
      where: { id: helpRequestId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            contact: {
              select: {
                emails: true
              }
            }
          }
        },
        admin: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });

    if (!helpRequest) {
      log.warn('Attempt to respond to non-existent help request', { helpRequestId });
      return createErrorResponse('Help request not found', 404);
    }

    // Create the response
    const helpResponse = await prisma.helpResponse.create({
      data: {
        helpRequestId,
        userId: userIdSafe,
        message,
      }
    });

    log.info('Response added to help request', { 
      helpResponseId: helpResponse.id,
      helpRequestId
    });

    // Update the help request status if it's the first response from an admin
    // and the current status is OPEN
    const user = await prisma.user.findUnique({
      where: { id: userIdSafe },
      select: { role: true, name: true }
    });

    const isAdmin = user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN' || user?.role === 'ADMIN_STAFF';
    const isCustomer = helpRequest.userId === userIdSafe;

    // If an admin responds to an OPEN request, update to IN_PROGRESS
    if (isAdmin && !isCustomer && helpRequest.status === 'OPEN') {
      await prisma.helpRequest.update({
        where: { id: helpRequestId },
        data: { 
          status: 'IN_PROGRESS',
          adminId: userIdSafe 
        }
      });

      log.info('Help request status updated to IN_PROGRESS', { helpRequestId });
    }

    // Send notifications
    
    // If admin responded, notify the customer
    if (isAdmin && !isCustomer) {
      // Create notification for customer
      await NotificationService.createNotification({
        userId: helpRequest.userId,
        title: 'Nova resposta no seu pedido de suporte',
        message: `${user?.name} respondeu à sua solicitação: "${helpRequest.title}"`,
        type: 'HELP',
        relatedId: helpRequestId
      });

      // If customer has email, send email notification
      if (helpRequest.user.contact?.emails?.[0]) {
        await EmailService.sendHelpRequestNotification(
          helpRequest.user.contact.emails[0],
          helpRequest.title,
          message,
          user?.name || 'Suporte'
        );
      }
    }
    
    // If customer responded, notify assigned admin or all admins
    if (isCustomer) {
      if (helpRequest.adminId) {
        // Notify the assigned admin
        await NotificationService.createNotification({
          userId: helpRequest.adminId,
          title: 'Nova resposta em solicitação de suporte',
          message: `${helpRequest.user.name} respondeu em "${helpRequest.title}"`,
          type: 'HELP',
          relatedId: helpRequestId
        });
      } else {
        // Notify all admins if no admin is assigned
        await NotificationService.notifyAdminsAboutHelpResponse(
          helpRequestId,
          helpRequest.user.name || 'Cliente',
          helpRequest.title
        );
      }
    }

    return NextResponse.json({ 
      message: 'Response added successfully',
      helpResponse 
    }, { status: 201 });

  } catch (error) {
    log.error('Error adding response to help request', { error });
    return createErrorResponse('Internal Server Error', 500);
  }
}

// GET - Get all responses for a help request
export async function GET(req: NextRequest) {
  log.info('Received request to get help request responses');

  const { userId, userRole } = getUserFromRequest(req);

  if (!userId) {
    log.warn('Unauthorized attempt to get responses', { message: 'No user ID in request' });
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  // Get helpRequestId from the URL query parameter
  const { searchParams } = new URL(req.url);
  const helpRequestId = searchParams.get('helpRequestId');

  if (!helpRequestId) {
    log.warn('Missing helpRequestId parameter');
    return NextResponse.json({ message: 'Missing helpRequestId parameter' }, { status: 400 });
  }

  try {
    // Check if the help request exists
    const helpRequest = await prisma.helpRequest.findUnique({
      where: { id: helpRequestId }
    });

    if (!helpRequest) {
      log.warn('Attempt to get responses for non-existent help request', { helpRequestId });
      return NextResponse.json({ message: 'Help request not found' }, { status: 404 });
    }

    // Check if the user has permission to view the responses
    const isAdmin = userRole === Role.SUPER_ADMIN || userRole === Role.ADMIN;
    const isOwner = helpRequest.userId === userId;
    const isAssignedAdmin = helpRequest.adminId === userId;

    if (!(isAdmin || isOwner || isAssignedAdmin)) {
      log.warn('Unauthorized attempt to view help request responses', { 
        userId, 
        helpRequestId 
      });
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }

    // Get the responses
    const responses = await prisma.helpResponse.findMany({
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

    log.info('Retrieved help request responses', { 
      helpRequestId, 
      count: responses.length 
    });

    return NextResponse.json({ responses });

  } catch (error) {
    log.error('Error getting responses', { error });
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
} 