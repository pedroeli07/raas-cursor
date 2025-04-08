'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function NotFound() {
  const router = useRouter();
  
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 text-center p-4">
      <svg 
        className="w-16 h-16 text-yellow-500 mb-4" 
        fill="none" 
        stroke="currentColor" 
        viewBox="0 0 24 24" 
        xmlns="http://www.w3.org/2000/svg"
      >
        <path 
          strokeLinecap="round" 
          strokeLinejoin="round" 
          strokeWidth="2" 
          d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
        ></path>
      </svg>
      <h1 className="text-4xl font-bold text-gray-800 mb-2">404 - Página Não Encontrada</h1>
      <p className="text-lg text-gray-600 mb-6">Oops! A página que você está procurando não existe ou foi movida.</p>
      <div className="flex space-x-4">
        <button
          onClick={() => router.back()} // Tenta voltar para a página anterior
          className="px-6 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
        >
          Voltar
        </button>
        <Link href="/dashboard">
          <span className="px-6 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 cursor-pointer">
            Ir para o Dashboard
          </span>
        </Link>
      </div>
    </div>
  );
} 