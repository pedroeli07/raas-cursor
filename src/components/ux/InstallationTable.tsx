"use client";

import React, { useMemo, useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ColumnDef, SortingState } from "@tanstack/react-table";
import { DataTable } from "@/components/ui/data-table";
import { 
  Edit, 
  Trash2, 
  MoreHorizontal, 
  Copy, 
  BarChart2, 
  Zap, 
  Building2,
  ExternalLink,
  Search
} from "lucide-react";
import { toast } from "sonner";
import { DataTableColumnHeader } from "@/components/ui/data-table-column-header";
import { useUiPreferencesStore } from "@/store/uiPreferencesStore";
import { cn } from "@/lib/utils/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Installation, InstallationType, Invoice, User, InstallationStatus, Distributor, Address } from "@prisma/client";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import Link from "next/link";

// Extended Installation type with relations
interface InstallationWithRelations extends Installation {
  distributor?: { id: string; name: string } | null;
  owner?: User | null;
  address?: Address | null;
  // Energy fields that might not be in the base model
  generation?: number | null;
  transfer?: number | null;
  consumption?: number | null;
  receipt?: number | null;
  compensation?: number | null;
  quota?: number | null;
  latestEnergyData?: {
    period: string;
    consumption: number | null;
    generation: number | null;
    receipt?: number | null;
    received?: number | null;
    compensation: number | null;
    transferred: number | null;
    previousBalance: number | null;
    currentBalance: number | null;
    expiringBalanceAmount: number | null;
    expiringBalancePeriod: string | null;
    quota: number | null;
  } | null;
}

// Interface de alocação (relação entre geradora e consumidora)
interface Allocation {
    id: string;
    generatorId: string;
    generator?: Installation;
    consumerId: string;
    consumer?: Installation;
    quota: number; // percentual de 0 a 100
    createdAt: Date;
    updatedAt: Date;
  }
  
 interface EnergyBalance {
    id: string;
    installationId: string;
    installation?: Installation;
    balance: number;
    createdAt: Date;
    updatedAt: Date;
  }
  
  
  
  interface UserWithDetailsDto extends User {
    installations?: Installation[];
    allocations?: Allocation[];
    invoices?: Invoice[];
    energyBalance?: EnergyBalance;
    metadata?: Record<string, any>;
  } 
  


