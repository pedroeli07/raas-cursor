import { create } from 'zustand';
import { Notification } from '@/lib/types/app-types';
import { frontendLog as log } from '@/lib/logs/logger';

interface NotificationState {
  // Estado
  notifications: Notification[];
  unreadCount: number;
  isLoading: boolean;
  error: string | null;

  // Ações
  fetchNotifications: () => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  dismissNotification: (id: string) => void;
  addNotification: (notification: Notification) => void;
  setError: (error: string | null) => void;
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
  // Estado inicial
  notifications: [],
  unreadCount: 0,
  isLoading: false,
  error: null,

  // Buscar notificações do usuário
  fetchNotifications: async () => {
    set({ isLoading: true, error: null });
    
    try {
      const response = await fetch('/api/notifications', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Falha ao buscar notificações');
      }
      
      const data = await response.json();
      
      set({ 
        notifications: data.notifications,
        unreadCount: data.notifications.filter((n: Notification) => n.status === 'UNREAD').length,
        isLoading: false 
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      log.error('Erro ao buscar notificações', { error: errorMessage });
      
      set({ 
        isLoading: false, 
        error: errorMessage
      });
    }
  },

  // Marcar notificação como lida
  markAsRead: async (id: string) => {
    try {
      // Atualizar otimisticamente o estado local
      const { notifications } = get();
      const updatedNotifications = notifications.map(notification => 
        notification.id === id 
          ? { ...notification, status: 'READ', readAt: new Date() } 
          : notification
      );
      
      set({ 
        notifications: updatedNotifications as Notification[],
        unreadCount: updatedNotifications.filter(n => n.status === 'UNREAD').length 
      });
      
      // Fazer a requisição para o servidor
      const response = await fetch(`/api/notifications/${id}/read`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        // Reverter a mudança em caso de erro
        set({ 
          notifications,
          unreadCount: notifications.filter(n => n.status === 'UNREAD').length 
        });
        
        const error = await response.json();
        throw new Error(error.message || 'Falha ao marcar notificação como lida');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      log.error('Erro ao marcar notificação como lida', { error: errorMessage });
      
      set({ error: errorMessage });
    }
  },

  // Marcar todas as notificações como lidas
  markAllAsRead: async () => {
    try {
      // Atualizar otimisticamente o estado local
      const { notifications } = get();
      const updatedNotifications = notifications.map(notification => ({
        ...notification,
        status: 'READ',
        readAt: notification.status === 'UNREAD' ? new Date() : notification.readAt
      }));
      
      set({ 
        notifications: updatedNotifications as Notification[],
        unreadCount: 0
      });
      
      // Fazer a requisição para o servidor
      const response = await fetch('/api/notifications/read-all', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        // Reverter a mudança em caso de erro
        set({ 
          notifications,
          unreadCount: notifications.filter(n => n.status === 'UNREAD').length 
        });
        
        const error = await response.json();
        throw new Error(error.message || 'Falha ao marcar todas as notificações como lidas');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      log.error('Erro ao marcar todas as notificações como lidas', { error: errorMessage });
      
      set({ error: errorMessage });
    }
  },

  // Remover notificação (apenas da interface)
  dismissNotification: (id: string) => {
    const { notifications } = get();
    const filteredNotifications = notifications.filter(n => n.id !== id);
    
    set({ 
      notifications: filteredNotifications,
      unreadCount: filteredNotifications.filter(n => n.status === 'UNREAD').length 
    });
  },

  // Adicionar nova notificação (para notificações em tempo real)
  addNotification: (notification: Notification) => {
    const { notifications } = get();
    const newNotifications = [notification, ...notifications];
    
    set({ 
      notifications: newNotifications,
      unreadCount: newNotifications.filter(n => n.status === 'UNREAD').length 
    });
  },

  // Definir mensagem de erro
  setError: (error: string | null) => {
    set({ error });
  }
})); 