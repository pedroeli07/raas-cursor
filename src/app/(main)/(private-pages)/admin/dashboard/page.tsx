// path: /admin/dashboard
'use client';

import { useState } from 'react';
import Link from 'next/link';

// Componente Card
const Card = ({ title, value, description, icon, color = 'primary' }: { 
  title: string;
  value: string | number;
  description?: string;
  icon: React.ReactNode;
  color?: 'primary' | 'green' | 'orange' | 'purple' | 'pink';
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
          {description && <p className="text-sm text-muted-foreground">{description}</p>}
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
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 text-muted-foreground">
              {isOpen ? (
                <path d="M10.75 6.75a.75.75 0 00-1.5 0v2.5h-2.5a.75.75 0 000 1.5h2.5v2.5a.75.75 0 001.5 0v-2.5h2.5a.75.75 0 000-1.5h-2.5v-2.5z" />
              ) : (
                <path fillRule="evenodd" d="M4 10a.75.75 0 01.75-.75h10.5a.75.75 0 010 1.5H4.75A.75.75 0 014 10z" clipRule="evenodd" />
              )}
            </svg>
          </button>
        </div>
      </div>
      <div className={`p-5 transition-all duration-300 ease-in-out ${isOpen ? 'h-auto opacity-100' : 'h-0 opacity-0 overflow-hidden'}`}>
        {children}
      </div>
    </div>
  );
};

