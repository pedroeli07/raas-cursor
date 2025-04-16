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
    
    // Retry configuration
    const maxRetries = 3;
    let retryCount = 0;
    
    while (retryCount < maxRetries) {
      try {
        const response = await fetch('/api/distributors', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
          // Add cache: 'no-store' to prevent caching issues
          cache: 'no-store',
        });
        
        // Log detalhado da resposta HTTP
        log.debug('[fetchDistributors] Resposta HTTP recebida', { 
          status: response.status, 
          statusText: response.statusText, 
          ok: response.ok 
        });
        
        if (!response.ok) {
          // Log do corpo da resposta em caso de erro, antes de tentar o JSON parse
          const errorText = await response.text();
          log.error('[fetchDistributors] Resposta de erro da API (texto bruto)', { errorText });
          
          let errorData;
          try {
            errorData = JSON.parse(errorText);
          } catch (parseError) {
            log.error('[fetchDistributors] Falha ao parsear JSON da resposta de erro', { parseError });
            errorData = { message: errorText }; // Usa o texto bruto se não for JSON
          }
          
          throw new Error(errorData.message || 'Falha ao buscar distribuidoras');
        }
        
        const data = await response.json();
        
        // Log dos dados brutos recebidos da API após o parse JSON
        log.debug('[fetchDistributors] Dados brutos recebidos da API (JSON parseado):', data);
        
        // Verificar se data existe e se possui a propriedade distributors
        if (!data || typeof data !== 'object' || !('distributors' in data)) {
          log.error('[fetchDistributors] Estrutura de dados inesperada recebida da API', { receivedData: data });
          throw new Error('Dados de distribuidoras não encontrados ou em formato inválido na resposta da API');
        }

        // Verificar se data.distributors é um array
        if (!Array.isArray(data.distributors)) {
          log.error('[fetchDistributors] data.distributors não é um array', { receivedDistributors: data.distributors });
          throw new Error('Formato inválido para a lista de distribuidoras na resposta da API');
        }
        
        // Mapear os dados para o formato esperado pelo frontend
        const mappedDistributors = data.distributors.map((distributor: Distributor) => {
          // Extrair o preço mais recente dos kwhPrices (se disponível)
          let pricePerKwh = 0;
          
          if (distributor.kwhPrices && distributor.kwhPrices.length > 0) {
            // Ordenar por data de início mais recente
            const sortedPrices = [...distributor.kwhPrices].sort(
              (a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime()
            );
            
            // Obter o preço mais recente e converter de centavos para reais
            if (sortedPrices[0] && typeof sortedPrices[0].price === 'number') {
              pricePerKwh = sortedPrices[0].price / 1000; // Converter de inteiro (centavos) para decimal
            }
          }
          
          // Log de debug para verificação
          log.debug(`Mapeando distribuidora ${distributor.name}:`, { 
            original: distributor,
            mappedPrice: pricePerKwh 
          });
          
          // Retornar objeto com o formato esperado pelo frontend
          return {
            ...distributor,
            pricePerKwh
          };
        });
        
        set({ 
          distributors: mappedDistributors,
          isLoading: false 
        });
        
        // If successful, break out of the retry loop
        return;
        
      } catch (error) {
        retryCount++;
        
        // Specific handling for network connectivity issues
        if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
          log.error('Erro de conexão ao buscar distribuidoras', { 
            error, 
            retry: `${retryCount}/${maxRetries}` 
          });
          
          // Only set error if we've exhausted all retries
          if (retryCount >= maxRetries) {
            const errorMessage = 'Erro de conexão com o servidor. Verifique sua conexão com a internet.';
            log.error(errorMessage, { error });
            
            set({ 
              isLoading: false, 
              error: errorMessage
            });
          } else {
            // Wait before retrying (exponential backoff)
            await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, retryCount)));
          }
        } else {
          // For other types of errors, log and set error state immediately
          const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
          log.error('Erro ao buscar distribuidoras', { error: errorMessage });
          
          set({ 
            isLoading: false, 
            error: errorMessage
          });
          
          // Don't retry for non-network errors
          break;
        }
      }
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
      // Log dos dados recebidos
      log.debug('Dados recebidos para criar distribuidora:', data);
      
      // Adaptação para mapear campos
      const payload = {
        ...data,
        pricePerKwh: data.pricePerKwh // Mapeando pricePerKwh para price_per_kwh
      };
      
      log.debug('Payload adaptado para API:', payload);
      
      const response = await fetch('/api/distributors', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
        cache: 'no-store',
      });
      
      if (!response.ok) {
        const error = await response.json();
        log.error('Resposta de erro da API:', error);
        throw new Error(error.message || 'Falha ao criar distribuidora');
      }
      
      const responseData = await response.json();
      const newDistributor = responseData.distributor || responseData;
      const { distributors } = get();
      
      // Adicionar a nova distribuidora na lista imediatamente
      log.debug('Nova distribuidora criada:', newDistributor);
      
      const updatedDistributorsList = [...distributors, {
        ...newDistributor,
        pricePerKwh: data.pricePerKwh, // Garantir que o preço seja exibido corretamente
      }];
      
      set({ 
        distributors: updatedDistributorsList,
        selectedDistributor: newDistributor,
        isLoading: false 
      });
      
      // Fazer um re-fetch após um breve atraso para garantir que temos os dados mais atualizados
      setTimeout(() => {
        const { fetchDistributors } = get();
        fetchDistributors().catch(err => {
          log.warn('Erro ao atualizar lista de distribuidoras após criação:', err);
        });
      }, 500);
      
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
      // Log dos dados recebidos
      log.debug('Dados recebidos para atualizar distribuidora:', data);
      
      // Adaptação para mapear campos
      const payload = {
        ...data,
        pricePerKwh: data.pricePerKwh // Mapeando pricePerKwh para price_per_kwh
      };
      
      log.debug('Payload adaptado para API:', payload);
      
      const response = await fetch(`/api/distributors/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });
      
      if (!response.ok) {
        const error = await response.json();
        log.error('Resposta de erro da API:', error);
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
      console.log('[STORE] Initiating distributor deletion', { id });
      log.info('Iniciando exclusão de distribuidora', { id });
      
      const response = await fetch(`/api/distributors/${id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      console.log('[STORE] Received response from API for distributor deletion', { 
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
          throw new Error(errorData.message || 'Falha ao excluir distribuidora');
        } catch (parseError) {
          console.error('[STORE] Could not parse error response:', { 
            parseError, 
            responseText: await response.text() 
          });
          throw new Error(`Falha ao excluir distribuidora: ${response.status} ${response.statusText}`);
        }
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
      
      console.log('[STORE] Distributor deleted successfully', { id });
      log.info('Distribuidora excluída com sucesso', { id });
      
      set({ 
        distributors: updatedDistributors,
        selectedDistributor: newSelectedDistributor,
        isLoading: false 
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      console.error('[STORE] Error deleting distributor', { 
        error: errorMessage, 
        id,
        stack: error instanceof Error ? error.stack : undefined
      });
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