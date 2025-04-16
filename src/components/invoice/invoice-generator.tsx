"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Checkbox } from "@/components/ui/checkbox"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Separator } from "@/components/ui/separator"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { AlertCircle, Calculator, Check, Download, FileText, Info, CalendarIcon, X } from "lucide-react"
import { toast } from "sonner"
import { useCemigDataStore } from "@/store/cemigDataStore"
import { formatCurrency } from "@/lib/utils/format"
import { createLogger } from "@/lib/utils/logger"
import { ptBR } from "date-fns/locale"
import { format, addDays } from "date-fns"
import { cn } from "@/lib/utils"
import { TooltipProvider } from "@/components/ui/tooltip"
import { KWH_TO_CO2_FACTOR, CO2_TO_TREES_FACTOR, INVOICE_CALCULATION } from "@/lib/constants/invoice"
import { useDistributorStore } from "@/store/distributorStore"

const logger = createLogger("InvoiceGenerator")

// Interfaces
interface Installation {
  id: string
  name: string
  installationNumber: string
  type: 'GENERATOR' | 'CONSUMER'
  distributorId: string
  distributorName?: string
  defaultCalculationType?: "receipt" | "compensation"
}

interface Customer {
  id: string
  name: string
  installations: Installation[]
  defaultCalculationType?: "receipt" | "compensation"
}

interface Distributor {
  id: string
  name: string
  pricePerKwh: number
}

// Constantes para cálculos
const DEFAULT_DISCOUNT = 0.20 // Desconto padrão de 20%

// Colunas disponíveis para a tabela técnica
const AVAILABLE_COLUMNS = [
  { id: "reference", label: "Referência" },
  { id: "installation", label: "Instalação" },
  { id: "period", label: "Período" },
  { id: "consumption", label: "Consumo" },
  { id: "generation", label: "Geração" },
  { id: "receipt", label: "Recebimento" },
  { id: "compensation", label: "Compensação" },
  { id: "balance", label: "Saldo Atual" },
  { id: "value", label: "Valor (R$)" }
]

