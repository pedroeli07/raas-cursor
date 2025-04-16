// path: /admin/instalacoes

'use client';

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Address, InstallationType, Installation as PrismaInstallation, Distributor, User, InstallationStatus } from '@prisma/client';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { frontendLog } from '@/lib/logs/logger';
import { toast } from 'sonner';
import { DataTable } from '@/components/ui/data-table';
import { ColumnDef } from '@tanstack/react-table';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { MoreHorizontal, Edit, Trash2, PlusCircle, RefreshCw, AlertCircle, Zap, Home, Search, Filter, X, Building, User as UserIcon } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { ConfirmAlert } from '@/components/ui/alert-dialog-custom';
import { Badge } from '@/components/ui/badge';
import { useInstallationStore } from '@/store/installationStore';
import { useDistributorStore } from '@/store/distributorStore';
import { useUserManagementStore } from '@/store/userManagementStore';
import { formatDate, formatDatePtBr } from '@/lib/utils/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { ViewToggle, ViewMode } from '@/components/ui/view-toggle';
import { InstallationCard } from '@/components/ux/InstallationCard';
import { cn } from '@/lib/utils';
import { useDebugLogger } from '@/lib/context/DebugContext';
import { InstallationTable } from '@/components/ux/InstallationTable';

// Enhanced Installation with relations and extra fields
interface Installation extends PrismaInstallation {
  distributor?: Distributor | null;
  owner?: User | null;
  address?: Address | null;
}

// Interface for installation card component
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
  expiringBalance?: number;
  expirationPeriod?: string;
  quota?: number;
  lastConsumptionDate?: Date | string;
}

// Local interface for the form (doesn't need the extra fields from the app-types)
interface FormAddress {
  street: string;
  number: string;
  complement?: string | null;
  neighborhood: string;
  city: string;
  state: string;
  zip: string;
}

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

// Zod validation schema for the installation form
const installationSchema = z.object({
  installationNumber: z.string().min(5, { message: 'Número da Instalação deve ter pelo menos 5 caracteres' }),
  type: z.nativeEnum(InstallationType, { errorMap: () => ({ message: "Tipo inválido" }) }),
  distributorId: z.string().min(1, { message: 'Selecione a distribuidora' }),
  ownerId: z.string().optional(),
  status: z.nativeEnum(InstallationStatus, { 
    errorMap: () => ({ message: "Status inválido" }) 
  }).default(InstallationStatus.ACTIVE),
  address: z.object({
    street: z.string().min(3, { message: 'Rua deve ter pelo menos 3 caracteres' }),
    number: z.string().min(1, { message: 'Número é obrigatório' }),
    complement: z.string().optional(),
    neighborhood: z.string().min(3, { message: 'Bairro deve ter pelo menos 3 caracteres' }),
    city: z.string().min(2, { message: 'Cidade deve ter pelo menos 2 caracteres' }),
    state: z.string().length(2, { message: 'Estado deve ter 2 caracteres (UF)' }),
    zip: z.string().regex(/^\d{5}-?\d{3}$/, { message: 'CEP inválido' }),
  })
});

// Definindo o tipo do formulário com status não opcional
type InstallationFormData = {
  installationNumber: string;
  type: InstallationType;
  distributorId: string;
  ownerId?: string;
  status: InstallationStatus;
  address: {
    street: string;
    number: string;
    complement?: string;
    neighborhood: string;
    city: string;
    state: string;
    zip: string;
  };
};

// Helper function to convert form address to API address format
function convertFormAddressToApiAddress(formAddress: FormAddress): Partial<Address> {
  return {
    street: formAddress.street,
    number: formAddress.number,
    complement: formAddress.complement || undefined,
    neighborhood: formAddress.neighborhood,
    city: formAddress.city,
    state: formAddress.state,
    zip: formAddress.zip,
  };
}

// Helper function to convert form data to API format
function convertFormDataToApiFormat(formData: InstallationFormData, installationId?: string): Partial<Installation> {
  const addressData = convertFormAddressToApiAddress(formData.address);
  
  // Create the base data object with the address directly, not in a nested format
  const baseData: Partial<Installation> = {
    installationNumber: formData.installationNumber,
    type: formData.type,
    distributorId: formData.distributorId,
    ownerId: formData.ownerId === '_NO_OWNER_' ? null : formData.ownerId,
    // The API will create the address and link it via addressId
    address: addressData as any,
  };

  if (installationId) {
    return {
      ...baseData,
      id: installationId,
    };
  } else {
    // No need to add status field since it doesn't exist in the Prisma schema
    return baseData;
  }
}

// Energy and currency formatting functions
const formatEnergy = (value: number | undefined | null): string => {
  if (value === undefined || value === null) return '0 kWh';
  return `${value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} kWh`;
};

