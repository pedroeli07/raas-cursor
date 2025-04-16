"use client"

import * as React from "react"
import {
  ColumnDef,
  ColumnFiltersState,
  SortingState,
  VisibilityState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  OnChangeFn,
  Row,
} from "@tanstack/react-table"

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { 
  ChevronLeft, 
  ChevronRight, 
  Search, 
  SlidersHorizontal, 
  Copy, 
  CopyCheck, 
  Trash2, 
  FileDown, 
  MoreHorizontal,
  CheckSquare,
  X,
  FileText,
  FileBadge
} from "lucide-react"
import { Skeleton } from "./skeleton"
import { 
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "./dropdown-menu"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./tooltip"
import { useToast } from "./use-toast"
import { cn } from "@/lib/utils/utils"
// Alert dialog
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
// Import for animations
import { motion, AnimatePresence } from "framer-motion"

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[]
  data: TData[]
  searchKey?: string
  searchPlaceholder?: string
  loading?: boolean
  pageSize?: number
  showColumnToggle?: boolean
  showSearch?: boolean
  showPagination?: boolean
  selectable?: boolean
  onRowClick?: (row: TData) => void
  emptyMessage?: string
  className?: string
  tableClassName?: string
  enableScroll?: boolean
  maxHeight?: string
  state?: {
    sorting?: SortingState;
  }
  onSortingChange?: OnChangeFn<SortingState>;
  onDeleteRows?: (rows: TData[]) => Promise<void>;
}

// Helper functions for formatting data in tooltips
const formatDateIfPossible = (value: string) => {
  try {
    // Check if it looks like a date
    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(value) || /^\d{4}-\d{2}-\d{2}/.test(value)) {
      const date = new Date(value);
      // Check if date is valid
      if (!isNaN(date.getTime())) {
        // Format: "12 de abr de 2025"
        return date.toLocaleDateString('pt-BR', {
          day: 'numeric',
          month: 'short',
          year: 'numeric'
        }).replace('.', '');
      }
    }
    return value;
  } catch (e) {
    return value;
  }
};

const translateStatus = (value: string) => {
  const statusMap: Record<string, string> = {
    'PENDING': 'Pendente',
    'ACCEPTED': 'Aceito',
    'REVOKED': 'Revogado',
    'EXPIRED': 'Expirado',
    'ACTIVE': 'Ativo',
    'INACTIVE': 'Inativo'
  };
  
  return statusMap[value] || value;
};

