'use client';

import React, { ReactNode, useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';
import useAuth from '@/lib/hooks/useAuth';
import Sidebar from '@/components/Sidebar';
import Navbar from '@/components/Navbar';

interface ClienteLayoutProps {
  children: ReactNode;
}

export default function ClienteLayout({ children }: ClienteLayoutProps) {
  const [isSidebarCollapsed, setSidebarCollapsed] = useState(false);
  const router = useRouter();
  const { user } = useAuth();

  const toggleSidebar = useCallback(() => {
    setSidebarCollapsed(prev => !prev);
  }, []);

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      <Sidebar 
        userRole="CUSTOMER"
        isCollapsed={isSidebarCollapsed}
        toggleSidebar={toggleSidebar}
      />
      
      <div className={`flex-1 flex flex-col transition-all duration-300 ease-in-out ${isSidebarCollapsed ? 'ml-[70px]' : 'ml-[260px]'}`}>
        <Navbar />
        <main className="flex-1 p-6 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
} 