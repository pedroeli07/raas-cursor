'use client';

import React, { useState, useCallback, useRef, ChangeEvent } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { AlertCircle, CheckCircle, UploadCloud, FileText, X } from 'lucide-react';
import { Distributor as AppDistributor } from '@/lib/types/app-types';
import { frontendLog as log } from '@/lib/logs/logger';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useDistributorStore } from '@/store/distributorStore';

interface FileUploadDialogProps {
  isOpen: boolean;
  onClose: () => void;
  distributor: AppDistributor | null;
  onUploadComplete: (distributorId: string, file: File) => void;
  targetTable: string; // e.g., 'CemigEnergyBillData'
}

export const FileUploadDialog: React.FC<FileUploadDialogProps> = ({ isOpen, onClose, distributor, onUploadComplete, targetTable }) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { distributors = [], isLoading: isLoadingDistributors } = useDistributorStore();
  const [selectedDistributorId, setSelectedDistributorId] = useState<string>("");

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    setUploadError(null);
    setUploadSuccess(false);
    setUploadProgress(0);
    const file = event.target.files?.[0];
    if (file) {
      if (file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' || file.name.endsWith('.xlsx')) {
        setSelectedFile(file);
        log.debug('File selected:', { name: file.name, size: file.size, type: file.type });
      } else {
        setUploadError('Formato de arquivo inválido. Por favor, selecione um arquivo .xlsx');
        setSelectedFile(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = ""; // Reset input
        }
      }
    } else {
        setSelectedFile(null);
    }
  };

  const handleUpload = useCallback(async () => {
    // Check if we have a distributor from props or selected one
    const distribId = distributor?.id || selectedDistributorId;
    
    if (!selectedFile || !distribId) {
      setUploadError('Por favor, selecione um arquivo e uma distribuidora');
      return;
    }

    setIsUploading(true);
    setUploadError(null);
    setUploadSuccess(false);
    setUploadProgress(0);
    log.info('Starting upload...', { distributorId: distribId, fileName: selectedFile.name });

    try {
      // Create FormData with file and distributor ID
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('distributorId', distribId);

      // Use real fetch API to upload to server
      const xhr = new XMLHttpRequest();
      xhr.open('POST', '/api/energy-data/upload', true);

      // Track upload progress
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          // Make progress advance more slowly to 85% (instead of 95%)
          const percentComplete = Math.round((event.loaded / event.total) * 85);
          setUploadProgress(percentComplete);
        }
      };

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const response = JSON.parse(xhr.responseText);
            // Simulate slower progress to 100%
            const simulateRemainingProgress = () => {
              setUploadProgress(prev => {
                if (prev >= 100) return 100;
                return prev + 3;
              });
            };
            
            // Simulate remaining progress over time
            const interval = setInterval(() => {
              setUploadProgress(prev => {
                if (prev >= 100) {
                  clearInterval(interval);
                  return 100;
                }
                return prev + 3;
              });
            }, 200);
            
            // Wait for progress to complete before showing success
            setTimeout(() => {
              clearInterval(interval);
              setUploadProgress(100);
              setUploadSuccess(true);
              log.info('Upload successful', { distribId, fileName: selectedFile.name });
              onUploadComplete(distribId, selectedFile);
              
              // Auto-close dialog after 1 second on success
              setTimeout(() => {
                handleClose();
              }, 1000);
            }, 1500);
          } catch (error) {
            setUploadError('Erro ao processar resposta do servidor');
            log.error('Error parsing server response', { error });
          }
        } else {
          let errorMessage = 'Erro no servidor';
          try {
            const response = JSON.parse(xhr.responseText);
            errorMessage = response.message || errorMessage;
          } catch (e) { /* use default error */ }
          
          setUploadError(errorMessage);
          log.error('Server error', { status: xhr.status, response: xhr.responseText });
        }
        setIsUploading(false);
      };

      xhr.onerror = () => {
        setUploadError('Erro de conexão ao enviar arquivo');
        log.error('Network error during upload');
        setIsUploading(false);
      };

      xhr.send(formData);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      setUploadError(errorMessage);
      log.error('Upload error', { error });
      setIsUploading(false);
    }
  }, [selectedFile, distributor?.id, selectedDistributorId, onUploadComplete]);

  const handleClose = () => {
    setSelectedFile(null);
    setUploadProgress(0);
    setIsUploading(false);
    setUploadError(null);
    setUploadSuccess(false);
    setSelectedDistributorId("");
    if (fileInputRef.current) {
        fileInputRef.current.value = ""; // Reset input on close
    }
    onClose();
  };

  const triggerFileInput = () => {
      fileInputRef.current?.click();
  }

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-[525px]">
        <DialogHeader>
          <DialogTitle>Upload de Arquivo de Dados (.xlsx)</DialogTitle>
          <DialogDescription>
            Faça o upload do arquivo de dados da distribuidora para importação.
            Os dados serão inseridos na tabela <code className="bg-muted px-1 py-0.5 rounded text-xs">{targetTable}</code>.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          {!distributor && (
            <div className="mb-4">
              <label className="text-sm font-medium mb-1 block">Selecione a Distribuidora</label>
              <Select
                value={selectedDistributorId}
                onValueChange={setSelectedDistributorId}
                disabled={isUploading}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma distribuidora" />
                </SelectTrigger>
                <SelectContent>
                  {distributors.map((d) => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div
            className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer bg-muted/40 hover:bg-muted/60 border-primary/30 hover:border-primary/50 transition-colors"
            onClick={triggerFileInput}
          >
             <div className="flex flex-col items-center justify-center pt-5 pb-6">
                <UploadCloud className={`h-8 w-8 mb-3 ${selectedFile ? 'text-primary' : 'text-gray-400'}`} />
                <p className="mb-2 text-sm text-muted-foreground">
                  {selectedFile ?
                    <span className="font-semibold text-primary">Arquivo selecionado!</span> :
                    <><span className="font-semibold">Clique para selecionar</span> ou arraste</>
                   }
                 </p>
                <p className="text-xs text-muted-foreground">Apenas arquivos .XLSX</p>
            </div>
             <Input
                id="file-upload"
                type="file"
                className="hidden"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                disabled={isUploading}
             />
           </div>

          {selectedFile && !isUploading && !uploadSuccess && (
            <div className="flex items-center justify-between p-2 border rounded bg-muted/50">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                <span className="text-sm font-medium truncate max-w-[300px]">{selectedFile.name}</span>
                <span className="text-xs text-muted-foreground">({(selectedFile.size / 1024).toFixed(1)} KB)</span>
              </div>
              <Button variant="ghost" size="icon" onClick={() => { setSelectedFile(null); if(fileInputRef.current) fileInputRef.current.value = ""; }} className="h-6 w-6">
                <X className="h-4 w-4" />
              </Button>
            </div>
          )}

          {isUploading && (
            <div className="space-y-2">
              <Progress value={uploadProgress} className="w-full" />
              <p className="text-sm text-center text-muted-foreground">Enviando: {uploadProgress.toFixed(0)}%</p>
            </div>
          )}

          {uploadError && (
            <div className="flex items-center gap-2 p-2 text-sm rounded-md border border-destructive bg-destructive/10 text-destructive">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              <span>{uploadError}</span>
            </div>
          )}

          {uploadSuccess && (
            <div className="flex items-center gap-2 p-2 text-sm rounded-md border border-emerald-500 bg-emerald-500/10 text-emerald-600">
              <CheckCircle className="h-4 w-4 flex-shrink-0" />
              <span>Upload e processamento concluídos com sucesso!</span>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isUploading}>
            {uploadSuccess ? 'Fechar' : 'Cancelar'}
          </Button>
          <Button 
            onClick={handleUpload} 
            disabled={!selectedFile || isUploading || uploadSuccess || ((!distributor && !selectedDistributorId))}
          >
            {isUploading ? 'Enviando...' : (uploadSuccess ? 'Enviado' : 'Iniciar Upload')}
            {!isUploading && !uploadSuccess && <UploadCloud className="ml-2 h-4 w-4" />}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

FileUploadDialog.displayName = 'FileUploadDialog'; 