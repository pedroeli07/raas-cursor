'use client';

import React, { useState, useEffect } from 'react';

export default function ClienteFaturasPage() {
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
  const faturasMock = [
    { 
      id: 1, 
      referencia: 'Janeiro/2023', 
      vencimento: '10/01/2023', 
      valor: 'R$ 245,80', 
      consumo: '320 kWh',
      creditos: '125 kWh',
      status: 'Paga' 
    },
    { 
      id: 2, 
      referencia: 'Fevereiro/2023', 
      vencimento: '10/02/2023', 
      valor: 'R$ 256,30', 
      consumo: '350 kWh',
      creditos: '150 kWh',
      status: 'Paga' 
    },
    { 
      id: 3, 
      referencia: 'Março/2023', 
      vencimento: '10/03/2023', 
      valor: 'R$ 187,50', 
      consumo: '310 kWh',
      creditos: '180 kWh',
      status: 'Em aberto' 
    },
  ];

  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold text-gray-900">Minhas Faturas</h1>
      <p className="mt-2 text-gray-600">
        Acompanhe suas faturas e a economia gerada pelos créditos solares.
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
      
      {/* Tabela de faturas */}
      <div className="mt-6 bg-white shadow overflow-hidden rounded-lg">
        <div className="px-4 py-5 border-b border-gray-200 sm:px-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900">
            Histórico de Faturas
          </h3>
        </div>
        
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Referência
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Vencimento
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Consumo
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Créditos
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Valor
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
            {faturasMock.map((fatura) => (
              <tr key={fatura.id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {fatura.referencia}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {fatura.vencimento}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {fatura.consumo}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {fatura.creditos}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {fatura.valor}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                    fatura.status === 'Paga' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {fatura.status}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  <button className="text-indigo-600 hover:text-indigo-900 mr-4">Visualizar</button>
                  <button className="text-indigo-600 hover:text-indigo-900">Baixar PDF</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      {/* Resumo de economia */}
      <div className="mt-8">
        <h2 className="text-xl font-semibold text-gray-900">Resumo de Economia</h2>
        <p className="mt-2 text-gray-600">
          Economia gerada pelos créditos solares.
        </p>
        
        <div className="mt-4 bg-white p-6 rounded-lg shadow">
          <div className="mb-4">
            <h3 className="text-lg font-medium text-gray-900">Economia no último mês</h3>
            <p className="text-2xl font-bold text-green-600">R$ 116,20</p>
          </div>
          
          <div className="mb-4">
            <h3 className="text-lg font-medium text-gray-900">Economia acumulada no ano</h3>
            <p className="text-2xl font-bold text-green-600">R$ 1.250,30</p>
          </div>
          
          <p className="text-sm text-gray-500 mt-4">
            * Valores estimados com base no kWh vigente da distribuidora.
          </p>
        </div>
      </div>
      
      {/* Suporte */}
      <div className="mt-8 bg-white p-4 rounded-lg shadow">
        <h2 className="text-lg font-medium text-gray-900">Precisa de ajuda?</h2>
        <p className="mt-2 text-sm text-gray-600">
          Entre em contato com nosso suporte para esclarecer dúvidas sobre suas faturas.
        </p>
        <button className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700">
          Abrir Chamado de Suporte
        </button>
      </div>
    </div>
  );
}
