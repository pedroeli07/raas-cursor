/* eslint-disable @typescript-eslint/naming-convention */
import { 
  LayoutDashboard, Users, Home, Zap, FileText, 
  CloudUpload, LifeBuoy, Bell, HelpCircle, 
  User, Wallet, Database, UploadCloud, Settings
} from 'lucide-react';
import React from 'react';

export type UserRole = 'CUSTOMER' | 'ENERGY_RENTER' | 'ADMIN' | 'ADMIN_STAFF' | 'SUPER_ADMIN';

export type MenuSection = {
  title: string;
  items: MenuItem[];
};

export type MenuItem = {
  name: string;
  path: string;
  icon: React.ReactNode;
  badge?: number | string;
  subItems?: {
    name: string;
    path: string;
    icon?: React.ReactNode;
    badge?: number | string;
  }[];
};




// Memoized menu configurations by role to avoid recalculations
const MENU_CONFIGS: Record<UserRole, MenuSection[]> = {
  'CUSTOMER': [
    {
      title: 'Principal',
      items: [
        { 
          name: 'Dashboard', 
          path: '/cliente/dashboard', 
          icon: <LayoutDashboard className="h-5 w-5" /> 
        },
        { 
          name: 'Consumo de Energia', 
          path: '/cliente/consumo', 
          icon: <Zap className="h-5 w-5" /> 
        },
        { 
          name: 'Faturas', 
          path: '/cliente/faturas', 
          icon: <FileText className="h-5 w-5" />,
          badge: 3
        },
      ]
    },
    {
      title: 'Gerenciamento',
      items: [
        { 
          name: 'Minhas Instalações', 
          path: '/cliente/instalacoes', 
          icon: <Home className="h-5 w-5" /> 
        },
        { 
          name: 'Economia', 
          path: '/cliente/economia', 
          icon: <Wallet className="h-5 w-5" /> 
        },
      ]
    },
    {
      title: 'Suporte',
      items: [
        { 
          name: 'Notificações', 
          path: '/cliente/notificacoes', 
          icon: <Bell className="h-5 w-5" />,
          badge: 5
        },
        { 
          name: 'Central de Ajuda', 
          path: '/cliente/central-de-ajuda', 
          icon: <HelpCircle className="h-5 w-5" /> 
        },
        { 
          name: 'Meu Perfil', 
          path: '/cliente/perfil', 
          icon: <User className="h-5 w-5" /> 
        },
      ]
    }
  ],
  
  'ENERGY_RENTER': [
    {
      title: 'Principal',
      items: [
        { 
          name: 'Dashboard', 
          path: '/locador/dashboard', 
          icon: <LayoutDashboard className="h-5 w-5" /> 
        },
        { 
          name: 'Produção de Energia', 
          path: '/locador/producao', 
          icon: <Zap className="h-5 w-5" /> 
        },
      ]
    },
    {
      title: 'Gerenciamento',
      items: [
        { 
          name: 'Minhas Usinas', 
          path: '/locador/instalacoes', 
          icon: <Home className="h-5 w-5" /> 
        },
        { 
          name: 'Alocações', 
          path: '/locador/alocacoes', 
          icon: <Users className="h-5 w-5" /> 
        },
        { 
          name: 'Financeiro', 
          path: '/locador/financeiro', 
          icon: <Wallet className="h-5 w-5" />,
          subItems: [
            { name: 'Receitas', path: '/locador/financeiro/receitas' },
            { name: 'Relatórios', path: '/locador/financeiro/relatorios' },
          ]
        },
      ]
    },
    {
      title: 'Suporte',
      items: [
        { 
          name: 'Notificações', 
          path: '/locador/notificacoes', 
          icon: <Bell className="h-5 w-5" />,
          badge: 2
        },
        { 
          name: 'Central de Ajuda', 
          path: '/locador/central-de-ajuda', 
          icon: <HelpCircle className="h-5 w-5" /> 
        },
        { 
          name: 'Meu Perfil', 
          path: '/locador/perfil', 
          icon: <User className="h-5 w-5" /> 
        },
      ]
    }
  ],
  
  'ADMIN': [
    {
      title: 'Principal',
      items: [
        { 
          name: 'Dashboard', 
          path: '/admin/dashboard', 
          icon: <LayoutDashboard className="h-5 w-5" /> 
        },
        { 
          name: 'Instalações', 
          path: '/admin/instalacoes', 
          icon: <Home className="h-5 w-5" />,
          subItems: [
            { name: 'Gerenciar', path: '/admin/instalacoes/gerenciar' },
            { name: 'Analisar', path: '/admin/instalacoes/analisar' },
          ]
        },
      ]
    },
    {
      title: 'Gerenciamento',
      items: [
        { 
          name: 'Usuários', 
          path: '/admin/usuarios', 
          icon: <Users className="h-5 w-5" />,
          subItems: [
            { name: 'Todos Usuários', path: '/admin/usuarios' },
            { name: 'Convites', path: '/admin/usuarios/convites', badge: 7 },
          ]
        },
        { 
          name: 'Instalações', 
          path: '/admin/instalacoes', 
          icon: <Home className="h-5 w-5" />,
          subItems: [
            { name: 'Gerenciar', path: '/admin/instalacoes/gerenciar' },
            { name: 'Analisar', path: '/admin/instalacoes/analisar' },
          ]
        },
        { 
          name: 'Distribuidoras', 
          path: '/admin/distribuidoras', 
          icon: <Zap className="h-5 w-5" /> 
        },
        { 
          name: 'Importar Dados', 
          path: '/admin/importar-dados', 
          icon: <UploadCloud className="h-5 w-5" /> 
        },
      ]
    },
    {
      title: 'Suporte',
      items: [
        { 
          name: 'Central de Ajuda', 
          path: '/admin/suporte', 
          icon: <LifeBuoy className="h-5 w-5" /> 
        },
        { 
          name: 'Notificações', 
          path: '/admin/suporte/notificacoes', 
          icon: <Bell className="h-5 w-5" />,
          badge: 3
        },
      ]
    }
  ],
  
  'ADMIN_STAFF': [
    {
      title: 'Principal',
      items: [
        { 
          name: 'Dashboard', 
          path: '/admin/dashboard', 
          icon: <LayoutDashboard className="h-5 w-5" /> 
        },
        { 
          name: 'Financeiro', 
          path: '/admin/financeiro', 
          icon: <Users className="h-5 w-5" />,
          subItems: [
            { name: 'Faturas', path: '/admin/financeiro/faturas' },
            { name: 'Relatórios', path: '/admin/financeiro/relatorios' },
          ]
        },
      ]
    },
    {
      title: 'Gerenciamento',
      items: [
        { 
          name: 'Usuários', 
          path: '/admin/usuarios', 
          icon: <Users className="h-5 w-5" />,
          subItems: [
            { name: 'Todos Usuários', path: '/admin/usuarios' },
            { name: 'Convites', path: '/admin/usuarios/convites', badge: 7 },
          ]
        },
        { 
          name: 'Instalações', 
          path: '/admin/instalacoes', 
          icon: <Home className="h-5 w-5" />,
          subItems: [
            { name: 'Gerenciar', path: '/admin/instalacoes/gerenciar' },
            { name: 'Analisar', path: '/admin/instalacoes/analisar' },
          ]
        },
        { 
          name: 'Distribuidoras', 
          path: '/admin/distribuidoras', 
          icon: <Zap className="h-5 w-5" /> 
        },
        { 
          name: 'Importar Dados', 
          path: '/admin/importar-dados', 
          icon: <UploadCloud className="h-5 w-5" /> 
        },
      ]
    },
    {
      title: 'Suporte',
      items: [
        { 
          name: 'Central de Ajuda', 
          path: '/admin/suporte', 
          icon: <LifeBuoy className="h-5 w-5" /> 
        },
        { 
          name: 'Notificações', 
          path: '/admin/suporte/notificacoes', 
          icon: <Bell className="h-5 w-5" />,
          badge: 3
        },
      ]
    }
  ],
  
  'SUPER_ADMIN': [
    {
      title: 'Principal',
      items: [
        { 
          name: 'Dashboard', 
          path: '/admin/dashboard', 
          icon: <LayoutDashboard className="h-5 w-5" /> 
        },
        { 
          name: 'Financeiro', 
          path: '/admin/financeiro', 
          icon: <Users className="h-5 w-5" />,
          subItems: [
            { name: 'Faturas', path: '/admin/financeiro/faturas' },
            { name: 'Relatórios', path: '/admin/financeiro/relatorios' },
          ]
        },
      ]
    },
    {
      title: 'Gerenciamento',
      items: [
        { 
          name: 'Usuários', 
          path: '/admin/usuarios', 
          icon: <Users className="h-5 w-5" />,
          subItems: [
            { name: 'Todos Usuários', path: '/admin/usuarios' },
            { name: 'Convites', path: '/admin/usuarios/convites', badge: 7 },
          ]
        },
        { 
          name: 'Instalações', 
          path: '/admin/instalacoes', 
          icon: <Home className="h-5 w-5" />,
          subItems: [
            { name: 'Gerenciar', path: '/admin/instalacoes/gerenciar' },
            { name: 'Analisar', path: '/admin/instalacoes/analisar' },
          ]
        },
        { 
          name: 'Distribuidoras', 
          path: '/admin/distribuidoras', 
          icon: <Zap className="h-5 w-5" /> 
        },
        { 
          name: 'Importar Dados', 
          path: '/admin/importar-dados', 
          icon: <UploadCloud className="h-5 w-5" /> 
        },
      ]
    },
    {
      title: 'Sistema',
      items: [
        { 
          name: 'Configurações', 
          path: '/admin/configuracoes', 
          icon: <Settings className="h-5 w-5" /> 
        },
        { 
          name: 'Logs do Sistema', 
          path: '/admin/logs', 
          icon: <FileText className="h-5 w-5" /> 
        },
        { 
          name: 'Suporte', 
          path: '/admin/suporte', 
          icon: <LifeBuoy className="h-5 w-5" /> 
        },
        { 
          name: 'Notificações', 
          path: '/admin/suporte/notificacoes', 
          icon: <Bell className="h-5 w-5" />,
          badge: 3
        },
      ]
    }
  ]
};

/**
 * Get menu sections for a specific user role
 * This function simply returns the pre-defined menu configuration
 * without recalculating each time it's called
 */
export const getMenuSections = (userRole: UserRole): MenuSection[] => {
  return MENU_CONFIGS[userRole] || MENU_CONFIGS['ADMIN'];
}; 