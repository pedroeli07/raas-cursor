"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Download, Eye, FileText, Search, Send, Printer, Filter, SlidersHorizontal, Calendar, RefreshCcw, Check, AlertCircle, X, Mail, MessageSquare, Trash2, FileX, PlusCircle } from "lucide-react"
import { motion } from "framer-motion"
import Link from "next/link"
import { createLogger } from "@/lib/utils/logger"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { Badge } from "@/components/ui/badge"
import { processRawCemigData } from "@/lib/utils/energy-data-processor"
import { INVOICE_STATUS } from '@/lib/constants/invoice'
import { InvoiceStatus } from '@/lib/types/app-types'
import { DatePickerWithRange } from "@/components/ui/date-range-picker"
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu"
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import useAuth from "@/lib/hooks/useAuth"
import { formatCurrency } from "@/lib/utils/format"
import { cn } from "@/lib/utils"
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
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import { DateRange } from "react-day-picker"
import { useUserManagementStore } from "@/store/userManagementStore"
import { useInstallationStore } from "@/store/installationStore"
import { useInvoiceStore, FormattedInvoice } from "@/store/invoiceStore"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"

// Criar logger para a página
const logger = createLogger("FaturasPage")

// Interface para os filtros - Update fields
interface InvoiceFilters {
  status: string;
  customerId: string;
  installationId: string;
  dueDateRange?: DateRange; // Renamed for clarity
  referencePeriodPreset?: string; // e.g., 'last_month', 'custom'
  referencePeriodRange?: DateRange; // For custom reference period
  minAmount: number | string; // Keep as string for input flexibility, convert later
  maxAmount: number | string;
}

