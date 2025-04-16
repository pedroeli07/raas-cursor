// path: /admin/dashboard
'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { useUserManagementStore } from '@/store/userManagementStore';
import { useDistributorStore } from '@/store/distributorStore';
import { useInstallationStore } from '@/store/installationStore';
import { Badge } from '@/components/ui/badge';
import { cn, formatDate } from '@/lib/utils/utils';
import { InstallationType, Installation } from '@prisma/client';
import { frontendLog as log } from '@/lib/logs/logger';
import { 
  Users, 
  Zap, 
  CreditCard, 
  Home, 
  ChevronRight,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';
import { User, Distributor, UserRole } from '@/lib/types/app-types';


// Componente Card
const Card = ({ title, value, description, icon, color = 'primary', trend = null }: { 
  title: string;
  value: string | number;
  description?: string;
  icon: React.ReactNode;
  color?: 'primary' | 'green' | 'orange' | 'purple' | 'pink';
  trend?: 'up' | 'down' | null;
}) => {
  const colorClasses = {
    primary: 'from-primary/10 to-primary-accent/5 text-primary-accent',
    green: 'from-green-500/10 to-green-600/5 text-green-600 dark:text-green-400',
    orange: 'from-orange-500/10 to-orange-600/5 text-orange-600 dark:text-orange-400',
    purple: 'from-purple-500/10 to-purple-600/5 text-purple-600 dark:text-purple-400',
    pink: 'from-pink-500/10 to-pink-600/5 text-pink-600 dark:text-pink-400',
  };

  return (
    <div className="bg-card border border-border rounded-xl shadow-sm hover:shadow-md transition-all overflow-hidden">
      <div className="p-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium text-muted-foreground">{title}</h3>
          <div className={`w-10 h-10 flex items-center justify-center rounded-xl bg-gradient-to-br ${colorClasses[color]}`}>
            {icon}
          </div>
        </div>
        <div className="space-y-1">
          <p className="text-2xl font-semibold text-foreground">{value}</p>
          {description && (
            <p className="text-sm flex items-center">
              {trend === 'up' && <ArrowUpRight className="mr-1 h-3 w-3 text-green-500" />}
              {trend === 'down' && <ArrowDownRight className="mr-1 h-3 w-3 text-red-500" />}
              <span className={cn(
                "text-muted-foreground",
                trend === 'up' && "text-green-600 dark:text-green-400",
                trend === 'down' && "text-red-600 dark:text-red-400"
              )}>
                {description}
              </span>
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

// Componente ChartCard
const ChartCard = ({ title, children }: { title: string; children: React.ReactNode }) => {
  const [isOpen, setIsOpen] = useState(true);
  
  return (
    <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
      <div className="flex items-center justify-between p-5 border-b border-border">
        <h3 className="font-medium text-foreground">{title}</h3>
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setIsOpen(!isOpen)}
            className="p-1 hover:bg-muted/30 rounded-full transition-colors"
            aria-expanded={isOpen}
            aria-label={isOpen ? "Recolher" : "Expandir"}
          >
            {isOpen ? (
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 text-muted-foreground">
                <path fillRule="evenodd" d="M4 10a.75.75 0 01.75-.75h10.5a.75.75 0 010 1.5H4.75A.75.75 0 014 10z" clipRule="evenodd" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 text-muted-foreground">
                <path d="M10.75 4.75a.75.75 0 00-1.5 0v4.5h-4.5a.75.75 0 000 1.5h4.5v4.5a.75.75 0 001.5 0v-4.5h4.5a.75.75 0 000-1.5h-4.5v-4.5z" />
              </svg>
            )}
          </button>
        </div>
      </div>
      <div className={`p-5 transition-all duration-300 ease-in-out ${isOpen ? 'h-auto opacity-100 visible' : 'h-0 opacity-0 invisible overflow-hidden'}`}>
        {children}
      </div>
    </div>
  );
};

// Componente Table for distributors
const DistributorsTable = ({ distributors }: { distributors: (Distributor & { installationCount?: number })[] }) => {
  const formatCurrency = useCallback((value: number): string => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 2,
      maximumFractionDigits: 5,
    }).format(value);
  }, []);

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[500px]">
        <thead>
          <tr className="border-b border-border">
            <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Distribuidora</th>
            <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Instalações</th>
            <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Preço kWh</th>
            <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground">Ações</th>
          </tr>
        </thead>
        <tbody>
          {distributors?.length > 0 ? (
            distributors.map((distributor) => (
              <tr key={distributor.id} className="border-b border-border hover:bg-muted/10">
                <td className="py-3 px-4 text-sm">{distributor.name}</td>
                <td className="py-3 px-4 text-sm">{distributor.installationCount ?? 0}</td>
                <td className="py-3 px-4 text-sm">
                  {formatCurrency(distributor.pricePerKwh ?? 0)}
                </td>
                <td className="py-3 px-4 text-sm text-right">
                  <Link href={`/admin/distribuidoras?id=${distributor.id}`} className="text-primary-accent hover:text-primary-accent/80">
                    Detalhes
                  </Link>
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={4} className="py-6 text-center text-muted-foreground">
                Nenhuma distribuidora encontrada
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};

// Recent activity component
const RecentActivity = ({ users, installations }: { users: User[], installations: Installation[] }) => {
  // Get the 3 most recent users and installations
  const recentUsers = useMemo(() => {
    if (!Array.isArray(users)) return [];
    return [...users]
      .sort((a, b) => new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime())
      .slice(0, 3);
  }, [users]);

  const recentInstallations = useMemo(() => {
    if (!Array.isArray(installations)) return [];
    return [...installations]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 3);
  }, [installations]);

  // Use imported formatDate
  const formatRelativeDate = useCallback((date: Date | string | undefined): string => {
    if (!date) return 'Data desconhecida';
    return formatDate(new Date(date));
  }, []);

  // Helper to get role label
  const getRoleLabel = (role: UserRole) => {
    switch (role) {
      case UserRole.CUSTOMER: return 'cliente';
      case UserRole.ENERGY_RENTER: return 'locador';
      case UserRole.ADMIN: return 'admin';
      case UserRole.SUPER_ADMIN: return 'super admin';
      case UserRole.ADMIN_STAFF: return 'staff';
      default: return 'usuário';
    }
  };

  return (
    <div className="space-y-4">
      {recentUsers.map(user => (
        <div key={user.id} className="flex items-start gap-4">
          <div className="mt-1 w-9 h-9 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
            <Users className="w-5 h-5 text-primary" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-medium text-foreground">Novo usuário registrado</span>
              <span className="text-xs text-muted-foreground">{formatRelativeDate(user.createdAt)}</span>
            </div>
            <p className="text-sm text-muted-foreground mt-0.5">
              {user.name || user.email} foi registrado como {getRoleLabel(user.role)}.
            </p>
          </div>
        </div>
      ))}

      {recentInstallations.map(installation => (
        <div key={installation.id} className="flex items-start gap-4">
          <div className="mt-1 w-9 h-9 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center flex-shrink-0">
            {installation.type === InstallationType.GENERATOR ? (
              <Zap className="w-5 h-5 text-green-600 dark:text-green-400" />
            ) : (
              <Home className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-medium text-foreground">
                Nova instalação {installation.type === InstallationType.GENERATOR ? 'geradora' : 'consumidora'}
              </span>
              <span className="text-xs text-muted-foreground">{formatRelativeDate(installation.createdAt)}</span>
            </div>
            <p className="text-sm text-muted-foreground mt-0.5">
              Instalação #{installation.installationNumber} foi registrada no sistema.
            </p>
          </div>
        </div>
      ))}

      {recentUsers.length === 0 && recentInstallations.length === 0 && (
        <div className="text-center py-6 text-muted-foreground">
          Nenhuma atividade recente registrada
        </div>
      )}
    </div>
  );
};

// Componente de página principal
export default function AdminDashboardPage() {
  const [timeRange, setTimeRange] = useState('month');
  const [loading, setLoading] = useState(true);
  // Import data from stores
  const { users = [], fetchUsers } = useUserManagementStore();
  const { distributors = [], fetchDistributors } = useDistributorStore();
  const { installations = [], fetchInstallations } = useInstallationStore();

  // Fetch all data on component mount
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        await Promise.all([
          fetchUsers(),
          fetchDistributors(),
          fetchInstallations()
        ]);
      } catch (error) {
        log.error("Error loading dashboard data", { error });
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [fetchUsers, fetchDistributors, fetchInstallations]);

  // Calculate statistics
  const stats = useMemo(() => {
    // Ensure data is loaded and is an array before processing
    const validUsers = Array.isArray(users) ? users : [];
    const validInstallations = Array.isArray(installations) ? installations : [];
    const validDistributors = Array.isArray(distributors) ? distributors : [];

    // User statistics
    const totalUsers = validUsers.length;
    const customerCount = validUsers.filter(user => user.role === UserRole.CUSTOMER).length;
    const renterCount = validUsers.filter(user => user.role === UserRole.ENERGY_RENTER).length;
    
    // Installation statistics
    const totalInstallations = validInstallations.length;
    const generatorCount = validInstallations.filter(
      installation => installation.type === InstallationType.GENERATOR
    ).length;
    const consumerCount = validInstallations.filter(
      installation => installation.type === InstallationType.CONSUMER
    ).length;

    // Distributor statistics with installation counts
    const distributorsWithCounts = validDistributors.map(distributor => ({
      ...distributor,
      installationCount: validInstallations.filter(installation => 
        installation.distributorId === distributor.id
      ).length
    }));

    // Estimate energy generation (just an example computation)
    // In a real app, this would come from actual energy data
    const estimatedEnergyGeneration = generatorCount * 500; // kWh per installation
    
    // Estimate revenue (example)
    const avgPricePerKwh = validDistributors.length > 0 
      ? validDistributors.reduce((sum, d) => sum + (d.pricePerKwh ?? 0), 0) / validDistributors.length
      : 0.85; // default if no distributors
    const estimatedRevenue = estimatedEnergyGeneration * avgPricePerKwh * 0.9; // 90% of the total value

    return {
      totalUsers,
      customerCount,
      renterCount,
      totalInstallations,
      generatorCount,
      consumerCount,
      distributorsWithCounts,
      estimatedEnergyGeneration,
      estimatedRevenue
    };
  }, [users, installations, distributors]);

  const isLoadingData = loading;

  return (
    <div className="space-y-6 p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <select 
            className="py-2 px-3 rounded-lg border border-border bg-card focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
          >
            <option value="month">Último mês</option>
            <option value="quarter">Último trimestre</option>
            <option value="year">Último ano</option>
            <option value="all">Todo período</option>
          </select>
          <button className="py-2 px-4 bg-muted hover:bg-muted/80 text-white rounded-lg transition-colors">
            Exportar
          </button>
        </div>
      </div>

      {/* Loading indicator */}
      {isLoadingData && (
        <div className="rounded-lg border border-dashed border-border p-8 text-center">
          <div className="animate-pulse flex flex-col items-center space-y-3">
              <div className="w-12 h-12 bg-muted rounded-full"></div>
              <div className="h-4 bg-muted rounded w-3/4"></div>
              <div className="h-3 bg-muted rounded w-1/2"></div>
          </div>
          <p className="mt-4 text-sm text-muted-foreground">Carregando dados do dashboard...</p>
        </div>
      )}

      {!isLoadingData && (
        <>
          {/* Cards de estatísticas */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card 
              title="Total de Usuários" 
              value={stats.totalUsers}
              description={`${stats.customerCount} clientes, ${stats.renterCount} locadores`} 
              icon={<Users className="h-6 w-6" />}
            />
            <Card 
              title="Energia Gerada (Estimada)" 
              value={`${stats.estimatedEnergyGeneration.toLocaleString('pt-BR')} kWh`}
              description="Baseado nas instalações ativas"
              icon={<Zap className="h-6 w-6" />}
              color="green"
            />
            <Card 
              title="Faturamento (Estimado)" 
              value={new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(stats.estimatedRevenue)}
              description="Baseado na geração estimada"
              icon={<CreditCard className="h-6 w-6" />}
              color="purple"
            />
            <Card 
              title="Instalações" 
              value={stats.totalInstallations}
              description={`${stats.generatorCount} geradoras, ${stats.consumerCount} consumidoras`}
              icon={<Home className="h-6 w-6" />}
              color="orange"
            />
          </div>

          {/* Gráficos e Tabelas */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ChartCard title="Geração de Energia por Mês (kWh)">
              <div className="h-[300px] flex items-center justify-center bg-muted/20 rounded-lg">
                <div className="text-center">
                  <p className="text-muted-foreground mb-2">Gráfico de Geração de Energia</p>
                  <p className="text-sm text-muted-foreground/70">
                    (Em um ambiente real, este seria um componente de gráfico conectado aos dados reais de geração)
                  </p>
                </div>
              </div>
            </ChartCard>

            <ChartCard title="Distribuição de Instalações">
              <div className="h-[300px] flex items-center justify-center bg-muted/20 rounded-lg">
                <div className="text-center">
                  <p className="text-muted-foreground mb-2">
                    {stats.generatorCount} Geradoras | {stats.consumerCount} Consumidoras
                  </p>
                  <p className="text-sm text-muted-foreground/70">
                    (Em um ambiente real, este seria um gráfico de pizza/donut com dados atualizados)
                  </p>
                </div>
              </div>
            </ChartCard>
          </div>

          {/* Tabela de Distribuidoras */}
          <ChartCard title="Distribuidoras">
            <DistributorsTable distributors={stats.distributorsWithCounts} />
            <div className="mt-4 text-right">
              <Link 
                href="/admin/distribuidoras" 
                className="inline-flex items-center text-sm text-primary-accent hover:text-primary/80"
              >
                Ver todas as distribuidoras
                <ChevronRight className="ml-1 h-4 w-4" />
              </Link>
            </div>
          </ChartCard>

          {/* Atividades Recentes */}
          <ChartCard title="Atividades Recentes">
            <RecentActivity users={users as User[]} installations={installations as Installation[]} />
            <div className="mt-4 text-right">
              <Link 
                href="/admin/atividades" 
                className="inline-flex items-center text-sm text-primary-accent hover:text-primary/80"
              >
                Ver todas as atividades
                <ChevronRight className="ml-1 h-4 w-4" />
              </Link>
            </div>
          </ChartCard>
        </>
      )}
    </div>
  );
} 