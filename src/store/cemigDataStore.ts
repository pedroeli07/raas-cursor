import { create } from 'zustand';
import { useAuthStore } from './authStore';

// Interface para representar os dados processados do Excel da Cemig
interface CemigEnergyData {
  referenceDate: string;
  installationNumber: string;
  installationType: 'CONSUMER' | 'GENERATOR';
  generation?: number;
  consumption?: number;
  transfer?: number;
  receipt?: number;
  compensation?: number;
  balance?: number;
  expirationDate?: string;
  distributorId: string;
}

interface CemigUploadStatus {
  id: string;
  fileName: string;
  uploadDate: Date;
  referenceMonth: string;
  status: 'PROCESSING' | 'COMPLETE' | 'ERROR';
  rowsProcessed?: number;
  errorMessage?: string;
}

interface CemigDataStore {
  // Estado
  energyData: CemigEnergyData[];
  filteredData: CemigEnergyData[];
  uploadHistory: CemigUploadStatus[];
  currentUpload: CemigUploadStatus | null;
  selectedMonth: string | null;
  selectedDistributor: string | null;
  isLoading: boolean;
  error: string | null;
  
  // Ações
  uploadCemigData: (file: File, referenceMonth: string, distributorId: string) => Promise<void>;
  fetchEnergyData: (filters?: { month?: string, distributorId?: string }) => Promise<void>;
  fetchUploadHistory: () => Promise<void>;
  getUploadStatus: (uploadId: string) => Promise<void>;
  setSelectedMonth: (month: string | null) => void;
  setSelectedDistributor: (distributorId: string | null) => void;
  clearError: () => void;
}

export const useCemigDataStore = create<CemigDataStore>((set, get) => ({
  // Estado inicial
  energyData: [],
  filteredData: [],
  uploadHistory: [],
  currentUpload: null,
  selectedMonth: null,
  selectedDistributor: null,
  isLoading: false,
  error: null,

  // Upload de arquivo Excel da Cemig
  uploadCemigData: async (file: File, referenceMonth: string, distributorId: string) => {
    const authState = useAuthStore.getState();
    if (!authState.token || !authState.isAuthenticated) {
      set({ error: 'Usuário não autenticado' });
      return;
    }

    try {
      set({ isLoading: true, error: null });
      
      const formData = new FormData();
      formData.append('file', file);
      formData.append('referenceMonth', referenceMonth);
      formData.append('distributorId', distributorId);
      
      const response = await fetch('/api/energy-data/upload', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${authState.token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Falha ao fazer upload do arquivo');
      }

      const uploadStatus = await response.json();
      set({ 
        currentUpload: uploadStatus,
        isLoading: false 
      });
      
      // Atualizar histórico de uploads
      get().fetchUploadHistory();
      
    } catch (error) {
      console.error('Upload error:', error);
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido no upload do arquivo',
      });
    }
  },

  // Buscar dados de energia com filtragem opcional
  fetchEnergyData: async (filters = {}) => {
    const authState = useAuthStore.getState();
    if (!authState.token || !authState.isAuthenticated) {
      set({ error: 'Usuário não autenticado' });
      return;
    }

    try {
      set({ isLoading: true, error: null });
      
      // Construir query params
      const params = new URLSearchParams();
      if (filters.month) params.append('month', filters.month);
      if (filters.distributorId) params.append('distributorId', filters.distributorId);
      
      // Usar valores do estado se não fornecidos nos filtros
      const currentMonth = get().selectedMonth;
      if (!filters.month && currentMonth) {
        params.append('month', currentMonth);
      }
      
      const currentDistributor = get().selectedDistributor;
      if (!filters.distributorId && currentDistributor) {
        params.append('distributorId', currentDistributor);
      }
      
      const queryString = params.toString();
      const url = `/api/energy-data${queryString ? `?${queryString}` : ''}`;
      
      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${authState.token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Falha ao carregar dados de energia');
      }

      const data = await response.json();
      set({ 
        energyData: data.energyData,
        filteredData: data.energyData, // Inicialmente os mesmos dados
        isLoading: false 
      });
      
    } catch (error) {
      console.error('Fetch energy data error:', error);
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido ao buscar dados de energia',
      });
    }
  },

  // Buscar histórico de uploads
  fetchUploadHistory: async () => {
    const authState = useAuthStore.getState();
    if (!authState.token || !authState.isAuthenticated) {
      set({ error: 'Usuário não autenticado' });
      return;
    }

    try {
      set({ isLoading: true, error: null });
      
      const response = await fetch('/api/energy-data/uploads', {
        headers: {
          Authorization: `Bearer ${authState.token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Falha ao carregar histórico de uploads');
      }

      const data = await response.json();
      set({ 
        uploadHistory: data.uploads,
        isLoading: false 
      });
      
    } catch (error) {
      console.error('Fetch upload history error:', error);
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido ao buscar histórico de uploads',
      });
    }
  },

  // Verificar status de um upload específico
  getUploadStatus: async (uploadId: string) => {
    const authState = useAuthStore.getState();
    if (!authState.token || !authState.isAuthenticated) {
      set({ error: 'Usuário não autenticado' });
      return;
    }

    try {
      set({ isLoading: true, error: null });
      
      const response = await fetch(`/api/energy-data/uploads/${uploadId}`, {
        headers: {
          Authorization: `Bearer ${authState.token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Falha ao verificar status do upload');
      }

      const uploadStatus = await response.json();
      set({ 
        currentUpload: uploadStatus,
        isLoading: false 
      });
      
    } catch (error) {
      console.error('Get upload status error:', error);
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido ao verificar status do upload',
      });
    }
  },

  // Definir mês selecionado para filtragem
  setSelectedMonth: (month: string | null) => {
    set({ selectedMonth: month });
    
    // Se tivermos dados e um mês selecionado, filtrar os dados
    const { energyData, selectedDistributor } = get();
    if (energyData.length > 0) {
      let filtered = [...energyData];
      
      // Filtra por mês, se um mês for fornecido
      if (month !== null) {
        filtered = filtered.filter(item => item.referenceDate.includes(month));
      }
      
      // Filtra por distribuidora, se uma distribuidora estiver selecionada
      if (selectedDistributor !== null) {
        filtered = filtered.filter(item => item.distributorId === selectedDistributor);
      }
      
      set({ filteredData: filtered });
    }
  },

  // Definir distribuidora selecionada para filtragem
  setSelectedDistributor: (distributorId: string | null) => {
    set({ selectedDistributor: distributorId });
    
    // Se tivermos dados e uma distribuidora selecionada, filtrar os dados
    const { energyData, selectedMonth } = get();
    if (energyData.length > 0) {
      let filtered = [...energyData];
      
      // Filtra por distribuidora, se uma distribuidora for fornecida
      if (distributorId !== null) {
        filtered = filtered.filter(item => item.distributorId === distributorId);
      }
      
      // Filtra por mês, se um mês estiver selecionado
      if (selectedMonth !== null) {
        filtered = filtered.filter(item => item.referenceDate.includes(selectedMonth));
      }
      
      set({ filteredData: filtered });
    }
  },

  // Limpar mensagem de erro
  clearError: () => set({ error: null }),
}));
