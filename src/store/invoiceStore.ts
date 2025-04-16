import { create } from 'zustand';
import { Invoice, InvoiceStatus } from '@/lib/types/app-types';
import { frontendLog as log } from '@/lib/logs/logger';
import { INVOICE_STATUS } from '@/lib/constants/invoice';

export interface FormattedInvoice { // Define a type for the frontend format
  id: string;
  customerName?: string;
  userId?: string;
  installationNumber?: string;
  installationId?: string;
  distributorId?: string;
  referenceMonth?: string;
  dueDate?: Date; // Use Date object
  invoiceAmount?: number | null; // Optional number
  totalAmount?: number | null; // Optional number
  savings?: number | null; // Optional number
  savingsPercentage?: number | null; // Optional number
  discountPercentage?: number | null; // Optional number
  status?: InvoiceStatus;
  isPaid?: boolean;
  invoiceNumber?: string | null; // Optional string
  paidAt?: Date | null; // Optional Date
  createdAt?: Date; // Use Date object
  description?: string | null; // Optional string
  billingAddress?: string | null; // Optional string
  createdBy?: string | null; // Optional string
}

interface InvoiceState {
  // Estado
  invoices: FormattedInvoice[]; // Use the frontend format
  userInvoices: FormattedInvoice[]; // Use the frontend format
  selectedInvoice: FormattedInvoice | null;
  isLoading: boolean;
  error: string | null;

  // Ações
  fetchInvoices: (filters?: { 
    status?: InvoiceStatus | 'all', 
    userId?: string, 
    installationId?: string,
    startDate?: Date,
    endDate?: Date,
    referencePeriodPreset?: string,
    referenceStartDate?: Date,
    referenceEndDate?: Date,
    minAmount?: number,
    maxAmount?: number
  }) => Promise<void>;
  fetchUserInvoices: (filters?: { status?: InvoiceStatus, month?: string }) => Promise<void>;
  fetchInvoiceById: (id: string) => Promise<FormattedInvoice | null>; // Return fetched invoice or null
  generateInvoice: (data: Partial<Invoice>) => Promise<void>;
  updateInvoice: (id: string, data: Partial<FormattedInvoice>) => Promise<FormattedInvoice | null>; // For saving changes from [id] page
  markAsPaid: (id: string) => Promise<void>;
  deleteInvoice: (id: string) => Promise<void>;
  resendInvoice: (id: string) => Promise<void>;
  selectInvoice: (id: string) => void;
  clearSelectedInvoice: () => void;
  setError: (error: string | null) => void;
  initiateInvoice: (customerId: string) => Promise<string>; // Returns the ID
}

