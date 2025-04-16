// Path: src/components/ux/UserTable.tsx

"use client";

import React, { useMemo, useState, useEffect } from "react";
import { User } from "@/store/userManagementStore";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ColumnDef, SortingState } from "@tanstack/react-table";
import { DataTable } from "@/components/ui/data-table";
import { MailIcon, Edit2, Trash2, ClipboardCopy, CheckCircle, XCircle, Clock, CalendarIcon, MoreHorizontal, Copy, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { DataTableColumnHeader } from "@/components/ui/data-table-column-header";
import { 
  Tooltip, 
  TooltipContent, 
  TooltipProvider, 
  TooltipTrigger 
} from "@/components/ui/tooltip";
import { useUiPreferencesStore } from "@/store/uiPreferencesStore";
import { useUserManagementStore } from "@/store/userManagementStore";
import { cn } from "@/lib/utils/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface UserTableProps {
  users: User[];
  loading: boolean;
  error: string | null;
  onEdit: (user: User) => void;
  onDelete: (user: User) => void;
  formatDate: (date: Date | string) => string;
  pageSize?: number;
  emptyMessage?: string;
  onDeleteMultiple?: (users: User[]) => Promise<void>;
}

// Custom component for the typing-like animation dots
const AnimatedDots = () => {
  return (
    <div className="flex space-x-1 items-center">
      <div className="w-1.5 h-1.5 bg-primary/70 rounded-full animate-bounce" style={{ animationDelay: "0ms" }}></div>
      <div className="w-1.5 h-1.5 bg-primary/70 rounded-full animate-bounce" style={{ animationDelay: "150ms" }}></div>
      <div className="w-1.5 h-1.5 bg-primary/70 rounded-full animate-bounce" style={{ animationDelay: "300ms" }}></div>
    </div>
  );
};

