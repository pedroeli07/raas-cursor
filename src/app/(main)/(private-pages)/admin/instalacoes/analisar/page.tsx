'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useInstallationStore } from '@/store/installationStore';
import { Installation, CemigEnergyBillData, InstallationType, InstallationStatus, Distributor, User } from '@prisma/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertCircle, Info, Zap, ZapOff, Gauge, History, Calendar, BarChart3, LineChart, ArrowUpDown, Search, Filter, RefreshCw, PlusCircle, MinusCircle, Home, ChevronDown, ChevronUp, SlidersHorizontal } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DateRangePicker } from '@/components/ui/date-picker';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { StatCard } from '@/components/ux/StatCard';
import { formatDate, createWorker } from '@/lib/utils/utils';
import { frontendLog as log } from '@/lib/logs/logger';
import { EnergyTimeSeriesChart } from '@/components/charts/EnergyTimeSeriesChart';
import { BalanceHistoryChart } from '@/components/charts/BalanceHistoryChart';
import { ExpiringCreditsChart } from '@/components/charts/ExpiringCreditsChart';
import { useEnergyDataCalculator } from '@/lib/hooks/useEnergyDataCalculator';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

// Extend Installation type to include relations and energy bills
interface InstallationWithDetails extends Installation {
  distributor?: Distributor | null;
  owner?: User | null;
  cemigEnergyBills?: CemigEnergyBillData[];
}

type MetricKey = 'consumption' | 'generation' | 'received' | 'compensation' | 'transferred';

const availableMetrics: { key: MetricKey; label: string }[] = [
  { key: 'consumption', label: 'Consumo' },
  { key: 'generation', label: 'Geração' },
  { key: 'received', label: 'Recebido' },
  { key: 'compensation', label: 'Compensado' },
  { key: 'transferred', label: 'Transferido' },
];