// Helper function to format API response to frontend type
const formatApiInvoice = (apiInvoice: any): FormattedInvoice => {
  if (!apiInvoice) return {} as FormattedInvoice; // Handle null/undefined input
  return {
    id: apiInvoice.id,
    customerName: apiInvoice.customerName,
    userId: apiInvoice.userId,
    installationNumber: apiInvoice.installationNumber,
    installationId: apiInvoice.installationId,
    distributorId: apiInvoice.distributorId,
    referenceMonth: apiInvoice.referenceMonth,
    dueDate: apiInvoice.dueDate ? new Date(apiInvoice.dueDate) : undefined,
    invoiceAmount: apiInvoice.invoiceAmount,
    totalAmount: apiInvoice.totalAmount,
    savings: apiInvoice.savings,
    savingsPercentage: apiInvoice.savingsPercentage,
    discountPercentage: apiInvoice.discountPercentage,
    status: apiInvoice.status as InvoiceStatus,
    isPaid: apiInvoice.isPaid,
    invoiceNumber: apiInvoice.invoiceNumber,
    paidAt: apiInvoice.paidAt ? new Date(apiInvoice.paidAt) : null,
    createdAt: apiInvoice.createdAt ? new Date(apiInvoice.createdAt) : undefined,
    description: apiInvoice.description,
    billingAddress: apiInvoice.billingAddress,
    createdBy: apiInvoice.createdBy
  };
};

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
    log.info('[STORE] Fetching invoices with filters', filters);
    try {
      const queryParams = new URLSearchParams();
      // Append filters carefully
      if (filters.status && filters.status !== 'all') queryParams.append('status', filters.status);
      if (filters.userId) queryParams.append('userId', filters.userId);
      if (filters.installationId) queryParams.append('installationId', filters.installationId);
      if (filters.startDate) queryParams.append('startDate', filters.startDate.toISOString());
      if (filters.endDate) queryParams.append('endDate', filters.endDate.toISOString());
      if (filters.minAmount !== undefined) queryParams.append('minAmount', filters.minAmount.toString());
      if (filters.maxAmount !== undefined) queryParams.append('maxAmount', filters.maxAmount.toString());
      // TODO: Handle referencePeriodPreset, referenceStartDate, referenceEndDate if backend supports them

      const queryString = queryParams.toString();
      const endpoint = `/api/invoices${queryString ? `?${queryString}` : ''}`;
      log.debug('[STORE] Fetching invoices endpoint', { endpoint });

      const response = await fetch(endpoint, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include'
      });
      
      if (response.status === 204 || response.headers.get('content-length') === '0') {
        log.info('[STORE] No invoices found with current filters.');
        set({ invoices: [], isLoading: false });
        return;
      }

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Falha ao buscar faturas');
      }
      
      const data = await response.json();
      // Ensure data.invoices is an array before mapping
      const fetchedApiInvoices = Array.isArray(data.invoices) ? data.invoices : [];
      const formatted = fetchedApiInvoices.map(formatApiInvoice);
      log.info('[STORE] Fetched and formatted invoices', { count: formatted.length });
      
      set({ 
        invoices: formatted, 
        isLoading: false 
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      if (!errorMessage.includes('Falha ao buscar faturas')) {
         log.error('Erro ao buscar faturas', { error: errorMessage });
      }
      
      set({ 
        isLoading: false, 
        error: errorMessage.includes('Falha ao buscar faturas') ? null : errorMessage 
      });
    }
  },

  // Buscar faturas do usuário atual
  fetchUserInvoices: async (filters = {}) => {
    set({ isLoading: true, error: null });
    
    try {
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
        credentials: 'include'
      });
      
      if (response.status === 204 || response.headers.get('content-length') === '0') {
        log.info('Nenhuma fatura encontrada com os filtros atuais.');
        set({ 
          userInvoices: [],
          isLoading: false 
        });
        return;
      }

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Falha ao buscar faturas do usuário');
      }
      
      const data = await response.json();
      
      set({ 
        userInvoices: Array.isArray(data.invoices) ? data.invoices : [], 
        isLoading: false 
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      if (!errorMessage.includes('Falha ao buscar faturas')) {
         log.error('Erro ao buscar faturas do usuário', { error: errorMessage });
      }
      
      set({ 
        isLoading: false, 
        error: errorMessage.includes('Falha ao buscar faturas') ? null : errorMessage 
      });
    }
  },

  // Buscar fatura por ID
  fetchInvoiceById: async (id: string) => {
    set({ isLoading: true, error: null });
    log.info('[STORE] Fetching invoice by ID', { id });
    try {
      const response = await fetch(`/api/invoices/${id}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include'
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Falha ao buscar detalhes da fatura');
      }
      
      const apiInvoice = await response.json();
      const formatted = formatApiInvoice(apiInvoice);
      log.info('[STORE] Fetched invoice by ID', { invoiceId: formatted.id });
      
      set({ 
        selectedInvoice: formatted,
        isLoading: false 
      });
      return formatted; // Return the fetched invoice
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      log.error('Erro ao buscar detalhes da fatura', { error: errorMessage });
      
      set({ 
        isLoading: false, 
        error: errorMessage
      });
      set({ selectedInvoice: null });
      return null; // Return null on error
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
        credentials: 'include',
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

  // Atualizar fatura
  updateInvoice: async (id: string, dataToUpdate: Partial<FormattedInvoice>): Promise<FormattedInvoice | null> => {
    set({ isLoading: true, error: null });
    log.info('[STORE] Updating invoice', { id, dataToUpdate });
    try {
      // Convert frontend data format to API expected format if necessary
      // e.g., convert discount percentage back to decimal for API
      const apiPayload: Record<string, any> = { ...dataToUpdate }; 
      if (apiPayload.discountPercentage !== undefined && apiPayload.discountPercentage !== null) {
        apiPayload.discountPercentage = apiPayload.discountPercentage / 100;
      }
      if (apiPayload.savingsPercentage !== undefined && apiPayload.savingsPercentage !== null) {
        apiPayload.savingsPercentage = apiPayload.savingsPercentage / 100;
      }
      // Remove fields the API doesn't expect or cannot update
      delete apiPayload.id; 
      delete apiPayload.createdAt;
      delete apiPayload.userId; // Usually cannot change the user
      // ... remove other non-updatable fields ...

      const response = await fetch(`/api/invoices/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(apiPayload),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Falha ao atualizar fatura');
      }

      const result = await response.json();
      const updatedApiInvoice = result.invoice;
      const formatted = formatApiInvoice(updatedApiInvoice);
      log.info('[STORE] Invoice updated successfully', { invoiceId: formatted.id });

      // Update state
      set(state => ({
        invoices: state.invoices.map(inv => inv.id === id ? formatted : inv),
        userInvoices: state.userInvoices.map(inv => inv.id === id ? formatted : inv),
        selectedInvoice: state.selectedInvoice?.id === id ? formatted : state.selectedInvoice,
        isLoading: false,
      }));

      return formatted;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      log.error('[STORE] Erro ao atualizar fatura', { id, error: errorMessage, details: error });
      set({ isLoading: false, error: errorMessage });
      throw error; // Re-throw
    }
  },

  // Mark invoice as paid (uses PATCH now, not specific status endpoint)
  markAsPaid: async (id: string) => {
    set({ isLoading: true, error: null });
    log.info('[STORE] Marking invoice as paid', { id });
    try {
      const response = await fetch(`/api/invoices/${id}`, { // Call the main PATCH endpoint
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ status: INVOICE_STATUS.PAID }), // Send status update
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Falha ao marcar fatura como paga');
      }

      const result = await response.json();
      const updatedApiInvoice = result.invoice;
      const formatted = formatApiInvoice(updatedApiInvoice);
      log.info('[STORE] Invoice marked as paid successfully', { invoiceId: formatted.id });
      
      // Update state
      set((state) => ({
        invoices: state.invoices.map(inv => inv.id === id ? formatted : inv),
        userInvoices: state.userInvoices.map(inv => inv.id === id ? formatted : inv),
        selectedInvoice: state.selectedInvoice?.id === id ? formatted : state.selectedInvoice,
        isLoading: false,
      }));

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      log.error('[STORE] Erro ao marcar fatura como paga', { id, error: errorMessage, details: error });
      set({ isLoading: false, error: errorMessage });
      throw error;
    }
  },

  // Delete invoice
  deleteInvoice: async (id: string) => {
    set({ isLoading: true, error: null });
    try {
      const response = await fetch(`/api/invoices/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Falha ao excluir fatura');
      }

      set((state) => ({
        invoices: state.invoices.filter(inv => inv.id !== id),
        userInvoices: state.userInvoices.filter(inv => inv.id !== id),
        selectedInvoice: state.selectedInvoice?.id === id ? null : state.selectedInvoice,
        isLoading: false,
      }));

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      log.error('Erro ao excluir fatura', { error: errorMessage });
      set({ isLoading: false, error: errorMessage });
      throw error;
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
        credentials: 'include',
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Falha ao reenviar fatura');
      }
      
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
  },

  // Iniciar nova fatura (cria uma fatura em rascunho)
  initiateInvoice: async (customerId: string): Promise<string> => {
    set({ isLoading: true, error: null });
    log.info('[STORE] Initiating invoice for customer', { customerId });
    
    try {
      const response = await fetch('/api/invoices/initiate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // Ensure auth token is sent if using a different mechanism for API calls
          // e.g., 'Authorization': `Bearer ${getToken()}` 
        },
        credentials: 'include',
        body: JSON.stringify({ customerId }),
      });
      
      log.debug('[STORE] Initiate API response status', { status: response.status });

      if (!response.ok) {
        let errorData = { message: 'Falha ao iniciar fatura' };
        try {
          // Try to parse specific error from backend
          errorData = await response.json();
          log.warn('[STORE] Initiate API failed', { status: response.status, errorData });
        } catch (parseError) {
          // If parsing fails, log the raw response text
          const text = await response.text();
          log.error('[STORE] Initiate API failed, could not parse JSON response', { status: response.status, responseText: text });
          errorData.message = `Falha na API (${response.status}): ${text.substring(0, 100)}`;
        }
        throw new Error(errorData.message || 'Falha ao iniciar fatura');
      }
      
      const result = await response.json();
      const newInvoiceId = result.id;
      
      if (!newInvoiceId) {
        log.error('[STORE] Initiate API success, but no ID returned', { result });
        throw new Error('ID da fatura não retornado pelo servidor');
      }
      
      log.info('[STORE] Fatura iniciada com sucesso', { invoiceId: newInvoiceId });
      
      set({ isLoading: false });
      return newInvoiceId;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      // Log the error with full details
      log.error('[STORE] Erro ao iniciar fatura', { 
        error: errorMessage,
        customerId,
        errorDetails: error // Log the original error object
      }); 
      
      set({ 
        isLoading: false, 
        error: errorMessage // Set user-friendly error message
      });
      
      // Re-throw the original error to be caught by the component
      throw error; 
    }
  }
})); 