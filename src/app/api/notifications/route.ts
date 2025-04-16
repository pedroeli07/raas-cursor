import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/db';
import log from '@/lib/logs/logger';
import { getUserFromRequest } from '@/lib/utils/utils';
import { NotificationStatus, NotificationType } from '@prisma/client';
import { z } from 'zod';
import { validateRequestBody, validateAuthentication, createErrorResponse } from '@/lib/validators/validators';

// Schema for creating a notification
const createNotificationSchema = z.object({
  title: z.string().min(1, { message: 'Título é obrigatório' }),
  message: z.string().min(1, { message: 'Mensagem é obrigatória' }),
  type: z.enum([NotificationType.SYSTEM, NotificationType.HELP], { 
    errorMap: () => ({ message: 'Tipo de notificação inválido' }) 
  }),
  userId: z.string().optional(), // Optional - will use authenticated user if not provided
  relatedId: z.string().optional(),
});

// Schema for updating notification status
const updateStatusSchema = z.object({
  ids: z.array(z.string()).min(1, { message: 'Pelo menos um ID é obrigatório' }),
  status: z.enum([NotificationStatus.READ, NotificationStatus.UNREAD, NotificationStatus.ARCHIVED], {
    errorMap: () => ({ message: 'Status inválido' })
  }),
});

// GET - Get notifications for the authenticated user
export async function GET(req: NextRequest) {
  log.info('Received request to fetch user notifications');
  
  const authCheck = validateAuthentication(req);
  if (!authCheck.isAuthenticated) {
    return authCheck.errorResponse;
  }
  
  try {
    const { userId } = getUserFromRequest(req);
    
    // Get query parameters
    const url = new URL(req.url);
    const statusParam = url.searchParams.get('status');
    
    // Convert the status string to NotificationStatus enum or undefined
    let status: NotificationStatus | undefined = undefined;
    if (statusParam && Object.values(NotificationStatus).includes(statusParam as NotificationStatus)) {
      status = statusParam as NotificationStatus;
    }
    
    // Get user notifications from database
    const notifications = await prisma.notification.findMany({
      where: {
        userId: userId as string,
        ...(status ? { status } : {})
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
    
    return NextResponse.json({ success: true, notifications });
  } catch (error: any) {
    log.error('Error fetching notifications', { error: error?.message || 'Unknown error' });
    return createErrorResponse('Falha ao buscar notificações', 500);
  }
}

// POST - Create a new notification
export async function POST(req: NextRequest) {
  log.info('Received request to create notification');
  
  const authCheck = validateAuthentication(req);
  if (!authCheck.isAuthenticated) {
    return authCheck.errorResponse;
  }
  
  // Validate request body
  const validation = await validateRequestBody(
    req,
    createNotificationSchema,
    'Notification creation validation'
  );

  if (!validation.success) {
    return validation.error;
  }
  
  try {
    const { userId: adminId } = getUserFromRequest(req);
    const data = validation.data;
    
    // Create notification
    const notification = await prisma.notification.create({
      data: {
        title: data.title,
        message: data.message,
        type: data.type,
        userId: data.userId || adminId as string,
        relatedId: data.relatedId,
      }
    });
    
    log.info('Notification created successfully', { 
      notificationId: notification.id,
      userId: data.userId || adminId 
    });
    
    return NextResponse.json({ 
      success: true, 
      message: 'Notificação criada com sucesso',
      notification 
    }, { status: 201 });
  } catch (error: any) {
    log.error('Error creating notification', { error: error?.message || 'Unknown error' });
    return createErrorResponse('Falha ao criar notificação', 500);
  }
}

// PATCH - Mark notifications as read or archived
export async function PATCH(req: NextRequest) {
  log.info('Received request to update notification status');
  
  const authCheck = validateAuthentication(req);
  if (!authCheck.isAuthenticated) {
    return authCheck.errorResponse;
  }
  
  // Validate request body
  const validation = await validateRequestBody(
    req,
    updateStatusSchema,
    'Notification status update validation'
  );

  if (!validation.success) {
    return validation.error;
  }
  
  try {
    const { userId } = getUserFromRequest(req);
    const { ids, status } = validation.data;
    
    // Update notifications
    const result = await prisma.notification.updateMany({
      where: {
        id: { in: ids },
        userId: userId as string
      },
      data: {
        status,
        ...(status === NotificationStatus.READ ? { readAt: new Date() } : {})
      }
    });
    
    log.info('Notifications updated successfully', { 
      count: result.count,
      status,
      userId 
    });
    
    return NextResponse.json({ 
      success: true, 
      message: 'Notificações atualizadas com sucesso',
      count: result.count 
    });
  } catch (error: any) {
    log.error('Error updating notifications', { error: error?.message || 'Unknown error' });
    return createErrorResponse('Falha ao atualizar notificações', 500);
  }
} 