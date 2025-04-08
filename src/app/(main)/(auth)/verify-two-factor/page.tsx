'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { frontendLog as log } from '@/lib/logs/logger';
import { jwtDecode } from "jwt-decode";

// Interface para o token decodificado
interface DecodedToken {
  userId: string;
  email: string;
  role: string;
  iat?: number;
  exp?: number;
}

const VerifyTwoFactorPage = () => {
  const [code, setCode] = useState('');
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [verified, setVerified] = useState(false);

  const router = useRouter();
  const searchParams = useSearchParams();

  // Get userId from URL
  useEffect(() => {
    const userIdFromUrl = searchParams.get('userId');
    
    if (userIdFromUrl) {
      setUserId(userIdFromUrl);
      log.debug('Got userId from URL', { userId: userIdFromUrl });
    } else {
      setError('Não foi possível identificar seu usuário. Por favor, tente fazer login novamente.');
    }
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!userId) {
      setError('ID do usuário não encontrado. Por favor, retorne à página de login.');
      return;
    }
    
    if (!code || code.length < 6) {
      setError('Por favor, insira o código de verificação completo.');
      return;
    }
    
    setLoading(true);
    setError(null);
    setMessage(null);
    
    try {
      log.debug('Submitting 2FA verification code', { 
        userId, 
        code: process.env.NODE_ENV === 'development' ? code : '******' 
      });
      
      const response = await fetch('/api/auth/verify-two-factor', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId, code }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Falha ao verificar o código.');
      }
      
      setVerified(true);
      setMessage('Autenticação bem-sucedida! Você será redirecionado.');
      
      // Save the token to localStorage
      if (data.token) {
        localStorage.setItem('auth_token', data.token);
        // Também definir o cookie para o middleware
        document.cookie = `auth_token=${data.token}; path=/; max-age=3600; SameSite=Strict`;
        log.info('Two-factor verification successful, token saved');
        
        // Redirect to dashboard after a delay
        setTimeout(() => {
          // Try to get role from token
          try {
            const token = data.token;
            const decoded = jwtDecode(token) as DecodedToken;
            const role = decoded.role;
            
            // Redirect based on role
            if (role === 'SUPER_ADMIN' || role === 'ADMIN' || role === 'ADMIN_STAFF') {
              router.push('/admin/dashboard');
            } else if (role === 'CUSTOMER') {
              router.push('/cliente/dashboard');
            } else if (role === 'ENERGY_RENTER') {
              router.push('/locador/dashboard');
            } else {
              router.push('/dashboard');
            }
          } catch (error) {
            // If role can't be determined, go to default dashboard
            router.push('/dashboard');
          }
        }, 2000);
      } else {
        // If no token is returned, go to login page
        setTimeout(() => {
          router.push('/login');
        }, 2000);
      }
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Ocorreu um erro inesperado.';
      log.error('Error during two-factor verification', { error: errorMessage });
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleResendCode = async () => {
    if (!userId) {
      setError('ID do usuário não encontrado. Por favor, retorne à página de login.');
      return;
    }
    
    setLoading(true);
    setError(null);
    setMessage('Enviando novo código...');
    
    try {
      log.debug('Requesting new 2FA code', { userId });
      
      const response = await fetch('/api/auth/resend-verification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId, type: 'LOGIN' }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Falha ao reenviar o código.');
      }
      
      setMessage('Um novo código de verificação foi enviado para seu email.');
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Ocorreu um erro inesperado.';
      log.error('Error resending 2FA code', { error: errorMessage });
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  if (!userId) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-200px)]">
        <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-lg shadow-md">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900">Verificação de Dois Fatores</h2>
            <p className="mt-2 text-sm text-red-600">
              Não foi possível identificar seu usuário. Por favor, retorne à página de login.
            </p>
            <div className="mt-4">
              <Link href="/login" className="text-indigo-600 hover:text-indigo-500">
                Voltar para o Login
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-200px)]">
      <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-lg shadow-md">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900">Verificação de Dois Fatores</h2>
          <p className="mt-2 text-sm text-gray-600">
            Enviamos um código de verificação para seu email. 
            Por favor, insira o código abaixo para continuar o login.
          </p>
        </div>
        
        {!verified ? (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="code" className="block text-sm font-medium text-gray-700">
                Código de Verificação
              </label>
              <input
                id="code"
                name="code"
                type="text"
                maxLength={6}
                required
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/[^0-9]/g, ''))}
                placeholder="Insira o código de 6 dígitos"
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                disabled={loading || verified}
              />
            </div>
            
            {error && (
              <p className="text-sm text-red-600" role="alert">
                {error}
              </p>
            )}
            
            {message && (
              <p className="text-sm text-green-600" role="status">
                {message}
              </p>
            )}
            
            <div className="flex flex-col space-y-4">
              <button
                type="submit"
                disabled={loading || verified || code.length < 6}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Verificando...' : 'Verificar'}
              </button>
              
              <button
                type="button"
                onClick={handleResendCode}
                disabled={loading || verified}
                className="w-full flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Reenviar Código
              </button>
            </div>
          </form>
        ) : (
          <div className="text-center">
            <svg
              className="mx-auto h-12 w-12 text-green-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
            <p className="mt-2 text-lg font-medium text-gray-900">
              Autenticação bem-sucedida!
            </p>
            <p className="mt-1 text-sm text-gray-600">
              Você será redirecionado para o dashboard em instantes.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default VerifyTwoFactorPage; 