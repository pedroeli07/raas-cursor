"use client"

import { useEffect, useState, useRef, useCallback } from "react"
import { useParams, useRouter } from "next/navigation"
import Image from 'next/image'
import { useSession } from "next-auth/react"
import { InvoiceViewer } from "@/components/invoice/invoice-viewer"
import { createLogger } from "@/lib/utils/logger"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import { toast } from "sonner"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'
import { format } from 'date-fns'
import { 
  Download as DownloadIcon, 
  Mail as MailIcon,
  Loader2,
  RefreshCw,
  Edit,
  Check,
  X,
  SlidersHorizontal
} from 'lucide-react'
import { useInvoiceStore, FormattedInvoice } from "@/store/invoiceStore"
import { useDistributorStore } from "@/store/distributorStore"
import { useCemigDataStore } from "@/store/cemigDataStore"
import { INVOICE_STATUS } from '@/lib/constants/invoice'
import { InvoiceStatus } from '@/lib/types/app-types'

// Criar logger para a página
const logger = createLogger("InvoicePage")

// Interface for the update payload
interface InvoiceUpdatePayload {
  dueDate?: string;
  status?: string; // Use string here, API will handle enum validation
}

// Definir o esquema de validação para o formulário do boleto
const boletoFormSchema = z.object({
  clientNameToDisplay: z.string().min(1, 'Nome do cliente é obrigatório'),
  valorKwh: z.coerce.number().min(0.01, 'Valor deve ser maior que 0'),
  desconto: z.coerce.number().min(0, 'Desconto não pode ser negativo').max(100, 'Desconto não pode ser maior que 100%'),
  mesReferencia: z.string().min(1, 'Mês de referência é obrigatório'),
  vencimento: z.string().min(1, 'Vencimento é obrigatório'),
  calculationBasis: z.enum(['compensacao', 'recebido'], {
    // eslint-disable-next-line @typescript-eslint/naming-convention
    required_error: "Selecione a base de cálculo"
  }),
  compensacao: z.coerce.number().optional(),
  recebido: z.coerce.number().optional(),
  invoiceNumber: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
});

// Esquema para posições dos elementos no boleto
const positionsFormSchema = z.object({
  clientName: z.object({
    top: z.coerce.number(),
    left: z.coerce.number(),
  }),
  mesReferencia: z.object({
    top: z.coerce.number(),
    left: z.coerce.number(),
  }),
  vencimento: z.object({
    top: z.coerce.number(),
    left: z.coerce.number(),
  }),
  valorKwh: z.object({
    top: z.coerce.number(),
    left: z.coerce.number(),
    width: z.coerce.number(),
  }),
  desconto: z.object({
    top: z.coerce.number(),
    left: z.coerce.number(),
    width: z.coerce.number(),
  }),
  valorKwhFaturado: z.object({
    top: z.coerce.number(),
    left: z.coerce.number(),
    width: z.coerce.number(),
  }),
  kwh: z.object({
    top: z.coerce.number(),
    left: z.coerce.number(),
  }),
  valorTotal: z.object({
    top: z.coerce.number(),
    left: z.coerce.number(),
    width: z.coerce.number(),
  }),
});

type BoletoFormValues = z.infer<typeof boletoFormSchema>;
type PositionsFormValues = z.infer<typeof positionsFormSchema>;

// Simple deep comparison function for the positions object structure
const arePositionsEqual = (pos1: PositionsFormValues | null, pos2: PositionsFormValues | null): boolean => {
  if (!pos1 || !pos2) return pos1 === pos2; // Handle null/undefined cases

  const keys1 = Object.keys(pos1) as Array<keyof PositionsFormValues>;
  const keys2 = Object.keys(pos2) as Array<keyof PositionsFormValues>;

  if (keys1.length !== keys2.length) return false;

  for (const key of keys1) {
    const val1 = pos1[key];
    const val2 = pos2[key];

    // Check if both values are objects (like { top: number, left: number })
    const areObjects = typeof val1 === 'object' && val1 !== null && typeof val2 === 'object' && val2 !== null;

    if (areObjects) {
       const subKeys1 = Object.keys(val1) as Array<keyof typeof val1>;
       const subKeys2 = Object.keys(val2) as Array<keyof typeof val2>;
       if (subKeys1.length !== subKeys2.length) return false;
       for (const subKey of subKeys1) {
           // Compare nested properties (top, left, width)
           if (val1[subKey] !== val2[subKey]) return false;
       }
    } else if (val1 !== val2) { // Compare primitive values
      return false;
    }
  }
  return true;
};

