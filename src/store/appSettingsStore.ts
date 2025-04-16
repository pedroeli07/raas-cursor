import { create } from 'zustand';
import { useAuthStore } from './authStore';

// Interface para representar os dados de configurações
export interface AppSetting {
  id: string;
  key: string;
  value: string;
  description?: string;
  type: 'number' | 'string' | 'boolean' | 'json';
  category: string;
  createdAt: Date;
  updatedAt: Date;
}

// Interface para tipar o valor de configurações conhecidas
interface AppSettingsValues {
  defaultDiscountRate: number; // Porcentagem padrão de desconto para clientes
  creditExpirationMonths: number; // Meses até expiração de créditos
  maintenanceMode: boolean; // Sistema em manutenção?
  billingDate: number; // Dia do mês para geração de faturas
  platformFeePercentage: number; // Taxa da plataforma (%)
  defaultGenerationQuota: number; // Quota padrão para novas alocações (%)
  minPaymentAmount: number; // Valor mínimo para emissão de fatura (em centavos)
}

// Interface para o store
interface AppSettingsStore {
  // Estado
  settings: AppSetting[];
  isLoading: boolean;
  error: string | null;
  
  // Ações
  fetchSettings: () => Promise<void>;
  fetchSettingsByCategory: (category: string) => Promise<void>;
  updateSetting: (key: string, value: string) => Promise<void>;
  getSetting: <K extends keyof AppSettingsValues>(
    key: K
  ) => AppSettingsValues[K] | null;
  getSettingRaw: (key: string) => string | null;
  clearError: () => void;
}

// Função para converter valores da string para o tipo correto
const convertSettingValue = (setting: AppSetting): any => {
  if (!setting) return null;
  
  switch (setting.type) {
    case 'number':
      return Number(setting.value);
    case 'boolean':
      return setting.value === 'true';
    case 'json':
      try {
        return JSON.parse(setting.value);
      } catch (e) {
        console.error(`Error parsing JSON setting ${setting.key}:`, e);
        return null;
      }
    case 'string':
    default:
      return setting.value;
  }
};

// Criação do store
export const useAppSettingsStore = create<AppSettingsStore>((set, get) => ({
  // Estado inicial
  settings: [],
  isLoading: false,
  error: null,

  // Buscar todas as configurações
  fetchSettings: async () => {
    const authState = useAuthStore.getState();
    if (!authState.token || !authState.isAuthenticated) {
      set({ error: 'Usuário não autenticado' });
      return;
    }

    try {
      set({ isLoading: true, error: null });
      
      const response = await fetch('/api/settings', {
        headers: {
          Authorization: `Bearer ${authState.token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Falha ao carregar configurações');
      }

      const data = await response.json();
      set({ 
        settings: data.settings,
        isLoading: false 
      });
    } catch (error) {
      console.error('Error fetching settings:', error);
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido ao carregar configurações',
      });
    }
  },

  // Buscar configurações por categoria
  fetchSettingsByCategory: async (category: string) => {
    const authState = useAuthStore.getState();
    if (!authState.token || !authState.isAuthenticated) {
      set({ error: 'Usuário não autenticado' });
      return;
    }

    try {
      set({ isLoading: true, error: null });
      
      const response = await fetch(`/api/settings?category=${category}`, {
        headers: {
          Authorization: `Bearer ${authState.token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `Falha ao carregar configurações da categoria ${category}`);
      }

      const data = await response.json();
      
      // Manter outras configurações e adicionar/atualizar apenas as da categoria
      const currentSettings = get().settings;
      const categorySettings = data.settings;
      
      const mergedSettings = [...currentSettings];
      
      // Atualizar ou adicionar novas configurações
      categorySettings.forEach((newSetting: AppSetting) => {
        const existingIndex = mergedSettings.findIndex(s => s.key === newSetting.key);
        if (existingIndex >= 0) {
          mergedSettings[existingIndex] = newSetting;
        } else {
          mergedSettings.push(newSetting);
        }
      });
      
      set({ 
        settings: mergedSettings,
        isLoading: false 
      });
    } catch (error) {
      console.error(`Error fetching ${category} settings:`, error);
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : `Erro desconhecido ao carregar configurações de ${category}`,
      });
    }
  },

  // Atualizar uma configuração
  updateSetting: async (key: string, value: string) => {
    const authState = useAuthStore.getState();
    if (!authState.token || !authState.isAuthenticated) {
      set({ error: 'Usuário não autenticado' });
      return;
    }

    try {
      set({ isLoading: true, error: null });
      
      // Encontrar a configuração atual para obter o ID correto
      const currentSetting = get().settings.find(s => s.key === key);
      
      if (!currentSetting) {
        throw new Error(`Configuração ${key} não encontrada`);
      }
      
      const response = await fetch(`/api/settings/${currentSetting.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authState.token}`,
        },
        body: JSON.stringify({ value }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `Falha ao atualizar configuração ${key}`);
      }

      const updatedSetting = await response.json();
      
      // Atualizar a configuração específica no array
      const updatedSettings = get().settings.map(setting => 
        setting.id === updatedSetting.id ? updatedSetting : setting
      );
      
      set({ 
        settings: updatedSettings,
        isLoading: false 
      });
    } catch (error) {
      console.error(`Error updating setting ${key}:`, error);
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : `Erro desconhecido ao atualizar configuração ${key}`,
      });
    }
  },

  // Obter valor de configuração com tipo correto
  getSetting: <K extends keyof AppSettingsValues>(key: K): AppSettingsValues[K] | null => {
    const setting = get().settings.find(s => s.key === key);
    if (!setting) return null;
    return convertSettingValue(setting);
  },

  // Obter valor bruto de configuração (string)
  getSettingRaw: (key: string): string | null => {
    const setting = get().settings.find(s => s.key === key);
    return setting ? setting.value : null;
  },

  // Limpar mensagem de erro
  clearError: () => set({ error: null }),
})); 