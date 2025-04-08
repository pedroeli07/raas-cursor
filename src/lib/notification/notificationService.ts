import { db } from '@/lib/db/db';
import log from '@/lib/logs/logger';
import { NotificationType, Role } from '@prisma/client';

/**
 * Service for handling system notifications
 */
export class NotificationService {
  /**
   * Create a new notification for a specific user
   */
  static async createNotification(
    userId: string,
    title: string,
    message: string,
    type: NotificationType = 'SYSTEM',
    relatedId?: string
  ) {
    try {
      const notification = await db.notification.create({
        data: {
          userId,
          title,
          message,
          type,
          relatedId
        }
      });
      
      log.info('Notification created', { notificationId: notification.id, userId, title });
      return notification;
    } catch (error) {
      log.error('Failed to create notification', { userId, title, error });
      throw error;
    }
  }

  /**
   * Create a notification for all users with a specific role
   */
  static async notifyUsersByRole(
    role: Role,
    title: string,
    message: string,
    type: NotificationType = 'SYSTEM',
    relatedId?: string
  ) {
    try {
      // Get all users with the specified role
      const users = await db.user.findMany({
        where: { role }
      });

      const notifications = [];
      for (const user of users) {
        const notification = await this.createNotification(
          user.id,
          title,
          message,
          type,
          relatedId
        );
        notifications.push(notification);
      }

      log.info('Role-based notifications created', { 
        role, 
        userCount: users.length, 
        notificationCount: notifications.length 
      });
      
      return notifications;
    } catch (error) {
      log.error('Failed to create role-based notifications', { role, title, error });
      throw error;
    }
  }

  /**
   * Create a notification about a new invitation for all admins
   */
  static async notifyAdminsAboutInvitation(invitedEmail: string, invitedName: string | null | undefined, role: Role) {
    const title = 'Novo Convite Enviado';
    const message = `Um convite foi enviado para ${invitedName || invitedEmail} para se juntar como ${role}.`;
    
    // Notify both SUPER_ADMIN and ADMIN users
    await this.notifyUsersByRole(Role.SUPER_ADMIN, title, message);
    await this.notifyUsersByRole(Role.ADMIN, title, message);
    
    log.info('Admin users notified about invitation', { invitedEmail, role });
  }

  /**
   * Create a notification about a new help request for all admins
   */
  static async notifyAdminsAboutHelpRequest(requestId: string, requesterName: string, title: string) {
    const notificationTitle = 'Nova Solicitação de Ajuda';
    const message = `${requesterName} enviou uma nova solicitação: "${title}"`;
    
    // Notify both SUPER_ADMIN and ADMIN users
    await this.notifyUsersByRole(Role.SUPER_ADMIN, notificationTitle, message, 'HELP', requestId);
    await this.notifyUsersByRole(Role.ADMIN, notificationTitle, message, 'HELP', requestId);
    
    log.info('Admin users notified about help request', { requestId, requesterName });
  }

  /**
   * Mark a notification as read
   */
  static async markAsRead(notificationId: string, userId: string) {
    try {
      // Verify the notification belongs to the user
      const notification = await db.notification.findUnique({
        where: { id: notificationId }
      });

      if (!notification) {
        log.warn('Notification not found', { notificationId });
        return null;
      }

      if (notification.userId !== userId) {
        log.warn('Unauthorized attempt to mark notification as read', { 
          notificationId, 
          notificationUserId: notification.userId, 
          requestingUserId: userId 
        });
        return null;
      }

      // Update the notification
      const updatedNotification = await db.notification.update({
        where: { id: notificationId },
        data: { 
          status: 'READ',
          readAt: new Date()
        }
      });

      log.info('Notification marked as read', { notificationId });
      return updatedNotification;
    } catch (error) {
      log.error('Failed to mark notification as read', { notificationId, userId, error });
      throw error;
    }
  }

  /**
   * Get all notifications for a user
   */
  static async getUserNotifications(userId: string, status?: 'READ' | 'UNREAD' | 'ARCHIVED') {
    try {
      const notifications = await db.notification.findMany({
        where: {
          userId,
          ...(status ? { status } : {})
        },
        orderBy: {
          createdAt: 'desc'
        }
      });

      log.info('Retrieved user notifications', { 
        userId, 
        count: notifications.length,
        status
      });
      
      return notifications;
    } catch (error) {
      log.error('Failed to retrieve user notifications', { userId, error });
      throw error;
    }
  }
} 