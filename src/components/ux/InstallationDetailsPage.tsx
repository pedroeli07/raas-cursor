'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useInstallationStore } from '@/store/installationStore';
import { Installation, CemigEnergyBillData, InstallationType, InstallationStatus, Distributor, User, Address } from '@prisma/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertCircle, Info, Zap, ZapOff, Gauge, History, Calendar, BarChart3, LineChart, ArrowUpDown } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DataTable } from '@/components/ui/data-table';
import { ColumnDef } from '@tanstack/react-table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DatePicker, DateRangePicker } from '@/components/ui/date-picker';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { StatCard } from '@/components/ux/StatCard';
import { formatDate, formatEnergy, formatCurrency } from '@/lib/utils/utils';
import { frontendLog as log } from '@/lib/logs/logger';
import { EnergyTimeSeriesChart } from '@/components/charts/EnergyTimeSeriesChart';
import { BalanceHistoryChart } from '@/components/charts/BalanceHistoryChart';
import { ExpiringCreditsChart } from '@/components/charts/ExpiringCreditsChart';

// Extend Installation type to potentially include relations and full history
interface InstallationWithDetails extends Installation {
  distributor?: Distributor | null;
  owner?: User | null;
  address?: Address | null;
  cemigEnergyBills?: CemigEnergyBillData[];
}

interface InstallationDetailsPageProps {
  installationId: string;
}

type MetricKey = 'consumption' | 'generation' | 'received' | 'compensation' | 'transferred';

const availableMetrics: { key: MetricKey; label: string }[] = [
  { key: 'consumption', label: 'Consumo' },
  { key: 'generation', label: 'Geração' },
  { key: 'received', label: 'Recebido' },
  { key: 'compensation', label: 'Compensado' },
  { key: 'transferred', label: 'Transferido' },
];

