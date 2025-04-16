'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Menu, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils/utils';
import Image from 'next/image';

const navigation = [
  { name: 'Início', href: '/' },
  { name: 'Serviços', href: '/servicos' },
  { name: 'Recursos', href: '/recursos' },
  { name: 'Sobre', href: '/sobre' },
  { name: 'FAQ', href: '/faq' },
  { name: 'Contato', href: '/contato' },
];

const Header = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 10) {
        setScrolled(true);
      } else {
        setScrolled(false);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <header className={cn(
      "fixed top-0 left-0 right-0 z-50 transition-all duration-300 h-[65px]",
      scrolled 
        ? "bg-[#41865e]/50 backdrop-blur-md shadow-lg " 
        : "bg-gradient-to-r from-[#0A1628]/10 via-[#2d6645]/50 to-transparent/50 border-b border-[#34d399]/20 "
    )}>
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Header glow effect */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-0.5 bg-gradient-to-r from-transparent via-[#34d399]/70 to-transparent"></div>
      </div>
      
      <nav className="mx-auto flex max-w-full items-center justify-between p-3 px-8" aria-label="Global">
        <div className="flex lg:flex-1">
          <Link href="/" className="-m-3 p-1.5">
            <span className="sr-only">RaaS</span>
            <Image
              src="/LOGO_RAAS.png"
              alt="RaaS Logo"
              width={190}
              height={120}
              className="h-auto"
            />
          </Link>
        </div>
        <div className="flex lg:hidden">
          <button
            type="button"
            className="-m-2.5 inline-flex items-center justify-center rounded-md p-2.5 text-white"
            onClick={() => setMobileMenuOpen(true)}
          >
            <span className="sr-only">Abrir menu</span>
            <Menu className="h-6 w-6" aria-hidden="true" />
          </button>
        </div>
        <div className="hidden lg:flex lg:gap-x-12 mr-32">
          {navigation.map((item) => (
            <Link
              key={item.name}
              href={item.href}
              className="text-sm font-semibold leading-6 text-white hover:text-[#34d399] transition-colors"
            >
              {item.name}
            </Link>
          ))}
        </div>
        <div className="hidden lg:flex lg:flex-1 lg:justify-end space-x-4">
          <Link href="/login">
            <Button variant="ghost" className="text-black hover:text-black bg-white hover:bg-white/80  border border-white/20 hover:scale-105 transition-all duration-300 active:scale-95">
              Entrar
            </Button>
          </Link>
          <Link href="/register">
            <Button className="bg-[#0f6646] hover:bg-[#0f6646] text-white shadow-lg shadow-[#34d399]/20 hover:scale-105 transition-all duration-300 active:scale-95">
              Solicitar Acesso
            </Button>
          </Link>
        </div>
      </nav>

      {/* Mobile menu */}
      <div className={`lg:hidden ${mobileMenuOpen ? 'fixed inset-0 z-50' : 'hidden'}`}>
        <div className="fixed inset-0 bg-gray-900/80" onClick={() => setMobileMenuOpen(false)} />
        <div className="fixed inset-y-0 right-0 z-50 w-full overflow-y-auto bg-[#0A1628] px-6 py-6 sm:max-w-sm sm:ring-1 sm:ring-white/10">
          <div className="flex items-center justify-between">
            <Link href="/" className="-m-1.5 p-1.5">
              <span className="sr-only">RaaS</span>

            </Link>
            <button
              type="button"
              className="-m-2.5 rounded-md p-2.5 text-white"
              onClick={() => setMobileMenuOpen(false)}
            >
              <span className="sr-only">Fechar menu</span>
              <X className="h-6 w-6" aria-hidden="true" />
            </button>
          </div>
          <div className="mt-6 flow-root">
            <div className="-my-6 divide-y divide-gray-700">
              <div className="space-y-2 py-6">
                {navigation.map((item) => (
                  <Link
                    key={item.name}
                    href={item.href}
                    className="-mx-3 block rounded-lg px-3 py-2 text-base font-semibold leading-7 text-white hover:bg-[#34d399]/10"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    {item.name}
                  </Link>
                ))}
              </div>
              <div className="py-6 space-y-2">
                <Link
                  href="/login"
                  className="-mx-3 block rounded-lg px-3 py-2.5 text-base font-semibold leading-7 text-white hover:bg-[#34d399]/10"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Entrar
                </Link>
                <Link
                  href="/register"
                  className="-mx-3 block rounded-lg px-3 py-2.5 text-base font-semibold leading-7 text-white bg-[#34d399] hover:bg-[#28a87c]"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Cadastrar
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
} 

export default Header;