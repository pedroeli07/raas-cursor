'use client';

import React from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
// import Link from 'next/link';
import log from '@/lib/logs/logger';

export default function UnauthorizedPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const from = searchParams.get('from') || '/';

  // Log the unauthorized access attempt
  React.useEffect(() => {
    log.warn('[FRONTEND] User accessed unauthorized page', { 
      redirectedFrom: from 
    });
  }, [from]);

  const handleBack = () => {
    // Get user's dashboard based on role from localStorage
    const token = localStorage.getItem('auth_token');
    if (!token) {
      router.push('/login');
      return;
    }

    try {
      // Decode token to get role
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const payload = JSON.parse(window.atob(base64));
      const role = payload.role;

      // Redirect to appropriate dashboard
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
      log.error('[FRONTEND] Error decoding token in unauthorized page', { error });
      router.push('/login');
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-200px)]">
      <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-lg shadow-md">
        <div className="text-center">
          <svg
            className="mx-auto h-16 w-16 text-red-500"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
          <h2 className="mt-2 text-2xl font-bold text-gray-900">Acesso Não Autorizado</h2>
          <p className="mt-2 text-sm text-gray-600">
            Você não tem permissão para acessar esta página.
          </p>
        </div>
        <div className="mt-6 flex justify-center">
          <button
            onClick={handleBack}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            Voltar para Dashboard
          </button>
        </div>
      </div>
    </div>
  );
} 