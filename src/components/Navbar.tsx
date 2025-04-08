'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Image from 'next/image';
import { ThemeSwitcher } from './ThemeSwitcher';

export default function Navbar() {
  const pathname = usePathname();

  return (
    <nav className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          <Link href="/" className="flex items-center space-x-2">
            <Image src="/Logo.png" alt="RaaS Solar" width={32} height={32} />
            <span className="font-bold text-xl">RaaS Solar</span>
          </Link>

          <div className="flex items-center gap-6">
            <Link 
              href="/login"
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              Entrar
            </Link>
            <Link
              href="/register"
              className="bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2 rounded-lg transition-colors"
            >
              Cadastrar
            </Link>
            <ThemeSwitcher />
          </div>
        </div>
      </div>
    </nav>
  );
}