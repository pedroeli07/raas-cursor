/* eslint-disable @typescript-eslint/naming-convention */
"use client"

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { 
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetFooter,
  SheetClose
} from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { FileText, Plus, Loader2 } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form'
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { createLogger } from "@/lib/utils/logger"

// Criar logger para o componente
const logger = createLogger("InvoiceGeneratorModal")

// Definir o esquema de validação para o formulário do boleto
const boletoFormSchema = z.object({
  clientId: z.string().min(1, 'Cliente é obrigatório'),
  installationId: z.string().min(1, 'Instalação é obrigatória'),
  clientNameToDisplay: z.string().min(1, 'Nome do cliente é obrigatório'),
  valorKwh: z.coerce.number().min(0.01, 'Valor deve ser maior que 0'),
  desconto: z.coerce.number().min(0, 'Desconto não pode ser negativo').max(100, 'Desconto não pode ser maior que 100%'),
  mesReferencia: z.string().min(1, 'Mês de referência é obrigatório'),
  vencimento: z.string().min(1, 'Vencimento é obrigatório'),
  calculationBasis: z.enum(['compensacao', 'recebido'], {
    required_error: "Selecione a base de cálculo"
  }),
  compensacao: z.coerce.number().optional(),
  recebido: z.coerce.number().optional(),
});

type BoletoFormValues = z.infer<typeof boletoFormSchema>;

interface Cliente {
  id: string;
  nome: string;
  distribuidora?: string;
}

interface Instalacao {
  id: string;
  numero: string;
  endereco: string;
  compensacao?: number;
  consumo?: number;
  geracao?: number;
  transferido?: number;
  recebido?: number;
  pricePerKwh?: number;
  distribuidora?: string;
  type: 'GENERATOR' | 'CONSUMER';
}

interface InvoiceGeneratorModalProps {
  triggerButton?: React.ReactNode;
  onInvoiceCreate?: (invoiceId: string) => void;
  fullWidth?: boolean;
  buttonVariant?: "default" | "outline" | "secondary" | "ghost";
}

