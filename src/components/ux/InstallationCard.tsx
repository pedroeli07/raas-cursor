"use client";


import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { useInstallationStore } from "@/store/installationStore";
import { Edit, BarChart2, Wrench, Trash2, PlugZap, Zap, Building2, Activity } from "lucide-react";
import { motion } from "framer-motion";
import { useState } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils/utils";
import { 
  Tooltip, 
  TooltipContent, 
  TooltipProvider, 
  TooltipTrigger 
} from "@/components/ui/tooltip";
import { Installation, InstallationType, InstallationStatus } from "@prisma/client";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";

// Extended Installation type with all the fields we use
interface InstallationWithDetails extends Installation {
  name?: string;
  distributorName?: string;
  customerName?: string;
  generation?: number;
  transfer?: number;
  consumption?: number;
  receipt?: number;
  compensation?: number;
  previousBalance?: number;
  currentBalance?: number;
  expiringBalance?: number;
  expirationPeriod?: string;
  quota?: number;
  lastConsumptionDate?: Date | string;
  latestEnergyData?: {
    period: string;
    consumption: number | null;
    generation: number | null;
    receipt: number | null;
    compensation: number | null;
    transferred: number | null;
    previousBalance: number | null;
    currentBalance: number | null;
    expiringBalanceAmount: number | null;
    expiringBalancePeriod: string | null;
    quota: number | null;
  } | null;
}

// Define the expected store type with formatters
interface InstallationStoreWithFormatters {
  formatDate: (date: Date | string | number) => string;
  formatEnergy: (value: number) => string; 
  formatCurrency: (value: number) => string;
  // add other store fields here if needed
}

export interface InstallationCardProps {
  installation: InstallationWithDetails;
  index?: number;
  formatDate?: (date: string | number | Date) => string;
  formatEnergy?: (value: number) => string;
  formatCurrency?: (value: number) => string;
  onEdit?: (installation: InstallationWithDetails) => void;
  onDelete?: (installation: InstallationWithDetails) => void;
  onViewDetails?: (installation: InstallationWithDetails) => void;
  onViewConsumption?: (installation: InstallationWithDetails) => void;
  onStatusChange?: (id: string, status: InstallationStatus) => void;
  getInstallationTypeLabel?: (type: InstallationType) => string;
  getInstallationTypeVariant?: (type: InstallationType) => string;
  getInstallationTypeIcon?: (type: InstallationType) => React.ReactNode;
}

