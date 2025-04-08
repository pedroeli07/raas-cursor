import { create } from 'zustand';
import { Allocation } from '@/lib/types/app-types';
import { useAuthStore } from './authStore';

interface AllocationStore {
  // Estado
  allocations: Allocation[];
  installationAllocations: Allocation[];
  selectedAllocation: Allocation | null;
  isLoading: boolean;
  error: string | null;
  
  // Ações
  fetchAllocations: () => Promise<void>;
  fetchAllocationsByInstallation: (installationId: string, type?: 'GENERATOR' | 'CONSUMER') => Promise<void>;
  fetchAllocationById: (id: string) => Promise<void>;
  createAllocation: (data: Omit<Allocation, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateAllocation: (id: string, data: Partial<Allocation>) => Promise<void>;
  deleteAllocation: (id: string) => Promise<void>;
  clearError: () => void;
}

export const useAllocationStore = create<AllocationStore>((set, get) => ({
  // Estado inicial
  allocations: [],
  installationAllocations: [],
  selectedAllocation: null,
  isLoading: false,
  error: null,

  // Buscar todas as alocações
  fetchAllocations: async () => {
    const authState = useAuthStore.getState();
    if (!authState.token || !authState.isAuthenticated) {
      set({ error: 'Usuário não autenticado' });
      return;
    }

    try {
      set({ isLoading: true, error: null });
      
      const response = await fetch('/api/allocations', {
        headers: {
          Authorization: `Bearer ${authState.token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Falha ao carregar alocações');
      }

      const data = await response.json();
      set({ 
        allocations: data.allocations,
        isLoading: false 
      });
    } catch (error) {
      console.error('Error fetching allocations:', error);
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido ao carregar alocações',
      });
    }
  },

  // Buscar alocações de uma instalação específica
  fetchAllocationsByInstallation: async (installationId: string, type?: 'GENERATOR' | 'CONSUMER') => {
    const authState = useAuthStore.getState();
    if (!authState.token || !authState.isAuthenticated) {
      set({ error: 'Usuário não autenticado' });
      return;
    }

    try {
      set({ isLoading: true, error: null });
      
      // Construir params
      const params = new URLSearchParams();
      if (type) params.append('type', type);
      
      const queryString = params.toString();
      const url = `/api/installations/${installationId}/allocations${queryString ? `?${queryString}` : ''}`;
      
      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${authState.token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Falha ao carregar alocações da instalação');
      }

      const data = await response.json();
      set({ 
        installationAllocations: data.allocations,
        isLoading: false 
      });
    } catch (error) {
      console.error('Error fetching installation allocations:', error);
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido ao carregar alocações da instalação',
      });
    }
  },

  // Buscar alocação específica por ID
  fetchAllocationById: async (id: string) => {
    const authState = useAuthStore.getState();
    if (!authState.token || !authState.isAuthenticated) {
      set({ error: 'Usuário não autenticado' });
      return;
    }

    try {
      set({ isLoading: true, error: null });
      
      const response = await fetch(`/api/allocations/${id}`, {
        headers: {
          Authorization: `Bearer ${authState.token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Falha ao carregar detalhes da alocação');
      }

      const allocation = await response.json();
      set({ 
        selectedAllocation: allocation,
        isLoading: false 
      });
    } catch (error) {
      console.error('Error fetching allocation details:', error);
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido ao carregar detalhes da alocação',
      });
    }
  },

  // Criar nova alocação
  createAllocation: async (data: Omit<Allocation, 'id' | 'createdAt' | 'updatedAt'>) => {
    const authState = useAuthStore.getState();
    if (!authState.token || !authState.isAuthenticated) {
      set({ error: 'Usuário não autenticado' });
      return;
    }

    try {
      set({ isLoading: true, error: null });
      
      const response = await fetch('/api/allocations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authState.token}`,
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Falha ao criar alocação');
      }

      const newAllocation = await response.json();
      
      // Atualizar listas
      set({ 
        allocations: [...get().allocations, newAllocation],
        installationAllocations: data.generatorId === get().installationAllocations[0]?.generatorId || 
                                data.consumerId === get().installationAllocations[0]?.consumerId 
                                ? [...get().installationAllocations, newAllocation]
                                : get().installationAllocations,
        selectedAllocation: newAllocation,
        isLoading: false 
      });
    } catch (error) {
      console.error('Error creating allocation:', error);
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido ao criar alocação',
      });
    }
  },

  // Atualizar alocação existente
  updateAllocation: async (id: string, data: Partial<Allocation>) => {
    const authState = useAuthStore.getState();
    if (!authState.token || !authState.isAuthenticated) {
      set({ error: 'Usuário não autenticado' });
      return;
    }

    try {
      set({ isLoading: true, error: null });
      
      const response = await fetch(`/api/allocations/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authState.token}`,
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Falha ao atualizar alocação');
      }

      const updatedAllocation = await response.json();
      
      // Atualizar a alocação em todas as listas
      const updatedAllocations = get().allocations.map(allocation => 
        allocation.id === id ? updatedAllocation : allocation
      );
      
      const updatedInstallationAllocations = get().installationAllocations.map(allocation => 
        allocation.id === id ? updatedAllocation : allocation
      );
      
      set({ 
        allocations: updatedAllocations,
        installationAllocations: updatedInstallationAllocations,
        selectedAllocation: get().selectedAllocation?.id === id ? updatedAllocation : get().selectedAllocation,
        isLoading: false 
      });
    } catch (error) {
      console.error('Error updating allocation:', error);
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido ao atualizar alocação',
      });
    }
  },

  // Excluir alocação
  deleteAllocation: async (id: string) => {
    const authState = useAuthStore.getState();
    if (!authState.token || !authState.isAuthenticated) {
      set({ error: 'Usuário não autenticado' });
      return;
    }

    try {
      set({ isLoading: true, error: null });
      
      const response = await fetch(`/api/allocations/${id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${authState.token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Falha ao excluir alocação');
      }
      
      // Remover a alocação de todas as listas
      const updatedAllocations = get().allocations.filter(allocation => allocation.id !== id);
      const updatedInstallationAllocations = get().installationAllocations.filter(allocation => allocation.id !== id);
      
      set({ 
        allocations: updatedAllocations,
        installationAllocations: updatedInstallationAllocations,
        selectedAllocation: get().selectedAllocation?.id === id ? null : get().selectedAllocation,
        isLoading: false 
      });
    } catch (error) {
      console.error('Error deleting allocation:', error);
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido ao excluir alocação',
      });
    }
  },

  // Limpar mensagem de erro
  clearError: () => set({ error: null }),
})); 