// Posições padrão dos elementos no boleto
const defaultPositions: PositionsFormValues = {
  clientName: { top: 18, left: 15 },
  mesReferencia: { top: 19.5, left: 15 },
  vencimento: { top: 21, left: 15 },
  valorKwh: { top: 17.8, left: 47, width: 10 },
  desconto: { top: 17.8, left: 68.5, width: 7 },
  valorKwhFaturado: { top: 17.8, left: 83, width: 10 },
  kwh: { top: 30, left: 15 },
  valorTotal: { top: 46.5, left: 75, width: 15 },
};

// Componente para exibir o estado de carregamento
const LoadingState = () => (
  <div className="flex items-center justify-center min-h-[80vh]">
    <div className="flex flex-col items-center gap-4">
      <LoadingSpinner size="lg" />
      <p className="text-teal-600 font-medium">Carregando fatura...</p>
    </div>
  </div>
)

// Componente para exibir estado de erro
const ErrorState = ({ message }: { message: string }) => (
  <div className="flex items-center justify-center min-h-[80vh]">
    <div className="text-center p-6 bg-red-50 border border-red-200 rounded-lg shadow-sm">
      <X className="h-12 w-12 text-red-400 mx-auto mb-4" />
      <h2 className="text-2xl font-bold text-red-800 mb-2">Erro ao Carregar Fatura</h2>
      <p className="text-red-600">{message || "Não foi possível carregar os dados da fatura solicitada."}</p>
      <Button variant="outline" onClick={() => window.history.back()} className="mt-4 border-red-300 text-red-700 hover:bg-red-100">
        Voltar
      </Button>
    </div>
  </div>
)

