'use client';

import { useState } from 'react';

export function LogoutButton() {
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    try {
      setIsLoggingOut(true);
      // Fazer uma requisição para a API de logout
      const response = await fetch('/api/auth/logout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        // Redirecionar para a página de login após logout bem-sucedido
        window.location.href = '/login';
      } else {
        console.error('Falha ao fazer logout');
        setIsLoggingOut(false);
      }
    } catch (error) {
      console.error('Erro ao fazer logout:', error);
      setIsLoggingOut(false);
    }
  };

  return (
    <button
      onClick={handleLogout}
      disabled={isLoggingOut}
      className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-400 focus:ring-opacity-75 disabled:opacity-70 disabled:cursor-not-allowed"
    >
      {isLoggingOut ? 'Saindo...' : 'Sair'}
    </button>
  );
} 