export default function InvoiceGeneratorModal({
  triggerButton,
  onInvoiceCreate,
  fullWidth = false,
  buttonVariant = "default"
}: InvoiceGeneratorModalProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [isOpen, setIsOpen] = useState(false)
  const [step, setStep] = useState<'select' | 'configure'>('select')
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [clientList, setClientList] = useState<Cliente[]>([])
  const [installationList, setInstallationList] = useState<Instalacao[]>([])
  const [isLoadingClients, setIsLoadingClients] = useState(false)
  const [isLoadingInstallations, setIsLoadingInstallations] = useState(false)
  const [selectedInstallationData, setSelectedInstallationData] = useState<Instalacao | null>(null)
  const previewRef = useRef<HTMLDivElement>(null)
  
  // Setup form
  const form = useForm<BoletoFormValues>({
    resolver: zodResolver(boletoFormSchema),
    defaultValues: {
      clientId: '',
      installationId: '',
      clientNameToDisplay: '',
      valorKwh: 0,
      desconto: 20, // Default discount
      mesReferencia: '',
      vencimento: '',
      calculationBasis: 'compensacao',
      compensacao: 0,
      recebido: 0,
    }
  });

  // Watched values for real-time preview
  const watchValues = form.watch();
  const valorKwhFaturado = watchValues.valorKwh * (1 - watchValues.desconto / 100);
  const kwhAmount = watchValues.calculationBasis === 'compensacao' 
    ? selectedInstallationData?.compensacao ?? 0 
    : selectedInstallationData?.recebido ?? 0;
  const valorTotal = valorKwhFaturado * kwhAmount;

  // Fetch clients on component mount
  useEffect(() => {
    if (isOpen) {
      fetchClients();
    }
  }, [isOpen]);

  const fetchClients = async () => {
    try {
      setIsLoadingClients(true);
      const response = await fetch('/api/boletos/get-client-data');
      if (!response.ok) throw new Error('Failed to fetch clients');
      const data = await response.json();
      
      if (data.clients && data.clients.length > 0) {
        const formattedClients = data.clients.map((client: any) => ({
          id: client.id,
          nome: client.name || client.email,
          distribuidora: client.mainDistributor || undefined
        }));
        setClientList(formattedClients);
      } else {
        setClientList([]);
      }
    } catch (error) {
      console.error('Error fetching clients:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar a lista de clientes.",
        variant: "destructive"
      });
    } finally {
      setIsLoadingClients(false);
    }
  };

  // Handle client selection
  const handleClientChange = async (clientId: string) => {
    form.setValue('clientId', clientId);
    form.setValue('installationId', '');
    setSelectedInstallationData(null);
    setInstallationList([]);
    
    if (!clientId) return;

    const selectedClient = clientList.find(c => c.id === clientId);
    if (!selectedClient) return;

    form.setValue('clientNameToDisplay', selectedClient.nome);
    
    try {
      setIsLoadingInstallations(true);
      const response = await fetch(`/api/boletos/get-client-data?clientId=${clientId}`);
      
      if (!response.ok) {
        if (response.status === 404) {
          toast({
            title: "Nenhuma Instalação",
            description: `Cliente não possui instalações cadastradas.`,
            variant: "destructive"
          });
          return;
        }
        throw new Error(`Erro ao buscar dados do cliente: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (data.client?.installations?.length > 0) {
        const formattedInstallations = data.client.installations.map((inst: any) => ({
          id: inst.id,
          numero: inst.installationNumber,
          endereco: `${inst.type === 'GENERATOR' ? 'Geradora' : 'Consumidora'} - ${inst.address || 'Endereço não disponível'}`,
          pricePerKwh: inst.distributor?.pricePerKwh,
          distribuidora: inst.distributor?.name,
          compensacao: inst.latestData?.compensation,
          consumo: inst.latestData?.consumption,
          geracao: inst.latestData?.generation,
          recebido: inst.latestData?.received,
          type: inst.type,
        })).filter((inst: Instalacao) => inst.type === 'CONSUMER');

        setInstallationList(formattedInstallations);
      } else {
        toast({
          title: "Nenhuma Instalação",
          description: `Cliente não possui instalações cadastradas.`,
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error fetching client installations:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as instalações do cliente.",
        variant: "destructive"
      });
    } finally {
      setIsLoadingInstallations(false);
    }
  };

  // Handle installation selection
  const handleInstallationChange = (installationId: string) => {
    form.setValue('installationId', installationId);
    
    if (!installationId) {
      setSelectedInstallationData(null);
      return;
    }
    
    const installation = installationList.find(inst => inst.id === installationId);
    if (!installation) return;
    
    setSelectedInstallationData(installation);
    
    // Get the current month/year for reference
    const now = new Date();
    const monthNames = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
      "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
    const monthYear = `${monthNames[now.getMonth()]}/${now.getFullYear()}`;
    
    // Get due date (usually 10 days from now)
    const dueDate = new Date(now);
    dueDate.setDate(dueDate.getDate() + 10);
    const formattedDueDate = dueDate.toLocaleDateString('pt-BR');
    
    // Set form values based on selected installation
    form.setValue('valorKwh', installation.pricePerKwh ?? 0.976);
    form.setValue('mesReferencia', monthYear);
    form.setValue('vencimento', formattedDueDate);
    form.setValue('compensacao', installation.compensacao ?? 0);
    form.setValue('recebido', installation.recebido ?? 0);
  };

  // Handle form submission
  const onSubmit = async (data: BoletoFormValues) => {
    try {
      setIsSaving(true);
      
      // Prepare data for API call
      const invoiceData = {
        clientId: data.clientId,
        installationId: data.installationId,
        clientName: data.clientNameToDisplay,
        valorKwh: data.valorKwh,
        desconto: data.desconto,
        valorKwhFaturado,
        kwhAmount,
        calculationBasis: data.calculationBasis,
        valorTotal,
        mesReferencia: data.mesReferencia,
        vencimento: data.vencimento,
        compensacao: data.compensacao,
        recebido: data.recebido,
      };
      
      // Simulate API call - implement actual API in production
      // const response = await fetch('/api/boletos/save', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(invoiceData),
      // });
      
      // if (!response.ok) {
      //   throw new Error(`Erro ao salvar boleto: ${response.statusText}`);
      // }
      
      // const savedInvoice = await response.json();
      
      // Simulate successful creation with generated ID
      const mockInvoiceId = `INV-${Math.floor(Math.random() * 100000).toString().padStart(5, '0')}`;
      
      toast({
        title: "Boleto Gerado",
        description: `Boleto gerado com sucesso. ID: ${mockInvoiceId}`,
      });
      
      // Close modal
      setIsOpen(false);
      
      // Reset form
      form.reset();
      setStep('select');
      
      // Navigate to the invoice detail page or call callback
      if (onInvoiceCreate) {
        onInvoiceCreate(mockInvoiceId);
      } else {
        router.push(`/admin/financeiro/faturas/${mockInvoiceId}`);
      }
    } catch (error) {
      console.error('Error saving invoice:', error);
      toast({
        title: "Erro",
        description: "Não foi possível gerar o boleto.",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleContinue = () => {
    // Check if client and installation are selected
    const clientId = form.getValues('clientId');
    const installationId = form.getValues('installationId');
    
    if (!clientId) {
      toast({
        title: "Selecione um Cliente",
        description: "É necessário selecionar um cliente para continuar.",
        variant: "destructive"
      });
      return;
    }
    
    if (!installationId) {
      toast({
        title: "Selecione uma Instalação",
        description: "É necessário selecionar uma instalação para continuar.",
        variant: "destructive"
      });
      return;
    }
    
    setStep('configure');
  };

  const handleReset = () => {
    setStep('select');
  };

  const handleClose = () => {
    setIsOpen(false);
    setTimeout(() => {
      form.reset();
      setStep('select');
      setSelectedInstallationData(null);
    }, 300);
  };

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        {triggerButton ? (
          triggerButton
        ) : (
          <Button 
            variant={buttonVariant}
            className={fullWidth ? "w-full" : ""}
          >
            <FileText className="h-4 w-4 mr-2" />
            Gerar Boleto
          </Button>
        )}
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-xl md:max-w-2xl lg:max-w-3xl overflow-y-auto border-l-teal-200 dark:border-l-teal-800 p-0">
        <SheetHeader className="p-6 border-b border-b-slate-200 dark:border-b-slate-800 bg-gradient-to-r from-teal-50 to-blue-50 dark:from-slate-900 dark:to-slate-900">
          <SheetTitle className="text-xl text-teal-800 dark:text-teal-400 flex items-center">
            <FileText className="h-5 w-5 mr-2" />
            Gerar Novo Boleto
          </SheetTitle>
          <SheetDescription className="text-base">
            {step === 'select' 
              ? 'Selecione o cliente e a instalação para gerar um novo boleto' 
              : 'Configure os parâmetros do boleto'}
          </SheetDescription>
        </SheetHeader>

        <div className="p-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)}>
              {step === 'select' ? (
                <>
                  <div className="space-y-6">
                    {/* Cliente selection */}
                    <FormField
                      control={form.control}
                      name="clientId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Cliente</FormLabel>
                          <Select
                            disabled={isLoadingClients}
                            onValueChange={(value) => {
                              field.onChange(value);
                              handleClientChange(value);
                            }}
                            value={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Selecione um cliente" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {clientList.map((client) => (
                                <SelectItem key={client.id} value={client.id}>
                                  {client.nome}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Installation selection */}
                    <FormField
                      control={form.control}
                      name="installationId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Instalação</FormLabel>
                          <Select
                            disabled={!form.getValues('clientId') || isLoadingInstallations}
                            onValueChange={(value) => {
                              field.onChange(value);
                              handleInstallationChange(value);
                            }}
                            value={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Selecione uma instalação" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {installationList.map((installation) => (
                                <SelectItem key={installation.id} value={installation.id}>
                                  {installation.numero} - {installation.endereco}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormDescription>
                            {form.getValues('clientId') && installationList.length === 0 && !isLoadingInstallations && (
                              <span className="text-destructive">Nenhuma instalação encontrada para este cliente</span>
                            )}
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="pt-4 flex justify-end">
                      <Button 
                        type="button" 
                        onClick={handleContinue}
                        disabled={!form.getValues('clientId') || !form.getValues('installationId')}
                      >
                        Continuar
                      </Button>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Left Column: Boleto Preview */}
                    <Card>
                      <CardHeader>
                        <CardTitle>Visualização do Boleto</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div
                          ref={previewRef}
                          id="boleto-preview"
                          className="relative bg-white border rounded-lg overflow-hidden aspect-[210/297]"
                          style={{ width: '100%' }}
                        >
                          {/* Base Template Image */}
                          <Image
                            src="/images/boleto_padrao04.png"
                            alt="Template do Boleto"
                            width={800}
                            height={1200}
                            className="w-full h-auto"
                            priority
                          />

                          {/* Overlaid Data */}
                          {/* Client Info */}
                          <div className="absolute text-xs" style={{ top: '18%', left: '15%' }}>
                            {watchValues.clientNameToDisplay}
                          </div>

                          {/* Mês de Referência */}
                          <div className="absolute text-xs" style={{ top: '19.5%', left: '15%' }}>
                            Ref: {watchValues.mesReferencia}
                          </div>
                          
                          {/* Vencimento */}
                          <div className="absolute text-xs" style={{ top: '21%', left: '15%' }}>
                            Venc: {watchValues.vencimento}
                          </div>

                          {/* Valor kWh Original */}
                          <div className="absolute text-sm font-bold text-center" style={{ top: '17.8%', left: '47%', width: '10%' }}>
                            {watchValues.valorKwh.toFixed(3)}
                          </div>

                          {/* Desconto % */}
                          <div className="absolute text-sm font-bold text-center" style={{ top: '17.8%', left: '68.5%', width: '7%' }}>
                            {watchValues.desconto}%
                          </div>

                          {/* Valor kWh Faturado */}
                          <div className="absolute text-sm font-bold text-center" style={{ top: '17.8%', left: '83%', width: '10%' }}>
                            {valorKwhFaturado.toFixed(3)}
                          </div>

                          {/* kWh (Compensado/Recebido) */}
                          <div className="absolute text-xs" style={{ top: '30%', left: '15%' }}>
                            {watchValues.calculationBasis === 'compensacao' ? 'Compensação' : 'Recebido'}: {kwhAmount.toFixed(2)} kWh
                          </div>

                          {/* Valor Total a Pagar */}
                          <div className="absolute text-lg font-bold text-green-700 text-center" style={{ top: '46.5%', left: '75%', width: '15%' }}>
                            R$ {valorTotal.toFixed(2)}
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Right Column: Form Settings */}
                    <div className="space-y-6">
                      {/* Editable Client Name */}
                      <FormField
                        control={form.control}
                        name="clientNameToDisplay"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Nome do Cliente (para o boleto)</FormLabel>
                            <FormControl>
                              <Input {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <Separator />

                      {/* Valor kWh */}
                      <FormField
                        control={form.control}
                        name="valorKwh"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Valor do kWh (R$)</FormLabel>
                            <FormControl>
                              <Input type="number" step="0.001" {...field} />
                            </FormControl>
                            <FormDescription>
                              Distribuidora: {selectedInstallationData?.distribuidora || 'N/A'}
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {/* Desconto */}
                      <FormField
                        control={form.control}
                        name="desconto"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Desconto (%)</FormLabel>
                            <FormControl>
                              <Input type="number" step="1" min="0" max="100" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {/* Valor kWh Faturado (Display Only) */}
                      <div className="space-y-1">
                        <Label>Valor kWh Faturado (calculado)</Label>
                        <Input
                          type="text"
                          value={`R$ ${valorKwhFaturado.toFixed(3)}`}
                          readOnly
                          disabled
                          className="bg-muted"
                        />
                      </div>

                      <Separator />
                      
                      {/* Calculation Basis */}
                      <FormField
                        control={form.control}
                        name="calculationBasis"
                        render={({ field }) => (
                          <FormItem className="space-y-3">
                            <FormLabel>Base de Cálculo do Valor Total</FormLabel>
                            <FormControl>
                              <RadioGroup
                                onValueChange={field.onChange}
                                defaultValue={field.value}
                                className="flex flex-col space-y-1"
                              >
                                <FormItem className="flex items-center space-x-3 space-y-0">
                                  <FormControl>
                                    <RadioGroupItem value="compensacao" />
                                  </FormControl>
                                  <FormLabel className="font-normal">
                                    Usar kWh Compensado ({selectedInstallationData?.compensacao?.toFixed(2) ?? 0} kWh)
                                  </FormLabel>
                                </FormItem>
                                <FormItem className="flex items-center space-x-3 space-y-0">
                                  <FormControl>
                                    <RadioGroupItem value="recebido" />
                                  </FormControl>
                                  <FormLabel className="font-normal">
                                    Usar kWh Recebido ({selectedInstallationData?.recebido?.toFixed(2) ?? 0} kWh)
                                  </FormLabel>
                                </FormItem>
                              </RadioGroup>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {/* Valor a Pagar (Display Only) */}
                      <div className="space-y-1">
                        <Label>Valor a Pagar (calculado)</Label>
                        <Input
                          type="text"
                          value={`R$ ${valorTotal.toFixed(2)}`}
                          readOnly
                          disabled
                          className="bg-muted font-bold text-lg"
                        />
                        <p className="text-xs text-muted-foreground">
                          (Valor kWh Faturado × kWh {watchValues.calculationBasis === 'compensacao' ? 'Compensado' : 'Recebido'})
                        </p>
                      </div>
                      
                      <Separator />

                      {/* Mes Referencia */}
                      <FormField
                        control={form.control}
                        name="mesReferencia"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Mês de Referência</FormLabel>
                            <FormControl>
                              <Input placeholder="Ex: Maio/2024" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {/* Vencimento */}
                      <FormField
                        control={form.control}
                        name="vencimento"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Data de Vencimento</FormLabel>
                            <FormControl>
                              <Input placeholder="Ex: DD/MM/AAAA" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>

                  <div className="flex justify-between mt-6">
                    <Button type="button" variant="outline" onClick={handleReset}>
                      Voltar
                    </Button>
                    <Button type="submit" disabled={isSaving}>
                      {isSaving ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Gerando...
                        </>
                      ) : (
                        <>
                          <Plus className="mr-2 h-4 w-4" />
                          Gerar Boleto
                        </>
                      )}
                    </Button>
                  </div>
                </>
              )}
            </form>
          </Form>
        </div>
      </SheetContent>
    </Sheet>
  );
} 