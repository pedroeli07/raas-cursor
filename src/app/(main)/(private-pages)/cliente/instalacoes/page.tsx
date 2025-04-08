'use client';

import React, { useState, useEffect } from 'react';

export default function ClienteInstalacoesPage() {
  // Estado para armazenar informações do usuário
  const [userInfo, setUserInfo] = useState({
    id: '',
    name: '',
    email: '',
    role: ''
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simular carregamento das informações do usuário
    // Em um cenário real, isso viria de uma API
    setTimeout(() => {
      setUserInfo({
        id: 'cli456',
        name: 'Ana Oliveira',
        email: 'ana@exemplo.com',
        role: 'CUSTOMER'
      });
      setLoading(false);
    }, 500);
  }, []);

  // Dados mockados para a listagem
  const instalacoesMock = [
    { id: 1, endereco: 'Rua das Flores, 123, Belo Horizonte', distribuidora: 'CEMIG', capacidade: '20 kW', status: 'Ativa' },
    { id: 2, nome: 'Casa de Praia', endereco: 'Av. Beira Mar, 500, Guarapari', distribuidora: 'EDP', capacidade: '15 kW', status: 'Ativa' },
  ];

  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold text-gray-900">Minhas Instalações</h1>
      <p className="mt-2 text-gray-600">
        Acompanhe as instalações cadastradas para recebimento de créditos de energia.
      </p>
      
      {/* Informações do usuário */}
      {!loading && (
        <div className="mt-4 bg-blue-50 p-4 rounded-md">
          <h2 className="font-medium text-blue-800">Informações do Cliente</h2>
          <p className="text-sm text-blue-700">Nome: {userInfo.name}</p>
          <p className="text-sm text-blue-700">Email: {userInfo.email}</p>
          <p className="text-sm text-blue-700">ID: {userInfo.id}</p>
        </div>
      )}
      
      {/* Tabela de instalações */}
      <div className="mt-6 bg-white shadow overflow-hidden rounded-lg">
        <div className="px-4 py-5 border-b border-gray-200 sm:px-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900">
            Instalações Consumidoras
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            Para adicionar uma nova instalação, entre em contato com a administração pelo suporte.
          </p>
        </div>
        
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Identificação
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Endereço
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Distribuidora
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Capacidade
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Ações
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {instalacoesMock.map((instalacao) => (
              <tr key={instalacao.id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {instalacao.nome || `Instalação #${instalacao.id}`}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {instalacao.endereco}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {instalacao.distribuidora}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {instalacao.capacidade}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                    instalacao.status === 'Ativa' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {instalacao.status}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  <button className="text-indigo-600 hover:text-indigo-900 mr-4">Detalhes</button>
                  <button className="text-indigo-600 hover:text-indigo-900">Ver Fatura</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      {/* Seção de alocação de créditos */}
      <div className="mt-8">
        <h2 className="text-xl font-semibold text-gray-900">Alocação de Créditos</h2>
        <p className="mt-2 text-gray-600">
          Veja como seus créditos estão distribuídos entre suas instalações.
        </p>
        
        <div className="mt-4 bg-white p-6 rounded-lg shadow">
          <p className="text-center text-gray-500">
            Esta seção mostrará a distribuição de créditos entre suas instalações (a ser implementado).
          </p>
        </div>
      </div>
      
      {/* Suporte */}
      <div className="mt-8 bg-white p-4 rounded-lg shadow">
        <h2 className="text-lg font-medium text-gray-900">Precisa de ajuda?</h2>
        <p className="mt-2 text-sm text-gray-600">
          Entre em contato com nosso suporte para solicitar novas instalações ou tirar dúvidas.
        </p>
        <button className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700">
          Abrir Chamado de Suporte
        </button>
      </div>
    </div>
  );
}