// Custom component for row action menu
const RowActionMenu = ({ user, onEdit, onDelete, onCopyEmail, onResend }: { 
  user: User; 
  onEdit: (user: User) => void;
  onDelete: (user: User) => void;
  onCopyEmail: (email: string) => void;
  onResend?: (user: User) => void;
}) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [resending, setResending] = useState(false);

  return (
    <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 p-1 rounded-full hover:bg-primary/5 hover:text-primary focus:bg-primary/10 transition-all duration-200"
        >
          {menuOpen ? <AnimatedDots /> : <MoreHorizontal className="h-4 w-4" />}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56 bg-card border border-primary/10 shadow-lg shadow-emerald-500/5 rounded-lg p-1">
        <DropdownMenuItem
          onClick={() => { onCopyEmail(user.email); setMenuOpen(false); }}
          className="flex items-center h-9 px-2 py-1.5 cursor-pointer hover:bg-primary/5 rounded-md transition-colors duration-200"
        >
          <Copy className="mr-2 h-4 w-4 text-muted-foreground" />
          <span>Copiar email</span>
        </DropdownMenuItem>
        
        <DropdownMenuItem
          onClick={() => { onEdit(user); setMenuOpen(false); }}
          className="flex items-center h-9 px-2 py-1.5 cursor-pointer hover:bg-primary/5 rounded-md transition-colors duration-200"
        >
          <Edit2 className="mr-2 h-4 w-4 text-muted-foreground" />
          <span>Editar usuário</span>
        </DropdownMenuItem>
        
          <DropdownMenuItem
          onClick={() => { onDelete(user); setMenuOpen(false); }}
          className="flex items-center h-9 px-2 py-1.5 cursor-pointer hover:bg-primary/5 rounded-md transition-colors duration-200"
          >
            <Trash2 className="mr-2 h-4 w-4 text-muted-foreground" />
            <span>Excluir usuário</span>
          </DropdownMenuItem>
        
        <DropdownMenuSeparator className="my-1 bg-primary/10" />
        
        <DropdownMenuItem
          onClick={() => { onDelete(user); setMenuOpen(false); }}
          className={cn(
            "flex items-center h-9 px-2 py-1.5 cursor-pointer rounded-md transition-colors duration-200",
            "text-destructive hover:bg-destructive/10"
          )}
        >
          <Trash2 className="mr-2 h-4 w-4" />
          <span>Excluir usuário</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export function UserTable({
  users,
  loading,
  error,
  onEdit,
  onDelete,
  formatDate,
  pageSize = 10,
  emptyMessage = "Nenhum convite encontrado.",
  onDeleteMultiple
}: UserTableProps) {
  const { 
    usersSortColumn, 
    usersSortDirection, 
    setUsersSortColumn, 
    setUsersSortDirection,
    usersColumnFilters,
    setUsersColumnFilter
  } = useUiPreferencesStore();
  
  const { deleteInvitations } = useUserManagementStore();

  // Define status options for filtering
  const statusOptions = useMemo(() => [
    { value: "PENDING", label: "Pendente" },
    { value: "ACCEPTED", label: "Aceito" },
    { value: "REVOKED", label: "Revogado" },
    { value: "EXPIRED", label: "Expirado" }
  ], []);

  // Convert store sort state to TanStack Table format
  const [sorting, setSorting] = useState<SortingState>(
    usersSortColumn && usersSortDirection 
      ? [{ id: usersSortColumn, desc: usersSortDirection === 'desc' }] 
      : []
  );

  // Update store when sorting changes
  useEffect(() => {
    if (sorting.length > 0) {
      setUsersSortColumn(sorting[0].id);
      setUsersSortDirection(sorting[0].desc ? 'desc' : 'asc');
    } else {
      setUsersSortColumn(undefined);
      setUsersSortDirection(undefined);
    }
  }, [sorting, setUsersSortColumn, setUsersSortDirection]);

  // Copy email to clipboard
  const handleCopyEmail = (email: string) => {
    navigator.clipboard.writeText(email);
    toast.success("Email copiado", {
      description: "Email copiado para a área de transferência",
      duration: 3000,
      dismissible: true,
    });
  };

  // Get status badge variant
  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "PENDING":
        return "warning";
      case "ACCEPTED":
        return "success";
      case "REVOKED":
        return "destructive";
      case "EXPIRED":
        return "outline";
      default:
        return "secondary";
    }
  };

  // Get status label
  const getStatusLabel = (status: string) => {
    switch (status) {
      case "PENDING":
        return "Pendente";
      case "ACCEPTED":
        return "Aceito";
      case "REVOKED":
        return "Revogado";
      case "EXPIRED":
        return "Expirado";
      default:
        return status;
    }
  };

  // Get status icon
  const getStatusIcon = (status: string) => {
    switch (status) {
      case "PENDING":
        return <Clock className="h-4 w-4 mr-1" />;
      case "ACCEPTED":
        return <CheckCircle className="h-4 w-4 mr-1" />;
      case "REVOKED":
        return <XCircle className="h-4 w-4 mr-1" />;
      case "EXPIRED":
        return <CalendarIcon className="h-4 w-4 mr-1" />;
      default:
        return null;
    }
  };

  // Get role label
  const getRoleLabel = (role: string) => {
    switch (role) {
      case "SUPER_ADMIN":
        return "Super Administrador";
      case "ADMIN":
        return "Administrador";
      case "ADMIN_STAFF":
        return "Equipe Administrativa";
      case "CUSTOMER":
        return "Cliente";
      case "ENERGY_RENTER":
        return "Locador de Energia";
      default:
        return role;
    }
  };

  // Get role badge variant
  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case "SUPER_ADMIN":
        return "bg-gradient-to-r from-gray-900 to-emerald-900 text-white border-emerald-950 shadow-lg shadow-emerald-900/20";
      case "ADMIN":
        return "bg-gradient-to-r from-gray-800 to-emerald-800 text-white border-emerald-900 shadow-lg shadow-emerald-800/20";
      case "ADMIN_STAFF":
        return "bg-gradient-to-r from-gray-700 to-emerald-700 text-white border-emerald-800 shadow-lg shadow-emerald-700/20";
      case "CUSTOMER":
        return "bg-gradient-to-r from-gray-800 to-blue-800 text-white border-blue-900 shadow-lg shadow-blue-800/20";
      case "ENERGY_RENTER":
        return "bg-gradient-to-r from-gray-800 to-blue-700 text-white border-blue-800 shadow-lg shadow-blue-700/20";
      default:
        return "bg-gray-200 text-gray-800";
    }
  };

  // Unique role values for filter
  const roleOptions = useMemo(() => {
    const roles = Array.from(new Set(users.map(user => user.role)));
    return roles.map(role => ({ 
      value: role, 
      label: getRoleLabel(role) 
    }));
  }, [users]);

  const columns = useMemo<ColumnDef<User>[]>(
    () => [
      {
        accessorKey: "name",
        header: ({ column }) => (
          <DataTableColumnHeader 
            column={column} 
            title="Nome / Email" 
            enableFiltering={false}
          />
        ),
        cell: ({ row }) => {
          const invitation = row.original;
          return (
            <div>
              <div className="font-medium">{invitation.name || "Sem nome"}</div>
              <div className="text-sm text-muted-foreground">{invitation.email}</div>
            </div>
          );
        },
      },
      {
        accessorKey: "role",
        header: ({ column }) => (
          <DataTableColumnHeader 
            column={column} 
            title="Papel" 
            enableFiltering={true}
            filterableOptions={roleOptions}
          />
        ),
        cell: ({ row }) => {
          const role = row.getValue("role") as string;
          return (
            <Badge 
              variant="outline"
              className={cn(
                "shadow-sm font-medium transition-all duration-300 hover:shadow-md",
                getRoleBadgeVariant(role)
              )}
            >
              {getRoleLabel(role)}
            </Badge>
          );
        },
        filterFn: (row, id, filterValue) => {
          const value = row.getValue(id) as string;
          return filterValue.includes(value);
        },
      },
      {
        accessorKey: "status",
        header: ({ column }) => (
          <DataTableColumnHeader 
            column={column} 
            title="Status" 
            enableFiltering={true}
            filterableOptions={statusOptions}
          />
        ),
        cell: ({ row }) => {
          const status = row.getValue("status") as string;
          return (
            <Badge 
              variant={getStatusBadgeVariant(status)} 
              className="flex w-fit items-center shadow-sm hover:shadow-md transition-all duration-300"
            >
              {getStatusIcon(status)}
              {getStatusLabel(status)}
            </Badge>
          );
        },
        filterFn: (row, id, filterValue) => {
          const value = row.getValue(id) as string;
          return filterValue.includes(value);
        },
      },
      {
        accessorKey: "createdAt",
        header: ({ column }) => (
          <DataTableColumnHeader 
            column={column} 
            title="Data de criação"
            enableFiltering={true}
            filterableOptions={
              Array.from(new Set(users.map(user => 
                formatDate(user.createdAt)
              ))).map(date => ({
                value: date,
                label: date
              }))
            }
          />
        ),
        cell: ({ row }) => formatDate(row.original.createdAt),
        filterFn: (row, id, filterValue) => {
          const formattedDate = formatDate(row.original.createdAt);
          return filterValue.includes(formattedDate);
        },
      },

    
      // Actions column with animated three dots
      {
        id: "actions",
        enableSorting: false,
          cell: ({ row }) => {
            const user = row.original;
          return (
            <div className="flex justify-center">
              <RowActionMenu
                user={user}
                onEdit={onEdit}
                onDelete={onDelete}
                onCopyEmail={handleCopyEmail}
              />
            </div>
          );
        },
      },
    ],
    [formatDate, onEdit, onDelete, roleOptions, statusOptions, users]
  );

  // Bulk delete handler
  const handleDeleteMultiple = async (selectedUsers: User[]) => {
    console.log("Deleting multiple users:", selectedUsers);
    
    if (selectedUsers.length === 0) {
      return;
    }
    
    try {
      if (onDeleteMultiple) {
        await onDeleteMultiple(selectedUsers);
        
        toast.success("Usuários excluídos", {
          description: `${selectedUsers.length} usuários foram excluídos com sucesso`,
          duration: 3000,
          dismissible: true,
        });
      } else {
        // Extract IDs from selected users
        const ids = selectedUsers.map(user => user.id);
        
        // Use the store method for bulk deletion
        const deletedCount = await deleteInvitations(ids);
        
        toast.success("Usuários excluídos", {
          description: `${deletedCount} usuários foram excluídos com sucesso`,
          duration: 3000,
          dismissible: true,
        });
      }
      
      return Promise.resolve();
    } catch (error) {
      console.error("Error deleting multiple users:", error);
      toast.error("Erro ao excluir usuários", {
        description: error instanceof Error ? error.message : "Ocorreu um erro ao excluir os usuários",
        duration: 3000,
        dismissible: true,
      });
      return Promise.reject(error);
    }
  };

  return (
    <DataTable
      columns={columns}
      data={users}
      loading={loading}
      pageSize={pageSize}
      emptyMessage={
        error
          ? `Erro ao carregar usuários: ${error}`
          : emptyMessage
      }
      state={{
        sorting,
      }}
      onSortingChange={setSorting}
      enableScroll={true}
      maxHeight="calc(100vh - 300px)"
      className="overflow-hidden"
      tableClassName="[&_thead_tr]:bg-emerald-50 [&_thead_th]:text-emerald-900 dark:[&_thead_tr]:bg-emerald-950/30 dark:[&_thead_th]:text-emerald-300 [&_tr:nth-child(even)]:bg-emerald-50/50 dark:[&_tr:nth-child(even)]:bg-emerald-950/10 hover:[&_tr:hover]:bg-emerald-100/70 dark:hover:[&_tr:hover]:bg-emerald-800/20 [&_.tooltip-content]:max-w-md [&_.tooltip-content]:p-3 [&_.tooltip-content]:bg-white dark:[&_.tooltip-content]:bg-gray-800 [&_.tooltip-content]:border [&_.tooltip-content]:border-emerald-200 dark:[&_.tooltip-content]:border-emerald-800 [&_.tooltip-content]:shadow-lg [&_.tooltip-content]:text-sm"
      onDeleteRows={handleDeleteMultiple}
    />
  );
} 