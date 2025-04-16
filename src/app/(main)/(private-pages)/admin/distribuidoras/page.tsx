// path: /admin/distribuidoras

'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { frontendLog as log } from '@/lib/logs/logger';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { Toaster } from '@/components/ui/toaster';
import { DataTable } from '@/components/ui/data-table';
import { ColumnDef } from '@tanstack/react-table';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { MoreHorizontal, Edit, Trash2, PlusCircle, RefreshCw, AlertCircle, Search, DollarSign, MapPin } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { ConfirmAlert } from '@/components/ui/alert-dialog-custom';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useDistributorStore } from '@/store/distributorStore';
import { formatDate } from '@/lib/utils/utils';
import { Distributor as AppDistributor, Address as AppAddress } from '@/lib/types/app-types';
import { ViewToggle, ViewMode } from '@/components/ui/view-toggle';
import { DistributorCard } from '@/components/ux/DistributorCard';
import { FormattedKwhInput } from '@/components/ui/formatted-kwh-input';
import { toast } from 'sonner';
import { LoadingOverlay } from '@/components/ui/loading-overlay';

// Zod validation schema for the distributor form
const distributorSchema = z.object({
  name: z.string().min(2, { message: 'Nome deve ter pelo menos 2 caracteres' }),
  pricePerKwh: z.coerce
    // eslint-disable-next-line @typescript-eslint/naming-convention
    .number({ invalid_type_error: 'Preço deve ser um número' })
    .positive({ message: 'Preço deve ser positivo' })
    .max(100, { message: 'Preço parece alto demais' }), // Example max validation
  address: z.object({
    street: z.string().min(3, { message: 'Rua deve ter pelo menos 3 caracteres' }),
    number: z.string().min(1, { message: 'Número é obrigatório' }),
    complement: z.string().optional(),
    neighborhood: z.string().min(3, { message: 'Bairro deve ter pelo menos 3 caracteres' }),
    city: z.string().min(2, { message: 'Cidade deve ter pelo menos 2 caracteres' }),
    state: z.string().length(2, { message: 'Estado deve ter 2 caracteres (UF)' }),
    zip: z.string().regex(/^\d{5}-?\d{3}$/, { message: 'CEP inválido' }), // Basic Brazilian CEP format
  })
});

type DistributorFormData = z.infer<typeof distributorSchema>;

// Animation variants (similar to invitations page)
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

