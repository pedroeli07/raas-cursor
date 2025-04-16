// src/app/(main)/(private-pages)/admin/financeiro/relatorios/page.tsx

'use client';

import { useState } from 'react';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  DownloadIcon,
  FileSpreadsheetIcon,
  FileTextIcon,
  FilterIcon,
  PieChartIcon,
  RefreshCcwIcon,
  SearchIcon
} from 'lucide-react';
import ClientSelection from '@/components/client/ClientSelection';
import InstallationSelection from '@/components/installation/InstallationSelection';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';

// Mock data para demonstração
const RELATORIOS_MOCK = [
  {
    id: '1',
    cliente: 'Gracie Barra BH',
    instalacao: '3014657899',
    distribuidora: 'CEMIG',
    mesReferencia: '07/2023',
    dataVencimento: '2023-08-10',
    valorTotal: 1245.67,
    valorKwh: 0.92,
    consumoKwh: 950,
    compensacaoKwh: 750,
    desconto: 12,
    status: 'pago'
  },
  {
    id: '2',
    cliente: 'Gracie Barra BH',
    instalacao: '3011883117',
    distribuidora: 'CEMIG',
    mesReferencia: '07/2023',
    dataVencimento: '2023-08-10',
    valorTotal: 823.45,
    valorKwh: 0.92,
    consumoKwh: 720,
    compensacaoKwh: 520,
    desconto: 12,
    status: 'pago'
  },
  {
    id: '3',
    cliente: 'Gracie Barra BH',
    instalacao: '3004402254',
    distribuidora: 'CEMIG',
    mesReferencia: '08/2023',
    dataVencimento: '2023-09-10',
    valorTotal: 1356.78,
    valorKwh: 0.97,
    consumoKwh: 980,
    compensacaoKwh: 790,
    desconto: 12,
    status: 'pendente'
  },
  {
    id: '4',
    cliente: 'Cliente Empresa LTDA',
    instalacao: '3055781234',
    distribuidora: 'CEMIG',
    mesReferencia: '08/2023',
    dataVencimento: '2023-09-15',
    valorTotal: 2345.67,
    valorKwh: 0.97,
    consumoKwh: 1850,
    compensacaoKwh: 1450,
    desconto: 15,
    status: 'pendente'
  },
  {
    id: '5',
    cliente: 'Loja Exemplo S.A.',
    instalacao: '2187654321',
    distribuidora: 'ENEL',
    mesReferencia: '07/2023',
    dataVencimento: '2023-08-20',
    valorTotal: 3456.78,
    valorKwh: 1.05,
    consumoKwh: 2800,
    compensacaoKwh: 2200,
    desconto: 10,
    status: 'pago'
  },
  {
    id: '6',
    cliente: 'Loja Exemplo S.A.',
    instalacao: '2187654321',
    distribuidora: 'ENEL',
    mesReferencia: '08/2023',
    dataVencimento: '2023-09-20',
    valorTotal: 3567.89,
    valorKwh: 1.05,
    consumoKwh: 2850,
    compensacaoKwh: 2300,
    desconto: 10,
    status: 'atrasado'
  },
  {
    id: '7',
    cliente: 'Padaria Pão Dourado',
    instalacao: '2198765432',
    distribuidora: 'LIGHT',
    mesReferencia: '08/2023',
    dataVencimento: '2023-09-05',
    valorTotal: 876.54,
    valorKwh: 0.89,
    consumoKwh: 730,
    compensacaoKwh: 530,
    desconto: 18,
    status: 'pendente'
  }
];