const formatCurrency = (value: number | undefined | null): string => {
  if (value === undefined || value === null) return 'R$ 0,00';
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};

// Form field components that could be causing re-renders
const InstallationTypeSelect = React.memo(({ field }: { field: any }) => (
  <FormItem>
    <FormLabel>Tipo *</FormLabel>
    <Select 
      onValueChange={field.onChange} 
      defaultValue={field.value} 
      value={field.value}
    >
      <FormControl>
        <SelectTrigger>
          <SelectValue placeholder="Selecione o tipo..." />
        </SelectTrigger>
      </FormControl>
      <SelectContent>
        <SelectItem value="GENERATOR">Geradora</SelectItem>
        <SelectItem value="CONSUMER">Consumidora</SelectItem>
      </SelectContent>
    </Select>
    <FormMessage />
  </FormItem>
));
InstallationTypeSelect.displayName = 'InstallationTypeSelect';

const DistributorSelect = React.memo(({ field, distributors, loading }: { field: any, distributors: any[], loading: boolean }) => (
  <FormItem>
    <FormLabel>Distribuidora *</FormLabel>
    <Select 
      onValueChange={field.onChange} 
      defaultValue={field.value} 
      value={field.value} 
      disabled={loading}
    >
      <FormControl>
        <SelectTrigger>
          <SelectValue placeholder={loading ? "Carregando..." : "Selecione a distribuidora..."} />
        </SelectTrigger>
      </FormControl>
      <SelectContent>
        {distributors.map((d: any) => (
          <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
        ))}
      </SelectContent>
    </Select>
    <FormMessage />
  </FormItem>
));
DistributorSelect.displayName = 'DistributorSelect';

const OwnerSelect = React.memo(({ field, users, loading }: { field: any, users: any[], loading: boolean }) => (
  <FormItem>
    <FormLabel>Proprietário (Opcional)</FormLabel>
    <Select 
      onValueChange={field.onChange} 
      defaultValue={field.value} 
      value={field.value} 
      disabled={loading}
    >
      <FormControl>
        <SelectTrigger>
          <SelectValue placeholder={loading ? "Carregando..." : "Selecione o proprietário (opcional)..."} />
        </SelectTrigger>
      </FormControl>
      <SelectContent>
        <SelectItem value="_NO_OWNER_">Sem proprietário</SelectItem>
        {users.length > 0 ? (
          users.map((u: any) => (
            <SelectItem key={u.id} value={u.id}>{u.name || u.email}</SelectItem>
          ))
        ) : (
          <SelectItem value="no-users-available" disabled>Nenhum usuário disponível</SelectItem>
        )}
      </SelectContent>
    </Select>
    <FormMessage />
  </FormItem>
));
OwnerSelect.displayName = 'OwnerSelect';

// Memoized filter components 
const TypeFilterSelect = React.memo(({ value, onChange, disabled }: { value: string, onChange: (value: string) => void, disabled: boolean }) => (
  <Select 
    value={value} 
    onValueChange={onChange}
    disabled={disabled}
  >
    <SelectTrigger className="w-[200px] h-8">
      <SelectValue placeholder="Tipo de instalação" />
    </SelectTrigger>
    <SelectContent>
      <SelectItem value="all">Todos os tipos</SelectItem>
      <SelectItem value={InstallationType.GENERATOR}>Geradora</SelectItem>
      <SelectItem value={InstallationType.CONSUMER}>Consumidora</SelectItem>
    </SelectContent>
  </Select>
));
TypeFilterSelect.displayName = 'TypeFilterSelect';

const DistributorFilterSelect = React.memo(({ value, onChange, disabled, distributors }: { value: string, onChange: (value: string) => void, disabled: boolean, distributors: any[] }) => (
  <Select 
    value={value} 
    onValueChange={onChange}
    disabled={disabled}
  >
    <SelectTrigger className="w-[200px] h-8">
      <SelectValue placeholder="Distribuidora" />
    </SelectTrigger>
    <SelectContent>
      <SelectItem value="all">Todas as distribuidoras</SelectItem>
      {distributors.map(distributor => (
        <SelectItem key={distributor.id} value={distributor.id}>{distributor.name}</SelectItem>
      ))}
    </SelectContent>
  </Select>
));
DistributorFilterSelect.displayName = 'DistributorFilterSelect';

const OwnerFilterSelect = React.memo(({ value, onChange, disabled, users }: { value: string, onChange: (value: string) => void, disabled: boolean, users: any[] }) => (
  <Select 
    value={value} 
    onValueChange={onChange}
    disabled={disabled}
  >
    <SelectTrigger className="w-[200px] h-8">
      <SelectValue placeholder="Proprietário" />
    </SelectTrigger>
    <SelectContent>
      <SelectItem value="all">Todos os proprietários</SelectItem>
      {users.length > 0 ? (
        users.map(u => (
          <SelectItem key={u.id} value={u.id}>{u.name || u.email}</SelectItem>
        ))
      ) : (
        <SelectItem value="no-users-available" disabled>Nenhum usuário disponível</SelectItem>
      )}
    </SelectContent>
  </Select>
));
OwnerFilterSelect.displayName = 'OwnerFilterSelect';