// Componente Table
const Table = () => {
  const data = [
    { id: 1, distributor: 'CEMIG', totalUsers: 125, totalCredits: '14.532 kWh', status: 'Ativo' },
    { id: 2, distributor: 'CPFL', totalUsers: 98, totalCredits: '10.245 kWh', status: 'Ativo' },
    { id: 3, distributor: 'Enel', totalUsers: 73, totalCredits: '8.720 kWh', status: 'Pendente' },
    { id: 4, distributor: 'Light', totalUsers: 45, totalCredits: '5.340 kWh', status: 'Ativo' },
    { id: 5, distributor: 'EDP', totalUsers: 37, totalCredits: '4.125 kWh', status: 'Inativo' },
  ];

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[500px]">
        <thead>
          <tr className="border-b border-border">
            <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Distribuidora</th>
            <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Total de Usuários</th>
            <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Créditos Totais</th>
            <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Status</th>
            <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground">Ações</th>
          </tr>
        </thead>
        <tbody>
          {data.map((row) => (
            <tr key={row.id} className="border-b border-border hover:bg-muted/10">
              <td className="py-3 px-4 text-sm">{row.distributor}</td>
              <td className="py-3 px-4 text-sm">{row.totalUsers}</td>
              <td className="py-3 px-4 text-sm">{row.totalCredits}</td>
              <td className="py-3 px-4 text-sm">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                  ${row.status === 'Ativo' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' : ''}
                  ${row.status === 'Pendente' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400' : ''}
                  ${row.status === 'Inativo' ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' : ''}
                `}>
                  {row.status}
                </span>
              </td>
              <td className="py-3 px-4 text-sm text-right">
                <button className="text-primary-accent hover:text-primary-accent/80">
                  Detalhes
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

// Componente de página principal
export default function AdminDashboardPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <div className="flex items-center gap-2">
          <select className="py-2 px-3 rounded-lg border border-border bg-card focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all">
            <option value="month">Último mês</option>
            <option value="quarter">Último trimestre</option>
            <option value="year">Último ano</option>
            <option value="all">Todo período</option>
          </select>
          <button className="py-2 px-4 bg-primary hover:bg-primary-accent text-white rounded-lg transition-colors">
            Exportar
          </button>
        </div>
      </div>

      {/* Cards de estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card 
          title="Total de Usuários" 
          value="378"
          description="↑ 12% em relação ao mês anterior" 
          icon={
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 24 24" fill="currentColor">
              <path d="M4.5 6.375a4.125 4.125 0 118.25 0 4.125 4.125 0 01-8.25 0zM14.25 8.625a3.375 3.375 0 116.75 0 3.375 3.375 0 01-6.75 0zM1.5 19.125a7.125 7.125 0 0114.25 0v.003l-.001.119a.75.75 0 01-.363.63 13.067 13.067 0 01-6.761 1.873c-2.472 0-4.786-.684-6.76-1.873a.75.75 0 01-.364-.63l-.001-.122zM17.25 19.128l-.001.144a2.25 2.25 0 01-.233.96 10.088 10.088 0 005.06-1.01.75.75 0 00.42-.643 4.875 4.875 0 00-6.957-4.611 8.586 8.586 0 011.71 5.157v.003z" />
            </svg>
          }
        />
        <Card 
          title="Energia Gerada" 
          value="45.832 kWh"
          description="↑ 8% em relação ao mês anterior"
          icon={
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 24 24" fill="currentColor">
              <path fillRule="evenodd" d="M14.615 1.595a.75.75 0 01.359.852L12.982 9.75h7.268a.75.75 0 01.548 1.262l-10.5 11.25a.75.75 0 01-1.272-.71l1.992-7.302H3.75a.75.75 0 01-.548-1.262l10.5-11.25a.75.75 0 01.913-.143z" clipRule="evenodd" />
            </svg>
          }
          color="green"
        />
        <Card 
          title="Faturamento" 
          value="R$ 182.459,00"
          description="↑ 15% em relação ao mês anterior"
          icon={
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 7.5a2.25 2.25 0 100 4.5 2.25 2.25 0 000-4.5z" />
              <path fillRule="evenodd" d="M1.5 4.875C1.5 3.839 2.34 3 3.375 3h17.25c1.035 0 1.875.84 1.875 1.875v9.75c0 1.036-.84 1.875-1.875 1.875H3.375A1.875 1.875 0 011.5 14.625v-9.75zM8.25 9.75a3.75 3.75 0 117.5 0 3.75 3.75 0 01-7.5 0zM18.75 9a.75.75 0 00-.75.75v.008c0 .414.336.75.75.75h.008a.75.75 0 00.75-.75V9.75a.75.75 0 00-.75-.75h-.008zM4.5 9.75A.75.75 0 015.25 9h.008a.75.75 0 01.75.75v.008a.75.75 0 01-.75.75H5.25a.75.75 0 01-.75-.75V9.75z" clipRule="evenodd" />
              <path d="M2.25 18a.75.75 0 000 1.5c5.4 0 10.63.722 15.6 2.075 1.19.324 2.4-.558 2.4-1.82V18.75a.75.75 0 00-.75-.75H2.25z" />
            </svg>
          }
          color="purple"
        />
        <Card 
          title="Novas Instalações" 
          value="28"
          description="↑ 5% em relação ao mês anterior"
          icon={
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 24 24" fill="currentColor">
              <path d="M11.47 3.84a.75.75 0 011.06 0l8.69 8.69a.75.75 0 101.06-1.06l-8.689-8.69a2.25 2.25 0 00-3.182 0l-8.69 8.69a.75.75 0 001.061 1.06l8.69-8.69z" />
              <path d="M12 5.432l8.159 8.159c.03.03.06.058.091.086v6.198c0 1.035-.84 1.875-1.875 1.875H15a.75.75 0 01-.75-.75v-4.5a.75.75 0 00-.75-.75h-3a.75.75 0 00-.75.75V21a.75.75 0 01-.75.75H5.625a1.875 1.875 0 01-1.875-1.875v-6.198a2.29 2.29 0 00.091-.086L12 5.43z" />
            </svg>
          }
          color="orange"
        />
      </div>

      {/* Gráficos e Tabelas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard title="Geração de Energia (kWh)">
          <div className="h-[300px] flex items-center justify-center bg-muted/20 rounded-lg">
            <div className="text-center">
              <p className="text-muted-foreground mb-2">Gráfico de Geração de Energia</p>
              <p className="text-sm text-muted-foreground/70">
                (Em um ambiente real, este seria um componente de gráfico)
              </p>
            </div>
          </div>
        </ChartCard>

        <ChartCard title="Distribuição de Créditos">
          <div className="h-[300px] flex items-center justify-center bg-muted/20 rounded-lg">
            <div className="text-center">
              <p className="text-muted-foreground mb-2">Gráfico de Distribuição de Créditos</p>
              <p className="text-sm text-muted-foreground/70">
                (Em um ambiente real, este seria um gráfico de pizza/donut)
              </p>
            </div>
          </div>
        </ChartCard>
      </div>

      {/* Tabela de Distribuidoras */}
      <ChartCard title="Distribuidoras">
        <Table />
      </ChartCard>

      {/* Atividades Recentes */}
      <ChartCard title="Atividades Recentes">
        <div className="space-y-4">
          <div className="flex items-start gap-4">
            <div className="mt-1 w-9 h-9 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-primary">
                <path d="M4.5 6.375a4.125 4.125 0 118.25 0 4.125 4.125 0 01-8.25 0zM14.25 8.625a3.375 3.375 0 116.75 0 3.375 3.375 0 01-6.75 0zM1.5 19.125a7.125 7.125 0 0114.25 0v.003l-.001.119a.75.75 0 01-.363.63 13.067 13.067 0 01-6.761 1.873c-2.472 0-4.786-.684-6.76-1.873a.75.75 0 01-.364-.63l-.001-.122zM17.25 19.128l-.001.144a2.25 2.25 0 01-.233.96 10.088 10.088 0 005.06-1.01.75.75 0 00.42-.643 4.875 4.875 0 00-6.957-4.611 8.586 8.586 0 011.71 5.157v.003z" />
              </svg>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-medium text-foreground">Novo cliente registrado</span>
                <span className="text-xs text-muted-foreground">Há 2 horas</span>
              </div>
              <p className="text-sm text-muted-foreground mt-0.5">Maria Silva foi registrada como cliente com 2 instalações.</p>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <div className="mt-1 w-9 h-9 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center flex-shrink-0">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-green-600 dark:text-green-400">
                <path fillRule="evenodd" d="M14.615 1.595a.75.75 0 01.359.852L12.982 9.75h7.268a.75.75 0 01.548 1.262l-10.5 11.25a.75.75 0 01-1.272-.71l1.992-7.302H3.75a.75.75 0 01-.548-1.262l10.5-11.25a.75.75 0 01.913-.143z" clipRule="evenodd" />
              </svg>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-medium text-foreground">Instalação ativada</span>
                <span className="text-xs text-muted-foreground">Há 5 horas</span>
              </div>
              <p className="text-sm text-muted-foreground mt-0.5">Instalação #12458 foi ativada e começou a gerar energia.</p>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <div className="mt-1 w-9 h-9 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center flex-shrink-0">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-purple-600 dark:text-purple-400">
                <path d="M12 7.5a2.25 2.25 0 100 4.5 2.25 2.25 0 000-4.5z" />
                <path fillRule="evenodd" d="M1.5 4.875C1.5 3.839 2.34 3 3.375 3h17.25c1.035 0 1.875.84 1.875 1.875v9.75c0 1.036-.84 1.875-1.875 1.875H3.375A1.875 1.875 0 011.5 14.625v-9.75zM8.25 9.75a3.75 3.75 0 117.5 0 3.75 3.75 0 01-7.5 0zM18.75 9a.75.75 0 00-.75.75v.008c0 .414.336.75.75.75h.008a.75.75 0 00.75-.75V9.75a.75.75 0 00-.75-.75h-.008zM4.5 9.75A.75.75 0 015.25 9h.008a.75.75 0 01.75.75v.008a.75.75 0 01-.75.75H5.25a.75.75 0 01-.75-.75V9.75z" clipRule="evenodd" />
                <path d="M2.25 18a.75.75 0 000 1.5c5.4 0 10.63.722 15.6 2.075 1.19.324 2.4-.558 2.4-1.82V18.75a.75.75 0 00-.75-.75H2.25z" />
              </svg>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-medium text-foreground">Pagamento recebido</span>
                <span className="text-xs text-muted-foreground">Há 1 dia</span>
              </div>
              <p className="text-sm text-muted-foreground mt-0.5">Pagamento de R$ 3.540,00 foi recebido de João Oliveira.</p>
            </div>
          </div>
        </div>
      </ChartCard>
    </div>
  );
} 