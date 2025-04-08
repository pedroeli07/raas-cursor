'use client';

import React, { useState, useEffect } from 'react';

export default function LocadorInstalacoesPage() {
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

  // Dados mockados para a listagem
  const instalacoesMock = [
    { id: 1, nome: 'Usina Solar 1', capacidade: '50 kW', localizacao: 'Zona Rural, Belo Horizonte', status: 'Ativa' },
    { id: 2, nome: 'Usina Solar 2', capacidade: '75 kW', localizacao: 'Fazenda Esperança, Betim', status: 'Ativa' },
    { id: 3, nome: 'Usina Solar 3', capacidade: '100 kW', localizacao: 'Região Norte, Contagem', status: 'Manutenção' },
  ];

  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold text-gray-900">Minhas Instalações Geradoras</h1>
      <p className="mt-2 text-gray-600">
        Visualize suas usinas de energia solar e acompanhe sua performance.
      </p>
      
      {/* Informações do usuário */}
      {!loading && (
        <div className="mt-4 bg-blue-50 p-4 rounded-md">
          <h2 className="font-medium text-blue-800">Informações do Locador</h2>
          <p className="text-sm text-blue-700">Nome: {userInfo.name}</p>
          <p className="text-sm text-blue-700">Email: {userInfo.email}</p>
          <p className="text-sm text-blue-700">ID: {userInfo.id}</p>
        </div>
      )}
      
      {/* Tabela de instalações */}
      <div className="mt-6 bg-white shadow overflow-hidden rounded-lg">
        <div className="px-4 py-5 border-b border-gray-200 sm:px-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900">
            Usinas de Geração
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            Para solicitar uma nova instalação, entre em contato com a administração pelo suporte.
          </p>
        </div>
        
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Nome
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Capacidade
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Localização
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
                  {instalacao.nome}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {instalacao.capacidade}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {instalacao.localizacao}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                    ${instalacao.status === 'Ativa' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                    {instalacao.status}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  <button className="text-indigo-600 hover:text-indigo-900 mr-4">Detalhes</button>
                  <button className="text-indigo-600 hover:text-indigo-900">Relatórios</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
