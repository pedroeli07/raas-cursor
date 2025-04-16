'use client';

import { useEffect } from 'react';
import Image from 'next/image';
import { useAuthStore } from '@/store/authStore';
import { useMenuStore } from '@/store/menuStore';
import { Badge } from '@/components/ui/badge';
import { VariantProps } from 'class-variance-authority';
import { badgeVariants } from "@/components/ui/badge";
import { cn } from '@/lib/utils/utils';
import { User as UserIcon } from 'lucide-react';
import log from '@/lib/logger';

type SidebarHeaderProps = {
  isCollapsed: boolean;
  toggleSidebar: () => void;
};

export function SidebarHeader({ isCollapsed, toggleSidebar }: SidebarHeaderProps) {
  const { user: authUser } = useAuthStore();
  const { user: menuUser } = useMenuStore();
  
  log.info('SidebarHeader', { user: authUser });
  
  // Use the most detailed user information available
  const activeUser = authUser || menuUser;
  log.info('SidebarHeader', { activeUser });
    
  // Format role for display
  const formatRoleForDisplay = (role?: string) => {
    if (!role) return 'Usuário';
    
    // Custom display names for specific roles
    switch (role) {
      case 'SUPER_ADMIN':
        return 'Super Admin';
      case 'ADMIN':
        return 'Admin';
      case 'ADMIN_STAFF':
        return 'Staff';
      case 'CUSTOMER':
        return 'Cliente';
      case 'ENERGY_RENTER':
        return 'Locador';
      default:
        // Fallback for any new roles: Convert ROLE_NAME to Role Name
        return role
          .split('_')
          .map((word) => word.charAt(0) + word.slice(1).toLowerCase())
          .join(' ');
    }
  };

  // Get badge variant based on role
  const getRoleBadgeVariant = (role?: string): VariantProps<typeof badgeVariants>['variant'] => {
    if (!role) return "outline";
    switch (role) {
      case "SUPER_ADMIN":
        return "destructive";
      case "ADMIN":
        return "secondary";
      case "ADMIN_STAFF":
        return "default";
      case "CUSTOMER":
        return "secondary";
      case "ENERGY_RENTER":
        return "default";
      default:
        return "outline";
    }
  };
    
  return (
    <div className="flex flex-col">
      {/* Logo Section */}
      <div className="relative flex items-center justify-center p-0 border-b mt-12">
        {!isCollapsed ? (
          <div className="flex items-center">
            <div
              onClick={toggleSidebar}
              className="p-0 cursor-pointer hover:bg-transparent"
            >
              <Image
                src="/images/raas-logo.svg"
                alt="RaaS Solar Logo"
                width={200}
                height={60}
                priority={true}
                className="h-[8vh] w-auto transition-transform active:scale-95"
              />
            </div>
          </div>
        ) : (
          <div className="mx-auto">
            <div
              onClick={toggleSidebar}
              className="p-0 cursor-pointer hover:bg-transparent"
            >
              <Image
                src="/images/raas-logo.svg"
                alt="RaaS Solar Logo"
                width={60}
                height={60}
                priority={true}
                className="h-8 w-auto transition-transform active:scale-95"
              />
            </div>
          </div>
        )}
      </div>
      
      {/* User Profile Section (without avatar) */}
      {!isCollapsed ? (
        <div className="py-4 px-3 border-b">
          <div className="flex items-start gap-2">
            <UserIcon className="h-4 w-4 mt-0.5 text-muted-foreground" />
            <div className="overflow-hidden">
              <div className="font-medium text-sm truncate">
                {activeUser?.name || 'Usuário'}
              </div>
              <div className="text-xs text-muted-foreground truncate">
                {activeUser?.email || 'email@example.com'}
              </div>
              <div className="mt-1">
                <Badge
                  variant={getRoleBadgeVariant(activeUser?.role || '')}
                  className="h-5 text-[10px] truncate"
                >
                  {formatRoleForDisplay(activeUser?.role)}
                </Badge>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="py-3 flex justify-center border-b">
          <UserIcon className="h-4 w-4 text-muted-foreground" />
        </div>
      )}
    </div>
  );
}