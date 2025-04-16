'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useDistributorStore } from '@/store/distributorStore';
import { Distributor, Address, Installation, KwhPrice } from '@prisma/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertCircle } from 'lucide-react';
import { DataTable } from '@/components/ui/data-table';
import { ColumnDef } from '@tanstack/react-table';
import { formatDate, formatCurrency } from '@/lib/utils/utils';
import { frontendLog as log } from '@/lib/logs/logger';
// Potentially reuse or adapt the InstallationTable component
// import { InstallationTable } from '@/components/ux/InstallationTable';

// Extended Distributor type with relations
interface DistributorWithDetails extends Distributor {
  address?: Address | null;
  installations?: Installation[];
  pricePerKwh?: number; // This might be calculated in the API/store
  kwhPrices?: KwhPrice[]; // Optional: If we want to show price history
}

interface DistributorDetailsPageProps {
  distributorId: string;
}

export function DistributorDetailsPage({ distributorId }: DistributorDetailsPageProps) {
  // Assume store has fetchDistributorById and selectedDistributor state
  // This might require adding to the distributorStore
  const { 
    selectedDistributor, // Or a new state like detailedDistributor
    fetchDistributorById, // Needs to be added to the store
    isLoading, 
    error, 
    setError 
  } = useDistributorStore(); // Assuming useDistributorStore exists and has these

  const [distributorData, setDistributorData] = useState<DistributorWithDetails | null>(null);

  useEffect(() => {
    if (fetchDistributorById) { // Check if the function exists in the store
      log.info('Fetching distributor details', { distributorId });
      setError(null); // Clear previous errors
      fetchDistributorById(distributorId)
        .catch(err => {
          log.error('Error fetching distributor details', { distributorId, error: err });
        });
    } else {
      log.error('fetchDistributorById function not found in distributorStore');
      setError('Erro interno: Funcionalidade de busca não encontrada.');
    }
  }, [distributorId, fetchDistributorById, setError]);

  // Update local state when store data changes
  useEffect(() => {
    if (selectedDistributor && selectedDistributor.id === distributorId) {
      setDistributorData(selectedDistributor as DistributorWithDetails);
    } else {
      setDistributorData(null);
    }
  }, [selectedDistributor, distributorId]);

  // Placeholder columns for installations table - adapt from InstallationTable later
  const installationColumns = useMemo<ColumnDef<Installation>[]>(() => [
    { accessorKey: 'installationNumber', header: 'Número' },
    { accessorKey: 'type', header: 'Tipo' },
    { accessorKey: 'status', header: 'Status' },
    // Add more columns or use InstallationTable columns
  ], []);

  const renderLoadingSkeleton = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <Skeleton className="h-8 w-1/2" />
          <Skeleton className="h-4 w-1/3" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-2/3" />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-1/4" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-40 w-full" />
        </CardContent>
      </Card>
    </div>
  );

  const renderContent = () => {
    if (isLoading && !distributorData) {
      return renderLoadingSkeleton();
    }

    if (error) {
      return (
        <div className="flex items-center justify-center h-full">
          <div className="text-center p-6 bg-destructive/10 border border-destructive rounded-lg">
            <AlertCircle className="mx-auto h-12 w-12 text-destructive mb-4" />
            <h3 className="text-lg font-semibold text-destructive mb-2">Erro ao carregar dados</h3>
            <p className="text-sm text-destructive/80">{error}</p>
            {fetchDistributorById && (
              <button 
                onClick={() => fetchDistributorById(distributorId)} 
                className="mt-4 px-4 py-2 bg-destructive text-destructive-foreground rounded hover:bg-destructive/90 text-sm"
              >
                Tentar Novamente
              </button>
            )}
          </div>
        </div>
      );
    }

    if (!distributorData) {
      return <div className="text-center p-10 text-muted-foreground">Nenhuma informação encontrada para esta distribuidora.</div>;
    }

    const { name, code, state, address, pricePerKwh, installations = [] } = distributorData;

    return (
      <div className="space-y-6">
        <Card className="border-primary/20 dark:border-primary/30 shadow-md">
          <CardHeader>
            <CardTitle>Distribuidora: {name || <Skeleton className="h-6 w-40 inline-block" />}</CardTitle>
            <CardDescription>
              Detalhes da distribuidora e instalações associadas.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div><strong>Código:</strong> {code || '-'}</div>
              <div><strong>Estado:</strong> {state || '-'}</div>
              <div><strong>Preço kWh Atual:</strong> {formatCurrency(pricePerKwh)}</div>
              <div className="md:col-span-2"><strong>Endereço Sede:</strong> 
                {address ? `${address.street}, ${address.number} - ${address.neighborhood}, ${address.city}/${address.state}` : '-'}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Instalações Associadas ({installations.length})</CardTitle>
            <CardDescription>Lista de instalações gerenciadas por esta distribuidora.</CardDescription>
          </CardHeader>
          <CardContent>
            {/* Placeholder for Installations Table */} 
            {installations.length > 0 ? (
               <div className="border rounded-md">
                 <p className="text-muted-foreground p-4 text-center">Tabela de Instalações será implementada aqui (e.g., usando DataTable ou InstallationTable).</p>
                 {/* 
                 <DataTable 
                   columns={installationColumns} 
                   data={installations} 
                 />
                 OR
                 <InstallationTable installations={installations} ... /> 
                 */}
               </div>
            ) : (
              <p className="text-muted-foreground text-center py-4">Nenhuma instalação encontrada para esta distribuidora.</p>
            )}
          </CardContent>
        </Card>
        
        {/* Optional: Card for KWH Price History */}
        {/* {distributorData.kwhPrices && distributorData.kwhPrices.length > 0 && (...) } */}

      </div>
    );
  };

  return (
    <div className="container mx-auto p-4 md:p-6">
      {renderContent()}
    </div>
  );
} 