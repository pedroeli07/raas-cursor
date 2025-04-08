// path: /admin/distribuidoras

'use client';

import React, { useState, useEffect } from 'react';
import { frontendLog as log } from '@/lib/logs/logger';

interface Distributor {
  id: string;
  name: string;
  price_per_kwh: number;
  createdAt: string;
  updatedAt: string;
}

export default function DistribuidorasPage() {
  const [distributors, setDistributors] = useState<Distributor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Formulário
  const [name, setName] = useState('');
  const [pricePerKwh, setPricePerKwh] = useState('');
  const [submitting, setSubmitting] = useState(false);
  
  // Endereço da distribuidora
  const [street, setStreet] = useState('');
  const [number, setNumber] = useState('');
  const [complement, setComplement] = useState('');
  const [neighborhood, setNeighborhood] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [zip, setZip] = useState('');

  // Carregar distribuidoras
  useEffect(() => {
    fetchDistributors();
  }, []);

  const fetchDistributors = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/distributors');
      
      if (!response.ok) {
        throw new Error(`Erro ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      setDistributors(data.distributors || []);
    } catch (err) {
      setError('Erro ao carregar distribuidoras: ' + (err instanceof Error ? err.message : String(err)));
      log.error('Error loading distributors', { error: err });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name || !pricePerKwh || !street || !number || !neighborhood || !city || !state || !zip) {
      setError('Por favor, preencha todos os campos obrigatórios.');
      return;
    }
    
    try {
      setSubmitting(true);
      setError(null);
      setSuccess(null);
      
      const priceValue = parseFloat(pricePerKwh.replace(',', '.'));
      
      if (isNaN(priceValue) || priceValue <= 0) {
        setError('O preço por kWh deve ser um número válido maior que zero.');
        setSubmitting(false);
        return;
      }
      
      const payload = {
        name,
        price_per_kwh: priceValue,
        address: {
          street,
          number,
          complement: complement || undefined,
          neighborhood,
          city,
          state,
          zip,
          type: "DISTRIBUTOR"
        }
      };
      
      const response = await fetch('/api/distributors', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `Erro ${response.status}`);
      }
      
      const data = await response.json();
      
      setSuccess(`Distribuidora "${name}" cadastrada com sucesso!`);
      
      // Limpar formulário
      setName('');
      setPricePerKwh('');
      setStreet('');
      setNumber('');
      setComplement('');
      setNeighborhood('');
      setCity('');
      setState('');
      setZip('');
      
      // Atualizar lista
      fetchDistributors();
      
    } catch (err) {
      setError('Erro ao cadastrar distribuidora: ' + (err instanceof Error ? err.message : String(err)));
      log.error('Error creating distributor', { error: err });
    } finally {
      setSubmitting(false);
    }
  };
  
  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };
  
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { 
      style: 'currency', 
      currency: 'BRL',
      minimumFractionDigits: 2,
      maximumFractionDigits: 5
    }).format(value);
  };

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Gerenciamento de Distribuidoras</h1>
      
      {/* Formulário de cadastro */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-8">
        <h2 className="text-xl font-semibold mb-4">Cadastrar Nova Distribuidora</h2>
        
        {error && (
          <div className="bg-red-50 text-red-700 p-3 rounded-md mb-4">
            {error}
          </div>
        )}
        
        {success && (
          <div className="bg-green-50 text-green-700 p-3 rounded-md mb-4">
            {success}
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                Nome da Distribuidora *
              </label>
              <input
                type="text"
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                required
              />
            </div>
            
            <div>
              <label htmlFor="pricePerKwh" className="block text-sm font-medium text-gray-700 mb-1">
                Preço por kWh (R$) *
              </label>
              <input
                type="text"
                id="pricePerKwh"
                value={pricePerKwh}
                onChange={(e) => setPricePerKwh(e.target.value)}
                placeholder="0,00"
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                required
              />
            </div>
          </div>
          
          <h3 className="text-lg font-medium mt-4 mb-2">Endereço da Distribuidora</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="street" className="block text-sm font-medium text-gray-700 mb-1">
                Rua/Avenida *
              </label>
              <input
                type="text"
                id="street"
                value={street}
                onChange={(e) => setStreet(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                required
              />
            </div>
            
            <div>
              <label htmlFor="number" className="block text-sm font-medium text-gray-700 mb-1">
                Número *
              </label>
              <input
                type="text"
                id="number"
                value={number}
                onChange={(e) => setNumber(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                required
              />
            </div>
            
            <div>
              <label htmlFor="complement" className="block text-sm font-medium text-gray-700 mb-1">
                Complemento
              </label>
              <input
                type="text"
                id="complement"
                value={complement}
                onChange={(e) => setComplement(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>
            
            <div>
              <label htmlFor="neighborhood" className="block text-sm font-medium text-gray-700 mb-1">
                Bairro *
              </label>
              <input
                type="text"
                id="neighborhood"
                value={neighborhood}
                onChange={(e) => setNeighborhood(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                required
              />
            </div>
            
            <div>
              <label htmlFor="city" className="block text-sm font-medium text-gray-700 mb-1">
                Cidade *
              </label>
              <input
                type="text"
                id="city"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                required
              />
            </div>
            
            <div>
              <label htmlFor="state" className="block text-sm font-medium text-gray-700 mb-1">
                Estado *
              </label>
              <input
                type="text"
                id="state"
                value={state}
                onChange={(e) => setState(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                required
              />
            </div>
            
            <div>
              <label htmlFor="zip" className="block text-sm font-medium text-gray-700 mb-1">
                CEP *
              </label>
              <input
                type="text"
                id="zip"
                value={zip}
                onChange={(e) => setZip(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                required
              />
            </div>
          </div>
          
          <div>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {submitting ? 'Cadastrando...' : 'Cadastrar Distribuidora'}
            </button>
          </div>
        </form>
      </div>
      
      {/* Lista de distribuidoras */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold mb-4">Distribuidoras Cadastradas</h2>
        
        {loading ? (
          <p className="text-gray-500">Carregando distribuidoras...</p>
        ) : distributors.length === 0 ? (
          <p className="text-gray-500">Nenhuma distribuidora cadastrada.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nome</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Preço por kWh</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Data de Cadastro</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ações</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {distributors.map((distributor) => (
                  <tr key={distributor.id}>
                    <td className="px-6 py-4 whitespace-nowrap">{distributor.name}</td>
                    <td className="px-6 py-4 whitespace-nowrap">{formatCurrency(distributor.price_per_kwh)}</td>
                    <td className="px-6 py-4 whitespace-nowrap">{formatDate(distributor.createdAt)}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <button 
                        className="text-blue-600 hover:text-blue-800"
                        onClick={() => alert('Função de editar ainda não implementada')}
                      >
                        Editar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
} 