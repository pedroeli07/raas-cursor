// Path: src/app/(main)/(auth)/register/page.tsx

'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { jwtDecode } from "jwt-decode";
import { frontendLog as log } from '@/lib/logs/logger';

// Interface para o token decodificado
interface DecodedToken {
  userId: string;
  email: string;
  role: string;
  iat?: number;
  exp?: number;
}

export default function RegisterPage() {
  const router = useRouter();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    if (password !== confirmPassword) {
      setError('As senhas não coincidem.');
      return;
    }

    setLoading(true);

    try {
      log.debug('Submitting registration form', { 
        name, 
        email, 
        passwordLength: password.length 
      });

      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name, email, password }),
      });

      const data = await response.json();

      log.debug('Registration response received', { 
        status: response.status,
        data: process.env.NODE_ENV === 'development' ? data : undefined,
        requiresVerification: !!data.requiresVerification
      });

      if (!response.ok) {
        if (data.status === 'pending_approval') {
          setSuccess(data.message || 'Solicitação recebida com sucesso.');
          setEmail('');
          setLoading(false);
          return;
        }
        throw new Error(data.message || 'Falha no registro.');
      }

      // Registro bem-sucedido, mas requer verificação
      setSuccess('Registro quase concluído! Enviamos um email para você verificar sua conta.');
      
      // Limpar o formulário
      setName('');
      setEmail('');
      setPassword('');
      setConfirmPassword('');
      
      // Se a resposta indica que precisa de verificação e tem ID
      if (data.requiresVerification && data.id) {
        log.info('Redirecting to email verification page', { userId: data.id });
        
        setTimeout(() => {
          router.push(`/verify-email?userId=${data.id}`);
        }, 2000); // Delay para mostrar a mensagem
      } else {
        // Fallback - Algo deu errado, redirecionar para login
        log.warn('Registration successful but no verification needed or no userId returned', { data });
        setError('Ocorreu um problema. Tente fazer login.');
        setTimeout(() => {
          router.push('/login');
        }, 3000);
      }

    } catch (err) {
      log.error('Registration error', { 
        error: err instanceof Error ? err.message : String(err) 
      });
      setError(err instanceof Error ? err.message : 'Ocorreu um erro inesperado.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-200px)]">
      <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-lg shadow-md">
        <h2 className="text-2xl font-bold text-center text-gray-900">Criar Conta</h2>
        <p className="text-sm text-gray-600 text-center">
          Preencha os dados abaixo para criar sua conta.
          Se já possui um convite, você poderá acessar imediatamente.
          Caso contrário, entraremos em contato.
        </p>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700">Nome Completo</label>
            <input
              id="name"
              name="name"
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            />
          </div>
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700">Email</label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700">Senha</label>
            <input
              id="password"
              name="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            />
          </div>
          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">Confirmar Senha</label>
            <input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            />
          </div>
          {error && (
            <p className="text-sm text-red-600">{error}</p>
          )}
          {success && (
            <p className="text-sm text-green-600">{success}</p>
          )}
          <div>
            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
            >
              {loading ? 'Processando...' : 'Registrar'}
            </button>
          </div>
        </form>
        
        <div className="text-sm text-center">
          <Link href="/login" className="font-medium text-indigo-600 hover:text-indigo-500">
            Já tem uma conta? Fazer login
          </Link>
        </div>
      </div>
    </div>
  );
}