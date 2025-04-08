import { create } from 'zustand';
import { Installation, InstallationType } from '@/lib/types/app-types';
import { frontendLog as log } from '@/lib/logs/logger';

interface InstallationState {
  // Estado
  installations: Installation[];
  userInstallations: Installation[];
  selectedInstallation: Installation | null;
  isLoading: boolean;
  error: string | null;

  // Ações
  fetchInstallations: (
    type?: InstallationType, 
    distributorId?: string
  ) => Promise<void>;
  fetchUserInstallations: (
    userId?: string, 
    type?: InstallationType
  ) => Promise<void>;
  fetchInstallationById: (id: string) => Promise<void>;
  createInstallation: (data: Omit<Installation, 'id'>) => Promise<void>;
  updateInstallation: (id: string, data: Partial<Installation>) => Promise<void>;
  deleteInstallation: (id: string) => Promise<void>;
  setSelectedInstallation: (installation: Installation | null) => void;
  selectInstallation: (id: string) => void;
  clearSelectedInstallation: () => void;
  setError: (error: string | null) => void;
}

export const useInstallationStore = create<InstallationState>((set, get) => ({
  // Estado inicial
  installations: [],
  userInstallations: [],
  selectedInstallation: null,
  isLoading: false,
  error: null,

  // Buscar todas as instalações com filtros opcionais
  fetchInstallations: async (type?: InstallationType, distributorId?: string) => {
    set({ isLoading: true, error: null });
    
    try {
      // Construir query string com filtros opcionais
      const params = new URLSearchParams();
      if (type) params.append('type', type);
      if (distributorId) params.append('distributorId', distributorId);
      
      const queryString = params.toString();
      const url = `/api/installations${queryString ? `?${queryString}` : ''}`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Falha ao buscar instalações');
      }
      
      const data = await response.json();
      
      set({ 
        installations: data.installations,
        isLoading: false 
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      log.error('Erro ao buscar instalações', { error: errorMessage });
      
      set({ 
        isLoading: false, 
        error: errorMessage
      });
    }
  },

  // Buscar instalações do usuário
  fetchUserInstallations: async (userId?: string, type?: InstallationType) => {
    set({ isLoading: true, error: null });
    
    try {
      // Construir query string com filtros opcionais
      const params = new URLSearchParams();
      if (type) params.append('type', type);
      
      const queryString = params.toString();
      const userPath = userId ? userId : 'me'; // Se não especificar, busca do usuário atual
      const url = `/api/users/${userPath}/installations${queryString ? `?${queryString}` : ''}`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Falha ao buscar instalações do usuário');
      }
      
      const data = await response.json();
      
      set({ 
        userInstallations: data.installations,
        isLoading: false 
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      log.error('Erro ao buscar instalações do usuário', { error: errorMessage });
      
      set({ 
        isLoading: false, 
        error: errorMessage
      });
    }
  },

  // Buscar instalação por ID
  fetchInstallationById: async (id: string) => {
    set({ isLoading: true, error: null });
    
    try {
      const response = await fetch(`/api/installations/${id}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Falha ao buscar detalhes da instalação');
      }
      
      const installation = await response.json();
      
      set({ 
        selectedInstallation: installation,
        isLoading: false 
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      log.error('Erro ao buscar detalhes da instalação', { error: errorMessage });
      
      set({ 
        isLoading: false, 
        error: errorMessage
      });
    }
  },

  // Criar nova instalação
  createInstallation: async (data: Omit<Installation, 'id'>) => {
    set({ isLoading: true, error: null });
    
    try {
      const response = await fetch('/api/installations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Falha ao criar instalação');
      }
      
      const newInstallation = await response.json();
      const { installations } = get();
      
      set({ 
        installations: [...installations, newInstallation],
        selectedInstallation: newInstallation,
        isLoading: false 
      });
      
      // Se a instalação for para o usuário atual, atualizar userInstallations também
      if (data.ownerId === 'current_user') {
        const { userInstallations } = get();
        set({
          userInstallations: [...userInstallations, newInstallation]
        });
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      log.error('Erro ao criar instalação', { error: errorMessage });
      
      set({ 
        isLoading: false, 
        error: errorMessage
      });
    }
  },

  // Atualizar instalação existente
  updateInstallation: async (id: string, data: Partial<Installation>) => {
    set({ isLoading: true, error: null });
    
    try {
      const response = await fetch(`/api/installations/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Falha ao atualizar instalação');
      }
      
      const updatedInstallation = await response.json();
      const { installations, userInstallations, selectedInstallation } = get();
      
      // Atualizar na lista principal
      const updatedInstallations = installations.map(installation => 
        installation.id === id ? updatedInstallation : installation
      );
      
      // Atualizar também na lista do usuário, se existir lá
      const updatedUserInstallations = userInstallations.map(installation => 
        installation.id === id ? updatedInstallation : installation
      );
      
      // Atualizar instalação selecionada se for a mesma
      const newSelectedInstallation = 
        selectedInstallation && selectedInstallation.id === id 
          ? updatedInstallation 
          : selectedInstallation;
      
      set({ 
        installations: updatedInstallations,
        userInstallations: updatedUserInstallations,
        selectedInstallation: newSelectedInstallation,
        isLoading: false 
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      log.error('Erro ao atualizar instalação', { error: errorMessage });
      
      set({ 
        isLoading: false, 
        error: errorMessage
      });
    }
  },

  // Excluir instalação
  deleteInstallation: async (id: string) => {
    set({ isLoading: true, error: null });
    
    try {
      const response = await fetch(`/api/installations/${id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Falha ao excluir instalação');
      }
      
      const { installations, userInstallations, selectedInstallation } = get();
      
      // Remover da lista principal
      const updatedInstallations = installations.filter(installation => 
        installation.id !== id
      );
      
      // Remover também da lista do usuário
      const updatedUserInstallations = userInstallations.filter(installation => 
        installation.id !== id
      );
      
      // Limpar selecionada se for a mesma
      const newSelectedInstallation = 
        selectedInstallation && selectedInstallation.id === id 
          ? null 
          : selectedInstallation;
      
      set({ 
        installations: updatedInstallations,
        userInstallations: updatedUserInstallations,
        selectedInstallation: newSelectedInstallation,
        isLoading: false 
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      log.error('Erro ao excluir instalação', { error: errorMessage });
      
      set({ 
        isLoading: false, 
        error: errorMessage
      });
    }
  },

  // Definir instalação selecionada diretamente
  setSelectedInstallation: (installation: Installation | null) => {
    set({ selectedInstallation: installation });
  },

  // Selecionar instalação existente pelo ID
  selectInstallation: (id: string) => {
    const { installations, userInstallations } = get();
    
    // Procurar primeiro nas instalações do usuário, depois nas gerais
    const installation = 
      userInstallations.find(i => i.id === id) || 
      installations.find(i => i.id === id) || 
      null;
      
    set({ selectedInstallation: installation });
  },

  // Limpar instalação selecionada
  clearSelectedInstallation: () => {
    set({ selectedInstallation: null });
  },

  // Definir mensagem de erro
  setError: (error: string | null) => {
    set({ error });
  }
})); 