export function InstallationCard({ 
  installation, 
  index,
  formatDate: propFormatDate,
  formatEnergy: propFormatEnergy,
  formatCurrency: propFormatCurrency,
  onEdit,
  onDelete,
  onViewDetails,
  onViewConsumption,
  onStatusChange,
  getInstallationTypeLabel: propGetInstallationTypeLabel,
  getInstallationTypeVariant: propGetInstallationTypeVariant,
  getInstallationTypeIcon: propGetInstallationTypeIcon
}: InstallationCardProps) {
  // Use type assertion to tell TypeScript these properties exist
  const store = useInstallationStore() as unknown as InstallationStoreWithFormatters;
  const { formatDate: storeFormatDate, formatEnergy: storeFormatEnergy, formatCurrency: storeFormatCurrency } = store;
  const [showDetails, setShowDetails] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

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

  // Use provided functions or fallback to store functions
  const actualFormatDate = propFormatDate || storeFormatDate || ((date) => new Date(date).toLocaleDateString('pt-BR'));
  
  // Add default implementations for these formatters
  const defaultFormatEnergy = (value: number): string => {
    return `${value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} kWh`;
  };
  
  const defaultFormatCurrency = (value: number): string => {
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };
  
  const actualFormatEnergy = propFormatEnergy || storeFormatEnergy || defaultFormatEnergy;
  const actualFormatCurrency = propFormatCurrency || storeFormatCurrency || defaultFormatCurrency;
  const actualGetInstallationTypeVariant = propGetInstallationTypeVariant || getInstallationTypeVariant;
  const actualGetInstallationTypeLabel = propGetInstallationTypeLabel || getInstallationTypeLabel;
  const actualGetInstallationTypeIcon = propGetInstallationTypeIcon || getInstallationTypeIcon;

  // Toggle details display
  const toggleDetails = () => {
    setShowDetails(!showDetails);
  };

  // Status change handler
  const handleStatusChange = async (newStatus: InstallationStatus) => {
    if (!onStatusChange || installation.status === newStatus) return;
    
    try {
      setIsUpdatingStatus(true);
      await onStatusChange(installation.id, newStatus);
      toast.success(`Status alterado para ${
        newStatus === InstallationStatus.ACTIVE ? "Ativa" : 
        newStatus === InstallationStatus.INACTIVE ? "Inativa" : "Pendente"
      }`);
    } catch (error) {
      console.error('Error changing installation status:', error);
      toast.error('Falha ao alterar status');
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      whileHover={{ scale: 1.02, y: -5 }}
      className="h-full"
    >
      <Card className={cn(
        "h-full flex flex-col",
        "bg-gradient-to-br from-primary/10 to-white/90 dark:from-gray-900/80 dark:to-gray-950/90",
        "hover:shadow-lg hover:shadow-primary/5 dark:hover:shadow-primary/10",
        "border border-primary/10 dark:border-primary/20",
        "transition-all duration-300"
      )}>
        <CardHeader className="pb-2">
          <div className="flex justify-between items-start">
            <div className="flex flex-col">
              <h3 className="font-medium truncate text-foreground">
                {installation.installationNumber || `Instalação ${installation.installationNumber}`}
              </h3>
              <p className="text-sm text-muted-foreground">
                {installation.installationNumber}
              </p>
            </div>
            <div className="flex gap-2">
              <Badge 
                variant="outline"
                className={cn(
                  "shadow-sm font-medium transition-all duration-300 hover:shadow-md",
                  actualGetInstallationTypeVariant(installation.type)
                )}
              >
                {actualGetInstallationTypeIcon(installation.type)}
                {actualGetInstallationTypeLabel(installation.type)}
              </Badge>
              <Badge 
                variant="outline"
                className={cn(
                  "shadow-sm font-medium transition-all duration-300 hover:shadow-md",
                  installation.status === InstallationStatus.ACTIVE ? "bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800" :
                  installation.status === InstallationStatus.INACTIVE ? "bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800" :
                  "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800"
                )}
              >
                {installation.status === InstallationStatus.ACTIVE ? "Ativa" : 
                 installation.status === InstallationStatus.INACTIVE ? "Inativa" : "Pendente"}
              </Badge>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="py-2 flex-grow bg-gradient-to-br from-transparent to-primary/[0.02] dark:from-transparent dark:to-primary/[0.03] rounded-md">
          <div className="flex flex-col space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Distribuidora:</span>
              <span className="text-sm font-medium">{installation.distributorName || "N/A"}</span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Cliente:</span>
              <span className="text-sm font-medium">{installation.customerName || "N/A"}</span>
            </div>

            {installation.type === "GENERATOR" ? (
              <>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Geração:</span>
                  <span className="text-sm font-medium">
                    {installation.latestEnergyData?.generation !== undefined && installation.latestEnergyData?.generation !== null
                      ? actualFormatEnergy(installation.latestEnergyData.generation)
                      : "N/A"}
                  </span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Transferência:</span>
                  <span className="text-sm font-medium">
                    {installation.latestEnergyData?.transferred !== undefined && installation.latestEnergyData?.transferred !== null
                      ? actualFormatEnergy(installation.latestEnergyData.transferred)
                      : "N/A"}
                  </span>
                </div>
                
                {installation.latestEnergyData?.period && (
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Período:</span>
                    <span className="text-sm font-medium">{installation.latestEnergyData.period}</span>
                  </div>
                )}
              </>
            ) : (
              <>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Consumo:</span>
                  <span className="text-sm font-medium">
                    {installation.latestEnergyData?.consumption !== undefined && installation.latestEnergyData?.consumption !== null
                      ? actualFormatEnergy(installation.latestEnergyData.consumption)
                      : "N/A"}
                  </span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Recebimento:</span>
                  <span className="text-sm font-medium">
                    {installation.latestEnergyData?.receipt !== undefined && installation.latestEnergyData?.receipt !== null
                      ? actualFormatEnergy(installation.latestEnergyData.receipt)
                      : installation.latestEnergyData?.received !== undefined && installation.latestEnergyData?.received !== null
                        ? actualFormatEnergy(installation.latestEnergyData.received)
                        : "N/A"}
                  </span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Compensação:</span>
                  <span className="text-sm font-medium">
                    {installation.latestEnergyData?.compensation !== undefined && installation.latestEnergyData?.compensation !== null
                      ? actualFormatEnergy(installation.latestEnergyData.compensation)
                      : "N/A"}
                  </span>
                </div>
                
                {installation.latestEnergyData?.period && (
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Período:</span>
                    <span className="text-sm font-medium">{installation.latestEnergyData.period}</span>
                  </div>
                )}
              </>
            )}

            {showDetails && (
              <>
                {installation.type === "CONSUMER" && (
                  <>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Saldo anterior:</span>
                      <span className="text-sm font-medium">{actualFormatEnergy(installation.previousBalance || 0)}</span>
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Saldo a expirar:</span>
                      <span className="text-sm font-medium">{actualFormatEnergy(installation.expiringBalance || 0)}</span>
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Período expiração:</span>
                      <span className="text-sm font-medium">{installation.expirationPeriod || "N/A"}</span>
                    </div>
                  </>
                )}
                
                {installation.quota !== undefined && (
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Quota:</span>
                    <span className="text-sm font-medium">{installation.quota}%</span>
                  </div>
                )}
                
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Criado em:</span>
                  <span className="text-sm font-medium">{actualFormatDate(installation.createdAt)}</span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Último consumo:</span>
                  <span className="text-sm font-medium">{installation.lastConsumptionDate ? actualFormatDate(installation.lastConsumptionDate) : "N/A"}</span>
                </div>
              </>
            )}
          </div>
        </CardContent>
        
        <CardFooter className="pt-2 flex justify-between items-center">
          <div className="flex gap-1">
            {onEdit && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8" 
                      onClick={() => onEdit(installation)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Editar instalação</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
            
            {onViewConsumption && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8" 
                      onClick={() => onViewConsumption(installation)}
                    >
                      <BarChart2 className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Ver consumo/geração</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
            
            {onStatusChange && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          disabled={isUpdatingStatus}
                        >
                          {isUpdatingStatus ? (
                            <span className="animate-spin">
                              <Wrench className="h-4 w-4" />
                            </span>
                          ) : (
                            <Activity className="h-4 w-4" />
                          )}
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Alterar Status</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className={cn(installation.status === InstallationStatus.ACTIVE && "font-medium bg-green-50 dark:bg-green-900/20")}
                          onClick={() => handleStatusChange(InstallationStatus.ACTIVE)}
                        >
                          <span className="w-2 h-2 rounded-full bg-green-500 mr-2"></span>
                          Ativa
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className={cn(installation.status === InstallationStatus.INACTIVE && "font-medium bg-red-50 dark:bg-red-900/20")}
                          onClick={() => handleStatusChange(InstallationStatus.INACTIVE)}
                        >
                          <span className="w-2 h-2 rounded-full bg-red-500 mr-2"></span>
                          Inativa
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className={cn(installation.status === InstallationStatus.PENDING && "font-medium bg-amber-50 dark:bg-amber-900/20")}
                          onClick={() => handleStatusChange(InstallationStatus.PENDING)}
                        >
                          <span className="w-2 h-2 rounded-full bg-amber-500 mr-2"></span>
                          Pendente
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Alterar status</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
          
          <Button 
            variant="ghost" 
            size="sm" 
            className="text-xs" 
            onClick={toggleDetails}
          >
            {showDetails ? "Menos detalhes" : "Mais detalhes"}
          </Button>
        </CardFooter>
      </Card>
    </motion.div>
  );
}
