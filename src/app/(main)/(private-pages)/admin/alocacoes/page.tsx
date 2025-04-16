'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { toast } from 'sonner';
import { Toaster } from '@/components/ui/toaster';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { DataTable } from '@/components/ui/data-table';
import { ColumnDef } from '@tanstack/react-table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ConfirmAlert } from '@/components/ui/alert-dialog-custom';
import { motion, AnimatePresence } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import { ViewToggle, ViewMode } from '@/components/ui/view-toggle';
import { AlertCircle, MoreHorizontal, Edit, Trash2, PlusCircle, RefreshCw, Zap, Home, User, Building, Filter, X, Share } from 'lucide-react';
import { useAllocationStore } from '@/store/allocationStore';
import { useInstallationStore } from '@/store/installationStore';
import { frontendLog } from '@/lib/logs/logger';
import { formatPercentage } from '@/lib/utils/utils';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AllocationCard } from '@/components/ux/AllocationCard';
import { InstallationType } from '@prisma/client';

// Zod schema for allocation form validation
const allocationSchema = z.object({
  generatorId: z.string().min(1, { message: 'Instalação geradora é obrigatória' }),
  consumerId: z.string().min(1, { message: 'Instalação consumidora é obrigatória' }),
  quota: z.number().min(0.01, { message: 'Quota deve ser maior que 0%' }).max(100, { message: 'Quota não pode exceder 100%' }),
});

type AllocationFormValues = z.infer<typeof allocationSchema>;

export type Allocation = {
  id: string;
  generatorId: string;
  consumerId: string;
  quota: number;
  generator: {
    id: string;
    installationNumber: string;
    owner: {
      id: string;
      name: string | null;
      email: string;
    };
    distributor: {
      id: string;
      name: string;
    };
  };
  consumer: {
    id: string;
    installationNumber: string;
    owner: {
      id: string;
      name: string | null;
      email: string;
    };
    distributor: {
      id: string;
      name: string;
    };
  };
  createdAt: string;
  updatedAt: string;
};

// Animation variants for card view
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.05 }
  },
  exit: {
    opacity: 0,
    transition: { staggerChildren: 0.03, staggerDirection: -1 }
  }
};

