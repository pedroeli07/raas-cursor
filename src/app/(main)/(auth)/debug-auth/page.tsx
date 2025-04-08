'use client';

import React, { useEffect, useState } from 'react';
import { frontendLog as log } from '@/lib/logs/logger';

export default function DebugAuthPage() {
  const [localStorageToken, setLocalStorageToken] = useState<string | null>(null);
  const [cookieToken, setCookieToken] = useState<string | null>(null);
  const [decodedToken, setDecodedToken] = useState<any | null>(null);
  
  // Função para extrair um cookie específico
  const getCookie = (name: string): string | null => {
    if (typeof document === 'undefined') return null;
    
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) {
      return parts.pop()?.split(';').shift() || null;
    }
    return null;
  };
  
  // Função para decodificar token JWT
  const decodeJWT = (token: string): any => {
    try {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(
        atob(base64).split('').map(function(c) {
          return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        }).join('')
      );
      return JSON.parse(jsonPayload);
    } catch (error) {
      console.error('Erro ao decodificar token', error);
      return null;
    }
  };
  
  useEffect(() => {
    // Checar localStorage
    const lsToken = localStorage.getItem('auth_token');
    setLocalStorageToken(lsToken);
    
    // Checar cookies
    const cookieAuthToken = getCookie('auth_token');
    setCookieToken(cookieAuthToken);
    
    // Decodificar o token se existir
    if (lsToken) {
      const decoded = decodeJWT(lsToken);
      setDecodedToken(decoded);
      log.debug('Tokens encontrados no cliente', { 
        hasLocalStorage: !!lsToken,
        hasCookie: !!cookieAuthToken,
        decodedPayload: decoded
      });
    }
  }, []);
  
  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <h1 className="text-2xl font-bold mb-4">Debug de Autenticação</h1>
      
      <div className="mb-6 p-4 bg-gray-100 rounded">
        <h2 className="text-xl font-semibold mb-2">Status dos Tokens</h2>
        <p><strong>Token no localStorage:</strong> {localStorageToken ? '✅ Presente' : '❌ Ausente'}</p>
        <p><strong>Token em cookie:</strong> {cookieToken ? '✅ Presente' : '❌ Ausente'}</p>
      </div>
      
      {decodedToken && (
        <div className="mb-6 p-4 bg-gray-100 rounded">
          <h2 className="text-xl font-semibold mb-2">Informações do Token</h2>
          <p><strong>User ID:</strong> {decodedToken.userId}</p>
          <p><strong>Email:</strong> {decodedToken.email}</p>
          <p><strong>Role:</strong> {decodedToken.role}</p>
          <p><strong>Expira em:</strong> {new Date(decodedToken.exp * 1000).toLocaleString()}</p>
        </div>
      )}
      
      <div className="mb-6 p-4 bg-gray-100 rounded">
        <h2 className="text-xl font-semibold mb-2">Token Raw</h2>
        <div className="overflow-x-auto">
          <pre className="text-xs bg-gray-200 p-2 rounded">
            {localStorageToken || 'Nenhum token encontrado no localStorage'}
          </pre>
        </div>
      </div>
      
      <div className="flex gap-4">
        <button 
          onClick={() => window.location.href = '/login'} 
          className="px-4 py-2 bg-blue-500 text-white rounded"
        >
          Ir para Login
        </button>
        <button 
          onClick={() => {
            localStorage.removeItem('auth_token');
            document.cookie = 'auth_token=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;';
            window.location.reload();
          }} 
          className="px-4 py-2 bg-red-500 text-white rounded"
        >
          Limpar Tokens
        </button>
      </div>
    </div>
  );
} 