export function DataTable<TData, TValue>({
  columns,
  data,
  searchKey,
  searchPlaceholder = "Buscar...",
  loading = false,
  pageSize = 10,
  showColumnToggle = true,
  showSearch = true,
  showPagination = true,
  selectable = true,
  onRowClick,
  emptyMessage = "Nenhum resultado encontrado",
  className,
  tableClassName,
  enableScroll = true,
  maxHeight = "calc(100vh - 300px)",
  state,
  onSortingChange,
  onDeleteRows,
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = React.useState<SortingState>([])
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({})
  const [rowSelection, setRowSelection] = React.useState({})
  const [copySuccess, setCopySuccess] = React.useState<string | null>(null)
  const { toast } = useToast()
  const [deleteLoading, setDeleteLoading] = React.useState(false)
  
  // New states for the alert and export format
  const [showDeleteAlert, setShowDeleteAlert] = React.useState(false)
  const [exportFormat, setExportFormat] = React.useState<"csv" | "excel" | null>(null)
  
  // For debugging
  React.useEffect(() => {
    console.log("Row selection state:", rowSelection);
    console.log("Selected rows count:", Object.keys(rowSelection).length);
  }, [rowSelection]);

  // Define columns with selection checkbox
  const selectionColumns: ColumnDef<TData, any>[] = selectable 
    ? [
        {
          id: "select",
          header: ({ table }) => (
            <div className="relative">
              <Checkbox
                checked={
                  table.getIsAllPageRowsSelected() ||
                  (table.getIsSomePageRowsSelected() && "indeterminate")
                }
                onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
                aria-label="Selecionar tudo"
                className="translate-y-[2px] border-2 border-emerald-500/50 data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-500"
              />
              <div className="absolute -inset-1 rounded-md pointer-events-none transition-all opacity-0 group-hover:opacity-100 bg-emerald-500/10"></div>
            </div>
          ),
          cell: ({ row }) => (
            <div className="relative group">
              <Checkbox
                checked={row.getIsSelected()}
                onCheckedChange={(value) => row.toggleSelected(!!value)}
                onClick={(e) => e.stopPropagation()}
                aria-label="Selecionar linha"
                className="translate-y-[2px] border-emerald-300 dark:border-emerald-700 data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-500"
              />
              <div className="absolute -inset-1 rounded-md pointer-events-none transition-all opacity-0 group-hover:opacity-100 bg-emerald-500/10"></div>
            </div>
          ),
          enableSorting: false,
          enableHiding: false,
        },
        ...columns
      ]
    : columns;

  const table = useReactTable({
    data,
    columns: selectionColumns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onSortingChange: onSortingChange || setSorting,
    getSortedRowModel: getSortedRowModel(),
    onColumnFiltersChange: setColumnFilters,
    getFilteredRowModel: getFilteredRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    state: {
      sorting: state?.sorting || sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
    },
    initialState: {
      pagination: {
        pageSize,
      },
    },
  })

  // Handle global filter on the searchKey if provided
  const handleSearch = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (searchKey) {
      table.getColumn(searchKey)?.setFilterValue(event.target.value)
    }
  }

  // Function to copy cell value to clipboard
  const copyCellValue = (value: string) => {
    navigator.clipboard.writeText(value)
    setCopySuccess(value)
    setTimeout(() => setCopySuccess(null), 2000)
    toast({
      title: "Copiado!",
      description: "Valor copiado para a área de transferência",
      duration: 2000,
    })
  }

  // Function to copy entire row as JSON
  const copyRowData = (row: any) => {
    const rowData = Object.entries(row)
      .filter(([key]) => key !== 'id' && typeof row[key] !== 'function')
      .reduce((obj, [key, value]) => ({ ...obj, [key]: value }), {})
    
    const jsonString = JSON.stringify(rowData, null, 2)
    navigator.clipboard.writeText(jsonString)
    toast({
      title: "Linha copiada!",
      description: "Dados da linha copiados para a área de transferência",
      duration: 2000,
    })
  }

  // Function to export data to CSV
  const exportToCSV = () => {
    const selectedRows = table.getSelectedRowModel().rows.length > 0 
      ? table.getSelectedRowModel().rows 
      : table.getRowModel().rows
    
    const visibleColumns = table.getVisibleFlatColumns()
      .filter(col => col.id !== 'select' && col.id !== 'actions')
      .map(col => col.id);
    
    // Create headers row with visible column IDs (formatted for readability)
    const headers = visibleColumns.map(colId => 
      colId.replace(/([A-Z])/g, ' $1').trim()
    ).join(',');
    
    // Create data rows
    const csvRows = selectedRows.map(row => {
      return visibleColumns.map(colId => {
        const value = row.getValue(colId);
        // Handle null values
        if (value === null || value === undefined) {
          return '';
        }
        
        // Handle objects by converting to string
        const stringValue = typeof value === 'object' 
          ? JSON.stringify(value).replace(/"/g, '""')
          : String(value);
          
        // Escape special characters and wrap in quotes if necessary
        return stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')
          ? `"${stringValue.replace(/"/g, '""')}"`
          : stringValue;
      }).join(',');
    });
    
    // Combine headers and data rows
    const csvContent = [headers, ...csvRows].join('\n');
    
    // Create a blob and download link
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `export-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast({
      title: "Exportação concluída",
      description: `${selectedRows.length} linha(s) exportada(s) em formato CSV`,
      duration: 3000,
    });
  };
  
  // Function to export data to Excel
  const exportToExcel = () => {
    const selectedRows = table.getSelectedRowModel().rows.length > 0 
      ? table.getSelectedRowModel().rows 
      : table.getRowModel().rows;
    
    const visibleColumns = table.getVisibleFlatColumns()
      .filter(col => col.id !== 'select' && col.id !== 'actions')
      .map(col => col.id);
    
    // Create array of data for Excel
    const excelData = [
      // Headers row
      visibleColumns.map(colId => colId.replace(/([A-Z])/g, ' $1').trim()),
      // Data rows
      ...selectedRows.map(row => 
        visibleColumns.map(colId => {
          const value = row.getValue(colId);
          
          // Handle null/undefined values
          if (value === null || value === undefined) {
            return '';
          }
          
          // Handle objects by converting to string
          return typeof value === 'object' 
            ? JSON.stringify(value).replace(/"/g, '')
            : value;
        })
      )
    ];
    
    // Convert to Excel XML format (simple implementation)
    const xmlData = [
      '<?xml version="1.0"?>',
      '<?mso-application progid="Excel.Sheet"?>',
      '<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">',
      '<Worksheet ss:Name="Sheet1">',
      '<Table>',
      ...excelData.map(row => 
        `<Row>${row.map(cell => {
          const cellValue = String(cell).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
          return `<Cell><Data ss:Type="String">${cellValue}</Data></Cell>`;
        }).join('')}</Row>`
      ),
      '</Table>',
      '</Worksheet>',
      '</Workbook>'
    ].join('\n');
    
    // Create a blob and download link
    const blob = new Blob([xmlData], { type: 'application/vnd.ms-excel' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `export-${new Date().toISOString().split('T')[0]}.xls`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast({
      title: "Exportação concluída",
      description: `${selectedRows.length} linha(s) exportada(s) em formato Excel`,
      duration: 3000,
    });
  };
  
  // Row selection checkboxes in the header and cells
  const renderRowCheckbox = (row?: Row<TData>) => {
    const isHeaderCheckbox = !row;
    
    return (
      <div className={`${isHeaderCheckbox ? '' : 'group relative'}`} onClick={(e) => e.stopPropagation()}>
        <Checkbox
          checked={isHeaderCheckbox ? table.getIsAllPageRowsSelected() : row?.getIsSelected()}
          onCheckedChange={(value) => {
            if (isHeaderCheckbox) {
              table.toggleAllPageRowsSelected(!!value);
            } else {
              row?.toggleSelected(!!value);
            }
          }}
          onClick={(e) => e.stopPropagation()}
          aria-label={isHeaderCheckbox ? "Selecionar todas as linhas" : "Selecionar linha"}
          className="translate-y-[2px] border-emerald-300 dark:border-emerald-700 data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-500"
        />
        {!isHeaderCheckbox && (
          <div className="absolute -inset-1 rounded-md pointer-events-none transition-all opacity-0 group-hover:opacity-100 bg-emerald-500/10"></div>
        )}
      </div>
    );
  };

  // Function to handle bulk row deletion
  const handleDeleteRows = async () => {
    const selectedRows = table.getSelectedRowModel().rows
    
    if (selectedRows.length === 0) {
      toast({
        title: "Nenhuma linha selecionada",
        description: "Selecione pelo menos uma linha para excluir",
        variant: "destructive",
        duration: 3000,
      })
      return Promise.reject(new Error("No rows selected"));
    }
    
    if (!onDeleteRows) {
      console.log("onDeleteRows is not provided, but we'll continue with UI flow for testing");
      // Instead of returning early, we'll just log and continue
    }
    
    try {
      setDeleteLoading(true)
      
      // Get the data before deletion
      const rowsToDelete = selectedRows.map(row => row.original);
      console.log("About to delete these rows:", rowsToDelete);
      
      if (onDeleteRows) {
        await onDeleteRows(rowsToDelete);
      } else {
        // Mock success for testing UI
        await new Promise(resolve => setTimeout(resolve, 1000));
        console.log("Would delete:", rowsToDelete);
      }
      
      // Clear selection after successful deletion
      setRowSelection({});
      
      toast({
        title: "Exclusão concluída",
        description: `${rowsToDelete.length} linha(s) excluída(s) com sucesso`,
        duration: 3000,
      })
      
      return Promise.resolve();
    } catch (error) {
      console.error("Error during row deletion:", error);
      toast({
        title: "Erro na exclusão",
        description: error instanceof Error ? error.message : "Ocorreu um erro ao excluir as linhas",
        variant: "destructive",
        duration: 3000,
      })
      return Promise.reject(error);
    } finally {
      setDeleteLoading(false)
    }
  }

  // Pagination Controls Component
  const PaginationControls = () => (
    <div className="flex items-center justify-center gap-2">
      <Button
        variant="outline"
        className="hidden h-8 w-8 p-0 lg:flex bg-emerald-300/50 hover:bg-emerald-300"
        onClick={() => table.setPageIndex(0)}
        disabled={!table.getCanPreviousPage()}
      >
        <span className="sr-only">Ir para primeira página</span>
        <ChevronLeft className="h-4 w-4" />
        <ChevronLeft className="h-4 w-4 -ml-2" />
      </Button>
      <Button
        variant="outline"
        className="h-8 w-8 p-0 bg-emerald-300/50 hover:bg-emerald-300"
        onClick={() => table.previousPage()}
        disabled={!table.getCanPreviousPage()}
      >
        <span className="sr-only">Página anterior</span>
        <ChevronLeft className="h-4 w-4" />
      </Button>
      
      <div className="flex items-center gap-1">
        <span className="text-sm">Página</span>
        <strong className="text-sm font-medium">
          {table.getState().pagination.pageIndex + 1}
        </strong>
        <span className="text-sm">de</span>
        <strong className="text-sm font-medium">{table.getPageCount()}</strong>
      </div>
      
      <Button
        variant="outline"
        className="h-8 w-8 p-0 bg-emerald-500/30 hover:bg-emerald-600"
        onClick={() => table.nextPage()}
        disabled={!table.getCanNextPage()}
      >
        <span className="sr-only">Próxima página</span>
        <ChevronRight className="h-4 w-4" />
      </Button>
      <Button
        variant="outline"
        className="hidden h-8 w-8 p-0 lg:flex bg-emerald-500/30 hover:bg-emerald-600"
        onClick={() => table.setPageIndex(table.getPageCount() - 1)}
        disabled={!table.getCanNextPage()}
      >
        <span className="sr-only">Ir para última página</span>
        <ChevronRight className="h-4 w-4" />
        <ChevronRight className="h-4 w-4 -ml-2" />
      </Button>
      
      <Select
        value={`${table.getState().pagination.pageSize}`}
        onValueChange={(value) => {
          table.setPageSize(Number(value))
        }}
      >
        <SelectTrigger className="h-8 w-[70px] bg-emerald-300/50 hover:bg-emerald-300">
          <SelectValue placeholder={pageSize} />
        </SelectTrigger>
        <SelectContent side="top">
          {[5, 10, 20, 30, 40, 50].map((pageSize) => (
            <SelectItem key={pageSize} value={`${pageSize}`}>
              {pageSize}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )

  // Function to handle export based on format
  const handleExport = () => {
    if (exportFormat === "csv") {
      exportToCSV();
    } else if (exportFormat === "excel") {
      exportToExcel();
    }
    setExportFormat(null);
  };

  // Function to handle delete confirmation
  const handleDeleteConfirm = async () => {
    console.log("Attempting to delete rows:", table.getSelectedRowModel().rows.map(row => row.original));
    try {
      // First close the dialog to prevent double clicks
      setShowDeleteAlert(false);
      // Then perform the deletion
      await handleDeleteRows();
    } catch (error) {
      console.error("Error in deletion confirmation:", error);
      // Ensure dialog is closed even on error
      setShowDeleteAlert(false);
    }
  };

  // Selected rows count
  const selectedRowsCount = Object.keys(rowSelection).length;
  
  // Debug logs for row selection
  console.log("Row selection state:", rowSelection);
  console.log("Selected rows count:", selectedRowsCount);
  console.log("onDeleteRows function exists:", !!onDeleteRows);

  return (
    <div className="w-full space-y-4 relative border border-emerald-200 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-950/20 rounded-lg p-4">
      {/* Top Controls: Search, Column Toggle, Pagination */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row justify-between items-center gap-3">
          {/* Left Side: Search */}
          {showSearch && searchKey && (
            <div className="relative w-full sm:w-auto max-w-sm">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={searchPlaceholder}
                value={(table.getColumn(searchKey)?.getFilterValue() as string) ?? ""}
                onChange={handleSearch}
                className="pl-8 w-full pr-10"
              />
            </div>
          )}
          
       
          
          {/* Right Side: Actions and Column Toggle */}
          <div className="flex items-center gap-2">
            {/* Actions Menu */}
            <DropdownMenu>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm" className="h-9 border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 dark:hover:bg-emerald-900/30">
                        <MoreHorizontal className="mr-2 h-4 w-4" />
                        Ações
                      </Button>
                    </DropdownMenuTrigger>
                  </TooltipTrigger>
                  <TooltipContent className="bg-card text-card-foreground border border-border shadow-sm">
                    <p>Opções para gerenciar os dados</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <DropdownMenuContent align="end" className="w-[200px]">
                <DropdownMenuLabel>Gerenciar dados</DropdownMenuLabel>
                <DropdownMenuSeparator />
                
                {/* Delete Selected Rows */}
                <DropdownMenuItem
                  onClick={() => {
                    console.log("Delete dropdown item clicked");
                    console.log("Selected rows:", selectedRowsCount);
                    console.log("onDeleteRows available:", !!onDeleteRows);
                    setShowDeleteAlert(true);
                  }}
                  disabled={selectedRowsCount === 0}
                  className="text-destructive focus:text-destructive"
                >
                  {deleteLoading ? (
                    <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-destructive border-t-transparent" />
                  ) : (
                    <Trash2 className="mr-2 h-4 w-4" />
                  )}
                  Excluir selecionados ({selectedRowsCount})
                </DropdownMenuItem>
                
                {/* Select All */}
                <DropdownMenuItem
                  onClick={() => table.toggleAllRowsSelected(true)}
                >
                  <Checkbox className="mr-2 h-4 w-4" checked={table.getIsAllPageRowsSelected()} />
                  Selecionar todas as linhas
                </DropdownMenuItem>
                
                {/* Deselect All */}
                <DropdownMenuItem
                  onClick={() => table.toggleAllRowsSelected(false)}
                  disabled={selectedRowsCount === 0}
                >
                  <Checkbox className="mr-2 h-4 w-4" checked={false} />
                  Desmarcar todas as linhas
                </DropdownMenuItem>
                
                <DropdownMenuSeparator />
                <DropdownMenuLabel>Exportar dados</DropdownMenuLabel>
                <DropdownMenuSeparator />
                
                {/* Export to CSV */}
                <DropdownMenuItem onClick={() => { setExportFormat("csv"); handleExport(); }}>
                  <FileDown className="mr-2 h-4 w-4" />
                  Exportar CSV
                </DropdownMenuItem>
                
                {/* Export to Excel */}
                <DropdownMenuItem onClick={() => { setExportFormat("excel"); handleExport(); }}>
                  <FileDown className="mr-2 h-4 w-4" />
                  Exportar Excel
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            
            {/* Column Toggle */}
            {showColumnToggle && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm" className="h-9 border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 dark:hover:bg-emerald-900/30">
                          <SlidersHorizontal className="mr-2 h-4 w-4" />
                          Colunas
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {table
                          .getAllColumns()
                          .filter(
                            (column) =>
                              typeof column.accessorFn !== "undefined" &&
                              column.getCanHide()
                          )
                          .map((column) => {
                            return (
                              <DropdownMenuCheckboxItem
                                key={column.id}
                                className="capitalize"
                                checked={column.getIsVisible()}
                                onCheckedChange={(value) =>
                                  column.toggleVisibility(value)
                                }
                              >
                                {column.id}
                              </DropdownMenuCheckboxItem>
                            )
                          })}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TooltipTrigger>
                  <TooltipContent className="bg-card text-card-foreground border border-border shadow-sm">
                    <p>Configurar colunas visíveis</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}

    
          </div>
            {/* Center: Pagination Controls */}
            {showPagination && table.getPageCount() >= 1 && (
            <div className="">
              <PaginationControls />
            </div>
          )}
        </div>
        
      </div>

      {/* Main table */}
      <div className={`rounded-md border ${className}`}>
        <div className={cn(
          "overflow-hidden",
          enableScroll && "overflow-x-auto"
        )}>
          <div className={cn(
            enableScroll && `max-h-[${maxHeight}] overflow-y-auto scrollbar-thin scrollbar-thumb-emerald-500/20 hover:scrollbar-thumb-emerald-500/50 scrollbar-track-transparent`
          )}>
            <Table className={cn(
              tableClassName,
              "w-full table-auto"
            )}>
              <TableHeader className="sticky top-0 bg-background z-10">
                {table.getHeaderGroups().map((headerGroup) => (
                  <TableRow key={headerGroup.id}>
                    {selectable && (
                      <TableHead key="select-header" className="w-8 p-0">
                        <div className="pl-4 py-2">
                          {renderRowCheckbox()}
                        </div>
                      </TableHead>
                    )}
                    
                    {headerGroup.headers.map((header) => {
                      // Skip the select column as we've already handled it
                      if (header.id === "select") {
                        return null;
                      }
                      
                      return (
                        <TableHead 
                          key={header.id} 
                          className="whitespace-nowrap"
                          style={{ width: header.getSize() !== 150 ? header.getSize() : undefined }}
                        >
                          {header.isPlaceholder
                            ? null
                            : flexRender(
                                header.column.columnDef.header,
                                header.getContext()
                              )}
                        </TableHead>
                      )
                    })}
                  </TableRow>
                ))}
              </TableHeader>
              <TableBody>
                {loading ? (
                  [...Array(5)].map((_, index) => (
                    <TableRow key={index}>
                      {columns.map((_, cellIndex) => (
                        <TableCell key={cellIndex}>
                          <Skeleton className="h-8 w-full" />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : table.getRowModel().rows?.length ? (
                  table.getRowModel().rows.map((row) => (
                    <TableRow
                      key={row.id}
                      data-state={row.getIsSelected() && "selected"}
                      className={cn(
                        onRowClick ? "cursor-pointer hover:bg-muted/50" : "",
                        row.getIsSelected() && "bg-emerald-50 dark:bg-emerald-950/20 hover:bg-emerald-100 dark:hover:bg-emerald-950/30"
                      )}
                      onClick={onRowClick ? () => onRowClick(row.original) : undefined}
                    >
                      {row.getVisibleCells().map((cell) => {
                        const cellValue = String(cell.getValue() || '');
                        
                        // Special handling for select column
                        if (cell.column.id === "select") {
                          return (
                            <TableCell key={cell.id} className="p-0 relative w-8">
                              <div className="pl-4 py-2">
                                {renderRowCheckbox(row)}
                              </div>
                            </TableCell>
                          )
                        }
                        
                        // Check if this is the actions column
                        if (cell.column.id === "actions") {
                          return (
                            <TableCell 
                              key={cell.id} 
                              className="relative group"
                              style={{ width: cell.column.getSize() !== 150 ? cell.column.getSize() : undefined }}
                            >
                              {flexRender(cell.column.columnDef.cell, cell.getContext())}
                            </TableCell>
                          );
                        }
                        
                        // Wrap regular cell content in tooltip for expanded view
                        return (
                          <TooltipProvider key={cell.id}>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <TableCell 
                                  className="relative group py-3"
                                  style={{ width: cell.column.getSize() !== 150 ? cell.column.getSize() : undefined }}
                                >
                                  <div className="flex items-center">
                                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                    {cellValue && cellValue.length > 0 && cell.column.id !== 'actions' && (
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 absolute right-2"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          copyCellValue(cellValue);
                                        }}
                                      >
                                        {copySuccess === cellValue ? (
                                          <CopyCheck className="h-3.5 w-3.5 text-green-500" />
                                        ) : (
                                          <Copy className="h-3.5 w-3.5 text-muted-foreground" />
                                        )}
                                      </Button>
                                    )}
                                  </div>
                                </TableCell>
                              </TooltipTrigger>
                              <TooltipContent side="top" align="center" className="bg-card text-card-foreground border border-border shadow-sm p-3 text-sm max-w-md">
                                <div className="p-1 max-h-[300px] overflow-auto">
                                  {cellValue && cellValue.length > 0 && (
                                    // Format dates and translate statuses in tooltips
                                    cell.column.id === 'createdAt' || cell.column.id === 'expiresAt' || cell.column.id.includes('date') || cell.column.id.includes('Date') ? (
                                      formatDateIfPossible(cellValue)
                                    ) : cell.column.id === 'status' ? (
                                      translateStatus(cellValue)
                                    ) : (
                                      cellValue
                                    )
                                  )}
                                </div>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        );
                      })}
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={columns.length} className="h-24 text-center">
                      {emptyMessage}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>

      {/* Bottom Info */}
      {showPagination && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <div>
            {table.getFilteredSelectedRowModel().rows.length} de{" "}
            {table.getFilteredRowModel().rows.length} linha(s) selecionada(s).
          </div>
          
          <div>
            Exibindo linhas {table.getState().pagination.pageIndex * table.getState().pagination.pageSize + 1}-
            {Math.min(
              (table.getState().pagination.pageIndex + 1) * table.getState().pagination.pageSize,
              table.getFilteredRowModel().rows.length
            )} de {table.getFilteredRowModel().rows.length}
          </div>
        </div>
      )}

      {/* Floating Action Bar */}
      <AnimatePresence>
        {selectedRowsCount > 0 && (
          <motion.div 
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50"
          >
            <div className="bg-emerald-500/50 border shadow-lg rounded-full px-4 py-3 flex items-center gap-3 text-sm">
              <div className="flex items-center justify-center h-8 w-8 rounded-full bg-emerald-500/20 border border-emerald-800/30 dark:border-emerald-100/30">
                <CheckSquare className="h-4 w-4 text-emerald-900 dark:text-emerald-100" />
              </div>
              
              <span className="font-medium px-1">
                {selectedRowsCount} {selectedRowsCount === 1 ? 'item selecionado' : 'itens selecionados'}
              </span>
              
              <div className="h-6 w-[1px] bg-border mx-1"></div>
              
              <div className="flex items-center gap-2">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="h-8 px-3 rounded-full border-emerald-500/30 hover:bg-emerald-50 dark:hover:bg-emerald-950/20 flex items-center gap-1.5 hover:border-emerald-500">
                      <FileDown className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-100" />
                      <span>Exportar</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-[160px]">
                    <DropdownMenuItem onClick={() => { setExportFormat("csv"); handleExport(); }} className="cursor-pointer">
                      <FileText className="mr-2 h-4 w-4" />
                      <span>CSV</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => { setExportFormat("excel"); handleExport(); }} className="cursor-pointer">
                      <FileBadge className="mr-2 h-4 w-4" />
                      <span>Excel</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                
                <Button 
                  variant="destructive" 
                  size="sm" 
                  className="h-8 px-3 rounded-full flex items-center gap-1.5"
                  onClick={() => setShowDeleteAlert(true)}
                  disabled={selectedRowsCount === 0}
                >
                  {deleteLoading ? (
                    <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  ) : (
                    <Trash2 className="h-3.5 w-3.5" />
                  )}
                  <span>Excluir</span>
                </Button>
              </div>
              
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-7 w-7 rounded-full ml-1 hover:bg-muted"
                onClick={() => table.toggleAllRowsSelected(false)}
              >
                <X className="h-4 w-4" />
                <span className="sr-only">Limpar seleção</span>
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Dialog */}
      <AlertDialog 
        open={showDeleteAlert} 
        onOpenChange={(open) => {
          // When closing the dialog via ESC key or clicking outside
          if (!open) {
            setShowDeleteAlert(false);
          }
        }}
      >
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <Trash2 className="h-5 w-5" />
              Confirmar exclusão
            </AlertDialogTitle>
            <AlertDialogDescription>
              Você está prestes a excluir <strong>{selectedRowsCount}</strong> {selectedRowsCount === 1 ? 'item' : 'itens'} selecionado{selectedRowsCount !== 1 ? 's' : ''}. 
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-4">
            <AlertDialogCancel 
              className="border-destructive/20"
              onClick={() => setShowDeleteAlert(false)}
            >
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction 
              className="bg-destructive hover:bg-destructive/90"
              onClick={handleDeleteConfirm}
            >
              {deleteLoading ? (
                <>
                  <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Excluindo...
                </>
              ) : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
} 