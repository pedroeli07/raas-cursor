// path: src/components/global/infobar/index.tsx
'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { 
  Bell, User, Search, Menu, X, Settings, 
  LogOut, UserCircle, ChevronRight, LayoutDashboard,
  MenuIcon, ChevronDown, CheckCircle, Archive, 
  AlertCircle, Clock, MessageCircle, RefreshCw
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetFooter,
  SheetClose,
} from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { useAuthStore } from '@/store/authStore';
import { useUserManagementStore } from '@/store/userManagementStore';
import { useSidebar } from '@/lib/context/SidebarContext';
import { cn } from "@/lib/utils/utils";
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import Link from 'next/link';
import { VariantProps } from 'class-variance-authority';
import { badgeVariants } from "@/components/ui/badge";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale/pt-BR";
import ThemeSwitcher from '@/components/ThemeSwitcher';
import { ScrollArea } from "@/components/ui/scroll-area";

interface InfoBarProps {
  pageTitle?: string;
}

// Notification type definition
type Notification = {
  id: string;
  title: string;
  message: string;
  type: "SYSTEM" | "HELP";
  status: "READ" | "UNREAD" | "ARCHIVED";
  relatedId?: string;
  readAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export default function InfoBar({ pageTitle }: InfoBarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { logout, user } = useAuthStore();
  const { users, fetchUsers } = useUserManagementStore();
  const { 
    isCollapsed, 
    toggleSidebar, 
    isMobileSidebarOpen, 
    openMobileSidebar, 
    detectIfMobile 
  } = useSidebar();
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const [notificationOpen, setNotificationOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  const isMobile = detectIfMobile();
  
  // Find current user in the users list
  const currentUser = users.find(u => u.email === user?.email);
  
  // Use the most detailed user information available
  const activeUser = currentUser || user;
  
  const userInitials = activeUser?.name
    ? activeUser.name
        .split(' ')
        .map((n) => n[0])
        .slice(0, 2)
        .join('')
        .toUpperCase()
    : 'U';

  // Count unread notifications
  const unreadCount = notifications.filter(n => n.status === "UNREAD").length;

  // Fetch notifications
  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/notifications");
      
      if (!response.ok) {
        throw new Error("Falha ao carregar notificações");
      }
      
      const data = await response.json();
      setNotifications(data.notifications);
    } catch (error) {
      console.error("Error fetching notifications:", error);
    } finally {
      setLoading(false);
    }
  };

  // Format relative time for notifications
  const formatRelativeTime = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - new Date(date).getTime();
    
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (minutes < 60) {
      return `há ${minutes === 0 ? 1 : minutes} ${minutes === 1 ? 'minuto' : 'minutos'}`;
    } else if (hours < 24) {
      return `há ${hours} ${hours === 1 ? 'hora' : 'horas'}`;
    } else if (days < 7) {
      return `há ${days} ${days === 1 ? 'dia' : 'dias'}`;
    } else {
      return format(new Date(date), "dd 'de' MMM", { locale: ptBR });
    }
  };

  // Mark notification as read
  const markAsRead = async (id: string) => {
    try {
      const response = await fetch("/api/notifications", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          notificationId: id,
          operation: "markAsRead",
        }),
      });
      
      if (!response.ok) {
        throw new Error("Falha ao marcar como lida");
      }
      
      // Update local state
      setNotifications(prev => 
        prev.map(notif => 
          notif.id === id 
            ? { ...notif, status: "READ" as const, readAt: new Date() } 
            : notif
        )
      );
      
    } catch (error) {
      console.error("Error marking notification as read:", error);
    }
  };

  // Mark all as read
  const markAllAsRead = async () => {
    try {
      const unreadNotifications = notifications.filter(n => n.status === "UNREAD");
      
      if (unreadNotifications.length === 0) return;
      
      for (const notification of unreadNotifications) {
        await markAsRead(notification.id);
      }
      
      toast.success("Todas as notificações marcadas como lidas");
    } catch (error) {
      console.error("Error marking all notifications as read:", error);
    }
  };

  // Handle notification click
  const handleNotificationClick = async (notification: Notification) => {
    // Mark as read if unread
    if (notification.status === "UNREAD") {
      await markAsRead(notification.id);
    }
    
    // Navigate to related content if available
    if (notification.type === "HELP" && notification.relatedId) {
      router.push(`/admin/suporte/central-de-ajuda/${notification.relatedId}`);
      setNotificationOpen(false);
    }
  };

  // Get notification type icon
  const getNotificationIcon = (type: string, status: string) => {
    if (type === "HELP") {
      switch (status) {
        case "UNREAD":
          return <AlertCircle className="h-5 w-5 text-blue-500" />;
        case "READ":
          return <MessageCircle className="h-5 w-5 text-blue-500" />;
        default:
          return <Bell className="h-5 w-5 text-blue-500" />;
      }
    } else { // SYSTEM
      switch (status) {
        case "UNREAD":
          return <AlertCircle className="h-5 w-5 text-emerald-500" />;
        case "READ":
          return <CheckCircle className="h-5 w-5 text-emerald-500" />;
        default:
          return <Bell className="h-5 w-5 text-emerald-500" />;
      }
    }
  };

  // Fetch notifications when the component mounts
  useEffect(() => {
    fetchNotifications();
  }, []);

  // Fetch users when component mounts
  useEffect(() => {
    // Only fetch if user is authenticated
    if (user && users.length === 0) {
      fetchUsers();
    }
  }, [user, users.length, fetchUsers]);

  // Check for outside clicks to close notification dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setNotificationOpen(false);
      }
    }
    
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleLogout = async () => {
    try {
      await logout();
      router.push('/login');
    } catch (error) {
      console.error('Erro ao fazer logout:', error);
    }
  };

  return (
    <div className={cn(
      "sticky top-0 w-full z-20 bg-white dark:bg-background",
      "border-b h-16 px-4 flex items-center justify-between",
      "transition-all duration-300",
    )}>
      <div className="flex items-center gap-4">
        {/* Mobile menu button - only visible on mobile */}
        {isMobile && (
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={openMobileSidebar}
            className="lg:hidden bg-emerald-200 hover:bg-emerald-300 text-emerald-800
                                    dark:bg-emerald-900 dark:hover:bg-emerald-800 dark:text-emerald-100"
          >
            <Menu className="h-5 w-5" />
            <span className="sr-only">Toggle menu</span>
          </Button>
        )}
        
        {/* Center with page title */}
        {pageTitle && (
          <div className="absolute left-0 right-0 flex justify-center pointer-events-none mt-0">
            <h1 className="text-4xl font-bold text-primary">{pageTitle}</h1>
          </div>
        )}
      </div>
      
      <div className="flex items-center gap-3">
        {/* Notifications - Mobile */}
        {isMobile ? (
          
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon" className="relative bg-emerald-200 hover:bg-emerald-300 text-emerald-800 border-emerald-400
                dark:bg-emerald-900 dark:hover:bg-emerald-800 dark:text-emerald-100 dark:border-emerald-700">
                <Bell className="h-4 w-4 " />
                <span className="sr-only">Notificações</span>
                {unreadCount > 0 && (
                  <Badge
                    variant="destructive"
                    className="absolute -top-1 -right-1 h-4 w-4 p-0 flex items-center justify-center text-[10px]"
                  >
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </Badge>
                )}
              </Button>
            </SheetTrigger>
            <SheetContent className="w-full sm:max-w-md">
              <SheetHeader className="text-left pb-4">
                <SheetTitle className="text-xl flex items-center gap-2">
                  <Bell className="h-5 w-5 text-emerald-500" />
                  Notificações
                </SheetTitle>
              </SheetHeader>
              
              <div className="mt-2 flex justify-between items-center">
                <div className="text-sm text-muted-foreground">
                  {unreadCount} não {unreadCount === 1 ? 'lida' : 'lidas'}
                </div>
                {unreadCount > 0 && (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={markAllAsRead}
                    className="text-xs bg-emerald-200 hover:bg-emerald-300 text-emerald-800 border-emerald-400
                    dark:bg-emerald-900 dark:hover:bg-emerald-800 dark:text-emerald-100 dark:border-emerald-700"
                  >
                    <CheckCircle className="mr-1 h-3 w-3" />
                    Marcar tudo como lido
                  </Button>
                )}
              </div>
              
              <Separator className="my-4" />
              
              {loading ? (
                <div className="flex justify-center items-center py-8">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-emerald-500"></div>
                </div>
              ) : notifications.length === 0 ? (
                <div className="text-center py-8">
                  <Bell className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
                  <h3 className="font-medium">Nenhuma notificação</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Você não tem notificações no momento
                  </p>
                </div>
              ) : (
                <div className="space-y-1 mt-2 max-h-[calc(100vh-13rem)] overflow-y-auto">
                  {notifications
                    .filter(notif => notif.status !== "ARCHIVED")
                    .slice(0, 10)
                    .map((notification) => (
                      <Button
                        key={notification.id}
                        variant="ghost"
                        className={cn(
                          "w-full justify-start px-2 py-3 h-auto",
                          notification.status === "UNREAD" ? "bg-emerald-100" : "bg-emerald-50"
                        )}
                        onClick={() => handleNotificationClick(notification)}
                      >
                        <div className="flex gap-3 items-start text-left">
                          <div className="mt-0.5">
                            {getNotificationIcon(notification.type, notification.status)}
                          </div>
                          <div className="flex-1 space-y-1">
                            <p className={cn(
                              "text-sm",
                              notification.status === "UNREAD" ? "font-semibold" : "font-medium"
                            )}>
                              {notification.title}
                            </p>
                            <p className="text-xs text-muted-foreground line-clamp-2">
                              {notification.message}
                            </p>
                            <div className="flex justify-between items-center">
                              <p className="text-xs text-muted-foreground">
                                {formatRelativeTime(new Date(notification.createdAt))}
                              </p>
                            
                              {notification.status === "UNREAD" && (
                                <Badge variant="outline" className="h-5 text-[10px] bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                                  Nova
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                      </Button>
                    ))}
                </div>
              )}
              
              <SheetFooter className="flex justify-center sm:justify-center mt-4 gap-2">
                <Button variant="outline" asChild className="w-full">
                  <Link href="/admin/suporte/notificacoes">
                    Ver todas as notificações
                  </Link>
                </Button>
              </SheetFooter>
            </SheetContent>
          </Sheet>
        ) : (
          // Notifications - Desktop
          <div className="relative" ref={dropdownRef}>
            <Button 
              variant="outline" 
              size="icon" 
              className="relative bg-emerald-100 hover:bg-emerald-200 border-emerald-300 text-emerald-800
              dark:bg-emerald-900 dark:hover:bg-emerald-800 dark:text-emerald-100 dark:border-emerald-700"
              onClick={() => setNotificationOpen(!notificationOpen)}
            >
              <Bell className="h-4 w-4" />
              <span className="sr-only">Notificações</span>
              {unreadCount > 0 && (
                <Badge
                  variant="destructive"
                  className="absolute -top-1 -right-1 h-4 w-4 p-0 flex items-center justify-center text-[10px]"
                >
                  {unreadCount > 9 ? '9+' : unreadCount}
                </Badge>
              )}
            </Button>
            
            <AnimatePresence>
              {notificationOpen && (
                <motion.div
                  initial={{ opacity: 0, x: "100%" }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: "100%" }}
                  transition={{ duration: 0.3, ease: "easeInOut" }}
                  className="fixed top-0 right-0 bottom-0 h-screen w-96 border-l border-border bg-background shadow-xl z-50 flex flex-col"
                >
                  <div className="p-4 border-b border-border flex justify-between items-center flex-shrink-0">
                    <h3 className="font-semibold text-lg flex items-center gap-2">
                      <Bell className="h-5 w-5 text-primary" />
                      Notificações
                    </h3>
                    {unreadCount > 0 && (
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={markAllAsRead}
                        className="h-8 text-xs flex items-center text-primary hover:bg-primary/10"
                      >
                        <CheckCircle className="mr-1 h-3 w-3" />
                        Marcar tudo como lido
                      </Button>
                    )}
                  </div>
                  
                  <ScrollArea className="flex-grow">
                    <div className="p-2">
                      {loading ? (
                        <div className="flex justify-center items-center py-12">
                          <RefreshCw className="h-6 w-6 animate-spin text-primary" />
                        </div>
                      ) : notifications.length === 0 ? (
                        <div className="text-center py-12 px-4">
                          <Bell className="h-10 w-10 text-muted-foreground mx-auto mb-4" />
                          <h3 className="font-medium text-lg">Nenhuma notificação</h3>
                          <p className="text-sm text-muted-foreground mt-1">
                            Você está em dia!
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-1">
                          {notifications
                            .filter(notif => notif.status !== "ARCHIVED")
                            .map((notification) => (
                              <Button
                                key={notification.id}
                                variant="ghost"
                                className={cn(
                                  "w-full justify-start px-3 py-3 h-auto rounded-md text-left",
                                  notification.status === "UNREAD" && "bg-primary/10"
                                )}
                                onClick={() => handleNotificationClick(notification)}
                              >
                                <div className="flex gap-3 items-start w-full">
                                  <div className="mt-1 flex-shrink-0">
                                    {getNotificationIcon(notification.type, notification.status)}
                                  </div>
                                  <div className="flex-1 space-y-1 min-w-0">
                                    <p className={cn(
                                      "text-sm truncate",
                                      notification.status === "UNREAD" ? "font-semibold" : "font-medium"
                                    )}>
                                      {notification.title}
                                    </p>
                                    <p className="text-xs text-muted-foreground line-clamp-2">
                                      {notification.message}
                                    </p>
                                    <div className="flex justify-between items-center mt-1">
                                      <p className="text-xs text-muted-foreground">
                                        {formatRelativeTime(new Date(notification.createdAt))}
                                      </p>
                                      {notification.status === "UNREAD" && (
                                        <Badge variant="outline" className="h-5 text-[10px] bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300 font-medium px-1.5">
                                          Nova
                                        </Badge>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </Button>
                            ))}
                        </div>
                      )}
                    </div>
                  </ScrollArea>
                  
                  <div className="p-3 border-t border-border flex-shrink-0">
                    <Button 
                      variant="outline" 
                      className="w-full justify-center text-sm border-primary/20 hover:border-primary/40 hover:bg-primary/5"
                      onClick={() => {
                        router.push('/admin/suporte/notificacoes');
                        setNotificationOpen(false);
                      }}
                    >
                      Ver todas as notificações
                    </Button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
        <ThemeSwitcher className="bg-emerald-100 hover:bg-emerald-200 border-emerald-300 text-emerald-800  border
        dark:bg-emerald-900 dark:hover:bg-emerald-800 dark:text-emerald-100 dark:border-emerald-700" />
        {/* User Profile Button */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button 
              variant="ghost" 
              size="icon"
              className="rounded-full h-10 w-10 p-0 bg-emerald-100 hover:bg-emerald-200 border-emerald-300 text-emerald-800  border hover:border-emerald-400 transition-all"
            >
              <Avatar className="h-full w-full bg-emerald-100 hover:bg-emerald-200 border-emerald-300 text-emerald-800  border hover:border-emerald-400 transition-all
              dark:bg-emerald-900 dark:hover:bg-emerald-800 dark:text-emerald-100 dark:border-emerald-700">
                <AvatarImage 
                  src={activeUser ? (activeUser as any).image || '' : ''} 
                  alt={activeUser?.name || 'User'} 
                />
                <AvatarFallback>{userInitials}</AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium leading-none">{activeUser?.name || 'Usuário'}</p>
                <p className="text-xs leading-none text-muted-foreground">{activeUser?.email || 'email@example.com'}</p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem>
              <UserCircle className="mr-2 h-4 w-4" />
              <span>Perfil</span>
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Settings className="mr-2 h-4 w-4" />
              <span>Configurações</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => handleLogout()}>
              <LogOut className="mr-2 h-4 w-4" />
              <span>Sair</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}