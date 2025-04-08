import React from 'react';
import Link from 'next/link';

// Componente simples de Navbar
const Navbar = () => {
  return (
    <nav className="bg-gray-800 p-4 text-white">
      <div className="container mx-auto flex justify-between items-center">
        <Link href="/" className="text-xl font-bold">RaaS Solar</Link>
        <div>
          {/* Links de Navegação - Adicionar mais conforme necessário */}
          <Link href="/dashboard" className="px-3 hover:text-gray-300">Dashboard</Link>
          <Link href="/login" className="px-3 hover:text-gray-300">Login</Link>
          <Link href="/register" className="px-3 hover:text-gray-300">Register</Link>
          <Link href="/invite" className="px-3 hover:text-gray-300">Convidar Usuário</Link>
          {/* Adicionar Link de Logout aqui eventualmente */}
        </div>
      </div>
    </nav>
  );
};

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-grow container mx-auto p-6">
        {children}
      </main>
      <footer className="bg-gray-200 p-4 text-center text-sm text-gray-600">
        © {new Date().getFullYear()} RaaS Solar. Todos os direitos reservados.
      </footer>
    </div>
  );
} 