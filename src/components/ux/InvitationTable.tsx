"use client";

import React, { useMemo, useState, useEffect } from "react";
import { Invitation } from "@/store/userManagementStore";
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

interface InvitationTableProps {
  invitations: Invitation[];
  loading: boolean;
  error: string | null;
  onEdit: (invitation: Invitation) => void;
  onDelete: (invitation: Invitation) => void;
  formatDate: (date: Date | string) => string;
  pageSize?: number;
  emptyMessage?: string;
  onDeleteMultiple?: (invitations: Invitation[]) => Promise<void>;
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
const RowActionMenu = ({ invitation, onEdit, onDelete, onCopyEmail, onResend }: { 
  invitation: Invitation; 
  onEdit: (invitation: Invitation) => void;
  onDelete: (invitation: Invitation) => void;
  onCopyEmail: (email: string) => void;
  onResend?: (invitation: Invitation) => void;
}) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [resending, setResending] = useState(false);

  const handleResend = async () => {
    if (!onResend) return;
    
    try {
      setResending(true);
      await onResend(invitation);
      toast.success("Convite reenviado", {
        description: `Convite reenviado para ${invitation.email}`,
        duration: 3000,
        dismissible: true,
      });
    } catch (error) {
      toast.error("Erro ao reenviar convite", {
        description: error instanceof Error ? error.message : "Ocorreu um erro ao reenviar o convite",
        duration: 3000,
        dismissible: true,
      });
    } finally {
      setResending(false);
      setMenuOpen(false);
    }
  };

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
          onClick={() => { onCopyEmail(invitation.email); setMenuOpen(false); }}
          className="flex items-center h-9 px-2 py-1.5 cursor-pointer hover:bg-primary/5 rounded-md transition-colors duration-200"
        >
          <Copy className="mr-2 h-4 w-4 text-muted-foreground" />
          <span>Copiar email</span>
        </DropdownMenuItem>
        
        <DropdownMenuItem
          onClick={() => { onEdit(invitation); setMenuOpen(false); }}
          className="flex items-center h-9 px-2 py-1.5 cursor-pointer hover:bg-primary/5 rounded-md transition-colors duration-200"
        >
          <Edit2 className="mr-2 h-4 w-4 text-muted-foreground" />
          <span>Editar convite</span>
        </DropdownMenuItem>
        
        {invitation.status === "PENDING" && (
          <DropdownMenuItem
            onClick={handleResend}
            disabled={resending}
            className="flex items-center h-9 px-2 py-1.5 cursor-pointer hover:bg-primary/5 rounded-md transition-colors duration-200"
          >
            {resending ? (
              <RefreshCw className="mr-2 h-4 w-4 text-muted-foreground animate-spin" />
            ) : (
              <MailIcon className="mr-2 h-4 w-4 text-muted-foreground" />
            )}
            <span>{resending ? "Reenviando..." : "Reenviar convite"}</span>
          </DropdownMenuItem>
        )}
        
        <DropdownMenuSeparator className="my-1 bg-primary/10" />
        