export function InvoiceGenerator() {
  // Estado
  const [selectedMonth, setSelectedMonth] = useState<string>(format(new Date(), "MM/yyyy"))
  const [selectedCustomer, setSelectedCustomer] = useState<string>("")
  const [selectedInstallations, setSelectedInstallations] = useState<string[]>([])
  const [calculationType, setCalculationType] = useState<"receipt" | "compensation">("compensation")
  const [rateValue, setRateValue] = useState<number>(0)
  const [distributors, setDistributors] = useState<Distributor[]>([])
  const [isLoadingDistributors, setIsLoadingDistributors] = useState<boolean>(false)
  const [discountPercentage, setDiscountPercentage] = useState<number>(DEFAULT_DISCOUNT * 100)
  const [issuanceDate, setIssuanceDate] = useState<Date>(new Date())
  const [dueDate, setDueDate] = useState<Date>(addDays(new Date(), 7))
  const [selectedColumns, setSelectedColumns] = useState<string[]>(["reference", "installation", "period", "consumption", "compensation", "receipt", "balance", "value"])
  const [isGenerating, setIsGenerating] = useState<boolean>(false)
  const [showPreview, setShowPreview] = useState<boolean>(false)
  
  // Dados do cemig store
  const cemigData = useCemigDataStore(state => state.cemigData)
  const fetchDistributors = useDistributorStore(state => state.fetchDistributors)
  const allDistributors = useDistributorStore(state => state.distributors)
  
  // Dados mockados para demonstração (a serem substituídos por dados reais do banco)
  const mockCustomers: Customer[] = [
    {
      id: "cust_001",
      name: "GBBH Lojas",
      defaultCalculationType: "compensation",
      installations: [
        { id: "inst_001", name: "GBBH - Lj 01", installationNumber: "3013096188", type: "CONSUMER", distributorId: "dist_001", distributorName: "CEMIG", defaultCalculationType: "compensation" },
        { id: "inst_002", name: "GBBH - Lj 02", installationNumber: "3013110767", type: "CONSUMER", distributorId: "dist_001", distributorName: "CEMIG", defaultCalculationType: "compensation" }
      ]
    },
    {
      id: "cust_002",
      name: "Supermercado XYZ",
      defaultCalculationType: "receipt",
      installations: [
        { id: "inst_003", name: "Matriz", installationNumber: "3014964883", type: "CONSUMER", distributorId: "dist_001", distributorName: "CEMIG", defaultCalculationType: "receipt" },
        { id: "inst_004", name: "Filial 01", installationNumber: "3015678901", type: "CONSUMER", distributorId: "dist_001", distributorName: "CEMIG", defaultCalculationType: "receipt" }
      ]
    }
  ]
  
  // Cálculos derivados
  const calculatedRate = rateValue * (1 - (discountPercentage / 100))
  
  // Dados filtrados com base nas seleções
  const filteredCemigData = cemigData.filter(item => {
    return (
      item.period === selectedMonth &&
      selectedInstallations.includes(item.installationNumber)
    )
  })
  
  // Cálculos de resumo para os dados filtrados
  const totalConsumption = filteredCemigData.reduce((sum, item) => sum + (item.consumption || 0), 0)
  const totalGeneration = filteredCemigData.reduce((sum, item) => sum + (item.generation || 0), 0)
  const totalReceived = filteredCemigData.reduce((sum, item) => sum + (item.received || 0), 0)
  const totalCompensation = filteredCemigData.reduce((sum, item) => sum + (item.compensation || 0), 0)
  
  // Cálculo do kwh a ser faturado com base no tipo de cálculo
  const calculateTotalKwh = (): number => {
    if (!filteredCemigData.length) return 0
    
    if (calculationType === "receipt") {
      return totalReceived
    } else {
      return totalCompensation
    }
  }
  
  const kwhtTotal = calculateTotalKwh()
  const totalAmount = kwhtTotal * calculatedRate
  
  // Cálculo da economia em R$
  const calculateFinancialSavings = (): number => {
    // Para compensação, a economia é a diferença entre pagar valor integral e o valor com desconto
    // (Total consumido - Total compensado) * valor integral - (Total consumido - Total compensado) * valor com desconto
    const fullAmount = totalConsumption * rateValue
    const discountedAmount = (totalConsumption - (calculationType === "compensation" ? totalCompensation : totalReceived)) * calculatedRate
    return fullAmount - discountedAmount
  }
  
  // Histórico de consumo
  const historicalData = [
    { period: "01/2024", consumption: 2774, generation: 2574, received: 2574, compensation: 2574 },
    { period: "02/2024", consumption: 2846, generation: 2646, received: 2646, compensation: 2646 },
    { period: "03/2024", consumption: 3389, generation: 3189, received: 3189, compensation: 3189 },
    { period: "04/2024", consumption: 3234, generation: 3034, received: 3034, compensation: 3034 },
    { period: "05/2024", consumption: 3155, generation: 2955, received: 2955, compensation: 2955 },
    { period: "06/2024", consumption: 3814, generation: 3614, received: 3614, compensation: 3614 },
    { period: "07/2024", consumption: 3617, generation: 3416, received: 3416, compensation: 3416 },
    { period: "08/2024", consumption: 3717, generation: 3517, received: 3517, compensation: 3517 },
    { period: "09/2024", consumption: 3906, generation: 3705, received: 3705, compensation: 3705 },
    { period: "10/2024", consumption: 3367, generation: 3133.03, received: 3133.03, compensation: 3133.03 },
    { period: "11/2024", consumption: 2591, generation: 2354.32, received: 2354.32, compensation: 2354.32 },
    { period: "12/2024", consumption: 3116, generation: 2916, received: 2916, compensation: 2916 },
    { period: "01/2025", consumption: 2238, generation: 2038, received: 2038, compensation: 2038 }
  ]
  
  // Calcular economia total acumulada
  const calculateTotalSavings = (): number => {
    return historicalData.reduce((sum, item) => {
      const compensatedAmount = calculationType === "compensation" ? item.compensation : item.received
      const fullPrice = item.consumption * rateValue
      const discountedPrice = (item.consumption - compensatedAmount) * calculatedRate
      return sum + (fullPrice - discountedPrice)
    }, 0)
  }
  
  // Calcular carbono não emitido (kg) baseado em fatores de conversão definidos
  const calculateCarbonSavings = (): { co2: number, trees: number } => {
    const totalCompensated = historicalData.reduce((sum, item) => {
      return sum + (calculationType === "compensation" ? item.compensation : item.received)
    }, 0)
    
    // Usar constante de conversão kWh para kg CO2
    const co2Avoided = totalCompensated * KWH_TO_CO2_FACTOR
    
    // Calcular equivalência em árvores (usando fator de conversão)
    const treesEquivalent = co2Avoided / CO2_TO_TREES_FACTOR
    
    return { 
      co2: co2Avoided,
      trees: treesEquivalent
    }
  }
  
  // Buscar distribuidoras e suas taxas
  useEffect(() => {
    const loadDistributors = async () => {
      setIsLoadingDistributors(true)
      try {
        await fetchDistributors()
        setDistributors(allDistributors)
        setIsLoadingDistributors(false)
      } catch (error) {
        logger.error("Erro ao buscar distribuidoras", { error })
        toast.error("Erro ao carregar dados das distribuidoras")
        setIsLoadingDistributors(false)
      }
    }
    
    loadDistributors()
  }, [fetchDistributors, allDistributors])
  
  // Atualizar a taxa do kWh baseado nas instalações selecionadas
  useEffect(() => {
    if (selectedInstallations.length > 0 && selectedCustomer) {
      // Encontrar o cliente selecionado
      const currentCustomer = mockCustomers.find(c => c.id === selectedCustomer);
      
      if (!currentCustomer) return;
      
      // Filtra as instalações selecionadas
      const selectedInsts = currentCustomer.installations.filter(
        inst => selectedInstallations.includes(inst.installationNumber)
      )
      
      // Se há instalações selecionadas
      if (selectedInsts.length > 0) {
        // Pega o ID da distribuidora da primeira instalação para iniciar
        const firstDistributorId = selectedInsts[0].distributorId
        
        // Verifica se todas as instalações têm a mesma distribuidora
        const allSameDistributor = selectedInsts.every(inst => 
          inst.distributorId === firstDistributorId
        )
        
        if (allSameDistributor) {
          // Busca a taxa da distribuidora
          const distributor = distributors.find(d => d.id === firstDistributorId)
          if (distributor && distributor.pricePerKwh) {
            setRateValue(distributor.pricePerKwh)
            logger.info(`Taxa de kWh atualizada para ${distributor.pricePerKwh} da distribuidora ${distributor.name}`)
          }
        } else {
          // Se instalações de diferentes distribuidoras, calcular média ponderada ou alertar usuário
          toast.warning("Instalações selecionadas pertencem a diferentes distribuidoras")
          
          // Para simplificar, usar a taxa da primeira instalação
          const distributor = distributors.find(d => d.id === firstDistributorId)
          if (distributor && distributor.pricePerKwh) {
            setRateValue(distributor.pricePerKwh)
            logger.info(`Taxa de kWh definida para ${distributor.pricePerKwh} (primeira distribuidora)`)
          }
        }
      }
    }
  }, [selectedInstallations, selectedCustomer, distributors, mockCustomers])
  
  // Lógica para atualizar data de vencimento automaticamente
  useEffect(() => {
    setDueDate(addDays(issuanceDate, 7))
  }, [issuanceDate])
  
  // Quando o cliente é selecionado, detectar o tipo de cálculo padrão
  useEffect(() => {
    if (selectedCustomer) {
      const customer = mockCustomers.find(c => c.id === selectedCustomer)
      if (customer?.defaultCalculationType) {
        setCalculationType(customer.defaultCalculationType)
      }
      
      // Reset seleção de instalações quando cliente muda
      setSelectedInstallations([])
    }
  }, [selectedCustomer])
  
  // Método para gerar a fatura
  const handleGenerateInvoice = async () => {
    if (!selectedCustomer || selectedInstallations.length === 0) {
      toast.error("Selecione um cliente e pelo menos uma instalação")
      return
    }
    
    setIsGenerating(true)
    
    try {
      const invoiceData = {
        clientId: selectedCustomer,
        installationNumbers: selectedInstallations,
        calculationType,
        period: selectedMonth,
        kwhRate: rateValue,
        discount: discountPercentage,
        issueDate: issuanceDate.toISOString(),
        dueDate: dueDate.toISOString(),
        selectedColumns
      }
      
      logger.info("Enviando dados para geração de fatura", invoiceData)
      
      const response = await fetch('/api/invoices/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(invoiceData)
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Erro ao gerar fatura')
      }
      
      const result = await response.json()
      
      logger.info("Fatura gerada com sucesso", result)
      toast.success("Fatura gerada com sucesso!")
      
      // Redirecionar para a página da fatura
      if (result.invoice?.id) {
        window.location.href = `/admin/financeiro/faturas/${result.invoice.id}`
      }
    } catch (error) {
      logger.error("Erro ao gerar fatura", { error })
      toast.error(error instanceof Error ? error.message : "Erro ao gerar fatura")
    } finally {
      setIsGenerating(false)
    }
  }
  
  // Encontrar o cliente selecionado
  const customer = mockCustomers.find(c => c.id === selectedCustomer)
  
  // Verificar se calculationType no cliente é diferente da seleção atual
  const isCalculationTypeChanged = customer?.defaultCalculationType && 
    customer.defaultCalculationType !== calculationType
    
  // Calcular impacto ambiental
  const environmentalImpact = calculateCarbonSavings()
  
  // Calcular o valor para cada instalação com base no tipo de cálculo
  const calculateInstallationValues = () => {
    if (!filteredCemigData.length) return [];
    
    return filteredCemigData.map(item => {
      const kwh = calculationType === "receipt" ? (item.received || 0) : (item.compensation || 0);
      const value = kwh * calculatedRate;
      
      return {
        installationNumber: item.installationNumber,
        kwh,
        value
      };
    });
  }
  
  const installationValues = calculateInstallationValues();
  
  // Obter referência (nome) da instalação a partir do número
  const getInstallationReference = (installationNumber: string) => {
    if (!customer) return installationNumber;
    
    const installation = customer.installations.find(
      inst => inst.installationNumber === installationNumber
    );
    
    return installation?.name || installationNumber;
  }
  
  return (
    <div className="space-y-6 p-4 ">
      <Tabs defaultValue="basic" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="basic" id="basic-tab">Dados Básicos</TabsTrigger>
          <TabsTrigger value="calculations" id="calculations-tab">Cálculos</TabsTrigger>
          <TabsTrigger value="preview" id="preview-tab">Visualização</TabsTrigger>
        </TabsList>
        
        <TabsContent value="basic" className="space-y-4 mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="period">Período de Referência</Label>
              <Select
                value={selectedMonth}
                onValueChange={setSelectedMonth}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o período" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="01/2025">Janeiro/2025</SelectItem>
                  <SelectItem value="12/2024">Dezembro/2024</SelectItem>
                  <SelectItem value="11/2024">Novembro/2024</SelectItem>
                  <SelectItem value="10/2024">Outubro/2024</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="customer">Cliente</Label>
              <Select
                value={selectedCustomer}
                onValueChange={setSelectedCustomer}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o cliente" />
                </SelectTrigger>
                <SelectContent>
                  {mockCustomers.map(customer => (
                    <SelectItem key={customer.id} value={customer.id}>
                      {customer.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          {customer && (
            <div className="space-y-2">
              <Label>Instalações</Label>
              <Card>
                <CardContent className="pt-4 pb-2">
                  {customer.installations.map(installation => (
                    <div key={installation.id} className="flex items-center space-x-2 mb-2">
                      <Checkbox
                        id={`installation-${installation.id}`}
                        checked={selectedInstallations.includes(installation.installationNumber)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedInstallations([...selectedInstallations, installation.installationNumber])
                          } else {
                            setSelectedInstallations(selectedInstallations.filter(id => id !== installation.installationNumber))
                          }
                        }}
                      />
                      <Label htmlFor={`installation-${installation.id}`} className="cursor-pointer">
                        {installation.name} ({installation.installationNumber})
                      </Label>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          )}
          
          <div className="space-y-2 p-4 ">
            <Label>Tipo de Cálculo</Label>
            <RadioGroup
              value={calculationType}
              onValueChange={(value) => setCalculationType(value as "receipt" | "compensation")}
              className="flex flex-col space-y-1"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="receipt" id="calculation-receipt" />
                <Label htmlFor="calculation-receipt" className="cursor-pointer">
                  Recebimento
                </Label>
                <TooltipProvider>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Info className="h-4 w-4 text-gray-400 cursor-pointer" />
                    </PopoverTrigger>
                    <PopoverContent className="w-80 p-4">
                      <p className="text-sm">
                        Cálculo por recebimento considera o total de energia recebida pelas instalações. Isso representa toda a energia transferida da usina para o cliente, mesmo que não tenha sido completamente consumida.
                      </p>
                    </PopoverContent>
                  </Popover>
                </TooltipProvider>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="compensation" id="calculation-compensation" />
                <Label htmlFor="calculation-compensation" className="cursor-pointer">
                  Compensação
                </Label>
                <TooltipProvider>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Info className="h-4 w-4 text-gray-400 cursor-pointer" />
                    </PopoverTrigger>
                    <PopoverContent className="w-80 p-4">
                      <p className="text-sm">
                        Cálculo por compensação considera apenas a energia efetivamente compensada nas instalações, que é o mínimo entre o consumo e o recebimento. Este é o valor que realmente aparece na conta de luz do cliente.
                      </p>
                    </PopoverContent>
                  </Popover>
                </TooltipProvider>
              </div>
            </RadioGroup>
            
            {isCalculationTypeChanged && (
              <Alert className="mt-2">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Atenção</AlertTitle>
                <AlertDescription>
                  O tipo de cálculo selecionado é diferente do configurado para este cliente.
                </AlertDescription>
              </Alert>
            )}
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="issuanceDate">Data de Emissão</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant={"outline"}
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !issuanceDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {issuanceDate ? format(issuanceDate, "PPP", { locale: ptBR }) : <span>Selecionar data</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={issuanceDate}
                    onSelect={(date) => date && setIssuanceDate(date)}
                    initialFocus
                    locale={ptBR}
                  />
                </PopoverContent>
              </Popover>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="dueDate">Data de Vencimento</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant={"outline"}
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !dueDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dueDate ? format(dueDate, "PPP", { locale: ptBR }) : <span>Selecionar data</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={dueDate}
                    onSelect={(date) => date && setDueDate(date)}
                    initialFocus
                    locale={ptBR}
                  />
                </PopoverContent>
              </Popover>
              <p className="text-xs text-gray-500">7 dias após a emissão</p>
            </div>
          </div>
          
          <div className="flex justify-end">
            <Button onClick={() => document.getElementById("calculations-tab")?.click()}>
              Próximo: Cálculos
            </Button>
          </div>
        </TabsContent>
        
        <TabsContent value="calculations" className="space-y-4 mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="kwh-rate">Valor kWh (R$)</Label>
              <Input
                id="kwh-rate"
                type="number"
                step="0.001"
                value={rateValue}
                onChange={(e) => setRateValue(Number(e.target.value))}
                disabled={isLoadingDistributors}
              />
              {isLoadingDistributors && (
                <p className="text-xs text-muted-foreground">Carregando taxas das distribuidoras...</p>
              )}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="discount">Desconto (%)</Label>
              <Input
                id="discount"
                type="number"
                step="1"
                value={discountPercentage}
                onChange={(e) => setDiscountPercentage(Number(e.target.value))}
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <Label>Valor kWh Faturado</Label>
            <div className="p-3 bg-gray-50 rounded-md border">
              <div className="flex justify-between items-center">
                <span className="font-medium">R$ {calculatedRate.toFixed(3)}</span>
                <span className="text-sm text-gray-500">
                  {rateValue.toFixed(3)} x (1 - {discountPercentage}%)
                </span>
              </div>
            </div>
          </div>
          
          <div className="space-y-4">
            <div className="p-3 bg-gray-50 rounded-md border">
              <div className="font-medium mb-2">Resumo do período {selectedMonth}</div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                <span className="text-gray-600">Consumo Total:</span>
                <span className="text-right">{totalConsumption.toLocaleString('pt-BR')} kWh</span>
                
                <span className="text-gray-600">Recebimento Total:</span>
                <span className="text-right">{totalReceived.toLocaleString('pt-BR')} kWh</span>
                
                <span className="text-gray-600">Compensação Total:</span>
                <span className="text-right">{totalCompensation.toLocaleString('pt-BR')} kWh</span>
              </div>
            </div>
          
            <div className="flex justify-between items-center">
              <Label>Tipo de Cálculo Selecionado</Label>
              <Badge variant="outline">
                {calculationType === "receipt" ? "Recebimento" : "Compensação"}
              </Badge>
            </div>
            
            <div className="p-3 bg-gray-50 rounded-md border">
              <div className="flex justify-between items-center">
                <span className="font-medium">Qtde kWh Faturado</span>
                <span>{kwhtTotal.toLocaleString('pt-BR')} kWh</span>
              </div>
            </div>
          </div>
          
          <div className="space-y-2">
            <Label>Valor a Pagar</Label>
            <div className="p-4 bg-teal-50 rounded-md border border-teal-200">
              <div className="flex justify-between items-center">
                <span className="font-bold text-teal-800">Total</span>
                <span className="font-bold text-teal-800">
                  {formatCurrency(totalAmount)}
                </span>
              </div>
            </div>
          </div>
          
          <div className="space-y-2">
            <Label>Informações Adicionais</Label>
            <Card>
              <CardContent className="pt-4">
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Total Economizado</span>
                    <span className="font-medium">{formatCurrency(calculateFinancialSavings())}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Carbono não emitido</span>
                    <span className="font-medium">{environmentalImpact.co2.toFixed(2)} kg</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Equivalente em árvores</span>
                    <span className="font-medium">{Math.round(environmentalImpact.trees)} árvores</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
          
          <div className="flex justify-between">
            <Button variant="outline" onClick={() => document.getElementById("basic-tab")?.click()}>
              Voltar
            </Button>
            <Button onClick={() => document.getElementById("preview-tab")?.click()}>
              Próximo: Visualização
            </Button>
          </div>
        </TabsContent>
        
        <TabsContent value="preview" className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label>Colunas da Tabela Técnica</Label>
            <div className="p-4 bg-muted/30 rounded-md">
              <div className="mb-2 text-sm font-medium">Selecione as colunas a serem exibidas:</div>
              <div className="flex flex-wrap gap-2">
                {AVAILABLE_COLUMNS.map((column) => (
                  <Badge 
                    key={column.id} 
                    variant={selectedColumns.includes(column.id) ? "default" : "outline"}
                    className={cn(
                      "cursor-pointer px-3 py-1.5", 
                      selectedColumns.includes(column.id) ? "bg-primary text-primary-foreground hover:bg-primary/90" : "hover:bg-muted"
                    )}
                    onClick={() => {
                      if (selectedColumns.includes(column.id)) {
                        setSelectedColumns(selectedColumns.filter(c => c !== column.id))
                      } else {
                        setSelectedColumns([...selectedColumns, column.id])
                      }
                    }}
                  >
                    {column.label}
                    {selectedColumns.includes(column.id) && (
                      <X className="ml-1 h-3 w-3" />
                    )}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
          
          <div className="space-y-2">
            <Label>Tabela de Consumo e Geração Mensal</Label>
            <div className="border rounded-md overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    {selectedColumns.includes("reference") && (
                      <TableHead>Referência</TableHead>
                    )}
                    {selectedColumns.includes("installation") && (
                      <TableHead>Instalação</TableHead>
                    )}
                    {selectedColumns.includes("period") && (
                      <TableHead>Período</TableHead>
                    )}
                    {selectedColumns.includes("consumption") && (
                      <TableHead className="text-right">Consumo (kWh)</TableHead>
                    )}
                    {selectedColumns.includes("generation") && (
                      <TableHead className="text-right">Geração (kWh)</TableHead>
                    )}
                    {selectedColumns.includes("receipt") && (
                      <TableHead className="text-right">Recebimento (kWh)</TableHead>
                    )}
                    {selectedColumns.includes("compensation") && (
                      <TableHead className="text-right">Compensação (kWh)</TableHead>
                    )}
                    {selectedColumns.includes("balance") && (
                      <TableHead className="text-right">Saldo Atual (kWh)</TableHead>
                    )}
                    {selectedColumns.includes("value") && (
                      <TableHead className="text-right">Valor (R$)</TableHead>
                    )}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCemigData.map((item) => (
                    <TableRow key={item.installationNumber}>
                      {selectedColumns.includes("reference") && (
                        <TableCell>{getInstallationReference(item.installationNumber)}</TableCell>
                      )}
                      {selectedColumns.includes("installation") && (
                        <TableCell>{item.installationNumber}</TableCell>
                      )}
                      {selectedColumns.includes("period") && (
                        <TableCell>{item.period}</TableCell>
                      )}
                      {selectedColumns.includes("consumption") && (
                        <TableCell className="text-right">{(item.consumption || 0).toLocaleString('pt-BR')}</TableCell>
                      )}
                      {selectedColumns.includes("generation") && (
                        <TableCell className="text-right">{(item.generation || 0).toLocaleString('pt-BR')}</TableCell>
                      )}
                      {selectedColumns.includes("receipt") && (
                        <TableCell className="text-right">{(item.received || 0).toLocaleString('pt-BR')}</TableCell>
                      )}
                      {selectedColumns.includes("compensation") && (
                        <TableCell className="text-right">{(item.compensation || 0).toLocaleString('pt-BR')}</TableCell>
                      )}
                      {selectedColumns.includes("balance") && (
                        <TableCell className="text-right">{(item.balance || 0).toLocaleString('pt-BR')}</TableCell>
                      )}
                      {selectedColumns.includes("value") && (
                        <TableCell className="text-right">{formatCurrency(
                          (calculationType === "receipt" ? (item.received || 0) : (item.compensation || 0)) * calculatedRate
                        )}</TableCell>
                      )}
                    </TableRow>
                  ))}
                  <TableRow className="bg-muted/50 font-medium">
                    <TableCell colSpan={
                      (selectedColumns.includes("reference") ? 1 : 0) +
                      (selectedColumns.includes("installation") ? 1 : 0) +
                      (selectedColumns.includes("period") ? 1 : 0)
                    }>
                      Total
                    </TableCell>
                    {selectedColumns.includes("consumption") && (
                      <TableCell className="text-right">
                        {totalConsumption.toLocaleString('pt-BR')}
                      </TableCell>
                    )}
                    {selectedColumns.includes("generation") && (
                      <TableCell className="text-right">
                        {totalGeneration.toLocaleString('pt-BR')}
                      </TableCell>
                    )}
                    {selectedColumns.includes("receipt") && (
                      <TableCell className="text-right">
                        {totalReceived.toLocaleString('pt-BR')}
                      </TableCell>
                    )}
                    {selectedColumns.includes("compensation") && (
                      <TableCell className="text-right">
                        {totalCompensation.toLocaleString('pt-BR')}
                      </TableCell>
                    )}
                    {selectedColumns.includes("balance") && (
                      <TableCell className="text-right">
                        {(filteredCemigData.reduce((sum, item) => sum + (item.balance || 0), 0)).toLocaleString('pt-BR')}
                      </TableCell>
                    )}
                    {selectedColumns.includes("value") && (
                      <TableCell className="text-right">
                        {formatCurrency(totalAmount)}
                      </TableCell>
                    )}
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          </div>
          
          <div className="space-y-2">
            <Label>Resumo da Fatura</Label>
            <Card>
              <CardContent className="pt-4">
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-y-2">
                    <span className="text-gray-600">Cliente</span>
                    <span className="font-medium">{customer?.name || '-'}</span>
                    
                    <span className="text-gray-600">Instalações</span>
                    <span className="font-medium">{selectedInstallations.length} selecionada(s)</span>
                    
                    <span className="text-gray-600">Período</span>
                    <span className="font-medium">{selectedMonth}</span>
                    
                    <span className="text-gray-600">Cálculo</span>
                    <span className="font-medium">{calculationType === "receipt" ? "Recebimento" : "Compensação"}</span>
                    
                    <span className="text-gray-600">kWh Faturado</span>
                    <span className="font-medium">{kwhtTotal.toLocaleString('pt-BR')} kWh</span>
                    
                    <span className="text-gray-600">Valor kWh</span>
                    <span className="font-medium">R$ {calculatedRate.toFixed(3)}</span>
                    
                    <span className="text-gray-600">Emissão</span>
                    <span className="font-medium">{format(issuanceDate, "dd/MM/yyyy")}</span>
                    
                    <span className="text-gray-600">Vencimento</span>
                    <span className="font-medium">{format(dueDate, "dd/MM/yyyy")}</span>
                    
                    <span className="text-gray-600">Total Economizado</span>
                    <span className="font-medium text-green-600">{formatCurrency(calculateFinancialSavings())}</span>
                    
                    <span className="text-gray-600">Carbono não emitido</span>
                    <span className="font-medium text-green-600">{environmentalImpact.co2.toFixed(2)} kg</span>
                    
                    <span className="text-gray-600">Equivalente em árvores</span>
                    <span className="font-medium text-green-600">{Math.round(environmentalImpact.trees)} árvores</span>
                  </div>
                  
                  <Separator />
                  
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-semibold text-teal-800">Valor a Pagar</span>
                    <span className="text-lg font-semibold text-teal-800">{formatCurrency(totalAmount)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
          
          <div className="flex justify-between">
            <Button variant="outline" onClick={() => document.getElementById("calculations-tab")?.click()}>
              Voltar
            </Button>
            <div className="flex gap-2">
              <Button variant="outline" disabled={isGenerating || !selectedCustomer || selectedInstallations.length === 0}>
                <Download className="h-4 w-4 mr-2" />
                Baixar Prévia
              </Button>
              <Button 
                onClick={handleGenerateInvoice} 
                disabled={isGenerating || !selectedCustomer || selectedInstallations.length === 0}
                className="bg-teal-600 hover:bg-teal-700"
              >
                {isGenerating ? (
                  <>Gerando...</>
                ) : (
                  <>
                    <FileText className="h-4 w-4 mr-2" />
                    Gerar Fatura
                  </>
                )}
              </Button>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
} 