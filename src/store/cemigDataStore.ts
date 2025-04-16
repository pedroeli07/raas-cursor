import { create } from 'zustand';
import { useAuthStore } from './authStore';
import { createLogger } from '@/lib/utils/logger';
import { InvoiceData } from '@/lib/models/energy-data';

const logger = createLogger('CemigDataStore');

// Interface para representar os dados processados do Excel da Cemig
export interface CemigRecord {
  installationNumber: string;
  period: string;
  consumption: number;
  generation: number;
  compensation: number;
  transferred: number;
  received: number;
  previousBalance: number;
  currentBalance: number;
  expiringAmount: number;
  expirationPeriod: string;
  type: 'GENERATOR' | 'CONSUMER';
  quota: number;
  errorMessage?: string;
}

export interface Invoice {
  id: string;
  description: string;
  issueDate: string;
  dueDate: string;
  amount: number;
  status: 'pending' | 'paid' | 'overdue';
  customerName?: string;
  installationNumber?: string;
  referenceMonth?: string;
}

export interface CemigDataStore {
  // Estado
  uploadedData: CemigRecord[];
  processedData: CemigRecord[];
  selectedMonth: string | null;
  selectedDistributor: string | null;
  selectedInstallation: string | null;
  isLoading: boolean;
  error: string | null;
  
  // Invoice data
  invoices: Invoice[];
  renterInvoices: Invoice[];
  
  // Energy data
  cemigData: CemigRecord[];
  
  // Ações
  uploadCemigData: (file: File, referenceMonth: string, distributorId: string) => Promise<void>;
  setProcessedData: (data: CemigRecord[]) => void;
  setSelectedMonth: (month: string | null) => void;
  setSelectedInstallation: (installationId: string | null) => void;
  setSelectedDistributor: (distributorId: string | null) => void;
  clearError: () => void;
  
  // Actions
  setInvoices: (invoices: Invoice[]) => void;
  setRenterInvoices: (invoices: Invoice[]) => void;
  setCemigData: (data: CemigRecord[]) => void;
  
  // Helper methods
  addInvoice: (invoice: Invoice) => void;
  updateInvoice: (id: string, data: Partial<Invoice>) => void;
  removeInvoice: (id: string) => void;
  
  // Fetch methods
  fetchInvoices: () => Promise<void>;
  fetchRenterInvoices: () => Promise<void>;
  fetchCemigData: () => Promise<void>;
}

