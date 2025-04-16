import { create } from 'zustand';
import { frontendLog as log } from '@/lib/logs/logger';
import { sanitizeInstallation, sanitizeArray } from '@/lib/utils/sanitize';
import { Installation, InstallationType, InstallationStatus } from '@prisma/client';

// Adicione esta função para logar no formato que o DebugContext vai capturar
const logDebug = (level: 'info' | 'warn' | 'error' | 'debug', message: string, data?: any) => {
  console[level](`[STORE]: ${message}`, data);
};

interface InstallationState {
  // Estado
  installations: Installation[];
  userInstallations: Installation[];
  selectedInstallation: Installation | null;
  isLoading: boolean;
  error: string | null;

  // Formatação
  formatDate: (date: Date | string | number) => string;
  formatEnergy: (value: number) => string;
  formatCurrency: (value: number) => string;

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
  updateInstallationStatus: (id: string, status: InstallationStatus) => Promise<void>;
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
  
  // Formatação
  formatDate: (date) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('pt-BR');
  },
  
  formatEnergy: (value) => {
    if (value === undefined || value === null) return '0 kWh';
    return `${value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} kWh`;
  },
  
  formatCurrency: (value) => {
    if (value === undefined || value === null) return 'R$ 0,00';
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  },

  // Buscar todas as instalações
  fetchInstallations: async (type?: InstallationType, distributorId?: string) => {
    set({ isLoading: true, error: null });
    
    try {
      logDebug('info', 'Iniciando busca de instalações', { type, distributorId });
      // Construir query string com filtros opcionais
      const params = new URLSearchParams();
      if (type) params.append('type', type);
      if (distributorId) params.append('distributorId', distributorId);
      
      const queryString = params.toString();
      const url = `/api/installations${queryString ? `?${queryString}` : ''}`;
      
      logDebug('debug', 'Fazendo requisição para API', { url });
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      console.log('InstallationStore: API response received', { 
        status: response.status,
        ok: response.ok
      });
      
      if (!response.ok) {
        const error = await response.json();
        console.error('InstallationStore: Error response from API', error);
        logDebug('error', 'Erro na resposta da API', error);
        throw new Error(error.message || 'Falha ao buscar instalações');
      }
      
      const data = await response.json();
      logDebug('info', 'Instalações recuperadas com sucesso', { 
        count: data.installations?.length || 0
      });
      
      if (data.installations && data.installations.length > 0) {
        logDebug('debug', 'Exemplo de instalação recuperada', data.installations[0]);
      }
      
      // Sanitize the installations to prevent "maximum depth exceeded" errors
      const safeInstallations = sanitizeArray(data.installations, sanitizeInstallation);
      
      logDebug('debug', 'Atualizando store com instalações', { 
        count: safeInstallations.length 
      });
      
      set({ 
        installations: safeInstallations,
        isLoading: false 
      });
      
      // Verify installations were set correctly
      const state = get();
      logDebug('debug', 'Instalações atualizadas no state', { 
        count: state.installations.length
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      console.error('InstallationStore: Error fetching installations', error);
      log.error('Erro ao buscar instalações', { error: errorMessage });
      logDebug('error', 'Erro ao buscar instalações', { error: errorMessage });
      
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
        cache: 'no-store',
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Falha ao criar instalação');
      }
      
      // Parse the response data
      const responseData = await response.json();
      const newInstallation = responseData.installation || responseData;
      const { installations } = get();
      
      // Log de debug
      log.debug('Nova instalação criada:', newInstallation);
      
      // Atualizar o estado imediatamente
      set({
        installations: [...installations, newInstallation],
        isLoading: false,
      });
      
      // Re-fetch após um pequeno delay para garantir que temos os dados mais recentes
      setTimeout(() => {
        const { fetchInstallations } = get();
        fetchInstallations().catch(err => {
          log.warn('Erro ao atualizar lista de instalações após criação:', err);
        });
      }, 500);
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      log.error('Erro ao criar instalação:', { error: errorMessage });
      set({ isLoading: false, error: errorMessage });
    }
  },

  // Atualizar instalação existente
  updateInstallation: async (id: string, data: Partial<Installation>) => {
    // Don't set global loading state to true during updates
    // This way the table will remain visible
    set({ error: null });
    
    try {
      logDebug('info', 'Iniciando atualização de instalação', { id, data });
      
      const response = await fetch(`/api/installations/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        const error = await response.json();
        logDebug('error', 'Erro ao atualizar instalação', error);
        throw new Error(error.message || 'Falha ao atualizar instalação');
      }
      
      const result = await response.json();
      const updatedInstallation = result.installation;
      logDebug('info', 'Instalação atualizada com sucesso', { 
        id: updatedInstallation.id,
        installationNumber: updatedInstallation.installationNumber 
      });
      
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
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      log.error('Erro ao atualizar instalação', { error: errorMessage });
      
      set({ 
        error: errorMessage
      });
      
      throw error; // Re-throw to allow handling in component
    }
  },

  // Update installation status
  updateInstallationStatus: async (id: string, status: InstallationStatus) => {
    set({ isLoading: true, error: null });
    
    try {
      log.info('Atualizando status da instalação', { id, status });
      console.log('InstallationStore: Updating installation status', { id, status });
      
      const response = await fetch(`/api/installations/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status }),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Falha ao atualizar status da instalação');
      }
      
      const updatedInstallation = await response.json();
      console.log('InstallationStore: Installation status updated successfully', updatedInstallation);
      
      // Update the installations list and selectedInstallation if applicable
      set((state) => {
        const updatedInstallations = state.installations.map((installation) =>
          installation.id === id ? { ...installation, status } : installation
        );
        
        const updatedSelectedInstallation = 
          state.selectedInstallation?.id === id 
            ? { ...state.selectedInstallation, status } 
            : state.selectedInstallation;
        
        return { 
          installations: updatedInstallations,
          selectedInstallation: updatedSelectedInstallation,
          isLoading: false 
        };
      });
      
      // Success message
      console.log('InstallationStore: State updated with new status');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      log.error('Erro ao atualizar status da instalação', { error: errorMessage });
      console.error('InstallationStore: Error updating installation status', error);
      
      set({ 
        isLoading: false, 
        error: errorMessage
      });
      
      throw error; // Rethrow for handling in the component
    }
  },

  // Excluir instalação
  deleteInstallation: async (id: string) => {
    set({ isLoading: true, error: null });
    
    try {
      console.log('[STORE] Initiating installation deletion', { id });
      log.info('Iniciando exclusão de instalação', { id });
      
      const response = await fetch(`/api/installations/${id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      console.log('[STORE] Received response from API for installation deletion', { 
        status: response.status, 
        ok: response.ok,
        statusText: response.statusText
      });
      
      if (!response.ok) {
        // Try to parse error response
        let errorData;
        try {
          errorData = await response.json();
          console.error('[STORE] Error response from API:', errorData);
          throw new Error(errorData.message || 'Falha ao excluir instalação');
        } catch (parseError) {
          console.error('[STORE] Could not parse error response:', { 
            parseError, 
            responseText: await response.text() 
          });
          throw new Error(`Falha ao excluir instalação: ${response.status} ${response.statusText}`);
        }
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
      
      console.log('[STORE] Installation deleted successfully', { id });
      log.info('Instalação excluída com sucesso', { id });
      
      set({ 
        installations: updatedInstallations,
        userInstallations: updatedUserInstallations,
        selectedInstallation: newSelectedInstallation,
        isLoading: false 
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      console.error('[STORE] Error deleting installation', { 
        error: errorMessage, 
        id,
        stack: error instanceof Error ? error.stack : undefined
      });
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