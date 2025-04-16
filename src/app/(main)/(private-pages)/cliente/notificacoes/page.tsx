"use client";

import React, { useState, useEffect } from "react";
import { 
  Bell,
  CheckCircle, 
  Archive, 
  MoreHorizontal, 
  Filter, 
  RefreshCw,
  Search,
  Calendar,
} from "lucide-react";
import { format, subDays, startOfMonth, endOfMonth, isSameDay, isWithinInterval, subMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils/utils";
import { useNotificationStore } from "@/store/notificationStore";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { DateRange } from "react-day-picker";

// Date range type
type DateFilter = {
  type: "all" | "today" | "yesterday" | "last7days" | "last30days" | "thisMonth" | "lastMonth" | "custom";
  start?: Date;
  end?: Date;
};

export default function NotificationsPage() {
  const { 
    notifications, 
    unreadCount, 
    isLoading, 
    error, 
    fetchNotifications, 
    markAsRead, 
    markAllAsRead,
    dismissNotification 
  } = useNotificationStore();
  
  const [filteredNotifications, setFilteredNotifications] = useState<any[]>([]);
  const [filter, setFilter] = useState<"all" | "unread" | "read" | "archived">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [dateFilter, setDateFilter] = useState<DateFilter>({ type: "all" });
  const [dateRange, setDateRange] = useState<DateRange | undefined>();

  // Refresh notifications
  const refreshNotifications = async () => {
    try {
      setRefreshing(true);
      await fetchNotifications();
      toast.success("Notificações atualizadas");
    } catch (error) {
      console.error("Error refreshing notifications:", error);
    } finally {
      setRefreshing(false);
    }
  };

  // Apply filters to notifications
  const applyFilters = (notifs: any[], filterStatus: string, query: string, dateRange: DateFilter) => {
    return notifs.filter(notif => {
      // Apply status filter
      if (filterStatus === "unread" && notif.status !== "UNREAD") return false;
      if (filterStatus === "read" && notif.status !== "READ") return false;
      if (filterStatus === "archived" && notif.status !== "ARCHIVED") return false;
      
      // Apply date filter
      const createdAt = new Date(notif.createdAt);
      
      if (dateRange.type === "today") {
        if (!isSameDay(createdAt, new Date())) return false;
      } else if (dateRange.type === "yesterday") {
        if (!isSameDay(createdAt, subDays(new Date(), 1))) return false;
      } else if (dateRange.type === "last7days") {
        if (createdAt < subDays(new Date(), 7)) return false;
      } else if (dateRange.type === "last30days") {
        if (createdAt < subDays(new Date(), 30)) return false;
      } else if (dateRange.type === "thisMonth") {
        const firstDayOfMonth = startOfMonth(new Date());
        const lastDayOfMonth = endOfMonth(new Date());
        if (!isWithinInterval(createdAt, { start: firstDayOfMonth, end: lastDayOfMonth })) return false;
      } else if (dateRange.type === "lastMonth") {
        const lastMonth = subMonths(new Date(), 1);
        const firstDayOfLastMonth = startOfMonth(lastMonth);
        const lastDayOfLastMonth = endOfMonth(lastMonth);
        if (!isWithinInterval(createdAt, { start: firstDayOfLastMonth, end: lastDayOfLastMonth })) return false;
      } else if (dateRange.type === "custom" && dateRange.start && dateRange.end) {
        if (!isWithinInterval(createdAt, { 
          start: new Date(new Date(dateRange.start).setHours(0, 0, 0, 0)), 
          end: new Date(new Date(dateRange.end).setHours(23, 59, 59, 999)) 
        })) return false;
      }
      
      // Apply search query
      if (query) {
        const searchLower = query.toLowerCase();
        return (
          notif.title.toLowerCase().includes(searchLower) ||
          notif.message.toLowerCase().includes(searchLower)
        );
      }
      
      return true;
    }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  };

  const handleFilterChange = (newFilter: "all" | "unread" | "read" | "archived") => {
    setFilter(newFilter);
    setFilteredNotifications(applyFilters(notifications, newFilter, searchQuery, dateFilter));
  };
  
  const handleDateFilterChange = (newDateFilter: DateFilter) => {
    setDateFilter(newDateFilter);
    setFilteredNotifications(applyFilters(notifications, filter, searchQuery, newDateFilter));
  };
  
  const handleSearch = (event: React.ChangeEvent<HTMLInputElement>) => {
    const query = event.target.value;
    setSearchQuery(query);
    setFilteredNotifications(applyFilters(notifications, filter, query, dateFilter));
  };
  
  const handleDateRangeSelect = (range: DateRange | undefined) => {
    setDateRange(range);
    
    if (range?.from && range?.to) {
      const newDateFilter: DateFilter = {
        type: "custom",
        start: range.from,
        end: range.to
      };
      handleDateFilterChange(newDateFilter);
    }
  };
  
  const getDateFilterLabel = () => {
    switch (dateFilter.type) {
      case "today":
        return "Hoje";
      case "yesterday":
        return "Ontem";
      case "last7days":
        return "Últimos 7 dias";
      case "last30days":
        return "Últimos 30 dias";
      case "thisMonth":
        return "Este mês";
      case "lastMonth":
        return "Mês passado";
      case "custom":
        if (dateFilter.start && dateFilter.end) {
          return `${format(dateFilter.start, "dd/MM/yyyy", { locale: ptBR })} - ${format(dateFilter.end, "dd/MM/yyyy", { locale: ptBR })}`;
        }
        return "Personalizado";
      default:
        return "Todas as datas";
    }
  };

  const formatRelativeTime = (date: Date) => {
    // Calculate time difference in milliseconds
    const now = new Date();
    const diffMs = now.getTime() - new Date(date).getTime();
    const diffHrs = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHrs / 24);
    
    if (diffHrs < 1) {
      return "Agora";
    } else if (diffHrs < 24) {
      return `${diffHrs} hora${diffHrs > 1 ? "s" : ""} atrás`;
    } else if (diffDays < 7) {
      return `${diffDays} dia${diffDays > 1 ? "s" : ""} atrás`;
    } else {
      return format(date, "dd MMM yyyy", { locale: ptBR });
    }
  };
  
  const getStatusBadge = (status: string) => {
    if (status === "UNREAD") {
      return <Badge variant="destructive">Não lida</Badge>;
    } else if (status === "READ") {
      return <Badge variant="default">Lida</Badge>;
    } else {
      return <Badge variant="outline">Arquivada</Badge>;
    }
  };

  // Handle archive notification
  const handleArchive = async (id: string) => {
    try {
      const response = await fetch("/api/notifications", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          notificationId: id,
          operation: "archive",
        }),
      });
      
      if (!response.ok) {
        throw new Error("Falha ao arquivar notificação");
      }
      
      // Remove from the UI
      dismissNotification(id);
      
      toast.success("Notificação arquivada");
    } catch (error) {
      toast.error("Erro ao arquivar notificação");
      console.error("Error archiving notification:", error);
    }
  };
  
  // Initialize
  useEffect(() => {
    fetchNotifications();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  
  // Update filtered notifications when notifications change
  useEffect(() => {
    setFilteredNotifications(applyFilters(notifications, filter, searchQuery, dateFilter));
  }, [notifications, filter, searchQuery, dateFilter]);

  return (
    <div className="container mx-auto py-8">
      <div className="flex flex-col space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">Minhas Notificações</h1>
          
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              className="flex items-center"
              onClick={refreshNotifications}
              disabled={refreshing}
            >
              <RefreshCw className={cn("h-4 w-4 mr-2", refreshing && "animate-spin")} />
              Atualizar
            </Button>
            
            {unreadCount > 0 && (
              <Button
                variant="default"
                size="sm"
                onClick={markAllAsRead}
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Marcar todas como lidas
              </Button>
            )}
          </div>
        </div>
        
        <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
          <div className="w-full md:w-1/2 xl:w-1/3 relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar notificações..."
              className="pl-8"
              value={searchQuery}
              onChange={handleSearch}
            />
          </div>
          
          <div className="flex flex-wrap gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <Filter className="h-4 w-4 mr-2" />
                  Status: {filter === "all" ? "Todos" : filter === "unread" ? "Não lidas" : filter === "read" ? "Lidas" : "Arquivadas"}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => handleFilterChange("all")}>
                  Todos
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleFilterChange("unread")}>
                  Não lidas
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleFilterChange("read")}>
                  Lidas
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleFilterChange("archived")}>
                  Arquivadas
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <Calendar className="h-4 w-4 mr-2" />
                  Data: {getDateFilterLabel()}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => handleDateFilterChange({ type: "all" })}>
                  Todas as datas
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleDateFilterChange({ type: "today" })}>
                  Hoje
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleDateFilterChange({ type: "yesterday" })}>
                  Ontem
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleDateFilterChange({ type: "last7days" })}>
                  Últimos 7 dias
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleDateFilterChange({ type: "last30days" })}>
                  Últimos 30 dias
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleDateFilterChange({ type: "thisMonth" })}>
                  Este mês
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleDateFilterChange({ type: "lastMonth" })}>
                  Mês passado
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger>Intervalo personalizado</DropdownMenuSubTrigger>
                  <DropdownMenuSubContent className="w-[300px] p-3">
                    <DateRangePicker 
                      onSelect={handleDateRangeSelect} 
                      initialDateRange={dateRange}
                    />
                  </DropdownMenuSubContent>
                </DropdownMenuSub>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
        
        {isLoading ? (
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, index) => (
              <div key={index} className="border rounded-lg p-4 space-y-3">
                <div className="flex justify-between items-start">
                  <Skeleton className="h-5 w-2/3" />
                  <Skeleton className="h-6 w-20" />
                </div>
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
                <div className="flex justify-between items-center pt-2">
                  <Skeleton className="h-5 w-24" />
                  <Skeleton className="h-9 w-24" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <>
            {filteredNotifications.length === 0 ? (
              <div className="text-center p-8 border rounded-lg">
                <Bell className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">Nenhuma notificação encontrada</h3>
                <p className="text-muted-foreground">
                  {filter === "all" 
                    ? "Você não tem nenhuma notificação com os filtros atuais." 
                    : filter === "unread" 
                      ? "Você não tem notificações não lidas."
                      : filter === "read"
                        ? "Você não tem notificações lidas."
                        : "Você não tem notificações arquivadas."}
                </p>
              </div>
            ) : (
              <div className="space-y-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredNotifications.map((notification) => (
                  <div 
                    key={notification.id}
                    className={cn(
                      "border rounded-lg p-4 transition-colors bg-emerald-300/50 hover:bg-emerald-300 border-emerald-300 hover:border-emerald-300",
                      notification.status === "UNREAD" && "bg-blue-500 dark:bg-blue-900/10"
                    )}
                  >
                    <div className="flex flex-col space-y-2">
                      <div className="flex justify-between items-start">
                        <h3 className={cn(
                          "text-lg",
                          notification.status === "UNREAD" && "font-semibold"
                        )}>
                          {notification.title}
                        </h3>
                        <div className="flex items-center">
                          {getStatusBadge(notification.status)}
                        </div>
                      </div>
                      
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {notification.message}
                      </p>
                      
                      <div className="flex justify-between items-center pt-2">
                        <span className="text-xs text-muted-foreground">
                          {formatRelativeTime(new Date(notification.createdAt))}
                        </span>
                        
                        <div className="flex space-x-2">
                          {notification.status === "UNREAD" && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => markAsRead(notification.id)}
                            >
                              <CheckCircle className="h-4 w-4 mr-2" />
                              Marcar como lida
                            </Button>
                          )}
                          
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              {notification.status !== "READ" && notification.status !== "UNREAD" ? null : (
                                <DropdownMenuItem 
                                  onClick={() => handleArchive(notification.id)}
                                >
                                  <Archive className="h-4 w-4 mr-2" />
                                  Arquivar
                                </DropdownMenuItem>
                              )}
                              {notification.status === "READ" ? null : (
                                <DropdownMenuItem
                                  onClick={() => markAsRead(notification.id)}
                                >
                                  <CheckCircle className="h-4 w-4 mr-2" />
                                  Marcar como lida
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
