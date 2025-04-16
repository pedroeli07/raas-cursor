import React, { useState, useEffect } from 'react';
import { Check, ChevronsUpDown, Home } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Skeleton } from '@/components/ui/skeleton';

interface Installation {
  id: string;
  numero: string;
  endereco: string;
  compensacao?: number;
  consumo?: number;
  geracao?: number;
  transferido?: number;
  recebido?: number;
}

interface InstallationSelectionProps {
  clientId: string;
  selectedInstallationId: string;
  onSelectInstallation: (installationId: string) => void;
  disabled?: boolean;
  installations?: Installation[];
}

export default function InstallationSelection({
  clientId,
  selectedInstallationId,
  onSelectInstallation,
  disabled = false,
  installations: externalInstallations
}: InstallationSelectionProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [installations, setInstallations] = useState<Installation[]>(externalInstallations || []);

  // Efeito para carregar instalações quando o cliente muda
  useEffect(() => {
    if (externalInstallations) {
      setInstallations(externalInstallations);
      return;
    }
    
    if (clientId) {
      setLoading(true);
      
      // Fetch real installations from API
      fetch(`/api/boletos/get-client-data?clientId=${clientId}`)
        .then(response => response.json())
        .then(data => {
          if (data.client?.installations) {
            const formattedInstallations = data.client.installations.map((inst: any) => ({
              id: inst.id,
              numero: inst.installationNumber,
              endereco: inst.type === 'GENERATOR' ? 'Geradora' : 'Consumidora',
              compensacao: inst.latestData?.compensation || 0,
              consumo: inst.latestData?.consumption || 0,
              geracao: inst.latestData?.generation || 0,
              recebido: inst.latestData?.received || 0,
            }));
            setInstallations(formattedInstallations);
          } else {
            setInstallations([]);
          }
        })
        .catch(error => {
          console.error('Error fetching installations:', error);
          setInstallations([]);
        })
        .finally(() => {
          setLoading(false);
        });
    } else {
      setInstallations([]);
    }
  }, [clientId, externalInstallations]);

  const selectedInstallation = installations.find(
    installation => installation.id === selectedInstallationId
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled || !clientId}
          className="w-full justify-between"
        >
          {selectedInstallation ? (
            <div className="flex items-center gap-2 text-left">
              <Home className="h-4 w-4 opacity-50" />
              <span>
                {selectedInstallation.numero} - {selectedInstallation.endereco}
              </span>
            </div>
          ) : (
            <span className="text-muted-foreground">
              {clientId ? "Selecione uma instalação" : "Selecione um cliente primeiro"}
            </span>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[300px] p-0">
        <Command>
          <CommandInput placeholder="Buscar instalação..." />
          <CommandList>
            <CommandEmpty>Nenhuma instalação encontrada.</CommandEmpty>
            <CommandGroup heading="Instalações disponíveis">
              {loading ? (
                // Skeleton loader durante carregamento
                <>
                  <div className="p-1">
                    <Skeleton className="h-8 w-full" />
                  </div>
                  <div className="p-1">
                    <Skeleton className="h-8 w-full" />
                  </div>
                </>
              ) : (
                installations.map((installation) => (
                  <CommandItem
                    key={installation.id}
                    value={installation.id}
                    onSelect={() => {
                      onSelectInstallation(installation.id);
                      setOpen(false);
                    }}
                  >
                    <Home className="mr-2 h-4 w-4" />
                    <span>
                      {installation.numero} - {installation.endereco}
                    </span>
                    <Check
                      className={cn(
                        "ml-auto h-4 w-4",
                        selectedInstallationId === installation.id
                          ? "opacity-100"
                          : "opacity-0"
                      )}
                    />
                  </CommandItem>
                ))
              )}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
} 