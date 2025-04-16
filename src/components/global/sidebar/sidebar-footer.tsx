'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { User, UserRole } from '@/lib/types/app-types';
import { useAuthStore } from '@/store/authStore';
import { useRouter } from 'next/navigation';
import { 
  ChevronDown, 
  ChevronUp, 
  LogOut, 
  User as UserIcon,
  Settings,
  HelpCircle
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from '@/lib/utils/utils';
import ThemeSwitcher from '@/components/ThemeSwitcher';

// Configuração de estilo para os badges de roles
const roleBadgeConfig = {
  superAdmin: { 
    label: 'Super Admin', 
    className: 'bg-red-500/15 text-red-700 dark:bg-red-500/20 dark:text-red-300 border-red-300'
  },
  admin: { 
    label: 'Admin', 
    className: 'bg-blue-500/15 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300 border-blue-300' 
  },
  adminStaff: { 
    label: 'Staff', 
    className: 'bg-indigo-500/15 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300 border-indigo-300' 
  },
  customer: { 
    label: 'Cliente', 
    className: 'bg-green-500/15 text-green-700 dark:bg-green-500/20 dark:text-green-300 border-green-300' 
  },
  energyRenter: { 
    label: 'Locador', 
    className: 'bg-amber-500/15 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300 border-amber-300' 
  },
  user: { 
    label: 'Usuário', 
    className: 'bg-gray-500/15 text-gray-700 dark:bg-gray-500/20 dark:text-gray-300 border-gray-300' 
  },
};

// Função auxiliar para obter as iniciais do nome
const getInitials = (name: string) => {
  return name
    .split(' ')
    .map(part => part[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
};

type SidebarFooterProps = {
  isCollapsed: boolean;
  handleLogout: () => Promise<void>;
};

export function SidebarFooter({ isCollapsed, handleLogout }: SidebarFooterProps) {
  const { user } = useAuthStore();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);

  // Se o usuário não estiver disponível, mostra um placeholder
  if (!user) {
    return (
      <div className={cn(
        "relative z-10 mt-auto border-t p-3",
        isCollapsed ? "items-center" : ""
      )}>
        <div className="animate-pulse flex items-center gap-3">
          <div className="h-9 w-9 rounded-full bg-muted"></div>
          {!isCollapsed && (
            <div className="space-y-2 flex-1">
              <div className="h-4 bg-muted rounded w-24"></div>
              <div className="h-3 bg-muted rounded w-16"></div>
            </div>
          )}
        </div>
        <div className="mt-3 flex justify-center">
          <ThemeSwitcher />
        </div>
      </div>
    );
  }

  const userRole = user.role as string;
  const roleBadge = roleBadgeConfig[userRole as keyof typeof roleBadgeConfig] || roleBadgeConfig.user;
  
  // Componente para modo colapsado - usa Dropdown
  if (isCollapsed) {
    return (
      <div className="relative z-10 mt-auto border-t p-3 flex flex-col items-center gap-3">
        <ThemeSwitcher />
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="focus:outline-none group">
              <Avatar className="h-9 w-9 border border-primary/20 group-hover:border-primary/50 transition-colors">
                {user.profileImageUrl ? (
                  <AvatarImage src={user.profileImageUrl} alt={user.name} />
                ) : (
                  <AvatarFallback className="bg-primary/10 text-foreground">
                    {getInitials(user.name)}
                  </AvatarFallback>
                )}
              </Avatar>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium leading-none">{user.name}</p>
                <p className="text-xs leading-none text-muted-foreground">{user.email}</p>
                <Badge 
                  variant="outline" 
                  className={cn("mt-1 w-fit text-[10px] font-normal py-0", roleBadge.className)}
                >
                  {roleBadge.label}
                </Badge>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => router.push('/profile')}>
              <UserIcon className="mr-2 h-4 w-4" />
              <span>Meu Perfil</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => router.push('/settings')}>
              <Settings className="mr-2 h-4 w-4" />
              <span>Configurações</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => router.push('/help')}>
              <HelpCircle className="mr-2 h-4 w-4" />
              <span>Ajuda</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout} className="text-red-500 dark:text-red-400">
              <LogOut className="mr-2 h-4 w-4" />
              <span>Sair</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    );
  }

  // Componente expandido
  return (
    <div className="relative z-10 mt-auto border-t">
      <div className="p-3 flex justify-between items-center">
        <ThemeSwitcher />
        <Badge 
          variant="outline" 
          className={cn("text-xs font-normal py-0.5", roleBadge.className)}
        >
          {roleBadge.label}
        </Badge>
      </div>
      
      <div className="px-3 pb-3">
        <button 
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center justify-between w-full rounded-md p-2 hover:bg-accent/50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <Avatar className="h-9 w-9 border border-primary/20">
              {user.profileImageUrl ? (
                <AvatarImage src={user.profileImageUrl} alt={user.name} />
              ) : (
                <AvatarFallback className="bg-primary/10 text-foreground">
                  {getInitials(user.name)}
                </AvatarFallback>
              )}
            </Avatar>
            <div className="text-left">
              <p className="text-sm font-medium leading-none">{user.name}</p>
              <p className="text-xs text-muted-foreground mt-1 truncate max-w-[120px]">{user.email}</p>
            </div>
          </div>
          {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>
        
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="pt-2 px-2 space-y-1">
                <button 
                  onClick={() => router.push('/profile')}
                  className="flex items-center gap-2 w-full text-sm p-2 rounded-md hover:bg-accent transition-colors"
                >
                  <UserIcon size={16} />
                  <span>Meu Perfil</span>
                </button>
                
                <button 
                  onClick={() => router.push('/settings')}
                  className="flex items-center gap-2 w-full text-sm p-2 rounded-md hover:bg-accent transition-colors"
                >
                  <Settings size={16} />
                  <span>Configurações</span>
                </button>
                
                <button 
                  onClick={() => router.push('/help')}
                  className="flex items-center gap-2 w-full text-sm p-2 rounded-md hover:bg-accent transition-colors"
                >
                  <HelpCircle size={16} />
                  <span>Ajuda</span>
                </button>
                
                <button 
                  onClick={handleLogout}
                  className="flex items-center gap-2 w-full text-sm p-2 rounded-md hover:bg-accent transition-colors text-red-500 dark:text-red-400 mt-2"
                >
                  <LogOut size={16} />
                  <span>Sair</span>
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
} 