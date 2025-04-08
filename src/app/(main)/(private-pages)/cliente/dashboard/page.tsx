'use client';

import React, { useState, useEffect } from 'react';

export default function ClienteDashboardPage() {
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

  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold text-gray-900">Dashboard do Cliente</h1>
      <p className="mt-2 text-gray-600">
        Bem-vindo ao seu painel. Aqui você poderá monitorar seu consumo de energia e créditos solares.
      </p>
      
      {/* Informações do usuário */}
      {!loading && (
        <div className="mt-4 bg-blue-50 p-4 rounded-md">
          <h2 className="font-medium text-blue-800">Informações do Usuário</h2>
          <p className="text-sm text-blue-700">Nome: {userInfo.name}</p>
          <p className="text-sm text-blue-700">Email: {userInfo.email}</p>
          <p className="text-sm text-blue-700">Função: Cliente Consumidor</p>
        </div>
      )}
      
      {/* Cards informativos */}
      <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-red-500 rounded-md p-3">
                <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Consumo Total</dt>
                  <dd className="text-lg font-semibold text-gray-900">450 kWh</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-green-500 rounded-md p-3">
                <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Créditos Recebidos</dt>
                  <dd className="text-lg font-semibold text-gray-900">380 kWh</dd>
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
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Economia na Fatura</dt>
                  <dd className="text-lg font-semibold text-gray-900">R$ 245,50</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Área para gráficos */}
      <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-2">
        <div>
          <h2 className="text-lg font-medium text-gray-900">Consumo vs. Créditos</h2>
          <div className="mt-4 h-64 bg-white p-4 rounded-lg shadow">
            <p className="text-center text-gray-500 pt-16">Gráfico de consumo e créditos (placeholder)</p>
          </div>
        </div>
        
        <div>
          <h2 className="text-lg font-medium text-gray-900">Economia Acumulada</h2>
          <div className="mt-4 h-64 bg-white p-4 rounded-lg shadow">
            <p className="text-center text-gray-500 pt-16">Gráfico de economia acumulada (placeholder)</p>
          </div>
        </div>
      </div>
      
      {/* Suporte */}
      <div className="mt-8 bg-white p-4 rounded-lg shadow">
        <h2 className="text-lg font-medium text-gray-900">Precisa de ajuda?</h2>
        <p className="mt-2 text-sm text-gray-600">
          Entre em contato com nosso suporte para esclarecer dúvidas sobre suas faturas ou créditos.
        </p>
        <button className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700">
          Abrir Chamado de Suporte
        </button>
      </div>
    </div>
  );
}
