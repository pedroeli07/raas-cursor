import { create } from 'zustand';
import { Distributor } from '@/lib/types/app-types';
import { frontendLog as log } from '@/lib/logs/logger';

interface DistributorState {
  // Estado
  distributors: Distributor[];
  selectedDistributor: Distributor | null;
  isLoading: boolean;
  error: string | null;

  // Ações
  fetchDistributors: () => Promise<void>;
  fetchDistributorById: (id: string) => Promise<void>;
  createDistributor: (data: Omit<Distributor, 'id'>) => Promise<void>;
  updateDistributor: (id: string, data: Partial<Distributor>) => Promise<void>;
  deleteDistributor: (id: string) => Promise<void>;
  setSelectedDistributor: (distributor: Distributor | null) => void;
  selectDistributor: (id: string) => void;
  clearSelectedDistributor: () => void;
  setError: (error: string | null) => void;
}

export const useDistributorStore = create<DistributorState>((set, get) => ({
  // Estado inicial
  distributors: [],
  selectedDistributor: null,
  isLoading: false,
  error: null,

  // Buscar todas as distribuidoras
  fetchDistributors: async () => {
    set({ isLoading: true, error: null });
    
    try {
      const response = await fetch('/api/distributors', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Falha ao buscar distribuidoras');
      }
      
      const data = await response.json();
      
      set({ 
        distributors: data.distributors,
        isLoading: false 
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      log.error('Erro ao buscar distribuidoras', { error: errorMessage });
      
      set({ 
        isLoading: false, 
        error: errorMessage
      });
    }
  },

  // Buscar distribuidora por ID
  fetchDistributorById: async (id: string) => {
    set({ isLoading: true, error: null });
    
    try {
      const response = await fetch(`/api/distributors/${id}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Falha ao buscar detalhes da distribuidora');
      }
      
      const distributor = await response.json();
      
      set({ 
        selectedDistributor: distributor,
        isLoading: false 
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      log.error('Erro ao buscar detalhes da distribuidora', { error: errorMessage });
      
      set({ 
        isLoading: false, 
        error: errorMessage
      });
    }
  },

  // Criar nova distribuidora
  createDistributor: async (data: Omit<Distributor, 'id'>) => {
    set({ isLoading: true, error: null });
    
    try {
      const response = await fetch('/api/distributors', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Falha ao criar distribuidora');
      }
      
      const newDistributor = await response.json();
      const { distributors } = get();
      
      set({ 
        distributors: [...distributors, newDistributor],
        selectedDistributor: newDistributor,
        isLoading: false 
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      log.error('Erro ao criar distribuidora', { error: errorMessage });
      
      set({ 
        isLoading: false, 
        error: errorMessage
      });
    }
  },

  // Atualizar distribuidora existente
  updateDistributor: async (id: string, data: Partial<Distributor>) => {
    set({ isLoading: true, error: null });
    
    try {
      const response = await fetch(`/api/distributors/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Falha ao atualizar distribuidora');
      }
      
      const updatedDistributor = await response.json();
      const { distributors, selectedDistributor } = get();
      
      // Atualizar na lista
      const updatedDistributors = distributors.map(distributor => 
        distributor.id === id ? updatedDistributor : distributor
      );
      
      // Atualizar distribuidora selecionada se for a mesma
      const newSelectedDistributor = 
        selectedDistributor && selectedDistributor.id === id 
          ? updatedDistributor 
          : selectedDistributor;
      
      set({ 
        distributors: updatedDistributors,
        selectedDistributor: newSelectedDistributor,
        isLoading: false 
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      log.error('Erro ao atualizar distribuidora', { error: errorMessage });
      
      set({ 
        isLoading: false, 
        error: errorMessage
      });
    }
  },

  // Excluir distribuidora
  deleteDistributor: async (id: string) => {
    set({ isLoading: true, error: null });
    
    try {
      const response = await fetch(`/api/distributors/${id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Falha ao excluir distribuidora');
      }
      
      const { distributors, selectedDistributor } = get();
      
      // Remover da lista
      const updatedDistributors = distributors.filter(distributor => 
        distributor.id !== id
      );
      
      // Limpar selecionada se for a mesma
      const newSelectedDistributor = 
        selectedDistributor && selectedDistributor.id === id 
          ? null 
          : selectedDistributor;
      
      set({ 
        distributors: updatedDistributors,
        selectedDistributor: newSelectedDistributor,
        isLoading: false 
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      log.error('Erro ao excluir distribuidora', { error: errorMessage });
      
      set({ 
        isLoading: false, 
        error: errorMessage
      });
    }
  },

  // Definir distribuidora selecionada diretamente
  setSelectedDistributor: (distributor: Distributor | null) => {
    set({ selectedDistributor: distributor });
  },

  // Selecionar distribuidora existente pelo ID
  selectDistributor: (id: string) => {
    const { distributors } = get();
    const distributor = distributors.find(d => d.id === id) || null;
    set({ selectedDistributor: distributor });
  },

  // Limpar distribuidora selecionada
  clearSelectedDistributor: () => {
    set({ selectedDistributor: null });
  },

  // Definir mensagem de erro
  setError: (error: string | null) => {
    set({ error });
  }
})); 