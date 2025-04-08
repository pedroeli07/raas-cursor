import { create } from 'zustand';
import { Invoice, InvoiceStatus } from '@/lib/types/app-types';
import { frontendLog as log } from '@/lib/logs/logger';



interface InvoiceState {
  // Estado
  invoices: Invoice[];
  userInvoices: Invoice[];
  selectedInvoice: Invoice | null;
  isLoading: boolean;
  error: string | null;

  // Ações
  fetchInvoices: (filters?: { status?: InvoiceStatus, month?: string }) => Promise<void>;
  fetchUserInvoices: (filters?: { status?: InvoiceStatus, month?: string }) => Promise<void>;
  fetchInvoiceById: (id: string) => Promise<void>;
  generateInvoice: (data: Partial<Invoice>) => Promise<void>;
  updateInvoiceStatus: (id: string, status: InvoiceStatus) => Promise<void>;
  resendInvoice: (id: string) => Promise<void>;
  selectInvoice: (id: string) => void;
  clearSelectedInvoice: () => void;
  setError: (error: string | null) => void;
}

export const useInvoiceStore = create<InvoiceState>((set, get) => ({
  // Estado inicial
  invoices: [],
  userInvoices: [],
  selectedInvoice: null,
  isLoading: false,
  error: null,

  // Buscar todas as faturas (admin)
  fetchInvoices: async (filters = {}) => {
    set({ isLoading: true, error: null });
    
    try {
      // Constrói os parâmetros de consulta com os filtros fornecidos
      const queryParams = new URLSearchParams();
      if (filters.status) queryParams.append('status', filters.status);
      if (filters.month) queryParams.append('month', filters.month);
      
      const queryString = queryParams.toString();
      const endpoint = `/api/invoices${queryString ? `?${queryString}` : ''}`;
      
      const response = await fetch(endpoint, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Falha ao buscar faturas');
      }
      
      const data = await response.json();
      
      set({ 
        invoices: data.invoices,
        isLoading: false 
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      log.error('Erro ao buscar faturas', { error: errorMessage });
      
      set({ 
        isLoading: false, 
        error: errorMessage
      });
    }
  },

  // Buscar faturas do usuário atual
  fetchUserInvoices: async (filters = {}) => {
    set({ isLoading: true, error: null });
    
    try {
      // Constrói os parâmetros de consulta com os filtros fornecidos
      const queryParams = new URLSearchParams();
      if (filters.status) queryParams.append('status', filters.status);
      if (filters.month) queryParams.append('month', filters.month);
      
      const queryString = queryParams.toString();
      const endpoint = `/api/users/me/invoices${queryString ? `?${queryString}` : ''}`;
      
      const response = await fetch(endpoint, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Falha ao buscar faturas do usuário');
      }
      
      const data = await response.json();
      
      set({ 
        userInvoices: data.invoices,
        isLoading: false 
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      log.error('Erro ao buscar faturas do usuário', { error: errorMessage });
      
      set({ 
        isLoading: false, 
        error: errorMessage
      });
    }
  },

  // Buscar fatura por ID
  fetchInvoiceById: async (id: string) => {
    set({ isLoading: true, error: null });
    
    try {
      const response = await fetch(`/api/invoices/${id}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Falha ao buscar detalhes da fatura');
      }
      
      const invoice = await response.json();
      
      set({ 
        selectedInvoice: invoice,
        isLoading: false 
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      log.error('Erro ao buscar detalhes da fatura', { error: errorMessage });
      
      set({ 
        isLoading: false, 
        error: errorMessage
      });
    }
  },

  // Gerar nova fatura
  generateInvoice: async (data: Partial<Invoice>) => {
    set({ isLoading: true, error: null });
    
    try {
      const response = await fetch('/api/invoices/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Falha ao gerar fatura');
      }
      
      const newInvoice = await response.json();
      const { invoices } = get();
      
      set({ 
        invoices: [...invoices, newInvoice],
        selectedInvoice: newInvoice,
        isLoading: false 
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      log.error('Erro ao gerar fatura', { error: errorMessage });
      
      set({ 
        isLoading: false, 
        error: errorMessage
      });
    }
  },

  // Atualizar status da fatura
  updateInvoiceStatus: async (id: string, status: InvoiceStatus) => {
    set({ isLoading: true, error: null });
    
    try {
      const response = await fetch(`/api/invoices/${id}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status }),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Falha ao atualizar status da fatura');
      }
      
      const updatedInvoice = await response.json();
      const { invoices, userInvoices, selectedInvoice } = get();
      
      // Atualizar na lista principal
      const updatedInvoices = invoices.map(invoice => 
        invoice.id === id ? updatedInvoice : invoice
      );
      
      // Atualizar na lista do usuário
      const updatedUserInvoices = userInvoices.map(invoice => 
        invoice.id === id ? updatedInvoice : invoice
      );
      
      // Atualizar fatura selecionada se for a mesma
      const updatedSelectedInvoice = 
        selectedInvoice && selectedInvoice.id === id 
          ? updatedInvoice 
          : selectedInvoice;
      
      set({ 
        invoices: updatedInvoices,
        userInvoices: updatedUserInvoices,
        selectedInvoice: updatedSelectedInvoice,
        isLoading: false 
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      log.error('Erro ao atualizar status da fatura', { error: errorMessage });
      
      set({ 
        isLoading: false, 
        error: errorMessage
      });
    }
  },

  // Reenviar fatura
  resendInvoice: async (id: string) => {
    set({ isLoading: true, error: null });
    
    try {
      const response = await fetch(`/api/invoices/${id}/resend`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Falha ao reenviar fatura');
      }
      
      // Não precisamos atualizar o estado, apenas notificar o sucesso
      set({ isLoading: false });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      log.error('Erro ao reenviar fatura', { error: errorMessage });
      
      set({ 
        isLoading: false, 
        error: errorMessage
      });
    }
  },

  // Selecionar fatura existente
  selectInvoice: (id: string) => {
    const { invoices, userInvoices } = get();
    
    // Procurar em ambas as listas
    const invoice = 
      invoices.find(i => i.id === id) || 
      userInvoices.find(i => i.id === id) || 
      null;
    
    set({ selectedInvoice: invoice });
  },

  // Limpar fatura selecionada
  clearSelectedInvoice: () => {
    set({ selectedInvoice: null });
  },

  // Definir mensagem de erro
  setError: (error: string | null) => {
    set({ error });
  }
})); 