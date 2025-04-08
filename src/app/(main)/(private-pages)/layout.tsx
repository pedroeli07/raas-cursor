'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { useTheme } from 'next-themes';

export default function PrivatePagesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { theme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Evitar problemas de hidratação
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  // Layout simples que apenas passa os filhos, já que temos layouts específicos 
  // para admin, cliente e locador nas pastas correspondentes
  return (
    <div className="min-h-screen bg-background">
      {children}
    </div>
  );
}