export default function InstallationsAnalysisPage() {
  const { 
    installations, 
    fetchInstallations,
    fetchInstallationById,
    isLoading, 
    error, 
    formatEnergy: storeFormatEnergy,
    formatCurrency: storeFormatCurrency,
  } = useInstallationStore();

  const [selectedInstallations, setSelectedInstallations] = useState<string[]>([]);
  const [detailedInstallations, setDetailedInstallations] = useState<InstallationWithDetails[]>([]);
  const [selectedMetrics, setSelectedMetrics] = useState<MetricKey[]>(['consumption', 'generation', 'received']);
  const [dateRange, setDateRange] = useState<{ from: Date | undefined; to: Date | undefined }>({ from: undefined, to: undefined });
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('overview');
  const [filterType, setFilterType] = useState<InstallationType | 'ALL'>('ALL');
  const [filterStatus, setFilterStatus] = useState<InstallationStatus | 'ALL'>('ALL');
  const [filterOwner, setFilterOwner] = useState<string>('ALL');
  const [filterDistributor, setFilterDistributor] = useState<string>('ALL');
  const [maxInstallations, setMaxInstallations] = useState(4);
  const [distributorMap, setDistributorMap] = useState<Record<string, string>>({});
  const [ownerMap, setOwnerMap] = useState<Record<string, string>>({});
  const [loadingDetails, setLoadingDetails] = useState(false);
  
  // New state for range filters
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [consumptionMin, setConsumptionMin] = useState<string>('');
  const [consumptionMax, setConsumptionMax] = useState<string>('');
  const [generationMin, setGenerationMin] = useState<string>('');
  const [generationMax, setGenerationMax] = useState<string>('');
  const [receivedMin, setReceivedMin] = useState<string>('');
  const [receivedMax, setReceivedMax] = useState<string>('');
  const [transferredMin, setTransferredMin] = useState<string>('');
  const [transferredMax, setTransferredMax] = useState<string>('');
  const [selectedPeriod, setSelectedPeriod] = useState<string>('');
  
  // Use the energy data calculator hook
  const {
    filteredEnergyData,
    energyStats: stats,
    chartData,
    isProcessing: isProcessingEnergyData,
    error: energyDataError
  } = useEnergyDataCalculator(detailedInstallations, dateRange);
  
  // Extract unique owners and distributors for filter dropdowns
  const owners = useMemo(() => {
    const uniqueOwners = new Map<string, {id: string, name: string}>();
    installations.forEach(installation => {
      if (installation.ownerId && !uniqueOwners.has(installation.ownerId)) {
        // Store owner ID and name (or ID as fallback if name not available)
        uniqueOwners.set(installation.ownerId, {
          id: installation.ownerId,
          name: ownerMap[installation.ownerId] || installation.ownerId
        });
      }
    });
    return Array.from(uniqueOwners.values());
  }, [installations, ownerMap]);
  
  const distributors = useMemo(() => {
    const uniqueDistributors = new Set<string>();
    installations.forEach(installation => {
      if (installation.distributorId) {
        uniqueDistributors.add(installation.distributorId);
      }
    });
    return Array.from(uniqueDistributors);
  }, [installations]);

  // Filter installations based on all criteria
  const filteredInstallations = useMemo(() => {
    return installations.filter(installation => {
      // Filter by type
      if (filterType !== 'ALL' && installation.type !== filterType) return false;
      
      // Filter by status
      if (filterStatus !== 'ALL' && installation.status !== filterStatus) return false;
      
      // Filter by owner
      if (filterOwner !== 'ALL' && installation.ownerId !== filterOwner) return false;
      
      // Filter by distributor
      if (filterDistributor !== 'ALL' && installation.distributorId !== filterDistributor) return false;
      
      // Filter by search query (installation number)
      if (searchQuery && !installation.installationNumber.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      
      return true;
    });
  }, [installations, filterType, filterStatus, filterOwner, filterDistributor, searchQuery]);

  // Toggle installation selection
  const toggleInstallationSelection = (installationId: string) => {
    setSelectedInstallations(prev => 
      prev.includes(installationId)
        ? prev.filter(id => id !== installationId)
        : [...prev, installationId]
    );
  };

  const handleMetricChange = (metricKey: MetricKey) => {
    setSelectedMetrics(prev => 
      prev.includes(metricKey) 
        ? prev.filter(m => m !== metricKey)
        : [...prev, metricKey]
    );
  };

  const handleResetFilters = () => {
    log.info('Resetting all filters');
    setDateRange({ from: undefined, to: undefined });
    setSearchQuery('');
    setFilterType('ALL');
    setFilterStatus('ALL');
    setFilterOwner('ALL');
    setFilterDistributor('ALL');
    // Reset range filters
    setConsumptionMin('');
    setConsumptionMax('');
    setGenerationMin('');
    setGenerationMax('');
    setReceivedMin('');
    setReceivedMax('');
    setTransferredMin('');
    setTransferredMax('');
    setSelectedPeriod('');
  };

  const increaseMaxInstallations = () => {
    setMaxInstallations(prev => prev + 2);
  };

  const decreaseMaxInstallations = () => {
    setMaxInstallations(prev => Math.max(2, prev - 2));
  };

  // Helper function to parse MM/YYYY format to Date
  function parseBillPeriod(period: string): Date | null {
    try {
      const [month, year] = period.split('/').map(Number);
      if (isNaN(month) || isNaN(year)) return null;
      return new Date(year, month - 1);
    } catch {
      return null;
    }
  }

  // Build API URL with all filters
  const buildApiUrlWithFilters = () => {
    const url = new URL('/api/installations', window.location.origin);
    
    // Add range filter parameters if they exist
    if (consumptionMin) url.searchParams.append('consumption_min', consumptionMin);
    if (consumptionMax) url.searchParams.append('consumption_max', consumptionMax);
    if (generationMin) url.searchParams.append('generation_min', generationMin);
    if (generationMax) url.searchParams.append('generation_max', generationMax);
    if (receivedMin) url.searchParams.append('received_min', receivedMin);
    if (receivedMax) url.searchParams.append('received_max', receivedMax);
    if (transferredMin) url.searchParams.append('transferred_min', transferredMin);
    if (transferredMax) url.searchParams.append('transferred_max', transferredMax);
    if (selectedPeriod) url.searchParams.append('period', selectedPeriod);
    
    log.debug('Built API URL with filters', { 
      url: url.toString(),
      params: Object.fromEntries(url.searchParams.entries())
    });
    
    return url.toString();
  };

  // Fetch all installations on component mount
  useEffect(() => {
    log.info('Fetching installations for analysis page');
    const fetchWithFilters = async () => {
      try {
        // Check if we have any range filters applied
        const hasRangeFilters = !!(
          consumptionMin || consumptionMax || generationMin || generationMax ||
          receivedMin || receivedMax || transferredMin || transferredMax || selectedPeriod
        );
        
        if (hasRangeFilters) {
          log.info('Fetching installations with range filters', {
            consumptionMin, consumptionMax,
            generationMin, generationMax,
            receivedMin, receivedMax,
            transferredMin, transferredMax,
            period: selectedPeriod
          });
          
          // Use the custom URL with filters
          const response = await fetch(buildApiUrlWithFilters());
          
          if (!response.ok) {
            const errorData = await response.text();
            log.error('Error fetching installations with filters', { 
              status: response.status, 
              statusText: response.statusText,
              error: errorData
            });
            throw new Error(`API error: ${response.status} ${response.statusText}`);
          }
          
          const data = await response.json();
          log.info('Successfully fetched filtered installations', { 
            count: data.installations.length,
            filters: {
              consumptionMin, consumptionMax,
              generationMin, generationMax,
              receivedMin, receivedMax,
              transferredMin, transferredMax
            }
          });
          
          // Update the store with filtered installations
          useInstallationStore.setState({ 
            installations: data.installations,
            isLoading: false,
            error: null
          });
        } else {
          // Use the standard fetchInstallations method from the store
          await fetchInstallations();
          log.info('Successfully fetched all installations without filters');
        }
      } catch (err) {
        log.error('Error fetching installations', { error: err });
        useInstallationStore.setState({ 
          isLoading: false,
          error: err instanceof Error ? err.message : 'Unknown error fetching installations'
        });
      }
    };
    
    fetchWithFilters();
  }, [fetchInstallations, consumptionMin, consumptionMax, generationMin, generationMax, 
      receivedMin, receivedMax, transferredMin, transferredMax, selectedPeriod]);

  // Select first N installations automatically if none are selected
  useEffect(() => {
    if (selectedInstallations.length === 0 && filteredInstallations.length > 0) {
      setSelectedInstallations(
        filteredInstallations.slice(0, Math.min(4, filteredInstallations.length)).map(i => i.id)
      );
    }
  }, [filteredInstallations, selectedInstallations.length]);

  // Fetch detailed data for selected installations
  useEffect(() => {
    async function loadDetailedInstallations() {
      if (selectedInstallations.length === 0) {
        setDetailedInstallations([]);
        return;
      }

      setLoadingDetails(true);
      const detailedResults: InstallationWithDetails[] = [];
      const distributors: Record<string, string> = {};
      const owners: Record<string, string> = {};

      try {
        for (const id of selectedInstallations) {
          const response = await fetch(`/api/installations/${id}`);
          if (response.ok) {
            const data = await response.json();
            detailedResults.push(data);
            
            // Map distributor IDs to names
            if (data.distributor) {
              distributors[data.distributorId] = data.distributor.name;
            }
            
            // Map owner IDs to names
            if (data.owner) {
              owners[data.ownerId] = data.owner.name || data.owner.email;
            }
          }
        }

        setDetailedInstallations(detailedResults);
        setDistributorMap(distributors);
        setOwnerMap(owners);
      } catch (error) {
        log.error('Error fetching installation details', { error });
      } finally {
        setLoadingDetails(false);
      }
    }

    loadDetailedInstallations();
  }, [selectedInstallations]);

  // Move expensive calculations to a worker for better performance
  useEffect(() => {
    // Use Worker for expensive calculations if browser supports it
    if (typeof window !== 'undefined' && window.Worker) {
      // This effect would create and use a web worker for heavy calculations
      const prepareDataInWorker = async () => {
        if (!detailedInstallations.length) return;
        
        // Create a worker script dynamically
        const workerCode = `
          self.onmessage = function(e) {
            const { installations, dateRange } = e.data;
            
            // Process data...
            const processedData = processInstallationsData(installations, dateRange);
            
            // Send back the results
            self.postMessage({ processedData });
          }
          
          function processInstallationsData(installations, dateRange) {
            // Collect all energy bills from all selected installations
            let allBills = [];
            
            installations.forEach(installation => {
              if (installation.cemigEnergyBills && installation.cemigEnergyBills.length > 0) {
                const bills = installation.cemigEnergyBills.map(bill => ({
                  ...bill,
                  installationNumber: installation.installationNumber,
                  installationType: installation.type
                }));
                allBills = [...allBills, ...bills];
              }
            });
            
            // Process, filter and return
            return allBills;
          }
        `;
        
        const blob = new Blob([workerCode], { type: 'application/javascript' });
        const workerUrl = URL.createObjectURL(blob);
        
        try {
          const worker = new Worker(workerUrl);
          
          // Set up message handlers
          worker.onmessage = (e) => {
            const { processedData } = e.data;
            // Use processed data...
            
            // Clean up
            worker.terminate();
            URL.revokeObjectURL(workerUrl);
          };
          
          // Send data to worker
          worker.postMessage({
            installations: detailedInstallations,
            dateRange: dateRange
          });
        } catch (error) {
          console.error('Error creating worker:', error);
          // Fallback to synchronous processing
        }
      };
      
      // Only run worker if we have detailed installations
      if (detailedInstallations.length > 0) {
        prepareDataInWorker();
      }
    }
  }, [detailedInstallations, dateRange]);

  const renderLoadingSkeleton = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Skeleton className="h-[300px] w-full" />
        <Skeleton className="h-[300px] w-full" />
      </div>
    </div>
  );

  const renderInstallationCard = (installation: Installation) => {
    const isSelected = selectedInstallations.includes(installation.id);
    const distributorName = distributorMap[installation.distributorId] || installation.distributorId || '-';
    const ownerName = ownerMap[installation.ownerId || ''] || installation.ownerId || '-';
    
    return (
      <Card 
        key={installation.id} 
        className={`cursor-pointer transition-all hover:shadow-md ${isSelected ? 'border-primary/50 shadow-sm' : 'border-muted'}`}
        onClick={() => toggleInstallationSelection(installation.id)}
      >
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <CardTitle className="text-base flex items-center gap-2">
                {installation.installationNumber}
                <Badge variant="outline" className={
                  installation.type === InstallationType.GENERATOR 
                    ? "bg-amber-100 text-amber-800 dark:bg-amber-900/20 dark:text-amber-400" 
                    : "bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400"
                }>
                  {installation.type === InstallationType.GENERATOR ? 'Geradora' : 'Consumidora'}
                </Badge>
              </CardTitle>
              <CardDescription>{installation.addressId}</CardDescription>
            </div>
            <Checkbox 
              checked={isSelected} 
              onCheckedChange={() => toggleInstallationSelection(installation.id)} 
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </CardHeader>
        <CardContent className="text-sm">
          <div className="grid grid-cols-2 gap-1">
            <div><strong>Distribuidor:</strong> {distributorName}</div>
            <div><strong>Proprietário:</strong> {ownerName}</div>
            <div><strong>Status:</strong> 
              <Badge variant="outline" className={
                installation.status === InstallationStatus.ACTIVE 
                  ? "ml-1 bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400" 
                  : "ml-1 bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400"
              }>
                {installation.status === InstallationStatus.ACTIVE ? 'Ativa' : 'Inativa'}
              </Badge>
            </div>
            <div><strong>Criada em:</strong> {formatDate(installation.createdAt)}</div>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="container mx-auto p-4 md:p-6">
      <div className="space-y-6">
        <Card className="border-primary/20 dark:border-primary/30 shadow-md">
          <CardHeader className="pb-2">
            <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
              <div>
                <CardTitle className="text-2xl">Análise de Instalações</CardTitle>
                <CardDescription>
                  Compare múltiplas instalações e analise métricas de energia
                </CardDescription>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" onClick={() => fetchInstallations()}>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Atualizar
                </Button>
              </div>
            </div>
          </CardHeader>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="flex items-center space-x-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por número de instalação"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <Select
              value={filterType}
              onValueChange={(value) => setFilterType(value as InstallationType | 'ALL')}
            >
              <SelectTrigger>
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Todos os tipos</SelectItem>
                <SelectItem value={InstallationType.CONSUMER}>Consumidora</SelectItem>
                <SelectItem value={InstallationType.GENERATOR}>Geradora</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={filterStatus}
              onValueChange={(value) => setFilterStatus(value as InstallationStatus | 'ALL')}
            >
              <SelectTrigger>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Todos os status</SelectItem>
                <SelectItem value={InstallationStatus.ACTIVE}>Ativa</SelectItem>
                <SelectItem value={InstallationStatus.INACTIVE}>Inativa</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex justify-between gap-2">
            <DateRangePicker
              date={dateRange}
              setDate={setDateRange}
              placeholder="Filtrar por período"
              className="flex-1"
            />
            <Button
              variant="ghost"
              size="icon"
              onClick={handleResetFilters}
              title="Limpar filtros"
            >
              <ZapOff className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <Select
            value={filterOwner}
            onValueChange={setFilterOwner}
          >
            <SelectTrigger>
              <SelectValue placeholder="Filtrar por proprietário" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Todos os proprietários</SelectItem>
              {owners.map(owner => (
                <SelectItem key={owner.id} value={owner.id}>{owner.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={filterDistributor}
            onValueChange={setFilterDistributor}
          >
            <SelectTrigger>
              <SelectValue placeholder="Filtrar por distribuidora" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Todas as distribuidoras</SelectItem>
              {distributors.map(distributor => (
                <SelectItem key={distributor} value={distributor}>
                  {distributorMap[distributor] || distributor}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Advanced Range Filters Section */}
        <Collapsible 
          open={showAdvancedFilters} 
          onOpenChange={setShowAdvancedFilters}
          className="mb-6 border p-4 rounded-lg"
        >
          <CollapsibleTrigger asChild>
            <Button variant="ghost" className="flex w-full justify-between items-center p-2">
              <div className="flex items-center">
                <SlidersHorizontal className="h-4 w-4 mr-2" />
                <span>Filtros Avançados por Faixa de Valores</span>
              </div>
              {showAdvancedFilters ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-4 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="period">Período Específico (MM/AAAA)</Label>
                <Input
                  id="period"
                  placeholder="Ex: 10/2023"
                  value={selectedPeriod}
                  onChange={(e) => setSelectedPeriod(e.target.value)}
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="consumption-min">Consumo Mínimo (kWh)</Label>
                <Input
                  id="consumption-min"
                  type="number"
                  min="0"
                  placeholder="Valor mínimo"
                  value={consumptionMin}
                  onChange={(e) => setConsumptionMin(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="consumption-max">Consumo Máximo (kWh)</Label>
                <Input
                  id="consumption-max"
                  type="number"
                  min="0"
                  placeholder="Valor máximo"
                  value={consumptionMax}
                  onChange={(e) => setConsumptionMax(e.target.value)}
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="generation-min">Geração Mínima (kWh)</Label>
                <Input
                  id="generation-min"
                  type="number"
                  min="0"
                  placeholder="Valor mínimo"
                  value={generationMin}
                  onChange={(e) => setGenerationMin(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="generation-max">Geração Máxima (kWh)</Label>
                <Input
                  id="generation-max"
                  type="number"
                  min="0"
                  placeholder="Valor máximo"
                  value={generationMax}
                  onChange={(e) => setGenerationMax(e.target.value)}
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="received-min">Recebimento Mínimo (kWh)</Label>
                <Input
                  id="received-min"
                  type="number"
                  min="0"
                  placeholder="Valor mínimo"
                  value={receivedMin}
                  onChange={(e) => setReceivedMin(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="received-max">Recebimento Máximo (kWh)</Label>
                <Input
                  id="received-max"
                  type="number"
                  min="0"
                  placeholder="Valor máximo"
                  value={receivedMax}
                  onChange={(e) => setReceivedMax(e.target.value)}
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="transferred-min">Transferência Mínima (kWh)</Label>
                <Input
                  id="transferred-min"
                  type="number"
                  min="0"
                  placeholder="Valor mínimo"
                  value={transferredMin}
                  onChange={(e) => setTransferredMin(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="transferred-max">Transferência Máxima (kWh)</Label>
                <Input
                  id="transferred-max"
                  type="number"
                  min="0"
                  placeholder="Valor máximo"
                  value={transferredMax}
                  onChange={(e) => setTransferredMax(e.target.value)}
                />
              </div>
            </div>
            <div className="flex justify-end space-x-2 pt-2">
              <Button 
                variant="outline" 
                onClick={handleResetFilters}
              >
                Limpar Filtros
              </Button>
              <Button 
                onClick={() => {
                  log.info('Applying advanced filters', { 
                    consumptionMin, consumptionMax,
                    generationMin, generationMax,
                    receivedMin, receivedMax,
                    transferredMin, transferredMax,
                    period: selectedPeriod
                  });
                  
                  // The useEffect will handle the fetching based on the state changes
                }}
              >
                Aplicar Filtros
              </Button>
            </div>
          </CollapsibleContent>
        </Collapsible>

        {isLoading ? (
          renderLoadingSkeleton()
        ) : error ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-center p-6 bg-destructive/10 border border-destructive rounded-lg">
              <AlertCircle className="mx-auto h-12 w-12 text-destructive mb-4" />
              <h3 className="text-lg font-semibold text-destructive mb-2">Erro ao carregar dados</h3>
              <p className="text-sm text-destructive/80">{error}</p>
              <Button 
                onClick={() => fetchInstallations()} 
                variant="destructive" 
                className="mt-4"
              >
                Tentar Novamente
              </Button>
            </div>
          </div>
        ) : (
          <>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">
                Mostrando {filteredInstallations.length} instalações
              </h2>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={decreaseMaxInstallations}
                  disabled={maxInstallations <= 2}
                  title="Mostrar menos instalações"
                >
                  <MinusCircle className="h-4 w-4" />
                </Button>
                <span className="mx-2">Mostrar: {maxInstallations}</span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={increaseMaxInstallations}
                  title="Mostrar mais instalações"
                >
                  <PlusCircle className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              {filteredInstallations.slice(0, maxInstallations).map(installation => 
                renderInstallationCard(installation)
              )}
            </div>

            {selectedInstallations.length > 0 ? (
              loadingDetails ? (
                <div className="p-12">
                  {renderLoadingSkeleton()}
                </div>
              ) : (
                <Tabs defaultValue="overview" value={activeTab} onValueChange={setActiveTab} className="w-full">
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="overview" className="flex items-center gap-2">
                      <Gauge className="h-4 w-4" />
                      <span>Visão Geral</span>
                    </TabsTrigger>
                    <TabsTrigger value="charts" className="flex items-center gap-2">
                      <LineChart className="h-4 w-4" />
                      <span>Gráficos Comparativos</span>
                    </TabsTrigger>
                    <TabsTrigger value="metrics" className="flex items-center gap-2">
                      <BarChart3 className="h-4 w-4" />
                      <span>Métricas Avançadas</span>
                    </TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="overview">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                      <StatCard
                        title="Instalações Selecionadas"
                        value={selectedInstallations.length.toString()}
                        description="Total de instalações"
                        icon={<Home className="h-6 w-6" />}
                        className="border-l-4 border-l-blue-500"
                      />
                      
                      <StatCard
                        title="Consumo Total"
                        value={storeFormatEnergy(stats.totalConsumption)}
                        description="Último mês"
                        icon={<Zap className="h-6 w-6" />}
                        className="border-l-4 border-l-purple-500"
                      />
                      
                      <StatCard
                        title="Geração Total"
                        value={storeFormatEnergy(stats.totalGeneration)}
                        description="Último mês"
                        icon={<Zap className="h-6 w-6" />}
                        className="border-l-4 border-l-green-500"
                      />
                      
                      <StatCard
                        title="Saldo Médio por Instalação"
                        value={storeFormatEnergy(stats.totalConsumption / Math.max(1, stats.installationCount))}
                        description="Consumo médio"
                        icon={<ArrowUpDown className="h-6 w-6" />}
                        className="border-l-4 border-l-amber-500"
                      />
                    </div>
                    
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-base">Comparativo de Energia</CardTitle>
                          <CardDescription>
                            Visualização das instalações selecionadas
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="h-80">
                          {detailedInstallations.length > 0 ? (
                            <EnergyTimeSeriesChart
                              data={chartData}
                              metrics={['consumption', 'generation']}
                              height={260}
                            />
                          ) : (
                            <div className="flex items-center justify-center h-full text-muted-foreground">
                              Selecione instalações para visualizar gráficos
                            </div>
                          )}
                        </CardContent>
                      </Card>
                      
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-base">Saldo Acumulado</CardTitle>
                          <CardDescription>
                            Evolução do saldo de créditos
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="h-80">
                          {detailedInstallations.length > 0 ? (
                            <BalanceHistoryChart
                              data={chartData}
                              height={260}
                            />
                          ) : (
                            <div className="flex items-center justify-center h-full text-muted-foreground">
                              Selecione instalações para visualizar gráficos
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="charts">
                    <Card>
                      <CardHeader className="pb-2">
                        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                          <div>
                            <CardTitle>Análise Comparativa</CardTitle>
                            <CardDescription>
                              Compare métricas entre as instalações selecionadas
                            </CardDescription>
                          </div>
                          
                          <div className="flex flex-wrap items-center gap-4">
                            <div className="font-medium text-sm text-muted-foreground">Selecione Métricas:</div>
                            {availableMetrics.map((metric) => (
                              <div key={metric.key} className="flex items-center space-x-2">
                                <Checkbox
                                  id={`metric-${metric.key}`}
                                  checked={selectedMetrics.includes(metric.key)}
                                  onCheckedChange={() => handleMetricChange(metric.key)}
                                />
                                <Label htmlFor={`metric-${metric.key}`} className="text-sm font-medium">
                                  {metric.label}
                                </Label>
                              </div>
                            ))}
                          </div>
                        </div>
                      </CardHeader>
                      
                      <CardContent className="space-y-8">
                        <div className="h-[400px]">
                          {detailedInstallations.length > 0 ? (
                            <EnergyTimeSeriesChart 
                              data={chartData}
                              metrics={selectedMetrics}
                              height={380}
                            />
                          ) : (
                            <div className="flex items-center justify-center h-full text-muted-foreground">
                              Selecione instalações para visualizar gráficos
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>
                  
                  <TabsContent value="metrics">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-base">Eficiência Energética</CardTitle>
                          <CardDescription>
                            Análise de desempenho por instalação
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="h-[400px]">
                          {detailedInstallations.length > 0 ? (
                            <div className="space-y-4">
                              {detailedInstallations.map(installation => (
                                <div key={installation.id} className="p-4 border rounded-md">
                                  <div className="font-medium">{installation.installationNumber}</div>
                                  <div className="flex justify-between text-sm mt-2">
                                    <span>Eficiência:</span>
                                    <span>{storeFormatEnergy(
                                      installation.type === InstallationType.GENERATOR 
                                        ? (installation.cemigEnergyBills?.[0]?.generation || 0) 
                                        : (installation.cemigEnergyBills?.[0]?.consumption || 0)
                                    )}</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="flex items-center justify-center h-full text-muted-foreground">
                              Selecione instalações para visualizar análises
                            </div>
                          )}
                        </CardContent>
                      </Card>
                      
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-base">Créditos a Expirar</CardTitle>
                          <CardDescription>
                            Análise de créditos com expiração próxima
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="h-[400px]">
                          {detailedInstallations.length > 0 ? (
                            <ExpiringCreditsChart
                              data={chartData}
                              height={380}
                            />
                          ) : (
                            <div className="flex items-center justify-center h-full text-muted-foreground">
                              Selecione instalações para visualizar gráficos
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    </div>
                  </TabsContent>
                </Tabs>
              )
            ) : (
              <div className="text-center p-10 text-muted-foreground">
                Selecione uma ou mais instalações para visualizar análises comparativas.
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
