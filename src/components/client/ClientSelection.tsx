import React, { useState, useEffect } from 'react';
import { Check, ChevronsUpDown, User } from 'lucide-react';
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

interface Client {
  id: string;
  nome: string;
  distribuidora: string;
}

interface ClientSelectionProps {
  selectedClientId: string;
  onSelectClient: (clientId: string, distribuidora?: string) => void;
  disabled?: boolean;
  clients?: Client[];
}

export default function ClientSelection({
  selectedClientId,
  onSelectClient,
  disabled = false,
  clients: externalClients
}: ClientSelectionProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [clients, setClients] = useState<Client[]>(externalClients || []);

  // Fetch clients from API if not provided externally
  useEffect(() => {
    if (externalClients) {
      setClients(externalClients);
      return;
    }
    
    if (open && !clients.length) {
      setLoading(true);
      
      // Fetch real clients from API
      fetch('/api/boletos/get-client-data')
        .then(response => response.json())
        .then(data => {
          if (data.clients) {
            const formattedClients = data.clients.map((client: any) => ({
              id: client.id,
              nome: client.name || client.email,
              distribuidora: client.mainDistributor || 'N/A'
            }));
            setClients(formattedClients);
          }
        })
        .catch(error => {
          console.error('Error fetching clients:', error);
        })
        .finally(() => {
          setLoading(false);
        });
    }
  }, [open, clients.length, externalClients]);

  const selectedClient = clients.find(client => client.id === selectedClientId);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className="w-full justify-between"
        >
          {selectedClient ? (
            <div className="flex items-center gap-2 text-left">
              <User className="h-4 w-4 opacity-50" />
              <span>{selectedClient.nome}</span>
            </div>
          ) : (
            <span className="text-muted-foreground">Selecione um cliente</span>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[300px] p-0">
        <Command>
          <CommandInput placeholder="Buscar cliente..." />
          <CommandList>
            <CommandEmpty>Nenhum cliente encontrado.</CommandEmpty>
            <CommandGroup heading="Clientes">
              {loading ? (
                // Skeleton loader durante carregamento
                <>
                  <div className="p-1">
                    <Skeleton className="h-8 w-full" />
                  </div>
                  <div className="p-1">
                    <Skeleton className="h-8 w-full" />
                  </div>
                  <div className="p-1">
                    <Skeleton className="h-8 w-full" />
                  </div>
                </>
              ) : (
                clients.map((client) => (
                  <CommandItem
                    key={client.id}
                    value={client.id}
                    onSelect={() => {
                      onSelectClient(client.id, client.distribuidora);
                      setOpen(false);
                    }}
                    className="flex items-center gap-2"
                  >
                    <User className="h-4 w-4 opacity-70" />
                    <span>{client.nome}</span>
                    <span className="ml-auto text-xs text-muted-foreground">{client.distribuidora}</span>
                    <Check
                      className={cn(
                        "ml-auto h-4 w-4",
                        selectedClientId === client.id ? "opacity-100" : "opacity-0"
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