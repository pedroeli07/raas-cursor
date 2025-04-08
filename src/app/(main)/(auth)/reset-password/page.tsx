'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import log from '@/lib/logs/logger';

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isTokenValid, setIsTokenValid] = useState<boolean | null>(null);
  const [tokenChecking, setTokenChecking] = useState(true);

  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  // Validate token on page load
  useEffect(() => {
    async function validateToken() {
      if (!token) {
        log.warn('[FRONTEND] Reset password attempted without token');
        setIsTokenValid(false);
        setError('Token de redefinição não encontrado.');
        setTokenChecking(false);
        return;
      }

      try {
        log.debug('[FRONTEND] Validating reset password token');
        const response = await fetch(`/api/auth/validate-token?token=${token}`);
        const data = await response.json();

        if (!response.ok) {
          log.warn('[FRONTEND] Reset token validation failed', { status: response.status });
          setIsTokenValid(false);
          setError(data.message || 'Token inválido ou expirado.');
        } else {
          log.info('[FRONTEND] Reset token validation successful');
          setIsTokenValid(true);
        }
      } catch (err: unknown) {
        log.error('[FRONTEND] Error validating reset token', { 
          error: err instanceof Error ? err.message : String(err) 
        });
        setIsTokenValid(false);
        setError('Não foi possível validar o token. Tente novamente mais tarde.');
      } finally {
        setTokenChecking(false);
      }
    }

    validateToken();
  }, [token]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setMessage(null);

    // Validate passwords
    if (password !== confirmPassword) {
      setError('As senhas não coincidem.');
      return;
    }

    if (password.length < 8) {
      setError('A senha deve ter pelo menos 8 caracteres.');
      return;
    }

    setLoading(true);

    try {
      log.debug('[FRONTEND] Submitting password reset');
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        log.error('[FRONTEND] Password reset failed', { 
          status: response.status, 
          message: data.message 
        });
        throw new Error(data.message || 'Falha ao redefinir a senha.');
      }

      log.info('[FRONTEND] Password reset successful');
      setMessage('Sua senha foi redefinida com sucesso. Você será redirecionado para a página de login.');
      
      // Redirect to login after a short delay
      setTimeout(() => {
        router.push('/login');
      }, 3000);

    } catch (err: unknown) {
      log.error('[FRONTEND] Error during password reset', { 
        error: err instanceof Error ? err.message : String(err) 
      });
      setError(err instanceof Error ? err.message : 'Ocorreu um erro inesperado.');
    } finally {
      setLoading(false);
    }
  };

  // Show loading state
  if (tokenChecking) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-200px)]">
        <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-lg shadow-md">
          <div className="text-center">
            <p className="text-gray-600">Verificando token de redefinição...</p>
          </div>
        </div>
      </div>
    );
  }

  // Show error if token is invalid
  if (!isTokenValid) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-200px)]">
        <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-lg shadow-md">
          <div className="text-center">
            <svg 
              className="mx-auto h-12 w-12 text-red-500" 
              fill="none" 
              viewBox="0 0 24 24" 
              stroke="currentColor"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth="2" 
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" 
              />
            </svg>
            <h2 className="mt-2 text-xl font-semibold text-gray-900">Link Inválido</h2>
            <p className="mt-2 text-gray-600">{error || 'O link de redefinição de senha é inválido ou expirou.'}</p>
            <div className="mt-6">
              <Link 
                href="/forgot-password"
                className="text-indigo-600 hover:text-indigo-500"
              >
                Solicitar um novo link
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Main form for valid token
  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-200px)]">
      <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-lg shadow-md">
        <h2 className="text-2xl font-bold text-center text-gray-900">Redefinir Senha</h2>
        <p className="text-center text-sm text-gray-600">
          Digite sua nova senha abaixo.
        </p>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700">Nova Senha</label>
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
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">Confirmar Nova Senha</label>
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
          {message && (
            <p className="text-sm text-green-600">{message}</p>
          )}
          <div>
            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
            >
              {loading ? 'Processando...' : 'Redefinir Senha'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
} 