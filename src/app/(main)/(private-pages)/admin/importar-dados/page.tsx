'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/components/ui/use-toast';
import { formatDate, formatBytes } from '@/lib/utils/utils';
import { CheckCircle, Clock, AlertTriangle, Upload, RefreshCw } from 'lucide-react';
import { frontendLog as log } from '@/lib/logs/logger';
import { FileUploadDialog } from '@/components/ux/FileUploadDialog';
import { useDistributorStore } from '@/store/distributorStore';
import { Distributor } from '@/lib/types/app-types';

interface UploadHistoryItem {
  id: string;
  fileName: string;
  distributorId: string;
  distributorName: string;
  timestamp: string;
  status: 'completed' | 'processing' | 'error';
  fileSize: number;
  itemsProcessed: number;
  errorCount: number;
}

export default function ImportarDadosPage() {
  const [uploadHistory, setUploadHistory] = useState<UploadHistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  const router = useRouter();
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const { fetchDistributors } = useDistributorStore();

  const fetchUploadHistory = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/energy-data/upload/history');
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      setUploadHistory(data.uploads);
    } catch (error) {
      log.error('Error fetching upload history', { error });
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar o histórico de uploads',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUploadHistory();
    fetchDistributors();
  }, [fetchDistributors]);

  const handleUploadComplete = async (distributorId: string, file: File) => {
    log.info('Upload completed', { distributorId, fileName: file.name });
    // Refresh the upload history after a short delay to allow backend processing
    setTimeout(() => {
      fetchUploadHistory();
    }, 1000);
  };

  const getStatusBadge = (status: UploadHistoryItem['status']) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-green-500"><CheckCircle className="h-3 w-3 mr-1" /> Concluído</Badge>;
      case 'processing':
        return <Badge className="bg-blue-500"><Clock className="h-3 w-3 mr-1" /> Processando</Badge>;
      case 'error':
        return <Badge className="bg-red-500"><AlertTriangle className="h-3 w-3 mr-1" /> Erro</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6 p-4">
      <div className="flex justify-between items-center">
    
        <div className="flex space-x-2">
          <Button onClick={() => fetchUploadHistory()} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Atualizar
          </Button>
          <Button onClick={() => setIsUploadDialogOpen(true)} size="sm">
            <Upload className="h-4 w-4 mr-2" />
            Novo Upload
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Histórico de Uploads</CardTitle>
          <CardDescription>
            Visualize todos os arquivos que foram enviados para processamento.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Arquivo</TableHead>
                <TableHead>Distribuidora</TableHead>
                <TableHead>Tamanho</TableHead>
                <TableHead>Data</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Registros</TableHead>
                <TableHead>Erros</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    Carregando histórico de uploads...
                  </TableCell>
                </TableRow>
              ) : uploadHistory.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    Nenhum upload encontrado. Faça seu primeiro upload de dados.
                  </TableCell>
                </TableRow>
              ) : (
                uploadHistory.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.fileName}</TableCell>
                    <TableCell>{item.distributorName}</TableCell>
                    <TableCell>{formatBytes(item.fileSize)}</TableCell>
                    <TableCell>{formatDate(new Date(item.timestamp))}</TableCell>
                    <TableCell>{getStatusBadge(item.status)}</TableCell>
                    <TableCell>{item.itemsProcessed}</TableCell>
                    <TableCell>
                      {item.errorCount > 0 ? (
                        <span className="text-red-500 font-medium">{item.errorCount}</span>
                      ) : (
                        <span className="text-muted-foreground">0</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <FileUploadDialog
        isOpen={isUploadDialogOpen}
        onClose={() => setIsUploadDialogOpen(false)}
        distributor={null}
        onUploadComplete={handleUploadComplete}
        targetTable="EnergyDataTable"
      />
    </div>
  );
} 