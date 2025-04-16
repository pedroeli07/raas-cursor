import { prisma } from '@/lib/db/db';
import log from '@/lib/logs/logger';
import { NotificationType, Role } from '@prisma/client';

/**
 * Service for handling system notifications
 */
export class NotificationService {
  /**
   * Create a notification for a specific user
   */
  static async notifyUser(
    userId: string,
    title: string,
    message: string,
    type: NotificationType = 'SYSTEM',
    relatedId?: string
  ) {
    try {
      const notification = await db.notification.create({
        data: {
          title,
          message,
          type,
          userId,
          relatedId: relatedId || undefined
        }
      });

      log.info('Notification created for specific user', { 
        userId, 
        notificationId: notification.id,
        title 
      });

      return notification;
    } catch (error) {
      log.error('Failed to create notification for user', { 
        userId, 
        title, 
        error 
      });
      return null;
    }
  }

  /**
   * Create notifications for all users with a specific role
   */
  static async notifyUsersByRole(
    role: Role,
    title: string,
    message: string,
    type: NotificationType = 'SYSTEM',
    relatedId?: string
  ) {
    try {
      const users = await db.user.findMany({
        where: { role },
        select: { id: true }
      });

      if (users.length === 0) {
        log.warn(`No users found with role ${role} to notify`, { role, title });
        return [];
      }

      const notifications = await Promise.all(
        users.map(user => 
          this.notifyUser(user.id, title, message, type, relatedId)
        )
      );

      const successfulNotifications = notifications.filter(n => n !== null);
      
      log.info(`Notification created for ${successfulNotifications.length} users with role ${role}`, { 
        title, 
        role, 
        userCount: users.length,
        successCount: successfulNotifications.length
      });

      return successfulNotifications;
    } catch (error) {
      log.error(`Failed to create notifications for role ${role}`, { 
        role, 
        title, 
        error 
      });
      return [];
    }
  }

  /**
   * Create a notification about a new invitation for all admins
   */
  static async notifyAdminsAboutInvitation(
    invitedEmail: string, 
    invitedName: string | null | undefined, 
    role: Role,
    isUpdate: boolean = false
  ) {
    try {
      const displayName = invitedName || invitedEmail;
      const title = isUpdate ? 'Convite Atualizado' : 'Novo Convite Enviado';
      const message = isUpdate
        ? `Um convite para ${displayName} foi atualizado e reenviado (papel: ${role}).`
        : `Um convite foi enviado para ${displayName} para se juntar como ${role}.`;
      
      // Notify both SUPER_ADMIN and ADMIN users
      const superAdminNotifications = await this.notifyUsersByRole(Role.SUPER_ADMIN, title, message);
      const adminNotifications = await this.notifyUsersByRole(Role.ADMIN, title, message);
      
      const totalNotifications = (superAdminNotifications?.length || 0) + (adminNotifications?.length || 0);
      
      log.info(isUpdate ? 'Admin users notified about updated invitation' : 'Admin users notified about invitation', { 
        invitedEmail, 
        role, 
        isUpdate,
        notificationCount: totalNotifications
      });
      
      return totalNotifications > 0;
    } catch (error) {
      log.error('Failed to notify admins about invitation', {
        invitedEmail,
        role,
        isUpdate,
        error
      });
      return false;
    }
  }

  /**
   * Create a notification about a new help request for all admins
   */
  static async notifyAdminsAboutHelpRequest(requestId: string, requesterName: string, title: string) {
    try {
      const notificationTitle = 'Nova Solicitação de Ajuda';
      const message = `${requesterName} enviou uma nova solicitação: "${title}"`;
      
      // Notify both SUPER_ADMIN and ADMIN users
      await this.notifyUsersByRole(Role.SUPER_ADMIN, notificationTitle, message, 'HELP', requestId);
      await this.notifyUsersByRole(Role.ADMIN, notificationTitle, message, 'HELP', requestId);
      await this.notifyUsersByRole(Role.ADMIN_STAFF, notificationTitle, message, 'HELP', requestId);
      
      log.info('Admin users notified about help request', { requestId, requesterName });
      return true;
    } catch (error) {
      log.error('Failed to notify admins about help request', {
        requestId,
        requesterName,
        error
      });
      return false;
    }
  }

  /**
   * Create a notification about a new response to a help request for all admins
   */
  static async notifyAdminsAboutHelpResponse(requestId: string, responderName: string, requestTitle: string) {
    try {
      const notificationTitle = 'Nova Resposta em Solicitação de Ajuda';
      const message = `${responderName} respondeu à solicitação: "${requestTitle}"`;
      
      // Notify all admin roles
      await this.notifyUsersByRole(Role.SUPER_ADMIN, notificationTitle, message, 'HELP', requestId);
      await this.notifyUsersByRole(Role.ADMIN, notificationTitle, message, 'HELP', requestId);
      await this.notifyUsersByRole(Role.ADMIN_STAFF, notificationTitle, message, 'HELP', requestId);
      
      log.info('Admin users notified about help request response', { requestId, responderName });
      return true;
    } catch (error) {
      log.error('Failed to notify admins about help response', {
        requestId,
        responderName,
        error
      });
      return false;
    }
  }

  /**
   * Create a notification about a revoked invitation for all admins
   */
  static async notifyAdminsAboutRevokedInvitation(
    invitedEmail: string, 
    invitedName: string | null, 
    adminName: string
  ) {
    try {
      const displayName = invitedName || invitedEmail;
      const title = 'Convite Revogado';
      const message = `O convite para ${displayName} foi revogado por ${adminName}.`;
      
      // Notify both SUPER_ADMIN and ADMIN users
      await this.notifyUsersByRole(Role.SUPER_ADMIN, title, message);
      await this.notifyUsersByRole(Role.ADMIN, title, message);
      
      log.info('Admin users notified about revoked invitation', { invitedEmail });
      return true;
    } catch (error) {
      log.error('Failed to notify admins about revoked invitation', {
        invitedEmail,
        adminName,
        error
      });
      return false;
    }
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