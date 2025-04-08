// Path: src/app/(main)/(private-pages)/admin/usuarios/page.tsx

'use client';

import React, { useState, useEffect } from 'react';
import { frontendLog as log } from '@/lib/logs/logger';
import { Role } from '@prisma/client';

interface Invitation {
  id: string;
  email: string;
  name?: string;
  role: string;
  status: string;
  createdAt: string;
  expiresAt: string;
}

const roleOptions = [
  { value: Role.ADMIN, label: 'Administrador' },
  { value: Role.ADMIN_STAFF, label: 'Equipe Administrativa' },
  { value: Role.CUSTOMER, label: 'Cliente' },
  { value: Role.ENERGY_RENTER, label: 'Locador de Energia' }
];

export default function ConvitesPage() {
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Novo convite
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<Role>(Role.CUSTOMER);
  const [sending, setSending] = useState(false);

  // Carregar convites
  useEffect(() => {
    fetchInvitations();
  }, []);

  const fetchInvitations = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/invite');
      
      if (!response.ok) {
        throw new Error(`Erro ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      setInvitations(data.invitations || []);
    } catch (err) {
      setError('Erro ao carregar convites: ' + (err instanceof Error ? err.message : String(err)));
      log.error('Error loading invitations', { error: err });
    } finally {
      setLoading(false);
    }
  };

  const handleSendInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email) {
      setError('Por favor, informe um email.');
      return;
    }
    
    try {
      setSending(true);
      setError(null);
      setSuccess(null);
      
      const response = await fetch('/api/invite', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          name: name || undefined, // Só enviar se não estiver vazio
          role
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `Erro ${response.status}`);
      }
      
      const data = await response.json();
      
      setSuccess(`Convite enviado com sucesso para ${email}!`);
      setEmail('');
      setName('');
      setRole(Role.CUSTOMER);
      
      // Atualizar a lista de convites
      fetchInvitations();
      
    } catch (err) {
      setError('Erro ao enviar convite: ' + (err instanceof Error ? err.message : String(err)));
      log.error('Error sending invitation', { error: err });
    } finally {
      setSending(false);
    }
  };
  
  const getRoleLabel = (roleValue: string) => {
    const option = roleOptions.find(opt => opt.value === roleValue);
    return option ? option.label : roleValue;
  };
  
  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };
  
  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'PENDING': return 'Pendente';
      case 'ACCEPTED': return 'Aceito';
      case 'REVOKED': return 'Revogado';
      case 'EXPIRED': return 'Expirado';
      default: return status;
    }
  };
  
  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'PENDING': return 'bg-yellow-100 text-yellow-800';
      case 'ACCEPTED': return 'bg-green-100 text-green-800';
      case 'REVOKED': return 'bg-red-100 text-red-800';
      case 'EXPIRED': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Gerenciamento de Convites</h1>
      
      {/* Formulário de novo convite */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-8">
        <h2 className="text-xl font-semibold mb-4">Enviar Novo Convite</h2>
        
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
        
        <form onSubmit={handleSendInvite} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              Email *
            </label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              required
            />
          </div>
          
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
              Nome (opcional)
            </label>
            <input
              type="text"
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>
          
          <div>
            <label htmlFor="role" className="block text-sm font-medium text-gray-700 mb-1">
              Papel no Sistema *
            </label>
            <select
              id="role"
              value={role}
              onChange={(e) => setRole(e.target.value as Role)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              required
            >
              {roleOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          
          <div>
            <button
              type="submit"
              disabled={sending}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {sending ? 'Enviando...' : 'Enviar Convite'}
            </button>
          </div>
        </form>
      </div>
      
      {/* Lista de convites */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold mb-4">Convites Enviados</h2>
        
        {loading ? (
          <p className="text-gray-500">Carregando convites...</p>
        ) : invitations.length === 0 ? (
          <p className="text-gray-500">Nenhum convite encontrado.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nome</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Papel</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Criado em</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Expira em</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {invitations.map((invitation) => (
                  <tr key={invitation.id}>
                    <td className="px-6 py-4 whitespace-nowrap">{invitation.email}</td>
                    <td className="px-6 py-4 whitespace-nowrap">{invitation.name || '-'}</td>
                    <td className="px-6 py-4 whitespace-nowrap">{getRoleLabel(invitation.role)}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 rounded-full text-xs ${getStatusBadgeColor(invitation.status)}`}>
                        {getStatusLabel(invitation.status)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">{formatDate(invitation.createdAt)}</td>
                    <td className="px-6 py-4 whitespace-nowrap">{formatDate(invitation.expiresAt)}</td>
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