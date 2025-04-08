import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db/db';
import log from '@/lib/logs/logger';
import { Role } from '@prisma/client';
import { NotificationService } from '@/lib/notification/notificationService';

// Schema for adding a response to a help request
const addResponseSchema = z.object({
  helpRequestId: z.string().min(1, { message: 'Help request ID is required' }),
  message: z.string().min(5, { message: 'Response must be at least 5 characters long' }),
});

// Helper function to get user information from request headers set by middleware
function getUserFromRequest(req: NextRequest) {
  const userId = req.headers.get('x-user-id');
  const userEmail = req.headers.get('x-user-email');
  const userRole = req.headers.get('x-user-role') as Role | null;

  return { userId, userEmail, userRole };
}

// POST - Add a response to a help request
export async function POST(req: NextRequest) {
  log.info('Received request to add response to help request');

  const { userId, userRole } = getUserFromRequest(req);

  if (!userId) {
    log.warn('Unauthorized attempt to add response', { message: 'No user ID in request' });
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const validation = addResponseSchema.safeParse(body);

    if (!validation.success) {
      log.warn('Response validation failed', { errors: validation.error.errors });
      return NextResponse.json({ errors: validation.error.errors }, { status: 400 });
    }

    const { helpRequestId, message } = validation.data;

    // Check if the help request exists
    const helpRequest = await db.helpRequest.findUnique({
      where: { id: helpRequestId },
      include: { user: true }
    });

    if (!helpRequest) {
      log.warn('Attempt to respond to non-existent help request', { helpRequestId });
      return NextResponse.json({ message: 'Help request not found' }, { status: 404 });
    }

    // Check if the user has permission to respond
    const isAdmin = userRole === Role.SUPER_ADMIN || userRole === Role.ADMIN;
    const isOwner = helpRequest.userId === userId;

    if (!(isAdmin || isOwner)) {
      log.warn('Unauthorized attempt to respond to help request', { 
        userId, 
        helpRequestId,
        userRole 
      });
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }

    // Add the response
    const response = await db.helpResponse.create({
      data: {
        helpRequestId,
        userId,
        message
      }
    });

    log.info('Response added successfully', { responseId: response.id, helpRequestId });

    // If not already in progress, update the status when an admin responds
    if (isAdmin && helpRequest.status === 'OPEN') {
      await db.helpRequest.update({
        where: { id: helpRequestId },
        data: { 
          status: 'IN_PROGRESS',
          adminId: userId
        }
      });
      
      log.info('Help request status updated to IN_PROGRESS', { helpRequestId });
    }

    // Create a notification for the other party
    const notifyUserId = isAdmin ? helpRequest.userId : helpRequest.adminId;
    
    if (notifyUserId) {
      // Get user info for the notification
      const responderInfo = await db.user.findUnique({
        where: { id: userId },
        select: { 
          name: true,
          role: true
        }
      });

      const title = 'Nova Resposta em Solicitação de Ajuda';
      const notificationMessage = `${responderInfo?.name || 'Alguém'} (${responderInfo?.role || 'Usuário'}) respondeu à sua solicitação "${helpRequest.title}".`;
      
      await NotificationService.createNotification(
        notifyUserId,
        title,
        notificationMessage,
        'HELP',
        helpRequestId
      );
      
      log.info('Notification sent about new response', { 
        notifyUserId,
        helpRequestId
      });
    }

    return NextResponse.json({ 
      message: 'Response added successfully',
      response 
    }, { status: 201 });

  } catch (error) {
    log.error('Error adding response', { error });
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
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
    const helpRequest = await db.helpRequest.findUnique({
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