// Componente para o cabeçalho da página
const PageHeader = ({ 
  onApplyFilters, 
  isLoading, 
  setFilters, 
  filters,
  initiateInvoice,
  selectedCustomerIdForNewInvoice,
  setSelectedCustomerIdForNewInvoice,
  isInitiatingInvoice
}: {
  onApplyFilters: () => void,
  isLoading: boolean,
  setFilters: React.Dispatch<React.SetStateAction<InvoiceFilters>>,
  filters: InvoiceFilters,
  initiateInvoice: (customerId: string) => Promise<void>,
  selectedCustomerIdForNewInvoice: string | null,
  setSelectedCustomerIdForNewInvoice: React.Dispatch<React.SetStateAction<string | null>>,
  isInitiatingInvoice: boolean
}) => {
  const { users, fetchUsers, usersLoading } = useUserManagementStore();
  const { installations, fetchInstallations, isLoading: loadingInstallations } = useInstallationStore();
  const router = useRouter();

  useEffect(() => {
    if (users.length === 0) fetchUsers();
    if (installations.length === 0) fetchInstallations();
  }, [fetchUsers, fetchInstallations, users.length, installations.length]);

  // Memoize handleFilterChange
  const handleFilterChange = useCallback((key: keyof InvoiceFilters, value: any) => {
    setFilters((prev: InvoiceFilters) => ({ ...prev, [key]: value }));
  }, [setFilters]);

  // Memoize handleDateRangeChange - Use dueDateRange
  const handleDateRangeChange = useCallback((dateRange: DateRange | undefined) => {
    handleFilterChange('dueDateRange', dateRange);
  }, [handleFilterChange]);

  // Memoize clearFilters - Update to clear new filters
  const clearFilters = useCallback(() => {
    setFilters({
      status: 'all',
      customerId: 'all',
      installationId: 'all',
      dueDateRange: undefined,
      referencePeriodPreset: 'all', // Default preset
      referencePeriodRange: undefined, // Clear custom range
      minAmount: '0', // Default min amount
      maxAmount: '10000', // Default max amount (example)
    });
    onApplyFilters(); 
  }, [setFilters, onApplyFilters]);

  // Add state for custom period picker visibility
  const [showCustomPeriodPicker, setShowCustomPeriodPicker] = useState(false);

  // Handle reference period preset change
  const handleReferencePresetChange = (value: string) => {
    handleFilterChange('referencePeriodPreset', value);
    if (value === 'custom') {
      setShowCustomPeriodPicker(true);
    } else {
      setShowCustomPeriodPicker(false);
      handleFilterChange('referencePeriodRange', undefined); // Clear custom range if preset is chosen
    }
  };

  // Handle custom reference period range change
  const handleReferenceRangeChange = (range: DateRange | undefined) => {
    handleFilterChange('referencePeriodRange', range);
  };

  // Handle slider value change
  const handleAmountRangeChange = (values: number[]) => {
    if (values.length === 2) {
      handleFilterChange('minAmount', values[0]);
      handleFilterChange('maxAmount', values[1]);
    }
  };

  // Handler for customer selection in the "Gerar Boleto" sheet
  const handleNewInvoiceCustomerSelect = (customerId: string) => {
    setSelectedCustomerIdForNewInvoice(customerId);
  };

  // New handler to call the initiation function passed via props
  const handleInitiateClick = () => {
    if (selectedCustomerIdForNewInvoice) {
      initiateInvoice(selectedCustomerIdForNewInvoice);
    } else {
      toast.error('Por favor, selecione um cliente primeiro.');
    }
  };

  return (
  <motion.div 
      className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 p-1"
    initial={{ opacity: 0, y: -20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.4 }}
  >
    <div>
      <motion.h2
        className="text-3xl font-bold tracking-tight text-teal-800 dark:text-teal-400 flex items-center"
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
      >
        <FileText className="h-8 w-8 mr-2 text-teal-600 dark:text-teal-400" />
        Faturas
      </motion.h2>
      <motion.p
        className="text-gray-600 dark:text-gray-400 mt-1"
        initial={{ opacity: 0, x: -5 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        Gerencie suas faturas e pagamentos
      </motion.p>
    </div>
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5, delay: 0.2 }}
      className="flex gap-2 flex-wrap"
    >
      <Sheet>
        <SheetTrigger asChild>
          <Button variant="outline" className="border-teal-200 hover:border-teal-300 transition-all">
            <SlidersHorizontal className="h-4 w-4 mr-2 text-teal-700 dark:text-teal-300" />
            Filtros
          </Button>
        </SheetTrigger>
          <SheetContent className="border-l-teal-200 dark:border-l-teal-800 w-[400px] sm:w-[540px]">
          <SheetHeader className="mb-4">
            <SheetTitle className="text-teal-800 dark:text-teal-400 flex items-center">
              <Filter className="h-5 w-5 mr-2" />
              Filtros Avançados
            </SheetTitle>
            <SheetDescription>
                Refine a visualização das faturas.
            </SheetDescription>
          </SheetHeader>
            <div className="space-y-5 p-6 overflow-y-auto h-[calc(100vh-180px)]"> 
            <div className="space-y-2">
              <h3 className="text-sm font-medium flex items-center">
                <Calendar className="h-4 w-4 mr-2 text-teal-600" />
                  Período (Vencimento)
              </h3>
                <DatePickerWithRange 
                  onSelect={handleDateRangeChange}
                />
            </div>
            
            <div className="space-y-2">
              <h3 className="text-sm font-medium">Período de Referência</h3>
              <Select 
                value={filters.referencePeriodPreset || 'all'}
                onValueChange={handleReferencePresetChange}
              >
                <SelectTrigger className="border-slate-300 focus:ring-teal-500 dark:border-slate-700">
                  <SelectValue placeholder="Selecione um período..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Qualquer Período</SelectItem>
                  <SelectItem value="current_month">Este Mês</SelectItem>
                  <SelectItem value="last_month">Mês Passado</SelectItem>
                  <SelectItem value="last_3_months">Últimos 3 Meses</SelectItem>
                  <SelectItem value="current_year">Ano Atual</SelectItem>
                  <SelectItem value="custom">Personalizado</SelectItem>
                </SelectContent>
              </Select>
              {/* Show custom range picker if 'custom' is selected */} 
              {showCustomPeriodPicker && (
                <div className="mt-2">
                  <DatePickerWithRange
                    onSelect={handleReferenceRangeChange}
                  />
                </div>
              )}
            </div>
            <div className="space-y-2">
              <h3 className="text-sm font-medium">Status</h3>
                <Select 
                  value={filters.status}
                  onValueChange={(value) => handleFilterChange('status', value)}
                >
                <SelectTrigger className="border-slate-300 focus:ring-teal-500 dark:border-slate-700">
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value={INVOICE_STATUS.PAID}>Paga</SelectItem>
                  <SelectItem value={INVOICE_STATUS.PENDING}>Pendente</SelectItem>
                  <SelectItem value={INVOICE_STATUS.OVERDUE}>Vencida</SelectItem>
                  <SelectItem value={INVOICE_STATUS.CANCELED}>Cancelada</SelectItem>
                  <SelectItem value={INVOICE_STATUS.NOTIFIED}>Notificada</SelectItem>
                  <SelectItem value={INVOICE_STATUS.PROCESSING}>Processando</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <h3 className="text-sm font-medium">Cliente</h3>
                <Select 
                  value={filters.customerId}
                  onValueChange={(value) => handleFilterChange('customerId', value)}
                  disabled={usersLoading}
                >
                <SelectTrigger className="border-slate-300 focus:ring-teal-500 dark:border-slate-700">
                    <SelectValue placeholder={usersLoading ? "Carregando..." : "Selecione um cliente..."} />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">Todos os Clientes</SelectItem>
                    {users.map(user => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.name || user.email}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <h3 className="text-sm font-medium">Instalação</h3>
                <Select 
                  value={filters.installationId}
                  onValueChange={(value) => handleFilterChange('installationId', value)}
                  disabled={loadingInstallations}
                >
                <SelectTrigger className="border-slate-300 focus:ring-teal-500 dark:border-slate-700">
                    <SelectValue placeholder={loadingInstallations ? "Carregando..." : "Selecione uma instalação..."} />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">Todas as Instalações</SelectItem>
                     {installations.map(inst => (
                      <SelectItem key={inst.id} value={inst.id}>
                        {inst.installationNumber}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-4 pt-2">
              <h3 className="text-sm font-medium">Valor da Fatura (R$)</h3>
              <div className="px-1">
                <Slider
                  defaultValue={[Number(filters.minAmount) || 0, Number(filters.maxAmount) || 10000]}
                  min={0}
                  max={10000} // Adjust max value as needed
                  step={100}
                  minStepsBetweenThumbs={1}
                  onValueChange={handleAmountRangeChange}
                  className="h-2 [&>span:first-child]:h-4 [&>span:first-child]:w-4 [&>span:last-child]:h-4 [&>span:last-child]:w-4"
                />
              </div>
              <div className="flex justify-between text-xs text-gray-600 dark:text-gray-400">
                <span>R$ {Number(filters.minAmount).toLocaleString('pt-BR')}</span>
                <span>R$ {Number(filters.maxAmount).toLocaleString('pt-BR')}</span>
              </div>
            </div>
            </div>
             <SheetFooter className="mt-auto pt-4 border-t border-t-slate-200 dark:border-t-slate-800 grid grid-cols-2 gap-2">
              <Button variant="outline" onClick={clearFilters} className="border-slate-300 hover:border-slate-400 hover:bg-red-700 hover:text-white">
                <X className="h-4 w-4 mr-2" />
                Limpar Filtros
              </Button>
              <SheetClose asChild>
                <Button onClick={onApplyFilters} className="bg-teal-600 hover:bg-teal-700">
                  {isLoading ? <LoadingSpinner size="sm" className="mr-2"/> : <Filter className="h-4 w-4 mr-2"/>}
                  Aplicar Filtros
                </Button>
              </SheetClose>
            </SheetFooter>
        </SheetContent>
      </Sheet>
      
      <Sheet onOpenChange={(isOpen) => { if (!isOpen) setSelectedCustomerIdForNewInvoice(null); }}>
        <SheetTrigger asChild>
          <Button disabled={isInitiatingInvoice}> 
            {isInitiatingInvoice ? <LoadingSpinner size="sm" className="mr-2"/> : <PlusCircle className="mr-2 h-4 w-4" />}
            Gerar Boleto
          </Button>
        </SheetTrigger>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Selecionar Cliente</SheetTitle>
            <SheetDescription>
              Selecione o cliente para o qual deseja gerar um boleto inicial.
            </SheetDescription>
          </SheetHeader>
          
          <div className="p-4 -mt-4">
            <Label>Cliente</Label>
            <Select 
                  value={selectedCustomerIdForNewInvoice ?? undefined}
                  onValueChange={(value) => setSelectedCustomerIdForNewInvoice(value)}
                  disabled={usersLoading || isInitiatingInvoice}
                >
                <SelectTrigger className="border-slate-300 focus:ring-teal-500 dark:border-slate-700">
                    <SelectValue placeholder={usersLoading ? "Carregando..." : "Selecione um cliente..."} />
                </SelectTrigger>
                <SelectContent>
                    {users.filter(user => user.role === 'CUSTOMER').map(user => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.name || user.email}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
          </div>
          
          <SheetFooter className="grid grid-cols-2 gap-2"> 
            <SheetClose asChild>
              <Button variant="outline" disabled={isInitiatingInvoice}>Cancelar</Button> 
            </SheetClose>
            <Button 
              onClick={handleInitiateClick} 
              disabled={!selectedCustomerIdForNewInvoice || usersLoading || isInitiatingInvoice}
            >
              {isInitiatingInvoice ? <LoadingSpinner size="sm" className="mr-2"/> : <Check className="mr-2 h-4 w-4" />} 
              Iniciar Geração
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    
    </motion.div>
  </motion.div>
)
}

// Componente para os filtros de busca
const SearchFilters = ({ 
  searchTerm, 
  setSearchTerm, 
  statusFilter, 
  setStatusFilter,
  refreshData
}: { 
  searchTerm: string, 
  setSearchTerm: (term: string) => void,
  statusFilter: string,
  setStatusFilter: (status: string) => void,
  refreshData: () => void
}) => (
  <motion.div 
    className="flex flex-col sm:flex-row gap-4 mb-6"
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.3 }}
  >
    <div className="relative flex-1">
      <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400">
        <Search className="h-4 w-4" />
      </div>
      <Input
        placeholder="Buscar por nº fatura, cliente ou instalação..."
        className="pl-10 border-slate-200 rounded-md focus:ring-teal-500 focus:border-teal-500 transition-all"
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
      />
      {searchTerm && (
        <button 
          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none"
          onClick={() => setSearchTerm("")}
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
    <div className="w-full sm:w-52">
      <Select value={statusFilter} onValueChange={setStatusFilter}>
        <SelectTrigger className="border-slate-200 focus:ring-teal-500 focus:border-teal-500 transition-all">
          <div className="flex items-center">
            <div className="h-2 w-2 rounded-full mr-2 flex-shrink-0 bg-current" 
              style={{
                color: 
                  statusFilter === INVOICE_STATUS.PAID ? 'rgb(16, 185, 129)' : 
                  statusFilter === INVOICE_STATUS.PENDING ? 'rgb(245, 158, 11)' : 
                  statusFilter === INVOICE_STATUS.OVERDUE ? 'rgb(239, 68, 68)' : 
                  statusFilter === INVOICE_STATUS.CANCELED ? 'rgb(100, 116, 139)' :
                  'rgb(107, 114, 128)'
              }}
            ></div>
            <SelectValue placeholder="Status" />
          </div>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all" className="flex items-center">
            <div className="flex items-center">
              <div className="h-2 w-2 rounded-full bg-gray-400 mr-2"></div>
              Todos
            </div>
          </SelectItem>
          {Object.entries(INVOICE_STATUS).map(([key, value]) => (
            <SelectItem key={key} value={value} className="flex items-center">
            <div className="flex items-center">
                 <div className={cn("h-2 w-2 rounded-full mr-2", 
                   value === INVOICE_STATUS.PAID && "bg-emerald-500",
                   value === INVOICE_STATUS.PENDING && "bg-amber-500",
                   value === INVOICE_STATUS.OVERDUE && "bg-red-500",
                   value === INVOICE_STATUS.CANCELED && "bg-slate-500"
                 )}></div>
                 {value}
            </div>
          </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button 
            variant="outline" 
            size="icon" 
            onClick={refreshData}
            className="rounded-md border-slate-200 hover:border-teal-300 hover:bg-teal-50 transition-all duration-200"
          >
            <RefreshCcw className="h-4 w-4 text-teal-600" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Atualizar dados</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  </motion.div>
)

// Componente para ações em massa de faturas selecionadas
const BulkActions = ({
  selectedInvoices,
  clearSelection
}: {
  selectedInvoices: string[]
  clearSelection: () => void
}) => {
  if (selectedInvoices.length === 0) return null

  const handleBulkEmail = () => {
    toast.info(`Funcionalidade de envio em massa por e-mail pendente.`);
  }

  const handleBulkDownload = () => {
    toast.info(`Funcionalidade de download em massa pendente.`);
  }

  const handleBulkPrint = () => {
    toast.info(`Funcionalidade de impressão em massa pendente.`);
  }

  return (
    <motion.div 
      className="bg-gradient-to-r from-teal-50 to-blue-50 dark:from-slate-800 dark:to-slate-800 p-4 rounded-lg shadow-sm border border-teal-100 dark:border-slate-700 flex justify-between items-center mb-4"
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.3 }}
    >
      <div className="font-medium text-teal-800 dark:text-teal-300 flex items-center">
        <div className="h-6 w-6 rounded-full bg-teal-100 dark:bg-teal-800 text-teal-800 dark:text-teal-200 flex items-center justify-center text-xs mr-2">
          {selectedInvoices.length}
        </div>
        {selectedInvoices.length === 1 ? "fatura selecionada" : "faturas selecionadas"}
      </div>
      <div className="flex gap-2">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                size="sm" 
                variant="outline" 
                onClick={handleBulkEmail}
                className="border-teal-200 hover:border-teal-300 hover:bg-teal-50 dark:border-teal-800 dark:hover:border-teal-700 dark:hover:bg-teal-900/30 transition-all"
              >
                <Send className="h-4 w-4 mr-2 text-teal-600 dark:text-teal-400" />
                Enviar
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Enviar por e-mail (Em breve)</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
        
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                size="sm" 
                variant="outline" 
                onClick={handleBulkDownload}
                className="border-teal-200 hover:border-teal-300 hover:bg-teal-50 dark:border-teal-800 dark:hover:border-teal-700 dark:hover:bg-teal-900/30 transition-all"
              >
                <Download className="h-4 w-4 mr-2 text-teal-600 dark:text-teal-400" />
                Baixar
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Baixar faturas (Em breve)</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
        
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                size="sm" 
                variant="outline" 
                onClick={handleBulkPrint}
                className="border-teal-200 hover:border-teal-300 hover:bg-teal-50 dark:border-teal-800 dark:hover:border-teal-700 dark:hover:bg-teal-900/30 transition-all"
              >
                <Printer className="h-4 w-4 mr-2 text-teal-600 dark:text-teal-400" />
                Imprimir
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Imprimir faturas (Em breve)</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
        
        <Button 
          size="sm" 
          variant="ghost" 
          onClick={clearSelection}
          className="text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
        >
          <X className="h-4 w-4 mr-1" />
          Cancelar
        </Button>
      </div>
    </motion.div>
  )
}

// Componente para a tabela de faturas
const InvoicesTable = ({ 
  invoices,
  selectedInvoices,
  toggleInvoiceSelection,
  toggleSelectAll,
  allSelected,
  onMarkAsPaid,
  onDeleteInvoice
}: { 
  invoices: FormattedInvoice[]
  selectedInvoices: string[]
  toggleInvoiceSelection: (id: string) => void
  toggleSelectAll: () => void
  allSelected: boolean
  onMarkAsPaid: (id: string) => Promise<void>
  onDeleteInvoice: (id: string) => void
}) => {
  
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState<boolean>(false);
  const [invoiceToDelete, setInvoiceToDelete] = useState<string | null>(null);  
  const router = useRouter();

  const handleRowClick = (id: string) => {
    router.push(`/admin/financeiro/faturas/${id}`);
  };

  const handleDeleteClick = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setInvoiceToDelete(id);
    setDeleteConfirmOpen(true);
  };

  const confirmDelete = () => {
    if (invoiceToDelete) {
      onDeleteInvoice(invoiceToDelete);
    }
      setDeleteConfirmOpen(false);
      setInvoiceToDelete(null);
  };

  const formatDateSafe = (date: Date | undefined | null): string => {
    if (!date) return '-';
    try {
      return format(date, 'dd/MM/yyyy', { locale: ptBR });
    } catch (error) {
      return 'Data inválida';
    }
  };

  const getStatusBadge = (status: InvoiceStatus | undefined) => {
    switch (status) {
      case INVOICE_STATUS.PAID:
        return (
          <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-400 dark:border-emerald-800 font-medium whitespace-nowrap">
            <div className="h-2 w-2 rounded-full bg-emerald-500 mr-1.5"></div>
            Paga
          </Badge>
        );
      case INVOICE_STATUS.PENDING:
        return (
          <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-400 dark:border-amber-800 font-medium whitespace-nowrap">
            <div className="h-2 w-2 rounded-full bg-amber-500 mr-1.5"></div>
            Pendente
          </Badge>
        );
      case INVOICE_STATUS.OVERDUE:
        return (
          <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-400 dark:border-red-800 font-medium whitespace-nowrap">
            <div className="h-2 w-2 rounded-full bg-red-500 mr-1.5"></div>
            Vencida
          </Badge>
        );
        case INVOICE_STATUS.CANCELED:
          return (
            <Badge variant="outline" className="bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700 font-medium whitespace-nowrap">
              <div className="h-2 w-2 rounded-full bg-slate-500 mr-1.5"></div>
              Cancelada
          </Badge>
        );
      default:
        return <Badge variant="secondary">{status || 'Desconhecido'}</Badge>;
    }
  };

  return (
    <>
      <div className="rounded-lg border border-slate-200 dark:border-slate-800 overflow-hidden">
        <Table>
          <TableHeader className="bg-slate-50 dark:bg-slate-800/50">
            <TableRow className="hover:bg-slate-100 dark:hover:bg-slate-800/80">
              <TableHead className="w-12 py-3">
                <div className="flex items-center justify-center">
                  <input 
                    type="checkbox" 
                    checked={allSelected}
                    onChange={toggleSelectAll}
                    className="rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                    aria-label="Selecionar todas as faturas"
                  />
                </div>
              </TableHead>
              <TableHead className="font-medium text-slate-700 dark:text-slate-300">Fatura</TableHead>
              <TableHead className="font-medium text-slate-700 dark:text-slate-300">Cliente</TableHead>
              <TableHead className="font-medium text-slate-700 dark:text-slate-300">Instalação</TableHead>
              <TableHead className="font-medium text-slate-700 dark:text-slate-300">Referência</TableHead>
              <TableHead className="font-medium text-slate-700 dark:text-slate-300">Vencimento</TableHead>
              <TableHead className="font-medium text-slate-700 dark:text-slate-300 text-right">Valor (R$)</TableHead>
              <TableHead className="font-medium text-slate-700 dark:text-slate-300">Status</TableHead>
              <TableHead className="text-right font-medium text-slate-700 dark:text-slate-300 pr-4">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {invoices.length > 0 ? (
              invoices.map((invoice, index) => (
                <motion.tr 
                  key={invoice.id}
                  className={cn(
                    "border-b border-slate-100 dark:border-slate-800 last:border-0",
                    "hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors",
                    selectedInvoices.includes(invoice.id) && "bg-teal-50/50 dark:bg-teal-900/20",
                    invoice.status === INVOICE_STATUS.OVERDUE && !selectedInvoices.includes(invoice.id) && "bg-red-50/30 dark:bg-red-900/10"
                  )}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.3, delay: index * 0.03 }}
                >
                  <TableCell className="w-12 py-2" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-center">
                      <input 
                        type="checkbox" 
                        checked={selectedInvoices.includes(invoice.id)}
                        onChange={() => toggleInvoiceSelection(invoice.id)}
                        className="rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                        aria-label={`Selecionar fatura ${invoice.invoiceNumber || invoice.id}`}
                      />
                    </div>
                  </TableCell>
                  <TableCell className="font-medium cursor-pointer py-2" onClick={() => handleRowClick(invoice.id)}>
                    {invoice.invoiceNumber || invoice.id.substring(0, 8)}
                  </TableCell>
                  <TableCell className="cursor-pointer py-2" onClick={() => handleRowClick(invoice.id)}>
                    {invoice.customerName || "-"} 
                  </TableCell>
                  <TableCell className="cursor-pointer py-2" onClick={() => handleRowClick(invoice.id)}>
                    {invoice.installationNumber || "-"}
                  </TableCell>
                  <TableCell className="cursor-pointer py-2" onClick={() => handleRowClick(invoice.id)}>
                     {invoice.referenceMonth || "-"}
                  </TableCell>
                  <TableCell className={cn("cursor-pointer py-2", invoice.status === INVOICE_STATUS.OVERDUE && "text-red-600 dark:text-red-400 font-medium")} onClick={() => handleRowClick(invoice.id)}>
                     {formatDateSafe(invoice.dueDate)}
                  </TableCell>
                  <TableCell className="font-medium text-right cursor-pointer py-2" onClick={() => handleRowClick(invoice.id)}>
                     {formatCurrency(invoice.invoiceAmount ?? 0)}
                  </TableCell>
                  <TableCell className="cursor-pointer py-2" onClick={() => handleRowClick(invoice.id)}>
                    {getStatusBadge(invoice.status)}
                  </TableCell>
                  <TableCell className="text-right py-2 pr-4" onClick={(e) => e.stopPropagation()}>
                    <div className="flex justify-end gap-1">
                      {/* Botão Marcar como Paga */}
                      {(invoice.status === INVOICE_STATUS.PENDING || invoice.status === INVOICE_STATUS.OVERDUE) && (
                        <TooltipProvider delayDuration={100}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                onClick={() => onMarkAsPaid(invoice.id)}
                                className="text-emerald-600 hover:text-emerald-800 hover:bg-emerald-100/50 dark:hover:bg-emerald-900/40 h-8 w-8"
                                aria-label="Marcar como paga"
                              >
                                <Check className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                              <p>Marcar fatura como paga</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                      )}

                      {/* Botão Ver */}
                      <TooltipProvider delayDuration={100}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button variant="ghost" size="icon" onClick={() => handleRowClick(invoice.id)}
                              className="text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-slate-100/50 dark:hover:bg-slate-800/40 h-8 w-8"
                              aria-label="Visualizar fatura"
                            >
                              <Eye className="h-4 w-4" />
                                </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Visualizar detalhes</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>

                      {/* Botão Ações Dropdown */}
                       <DropdownMenu>
                         <TooltipProvider delayDuration={100}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                               <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon" 
                                    className="text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-slate-100/50 dark:hover:bg-slate-800/40 h-8 w-8"
                                    aria-label="Mais ações"
                                  >
                                    <SlidersHorizontal className="h-4 w-4" />
                            </Button>
                                </DropdownMenuTrigger>
                          </TooltipTrigger>
                          <TooltipContent>
                               <p>Mais ações</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                         <DropdownMenuContent align="end" className="w-48">
                           <DropdownMenuItem className="cursor-pointer" onSelect={() => { /* Handle Email */ }}>
                             <Mail className="h-4 w-4 mr-2" />
                             Enviar por E-mail
                           </DropdownMenuItem>
                           <DropdownMenuItem className="cursor-pointer" onSelect={() => { /* Handle WhatsApp */ }}>
                             <MessageSquare className="h-4 w-4 mr-2" />
                             Enviar por WhatsApp
                           </DropdownMenuItem>
                           <DropdownMenuItem className="cursor-pointer" onSelect={() => { /* Handle Download */ }}>
                             <Download className="h-4 w-4 mr-2" />
                             Baixar PDF
                           </DropdownMenuItem>
                           <DropdownMenuSeparator />
                           <DropdownMenuItem 
                             className="cursor-pointer text-red-600 focus:bg-red-50 focus:text-red-700 dark:focus:bg-red-900/50 dark:focus:text-red-400"
                             onSelect={(e) => handleDeleteClick(invoice.id, e as unknown as React.MouseEvent)}
                           >
                             <Trash2 className="h-4 w-4 mr-2" />
                             Excluir Fatura
                           </DropdownMenuItem>
                         </DropdownMenuContent>
                       </DropdownMenu>
                    </div>
                  </TableCell>
                </motion.tr>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={9} className="h-24 text-center text-slate-500 dark:text-slate-400">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <FileX className="h-8 w-8 text-slate-300 dark:text-slate-600" />
                    <p>Nenhuma fatura encontrada com os filtros atuais.</p>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Fatura?</AlertDialogTitle>
            <AlertDialogDescription>
              Você tem certeza que deseja excluir a fatura 
              <span className="font-medium">{invoiceToDelete?.substring(0,8)}</span>? 
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-slate-200">Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDelete}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
            >
              Sim, Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

// Componente para estatísticas de fatura
const InvoiceStats = ({ invoices }: { invoices: FormattedInvoice[] }) => {
  const totalInvoices = invoices.length;
  const totalAmount = invoices.reduce((sum, invoice) => sum + (invoice.invoiceAmount ?? 0), 0);
  
  const pendingInvoices = invoices.filter(invoice => invoice.status === INVOICE_STATUS.PENDING).length;
  const pendingAmount = invoices
    .filter(invoice => invoice.status === INVOICE_STATUS.PENDING)
    .reduce((sum, invoice) => sum + (invoice.invoiceAmount ?? 0), 0);
  
  const paidInvoices = invoices.filter(invoice => invoice.status === INVOICE_STATUS.PAID).length;
  const paidAmount = invoices
    .filter(invoice => invoice.status === INVOICE_STATUS.PAID)
    .reduce((sum, invoice) => sum + (invoice.invoiceAmount ?? 0), 0);
    
  const overdueInvoices = invoices.filter(invoice => invoice.status === INVOICE_STATUS.OVERDUE).length;
  const overdueAmount = invoices
    .filter(invoice => invoice.status === INVOICE_STATUS.OVERDUE)
    .reduce((sum, invoice) => sum + (invoice.invoiceAmount ?? 0), 0);

  const averageInvoiceAmount = totalInvoices > 0 ? totalAmount / totalInvoices : 0;

  const pendingPercentage = totalInvoices > 0 ? (pendingInvoices / totalInvoices) * 100 : 0;
  const paidPercentage = totalInvoices > 0 ? (paidInvoices / totalInvoices) * 100 : 0;
  const overduePercentage = totalInvoices > 0 ? (overdueInvoices / totalInvoices) * 100 : 0;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mb-6">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
      >
        <Card className="overflow-hidden border-slate-200 hover:border-teal-300 transition-all duration-300 shadow-sm hover:shadow">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-teal-400 to-blue-500"></div>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium flex items-center">
              <FileText className="h-4 w-4 mr-2 text-teal-600" />
              Total de Faturas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex justify-between items-center">
              <div className="text-3xl font-bold text-slate-900 dark:text-slate-100">{totalInvoices}</div>
              <div className="text-xl font-semibold text-teal-700 dark:text-teal-400">{formatCurrency(totalAmount)}</div>
            </div>
            <div className="mt-2 text-xs text-slate-500 dark:text-slate-400">
              Valor médio: {formatCurrency(averageInvoiceAmount)}
            </div>
          </CardContent>
        </Card>
      </motion.div>
      
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.2 }}
      >
        <Card className="overflow-hidden border-slate-200 hover:border-emerald-300 transition-all duration-300 shadow-sm hover:shadow">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-400 to-green-500"></div>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium flex items-center">
              <Check className="h-4 w-4 mr-2 text-emerald-600" />
              Pagas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex justify-between items-center">
              <div className="text-3xl font-bold text-slate-900 dark:text-slate-100">{paidInvoices}</div>
              <div className="text-xl font-semibold text-emerald-600 dark:text-emerald-400">{formatCurrency(paidAmount)}</div>
            </div>
            <div className="flex items-center mt-2">
              <div className="h-2 flex-grow bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-emerald-500 rounded-full" 
                  style={{ width: `${paidPercentage}%` }}
                ></div>
              </div>
              <span className="text-xs font-medium ml-2 text-slate-500 dark:text-slate-400">
                {paidPercentage.toFixed(0)}%
              </span>
            </div>
          </CardContent>
        </Card>
      </motion.div>
      
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.3 }}
      >
        <Card className="overflow-hidden border-slate-200 hover:border-amber-300 transition-all duration-300 shadow-sm hover:shadow">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-amber-400 to-yellow-500"></div>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium flex items-center">
              <Calendar className="h-4 w-4 mr-2 text-amber-600" />
              Pendentes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex justify-between items-center">
              <div className="text-3xl font-bold text-slate-900 dark:text-slate-100">{pendingInvoices}</div>
              <div className="text-xl font-semibold text-amber-600 dark:text-amber-400">{formatCurrency(pendingAmount)}</div>
            </div>
            <div className="flex items-center mt-2">
              <div className="h-2 flex-grow bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-amber-500 rounded-full" 
                  style={{ width: `${pendingPercentage}%` }}
                ></div>
              </div>
              <span className="text-xs font-medium ml-2 text-slate-500 dark:text-slate-400">
                {pendingPercentage.toFixed(0)}%
              </span>
            </div>
          </CardContent>
        </Card>
      </motion.div>
      
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.4 }}
      >
        <Card className="overflow-hidden border-slate-200 hover:border-red-300 transition-all duration-300 shadow-sm hover:shadow">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-400 to-rose-500"></div>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium flex items-center">
              <AlertCircle className="h-4 w-4 mr-2 text-red-600" />
              Vencidas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex justify-between items-center">
              <div className="text-3xl font-bold text-slate-900 dark:text-slate-100">{overdueInvoices}</div>
              <div className="text-xl font-semibold text-red-600 dark:text-red-400">{formatCurrency(overdueAmount)}</div>
            </div>
            <div className="flex items-center mt-2">
              <div className="h-2 flex-grow bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-red-500 rounded-full" 
                  style={{ width: `${overduePercentage}%` }}
                ></div>
              </div>
              <span className="text-xs font-medium ml-2 text-slate-500 dark:text-slate-400">
                {overduePercentage.toFixed(0)}%
              </span>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}

// Main FaturasPage component
export default function FaturasPage() {
  const { user } = useAuth()
  const router = useRouter()
  const { users, fetchUsers } = useUserManagementStore();
  const [searchTerm, setSearchTerm] = useState("")
  const [filters, setFilters] = useState<InvoiceFilters>({ 
    status: "all",
    customerId: "all",
    installationId: "all",
    dueDateRange: undefined,
    referencePeriodPreset: 'all', // Default preset
    referencePeriodRange: undefined,
    minAmount: '0', // Default min amount
    maxAmount: '10000', // Default max amount (example)
  });
  const [appliedFilters, setAppliedFilters] = useState<InvoiceFilters>(filters);
  const [selectedInvoices, setSelectedInvoices] = useState<string[]>([])
  const { 
    invoices: storeInvoices, 
    fetchInvoices: fetchStoreInvoices,
    error: invoicesError,
    isLoading: invoicesLoading,
    markAsPaid: markStoreInvoiceAsPaid,
    deleteInvoice: deleteStoreInvoice,
    initiateInvoice: initiateStoreInvoice,
  } = useInvoiceStore();
  
  const [localIsLoading, setLocalIsLoading] = useState(true);
  const [selectedCustomerIdForNewInvoice, setSelectedCustomerIdForNewInvoice] = useState<string | null>(null); // State for selected customer
  const [isInitiatingInvoice, setIsInitiatingInvoice] = useState(false); // Loading state for initiation

  // Load users when component mounts
  useEffect(() => {
    if (users.length === 0) {
      fetchUsers();
    }
  }, [users.length, fetchUsers]);
  
  // Define loadData function first before using it in useEffect
  const loadData = useCallback(async () => {
    setLocalIsLoading(true)
    logger.info("Carregando dados de faturas", { appliedFilters });
    
    try {
      // Prepare filters for the API call
      const fetchFilters = {
        status: appliedFilters.status === 'all' ? undefined : appliedFilters.status,
        customerId: appliedFilters.customerId === 'all' ? undefined : appliedFilters.customerId,
        installationId: appliedFilters.installationId === 'all' ? undefined : appliedFilters.installationId,
        startDate: appliedFilters.dueDateRange?.from, // Use dueDateRange
        endDate: appliedFilters.dueDateRange?.to,     // Use dueDateRange
        referencePeriodPreset: appliedFilters.referencePeriodPreset === 'all' ? undefined : appliedFilters.referencePeriodPreset,
        referenceStartDate: appliedFilters.referencePeriodRange?.from,
        referenceEndDate: appliedFilters.referencePeriodRange?.to,
        minAmount: appliedFilters.minAmount ? Number(appliedFilters.minAmount) : undefined,
        maxAmount: appliedFilters.maxAmount ? Number(appliedFilters.maxAmount) : undefined,
      };
      // Remove undefined keys before sending
      Object.keys(fetchFilters).forEach(key => fetchFilters[key as keyof typeof fetchFilters] === undefined && delete fetchFilters[key as keyof typeof fetchFilters]);

      await fetchStoreInvoices(fetchFilters as any); // Pass cleaned filters

    } catch (error) {
      logger.error("Erro ao carregar dados de faturas", { error });
    } finally {
      setLocalIsLoading(false)
    }
  }, [appliedFilters, fetchStoreInvoices]);

  useEffect(() => {
    loadData();
  }, [appliedFilters, loadData]);

  const handleApplyFilters = () => {
    logger.info("Applying filters", { filters });
    setAppliedFilters(filters);
  };

  const handleMarkAsPaid = async (invoiceId: string) => {
    logger.info(`Attempting to mark invoice ${invoiceId} as paid via store`);
    
    try {
      await markStoreInvoiceAsPaid(invoiceId);
      toast.success('Fatura marcada como paga!');
    } catch (error: any) { 
      logger.error("Error marking invoice as paid via store", { invoiceId, error });
      toast.error(error.message || 'Erro ao marcar fatura como paga.');
    }
  };
  
  const handleDeleteInvoice = async (invoiceId: string) => {
    logger.info(`Attempting to delete invoice ${invoiceId} via store`);
    
    try {
      await deleteStoreInvoice(invoiceId);
      toast.success('Fatura excluída com sucesso!');
      setSelectedInvoices(prev => prev.filter(id => id !== invoiceId));
    } catch (error: any) {
      logger.error("Error deleting invoice via store", { invoiceId, error });
      toast.error(error.message || 'Erro ao excluir fatura.');
    }
  };

  const getFilteredInvoices = () => {
    const searchLower = searchTerm.toLowerCase();
    const invoicesToFilter = Array.isArray(storeInvoices) ? storeInvoices : [];
    if (!searchLower) return invoicesToFilter;
    
    return invoicesToFilter.filter((invoice: FormattedInvoice) => {
      const invoiceNumberMatch = invoice.invoiceNumber && invoice.invoiceNumber.toLowerCase().includes(searchLower);
      const customerNameMatch = invoice.customerName && invoice.customerName.toLowerCase().includes(searchLower);
      const installationNumberMatch = invoice.installationNumber && invoice.installationNumber.toLowerCase().includes(searchLower);
      const idMatch = invoice.id.toLowerCase().includes(searchLower);
      
      return invoiceNumberMatch || customerNameMatch || installationNumberMatch || idMatch;
    });
  };
  
  const filteredInvoices = getFilteredInvoices()
  logger.debug(`Exibindo ${filteredInvoices.length} de ${storeInvoices?.length || 0} faturas após filtro de busca local`) 

  const toggleInvoiceSelection = (id: string) => {
    setSelectedInvoices(prev => 
      prev.includes(id) 
        ? prev.filter(invId => invId !== id) 
        : [...prev, id]
    )
  }

  const toggleSelectAll = () => {
    if (selectedInvoices.length === filteredInvoices.length) {
      setSelectedInvoices([])
    } else {
      setSelectedInvoices(filteredInvoices.map(inv => inv.id))
    }
  }

  const clearSelection = () => {
    setSelectedInvoices([])
  }

  const allSelected = filteredInvoices.length > 0 && 
    selectedInvoices.length === filteredInvoices.length

  // Handler to initiate the invoice creation process
  const handleInitiateInvoice = async (customerId: string) => {
    if (!customerId) return;
    setIsInitiatingInvoice(true);
    logger.info('[FaturasPage] Initiating invoice process', { customerId });
    
    try {
      logger.debug('[FaturasPage] Calling initiateStoreInvoice...');
      const newInvoiceId = await initiateStoreInvoice(customerId); 
      logger.debug('[FaturasPage] initiateStoreInvoice returned', { newInvoiceId });
      
      if (newInvoiceId) {
        toast.success('Boleto inicial criado. Redirecionando...');
        logger.info('[FaturasPage] Navigating to new invoice', { newInvoiceId });
        router.push(`/admin/financeiro/faturas/${newInvoiceId}`); 
      } else {
        // This case might not be reachable if the store throws, but good for safety
        logger.error('[FaturasPage] Initiation succeeded but no ID received (unexpected)', { customerId });
        throw new Error('Falha ao obter ID do novo boleto após iniciação.');
      }
    } catch (error) {
      // Log the caught error with more detail
      logger.error('[FaturasPage] Error during invoice initiation process', { 
        customerId, 
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        errorDetails: error // Log the original error object
      });
      toast.error(`Erro ao iniciar criação: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    } finally {
      setIsInitiatingInvoice(false);
      logger.debug('[FaturasPage] Initiation process finished (finally block)');
    }
  };

  return (
    <motion.div 
      className="space-y-6 p-4 " 
      initial={{ opacity: 0 }} 
      animate={{ opacity: 1 }} 
      transition={{ duration: 0.5 }}
    >
      <PageHeader 
        onApplyFilters={handleApplyFilters} 
        isLoading={invoicesLoading || localIsLoading}
        setFilters={setFilters}
        filters={filters}
        initiateInvoice={handleInitiateInvoice}
        selectedCustomerIdForNewInvoice={selectedCustomerIdForNewInvoice}
        setSelectedCustomerIdForNewInvoice={setSelectedCustomerIdForNewInvoice}
        isInitiatingInvoice={isInitiatingInvoice}
      />

      <InvoiceStats invoices={storeInvoices || []} />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        <Card>
          <CardHeader>
            <CardTitle>Histórico de Faturas</CardTitle>
            <CardDescription>Visualize e gerencie todas as faturas</CardDescription>
          </CardHeader>
          <CardContent>
            <SearchFilters
              searchTerm={searchTerm}
              setSearchTerm={setSearchTerm}
              statusFilter={filters.status}
              setStatusFilter={(value) => setFilters((prev) => ({ ...prev, status: value }))}
              refreshData={loadData}
            />
            
            <BulkActions 
              selectedInvoices={selectedInvoices}
              clearSelection={clearSelection}
            />
            
            {invoicesLoading || localIsLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="flex flex-col items-center gap-4">
                  <LoadingSpinner size="lg" />
                  <p className="text-teal-600 font-medium">Carregando faturas...</p>
                </div>
              </div>
            ) : invoicesError ? (
              <div className="text-center py-8 text-red-600">
                <AlertCircle className="mx-auto h-10 w-10 mb-2"/>
                 <p>Erro ao carregar faturas: {invoicesError}</p>
                 <Button onClick={loadData} variant="outline" className="mt-4">Tentar Novamente</Button>
              </div>
            ) : (
            <InvoicesTable 
              invoices={filteredInvoices}
              selectedInvoices={selectedInvoices}
              toggleInvoiceSelection={toggleInvoiceSelection}
              toggleSelectAll={toggleSelectAll}
              allSelected={allSelected}
              onMarkAsPaid={handleMarkAsPaid}
              onDeleteInvoice={handleDeleteInvoice}
            />
            )}
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}