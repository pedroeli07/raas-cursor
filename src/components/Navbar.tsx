'use client';

import { useState } from 'react';
import ThemeSwitcher from './ThemeSwitcher';
import Link from 'next/link';

export default function Navbar() {
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  
  return (
    <nav className="sticky top-0 z-30 w-full h-16 backdrop-blur-sm bg-background/80 border-b border-border flex items-center px-6">
      <div className="flex-1 hidden md:block">
        <div className="relative max-w-md">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-muted-foreground">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
              <path fillRule="evenodd" d="M9 3.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM2 9a7 7 0 1112.452 4.391l3.328 3.329a.75.75 0 11-1.06 1.06l-3.329-3.328A7 7 0 012 9z" clipRule="evenodd" />
            </svg>
          </span>
          <input 
            type="text" 
            placeholder="Pesquisar..."
            className="pl-10 w-full h-10 bg-muted/70 rounded-lg border-none focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
        </div>
      </div>
      
      <div className="flex items-center gap-4">
        <button 
          onClick={() => setIsNotificationsOpen(!isNotificationsOpen)} 
          className="relative p-2 rounded-full hover:bg-muted/50 transition-colors"
          aria-label="Notificações"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6 text-foreground">
            <path fillRule="evenodd" d="M5.25 9a6.75 6.75 0 0113.5 0v.75c0 2.123.8 4.057 2.118 5.52a.75.75 0 01-.297 1.206c-1.544.57-3.16.99-4.831 1.243a3.75 3.75 0 11-7.48 0 24.585 24.585 0 01-4.831-1.244.75.75 0 01-.298-1.205A8.217 8.217 0 005.25 9.75V9zm4.502 8.9a2.25 2.25 0 104.496 0 25.057 25.057 0 01-4.496 0z" clipRule="evenodd" />
          </svg>
          <span className="absolute top-1 right-1 w-2.5 h-2.5 rounded-full bg-destructive"></span>
          
          {isNotificationsOpen && (
            <div className="absolute right-0 mt-2 w-80 bg-card rounded-lg shadow-lg border border-border overflow-hidden z-50">
              <div className="p-3 border-b border-border">
                <h3 className="font-medium">Notificações</h3>
              </div>
              <div className="max-h-96 overflow-y-auto">
                <div className="p-3 border-b border-border hover:bg-muted/30 transition-colors cursor-pointer">
                  <div className="flex items-start gap-3">
                    <div className="h-10 w-10 bg-primary/20 rounded-full flex items-center justify-center flex-shrink-0">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-primary">
                        <path d="M11.644 1.59a.75.75 0 01.712 0l9.75 5.25a.75.75 0 010 1.32l-9.75 5.25a.75.75 0 01-.712 0l-9.75-5.25a.75.75 0 010-1.32l9.75-5.25z" />
                        <path d="M3.265 10.602l7.668 4.129a2.25 2.25 0 002.134 0l7.668-4.13 1.37.739a.75.75 0 010 1.32l-9.75 5.25a.75.75 0 01-.71 0l-9.75-5.25a.75.75 0 010-1.32l1.37-.738z" />
                        <path d="M10.933 19.231l-7.668-4.13-1.37.739a.75.75 0 000 1.32l9.75 5.25c.221.12.489.12.71 0l9.75-5.25a.75.75 0 000-1.32l-1.37-.738-7.668 4.13a2.25 2.25 0 01-2.134-.001z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm">Nova fatura disponível para pagamento</p>
                      <p className="text-xs text-muted-foreground mt-1">Há 2 horas</p>
                    </div>
                  </div>
                </div>
                <div className="p-3 border-b border-border hover:bg-muted/30 transition-colors cursor-pointer">
                  <div className="flex items-start gap-3">
                    <div className="h-10 w-10 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center flex-shrink-0">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-green-600 dark:text-green-400">
                        <path fillRule="evenodd" d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25zm-1.72 6.97a.75.75 0 10-1.06 1.06L10.94 12l-1.72 1.72a.75.75 0 101.06 1.06L12 13.06l1.72 1.72a.75.75 0 101.06-1.06L13.06 12l1.72-1.72a.75.75 0 10-1.06-1.06L12 10.94l-1.72-1.72z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm">Créditos de energia atualizados</p>
                      <p className="text-xs text-muted-foreground mt-1">Ontem</p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="p-2 text-center border-t border-border">
                <Link href="/notificacoes" className="text-sm text-primary hover:underline">Ver todas notificações</Link>
              </div>
            </div>
          )}
        </button>
        
        <ThemeSwitcher />
        
        <div className="relative">
          <button 
            onClick={() => setIsProfileOpen(!isProfileOpen)}
            className="flex items-center gap-2 px-2 py-1 rounded-full hover:bg-muted/50 transition-colors"
            aria-label="Perfil"
          >
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-primary-accent flex items-center justify-center text-white font-medium">
              A
            </div>
            <span className="hidden md:block font-medium">Admin</span>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 text-muted-foreground">
              <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
            </svg>
          </button>
          
          {isProfileOpen && (
            <div className="absolute right-0 mt-2 w-64 bg-card rounded-lg shadow-lg border border-border overflow-hidden z-50">
              <div className="p-4 border-b border-border">
                <p className="font-medium">Admin</p>
                <p className="text-sm text-muted-foreground">admin@raas-solar.com</p>
              </div>
              <div className="p-2">
                <Link href="/perfil" className="flex items-center gap-2 p-2 rounded-md hover:bg-muted/50 transition-colors">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                    <path d="M10 8a3 3 0 100-6 3 3 0 000 6zM3.465 14.493a1.23 1.23 0 00.41 1.412A9.957 9.957 0 0010 18c2.31 0 4.438-.784 6.131-2.1.43-.333.604-.903.408-1.41a7.002 7.002 0 00-13.074.003z" />
                  </svg>
                  <span>Meu Perfil</span>
                </Link>
                <Link href="/configuracoes" className="flex items-center gap-2 p-2 rounded-md hover:bg-muted/50 transition-colors">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                    <path fillRule="evenodd" d="M7.84 1.804A1 1 0 018.82 1h2.36a1 1 0 01.98.804l.331 1.652a6.993 6.993 0 011.929 1.115l1.598-.54a1 1 0 011.186.447l1.18 2.044a1 1 0 01-.205 1.251l-1.267 1.113a7.047 7.047 0 010 2.228l1.267 1.113a1 1 0 01.206 1.25l-1.18 2.045a1 1 0 01-1.187.447l-1.598-.54a6.993 6.993 0 01-1.929 1.115l-.33 1.652a1 1 0 01-.98.804H8.82a1 1 0 01-.98-.804l-.331-1.652a6.993 6.993 0 01-1.929-1.115l-1.598.54a1 1 0 01-1.186-.447l-1.18-2.044a1 1 0 01.205-1.251l1.267-1.114a7.05 7.05 0 010-2.227L1.821 7.773a1 1 0 01-.206-1.25l1.18-2.045a1 1 0 011.187-.447l1.598.54A6.993 6.993 0 017.51 3.456l.33-1.652zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
                  </svg>
                  <span>Configurações</span>
                </Link>
                <hr className="my-2 border-border" />
                <Link href="/api/auth/logout" className="flex items-center gap-2 p-2 rounded-md hover:bg-red-100/10 hover:text-red-500 dark:hover:bg-red-900/20 transition-colors">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                    <path fillRule="evenodd" d="M3 4.25A2.25 2.25 0 015.25 2h5.5A2.25 2.25 0 0113 4.25v2a.75.75 0 01-1.5 0v-2a.75.75 0 00-.75-.75h-5.5a.75.75 0 00-.75.75v11.5c0 .414.336.75.75.75h5.5a.75.75 0 00.75-.75v-2a.75.75 0 011.5 0v2A2.25 2.25 0 0110.75 18h-5.5A2.25 2.25 0 013 15.75V4.25z" clipRule="evenodd" />
                    <path fillRule="evenodd" d="M19 10a.75.75 0 00-.75-.75H8.704l1.048-.943a.75.75 0 10-1.004-1.114l-2.5 2.25a.75.75 0 000 1.114l2.5 2.25a.75.75 0 101.004-1.114l-1.048-.943h9.546A.75.75 0 0019 10z" clipRule="evenodd" />
                  </svg>
                  <span>Sair</span>
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
} 