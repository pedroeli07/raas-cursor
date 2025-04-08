import { create } from 'zustand';
import { useAuthStore } from './authStore';
import { 
  DashboardData, 
  CustomerStats, 
  RenterStats,
  Invoice,
  Notification 
} from '@/lib/types/app-types';

interface DashboardStore {
  // Estado
  dashboardData: DashboardData | null;
  customerStats: CustomerStats | null;
  renterStats: RenterStats | null;
  savingsHistory: Array<{month: string; amount: number}>;
  generationHistory: Array<{month: string; amount: number}>;
  isLoading: boolean;
  error: string | null;
  
  // Ações
  fetchDashboardData: () => Promise<void>;
  fetchCustomerStats: (userId?: string) => Promise<void>;
  fetchRenterStats: (userId?: string) => Promise<void>;
  fetchSavingsHistory: (months?: number) => Promise<void>;
  fetchGenerationHistory: (months?: number) => Promise<void>;
  clearError: () => void;
}

export const useDashboardStore = create<DashboardStore>((set) => ({
  // Estado inicial
  dashboardData: null,
  customerStats: null,
  renterStats: null,
  savingsHistory: [],
  generationHistory: [],
  isLoading: false,
  error: null,

  // Buscar dados gerais do dashboard (para admins)
  fetchDashboardData: async () => {
    const authState = useAuthStore.getState();
    if (!authState.token || !authState.isAuthenticated) {
      set({ error: 'Usuário não autenticado' });
      return;
    }

    try {
      set({ isLoading: true, error: null });
      
      const response = await fetch('/api/dashboard', {
        headers: {
          Authorization: `Bearer ${authState.token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Falha ao carregar dados do dashboard');
      }

      const data = await response.json();
      set({ 
        dashboardData: data,
        isLoading: false 
      });
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido ao carregar dados do dashboard',
      });
    }
  },

  // Buscar estatísticas do cliente
  fetchCustomerStats: async (userId?: string) => {
    const authState = useAuthStore.getState();
    if (!authState.token || !authState.isAuthenticated) {
      set({ error: 'Usuário não autenticado' });
      return;
    }

    try {
      set({ isLoading: true, error: null });
      
      // Define a URL baseada em se um ID de usuário foi fornecido ou não
      const url = userId 
        ? `/api/users/${userId}/customer-stats` 
        : '/api/users/me/customer-stats';
      
      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${authState.token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Falha ao carregar estatísticas do cliente');
      }

      const stats = await response.json();
      set({ 
        customerStats: stats,
        isLoading: false 
      });
    } catch (error) {
      console.error('Error fetching customer stats:', error);
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido ao carregar estatísticas do cliente',
      });
    }
  },

  // Buscar estatísticas do locador
  fetchRenterStats: async (userId?: string) => {
    const authState = useAuthStore.getState();
    if (!authState.token || !authState.isAuthenticated) {
      set({ error: 'Usuário não autenticado' });
      return;
    }

    try {
      set({ isLoading: true, error: null });
      
      // Define a URL baseada em se um ID de usuário foi fornecido ou não
      const url = userId 
        ? `/api/users/${userId}/renter-stats` 
        : '/api/users/me/renter-stats';
      
      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${authState.token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Falha ao carregar estatísticas do locador');
      }

      const stats = await response.json();
      set({ 
        renterStats: stats,
        isLoading: false 
      });
    } catch (error) {
      console.error('Error fetching renter stats:', error);
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido ao carregar estatísticas do locador',
      });
    }
  },

  // Buscar histórico de economias
  fetchSavingsHistory: async (months = 12) => {
    const authState = useAuthStore.getState();
    if (!authState.token || !authState.isAuthenticated) {
      set({ error: 'Usuário não autenticado' });
      return;
    }

    try {
      set({ isLoading: true, error: null });
      
      const response = await fetch(`/api/users/me/savings-history?months=${months}`, {
        headers: {
          Authorization: `Bearer ${authState.token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Falha ao carregar histórico de economias');
      }

      const data = await response.json();
      set({ 
        savingsHistory: data.history,
        isLoading: false 
      });
    } catch (error) {
      console.error('Error fetching savings history:', error);
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido ao carregar histórico de economias',
      });
    }
  },

  // Buscar histórico de geração
  fetchGenerationHistory: async (months = 12) => {
    const authState = useAuthStore.getState();
    if (!authState.token || !authState.isAuthenticated) {
      set({ error: 'Usuário não autenticado' });
      return;
    }

    try {
      set({ isLoading: true, error: null });
      
      const response = await fetch(`/api/users/me/generation-history?months=${months}`, {
        headers: {
          Authorization: `Bearer ${authState.token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Falha ao carregar histórico de geração');
      }

      const data = await response.json();
      set({ 
        generationHistory: data.history,
        isLoading: false 
      });
    } catch (error) {
      console.error('Error fetching generation history:', error);
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido ao carregar histórico de geração',
      });
    }
  },

  // Limpar mensagem de erro
  clearError: () => set({ error: null }),
})); 