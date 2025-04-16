// Path: src/app/(main)/(auth)/layout.tsx
'use client';

import React, { ReactNode, useEffect } from 'react';
import Image from 'next/image';
import { useTheme } from 'next-themes';
import { Button } from '@/components/ui/button';
import { MoonIcon, SunIcon } from 'lucide-react';
import { motion } from 'framer-motion';
// import Image from 'next/image'; // Importar quando for usar uma logo

interface AuthLayoutProps {
  children: ReactNode;
}

export default function AuthLayout({ children }: AuthLayoutProps) {
  const { theme, setTheme } = useTheme();

  useEffect(() => {
    setTheme('light');
  }, [setTheme]);

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-gray-900 dark:via-blue-950 dark:to-indigo-950 md:flex-row">
        {/* Conteúdo principal */}
        <main className="flex flex-grow flex-col items-center justify-center px-4 py-0">
          {children}
        </main>
    </div>
  );
}