interface InstallationTableProps {
  installations: InstallationWithRelations[];
  loading: boolean;
  error: string | null;
  onEdit: (installation: InstallationWithRelations) => void;
  onDelete: (installation: InstallationWithRelations) => void;
  onViewDetails?: (installation: InstallationWithRelations) => void;
  onViewConsumption?: (installation: InstallationWithRelations) => void;
  formatDate: (date: Date | string) => string;
  formatEnergy: (value: number) => string;
  formatCurrency: (value: number) => string;
  pageSize?: number;
  emptyMessage?: string;
  onDeleteMultiple?: (installations: InstallationWithRelations[]) => Promise<void>;
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
const RowActionMenu = ({ installation, onEdit, onDelete, onViewDetails, onViewConsumption }: { 
  installation: InstallationWithRelations; 
  onEdit: (installation: InstallationWithRelations) => void;
  onDelete: (installation: InstallationWithRelations) => void;
  onViewDetails?: (installation: InstallationWithRelations) => void;
  onViewConsumption?: (installation: InstallationWithRelations) => void;
}) => {
  const [menuOpen, setMenuOpen] = useState(false);

  // Generate details URL
  const detailsUrl = `/admin/instalacoes/${installation.id}`;

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
        <DropdownMenuItem asChild>
          <Link 
            href={detailsUrl}
            className="flex items-center h-9 px-2 py-1.5 cursor-pointer hover:bg-primary/5 rounded-md transition-colors duration-200"
          >
            <ExternalLink className="mr-2 h-4 w-4 text-muted-foreground" />
            <span>Ver detalhes</span>
          </Link>
        </DropdownMenuItem>
        
        <DropdownMenuItem
          onClick={() => { onEdit(installation); setMenuOpen(false); }}
          className="flex items-center h-9 px-2 py-1.5 cursor-pointer hover:bg-primary/5 rounded-md transition-colors duration-200"
        >
          <Edit className="mr-2 h-4 w-4 text-muted-foreground" />
          <span>Editar instalação</span>
        </DropdownMenuItem>
        
        <DropdownMenuItem
          onClick={() => {
            navigator.clipboard.writeText(installation.installationNumber);
            toast.success("Número copiado para a área de transferência");
            setMenuOpen(false);
          }}
          className="flex items-center h-9 px-2 py-1.5 cursor-pointer hover:bg-primary/5 rounded-md transition-colors duration-200"
        >
          <Copy className="mr-2 h-4 w-4 text-muted-foreground" />
          <span>Copiar número</span>
        </DropdownMenuItem>
        
        <DropdownMenuSeparator className="my-1 bg-primary/10" />
        
        <DropdownMenuItem
          onClick={() => { onDelete(installation); setMenuOpen(false); }}
          className="flex items-center h-9 px-2 py-1.5 cursor-pointer text-destructive hover:bg-destructive/10 rounded-md transition-colors duration-200"
        >
          <Trash2 className="mr-2 h-4 w-4" />
          <span>Excluir instalação</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

// Add a function to get installation status badge variant
const getInstallationStatusVariant = (status: InstallationStatus) => {
  switch (status) {
    case InstallationStatus.ACTIVE:
      return "bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800";
    case InstallationStatus.INACTIVE:
      return "bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800";
    case InstallationStatus.PENDING:
      return "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800";
    default:
      return "bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-900/30 dark:text-gray-400 dark:border-gray-800";
  }
};

// Add a function to get installation status label
const getInstallationStatusLabel = (status: InstallationStatus) => {
  switch (status) {
    case InstallationStatus.ACTIVE:
      return "Ativa";
    case InstallationStatus.INACTIVE:
      return "Inativa";
    case InstallationStatus.PENDING:
      return "Pendente";
    default:
      return status;
  }
};

export function InstallationTable({
  installations,
  loading,
  error,
  onEdit,
  onDelete,
  onViewDetails,
  onViewConsumption,
  formatDate,
  formatEnergy,
  formatCurrency,
  pageSize = 10,
  emptyMessage = "Nenhuma instalação encontrada.",
  onDeleteMultiple
}: InstallationTableProps) {
  const { 
    installationsSortColumn, 
    installationsSortDirection, 
    setInstallationsSortColumn, 
    setInstallationsSortDirection,
    installationsColumnFilters,
    setInstallationsColumnFilter
  } = useUiPreferencesStore();
  
  // Convert store sort state to TanStack Table format
  const [sorting, setSorting] = useState<SortingState>(
    installationsSortColumn && installationsSortDirection 
      ? [{ id: installationsSortColumn, desc: installationsSortDirection === 'desc' }] 
      : []
  );

  // State for delete confirmation dialog
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [installationToDelete, setInstallationToDelete] = useState<InstallationWithRelations | null>(null);

  // Update store when sorting changes
  useEffect(() => {
    if (sorting.length > 0) {
      setInstallationsSortColumn(sorting[0].id);
      setInstallationsSortDirection(sorting[0].desc ? 'desc' : 'asc');
    } else {
      setInstallationsSortColumn(undefined);
      setInstallationsSortDirection(undefined);
    }
  }, [sorting, setInstallationsSortColumn, setInstallationsSortDirection]);

  // Get installation type badge variant
  const getInstallationTypeVariant = (type: InstallationType) => {
    switch (type) {
      case "GENERATOR":
        return "bg-gradient-to-r from-amber-700 to-amber-500 text-white border-amber-800 shadow-lg shadow-amber-700/20";
      case "CONSUMER":
        return "bg-gradient-to-r from-blue-700 to-blue-500 text-white border-blue-800 shadow-lg shadow-blue-700/20";
      default:
        return "bg-gray-200 text-gray-800";
    }
  };
  
  // Get installation type label
  const getInstallationTypeLabel = (type: InstallationType) => {
    switch (type) {
      case "GENERATOR": return "Geradora";
      case "CONSUMER": return "Consumidora";
      default: return type;
    }
  };

  // Get installation type icon
  const getInstallationTypeIcon = (type: InstallationType) => {
    switch (type) {
      case "GENERATOR": return <Zap className="h-4 w-4 mr-1" />;
      case "CONSUMER": return <Building2 className="h-4 w-4 mr-1" />;
      default: return null;
    }
  };

  // Handle delete confirmation
  const confirmDelete = (installation: InstallationWithRelations) => {
    setInstallationToDelete(installation);
    setDeleteDialogOpen(true);
  };

  // Handle delete action after confirmation
  const handleDelete = () => {
    if (installationToDelete) {
      onDelete(installationToDelete);
      setDeleteDialogOpen(false);
      setInstallationToDelete(null);
    }
  };

  // Unique installation type values for filter
  const typeOptions = useMemo(() => {
    const types = Array.from(new Set(installations.map(inst => inst.type)));
    return types.map(type => ({ 
      value: type, 
      label: getInstallationTypeLabel(type) 
    }));
  }, [installations]);

  // Unique distributor values for filter
  const distributorOptions = useMemo(() => {
    const distributors = Array.from(new Set(
      installations
        .filter(inst => inst.distributor?.name)
        .map(inst => inst.distributor?.name || 'Desconhecida')
    ));
    return distributors.map(distributor => ({ 
      value: distributor, 
      label: distributor 
    }));
  }, [installations]);

  // Format address string
  const formatAddress = (address: Address | null | undefined): string => {
    if (!address) return "-";
    const parts = [
      address.street || '',
      address.number ? `${address.number}` : '',
      address.complement ? `${address.complement}` : '',
      address.neighborhood ? `${address.neighborhood}` : '',
      address.city ? `${address.city}` : '',
      address.state ? `${address.state}` : '',
      address.zip ? `CEP: ${address.zip}` : ''
    ].filter(Boolean);
    
    return parts.length > 0 ? parts.join(', ') : "-";
  };

  // Format address for display with line breaks
  const formatAddressMultiline = (address: Address | null | undefined): JSX.Element => {
    if (!address) return <span>-</span>;

    const line1 = [address.street || '', address.number ? `${address.number}` : ''].filter(Boolean).join(', ');
    const line2 = [address.neighborhood || '', address.city || ''].filter(Boolean).join(', ');
    const line3 = [address.state || '', address.zip ? `CEP: ${address.zip}` : ''].filter(Boolean).join(', ');

    return (
      <div className="flex flex-col text-sm">
        <span>{line1}</span>
        <span>{line2}</span>
        {line3 && <span>{line3}</span>}
        {address.complement && <span className="text-xs text-muted-foreground">{address.complement}</span>}
      </div>
    );
  };

  const columns = useMemo<ColumnDef<InstallationWithRelations>[]>(
    () => [
      {
        accessorKey: "installationNumber",
        header: ({ column }) => (
          <DataTableColumnHeader 
            column={column} 
            title="Número de Instalação" 
            enableFiltering={true}
          />
        ),
        cell: ({ row }) => {
          const installation = row.original;
          return (
            <Link href={`/admin/instalacoes/${installation.id}`} passHref>
              <Badge 
                variant="outline" 
                className="hover:bg-primary/5 cursor-pointer transition-colors flex items-center gap-1 font-medium"
              >
                <span>{installation.installationNumber}</span>
                <Search className="h-3 w-3 ml-1" />
              </Badge>
            </Link>
          );
        },
        size: 140,
      },
      {
        accessorKey: "owner",
        header: ({ column }) => (
          <DataTableColumnHeader 
            column={column} 
            title="Proprietário" 
            enableFiltering={true}
          />
        ),
        cell: ({ row }) => {
          const installation = row.original;
          return (
            <div className="font-medium">
              {installation?.owner ? (installation.owner.name || installation.owner.email) : "-"}
            </div>
          );
        },
        filterFn: (row, id, filterValue) => {
          const installation = row.original;
          const ownerName = installation.owner?.name || installation.owner?.email || '';
          return ownerName.toLowerCase().includes(filterValue.toLowerCase());
        },
        size: 160,
      },
      {
        accessorKey: "type",
        header: ({ column }) => (
          <DataTableColumnHeader 
            column={column} 
            title="Tipo" 
            enableFiltering={true}
            filterableOptions={typeOptions}
          />
        ),
        cell: ({ row }) => {
          const type = row.getValue("type") as InstallationType;
          return (
            <Badge 
              variant="outline"
              className={cn(
                "shadow-sm font-medium transition-all duration-300 hover:shadow-md",
                getInstallationTypeVariant(type)
              )}
            >
              {getInstallationTypeIcon(type)}
              {getInstallationTypeLabel(type)}
            </Badge>
          );
        },
        filterFn: (row, id, filterValue) => {
          const value = row.getValue(id) as string;
          return filterValue.includes(value);
        },
        size: 110,
      },
      {
        accessorKey: "status",
        header: ({ column }) => (
          <DataTableColumnHeader 
            column={column} 
            title="Status" 
            enableFiltering={true}
            filterableOptions={[
              { value: InstallationStatus.ACTIVE, label: "Ativa" },
              { value: InstallationStatus.INACTIVE, label: "Inativa" },
              { value: InstallationStatus.PENDING, label: "Pendente" }
            ]}
          />
        ),
        cell: ({ row }) => {
          const status = row.getValue("status") as InstallationStatus;
          return (
            <Badge 
              variant="outline"
              className={cn(
                "shadow-sm font-medium transition-all duration-300 hover:shadow-md",
                getInstallationStatusVariant(status)
              )}
            >
              {getInstallationStatusLabel(status)}
            </Badge>
          );
        },
        filterFn: (row, id, filterValue) => {
          const value = row.getValue(id) as string;
          return filterValue.includes(value);
        },
        size: 90,
      },
      {
        accessorKey: "distributor",
        header: ({ column }) => (
          <DataTableColumnHeader 
            column={column} 
            title="Distribuidora" 
            enableFiltering={true}
            filterableOptions={distributorOptions}
          />
        ),
        cell: ({ row }) => {
          const installation = row.original;
          return (
            <div className="font-medium">
              {installation.distributor?.name || "-"}
            </div>
          );
        },
        filterFn: (row, id, filterValue) => {
          const installation = row.original;
          const distributor = installation.distributor?.name || '';
          return distributor.toLowerCase().includes(filterValue.toLowerCase());
        },
        size: 120,
      },
      {
        accessorKey: "address",
        header: ({ column }) => (
          <DataTableColumnHeader 
            column={column} 
            title="Endereço" 
            enableFiltering={true}
          />
        ),
        cell: ({ row }) => {
          const installation = row.original;
          return formatAddressMultiline(installation.address);
        },
        filterFn: (row, id, filterValue) => {
          const address = formatAddress(row.original.address);
          return address.toLowerCase().includes(filterValue.toLowerCase());
        },
        size: 180,
      },
      // Dynamic column based on installation type
      {
        id: "energyData",
        header: ({ column }) => (
          <DataTableColumnHeader 
            column={column} 
            title="Dados de Energia" 
            enableFiltering={false}
          />
        ),
        cell: ({ row }) => {
          const installation = row.original;
          const latestData = installation.latestEnergyData;
          
          if (installation.type === "GENERATOR") {
            return (
              <div className="flex flex-col gap-1">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Geração:</span>
                  <span className="font-medium">{
                    latestData?.generation !== undefined && latestData?.generation !== null
                      ? formatEnergy(latestData.generation)
                      : "-"
                  }</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Transferência:</span>
                  <span className="font-medium">{
                    latestData?.transferred !== undefined && latestData?.transferred !== null
                      ? formatEnergy(latestData.transferred)
                      : "-"
                  }</span>
                </div>
                {latestData?.period && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Período:</span>
                    <span className="font-medium">{latestData.period}</span>
                  </div>
                )}
              </div>
            );
          } else {
            return (
              <div className="flex flex-col gap-1">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Consumo:</span>
                  <span className="font-medium">{
                    latestData?.consumption !== undefined && latestData?.consumption !== null
                      ? formatEnergy(latestData.consumption)
                      : "-"
                  }</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Recebimento:</span>
                  <span className="font-medium">{
                    latestData?.receipt !== undefined && latestData?.receipt !== null
                      ? formatEnergy(latestData.receipt)
                      : latestData?.received !== undefined && latestData?.received !== null
                        ? formatEnergy(latestData.received)
                        : "-"
                  }</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Compensação:</span>
                  <span className="font-medium">{
                    latestData?.compensation !== undefined && latestData?.compensation !== null
                      ? formatEnergy(latestData.compensation)
                      : "-"
                  }</span>
                </div>
              </div>
            );
          }
        },
        size: 150,
      },
      {
        accessorKey: "quota",
        header: ({ column }) => (
          <DataTableColumnHeader 
            column={column} 
            title="Quota (%)" 
            enableFiltering={false}
          />
        ),
        cell: ({ row }) => {
          const installation = row.original;
          const quota = installation.latestEnergyData?.quota || installation.quota;
          return quota !== undefined && quota !== null ? `${quota}%` : "-";
        },
        size: 80,
      },
      {
        accessorKey: "createdAt",
        header: ({ column }) => (
          <DataTableColumnHeader 
            column={column} 
            title="Data de Criação"
            enableFiltering={true}
            filterableOptions={
              Array.from(new Set(installations.map(inst => 
                formatDate(inst.createdAt)
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
          return formattedDate.includes(filterValue);
        },
        size: 110,
      },
      // Actions column with animated three dots
      {
        id: "actions",
        enableSorting: false,
        header: () => <div className="text-center">Ações</div>,
        cell: ({ row }) => {
          const installation = row.original;
          return (
            <div className="flex justify-center">
              <RowActionMenu
                installation={installation}
                onEdit={onEdit}
                onDelete={(inst) => confirmDelete(inst)}
                onViewDetails={onViewDetails}
                onViewConsumption={onViewConsumption}
              />
            </div>
          );
        },
        size: 70,
      },
    ],
    [formatDate, formatEnergy, onEdit, typeOptions, distributorOptions, installations]
  );

  // Bulk delete handler
  const handleDeleteMultiple = async (selectedInstallations: InstallationWithRelations[]) => {
    console.log("Deleting multiple installations:", selectedInstallations);
    
    if (selectedInstallations.length === 0) {
      return;
    }
    
    if (!onDeleteMultiple) {
      console.error("onDeleteMultiple prop is not provided.");
      toast.error("Erro: Função de exclusão múltipla não configurada.");
      return Promise.reject(new Error("onDeleteMultiple prop is not provided."));
    }
    
    try {
      // Use the provided prop for bulk deletion
      await onDeleteMultiple(selectedInstallations);
      
      toast.success("Instalações excluídas", {
        description: `${selectedInstallations.length} instalações foram excluídas com sucesso`,
        duration: 3000,
        dismissible: true,
      });
      
      return Promise.resolve();
    } catch (error) {
      console.error("Error deleting multiple installations:", error);
      toast.error("Erro ao excluir instalações", {
        description: error instanceof Error ? error.message : "Ocorreu um erro ao excluir as instalações",
        duration: 3000,
        dismissible: true,
      });
      return Promise.reject(error);
    }
  };

  return (
    <>
      <DataTable
        columns={columns}
        data={installations}
        loading={loading}
        pageSize={pageSize}
        emptyMessage={
          error
            ? `Erro ao carregar instalações: ${error}`
            : emptyMessage
        }
        state={{
          sorting,
        }}
        onSortingChange={setSorting}
        enableScroll={true}
        maxHeight="calc(100vh - 300px)"
        className="overflow-hidden"
        tableClassName="[&_thead_tr]:bg-emerald-50 [&_thead_th]:text-emerald-900 dark:[&_thead_tr]:bg-emerald-950/30 dark:[&_thead_th]:text-emerald-300 [&_tr:nth-child(even)]:bg-emerald-50/50 dark:[&_tr:nth-child(even)]:bg-emerald-950/10 hover:[&_tr:hover]:bg-emerald-100/70 dark:hover:[&_tr:hover]:bg-emerald-800/20 [&_.tooltip-content]:bg-card [&_.tooltip-content]:text-card-foreground [&_.tooltip-content]:border [&_.tooltip-content]:border-border [&_.tooltip-content]:shadow-sm [&_.tooltip-content]:max-w-md [&_.tooltip-content]:p-3 [&_.tooltip-content]:text-sm"
        onDeleteRows={handleDeleteMultiple}
      />
      
      {/* Delete confirmation dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir a instalação {installationToDelete?.installationNumber}?
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete}
              className="bg-destructive hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