// Memoized FormContent component to prevent renders
const InstallationFormContent = React.memo(
  ({ 
    form, 
    selectedInstallation, 
    error, 
    loadingDistributors, 
    isFormSubmitting,
    distributors, 
    filteredUsers, 
    onSubmit, 
    onClose 
  }: { 
    form: any; 
    selectedInstallation: Installation | null; 
    error: string | null; 
    loadingDistributors: boolean; 
    isFormSubmitting: boolean;
    distributors: any[]; 
    filteredUsers: any[]; 
    onSubmit: (values: any) => void; 
    onClose: (open: boolean) => void;
  }) => {
    return (
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 max-h-[70vh] overflow-y-auto px-1 py-2">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="installationNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Número da Instalação *</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: 1001234567" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <InstallationTypeSelect field={field} />
              )}
            />
            <FormField
              control={form.control}
              name="distributorId"
              render={({ field }) => (
                <DistributorSelect field={field} distributors={distributors} loading={loadingDistributors} />
              )}
            />
            <FormField
              control={form.control}
              name="ownerId"
              render={({ field }) => (
                <OwnerSelect field={field} users={filteredUsers} loading={loadingDistributors} />
              )}
            />
            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Status da Instalação</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o status" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value={InstallationStatus.ACTIVE}>Ativa</SelectItem>
                      <SelectItem value={InstallationStatus.INACTIVE}>Inativa</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <h3 className="text-lg font-medium border-t pt-4 mt-4">Endereço da Instalação</h3>
          {/* Address fields (similar to distributor form) */}
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
                    <Input placeholder="Apto 101, Bloco B" {...field} />
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
            <Button type="button" variant="outline" onClick={() => onClose(false)} disabled={isFormSubmitting}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loadingDistributors || isFormSubmitting}>
              {isFormSubmitting ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  {selectedInstallation ? 'Salvando...' : 'Cadastrando...'}
                </>
              ) : (selectedInstallation ? 'Salvar Alterações' : 'Cadastrar Instalação')}
            </Button>
          </DialogFooter>
        </form>
      </Form>
    );
  }
);
InstallationFormContent.displayName = 'InstallationFormContent';

// Define helper functions for installation status
const getInstallationStatusProps = (status: InstallationStatus) => {
  switch (status) {
    case InstallationStatus.ACTIVE:
      return {
        label: "Ativa",
        variant: "outline",
        className: "bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800"
      };
    case InstallationStatus.INACTIVE:
      return {
        label: "Inativa",
        variant: "outline",
        className: "bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800"
      };
    default:
      return {
        label: String(status),
        variant: "outline",
        className: "bg-gray-100 text-gray-800"
      };
  }
};

