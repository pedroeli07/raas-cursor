'use client';

import React, { useState, useEffect } from 'react';

export default function LocadorDashboardPage() {
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
        id: 'loc123',
        name: 'Carlos Silveira',
        email: 'carlos@exemplo.com',
        role: 'ENERGY_RENTER'
      });
      setLoading(false);
    }, 500);
  }, []);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold text-gray-900">Dashboard do Locador</h1>
      <p className="mt-2 text-gray-600">
        Bem-vindo ao painel de controle do locador. Aqui você poderá monitorar suas usinas geradoras de energia.
      </p>
      
      {/* Informações do usuário */}
      {!loading && (
        <div className="mt-4 bg-blue-50 p-4 rounded-md">
          <h2 className="font-medium text-blue-800">Informações do Usuário</h2>
          <p className="text-sm text-blue-700">Nome: {userInfo.name}</p>
          <p className="text-sm text-blue-700">Email: {userInfo.email}</p>
          <p className="text-sm text-blue-700">Função: Locador de Usina Solar</p>
        </div>
      )}
      
      {/* Cards informativos */}
      <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-green-500 rounded-md p-3">
                <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Geração Total</dt>
                  <dd className="text-lg font-semibold text-gray-900">2.350 kWh</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-blue-500 rounded-md p-3">
                <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Instalações Ativas</dt>
                  <dd className="text-lg font-semibold text-gray-900">3</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-yellow-500 rounded-md p-3">
                <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Créditos Distribuídos</dt>
                  <dd className="text-lg font-semibold text-gray-900">1.890 kWh</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Área para futuros gráficos */}
      <div className="mt-8">
        <h2 className="text-lg font-medium text-gray-900">Histórico de Geração</h2>
        <div className="mt-4 h-64 bg-white p-4 rounded-lg shadow">
          <p className="text-center text-gray-500 pt-16">Gráfico de geração mensal (placeholder)</p>
        </div>
      </div>
      
      {/* Suporte */}
      <div className="mt-8 bg-white p-4 rounded-lg shadow">
        <h2 className="text-lg font-medium text-gray-900">Precisa de ajuda?</h2>
        <p className="mt-2 text-sm text-gray-600">
          Entre em contato com nosso suporte para solicitar novos cadastros ou tirar dúvidas.
        </p>
        <button className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700">
          Abrir Chamado de Suporte
        </button>
      </div>
    </div>
  );
}