export default function RelatoriosPage() {
  const [filtros, setFiltros] = useState({
    cliente: '',
    instalacao: '',
    distribuidora: '',
    periodo: '3', // Últimos 3 meses
    status: '',
  });
  
  const [relatorios, setRelatorios] = useState(RELATORIOS_MOCK);
  
  // Estado para o tab atual
  const [tabAtivo, setTabAtivo] = useState('faturas');

  // Atualiza um filtro
  const atualizarFiltro = (campo: string, valor: string) => {
    setFiltros(prev => ({
      ...prev,
      [campo]: valor
    }));
  };

  // Reseta os filtros
  const limparFiltros = () => {
    setFiltros({
      cliente: '',
      instalacao: '',
      distribuidora: '',
      periodo: '3',
      status: '',
    });
    setRelatorios(RELATORIOS_MOCK);
  };

  // Aplica os filtros aos relatórios
  const aplicarFiltros = () => {
    let resultados = [...RELATORIOS_MOCK];
    
    if (filtros.cliente) {
      resultados = resultados.filter(r => r.cliente.includes(filtros.cliente));
    }
    
    if (filtros.instalacao) {
      resultados = resultados.filter(r => r.instalacao === filtros.instalacao);
    }
    
    if (filtros.distribuidora) {
      resultados = resultados.filter(r => r.distribuidora === filtros.distribuidora);
    }
    
    if (filtros.status) {
      resultados = resultados.filter(r => r.status === filtros.status);
    }
    
    // Filtragem por período seria implementada com datas reais
    // Aqui estamos apenas simulando
    
    setRelatorios(resultados);
  };

  // Formata o status do relatório
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pago':
        return <Badge className="bg-emerald-500">Pago</Badge>;
      case 'pendente':
        return <Badge className="bg-yellow-500">Pendente</Badge>;
      case 'atrasado':
        return <Badge className="bg-red-500">Atrasado</Badge>;
      default:
        return <Badge className="bg-gray-500">{status}</Badge>;
    }
  };

  // Mock para exportação
  const exportarRelatorio = (formato: string) => {
    console.log(`Exportando relatório em formato ${formato}`);
    alert(`O relatório será exportado em formato ${formato}`);
  };

  const getTotalFaturado = () => {
    return relatorios.reduce((total, r) => total + r.valorTotal, 0);
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Relatórios Financeiros</h1>
          <p className="text-muted-foreground">
            Acesse, filtre e exporte relatórios financeiros da plataforma RaaS.
          </p>
        </div>
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button>
              <DownloadIcon className="mr-2 h-4 w-4" />
              Exportar
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem onClick={() => exportarRelatorio('excel')}>
              <FileSpreadsheetIcon className="mr-2 h-4 w-4" />
              Excel
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => exportarRelatorio('pdf')}>
              <FileTextIcon className="mr-2 h-4 w-4" />
              PDF
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => exportarRelatorio('csv')}>
              <FileTextIcon className="mr-2 h-4 w-4" />
              CSV
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <Tabs value={tabAtivo} onValueChange={setTabAtivo} className="w-full">
        <TabsList className="grid w-full md:w-[600px] grid-cols-3">
          <TabsTrigger value="faturas">Faturas</TabsTrigger>
          <TabsTrigger value="consumo">Consumo</TabsTrigger>
          <TabsTrigger value="compensacao">Compensação</TabsTrigger>
        </TabsList>

        <div className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Filtros</CardTitle>
              <CardDescription>
                Filtre os relatórios por cliente, instalação, período e status
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="cliente">Cliente</Label>
                  <ClientSelection
                    selectedClientId={filtros.cliente}
                    onSelectClient={(id) => atualizarFiltro('cliente', id)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="instalacao">Instalação</Label>
                  <InstallationSelection
                    clientId={filtros.cliente}
                    selectedInstallationId={filtros.instalacao}
                    onSelectInstallation={(id) => atualizarFiltro('instalacao', id)}
                    disabled={!filtros.cliente}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="distribuidora">Distribuidora</Label>
                  <Select 
                    value={filtros.distribuidora} 
                    onValueChange={(value) => atualizarFiltro('distribuidora', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a distribuidora" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Todas</SelectItem>
                      <SelectItem value="CEMIG">CEMIG</SelectItem>
                      <SelectItem value="COPEL">COPEL</SelectItem>
                      <SelectItem value="CPFL">CPFL</SelectItem>
                      <SelectItem value="ENEL">ENEL</SelectItem>
                      <SelectItem value="LIGHT">LIGHT</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="periodo">Período</Label>
                  <Select 
                    value={filtros.periodo} 
                    onValueChange={(value) => atualizarFiltro('periodo', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o período" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">Último mês</SelectItem>
                      <SelectItem value="3">Últimos 3 meses</SelectItem>
                      <SelectItem value="6">Últimos 6 meses</SelectItem>
                      <SelectItem value="12">Último ano</SelectItem>
                      <SelectItem value="custom">Personalizado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <Select 
                    value={filtros.status} 
                    onValueChange={(value) => atualizarFiltro('status', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Todos</SelectItem>
                      <SelectItem value="pago">Pago</SelectItem>
                      <SelectItem value="pendente">Pendente</SelectItem>
                      <SelectItem value="atrasado">Atrasado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button variant="outline" onClick={limparFiltros}>
                <RefreshCcwIcon className="mr-2 h-4 w-4" />
                Limpar Filtros
              </Button>

              <Button onClick={aplicarFiltros}>
                <FilterIcon className="mr-2 h-4 w-4" />
                Aplicar Filtros
              </Button>
            </CardFooter>
          </Card>
        </div>

        <TabsContent value="faturas" className="mt-6">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Relatório de Faturas</CardTitle>
                  <CardDescription>
                    Visualize todas as faturas de acordo com os filtros selecionados
                  </CardDescription>
                </div>
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">Total Faturado</p>
                  <p className="text-2xl font-bold text-primary">{formatCurrency(getTotalFaturado())}</p>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Instalação</TableHead>
                      <TableHead>Distribuidora</TableHead>
                      <TableHead>Mês Ref.</TableHead>
                      <TableHead>Vencimento</TableHead>
                      <TableHead className="text-right">Valor Total</TableHead>
                      <TableHead className="text-center">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {relatorios.length > 0 ? (
                      relatorios.map((relatorio) => (
                        <TableRow key={relatorio.id}>
                          <TableCell className="font-medium">{relatorio.cliente}</TableCell>
                          <TableCell>{relatorio.instalacao}</TableCell>
                          <TableCell>{relatorio.distribuidora}</TableCell>
                          <TableCell>{relatorio.mesReferencia}</TableCell>
                          <TableCell>{formatDate(new Date(relatorio.dataVencimento))}</TableCell>
                          <TableCell className="text-right">{formatCurrency(relatorio.valorTotal)}</TableCell>
                          <TableCell className="text-center">{getStatusBadge(relatorio.status)}</TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={7} className="h-24 text-center">
                          Nenhum resultado encontrado.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="consumo" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Relatório de Consumo</CardTitle>
              <CardDescription>
                Análise detalhada do consumo de energia por cliente e instalação
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Consumo Total (kWh)</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {relatorios.reduce((total, r) => total + r.consumoKwh, 0).toLocaleString('pt-BR')} kWh
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Período: {filtros.periodo === '1' 
                        ? 'Último mês' 
                        : filtros.periodo === '3' 
                          ? 'Últimos 3 meses' 
                          : filtros.periodo === '6' 
                            ? 'Últimos 6 meses' 
                            : 'Último ano'}
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Média Mensal (kWh)</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {Math.round(relatorios.reduce((total, r) => total + r.consumoKwh, 0) / 
                        (relatorios.length > 0 ? relatorios.length : 1)).toLocaleString('pt-BR')} kWh
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Baseado em {relatorios.length} faturas
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Valor Médio do kWh</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {formatCurrency(relatorios.reduce((total, r) => total + r.valorKwh, 0) / 
                        (relatorios.length > 0 ? relatorios.length : 1))}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Variação: {formatCurrency(Math.min(...relatorios.map(r => r.valorKwh)))} - {formatCurrency(Math.max(...relatorios.map(r => r.valorKwh)))}
                    </p>
                  </CardContent>
                </Card>
              </div>
              
              <Separator className="my-6" />
              
              <div className="rounded-md border mt-6">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Instalação</TableHead>
                      <TableHead>Mês Ref.</TableHead>
                      <TableHead className="text-right">Consumo (kWh)</TableHead>
                      <TableHead className="text-right">Valor kWh</TableHead>
                      <TableHead className="text-right">Desconto</TableHead>
                      <TableHead className="text-right">Valor Final</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {relatorios.length > 0 ? (
                      relatorios.map((relatorio) => (
                        <TableRow key={`consumo-${relatorio.id}`}>
                          <TableCell className="font-medium">{relatorio.cliente}</TableCell>
                          <TableCell>{relatorio.instalacao}</TableCell>
                          <TableCell>{relatorio.mesReferencia}</TableCell>
                          <TableCell className="text-right">{relatorio.consumoKwh.toLocaleString('pt-BR')}</TableCell>
                          <TableCell className="text-right">{formatCurrency(relatorio.valorKwh)}</TableCell>
                          <TableCell className="text-right">{relatorio.desconto}%</TableCell>
                          <TableCell className="text-right">{formatCurrency(relatorio.valorTotal)}</TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={7} className="h-24 text-center">
                          Nenhum resultado encontrado.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="compensacao" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Relatório de Compensação</CardTitle>
              <CardDescription>
                Análise detalhada da energia compensada por cliente e instalação
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Compensação Total (kWh)</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {relatorios.reduce((total, r) => total + r.compensacaoKwh, 0).toLocaleString('pt-BR')} kWh
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Período: {filtros.periodo === '1' 
                        ? 'Último mês' 
                        : filtros.periodo === '3' 
                          ? 'Últimos 3 meses' 
                          : filtros.periodo === '6' 
                            ? 'Últimos 6 meses' 
                            : 'Último ano'}
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Taxa de Compensação</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {Math.round((relatorios.reduce((total, r) => total + r.compensacaoKwh, 0) / 
                        relatorios.reduce((total, r) => total + r.consumoKwh, 0)) * 100)}%
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Compensação vs. Consumo Total
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Economia Estimada</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {formatCurrency(relatorios.reduce((total, r) => 
                        total + (r.compensacaoKwh * r.valorKwh * (r.desconto / 100)), 0))}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Baseado nos descontos aplicados
                    </p>
                  </CardContent>
                </Card>
              </div>
              
              <Separator className="my-6" />
              
              <div className="rounded-md border mt-6">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Instalação</TableHead>
                      <TableHead>Mês Ref.</TableHead>
                      <TableHead className="text-right">Consumo (kWh)</TableHead>
                      <TableHead className="text-right">Compensação (kWh)</TableHead>
                      <TableHead className="text-right">Taxa</TableHead>
                      <TableHead className="text-right">Economia</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {relatorios.length > 0 ? (
                      relatorios.map((relatorio) => (
                        <TableRow key={`comp-${relatorio.id}`}>
                          <TableCell className="font-medium">{relatorio.cliente}</TableCell>
                          <TableCell>{relatorio.instalacao}</TableCell>
                          <TableCell>{relatorio.mesReferencia}</TableCell>
                          <TableCell className="text-right">{relatorio.consumoKwh.toLocaleString('pt-BR')}</TableCell>
                          <TableCell className="text-right">{relatorio.compensacaoKwh.toLocaleString('pt-BR')}</TableCell>
                          <TableCell className="text-right">
                            {Math.round((relatorio.compensacaoKwh / relatorio.consumoKwh) * 100)}%
                          </TableCell>
                          <TableCell className="text-right">
                            {formatCurrency(relatorio.compensacaoKwh * relatorio.valorKwh * (relatorio.desconto / 100))}
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={7} className="h-24 text-center">
                          Nenhum resultado encontrado.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