export default function DistribuidorasPage() {
  const {
    distributors = [],
    isLoading: loading,
    error,
    fetchDistributors,
    createDistributor,
    updateDistributor,
    deleteDistributor: storeDeleteDistributor,
    setError
  } = useDistributorStore();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingDistributor, setEditingDistributor] = useState<AppDistributor | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<AppDistributor | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('card');
  const [searchText, setSearchText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const form = useForm<DistributorFormData>({
    resolver: zodResolver(distributorSchema),
    defaultValues: {
      name: '',
      pricePerKwh: 0,
      address: {
        street: '',
        number: '',
        complement: '',
        neighborhood: '',
        city: '',
        state: '',
        zip: '',
      },
    },
  });

  useEffect(() => {
    fetchDistributors().catch(err => {
      log.error('Failed to fetch distributors', { error: err });
    });
  }, [fetchDistributors]);

  // Debug para verificar os dados retornados da API
  useEffect(() => {
    if (distributors && distributors.length > 0) {
      log.debug('Dados das distribuidoras recebidos:', { count: distributors.length });
      
      // Verificar dados de preço - usando loop para evitar problemas de tipagem
      distributors.forEach(distributor => {
        // Usando verificação segura para propriedades
        const distribInfo = {
          name: distributor.name,
          pricePerKwh: distributor.pricePerKwh,
          typeOfPrice: typeof distributor.pricePerKwh,
          // Use uma verificação segura para propriedades que podem não existir no tipo
          kwhPrices: (distributor as any).kwhPrices
        };
        
        log.debug(`Distribuidora ${distributor.name}:`, distribInfo);
      });
    }
  }, [distributors]);

  const formatDateFn = useCallback((dateStr: string | Date): string => {
    try {
      return formatDate(new Date(dateStr));
    } catch {
      return 'Data inválida';
    }
  }, []);

  const formatCurrency = useCallback((value: number | undefined | null): string => {
    // Se o valor for undefined, null ou NaN, retornar um valor padrão
    if (value === undefined || value === null || isNaN(value)) {
      log.warn('Tentativa de formatação de valor inválido:', { value });
      return "R$ 0,00"; // Valor padrão para exibição
    }
    
    try {
      return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL',
        minimumFractionDigits: 2,
        maximumFractionDigits: 5,
      }).format(value);
    } catch (error) {
      log.error('Erro ao formatar valor monetário:', { value, error });
      return "R$ 0,00"; // Fallback em caso de erro
    }
  }, []);

  const filteredDistributors = useMemo(() => {
    if (!searchText) {
      return distributors;
    }
    const searchLower = searchText.toLowerCase();
    return distributors.filter(distributor =>
      distributor.name.toLowerCase().includes(searchLower) ||
      (distributor.address?.city && distributor.address.city.toLowerCase().includes(searchLower)) ||
      (distributor.address?.state && distributor.address.state.toLowerCase().includes(searchLower))
    );
  }, [distributors, searchText]);

  const onSubmit = async (values: DistributorFormData) => {
    setError(null);
    setIsProcessing(true);

    try {
      const payload = {
        ...values,
        code: editingDistributor?.code || 'AUTO',
        address: {
          street: values.address.street,
          number: values.address.number,
          complement: values.address.complement,
          neighborhood: values.address.neighborhood,
          city: values.address.city,
          state: values.address.state,
          zipCode: values.address.zip,
          country: 'Brasil'
        }
      };

      if (editingDistributor) {
        await updateDistributor(editingDistributor.id, payload as any);
        await new Promise(resolve => setTimeout(resolve, 1000));
        toast.success(`Distribuidora "${values.name}" atualizada com sucesso.`);
      } else {
        await createDistributor(payload as any);
        await new Promise(resolve => setTimeout(resolve, 1000));
        toast.success(`Distribuidora "${values.name}" criada com sucesso.`);
      }

      setIsDialogOpen(false);
      setEditingDistributor(null);
      form.reset();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      toast.error(`Erro ao ${editingDistributor ? 'atualizar' : 'criar'} Distribuidora: ${errorMessage}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleOpenDialog = useCallback((distributor?: AppDistributor) => {
    if (distributor) {
      setEditingDistributor(distributor);
      form.reset({
        name: distributor.name,
        pricePerKwh: distributor.pricePerKwh,
        address: {
          street: distributor.address?.street || '',
          number: distributor.address?.number || '',
          complement: distributor.address?.complement || '',
          neighborhood: distributor.address?.neighborhood || '',
          city: distributor.address?.city || '',
          state: distributor.address?.state || '',
          zip: distributor.address?.zipCode || '',
        },
      });
    } else {
      setEditingDistributor(null);
      form.reset();
    }
    setError(null);
    setIsDialogOpen(true);
  }, [form, setError]);

  const handleCloseDialog = (open: boolean) => {
    if (!open) {
      setIsDialogOpen(false);
      setEditingDistributor(null);
      form.reset();
      setError(null);
    } else {
      setIsDialogOpen(true);
    }
  };

  const handleDeleteDistributor = async () => {
    if (!confirmDelete) return;
    setIsProcessing(true);
    
    console.log('[PAGE] Deleting distributor', { 
      id: confirmDelete.id, 
      name: confirmDelete.name 
    });
    
    try {
      await storeDeleteDistributor(confirmDelete.id);
      console.log('[PAGE] Distributor deleted successfully');
      await new Promise(resolve => setTimeout(resolve, 1000));
      toast.success(`Distribuidora "${confirmDelete.name}" excluída com sucesso.`);
      setConfirmDelete(null);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      console.error('[PAGE] Error deleting distributor', { 
        error: errorMessage,
        stack: err instanceof Error ? err.stack : undefined
      });
      toast.error(`Erro ao excluir distribuidora: ${errorMessage}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const columns = useMemo<ColumnDef<AppDistributor>[]>(() => [
    {
      accessorKey: 'name',
      header: 'Nome',
      cell: ({ row }) => <div className="font-medium">{row.getValue('name')}</div>,
    },
    {
      accessorKey: 'pricePerKwh',
      header: 'Preço kWh',
      cell: ({ row }) => formatCurrency(row.getValue('pricePerKwh')),
    },
    {
      accessorKey: 'address',
      header: 'Endereço',
      cell: ({ row }) => {
        const address = row.original.address;
        if (!address) return <span className="text-muted-foreground">N/A</span>;
        return `${address.street}, ${address.number} - ${address.neighborhood}, ${address.city}/${address.state}`;
      },
    },
    {
        accessorKey: 'installationCount',
        header: 'Instalações',
        // TODO: Fetch actual count later
        cell: ({ row }) => <div className="text-center">{(row.original as any).installations?.length ?? 0}</div>,
    },
    {
      accessorKey: 'createdAt',
      header: 'Criado em',
      cell: ({ row }) => formatDateFn(row.getValue('createdAt')),
    },
    {
      id: 'actions',
      header: 'Ações',
      cell: ({ row }) => {
        const distributor = row.original;
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
              <DropdownMenuItem onClick={() => handleOpenDialog(distributor)}>
                <Edit className="mr-2 h-4 w-4" />
                <span>Editar</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setConfirmDelete(distributor)} className="text-destructive focus:bg-destructive/20">
                <Trash2 className="mr-2 h-4 w-4" />
                <span>Excluir</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ], [handleOpenDialog, setConfirmDelete, formatCurrency, formatDateFn]);

  return (
    <div className="container mx-auto p-6 space-y-6 h-full flex flex-col">
      <Card className="flex-1 overflow-hidden flex flex-col border-primary/20 dark:border-primary/30 shadow-md">
        <CardHeader className="pb-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <CardTitle>Gerenciamento de Distribuidoras</CardTitle>
              <CardDescription>Cadastre, visualize e gerencie as distribuidoras de energia.</CardDescription>
            </div>
            <div className='flex items-center gap-2'>
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Buscar por nome, cidade, estado..."
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  className="pl-8 w-[180px] lg:w-[280px] border border-primary/40 focus:border-primary/90 hover:border-primary/40 hover:bg-primary/10 hover:text-black hover:shadow-emerald-500 transition-all duration-300 hover:shadow-lg"
                />
              </div>
              <Button variant="outline" size="icon" onClick={() => fetchDistributors()} disabled={loading}>
                <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              </Button>
              <ViewToggle mode={viewMode} onToggle={setViewMode} />
              <Button onClick={() => handleOpenDialog()} className="whitespace-nowrap">
                <PlusCircle className="mr-2 h-4 w-4" />
                Nova Distribuidora
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="flex-grow overflow-auto pt-2 px-4 pb-6">
          {error && !loading && (
            <div className="mb-4 flex items-center gap-2 rounded-md border border-destructive bg-destructive/10 p-3 text-sm text-destructive">
              <AlertCircle className="h-4 w-4" />
              {error}
            </div>
          )}

          <AnimatePresence mode="wait">
            {loading ? (
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
                {filteredDistributors.length > 0 ? (
                  filteredDistributors.map((distributor, index) => (
                    <React.Fragment key={`distributor-${distributor.id}`}>
                      <DistributorCard
                        distributor={distributor}
                        index={index}
                        formatDate={formatDateFn}
                        formatCurrency={formatCurrency}
                        onEdit={handleOpenDialog}
                        onDelete={setConfirmDelete}
                      />
                    </React.Fragment>
                  ))
                ) : (
                  <div className="col-span-full text-center py-10 text-muted-foreground">
                    Nenhuma distribuidora encontrada{searchText ? ' com os filtros aplicados.' : '.'}
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
                  data={filteredDistributors as AppDistributor[]}
                  loading={loading}
                  searchKey="name"
                  searchPlaceholder="Buscar por nome..."
                  emptyMessage={error ? "Erro ao carregar dados." : (searchText ? "Nenhuma distribuidora encontrada com os filtros aplicados." : "Nenhuma distribuidora cadastrada.")}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={handleCloseDialog}>
        <DialogContent className="sm:max-w-[600px] relative">
          {isProcessing && <LoadingOverlay message={editingDistributor ? 'Atualizando...' : 'Cadastrando...'} />}
          <div className={isProcessing ? 'invisible' : ''}>
            <DialogHeader>
              <DialogTitle>{editingDistributor ? 'Editar Distribuidora' : 'Cadastrar Nova Distribuidora'}</DialogTitle>
              <DialogDescription>
                {editingDistributor ? 'Atualize as informações da distribuidora.' : 'Preencha os dados para cadastrar uma nova distribuidora.'}
              </DialogDescription>
            </DialogHeader>
            {error && (
              <div className="mb-4 flex items-center gap-2 rounded-md border border-destructive bg-destructive/10 p-3 text-sm text-destructive">
                <AlertCircle className="h-4 w-4" />
                {error}
              </div>
            )}
            <Form {...form}>
              <form id="distributor-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 max-h-[70vh] overflow-y-auto px-1 py-2">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome da Distribuidora *</FormLabel>
                      <FormControl>
                        <Input placeholder="Ex: CEMIG, ENEL" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="pricePerKwh"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Preço por kWh (R$) *</FormLabel>
                      <FormControl>
                        <FormattedKwhInput 
                          value={field.value} 
                          onChange={field.onChange}
                          onBlur={field.onBlur}
                          placeholder="0.976"
                        />
                      </FormControl>
                      <FormDescription>Valor cobrado pela distribuidora por kWh.</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <h3 className="text-lg font-medium border-t pt-4 mt-4">Endereço</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="address.street"
                    render={({ field }) => (
                      <FormItem className="md:col-span-2">
                        <FormLabel>Rua/Avenida *</FormLabel>
                        <FormControl>
                          <Input placeholder="Av. Principal" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="address.number"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Número *</FormLabel>
                        <FormControl>
                          <Input placeholder="123" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="address.complement"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Complemento</FormLabel>
                        <FormControl>
                          <Input placeholder="Apto 101, Bloco B" {...field} value={field.value || ''} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="address.neighborhood"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Bairro *</FormLabel>
                        <FormControl>
                          <Input placeholder="Centro" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="address.city"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Cidade *</FormLabel>
                        <FormControl>
                          <Input placeholder="Belo Horizonte" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="address.state"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Estado (UF) *</FormLabel>
                        <FormControl>
                          <Input placeholder="MG" maxLength={2} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="address.zip"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>CEP *</FormLabel>
                        <FormControl>
                          <Input placeholder="30000-000" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <DialogFooter className="pt-4">
                  <Button type="button" variant="outline" onClick={() => handleCloseDialog(false)} disabled={isProcessing}>
                    Cancelar
                  </Button>
                  <Button type="submit" form="distributor-form" disabled={isProcessing}>
                    {isProcessing ? (
                      <>
                        <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                        {editingDistributor ? 'Salvando...' : 'Cadastrando...'}
                      </>
                    ) : (editingDistributor ? 'Salvar Alterações' : 'Cadastrar Distribuidora')}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </div>
        </DialogContent>
      </Dialog>

      <ConfirmAlert
        isOpen={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        onConfirm={handleDeleteDistributor}
        title="Excluir Distribuidora"
        description={`Tem certeza que deseja excluir a distribuidora "${confirmDelete?.name}"? Esta ação não pode ser desfeita.`}
        confirmText="Excluir"
        cancelText="Cancelar"
        variant="destructive"
        isProcessing={isProcessing}
      />

      <Toaster />
    </div>
  );
} 