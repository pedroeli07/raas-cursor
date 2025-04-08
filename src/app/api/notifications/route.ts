import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/db';
import log from '@/lib/logs/logger';
import { NotificationStatus } from '@prisma/client';
import { NotificationService } from '@/lib/notification/notificationService';

// Helper function to get user ID from request headers set by middleware
function getUserIdFromRequest(req: NextRequest): string | null {
  return req.headers.get('x-user-id');
}

// GET - Get notifications for the authenticated user
export async function GET(req: NextRequest) {
  log.info('Received request to fetch user notifications');

  const userId = getUserIdFromRequest(req);
  if (!userId) {
    log.warn('Unauthorized attempt to fetch notifications', { message: 'No user ID in request' });
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  // Get the status filter from URL query parameters, if provided
  const { searchParams } = new URL(req.url);
  const status = searchParams.get('status') as NotificationStatus | null;

  try {
    // Get notifications for the user
    const notifications = await NotificationService.getUserNotifications(
      userId, 
      status || undefined
    );

    log.info('Fetched user notifications', { userId, count: notifications.length });
    return NextResponse.json({ notifications });
  } catch (error) {
    log.error('Error fetching notifications', { error });
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}

// PUT - Update notification status (mark as read, archive)
export async function PUT(req: NextRequest) {
  log.info('Received request to update notification');

  const userId = getUserIdFromRequest(req);
  if (!userId) {
    log.warn('Unauthorized attempt to update notification', { message: 'No user ID in request' });
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    
    // Check for required fields
    if (!body.notificationId) {
      log.warn('Missing notificationId in request body');
      return NextResponse.json({ message: 'Missing notificationId' }, { status: 400 });
    }

    // Identify the operation (markAsRead, archive)
    if (body.operation === 'markAsRead') {
      const notification = await NotificationService.markAsRead(body.notificationId, userId);
      
      if (!notification) {
        return NextResponse.json({ message: 'Notification not found or access denied' }, { status: 404 });
      }

      return NextResponse.json({ 
        message: 'Notification marked as read',
        notification 
      });
    } 
    // Archive operation
    else if (body.operation === 'archive') {
      // Find the notification
      const notification = await db.notification.findUnique({
        where: { id: body.notificationId }
      });

      if (!notification) {
        log.warn('Notification not found', { notificationId: body.notificationId });
        return NextResponse.json({ message: 'Notification not found' }, { status: 404 });
      }

      // Verify it belongs to the user
      if (notification.userId !== userId) {
        log.warn('Unauthorized attempt to archive notification', { 
          notificationId: notification.id, 
          notificationUserId: notification.userId, 
          requestingUserId: userId 
        });
        return NextResponse.json({ message: 'Access denied' }, { status: 403 });
      }

      // Archive the notification
      const updatedNotification = await db.notification.update({
        where: { id: body.notificationId },
        data: { status: 'ARCHIVED' }
      });

      log.info('Notification archived', { notificationId: updatedNotification.id });
      return NextResponse.json({ 
        message: 'Notification archived',
        notification: updatedNotification 
      });
    }
    // Unsupported operation
    else {
      log.warn('Unsupported notification operation', { operation: body.operation });
      return NextResponse.json({ message: 'Unsupported operation' }, { status: 400 });
    }
  } catch (error) {
    log.error('Error updating notification', { error });
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
} 