// Path: src/app/(main)/(auth)/login/page.tsx

'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { jwtDecode } from "jwt-decode";
import Link from 'next/link';
import { frontendLog as log } from '@/lib/logs/logger';

// Interface para o token decodificado
interface DecodedToken {
  userId: string;
  email: string;
  role: string;
  iat?: number;
  exp?: number;
}

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setLoading(true);

    try {
      log.debug('Submitting login form', { email });

      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      log.debug('Login response received', { 
        status: response.status,
        requiresEmailVerification: !!data.requiresEmailVerification,
        requiresTwoFactor: !!data.requiresTwoFactor,
        hasToken: !!data.token,
        message: data.message,
        userId: data.userId
      });

      if (!response.ok) {
        throw new Error(data.message || 'Login failed');
      }

      // Check if we need to verify email first
      if (data.requiresEmailVerification) {
        log.info('Email verification required', { userId: data.userId });
        // Save userId temporarily for email verification
        if (data.userId) {
          // Redirect to email verification page
          router.push(`/verify-email?userId=${data.userId}`);
          return;
        }
      }

      // Check if we need 2FA
      if (data.requiresTwoFactor) {
        log.info('Two-factor authentication required', { userId: data.userId });
        // Save userId temporarily for 2FA verification
        if (data.userId) {
          // Redirect to 2FA verification page
          router.push(`/verify-two-factor?userId=${data.userId}`);
          return;
        }
      }

      // Se chegamos aqui, é um login normal sem 2FA
      // Save the token to localStorage and cookies
      if (data.token) {
        // Armazenar o token no localStorage
        localStorage.setItem('auth_token', data.token);
        
        // Armazenar o token em um cookie para o middleware
        document.cookie = `auth_token=${data.token}; path=/; max-age=3600; SameSite=Strict`;
        
        log.info('Login successful, token saved', { email });

        // Decode token to get user role
        try {
          const decoded = jwtDecode<DecodedToken>(data.token);
          const userRole = decoded.role;

          log.info('User authenticated', { 
            userId: decoded.userId,
            role: userRole
          });

          // Redirect based on role
          if (userRole === 'SUPER_ADMIN' || userRole === 'ADMIN' || userRole === 'ADMIN_STAFF') {
            router.push('/admin/dashboard');
          } else if (userRole === 'CUSTOMER') {
            router.push('/cliente/dashboard');
          } else if (userRole === 'ENERGY_RENTER') {
            router.push('/locador/dashboard');
          } else {
            // Fallback para o caso de um papel desconhecido
            router.push('/dashboard');
          }
        } catch (decodeError) {
          log.error('Failed to decode token', { error: decodeError });
          setError("Login successful, but failed to process user role.");
          // Fallback - mantenha na página de login
          router.push('/login');
        }

      } else {
        throw new Error("Token not received from server");
      }

    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred.';
      log.error('Login error', { error: errorMessage });
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-200px)]"> 
      <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-lg shadow-md">
        <h2 className="text-2xl font-bold text-center text-gray-900">Login RaaS Solar</h2>
        <form onSubmit={handleSubmit} className="space-y-6">
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
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            />
          </div>
          <div className="flex items-center justify-between">
            <div className="text-sm">
              <Link href="/forgot-password" className="font-medium text-indigo-600 hover:text-indigo-500">
                Esqueceu sua senha?
              </Link>
            </div>
          </div>
          {error && (
            <p className="text-sm text-red-600">{error}</p>
          )}
          <div>
            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
            >
              {loading ? 'Entrando...' : 'Entrar'}
            </button>
          </div>
        </form>
        <div className="text-sm text-center">
          <Link href="/register" className="font-medium text-indigo-600 hover:text-indigo-500">
            Ainda não tem uma conta? Criar agora
          </Link>
        </div>
      </div>
    </div>
  );
}