export function InstallationDetailsPage({ installationId }: InstallationDetailsPageProps) {
  const { 
    selectedInstallation, 
    fetchInstallationById, 
    isLoading, 
    error, 
    setError,
    formatEnergy: storeFormatEnergy,
    formatCurrency: storeFormatCurrency,
  } = useInstallationStore();

  const [installationData, setInstallationData] = useState<InstallationWithDetails | null>(null);
  const [selectedMetrics, setSelectedMetrics] = useState<MetricKey[]>(['consumption', 'generation', 'received']);
  const [dateRange, setDateRange] = useState<{ from: Date | undefined; to: Date | undefined }>({ from: undefined, to: undefined });
  const [tableSearchQuery, setTableSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    log.info('Fetching installation details', { installationId });
    setError(null);
    fetchInstallationById(installationId)
      .then(() => {
        log.info('Successfully fetched installation data', { installationId });
      })
      .catch(err => {
        log.error('Error fetching installation details', { installationId, error: err });
      });
  }, [installationId, fetchInstallationById, setError]);

  useEffect(() => {
    if (selectedInstallation && selectedInstallation.id === installationId) {
      setInstallationData(selectedInstallation as InstallationWithDetails);
      
      // Auto-adjust default metrics based on type
      const defaultMetrics: MetricKey[] = [];
      if (selectedInstallation.type === InstallationType.CONSUMER) {
        defaultMetrics.push('consumption', 'received', 'compensation');
      } else if (selectedInstallation.type === InstallationType.GENERATOR) {
        defaultMetrics.push('generation', 'transferred');
      }
      
      if (selectedMetrics.length <= 3) {
        setSelectedMetrics(defaultMetrics);
      }
    } else {
      setInstallationData(null);
    }
  }, [selectedInstallation, installationId]);

  const handleMetricChange = (metricKey: MetricKey) => {
    setSelectedMetrics(prev => 
      prev.includes(metricKey) 
        ? prev.filter(m => m !== metricKey)
        : [...prev, metricKey]
    );
  };

  const handleResetFilters = () => {
    setDateRange({ from: undefined, to: undefined });
    setTableSearchQuery('');
  };

  // Filter data based on the date range
  const filteredData = useMemo(() => {
    if (!installationData?.cemigEnergyBills) return [];
    
    return installationData.cemigEnergyBills.filter(bill => {
      if (!dateRange.from && !dateRange.to) return true;
      
      const billDate = parseBillPeriod(bill.period);
      if (!billDate) return true;
      
      const isAfterStart = !dateRange.from || billDate >= dateRange.from;
      const isBeforeEnd = !dateRange.to || billDate <= dateRange.to;
      
      return isAfterStart && isBeforeEnd;
    });
  }, [installationData?.cemigEnergyBills, dateRange]);

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

  // Get the most recent bill for overview metrics
  const latestBill = useMemo(() => {
    if (!installationData?.cemigEnergyBills || installationData.cemigEnergyBills.length === 0) return null;
    
    return installationData.cemigEnergyBills.reduce((latest, current) => {
      const latestDate = parseBillPeriod(latest.period);
      const currentDate = parseBillPeriod(current.period);
      
      if (!latestDate || !currentDate) return latest;
      return currentDate > latestDate ? current : latest;
    });
  }, [installationData?.cemigEnergyBills]);

  // Calculate total expiring credits in next 6 months
  const expiringCreditsNext6Months = useMemo(() => {
    if (!installationData?.cemigEnergyBills) return 0;
    
    const now = new Date();
    const sixMonthsLater = new Date(now.getFullYear(), now.getMonth() + 6);
    
    return installationData.cemigEnergyBills.reduce((total, bill) => {
      if (!bill.expiringBalanceAmount || !bill.expiringBalancePeriod) return total;
      
      const expiryDate = parseBillPeriod(bill.expiringBalancePeriod);
      if (!expiryDate) return total;
      
      if (expiryDate > now && expiryDate <= sixMonthsLater) {
        return total + bill.expiringBalanceAmount;
      }
      
      return total;
    }, 0);
  }, [installationData?.cemigEnergyBills]);

  // Calculate consumption or generation trend (percentage change from previous month)
  const calculateTrend = (key: 'consumption' | 'generation'): { value: number, isPositive: boolean } | null => {
    if (!installationData?.cemigEnergyBills || installationData.cemigEnergyBills.length < 2) {
      return null;
    }
    
    const sortedBills = [...installationData.cemigEnergyBills]
      .sort((a, b) => {
        const aDate = parseBillPeriod(a.period);
        const bDate = parseBillPeriod(b.period);
        if (!aDate || !bDate) return 0;
        return bDate.getTime() - aDate.getTime();
      });
    
    const current = sortedBills[0][key] || 0;
    const previous = sortedBills[1][key] || 0;
    
    if (previous === 0) return null;
    
    const percentChange = Math.round(((current - previous) / previous) * 100);
    
    // For consumption, lower is better (negative trend is positive)
    // For generation, higher is better (positive trend is positive)
    const isPositive = key === 'consumption' ? percentChange < 0 : percentChange > 0;
    
    return {
      value: Math.abs(percentChange),
      isPositive
    };
  };

  const energyHistoryColumns = useMemo<ColumnDef<CemigEnergyBillData>[]>(() => [
    { 
      accessorKey: 'period', 
      header: 'Período',
      cell: ({ row }) => <span className="font-medium">{row.getValue('period')}</span>,
    },
    { 
      accessorKey: 'consumption', 
      header: 'Consumo (kWh)', 
      cell: ({ row }) => {
        const value = row.original.consumption;
        return <div className="text-right">{storeFormatEnergy(value ?? 0)}</div>;
      } 
    },
    { 
      accessorKey: 'generation', 
      header: 'Geração (kWh)', 
      cell: ({ row }) => {
        const value = row.original.generation;
        return <div className="text-right">{storeFormatEnergy(value ?? 0)}</div>;
      } 
    },
    { 
      accessorKey: 'received', 
      header: 'Recebido (kWh)', 
      cell: ({ row }) => {
        const value = row.original.received;
        return <div className="text-right">{storeFormatEnergy(value ?? 0)}</div>;
      } 
    },
    { 
      accessorKey: 'compensation', 
      header: 'Compensado (kWh)', 
      cell: ({ row }) => {
        const value = row.original.compensation;
        return <div className="text-right">{storeFormatEnergy(value ?? 0)}</div>;
      } 
    },
    { 
      accessorKey: 'transferred', 
      header: 'Transferido (kWh)', 
      cell: ({ row }) => {
        const value = row.original.transferred;
        return <div className="text-right">{storeFormatEnergy(value ?? 0)}</div>;
      } 
    },
    { 
      accessorKey: 'previousBalance', 
      header: 'Saldo Anterior (kWh)', 
      cell: ({ row }) => {
        const value = row.original.previousBalance;
        return <div className="text-right">{storeFormatEnergy(value ?? 0)}</div>;
      } 
    },
    { 
      accessorKey: 'currentBalance', 
      header: 'Saldo Atual (kWh)', 
      cell: ({ row }) => {
        const value = row.original.currentBalance;
        return <div className="text-right">{storeFormatEnergy(value ?? 0)}</div>;
      } 
    },
    { 
      accessorKey: 'expiringBalanceAmount', 
      header: 'Saldo a Expirar (kWh)', 
      cell: ({ row }) => {
        const value = row.original.expiringBalanceAmount;
        return <div className="text-right">{storeFormatEnergy(value ?? 0)}</div>;
      } 
    },
    { 
      accessorKey: 'expiringBalancePeriod', 
      header: 'Período Expiração',
      cell: ({ row }) => <div>{row.getValue('expiringBalancePeriod') || '-'}</div>
    },
    { 
      accessorKey: 'quota', 
      header: 'Quota (%)', 
      cell: ({ row }) => {
        const value = row.original.quota;
        return <div className="text-right">{value !== null ? `${value}%` : '-'}</div>;
      } 
    },
  ], [storeFormatEnergy]);

  const renderLoadingSkeleton = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <Skeleton className="h-8 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-2/3" />
        </CardContent>
      </Card>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-1/4" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-64 w-full" />
        </CardContent>
      </Card>
    </div>
  );

  const renderContent = () => {
    if (isLoading && !installationData) {
      return renderLoadingSkeleton();
    }

    if (error) {
      return (
        <div className="flex items-center justify-center h-full">
          <div className="text-center p-6 bg-destructive/10 border border-destructive rounded-lg">
            <AlertCircle className="mx-auto h-12 w-12 text-destructive mb-4" />
            <h3 className="text-lg font-semibold text-destructive mb-2">Erro ao carregar dados</h3>
            <p className="text-sm text-destructive/80">{error}</p>
            <Button 
              onClick={() => fetchInstallationById(installationId)} 
              variant="destructive" 
              className="mt-4"
            >
              Tentar Novamente
            </Button>
          </div>
        </div>
      );
    }

    if (!installationData) {
       return <div className="text-center p-10 text-muted-foreground">Nenhuma informação encontrada para esta instalação.</div>;
    }

    const { installationNumber, type, status, owner, distributor, address, cemigEnergyBills = [] } = installationData;
    
    // Get installation type badge styling
    const typeBadgeStyles = type === InstallationType.GENERATOR 
      ? "bg-amber-100 text-amber-800 dark:bg-amber-900/20 dark:text-amber-400" 
      : "bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400";
    
    // Get status badge styling
    const statusBadgeStyles = status === InstallationStatus.ACTIVE 
      ? "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400" 
      : "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400";
    
    // Filter metrics based on installation type
    const relevantMetrics = availableMetrics.filter(metric => {
      if (type === InstallationType.CONSUMER) {
        return ['consumption', 'received', 'compensation'].includes(metric.key);
      } else if (type === InstallationType.GENERATOR) {
        return ['generation', 'transferred'].includes(metric.key);
      }
      return true;
    });

    // Calculate trends for displayed metrics
    const consumptionTrend = type === InstallationType.CONSUMER ? calculateTrend('consumption') : null;
    const generationTrend = type === InstallationType.GENERATOR ? calculateTrend('generation') : null;

    return (
      <div className="space-y-6">
        <Card className="border-primary/20 dark:border-primary/30 shadow-md overflow-hidden">
          <CardHeader className="pb-2">
            <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
              <div>
                <CardTitle className="flex items-center gap-2 text-2xl">
                  <span>Instalação: {installationNumber}</span>
                  <Badge variant="outline" className={typeBadgeStyles}>
                    {type === InstallationType.GENERATOR ? 'Geradora' : 'Consumidora'}
                  </Badge>
                  <Badge variant="outline" className={statusBadgeStyles}>
                    {status === InstallationStatus.ACTIVE ? 'Ativa' : 'Inativa'}
                  </Badge>
                </CardTitle>
                <CardDescription className="mt-1">
                  Análise detalhada e histórico de energia
                </CardDescription>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => window.history.back()}>
                  Voltar
                </Button>
                <Button variant="outline" size="sm">
                  Exportar Dados
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm mt-2">
              <div><strong>Distribuidor:</strong> {distributor?.name || '-'}</div>
              <div><strong>Proprietário:</strong> {owner?.name || owner?.email || '-'}</div>
              <div className="md:col-span-2 lg:col-span-1"><strong>Criada em:</strong> {formatDate(installationData.createdAt)}</div>
              <div className="md:col-span-3"><strong>Endereço:</strong> 
                {address ? `${address.street}, ${address.number}${address.complement ? `, ${address.complement}` : ''} - ${address.neighborhood}, ${address.city}/${address.state} - ${address.zip}` : '-'}
              </div>
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="overview" value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overview" className="flex items-center gap-2">
              <Gauge className="h-4 w-4" />
              <span>Visão Geral</span>
            </TabsTrigger>
            <TabsTrigger value="charts" className="flex items-center gap-2">
              <LineChart className="h-4 w-4" />
              <span>Gráficos</span>
            </TabsTrigger>
            <TabsTrigger value="history" className="flex items-center gap-2">
              <History className="h-4 w-4" />
              <span>Histórico Detalhado</span>
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="overview">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              {type === InstallationType.CONSUMER && (
                <>
                  <StatCard
                    title="Consumo Último Mês"
                    value={storeFormatEnergy(latestBill?.consumption ?? 0)}
                    description={latestBill?.period || 'Sem dados'}
                    icon={<Zap className="h-6 w-6" />}
                    trend={consumptionTrend ? {
                      value: consumptionTrend.value,
                      label: "vs mês anterior",
                      isPositive: consumptionTrend.isPositive
                    } : undefined}
                    className="border-l-4 border-l-blue-500"
                  />
                  <StatCard
                    title="Recebido Último Mês"
                    value={storeFormatEnergy(latestBill?.received ?? 0)}
                    description={latestBill?.period || 'Sem dados'}
                    icon={<ArrowUpDown className="h-6 w-6" />}
                    className="border-l-4 border-l-purple-500"
                  />
                </>
              )}
              
              {type === InstallationType.GENERATOR && (
                <>
                  <StatCard
                    title="Geração Último Mês"
                    value={storeFormatEnergy(latestBill?.generation ?? 0)}
                    description={latestBill?.period || 'Sem dados'}
                    icon={<Zap className="h-6 w-6" />}
                    trend={generationTrend ? {
                      value: generationTrend.value,
                      label: "vs mês anterior",
                      isPositive: generationTrend.isPositive
                    } : undefined}
                    className="border-l-4 border-l-green-500"
                  />
                  <StatCard
                    title="Transferido Último Mês"
                    value={storeFormatEnergy(latestBill?.transferred ?? 0)}
                    description={latestBill?.period || 'Sem dados'}
                    icon={<ArrowUpDown className="h-6 w-6" />}
                    className="border-l-4 border-l-amber-500"
                  />
                </>
              )}
              
              <StatCard
                title="Saldo Atual"
                value={storeFormatEnergy(latestBill?.currentBalance ?? 0)}
                description={latestBill?.period || 'Sem dados'}
                icon={<BarChart3 className="h-6 w-6" />}
                className="border-l-4 border-l-emerald-500"
              />
              
              <StatCard
                title="Créditos a Expirar (6 meses)"
                value={storeFormatEnergy(expiringCreditsNext6Months)}
                description="Próximos 6 meses"
                icon={<Calendar className="h-6 w-6" />}
                className="border-l-4 border-l-rose-500"
              />
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Histórico de Energia</CardTitle>
                  <CardDescription>
                    Visualização dos últimos 6 meses
                  </CardDescription>
                </CardHeader>
                <CardContent className="h-80">
                  <EnergyTimeSeriesChart
                    data={cemigEnergyBills.slice(-6)} // Show last 6 months
                    metrics={type === InstallationType.CONSUMER 
                      ? ['consumption', 'received', 'compensation'] 
                      : ['generation', 'transferred']}
                    height={260}
                  />
                </CardContent>
                <CardFooter className="border-t pt-4 flex justify-end">
                  <Button variant="outline" size="sm" onClick={() => setActiveTab('charts')}>
                    Ver Análise Completa
                  </Button>
                </CardFooter>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Evolução do Saldo</CardTitle>
                  <CardDescription>
                    Saldo anterior e atual ao longo do tempo
                  </CardDescription>
                </CardHeader>
                <CardContent className="h-80">
                  <BalanceHistoryChart
                    data={cemigEnergyBills.slice(-6)} // Show last 6 months
                    height={260}
                  />
                </CardContent>
                <CardFooter className="border-t pt-4 flex justify-end">
                  <Button variant="outline" size="sm" onClick={() => setActiveTab('charts')}>
                    Ver Mais Detalhes
                  </Button>
                </CardFooter>
              </Card>
            </div>
          </TabsContent>
          
          <TabsContent value="charts">
            <div className="space-y-4">
              <Card>
                <CardHeader className="pb-2">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div>
                      <CardTitle>Análise de Energia</CardTitle>
                      <CardDescription>
                        Visualização do histórico de consumo, geração e saldos
                      </CardDescription>
                    </div>
                    
                    <div className="flex flex-col md:flex-row gap-2 items-start md:items-center">
                      <div className="flex gap-2 items-center">
                        <DateRangePicker 
                          date={dateRange}
                          setDate={setDateRange}
                          placeholder="Filtrar por período"
                          className="w-auto md:w-[300px]"
                        />
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={handleResetFilters}
                          disabled={!dateRange.from && !dateRange.to}
                        >
                          <ZapOff className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent className="space-y-8">
                  <div>
                    <h3 className="text-lg font-medium mb-3">Métricas por Período</h3>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mb-4 pb-4 border-b">
                      <div className="font-medium text-sm text-muted-foreground mr-2">Selecione Métricas:</div>
                      {relevantMetrics.map((metric) => (
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
                    
                    <div className="h-80">
                      <EnergyTimeSeriesChart 
                        data={filteredData} 
                        metrics={selectedMetrics}
                        height={310}
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 pt-2">
                    <div>
                      <h3 className="text-lg font-medium mb-3">Evolução do Saldo</h3>
                      <div className="h-72">
                        <BalanceHistoryChart 
                          data={filteredData}
                          height={270}
                        />
                      </div>
                    </div>
                    
                    <div>
                      <h3 className="text-lg font-medium mb-3">Créditos a Expirar</h3>
                      <div className="h-72">
                        <ExpiringCreditsChart 
                          data={filteredData}
                          height={270}
                        />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
          
          <TabsContent value="history">
            <Card>
              <CardHeader className="pb-2">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div>
                    <CardTitle>Histórico Detalhado</CardTitle>
                    <CardDescription>
                      Tabela com todos os dados mensais reportados pela distribuidora
                    </CardDescription>
                  </div>
                  
                  <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-center">
                    <div className="flex gap-2 items-center">
                      <DateRangePicker 
                        date={dateRange}
                        setDate={setDateRange}
                        placeholder="Filtrar por período"
                        className="w-auto sm:w-[300px]"
                      />
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={handleResetFilters}
                        disabled={!dateRange.from && !dateRange.to}
                      >
                        <ZapOff className="h-4 w-4" />
                      </Button>
                    </div>
                    
                    <div className="relative w-full sm:w-auto">
                      <Input
                        placeholder="Buscar"
                        value={tableSearchQuery}
                        onChange={(e) => setTableSearchQuery(e.target.value)}
                        className="sm:w-[200px]"
                      />
                    </div>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent>
                {filteredData.length > 0 ? (
                  <DataTable 
                    columns={energyHistoryColumns} 
                    data={filteredData} 
                    searchKey="period"
                    searchPlaceholder="Buscar por período..."
                  />
                ) : (
                  <div className="text-center p-10 text-muted-foreground">
                    {dateRange.from || dateRange.to 
                      ? "Nenhum histórico de energia encontrado para o período selecionado."
                      : "Nenhum histórico de energia encontrado para esta instalação."}
                  </div>
                )}
              </CardContent>
              
              {cemigEnergyBills.length > 0 && (
                <CardFooter className="border-t pt-4 flex justify-between">
                  <div className="text-sm text-muted-foreground">
                    Mostrando {filteredData.length} de {cemigEnergyBills.length} registros
                  </div>
                  <Button variant="outline" size="sm">
                    Exportar CSV
                  </Button>
                </CardFooter>
              )}
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    );
  };

  return (
    <div className="container mx-auto p-4 md:p-6">
      {renderContent()}
    </div>
  );
} 