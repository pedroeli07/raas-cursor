// Path: src/app/(main)/(auth)/layout.tsx
import React, { ReactNode } from 'react';
import Image from 'next/image';
// import Image from 'next/image'; // Importar quando for usar uma logo

interface AuthLayoutProps {
  children: ReactNode;
}

export default function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="bg-white shadow-sm py-4 px-6">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="text-xl font-semibold text-indigo-600">
            RaaS Solar
            {/* Opcional: Adicionar logo quando disponível */}
            <Image 
              src="/logo.png" 
              alt="RaaS Solar" 
              width={120} 
              height={40} 
              priority 
            /> 
          </div>
        </div>
      </header>

      {/* Conteúdo principal */}
      <main className="flex-grow flex items-center justify-center bg-gray-50">
        <div className="w-full max-w-md">
          {children}
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white py-4 px-6 border-t">
        <div className="max-w-7xl mx-auto text-center text-sm text-gray-500">
          &copy; {new Date().getFullYear()} RaaS Solar. Todos os direitos reservados.
        </div>
      </footer>
    </div>
  );
}
