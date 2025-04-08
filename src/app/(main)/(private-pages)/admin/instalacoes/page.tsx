// path: /admin/instalacoes

'use client';

import { useState, useEffect } from 'react';
import { InstallationType } from '@prisma/client';

// Tipos para as opções dos selects
type Distributor = {
  id: string;
  name: string;
};

type User = {
  id: string;
  name: string | null;
  email: string;
};

// Resultado da criação de instalação
type InstallationResult = {
  success: boolean;
  message: string;
};

// Função para criar uma nova instalação
async function createInstallation(formData: FormData): Promise<InstallationResult> {
  try {
    const response = await fetch('/api/installations', {
      method: 'POST',
      body: formData,
    });

    const data = await response.json();
    
    return {
      success: response.ok,
      message: data.message || (response.ok ? 'Instalação cadastrada com sucesso!' : 'Erro ao cadastrar instalação')
    };
  } catch (error) {
    console.error('[BACKEND] Erro ao processar requisição de instalação:', error);
    return {
      success: false,
      message: 'Ocorreu um erro ao processar a solicitação'
    };
  }
}

export default function AdminInstallationsPage() {
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [loading, setLoading] = useState(false);
  const [distributors, setDistributors] = useState<Distributor[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  // Carregar distribuidoras e usuários ao montar o componente
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Buscar distribuidoras
        const distributorsRes = await fetch('/api/distributors');
        const distributorsData = await distributorsRes.json();
        
        // Buscar usuários (apenas clientes e locadores)
        const usersRes = await fetch('/api/users?roles=CUSTOMER,ENERGY_RENTER');
        const usersData = await usersRes.json();
        
        if (distributorsData.success) {
          setDistributors(distributorsData.distributors);
        }
        
        if (usersData.success) {
          setUsers(usersData.users);
        }
      } catch (error) {
        console.error('Erro ao carregar dados:', error);
        setMessage({ text: 'Erro ao carregar dados de distribuidoras e usuários', type: 'error' });
      } finally {
        setLoadingData(false);
      }
    };

    fetchData();
  }, []);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      const formData = new FormData(e.currentTarget);
      const result = await createInstallation(formData);

      if (result.success) {
        setMessage({ text: result.message, type: 'success' });
        // Limpa o formulário
        e.currentTarget.reset();
      } else {
        setMessage({ text: result.message, type: 'error' });
      }
    } catch (error) {
      console.error('Erro ao criar instalação:', error);
      setMessage({ text: 'Erro ao processar a solicitação', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold text-foreground">Gerenciar Instalações</h1>
      </div>

      {message && (
        <div 
          className={`p-4 mb-6 rounded-md border ${
            message.type === 'success' 
              ? 'bg-green-100/10 border-green-500 text-green-500 dark:text-green-400' 
              : 'bg-red-100/10 border-red-500 text-red-500 dark:text-red-400'
          }`}
        >
          {message.text}
        </div>
      )}

      <section className="mb-8">
        <div className="bg-card rounded-lg shadow-sm border border-border p-6">
          <h2 className="text-xl font-medium mb-4 text-foreground">Cadastrar Nova Instalação</h2>
          
          {loadingData ? (
            <div className="text-center py-6">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
              <p className="mt-2 text-muted-foreground">Carregando dados...</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label htmlFor="installationNumber" className="block text-sm font-medium text-foreground mb-1">
                    Número da Instalação
                  </label>
                  <input 
                    type="text" 
                    id="installationNumber" 
                    name="installationNumber" 
                    required 
                    className="w-full px-3 py-2 bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary" 
                  />
                </div>
                
                <div>
                  <label htmlFor="type" className="block text-sm font-medium text-foreground mb-1">
                    Tipo
                  </label>
                  <select 
                    id="type" 
                    name="type" 
                    required 
                    className="w-full px-3 py-2 bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="">Selecione...</option>
                    <option value={InstallationType.GENERATOR}>Geradora</option>
                    <option value={InstallationType.CONSUMER}>Consumidora</option>
                  </select>
                </div>
                
                <div>
                  <label htmlFor="distributorId" className="block text-sm font-medium text-foreground mb-1">
                    Distribuidora
                  </label>
                  <select 
                    id="distributorId" 
                    name="distributorId" 
                    required 
                    className="w-full px-3 py-2 bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="">Selecione...</option>
                    {distributors.map(distributor => (
                      <option key={distributor.id} value={distributor.id}>
                        {distributor.name}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label htmlFor="ownerId" className="block text-sm font-medium text-foreground mb-1">
                    Proprietário
                  </label>
                  <select 
                    id="ownerId" 
                    name="ownerId" 
                    required 
                    className="w-full px-3 py-2 bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="">Selecione...</option>
                    {users.map(user => (
                      <option key={user.id} value={user.id}>
                        {user.name || 'Sem nome'} ({user.email})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              
              <fieldset className="border border-border p-5 rounded-md mt-6">
                <legend className="text-foreground px-2 font-medium">Endereço da Instalação</legend>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-2">
                  <div>
                    <label htmlFor="street" className="block text-sm font-medium text-foreground mb-1">Rua</label>
                    <input 
                      type="text" 
                      id="street" 
                      name="street" 
                      required 
                      className="w-full px-3 py-2 bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                  <div>
                    <label htmlFor="number" className="block text-sm font-medium text-foreground mb-1">Número</label>
                    <input 
                      type="text" 
                      id="number" 
                      name="number" 
                      required 
                      className="w-full px-3 py-2 bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                  <div>
                    <label htmlFor="complement" className="block text-sm font-medium text-foreground mb-1">Complemento</label>
                    <input 
                      type="text" 
                      id="complement" 
                      name="complement" 
                      className="w-full px-3 py-2 bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                  <div>
                    <label htmlFor="neighborhood" className="block text-sm font-medium text-foreground mb-1">Bairro</label>
                    <input 
                      type="text" 
                      id="neighborhood" 
                      name="neighborhood" 
                      required 
                      className="w-full px-3 py-2 bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                  <div>
                    <label htmlFor="city" className="block text-sm font-medium text-foreground mb-1">Cidade</label>
                    <input 
                      type="text" 
                      id="city" 
                      name="city" 
                      required 
                      className="w-full px-3 py-2 bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                  <div>
                    <label htmlFor="state" className="block text-sm font-medium text-foreground mb-1">Estado (UF)</label>
                    <input 
                      type="text" 
                      id="state" 
                      name="state" 
                      required 
                      maxLength={2} 
                      className="w-full px-3 py-2 bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                  <div>
                    <label htmlFor="zip" className="block text-sm font-medium text-foreground mb-1">CEP</label>
                    <input 
                      type="text" 
                      id="zip" 
                      name="zip" 
                      required 
                      className="w-full px-3 py-2 bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                </div>
              </fieldset>

              <div className="mt-6">
                <button 
                  type="submit" 
                  disabled={loading}
                  className="px-4 py-2 bg-primary hover:bg-primary-accent text-white transition-colors rounded-md focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center"
                >
                  {loading ? (
                    <>
                      <span className="inline-block h-4 w-4 border-2 border-white/20 border-t-white rounded-full animate-spin mr-2"></span>
                      <span>Cadastrando...</span>
                    </>
                  ) : 'Cadastrar Instalação'}
                </button>
              </div>
            </form>
          )}
        </div>
      </section>
    </div>
  );
} 