export const useCemigDataStore = create<CemigDataStore>((set, get) => ({
  // Estado inicial
  uploadedData: [],
  processedData: [],
  selectedMonth: null,
  selectedDistributor: null,
  selectedInstallation: null,
  isLoading: false,
  error: null,
  
  // Invoice data inicialmente vazia
  invoices: [],
  renterInvoices: [],
  cemigData: [],
  
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

      const result = await response.json();
      
      set({ 
        isLoading: false 
      });
      
      // Atualizar dados após upload bem-sucedido
      get().fetchCemigData();
      
    } catch (error) {
      console.error('Upload error:', error);
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido no upload do arquivo',
      });
    }
  },

  // Definir mês selecionado para filtragem
  setSelectedMonth: (month: string | null) => {
    set({ selectedMonth: month });
  },

  // Definir distribuidora selecionada para filtragem
  setSelectedDistributor: (distributorId: string | null) => {
    set({ selectedDistributor: distributorId });
  },

  // Limpar mensagem de erro
  clearError: () => set({ error: null }),
  
  // Actions
  setInvoices: (invoices) => set({ invoices }),
  setRenterInvoices: (renterInvoices) => set({ renterInvoices }),
  setCemigData: (data) => set({ cemigData: data }),
  
  // Helper methods
  addInvoice: (invoice) => set((state) => ({ 
    invoices: [...state.invoices, invoice] 
  })),
  
  updateInvoice: (id, data) => set((state) => ({
    invoices: state.invoices.map((invoice) => 
      invoice.id === id ? { ...invoice, ...data } : invoice
    )
  })),
  
  removeInvoice: (id) => set((state) => ({
    invoices: state.invoices.filter((invoice) => invoice.id !== id)
  })),

  // Definir dados processados
  setProcessedData: (data) => set({ processedData: data }),
  
  // Definir instalação selecionada
  setSelectedInstallation: (installationId) => set({ selectedInstallation: installationId }),
  
  // Buscar faturas de clientes
  fetchInvoices: async () => {
    try {
      set({ isLoading: true, error: null });
      
      const response = await fetch('/api/invoices');
      
      if (!response.ok) {
        throw new Error('Falha ao buscar faturas');
      }
      
      const invoices = await response.json();
      
      // Transformar dados da API para o formato da store
      const formattedInvoices: Invoice[] = invoices.map((inv: any) => ({
        id: inv.id,
        description: `Fatura de energia solar - ${inv.referenceMonth}`,
        issueDate: new Date(inv.issueDate).toLocaleDateString('pt-BR'),
        dueDate: new Date(inv.dueDate).toLocaleDateString('pt-BR'),
        amount: inv.invoiceAmount || 0,
        status: inv.status,
        customerName: inv.customerName,
        installationNumber: inv.installationNumber,
        referenceMonth: inv.referenceMonth
      }));
      
      set({ 
        invoices: formattedInvoices,
        isLoading: false 
      });
      
      logger.info(`Carregadas ${formattedInvoices.length} faturas`);
      
    } catch (error) {
      logger.error('Erro ao buscar faturas:', error);
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido ao buscar faturas',
      });
    }
  },
  
  // Buscar faturas de locadores de energia (renter)
  fetchRenterInvoices: async () => {
    try {
      set({ isLoading: true, error: null });
      
      const response = await fetch('/api/invoices?type=renter');
      
      if (!response.ok) {
        throw new Error('Falha ao buscar faturas de locadores');
      }
      
      const invoices = await response.json();
      
      // Transformar dados da API para o formato da store
      const formattedInvoices: Invoice[] = invoices.map((inv: any) => ({
        id: inv.id,
        description: `Fatura de aluguel de energia - ${inv.referenceMonth}`,
        issueDate: new Date(inv.issueDate).toLocaleDateString('pt-BR'),
        dueDate: new Date(inv.dueDate).toLocaleDateString('pt-BR'),
        amount: inv.invoiceAmount || 0,
        status: inv.status,
        customerName: inv.customerName,
        installationNumber: inv.installationNumber,
        referenceMonth: inv.referenceMonth
      }));
      
      set({ 
        renterInvoices: formattedInvoices,
        isLoading: false 
      });
      
      logger.info(`Carregadas ${formattedInvoices.length} faturas de locadores`);
      
    } catch (error) {
      logger.error('Erro ao buscar faturas de locadores:', error);
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido ao buscar faturas de locadores',
      });
    }
  },
  
  // Buscar dados da CEMIG
  fetchCemigData: async () => {
    try {
      set({ isLoading: true, error: null });
      
      const response = await fetch('/api/energy-data');
      
      if (!response.ok) {
        throw new Error('Falha ao buscar dados da CEMIG');
      }
      
      const data = await response.json();
      
      // Transformar dados da API para o formato da store
      const cemigRecords: CemigRecord[] = data.map((record: any) => ({
        installationNumber: record.installationNumber,
        period: record.period,
        consumption: record.consumption || 0,
        generation: record.generation || 0,
        compensation: record.compensation || 0,
        transferred: record.transferred || 0,
        received: record.received || 0,
        previousBalance: record.previousBalance || 0,
        currentBalance: record.currentBalance || 0,
        expiringAmount: record.expiringBalanceAmount || 0,
        expirationPeriod: record.expiringBalancePeriod || "",
        type: record.type || "CONSUMER",
        quota: record.quota || 100
      }));
      
      set({ 
        cemigData: cemigRecords,
        isLoading: false 
      });
      
      logger.info(`Carregados ${cemigRecords.length} registros de dados da CEMIG`);
      
    } catch (error) {
      logger.error('Erro ao buscar dados da CEMIG:', error);
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido ao buscar dados da CEMIG',
      });
    }
  }
}));