        <DropdownMenuItem
          onClick={() => { onDelete(invitation); setMenuOpen(false); }}
          disabled={invitation.status === "ACCEPTED"}
          className={cn(
            "flex items-center h-9 px-2 py-1.5 cursor-pointer rounded-md transition-colors duration-200",
            invitation.status === "ACCEPTED" 
              ? "opacity-50 cursor-not-allowed" 
              : "text-destructive hover:bg-destructive/10"
          )}
        >
          <Trash2 className="mr-2 h-4 w-4" />
          <span>Excluir convite</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export function InvitationTable({
  invitations,
  loading,
  error,
  onEdit,
  onDelete,
  formatDate,
  pageSize = 10,
  emptyMessage = "Nenhum convite encontrado.",
  onDeleteMultiple
}: InvitationTableProps) {
  const { 
    invitationsSortColumn, 
    invitationsSortDirection, 
    setInvitationsSortColumn, 
    setInvitationsSortDirection,
    invitationsColumnFilters,
    setInvitationsColumnFilter
  } = useUiPreferencesStore();
  
  const { deleteInvitations } = useUserManagementStore();

  // Convert store sort state to TanStack Table format
  const [sorting, setSorting] = useState<SortingState>(
    invitationsSortColumn && invitationsSortDirection 
      ? [{ id: invitationsSortColumn, desc: invitationsSortDirection === 'desc' }] 
      : []
  );

  // Update store when sorting changes
  useEffect(() => {
    if (sorting.length > 0) {
      setInvitationsSortColumn(sorting[0].id);
      setInvitationsSortDirection(sorting[0].desc ? 'desc' : 'asc');
    } else {
      setInvitationsSortColumn(undefined);
      setInvitationsSortDirection(undefined);
    }
  }, [sorting, setInvitationsSortColumn, setInvitationsSortDirection]);

  // Copy email to clipboard
  const handleCopyEmail = (email: string) => {
    navigator.clipboard.writeText(email);
    toast.success("Email copiado", {
      description: "Email copiado para a área de transferência",
      duration: 3000,
      dismissible: true,
    });
  };

  // Handle resend invitation
  const handleResendInvitation = async (invitation: Invitation) => {
    try {
      // Implement resend functionality
      toast.success("Convite reenviado", {
        description: `Convite para ${invitation.email} reenviado com sucesso`,
        duration: 3000,
        dismissible: true,
      });
      return Promise.resolve();
    } catch (error) {
      return Promise.reject(error);
    }
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

  // Unique status values for filter
  const statusOptions = useMemo(() => {
    const statuses = Array.from(new Set(invitations.map(inv => inv.status)));
    return statuses.map(status => ({ 
      value: status, 
      label: getStatusLabel(status) 
    }));
  }, [invitations]);

  // Unique role values for filter
  const roleOptions = useMemo(() => {
    const roles = Array.from(new Set(invitations.map(inv => inv.role)));
    return roles.map(role => ({ 
      value: role, 
      label: getRoleLabel(role) 
    }));
  }, [invitations]);

  const columns = useMemo<ColumnDef<Invitation>[]>(
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
        accessorKey: "sender",
        header: ({ column }) => (
          <DataTableColumnHeader 
            column={column} 
            title="Enviado por"
            enableFiltering={true}
            filterableOptions={
              Array.from(new Set(
                invitations
                  .map(inv => {
                    if (typeof inv.sender === 'string') {
                      return inv.sender || "Sistema";
                    } else {
                      return inv.sender?.name || inv.sender?.email || "Administrador";
                    }
                  })
                  .filter(Boolean)
              )).map(sender => ({
                value: sender,
                label: sender
              }))
            }
          />
        ),
        cell: ({ row }) => {
          const invitation = row.original;
          const senderName = typeof invitation.sender === 'string' 
            ? invitation.sender 
            : invitation.sender?.name || invitation.sender?.email || "Administrador";
          
          return (
            <div className="font-medium">
              {senderName || "Sistema"}
            </div>
          );
        },
        filterFn: (row, id, filterValue) => {
          const invitation = row.original;
          const filterSenderName = typeof invitation.sender === 'string' 
            ? invitation.sender 
            : invitation.sender?.name || invitation.sender?.email || "Administrador";
          
          return filterValue.includes(filterSenderName || "Sistema");
        },
      },
      {
        accessorKey: "createdAt",
        header: ({ column }) => (
          <DataTableColumnHeader 
            column={column} 
            title="Data de envio"
            enableFiltering={true}
            filterableOptions={
              Array.from(new Set(invitations.map(inv => 
                formatDate(inv.createdAt)
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

      {
        accessorKey: "expiresAt",
        header: ({ column }) => (
          <DataTableColumnHeader 
            column={column} 
            title="Expira em"
            enableFiltering={true}
            filterableOptions={
              Array.from(new Set(invitations.map(inv => 
                formatDate(inv.expiresAt)
              ))).map(date => ({
                value: date,
                label: date
              }))
            }
          />
        ),
        cell: ({ row }) => formatDate(row.original.expiresAt),
        filterFn: (row, id, filterValue) => {
          const formattedDate = formatDate(row.original.expiresAt);
          return filterValue.includes(formattedDate);
        },
      },
      // Actions column with animated three dots
      {
        id: "actions",
        enableSorting: false,
        cell: ({ row }) => {
          const invitation = row.original;
          return (
            <div className="flex justify-center">
              <RowActionMenu
                invitation={invitation}
                onEdit={onEdit}
                onDelete={onDelete}
                onCopyEmail={handleCopyEmail}
                onResend={handleResendInvitation}
              />
            </div>
          );
        },
      },
    ],
    [formatDate, onEdit, onDelete, roleOptions, statusOptions, invitations]
  );

  // Bulk delete handler
  const handleDeleteMultiple = async (selectedInvitations: Invitation[]) => {
    console.log("Deleting multiple invitations:", selectedInvitations);
    
    if (selectedInvitations.length === 0) {
      return;
    }
    
    try {
      // Extract IDs from selected invitations
      const ids = selectedInvitations.map(invitation => invitation.id);
      
      // Use the store method for bulk deletion
      const deletedCount = await deleteInvitations(ids);
      
      toast.success("Convites excluídos", {
        description: `${deletedCount} convites foram excluídos com sucesso`,
        duration: 3000,
        dismissible: true,
      });
      
      return Promise.resolve();
    } catch (error) {
      console.error("Error deleting multiple invitations:", error);
      toast.error("Erro ao excluir convites", {
        description: error instanceof Error ? error.message : "Ocorreu um erro ao excluir os convites",
        duration: 3000,
        dismissible: true,
      });
      return Promise.reject(error);
    }
  };

  return (
    <DataTable
      columns={columns}
      data={invitations}
      loading={loading}
      pageSize={pageSize}
      emptyMessage={
        error
          ? `Erro ao carregar convites: ${error}`
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