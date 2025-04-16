// path: src/components/global/sidebar/index.tsx
'use client';

import React, { useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { SidebarHeader } from './sidebar-header';
import { SidebarFooter } from './sidebar-footer';
import { UserRole as MenuUserRole } from './menu-config';
import { SphereBackground } from './sphere-background';
import { useSidebar } from '@/lib/context/SidebarContext';
import { SidebarContent } from './sidebar-content';
import { usePathname } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { useMenuStore } from '@/store/menuStore';
import { UserRole } from '@/lib/types/app-types';

import { cn } from '@/lib/utils/utils';

// Helper function to convert between UserRole types
const toMenuUserRole = (role: string): MenuUserRole => {
  return role.toUpperCase() as MenuUserRole;
};

interface SidebarProps {
  userRole?: string;
}

const Sidebar: React.FC<SidebarProps> = ({ userRole = 'ADMIN' }) => {
  const { isCollapsed, toggleSidebar, isMobileSidebarOpen, closeMobileSidebar } = useSidebar();
  const pathname = usePathname();
  const { user, logout } = useAuthStore();
  const { getMenuForRole, expandedItems, toggleSubMenu, setCurrentRole, setUser } = useMenuStore();
  
  // Set the current role in the menu store and ensure menu data is loaded
  useEffect(() => {
    setCurrentRole(toMenuUserRole(userRole));
    // Set the user in the menu store
    if (user) {
      setUser(user);
    }
  }, [userRole, user, setCurrentRole, setUser]);
  
  // Get menu sections from our store
  const menuSections = useMemo(() => {
    const defaultRole = UserRole.ADMIN;
    return getMenuForRole(
      toMenuUserRole(userRole), 
      user || { 
        id: '', 
        name: '', 
        email: '', 
        role: defaultRole 
      }
    );
  }, [userRole, user, getMenuForRole]);
  
  // Close mobile sidebar when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (isMobileSidebarOpen && !target.closest('[data-sidebar]')) {
        closeMobileSidebar();
      }
    };
    
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [isMobileSidebarOpen, closeMobileSidebar]);

  const handleLogout = async () => {
    try {
      await logout();
      return Promise.resolve();
    } catch (error) {
      console.error('Error logging out:', error);
      return Promise.reject(error);
    }
  };

  return (
    <>
      {/* Desktop Sidebar */}
      <motion.aside
        data-sidebar
        className={cn(
          "fixed top-0 left-0 z-20 h-screen  backdrop-blur-sm border-r bg-gradient-to-r from-primary/10 to-accent/20",
          "flex flex-col shadow-md overflow-hidden",
          isCollapsed ? "items-center" : ""
        )}
        animate={isCollapsed ? "collapsed" : "expanded"}
        variants={{
          collapsed: {
            width: "64px",
            transition: { duration: 0.3, ease: "easeInOut" }
          },
          expanded: {
            width: "200px",
            transition: { duration: 0.3, ease: "easeInOut" }
          }
        }}
        initial={false}
      >
       
        <div className="flex flex-col h-full z-10 relative  -mt-10">
          <SidebarHeader isCollapsed={isCollapsed} toggleSidebar={toggleSidebar} />
          <div className="flex-1 overflow-y-auto scrollbar-hide -mt-10">
            <SidebarContent 
              menuSections={menuSections} 
              isCollapsed={isCollapsed}
              pathname={pathname}
              expandedItems={expandedItems}
              toggleSubMenu={toggleSubMenu}
            />
          </div>
        
        </div>
      </motion.aside>

      {/* Mobile Sidebar Overlay */}
      <div 
        className={cn(
          "fixed inset-0 bg-black/50 z-10 lg:hidden",
          isMobileSidebarOpen ? "block" : "hidden"
        )}
        onClick={closeMobileSidebar}
      />

      {/* Mobile Sidebar */}
      <motion.aside
        data-sidebar
        className="fixed top-0 left-0 z-30 h-screen bg-background/95 backdrop-blur-sm border-r lg:hidden flex flex-col shadow-lg overflow-hidden"
        animate={isMobileSidebarOpen ? "open" : "closed"}
        variants={{
          open: {
            x: 0,
            boxShadow: "10px 0 50px rgba(0,0,0,0.2)",
            transition: { duration: 0.3, ease: "easeInOut" }
          },
          closed: {
            x: "-100%",
            boxShadow: "none",
            transition: { duration: 0.3, ease: "easeInOut" }
          }
        }}
        initial="closed"
      >
        <SphereBackground />
        <div className="flex flex-col h-full z-10 relative">
          <SidebarHeader isCollapsed={false} toggleSidebar={closeMobileSidebar} />
          <div className="flex-1 overflow-y-auto scrollbar-hide">
            <SidebarContent 
              menuSections={menuSections} 
              isCollapsed={false}
              pathname={pathname}
              expandedItems={expandedItems}
              toggleSubMenu={toggleSubMenu}
            />
          </div>
          <SidebarFooter isCollapsed={false} handleLogout={handleLogout} />
        </div>
      </motion.aside>
    </>
  );
};

// Add display name to the component
Sidebar.displayName = 'Sidebar';

// Export the component
export { Sidebar };