export default function AllocationsPage() {
  const [viewMode, setViewMode] = useState<ViewMode>("table");
  const [open, setOpen] = useState(false);
  const [editingAllocation, setEditingAllocation] = useState<Allocation | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Allocation | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [generatorFilter, setGeneratorFilter] = useState<string>('');
  const [consumerFilter, setConsumerFilter] = useState<string>('');
  const [distributorFilter, setDistributorFilter] = useState<string>('');
  const [ownerFilter, setOwnerFilter] = useState<string>('');

  const {
    allocations,
    isLoading,
    error,
    fetchAllocations,
    createAllocation,
    updateAllocation,
    deleteAllocation,
  } = useAllocationStore();

  const {
    installations,
    isLoading: loadingInstallations,
    fetchInstallations,
  } = useInstallationStore();

  const form = useForm<AllocationFormValues>({
    resolver: zodResolver(allocationSchema),
    defaultValues: {
      generatorId: '',
      consumerId: '',
      quota: 100,
    },
  });

  useEffect(() => {
    fetchAllocations();
    fetchInstallations();
  }, [fetchAllocations, fetchInstallations]);

  useEffect(() => {
    if (editingAllocation) {
      form.reset({
        generatorId: editingAllocation.generatorId,
        consumerId: editingAllocation.consumerId,
        quota: editingAllocation.quota,
      });
    } else {
      form.reset({
        generatorId: '',
        consumerId: '',
        quota: 100,
      });
    }
  }, [editingAllocation, form]);

  // Memoized lists of generator and consumer installations
  const generatorInstallations = useMemo(() => {
    return installations.filter(installation => installation.type === InstallationType.GENERATOR);
  }, [installations]);

  const consumerInstallations = useMemo(() => {
    return installations.filter(installation => installation.type === InstallationType.CONSUMER);
  }, [installations]);

  // Get unique distributors and owners from installations for filtering
  const distributors = useMemo(() => {
    const distributorMap = new Map();
    installations.forEach(installation => {
      if (installation.distributorId) {
        distributorMap.set(installation.distributorId, installation.distributor);
      }
    });
    return Array.from(distributorMap.values());
  }, [installations]);

  const owners = useMemo(() => {
    const ownerMap = new Map();
    installations.forEach(installation => {
      if (installation.ownerId) {
        ownerMap.set(installation.ownerId, installation.owner);
      }
    });
    return Array.from(ownerMap.values());
  }, [installations]);

  // Apply filters to allocations
  const filteredAllocations = useMemo(() => {
    if (!allocations) return [];
    
    return allocations.filter((allocation) => {
      // Search text filter
      if (searchText) {
        const searchLower = searchText.toLowerCase();
        const generatorNumber = allocation.generator?.installationNumber?.toLowerCase() || '';
        const consumerNumber = allocation.consumer?.installationNumber?.toLowerCase() || '';
        const generatorOwner = allocation.generator?.owner?.name?.toLowerCase() || allocation.generator?.owner?.email?.toLowerCase() || '';
        const consumerOwner = allocation.consumer?.owner?.name?.toLowerCase() || allocation.consumer?.owner?.email?.toLowerCase() || '';
        const generatorDistributor = allocation.generator?.distributor?.name?.toLowerCase() || '';
        const consumerDistributor = allocation.consumer?.distributor?.name?.toLowerCase() || '';
        
        if (!generatorNumber.includes(searchLower) && 
            !consumerNumber.includes(searchLower) && 
            !generatorOwner.includes(searchLower) && 
            !consumerOwner.includes(searchLower) &&
            !generatorDistributor.includes(searchLower) &&
            !consumerDistributor.includes(searchLower)) {
          return false;
        }
      }
      
      // Generator filter
      if (generatorFilter && allocation.generatorId !== generatorFilter) {
        return false;
      }
      
      // Consumer filter
      if (consumerFilter && allocation.consumerId !== consumerFilter) {
        return false;
      }
      
      // Distributor filter (match either generator or consumer distributor)
      if (distributorFilter && 
          allocation.generator?.distributor?.id !== distributorFilter && 
          allocation.consumer?.distributor?.id !== distributorFilter) {
        return false;
      }
      
      // Owner filter (match either generator or consumer owner)
      if (ownerFilter && 
          allocation.generator?.owner?.id !== ownerFilter && 
          allocation.consumer?.owner?.id !== ownerFilter) {
        return false;
      }
      
      return true;
    });
  }, [allocations, searchText, generatorFilter, consumerFilter, distributorFilter, ownerFilter]);

  // Clear all filters
  const clearFilters = () => {
    setSearchText('');
    setGeneratorFilter('');
    setConsumerFilter('');
    setDistributorFilter('');
    setOwnerFilter('');
  };

  const onSubmit = async (values: AllocationFormValues) => {
    try {
      setIsSubmitting(true);
      
      if (editingAllocation) {
        // Update existing allocation
        await updateAllocation(editingAllocation.id, {
          generatorId: values.generatorId,
          consumerId: values.consumerId,
          quota: values.quota,
        });
        
        toast({
          title: 'Alocação atualizada',
          description: 'A alocação foi atualizada com sucesso.',
          variant: 'success',
        });
      } else {
        // Create new allocation
        await createAllocation({
          generatorId: values.generatorId,
          consumerId: values.consumerId,
          quota: values.quota,
        });
        
        toast({
          title: 'Alocação criada',
          description: 'A nova alocação foi criada com sucesso.',
          variant: 'success',
        });
      }
      
      setOpen(false);
      setEditingAllocation(null);
    } catch (error) {
      frontendLog.error('Error submitting allocation form:', error);
      toast({
        title: 'Erro',
        description: error instanceof Error ? error.message : 'Ocorreu um erro ao processar a alocação.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteAllocation = async () => {
    if (!confirmDelete) return;
    
    try {
      setIsSubmitting(true);
      await deleteAllocation(confirmDelete.id);
      
      toast({
        title: 'Alocação excluída',
        description: 'A alocação foi excluída com sucesso.',
        variant: 'success',
      });
      
      setConfirmDelete(null);
    } catch (error) {
      frontendLog.error('Error deleting allocation:', error);
      toast({
        title: 'Erro',
        description: error instanceof Error ? error.message : 'Ocorreu um erro ao excluir a alocação.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRefreshClick = () => {
    fetchAllocations();
  };

  const columns = useMemo<ColumnDef<Allocation>[]>(() => [
    {
      accessorKey: 'generator.installationNumber',
      header: 'Instalação Geradora',
      cell: ({ row }) => (
        <div className="flex items-center">
          <Zap className="h-4 w-4 mr-2 text-success" />
          <span>{row.original.generator?.installationNumber || 'N/A'}</span>
        </div>
      ),
    },
    {
      accessorKey: 'consumer.installationNumber',
      header: 'Instalação Consumidora',
      cell: ({ row }) => (
        <div className="flex items-center">
          <Home className="h-4 w-4 mr-2 text-info" />
          <span>{row.original.consumer?.installationNumber || 'N/A'}</span>
        </div>
      ),
    },
    {
      accessorKey: 'quota',
      header: 'Quota (%)',
      cell: ({ row }) => (
        <Badge variant="outline" className="font-mono">
          {formatPercentage(row.getValue('quota'))}
        </Badge>
      ),
    },
    {
      accessorKey: 'generator.owner.name',
      header: 'Proprietário (Gerador)',
      cell: ({ row }) => (
        <div className="flex items-center">
          <User className="h-4 w-4 mr-2 text-muted-foreground" />
          <span>{row.original.generator?.owner?.name || row.original.generator?.owner?.email || 'N/A'}</span>
        </div>
      ),
    },
    {
      accessorKey: 'consumer.owner.name',
      header: 'Proprietário (Consumidor)',
      cell: ({ row }) => (
        <div className="flex items-center">
          <User className="h-4 w-4 mr-2 text-muted-foreground" />
          <span>{row.original.consumer?.owner?.name || row.original.consumer?.owner?.email || 'N/A'}</span>
        </div>
      ),
    },
    {
      id: 'actions',
      cell: ({ row }) => {
        const allocation = row.original;
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <span className="sr-only">Abrir menu</span>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Ações</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => {
                setEditingAllocation(allocation);
                setOpen(true);
              }}>
                <Edit className="mr-2 h-4 w-4" />
                <span>Editar</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setConfirmDelete(allocation)} className="text-destructive">
                <Trash2 className="mr-2 h-4 w-4" />
                <span>Excluir</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ], []);

  return (
    <div className="container mx-auto p-6 space-y-6">
      <Card className="border-primary/20 dark:border-primary/30 shadow-md">
        <CardHeader className="pb-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <CardTitle>Gerenciamento de Alocações</CardTitle>
              <CardDescription>Cadastre e gerencie alocações de energia entre instalações geradoras e consumidoras.</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <AlertCircle className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Buscar alocações..."
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  className="pl-8 w-[260px] lg:w-[320px] border border-primary/40 focus:border-primary/90 hover:border-primary/40 hover:bg-primary/10 transition-all"
                />
              </div>
              <Button variant="outline" size="icon" onClick={handleRefreshClick} disabled={isLoading}>
                <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
              </Button>
              <ViewToggle mode={viewMode} onToggle={setViewMode} />
              <Button onClick={() => {
                setEditingAllocation(null);
                setOpen(true);
              }} disabled={loadingInstallations}>
                <PlusCircle className="mr-2 h-4 w-4" />
                Nova Alocação
              </Button>
            </div>
          </div>
        </CardHeader>

        <div className="px-6 pt-2 pb-4 flex flex-wrap gap-2 items-center">
          <Badge variant="outline" className="flex items-center gap-2">
            <Filter className="h-3.5 w-3.5" />
            <span>Filtros:</span>
          </Badge>

          <Select value={generatorFilter} onValueChange={setGeneratorFilter}>
            <SelectTrigger className="w-[200px] h-8">
              <SelectValue placeholder="Instalação geradora" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Todas as geradoras</SelectItem>
              {generatorInstallations.map(installation => (
                <SelectItem key={installation.id} value={installation.id}>
                  <div className="flex items-center">
                    <Zap className="h-3.5 w-3.5 mr-1.5" />
                    {installation.installationNumber}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={consumerFilter} onValueChange={setConsumerFilter}>
            <SelectTrigger className="w-[200px] h-8">
              <SelectValue placeholder="Instalação consumidora" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Todas as consumidoras</SelectItem>
              {consumerInstallations.map(installation => (
                <SelectItem key={installation.id} value={installation.id}>
                  <div className="flex items-center">
                    <Home className="h-3.5 w-3.5 mr-1.5" />
                    {installation.installationNumber}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={distributorFilter} onValueChange={setDistributorFilter}>
            <SelectTrigger className="w-[200px] h-8">
              <SelectValue placeholder="Distribuidora" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Todas as distribuidoras</SelectItem>
              {distributors.map(distributor => (
                <SelectItem key={distributor.id} value={distributor.id}>
                  <div className="flex items-center">
                    <Building className="h-3.5 w-3.5 mr-1.5" />
                    {distributor.name}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={ownerFilter} onValueChange={setOwnerFilter}>
            <SelectTrigger className="w-[200px] h-8">
              <SelectValue placeholder="Proprietário" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Todos os proprietários</SelectItem>
              {owners.map(owner => (
                <SelectItem key={owner.id} value={owner.id}>
                  <div className="flex items-center">
                    <User className="h-3.5 w-3.5 mr-1.5" />
                    {owner.name || owner.email}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {(generatorFilter || consumerFilter || distributorFilter || ownerFilter || searchText) && (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={clearFilters} 
              className="h-8 text-xs text-muted-foreground hover:text-foreground"
            >
              <X className="h-3.5 w-3.5 mr-1" />
              Limpar filtros
            </Button>
          )}
        </div>

        <CardContent className="pt-2 px-4 pb-6">
          {error && (
            <div className="mb-4 flex items-center gap-2 rounded-md border border-destructive bg-destructive/10 p-3 text-sm text-destructive">
              <AlertCircle className="h-4 w-4" />
              {error}
            </div>
          )}

          <AnimatePresence mode="wait">
            {isLoading ? (
              <div className="text-center p-10 text-muted-foreground">Carregando...</div>
            ) : viewMode === 'card' ? (
              <motion.div
                key="card-view"
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
              >
                {filteredAllocations.length > 0 ? (
                  filteredAllocations.map((allocation, index) => (
                    <AllocationCard
                      key={allocation.id}
                      allocation={allocation}
                      index={index}
                      onEdit={() => {
                        setEditingAllocation(allocation);
                        setOpen(true);
                      }}
                      onDelete={() => setConfirmDelete(allocation)}
                    />
                  ))
                ) : (
                  <div className="col-span-full text-center py-10 text-muted-foreground">
                    Nenhuma alocação encontrada{searchText || generatorFilter || consumerFilter || distributorFilter || ownerFilter ? ' com os filtros aplicados.' : '.'}
                  </div>
                )}
              </motion.div>
            ) : (
              <motion.div
                key="table-view"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                <DataTable
                  columns={columns}
                  data={filteredAllocations}
                  loading={isLoading}
                  searchKey="installation"
                  searchPlaceholder="Buscar alocações..."
                  emptyMessage={error ? "Erro ao carregar dados." : (
                    searchText || generatorFilter || consumerFilter || distributorFilter || ownerFilter
                      ? "Nenhuma alocação encontrada com os filtros aplicados."
                      : "Nenhuma alocação cadastrada."
                  )}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={(open) => {
        if (!open) {
          setEditingAllocation(null);
        }
        setOpen(open);
      }}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>{editingAllocation ? 'Editar Alocação' : 'Criar Nova Alocação'}</DialogTitle>
            <DialogDescription>
              {editingAllocation ? 'Modifique os detalhes da alocação existente.' : 'Defina uma nova alocação entre instalações geradoras e consumidoras.'}
            </DialogDescription>
          </DialogHeader>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="generatorId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Instalação Geradora</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value} disabled={loadingInstallations || isSubmitting}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione uma instalação geradora" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {generatorInstallations.map((installation) => (
                          <SelectItem key={installation.id} value={installation.id}>
                            <div className="flex items-center">
                              <Zap className="h-4 w-4 mr-2 text-success" />
                              {installation.installationNumber} - {installation.owner?.name || installation.owner?.email || 'Sem proprietário'}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Selecione a instalação geradora de energia.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="consumerId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Instalação Consumidora</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value} disabled={loadingInstallations || isSubmitting}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione uma instalação consumidora" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {consumerInstallations.map((installation) => (
                          <SelectItem key={installation.id} value={installation.id}>
                            <div className="flex items-center">
                              <Home className="h-4 w-4 mr-2 text-info" />
                              {installation.installationNumber} - {installation.owner?.name || installation.owner?.email || 'Sem proprietário'}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Selecione a instalação consumidora de energia.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="quota"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Quota (%)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="0.01"
                        max="100"
                        step="0.01"
                        disabled={isSubmitting}
                        onChange={(e) => field.onChange(parseFloat(e.target.value))}
                        value={field.value}
                      />
                    </FormControl>
                    <FormDescription>
                      Porcentagem da energia gerada que será alocada para esta instalação consumidora.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={isSubmitting}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={isSubmitting || loadingInstallations}>
                  {isSubmitting ? (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                      {editingAllocation ? 'Atualizando...' : 'Criando...'}
                    </>
                  ) : (
                    editingAllocation ? 'Atualizar Alocação' : 'Criar Alocação'
                  )}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
      
      <ConfirmAlert
        isOpen={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        onConfirm={handleDeleteAllocation}
        title="Excluir Alocação"
        description={`Tem certeza que deseja excluir a alocação entre ${confirmDelete?.generator?.installationNumber || 'geradora'} e ${confirmDelete?.consumer?.installationNumber || 'consumidora'}? Esta ação não pode ser desfeita.`}
        confirmText="Excluir"
        cancelText="Cancelar"
        variant="destructive"
        isProcessing={isSubmitting}
      />
      
      <Toaster />
    </div>
  );
} 