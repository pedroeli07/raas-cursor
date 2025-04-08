'use client';

import React, { useState, useCallback } from 'react';
import Link from 'next/link';
import log from '@/lib/logs/logger';

// Define an error interface for API responses
interface ApiError {
  message: string;
  [key: string]: unknown;
}

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      setError(null);
      setMessage(null);
      setLoading(true);

      // Basic email format validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        log.warn('[FRONTEND] Invalid email format', { email });
        setError('Por favor, insira um email válido.');
        setLoading(false);
        return;
      }

      try {
        log.debug('[FRONTEND] Submitting forgot password request', { email });

        const response = await fetch('/api/auth/forgot-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email }),
        });

        const data: ApiError | { message?: string } = await response.json();

        if (!response.ok) {
          log.error('[FRONTEND] Forgot password request failed', {
            status: response.status,
            message: data.message,
          });
          throw new Error(data.message || 'Falha ao solicitar redefinição de senha.');
        }

        log.info('[FRONTEND] Forgot password request submitted successfully', {
          status: response.status,
          message: data.message,
        });
        setMessage(
          data.message ||
            'Se um email associado a esta conta existir, um link de redefinição de senha foi enviado.',
        );
        setEmail(''); // Clear email field

      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : 'Ocorreu um erro inesperado.';
        log.error('[FRONTEND] Error during forgot password request', {
          error: errorMessage,
        });
        setError(errorMessage);
      } finally {
        setLoading(false);
      }
    },
    [email], // Dependência: função só é recriada se email mudar
  );

  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-200px)]">
      <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-lg shadow-md">
        <h2 className="text-2xl font-bold text-center text-gray-900">Esqueceu a Senha?</h2>
        <p className="text-center text-sm text-gray-600">
          Digite seu email e enviaremos um link para redefinir sua senha.
        </p>
        <form onSubmit={handleSubmit} className="space-y-6" aria-label="Formulário de redefinição de senha">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              placeholder="exemplo@dominio.com"
              aria-required="true"
              disabled={loading}
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
          <div>
            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
              aria-busy={loading ? 'true' : 'false'}
            >
              {loading ? 'Enviando...' : 'Enviar Link de Redefinição'}
            </button>
          </div>
        </form>
        <div className="text-sm text-center">
          <Link href="/login" className="font-medium text-indigo-600 hover:text-indigo-500">
            Voltar para o Login
          </Link>
        </div>
      </div>
    </div>
  );
}