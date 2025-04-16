'use client';

import React, { useMemo, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { Sidebar } from '@/components/global/sidebar';
import InfoBar from '@/components/global/infobar';
import { useAuthStore } from '@/store/authStore';
import { SidebarProvider, useSidebar } from '@/lib/context/SidebarContext';
import ModalProvider from '@/providers/modal-provider';
import { UserRole } from '@/components/global/sidebar/menu-config';
import { UserRole as UserRoleEnum } from '@/lib/types/app-types';
import { DebugProvider } from '@/lib/context/DebugContext';
import { DebugPanel } from '@/components/debug/DebugPanel';
import FaturasPage from './admin/financeiro/faturas/page';


const adminUsuario = '/admin/usuarios'
const adminUsuarioConvites = '/admin/usuarios/convites'
const adminInstalacoes = '/admin/instalacoes'
const adminDistribuidoras = '/admin/distribuidoras'
const adminDashboard = '/admin/dashboard'
const adminConfiguracoes = '/admin/configuracoes'
const adminLogs = '/admin/logs'
const adminSuporte = '/admin/suporte'
const adminNotificacoes = '/admin/notificacoes'
const adminFaturas = '/admin/financeiro/faturas'
const adminFaturasRelatorios = '/admin/financeiro/faturas/relatorios'
const adminImportarDados = '/admin/importar-dados'

// Página atual >> Título do infosbar
const pageTitleMap: Record<string, string> = {
  [adminUsuario]: 'Gerenciamento de Usuários',
  [adminUsuarioConvites]: 'Gerenciamento de Convites',
  [adminInstalacoes]: 'Gerenciamento de Instalações',
  [adminDistribuidoras]: 'Gerenciamento de Distribuidoras',
  [adminDashboard]: 'Admin Dashboard',
  [adminConfiguracoes]: 'Configurações do Sistema',
  [adminLogs]: 'Logs do Sistema',
  [adminSuporte]: 'Suporte',
  [adminNotificacoes]: 'Notificações',
  [adminFaturas]: 'Gerenciamento de Faturas',
  [adminFaturasRelatorios]: 'Relatórios de Faturas',
  [adminImportarDados]: 'Importar Dados de Energia',
};

// Mock user data for development
const MOCK_USERS = {
  superAdmin: {
    id: "super-admin-id",
    email: "pedro-eli@hotmail.com",
    name: "Pedro Eli",
    role: 'super_admin' as UserRoleEnum,
  },
  admin: {
    id: "admin-id",
    email: "admin@example.com",
    name: "Admin User",
    role: 'admin' as UserRoleEnum,
  },
  customer: {
    id: "customer-id",
    email: "cliente@example.com",
    name: "Cliente Solar",
    role: 'customer' as UserRoleEnum,
  },
  energyRenter: {
    id: "renter-id",
    email: "inquilino@example.com",
    name: "Inquilino de Energia",
    role: 'energy_renter' as UserRoleEnum,
  }
};

// Função de layout utilizando o contexto
function LayoutContent({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated } = useAuthStore();
  const pathname = usePathname();
  const { isCollapsed } = useSidebar();
  
  // Determinar o tipo de usuário com base no pathname ou no user.role
  // Use memoization to avoid recalculating on every render
  const userRole = useMemo(() => {
    if (user?.role) return user.role;
    
    if (pathname?.includes('/admin')) return 'SUPER_ADMIN';
    if (pathname?.includes('/cliente')) return 'CUSTOMER';
    if (pathname?.includes('/locador')) return 'ENERGY_RENTER';
    
    return 'ADMIN'; // Fallback
  }, [user?.role, pathname]);

  // Initialize mock data for development
  useEffect(() => {
    // Only set mock user if in development and no user is authenticated
    if (process.env.NODE_ENV === 'development' && !isAuthenticated && !user) {
      console.log('[DEV MODE] Setting mock user data for development');
      
      // Map the role to the corresponding mock user
      let mockUserKey: keyof typeof MOCK_USERS;
      switch(userRole) {
        case 'SUPER_ADMIN': mockUserKey = 'superAdmin'; break;
        case 'ADMIN': mockUserKey = 'admin'; break;
        case 'CUSTOMER': mockUserKey = 'customer'; break;
        case 'ENERGY_RENTER': mockUserKey = 'energyRenter'; break;
        default: mockUserKey = 'admin';
      }
      
      const mockUser = MOCK_USERS[mockUserKey];
      if (mockUser) {
        useAuthStore.setState({
          user: mockUser,
          isAuthenticated: true,
          token: 'mock-token-for-development'
        });
      }
    }
  }, [userRole, user, isAuthenticated]);

  // Determinar o título da página com base no pathname (memoized)
  const pageTitle = useMemo(() => {
    return pathname ? pageTitleMap[pathname] : undefined;
  }, [pathname]);

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      <Sidebar userRole={userRole as UserRole} />
      <div className={`flex-1 flex flex-col transition-all duration-300 ease-in-out ${isCollapsed ? 'ml-[64px]' : 'ml-[200px]'}`}>
        <InfoBar pageTitle={pageTitle} />
        <main className="flex-1 overflow-y-auto">{children}</main>
         <DebugPanel /> 
      
      </div>
    </div>
  );
}

// Wrapper que fornece o contexto
export default function PrivatePagesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SidebarProvider>
      <ModalProvider>
        <DebugProvider>
          <LayoutContent>{children}</LayoutContent>
        </DebugProvider>
      </ModalProvider>
    </SidebarProvider>
  );
}