export default function InvoicePage() {
  const params = useParams()
  const router = useRouter()
  const { data: session, status } = useSession()
  const invoiceId = params.id as string;

  // State for this page
  const [isEditing, setIsEditing] = useState(false)
  const [isEditingPositions, setIsEditingPositions] = useState(false)
  const [isLoadingPdf, setIsLoadingPdf] = useState(false)
  const [pdfUrl, setPdfUrl] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState("boleto")
  const previewRef = useRef<HTMLDivElement>(null)
  const [positions, setPositions] = useState<PositionsFormValues>(defaultPositions)
  // Local loading state, distinct from store's loading
  const [pageLoading, setPageLoading] = useState(true); 
  const [pageError, setPageError] = useState<string | null>(null);
  const positionsRef = useRef<PositionsFormValues>(defaultPositions); // Ref to store last applied positions

  // Get data and actions from stores
  const {
    selectedInvoice, 
    fetchInvoiceById,
    updateInvoice,
    isLoading: invoiceLoading, 
    error: invoiceError 
  } = useInvoiceStore();
  
  const { distributors, fetchDistributors } = useDistributorStore();
  const { cemigData, fetchCemigData } = useCemigDataStore(); // Assuming fetchCemigData exists

  // Configurar formulário para edição do boleto
  const form = useForm<BoletoFormValues>({
    resolver: zodResolver(boletoFormSchema),
    defaultValues: {
      clientNameToDisplay: '',
      valorKwh: 0,
      desconto: 20,
      mesReferencia: '',
      vencimento: '',
      calculationBasis: 'compensacao',
      compensacao: 0,
      recebido: 0,
    }
  });

  // Configurar formulário para edição das posições
  const positionsForm = useForm<PositionsFormValues>({
    resolver: zodResolver(positionsFormSchema),
    defaultValues: defaultPositions,
  });

  // Valores assistidos para atualizar o preview em tempo real
  const watchValues = form.watch();
  const watchPositions = positionsForm.watch();
  const valorKwhFaturado = (watchValues.valorKwh || 0) * (1 - (watchValues.desconto || 0) / 100);
  const kwhAmount = watchValues.calculationBasis === 'compensacao' 
    ? (watchValues.compensacao ?? 0) // Use form value
    : (watchValues.recebido ?? 0); // Use form value
  const valorTotal = valorKwhFaturado * kwhAmount;

  // Efeito para sincronizar os estados de posições (com deep comparison)
  useEffect(() => {
    // Compare current watch value with the last value that actually triggered a state update
    if (!arePositionsEqual(positionsRef.current, watchPositions)) {
        logger.debug('[EFFECT] Updating positions state because values changed', { from: positionsRef.current, to: watchPositions });
        setPositions(watchPositions);
        // Update the ref to store the new value *after* updating state
        positionsRef.current = watchPositions;
    } else {
        // logger.debug('[EFFECT] Skipping positions update, values are equal'); // Optional: uncomment for debugging
    }
  }, [watchPositions]); // Only depend on watchPositions to trigger the check

  // Fetch initial data on mount
  useEffect(() => {
    const loadInitialData = async () => {
      // Log the initial status when the effect runs
      logger.debug(`[Effect Start] Session status: ${status}`);

      // Wait until session status is determined (not loading)
      if (status === 'loading') {
        logger.debug('[Effect] Session is loading, waiting...');
        return; // Exit effect if still loading
      }

      // Now check if authenticated AFTER loading is complete
      if (status === 'unauthenticated' || !session) {
        logger.error(`[Effect] User not authenticated (Status: ${status}, Session: ${!!session}), redirecting to login`);
        router.push('/login');
        return; // Exit effect if not authenticated
      }

      // If we reach here, user is authenticated
      setPageLoading(true); // Set loading true only when we are ready to fetch
      setPageError(null);
      logger.info('[Effect] User authenticated, proceeding to load initial data', {
        invoiceId,
        userEmail: session.user?.email,
        userRole: session.user?.role
       });

      try {
        // Fetch invoice details first
        const fetchedInvoice = await fetchInvoiceById(invoiceId);

        if (!fetchedInvoice) {
          throw new Error("Fatura não encontrada ou falha ao carregar.");
        }

        // Fetch related data only if invoice loaded successfully
        // Example: Fetch distributors if not already loaded
        if (distributors.length === 0) { 
          await fetchDistributors();
        }
        // Example: Fetch energy data if needed and not loaded
        if (cemigData.length === 0) { 
          // Might need filters like installationId, period from fetchedInvoice
          // await fetchCemigData({ installationId: fetchedInvoice.installationId, period: fetchedInvoice.referenceMonth });
          await fetchCemigData(); // Assuming it fetches relevant data
        }
        // Example: Fetch user preferences (like default discount)
        // const userPrefs = await getUserPreferences(fetchedInvoice.userId);

        // Populate the form AFTER all data is fetched
        populateFormFromInvoice(fetchedInvoice);
        
        // If it's a newly initiated invoice (check status or a flag if API returns one)
        // Start in edit mode
        // if (fetchedInvoice.status === 'DRAFT') { // Assuming a DRAFT status exists
        //   setIsEditing(true);
        // }
        
      } catch (error) {
        const msg = error instanceof Error ? error.message : "Erro desconhecido ao carregar dados.";
        logger.error('[Effect] Error loading initial invoice data', { invoiceId, error: msg });
        setPageError(msg);
      } finally {
        setPageLoading(false);
      }
    };

    if (invoiceId) {
      loadInitialData();
    }

    // Cleanup function if needed
    return () => {
      // Cleanup logic here
    };
  // Ensure dependencies are correct: fetchInvoiceById, fetchDistributors, fetchCemigData might change
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [invoiceId, status, session, router, fetchInvoiceById, fetchDistributors, fetchCemigData]); // Adjusted dependencies

  // Função para preencher o formulário com dados da fatura e fetched defaults
  const populateFormFromInvoice = (invoiceData: FormattedInvoice | null) => {
    if (!invoiceData) {
      logger.warn('populateFormFromInvoice called with null data');
      // Optionally reset form to defaults or handle error state
      form.reset(); // Reset to default values defined in useForm
      return;
    }
    
    logger.debug('Populating form with invoice data', { invoiceData });

    // Determine CEMIG Rate
    const installationDistributor = distributors.find(d => d.id === invoiceData.distributorId);
    // Safely access kwhPrice (assuming it's the latest price)
    // TODO: Implement logic to find the correct historical price based on referenceMonth
    const cemigRate = installationDistributor?.kwhPrices?.[0]?.price ? 
                        Number(installationDistributor.kwhPrices[0].price) / 100 // Assuming price is in cents
                        : 0.956; // Fallback
    
    // Determine Default Discount (Example Logic)
    const defaultDiscount = 20; // Hardcoded for now, fetch from user prefs later
    
    // Determine Energy Values (Example Logic)
    const relevantEnergyData = cemigData.find(d => 
        d.installationNumber === invoiceData.installationNumber && 
        d.period === invoiceData.referenceMonth
    );
    const compensacaoValue = relevantEnergyData?.compensation ?? (invoiceData.invoiceAmount ? invoiceData.invoiceAmount / (cemigRate * (1- (invoiceData.discountPercentage ?? defaultDiscount)/100)) : 0); // Fallback if needed
    const recebidoValue = relevantEnergyData?.received ?? compensacaoValue; // Fallback

    form.reset({
      clientNameToDisplay: invoiceData.customerName || '',
      valorKwh: cemigRate, // Use determined rate
      desconto: invoiceData.discountPercentage ?? defaultDiscount,
      mesReferencia: invoiceData.referenceMonth || '',
      vencimento: invoiceData.dueDate ? format(invoiceData.dueDate, 'yyyy-MM-dd') : '',
      calculationBasis: 'compensacao', 
      compensacao: compensacaoValue,
      recebido: recebidoValue,
      invoiceNumber: invoiceData.invoiceNumber, // Populate from invoice
      description: invoiceData.description,   // Populate from invoice
    });
    logger.debug('Form populated', { values: form.getValues() });
  }

  // Update form when selectedInvoice changes from the store (e.g., after an update)
  useEffect(() => {
    if (selectedInvoice && selectedInvoice.id === invoiceId) {
        logger.debug('Selected invoice changed, repopulating form');
        populateFormFromInvoice(selectedInvoice);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedInvoice]); // Re-run only when selectedInvoice object reference changes

  // Restaurar posições padrão
  const resetPositions = () => {
    positionsForm.reset(defaultPositions);
  };

  // Gerar PDF a partir do preview
  const generatePDF = async () => {
    if (!previewRef.current) return null;
    
    const originalDisplay = previewRef.current.style.display;
    previewRef.current.style.display = 'block';
    
    try {
      const element = previewRef.current;
      
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
      });
      
      const imgData = canvas.toDataURL('images/png');
      
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });
      
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const canvasWidth = canvas.width;
      const canvasHeight = canvas.height;
      const ratio = Math.min(pdfWidth / canvasWidth, pdfHeight / canvasHeight);
      
      const imgWidth = canvasWidth * ratio;
      const imgHeight = canvasHeight * ratio;
      
      const xPos = (pdfWidth - imgWidth) / 2;
      const yPos = (pdfHeight - imgHeight) / 2;
      
      pdf.addImage(imgData, 'PNG', xPos, yPos, imgWidth, imgHeight);
      
      const pdfBlob = pdf.output('blob');
      const url = URL.createObjectURL(pdfBlob);
      setPdfUrl(url);
      
      return { pdf, url };
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      toast.error('Não foi possível gerar o PDF.');
      return null;
    } finally {
      if (previewRef.current) {
        previewRef.current.style.display = originalDisplay;
      }
    }
  };
  
  // Baixar PDF
  const handleDownload = async () => {
    setIsLoadingPdf(true);
    const result = await generatePDF();
    setIsLoadingPdf(false);
    if (result) {
      const { url } = result;
      const a = document.createElement('a');
      a.href = url;
      const safeClientName = watchValues.clientNameToDisplay.replace(/[^a-z0-9]/gi, '_').toLowerCase();
      const invoiceId = params.id as string;
      a.download = `boleto_${safeClientName}_${invoiceId}_${watchValues.mesReferencia.replace('/', '-')}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast.success('Boleto baixado com sucesso.');
    }
  };
  
  // Enviar por e-mail
  const handleSendEmail = async () => {
    toast.info('O envio de email será implementado em breve.');
  };
  
  // Salvar alterações (Update)
  const onSubmit = async (data: BoletoFormValues) => {
    logger.info('Submitting invoice update', { invoiceId, data });
    try {
      await updateInvoice(invoiceId, {
        invoiceNumber: data.invoiceNumber, 
        description: data.description,   
        dueDate: new Date(data.vencimento),
        referenceMonth: data.mesReferencia,
        invoiceAmount: valorTotal, 
        totalAmount: data.valorKwh * kwhAmount, 
        discountPercentage: data.desconto,
        status: INVOICE_STATUS.PENDING as InvoiceStatus, 
      });
      toast.success('Fatura atualizada com sucesso.');
      setIsEditing(false);
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Erro desconhecido ao salvar.";
      logger.error('Error updating invoice', { invoiceId, error: msg });
      toast.error(`Erro ao salvar: ${msg}`);
    }
  }
  
  // Salvar posições
  const onSubmitPositions = async (data: PositionsFormValues) => {
    try {
      toast.loading('Salvando posições...');
      
      // Atualizar posições
      setPositions(data);
      
      // Na implementação real, salvar no banco de dados
      await new Promise(resolve => setTimeout(resolve, 500));
      
      toast.dismiss();
      toast.success('Posições salvas com sucesso.');
      setIsEditingPositions(false);
    } catch (error) {
      toast.dismiss();
      toast.error('Erro ao salvar posições.');
      console.error('Erro ao salvar posições:', error);
    }
  };

  // Render loading state while fetching initial data
  if (pageLoading) {
    return <LoadingState />;
  }

  // Render error state if initial fetch failed
  if (pageError || !selectedInvoice && !pageLoading) { // Check selectedInvoice after loading
    return <ErrorState message={pageError || "Fatura não encontrada."} />;
  }
  
  // Ensure selectedInvoice is not null before proceeding
  if (!selectedInvoice) {
      logger.error("Rendering page but selectedInvoice is still null after loading");
      return <ErrorState message="Erro inesperado ao carregar dados da fatura." />;
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-teal-800">
            {`Fatura ${selectedInvoice.invoiceNumber || invoiceId.substring(0, 8)}`}
          </h1>
          <p className="text-gray-600">
            Cliente: {selectedInvoice.customerName} | 
            Referência: {selectedInvoice.referenceMonth} |
            Vencimento: {selectedInvoice.dueDate ? format(selectedInvoice.dueDate, 'dd/MM/yyyy') : 'N/A'}
          </p>
        </div>
        <div className="flex gap-2">
          {isEditing || isEditingPositions ? (
            <>
              <Button 
                variant="outline" 
                onClick={() => {
                  setIsEditing(false);
                  setIsEditingPositions(false);
                  populateFormFromInvoice(selectedInvoice);
                  resetPositions();
                }}
                disabled={invoiceLoading}
              >
                <X className="mr-2 h-4 w-4" />
                Cancelar
              </Button>
              <Button 
                onClick={isEditing 
                  ? form.handleSubmit(onSubmit) 
                  : positionsForm.handleSubmit(onSubmitPositions)
                }
                disabled={invoiceLoading}
              >
                {invoiceLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Check className="mr-2 h-4 w-4" />}
                Salvar {isEditing ? 'Alterações' : 'Posições'}
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={() => setIsEditing(true)}>
                <Edit className="mr-2 h-4 w-4" />
                Editar Dados
              </Button>
              <Button variant="outline" onClick={() => setIsEditingPositions(true)}>
                <SlidersHorizontal className="mr-2 h-4 w-4" />
                Ajustar Posições
              </Button>
              <Button variant="outline" onClick={handleSendEmail}>
                <MailIcon className="mr-2 h-4 w-4" />
                Enviar por Email
              </Button>
              <Button 
                onClick={handleDownload}
                disabled={isLoadingPdf}
              >
                {isLoadingPdf ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <DownloadIcon className="mr-2 h-4 w-4" />
                )}
                Baixar PDF
              </Button>
            </>
          )}
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="boleto">Boleto</TabsTrigger>
          <TabsTrigger value="posicoes">Posições</TabsTrigger>
          <TabsTrigger value="detalhes">Detalhes Técnicos</TabsTrigger>
          <TabsTrigger value="historico">Histórico</TabsTrigger>
        </TabsList>

        <TabsContent value="boleto" className="mt-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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

                  {/* Dados sobrepostos */}
                  {/* Cliente */}
                  <div className="absolute text-xs" style={{ 
                    top: `${positions.clientName.top}%`, 
                    left: `${positions.clientName.left}%` 
                  }}>
                    {watchValues.clientNameToDisplay}
                  </div>

                  {/* Mês de Referência */}
                  <div className="absolute text-xs" style={{ 
                    top: `${positions.mesReferencia.top}%`, 
                    left: `${positions.mesReferencia.left}%` 
                  }}>
                    Ref: {watchValues.mesReferencia}
                  </div>
                  
                  {/* Vencimento */}
                  <div className="absolute text-xs" style={{ 
                    top: `${positions.vencimento.top}%`, 
                    left: `${positions.vencimento.left}%` 
                  }}>
                    Venc: {watchValues.vencimento}
                  </div>

                  {/* Valor kWh Original */}
                  <div className="absolute text-sm font-bold text-center" style={{ 
                    top: `${positions.valorKwh.top}%`, 
                    left: `${positions.valorKwh.left}%`, 
                    width: `${positions.valorKwh.width}%` 
                  }}>
                    {watchValues.valorKwh.toFixed(3)}
                  </div>

                  {/* Desconto % */}
                  <div className="absolute text-sm font-bold text-center" style={{ 
                    top: `${positions.desconto.top}%`, 
                    left: `${positions.desconto.left}%`, 
                    width: `${positions.desconto.width}%` 
                  }}>
                    {watchValues.desconto}%
                  </div>

                  {/* Valor kWh Faturado */}
                  <div className="absolute text-sm font-bold text-center" style={{ 
                    top: `${positions.valorKwhFaturado.top}%`, 
                    left: `${positions.valorKwhFaturado.left}%`, 
                    width: `${positions.valorKwhFaturado.width}%` 
                  }}>
                    {valorKwhFaturado.toFixed(3)}
                  </div>

                  {/* kWh (Compensado/Recebido) */}
                  <div className="absolute text-xs" style={{ 
                    top: `${positions.kwh.top}%`, 
                    left: `${positions.kwh.left}%` 
                  }}>
                    {watchValues.calculationBasis === 'compensacao' ? 'Compensação' : 'Recebido'}: {kwhAmount.toFixed(2)} kWh
                  </div>

                  {/* Valor Total a Pagar */}
                  <div className="absolute text-lg font-bold text-green-700 text-center" style={{ 
                    top: `${positions.valorTotal.top}%`, 
                    left: `${positions.valorTotal.left}%`, 
                    width: `${positions.valorTotal.width}%` 
                  }}>
                    R$ {valorTotal.toFixed(2)}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{isEditing ? 'Editar Boleto' : 'Detalhes do Boleto'}</CardTitle>
              </CardHeader>
              <CardContent>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <FormField
                      control={form.control}
                      name="clientNameToDisplay"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nome do Cliente</FormLabel>
                          <FormControl>
                            <Input {...field} disabled={!isEditing} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <Separator />

                    <FormField
                      control={form.control}
                      name="valorKwh"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Valor do kWh (R$)</FormLabel>
                          <FormControl>
                            <Input type="number" step="0.001" {...field} disabled={!isEditing} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="desconto"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Desconto (%)</FormLabel>
                          <FormControl>
                            <Input type="number" step="1" min="0" max="100" {...field} disabled={!isEditing} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="calculationBasis"
                      render={({ field }) => (
                        <FormItem className="space-y-3">
                          <FormLabel>Base de Cálculo do Valor Total</FormLabel>
                          <FormControl>
                            <RadioGroup
                              value={field.value}
                              onValueChange={field.onChange}
                              className="flex flex-col space-y-1"
                              disabled={!isEditing}
                            >
                              <FormItem className="flex items-center space-x-3 space-y-0">
                                <FormControl>
                                  <RadioGroupItem value="compensacao" id="calc-compensacao" />
                                </FormControl>
                                <FormLabel className="font-normal" htmlFor="calc-compensacao">
                                  Usar kWh Compensado ({watchValues.compensacao?.toFixed(2) ?? 0} kWh)
                                </FormLabel>
                              </FormItem>
                              <FormItem className="flex items-center space-x-3 space-y-0">
                                <FormControl>
                                  <RadioGroupItem value="recebido" id="calc-recebido" />
                                </FormControl>
                                <FormLabel className="font-normal" htmlFor="calc-recebido">
                                  Usar kWh Recebido ({watchValues.recebido?.toFixed(2) ?? 0} kWh)
                                </FormLabel>
                              </FormItem>
                            </RadioGroup>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

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

                    <FormField
                      control={form.control}
                      name="mesReferencia"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Mês de Referência</FormLabel>
                          <FormControl>
                            <Input {...field} disabled={!isEditing} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="vencimento"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Data de Vencimento</FormLabel>
                          <FormControl>
                            <Input {...field} disabled={!isEditing} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="invoiceNumber"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Número da Fatura (Opcional)</FormLabel>
                          <FormControl>
                            <Input {...field} value={field.value ?? ''} disabled={!isEditing} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Descrição (Opcional)</FormLabel>
                          <FormControl>
                            <Input {...field} value={field.value ?? ''} disabled={!isEditing} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </form>
                </Form>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="posicoes" className="mt-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Visualização das Posições</CardTitle>
              </CardHeader>
              <CardContent>
                <div
                  className="relative bg-white border rounded-lg overflow-hidden aspect-[210/297]"
                  style={{ width: '100%' }}
                >
                  {/* Base Template Image */}
                  <Image
                    src="/images/boleto_template.png"
                    alt="Template do Boleto"
                    width={800}
                    height={1200}
                    className="w-full h-auto opacity-70"
                    priority
                  />

                  {/* Guias de posicionamento */}
                  <div className="absolute top-0 left-0 w-full h-full">
                    {/* Grade horizontal a cada 10% */}
                    {[...Array(10)].map((_, i) => (
                      <div key={`h-${i}`} className="absolute border-t border-dashed border-blue-300" style={{ top: `${i * 10}%`, width: '100%' }}>
                        <span className="absolute -top-3 -left-1 text-[8px] bg-blue-100 px-1 rounded">
                          {i * 10}%
                        </span>
                      </div>
                    ))}
                    
                    {/* Grade vertical a cada 10% */}
                    {[...Array(10)].map((_, i) => (
                      <div key={`v-${i}`} className="absolute border-l border-dashed border-blue-300" style={{ left: `${i * 10}%`, height: '100%' }}>
                        <span className="absolute -top-1 -left-1 text-[8px] bg-blue-100 px-1 rounded">
                          {i * 10}%
                        </span>
                      </div>
                    ))}

                    {/* Elementos com marcadores de posição */}
                    {/* Nome do cliente */}
                    <div className="absolute bg-red-200 bg-opacity-50 text-xs px-1 rounded-sm border border-red-400" style={{ 
                      top: `${positions.clientName.top}%`, 
                      left: `${positions.clientName.left}%` 
                    }}>
                      Nome do Cliente
                    </div>
                    
                    {/* Mês de Referência */}
                    <div className="absolute bg-green-200 bg-opacity-50 text-xs px-1 rounded-sm border border-green-400" style={{ 
                      top: `${positions.mesReferencia.top}%`, 
                      left: `${positions.mesReferencia.left}%` 
                    }}>
                      Referência
                    </div>
                    
                    {/* Vencimento */}
                    <div className="absolute bg-blue-200 bg-opacity-50 text-xs px-1 rounded-sm border border-blue-400" style={{ 
                      top: `${positions.vencimento.top}%`, 
                      left: `${positions.vencimento.left}%` 
                    }}>
                      Vencimento
                    </div>
                    
                    {/* Valor kWh */}
                    <div className="absolute bg-purple-200 bg-opacity-50 text-xs px-1 rounded-sm border border-purple-400 text-center" style={{ 
                      top: `${positions.valorKwh.top}%`, 
                      left: `${positions.valorKwh.left}%`,
                      width: `${positions.valorKwh.width}%`
                    }}>
                      Valor kWh
                    </div>
                    
                    {/* Desconto */}
                    <div className="absolute bg-yellow-200 bg-opacity-50 text-xs px-1 rounded-sm border border-yellow-400 text-center" style={{ 
                      top: `${positions.desconto.top}%`, 
                      left: `${positions.desconto.left}%`,
                      width: `${positions.desconto.width}%`
                    }}>
                      Desconto
                    </div>
                    
                    {/* Valor kWh Faturado */}
                    <div className="absolute bg-orange-200 bg-opacity-50 text-xs px-1 rounded-sm border border-orange-400 text-center" style={{ 
                      top: `${positions.valorKwhFaturado.top}%`, 
                      left: `${positions.valorKwhFaturado.left}%`,
                      width: `${positions.valorKwhFaturado.width}%`
                    }}>
                      Valor Faturado
                    </div>
                    
                    {/* kWh */}
                    <div className="absolute bg-teal-200 bg-opacity-50 text-xs px-1 rounded-sm border border-teal-400" style={{ 
                      top: `${positions.kwh.top}%`, 
                      left: `${positions.kwh.left}%` 
                    }}>
                      kWh
                    </div>
                    
                    {/* Valor Total */}
                    <div className="absolute bg-indigo-200 bg-opacity-50 text-xs px-1 rounded-sm border border-indigo-400 text-center" style={{ 
                      top: `${positions.valorTotal.top}%`, 
                      left: `${positions.valorTotal.left}%`,
                      width: `${positions.valorTotal.width}%`
                    }}>
                      Valor Total
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Editar Posições dos Elementos</CardTitle>
                <CardDescription>
                  Ajuste as posições em porcentagem (%) relativa à imagem do boleto
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...positionsForm}>
                  <form className="space-y-4">
                    <div className="flex items-center gap-2 mb-4">
                      <div className="w-4 h-4 bg-red-200 border border-red-400 rounded-sm"></div>
                      <h3 className="font-medium">Nome do Cliente</h3>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={positionsForm.control}
                        name="clientName.top"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Posição Topo (%)</FormLabel>
                            <FormControl>
                              <Input type="number" step="0.1" {...field} disabled={!isEditingPositions} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={positionsForm.control}
                        name="clientName.left"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Posição Esquerda (%)</FormLabel>
                            <FormControl>
                              <Input type="number" step="0.1" {...field} disabled={!isEditingPositions} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <Separator />

                    <div className="flex items-center gap-2 mb-4">
                      <div className="w-4 h-4 bg-green-200 border border-green-400 rounded-sm"></div>
                      <h3 className="font-medium">Mês de Referência</h3>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={positionsForm.control}
                        name="mesReferencia.top"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Posição Topo (%)</FormLabel>
                            <FormControl>
                              <Input type="number" step="0.1" {...field} disabled={!isEditingPositions} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={positionsForm.control}
                        name="mesReferencia.left"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Posição Esquerda (%)</FormLabel>
                            <FormControl>
                              <Input type="number" step="0.1" {...field} disabled={!isEditingPositions} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <Separator />

                    <div className="flex items-center gap-2 mb-4">
                      <div className="w-4 h-4 bg-blue-200 border border-blue-400 rounded-sm"></div>
                      <h3 className="font-medium">Vencimento</h3>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={positionsForm.control}
                        name="vencimento.top"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Posição Topo (%)</FormLabel>
                            <FormControl>
                              <Input type="number" step="0.1" {...field} disabled={!isEditingPositions} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={positionsForm.control}
                        name="vencimento.left"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Posição Esquerda (%)</FormLabel>
                            <FormControl>
                              <Input type="number" step="0.1" {...field} disabled={!isEditingPositions} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <Separator />

                    {isEditingPositions && (
                      <Button 
                        type="button" 
                        variant="outline" 
                        onClick={resetPositions}
                        className="w-full"
                      >
                        <RefreshCw className="mr-2 h-4 w-4" />
                        Restaurar Posições Padrão
                      </Button>
                    )}
                  </form>
                </Form>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="detalhes" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Detalhes Técnicos</CardTitle>
            </CardHeader>
            <CardContent>
              {selectedInvoice && <InvoiceViewer initialInvoice={selectedInvoice as any} />}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="historico" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Histórico de Consumo</CardTitle>
            </CardHeader>
            <CardContent>
              <p>Histórico de consumo e geração será implementado em breve.</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