export default function AdminInstallationsPage() {
  const debug = useDebugLogger('InstalacoesPage');
  const [open, setOpen] = useState(false);
  const [selectedInstallation, setSelectedInstallation] = useState<Installation | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const isMounted = useRef(true);
  const prevInstallationsCount = useRef(0);
  const [viewMode, setViewMode] = useState<ViewMode>("table");
  const [searchText, setSearchText] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [distributorFilter, setDistributorFilter] = useState<string>('all');
  const [ownerFilter, setOwnerFilter] = useState<string>('all');
  // Add new state for form submission loading
  const [isFormSubmitting, setIsFormSubmitting] = useState(false);

  // Use store instead of local state
  const {
    installations,
    isLoading: loading,
    error,
    fetchInstallations,
    createInstallation,
    updateInstallation,
    deleteInstallation: storeDeleteInstallation,
    setError,
    updateInstallationStatus,
  } = useInstallationStore();

  const {
    distributors,
    isLoading: loadingDistributors,
    fetchDistributors
  } = useDistributorStore();

  const {
    users = [], // Provide default empty array
    usersLoading,
    fetchUsers
  } = useUserManagementStore();

  // Add useEffect for initial data fetching
  useEffect(() => {
    // Evitar múltiplos logs em cada renderização
    const shouldFetch = !installations.length || !distributors.length || !users.length;
    
    if (shouldFetch) {
      debug.info('Componente montado, buscando dados iniciais', {
        page: 'admin/instalacoes'
      });
      fetchInstallations();
      fetchDistributors();
      fetchUsers();
    }
  }, [fetchInstallations, fetchDistributors, fetchUsers, installations.length, distributors.length, users.length]);

  // Add logging for installations data changes
  useEffect(() => {
    // Só logar se houver mudanças significativas
    if (installations?.length !== prevInstallationsCount.current || error || loading) {
      prevInstallationsCount.current = installations?.length || 0;
      
      // Limitar logs apenas para mudanças reais
      if (installations?.length > 0 || error) {
        debug.info('Dados de instalações atualizados', { 
          installationsCount: installations?.length || 0, 
          loading, 
          error: error ? true : false // Enviar apenas flag booleana para reduzir tamanho do log
        });
        
        // Limitar o log de exemplo apenas quando realmente útil
        if (installations && installations.length > 0 && !error) {
          debug.debug('Exemplo de instalação carregada', {
            id: installations[0].id,
            number: installations[0].installationNumber,
            type: installations[0].type
          });
        }
      }
    }
  }, [installations, loading, error, debug]);

  // React Hook Form setup
  const form = useForm({
 
    resolver: zodResolver(installationSchema),
      defaultValues: {
        installationNumber: '',
      type: InstallationType.CONSUMER,
      distributorId: '',
      ownerId: '_NO_OWNER_',
      status: InstallationStatus.ACTIVE,
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

  // Apply all filters to installations
  const filteredInstallations = useMemo(() => {
    if (!installations) {
      return [];
    }
    
    return (installations as Installation[]).filter((installation) => {
      // Search text filter
      if (searchText) {
        const searchLower = searchText.toLowerCase();
        const installationNumber = installation.installationNumber?.toLowerCase() || '';
        const distributor = installation.distributor?.name?.toLowerCase() || '';
        const ownerName = installation.owner?.name?.toLowerCase() || '';
        const ownerEmail = installation.owner?.email?.toLowerCase() || '';
        const address = installation.address ? 
          `${installation.address.street || ''} ${installation.address.city || ''} ${installation.address.state || ''}`.toLowerCase() : '';
        
        if (!installationNumber.includes(searchLower) && 
            !distributor.includes(searchLower) && 
            !ownerName.includes(searchLower) && 
            !ownerEmail.includes(searchLower) &&
            !address.includes(searchLower)) {
          return false;
        }
      }
      
      // Type filter
      if (typeFilter !== 'all' && installation.type !== typeFilter) {
        return false;
      }
      
      // Distributor filter
      if (distributorFilter !== 'all' && installation.distributorId !== distributorFilter) {
        return false;
      }
      
      // Owner filter
      if (ownerFilter !== 'all' && installation.ownerId !== ownerFilter) {
        return false;
      }
      
      return true;
    });
  }, [installations, searchText, typeFilter, distributorFilter, ownerFilter]);

  // Memoize filter change handlers to prevent re-creation on every render
  const handleTypeFilterChange = useCallback((value: string) => {
    setTypeFilter(value);
  }, []);

  const handleDistributorFilterChange = useCallback((value: string) => {
    setDistributorFilter(value);
  }, []);

  const handleOwnerFilterChange = useCallback((value: string) => {
    setOwnerFilter(value);
  }, []);

  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchText(e.target.value);
  }, []);

  const handleClearFilters = useCallback(() => {
    setSearchText('');
    setTypeFilter('all');
    setDistributorFilter('all');
    setOwnerFilter('all');
  }, []);

  // Filter users to only show customers and energy renters
  const filteredUsers = useMemo(() => {
    if (!Array.isArray(users)) { // Add safety check
      return [];
    }
    return users.filter(user =>
      user.role === 'CUSTOMER' ||
      user.role === 'ENERGY_RENTER'
    );
  }, [users]);

  // Get Installation Type Label and Badge
  const getInstallationTypeProps = useCallback((type: InstallationType) => {
      switch (type) {
          case InstallationType.GENERATOR:
              return { label: 'Geradora', variant: 'success', icon: <Zap className="h-3.5 w-3.5 mr-1.5" /> };
          case InstallationType.CONSUMER:
              return { label: 'Consumidora', variant: 'info', icon: <Home className="h-3.5 w-3.5 mr-1.5" /> };
          default:
              return { label: 'Desconhecido', variant: 'secondary', icon: null };
      }
  }, []); // Empty dependency array since the function itself doesn't depend on changing state/props

  // Handle form submission (Create/Update)
  const onSubmit = useCallback(async (values: InstallationFormData) => {
    try {
      // Set form submission loading to true
      setIsFormSubmitting(true);
      
      debug.info('Enviando formulário de instalação', {
        modo: selectedInstallation ? 'edição' : 'criação',
        installationNumber: values.installationNumber
      });
      
      if (selectedInstallation) {
        // Update existing installation - convert to API format
        const apiData = convertFormDataToApiFormat(values, selectedInstallation.id);
        await updateInstallation(selectedInstallation.id, apiData);
        debug.info('Instalação atualizada com sucesso', {
          id: selectedInstallation.id,
          installationNumber: values.installationNumber
        });
        toast.success(`Instalação Nº "${values.installationNumber}" atualizada com sucesso.`);
      } else {
        // Create new installation - convert to API format
        const apiData = convertFormDataToApiFormat(values);
        await createInstallation(apiData as Omit<Installation, "id">);
        debug.info('Instalação criada com sucesso', {
          installationNumber: values.installationNumber
        });
        toast.success(`Instalação Nº "${values.installationNumber}" criada com sucesso.`);
      }
      
      setOpen(false);
      setSelectedInstallation(null);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      debug.error('Erro ao processar instalação', {
        erro: errorMessage,
        modo: selectedInstallation ? 'edição' : 'criação',
        installationNumber: values.installationNumber
      });
      toast.error(`Erro ao ${selectedInstallation ? 'atualizar' : 'criar'} instalação: ${errorMessage}`);
    } finally {
      // Always reset form submission loading state
      setIsFormSubmitting(false);
    }
  }, [selectedInstallation, updateInstallation, createInstallation, debug]);

  // Handle opening the dialog for creating/editing
  const handleOpenDialog = useCallback((installation?: Installation) => {
    console.log('handleOpenDialog chamado', { installation, selectedInstallation: selectedInstallation?.id });
    
    // Fetch distributors and users if not already loaded
    if (distributors.length === 0 && !loadingDistributors) {
      console.log('Fetching distributors data for form');
      fetchDistributors();
    }
    
    if (users.length === 0 && !usersLoading) {
      console.log('Fetching users data for form');
      fetchUsers();
    }
    
    // Primeiro resetar o formulário com os valores iniciais
    form.reset({
      installationNumber: '',
      type: InstallationType.CONSUMER, // Valor padrão para evitar erro com SelectItem
      distributorId: '',
      ownerId: '_NO_OWNER_', // Use _NO_OWNER_ instead of empty string
      status: InstallationStatus.ACTIVE,
      address: {
        street: '',
        number: '',
        complement: '',
        neighborhood: '',
        city: '',
        state: '',
        zip: '',
      },
    });
    
    // Depois definir a instalação selecionada
    if (installation) {
      console.log('Editando instalação existente:', installation.id);
      setSelectedInstallation(installation);
      
      // Preencher formulário com dados da instalação
      form.reset({
        installationNumber: installation.installationNumber,
        type: installation.type,
        distributorId: installation.distributorId || '',
        ownerId: installation.ownerId || '_NO_OWNER_', // Use owner ID or _NO_OWNER_ if null/empty
        status: installation.status || InstallationStatus.ACTIVE,
        address: {
          street: installation.address?.street || '',
          number: installation.address?.number || '',
          complement: installation.address?.complement || '',
          neighborhood: installation.address?.neighborhood || '',
          city: installation.address?.city || '',
          state: installation.address?.state || '',
          zip: installation.address?.zip || '',
        },
      });
    } else {
      console.log('Criando nova instalação');
      setSelectedInstallation(null);
    }
    
    // Por último, abrir o diálogo
    setOpen(true);
  }, [form, fetchDistributors, fetchUsers, distributors.length, users.length, loadingDistributors, usersLoading]);

  // Handle closing the dialog
  const handleCloseDialog = useCallback((open: boolean) => {
    console.log('handleCloseDialog chamado', { open, currentOpen: open });
    
    if (!open) {
      setOpen(false);
      setSelectedInstallation(null);
      // Resetar o formulário com os valores iniciais
      form.reset({
        installationNumber: '',
        type: InstallationType.CONSUMER,
        distributorId: '',
        ownerId: '_NO_OWNER_', // Use _NO_OWNER_ instead of empty string
        status: InstallationStatus.ACTIVE,
        address: {
          street: '',
          number: '',
          complement: '',
          neighborhood: '',
          city: '',
          state: '',
          zip: '',
        },
      });
      setError(null); // Clear any previous errors
    } else {
      setOpen(true);
    }
  }, [form, setError]);

  // Handle delete action
  const handleDeleteInstallation = async () => {
    if (!selectedInstallation) return;
    
    console.log('[PAGE] Deleting installation', { 
      id: selectedInstallation.id, 
      number: selectedInstallation.installationNumber 
    });
    
    try {
      await storeDeleteInstallation(selectedInstallation.id);
      console.log('[PAGE] Installation deleted successfully');
      toast.success(`Instalação Nº "${selectedInstallation.installationNumber}" excluída com sucesso.`);
      setSelectedInstallation(null);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      console.error('[PAGE] Error deleting installation', { 
        error: errorMessage,
        stack: err instanceof Error ? err.stack : undefined
      });
      toast.error(`Erro ao excluir instalação: ${errorMessage}`);
    }
  };

  // Handle multiple installations deletion
  const handleDeleteMultipleInstallations = async (selectedInstallations: Installation[]) => {
    console.log('[PAGE] Deleting multiple installations', { count: selectedInstallations.length });
    
    if (selectedInstallations.length === 0) {
      console.warn('[PAGE] No installations selected for deletion');
      return Promise.reject(new Error("Nenhuma instalação selecionada"));
    }
    
    try {
      // Delete installations one by one
      const results = await Promise.all(
        selectedInstallations.map(async (installation) => {
          console.log('[PAGE] Deleting installation in batch', { 
            id: installation.id, 
            number: installation.installationNumber 
          });
          
          try {
            await storeDeleteInstallation(installation.id);
            console.log('[PAGE] Successfully deleted installation in batch', { id: installation.id });
            return { success: true, id: installation.id };
          } catch (error) {
            console.error('[PAGE] Failed to delete installation in batch', { 
              id: installation.id, 
              error: error instanceof Error ? error.message : 'Unknown error' 
            });
            return { success: false, id: installation.id, error };
          }
        })
      );
      
      const successCount = results.filter(r => r.success).length;
      const failureCount = results.length - successCount;
      
      console.log('[PAGE] Batch deletion completed', { successCount, failureCount });
      
      if (failureCount > 0) {
        if (successCount > 0) {
          toast.warning(`${successCount} instalações excluídas com sucesso, mas ${failureCount} não puderam ser excluídas.`);
        } else {
          toast.error("Não foi possível excluir as instalações selecionadas.");
        }
        return Promise.reject(new Error(`Falha ao excluir ${failureCount} instalações`));
      }
      
      toast.success(`${successCount} instalações excluídas com sucesso.`);
      return Promise.resolve();
    } catch (error) {
      console.error('[PAGE] Error in batch deletion process', { 
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      });
      toast.error("Erro ao excluir instalações: " + (error instanceof Error ? error.message : "Erro desconhecido"));
      return Promise.reject(error);
    }
  };

  // Handle refresh button click
  const handleRefreshClick = useCallback(() => {
    fetchInstallations();
  }, [fetchInstallations]);

  // Define columns with memoization to prevent recreation on each render
  const columns = useMemo<ColumnDef<Installation>[]>(
    () => [
      {
        accessorKey: 'installationNumber',
        header: 'Nº Instalação',
        cell: ({ row }) => <div className="font-mono">{row.getValue('installationNumber')}</div>,
      },
      {
        accessorKey: 'type',
        header: 'Tipo',
        cell: ({ row }) => {
          const type = row.getValue('type') as InstallationType;
          const { label, variant, icon } = getInstallationTypeProps(type);
          // @ts-expect-error Allow dynamic variant
          return <Badge variant={variant} className="flex w-fit items-center">{icon}{label}</Badge>;
        },
      },
      {
        accessorKey: 'status',
        header: 'Status',
        cell: ({ row }) => {
          const status = row.getValue('status') as InstallationStatus;
          const { label, className } = getInstallationStatusProps(status);
          return <Badge variant="outline" className={cn("flex w-fit items-center", className)}>{label}</Badge>;
        },
      },
      {
        accessorKey: 'distributor.name',
        header: 'Distribuidora',
        cell: ({ row }) => row.original.distributor?.name || <span className="text-muted-foreground">N/A</span>,
      },
      {
        accessorKey: 'owner.name',
        header: 'Proprietário',
        cell: ({ row }) => row.original.owner?.name || row.original.owner?.email || <span className="text-muted-foreground">N/A</span>,
      },
      {
        accessorKey: 'address',
        header: 'Endereço',
        cell: ({ row }) => {
          const address = row.original.address;
          if (!address) return <span className="text-muted-foreground">N/A</span>;
          return `${address.street}, ${address.number} - ${address.city}`;
        },
      },
      {
        accessorKey: 'createdAt',
        header: 'Criado em',
        cell: ({ row }) => formatDatePtBr(row.getValue('createdAt')),
      },
      {
        id: 'actions',
        header: 'Ações',
        cell: ({ row }) => {
          const installation = row.original as unknown as Installation;
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
                <DropdownMenuItem onClick={() => handleOpenDialog(installation)}>
                  <Edit className="mr-2 h-4 w-4" />
                  <span>Editar</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSelectedInstallation(installation)} className="text-destructive">
                  <Trash2 className="mr-2 h-4 w-4" />
                  <span>Excluir</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          );
        },
      },
    ], [handleOpenDialog, setSelectedInstallation, getInstallationTypeProps, getInstallationStatusProps]); // Add formatDatePtBr to dependencies

  // Memoize the dialog content to prevent unnecessary re-renders
  const DialogFormContent = useMemo(() => {
    return (
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>{selectedInstallation ? 'Editar Instalação' : 'Cadastrar Nova Instalação'}</DialogTitle>
          <DialogDescription>
            {selectedInstallation ? 'Atualize as informações da instalação.' : 'Preencha os dados para cadastrar uma nova instalação.'}
          </DialogDescription>
        </DialogHeader>
         {error && (
            <div className="mb-4 flex items-center gap-2 rounded-md border border-destructive bg-destructive/10 p-3 text-sm text-destructive">
                <AlertCircle className="h-4 w-4"/>
                {error}
            </div>
        )}
        <InstallationFormContent
          form={form}
          selectedInstallation={selectedInstallation}
          error={error}
          loadingDistributors={loadingDistributors}
          isFormSubmitting={isFormSubmitting}
          distributors={distributors}
          filteredUsers={filteredUsers}
          onSubmit={onSubmit}
          onClose={handleCloseDialog}
        />
      </DialogContent>
    );
  // Add isFormSubmitting to dependencies
  }, [selectedInstallation, error, form, onSubmit, loadingDistributors, isFormSubmitting, distributors, filteredUsers, handleCloseDialog]);

  // Define handleStatusChange function
  const handleStatusChange = useCallback(async (id: string, status: InstallationStatus) => {
    try {
      debug.info('Alterando status da instalação', { id, status });
      await updateInstallationStatus(id, status);
      debug.info('Status da instalação alterado com sucesso', { id, status });
      toast.success(`Status da instalação alterado para ${
        status === InstallationStatus.ACTIVE ? 'Ativa' : 'Inativa'
      }.`);
    } catch (error) {
      debug.error('Erro ao atualizar status da instalação', { id, status, error });
      toast.error(`Erro ao atualizar status: ${error instanceof Error ? error.message : "Erro desconhecido"}`);
    }
  }, [updateInstallationStatus, debug]);

  // Callback para visualização de consumo
  const handleViewConsumption = useCallback((installation: Installation) => {
    // TODO: Implement view consumption action
    toast.info("Esta funcionalidade será implementada em breve.");
  }, []);

  return (
    <div className="container mx-auto p-6 space-y-6 h-full flex flex-col">
       <Card className="flex-1 overflow-hidden flex flex-col border-primary/20 dark:border-primary/30 shadow-md">
        <CardHeader className="pb-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <CardTitle>Gerenciamento de Instalações</CardTitle>
              <CardDescription>Cadastre, visualize e gerencie as instalações (medidores).</CardDescription>
            </div>
             <div className='flex items-center gap-2'>
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="search"
                    placeholder="Buscar instalação, distribuidor, proprietário..."
                    value={searchText}
                    onChange={handleSearchChange}
                    className="pl-8 w-[260px] lg:w-[320px] border border-primary/40 focus:border-primary/90 hover:border-primary/40 hover:bg-primary/10 transition-all"
                  />
                </div>
                <Button variant="outline" size="icon" onClick={handleRefreshClick} disabled={loading || loadingDistributors}>
                    <RefreshCw className={`h-4 w-4 ${loading || loadingDistributors ? "animate-spin" : ""}`} />
                </Button>
                <ViewToggle mode={viewMode} onToggle={setViewMode} />
                <Button onClick={() => handleOpenDialog()} disabled={loadingDistributors}>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Nova Instalação
                    {loadingDistributors && <span className="ml-2 text-xs">(Carregando opções...)</span>}
                </Button>
            </div>
          </div>
        </CardHeader>

        <div className="px-6 pt-2 pb-4 flex flex-wrap gap-2 items-center">
          <Badge variant="outline" className="flex items-center gap-2">
            <Filter className="h-3.5 w-3.5" />
            <span>Filtros:</span>
          </Badge>

          <TypeFilterSelect value={typeFilter} onChange={handleTypeFilterChange} disabled={loading} />

          <DistributorFilterSelect value={distributorFilter} onChange={handleDistributorFilterChange} disabled={loading || loadingDistributors} distributors={distributors} />

          <OwnerFilterSelect value={ownerFilter} onChange={handleOwnerFilterChange} disabled={loading || usersLoading} users={filteredUsers} />

          {(typeFilter !== 'all' || distributorFilter !== 'all' || ownerFilter !== 'all' || searchText) && (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleClearFilters} 
              className="h-8 text-xs text-muted-foreground hover:text-foreground"
            >
              <X className="h-3.5 w-3.5 mr-1" />
              Limpar filtros
            </Button>
          )}
        </div>

        <CardContent className="flex-grow overflow-auto pt-2 px-4 pb-6">
          {error && !loading && (
              <div className="mb-4 flex items-center gap-2 rounded-md border border-destructive bg-destructive/10 p-3 text-sm text-destructive">
                  <AlertCircle className="h-4 w-4"/>
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
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mt-6"
              >
                {filteredInstallations.length > 0 ? (
                  filteredInstallations.map((installation, index) => {
                    console.log('AdminInstallationsPage: Rendering card for installation', { 
                      id: installation.id, 
                      number: installation.installationNumber,
                      type: installation.type
                    });
                    return (
                      <InstallationCard
                        key={installation.id}
                        installation={installation}
                        index={index}
                        onEdit={handleOpenDialog}
                        onDelete={(installation) => {
                          setSelectedInstallation(installation);
                          setConfirmDelete(true);
                        }}
                        onViewConsumption={handleViewConsumption}
                        onStatusChange={handleStatusChange}
                      />
                    );
                  })
                ) : (
                  <div className="col-span-full text-center py-10 text-muted-foreground">
                    Nenhuma instalação encontrada
                    {searchText || typeFilter || distributorFilter || ownerFilter ? ' com os filtros aplicados.' : '.'}
                  </div>
                )}
              </motion.div>
            ) : (
              <div className="relative">
                <InstallationTable
                  installations={filteredInstallations as any}
                  loading={loading}
                  error={error}
                  onEdit={(installation) => handleOpenDialog(installation as any)}
                  onDelete={(installation) => setSelectedInstallation(installation as any)}
                  onViewDetails={(installation) => {
                    // Handle view details action
                    toast.info(`Ver detalhes da instalação ${installation.installationNumber} (a implementar)`);
                  }}
                  onViewConsumption={(installation) => {
                    // Handle view consumption action
                    toast.info(`Ver consumo da instalação ${installation.installationNumber} (a implementar)`);
                  }}
                  formatDate={formatDatePtBr}
                  formatEnergy={formatEnergy}
                  formatCurrency={formatCurrency}
                  pageSize={10}
                  emptyMessage={
                    loading
                      ? "Carregando instalações..."
                      : filteredInstallations.length === 0 && searchText
                      ? `Nenhuma instalação encontrada para "${searchText}".`
                      : "Nenhuma instalação cadastrada."
                  }
                  onDeleteMultiple={handleDeleteMultipleInstallations as any}
                />
              </div>
            )}
          </AnimatePresence>
        </CardContent>
      </Card>

      {/* Dialog for Create/Edit Installation */}
      <Dialog open={open} onOpenChange={handleCloseDialog}>
        {DialogFormContent}
      </Dialog>

      {/* Confirm Delete Dialog */}
      <ConfirmAlert
        isOpen={!!selectedInstallation && confirmDelete}
        onClose={() => setConfirmDelete(false)}
        onConfirm={handleDeleteInstallation}
        title="Excluir Instalação"
        description={`Tem certeza que deseja excluir a instalação Nº "${selectedInstallation?.installationNumber}"? Esta ação não pode ser desfeita.`}
        confirmText="Excluir"
        cancelText="Cancelar"
        variant="destructive"
        isProcessing={loadingDistributors}
      />

      {/* Debug Information */}
      {process.env.NODE_ENV === 'development' && (
        <div className="mt-8 p-4 border border-red-500 bg-red-50 dark:bg-red-950 dark:border-red-800 rounded-md">
          <h3 className="text-lg font-bold text-red-700 dark:text-red-400">Debug Information</h3>
          <div className="mt-2 text-sm">
            <div><strong>Loading State:</strong> {loading ? 'Loading...' : 'Not Loading'}</div>
            <div><strong>Error:</strong> {error || 'No Error'}</div>
            <div><strong>Installations Count:</strong> {installations?.length || 0}</div>
            <div><strong>Filtered Installations Count:</strong> {filteredInstallations?.length || 0}</div>
            <div><strong>View Mode:</strong> {viewMode}</div>
            <div><strong>Filters:</strong> Type: {typeFilter}, Distributor: {distributorFilter}, Owner: {ownerFilter}, Search: {searchText || 'None'}</div>
            <div className="mt-2">
              <strong>Sample Installation Data:</strong>
              {installations && installations.length > 0 ? (
                <pre className="mt-1 p-2 bg-gray-100 dark:bg-gray-800 rounded text-xs overflow-auto max-h-40">
                  {JSON.stringify({
                    id: installations[0].id,
                    installationNumber: installations[0].installationNumber,
                    type: installations[0].type,
                    status: installations[0].status,
                    distributorId: installations[0].distributorId,
                    ownerId: installations[0].ownerId
                  }, null, 2)}
                </pre>
              ) : (
                <span className="text-red-500"> No installations available</span>
              )}
            </div>
          </div>
          <div className="mt-4 flex gap-2">
            <Button 
              size="sm" 
              onClick={() => fetchInstallations()} 
              variant="destructive"
            >
              Refresh Data
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}