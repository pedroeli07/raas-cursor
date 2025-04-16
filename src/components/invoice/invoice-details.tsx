"use client"

import { useState } from "react"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { InvoiceData } from "@/lib/models/energy-data"
import { formatCurrency, formatNumber } from "@/lib/utils/format"
import { InvoiceChart } from "./invoice-chart"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Download, Printer, Send } from "lucide-react"
import { toast } from "sonner"
import { SendInvoiceDialog } from "./send-invoice-dialog"
import { Invoice } from "@/types/invoice"

interface InvoiceDetailsProps {
  invoice: InvoiceData | Invoice
  invoiceHistory?: InvoiceData[]
  customerEmail?: string
  customerPhone?: string
}

export function InvoiceDetails({ 
  invoice, 
  invoiceHistory = [],
  customerEmail,
  customerPhone 
}: InvoiceDetailsProps) {
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false)
  const [pdfBase64, setPdfBase64] = useState<string>()

  // Safely get properties with type checking
  const getInvoiceReference = (inv: InvoiceData | Invoice): string => {
    if ('period' in inv && inv.period && 'reference' in inv.period) {
      return inv.period.reference as string;
    } else if ('referenceMonth' in inv) {
      return inv.referenceMonth as string;
    }
    return '';
  };

  const includedHistory = [invoice, ...(invoiceHistory || [])]
  const sortedHistory = [...includedHistory].sort(
    (a, b) => {
      const aRef = getInvoiceReference(a);
      const bRef = getInvoiceReference(b);
      return new Date(bRef || '').getTime() - new Date(aRef || '').getTime();
    }
  )

  // Calculate savings and environmental impact
  const hasRates = 'rates' in invoice;
  const hasPeriod = 'period' in invoice;
  const hasCalculation = 'calculation' in invoice;
  
  const totalConsumption = hasCalculation ? invoice.calculation.totalConsumption : 'consumptionKwh' in invoice ? invoice.consumptionKwh : 0;
  const cemigRate = hasRates ? invoice.rates.cemigRate : 'distributorRate' in invoice ? invoice.distributorRate : 0;
  const billedRate = hasRates ? invoice.rates.billedRate : 'effectiveRate' in invoice ? invoice.effectiveRate : 0;
  
  const grossValue = totalConsumption * cemigRate;
  const discountValue = grossValue - totalConsumption * billedRate;
  const discountPercentage = (discountValue / grossValue) * 100 || 0;

  // Calculate carbon savings
  const carbonSavingPerKwh = 0.09 // kg CO2 per kWh (approximate value)
  const compensationValue = hasCalculation ? invoice.calculation.totalCompensation : 0;
  const co2Savings = compensationValue * carbonSavingPerKwh;

  // Generate PDF function
  const generatePdf = async () => {
    setIsGeneratingPdf(true)
    try {
      const invoiceId = 'id' in invoice ? invoice.id : '';
      const response = await fetch(`/api/invoices/${invoiceId}/generate-pdf`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error('Failed to generate PDF');
      }
      
      const data = await response.json();
      setPdfBase64(data.pdfBase64);
      return data.pdfBase64;
    } catch (error) {
      console.error("Error generating PDF:", error)
      toast.error("Erro ao gerar PDF. Tente novamente.")
      return null
    } finally {
      setIsGeneratingPdf(false)
    }
  }

  // Download PDF function
  const downloadPdf = async () => {
    try {
      const base64 = pdfBase64 || await generatePdf()
      if (!base64) return
      
      const link = document.createElement("a")
      link.href = `data:application/pdf;base64,${base64}`
      link.download = `fatura_${'id' in invoice ? invoice.id : ''}.pdf`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    } catch (error) {
      console.error("Error downloading PDF:", error)
      toast.error("Erro ao baixar PDF. Tente novamente.")
    }
  }

  // Print PDF function
  const printPdf = async () => {
    try {
      const base64 = pdfBase64 || await generatePdf()
      if (!base64) return
      
      const pdfWindow = window.open("")
      pdfWindow?.document.write(
        `<iframe width='100%' height='100%' src='data:application/pdf;base64,${base64}'></iframe>`
      )
      setTimeout(() => {
        pdfWindow?.document.close()
        pdfWindow?.focus()
        pdfWindow?.print()
      }, 250)
    } catch (error) {
      console.error("Error printing PDF:", error)
      toast.error("Erro ao imprimir PDF. Tente novamente.")
    }
  }

  // Helper function to get invoice number based on type
  const getInvoiceNumber = () => {
    return 'invoiceNumber' in invoice ? invoice.invoiceNumber : '';
  }

  // Helper function to get reference period based on type
  const getReferencePeriod = () => {
    return hasPeriod && 'period' in invoice && invoice.period && 'reference' in invoice.period 
      ? invoice.period.reference 
      : 'referenceMonth' in invoice ? invoice.referenceMonth : '';
  }

  // Helper function to get due date based on type
  const getDueDate = () => {
    if (hasPeriod && 'period' in invoice && invoice.period && 'dueDate' in invoice.period) {
      return invoice.period.dueDate || '';
    } else if ('dueDate' in invoice) {
      const dueDate = invoice.dueDate;
      return dueDate instanceof Date ? dueDate.toLocaleDateString('pt-BR') : dueDate?.toString() || '';
    }
    return '';
  }

  // Helper function to get installation number based on type
  const getInstallationNumber = () => {
    if ('installations' in invoice && Array.isArray(invoice.installations) && invoice.installations.length > 0) {
      return invoice.installations[0].id || '';
    } else if ('installationNumber' in invoice) {
      return invoice.installationNumber || '';
    }
    return '';
  }

  // Helper function to get status based on type
  const getStatus = () => {
    return 'status' in invoice ? invoice.status : '';
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center flex-wrap gap-2 mb-4">
        <h2 className="text-2xl font-bold">Fatura #{getInvoiceNumber()}</h2>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={downloadPdf}
            disabled={isGeneratingPdf}
          >
            {isGeneratingPdf ? (
              <span className="inline-flex items-center gap-1">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                Gerando...
              </span>
            ) : (
              <>
                <Download className="mr-2 h-4 w-4" />
                Baixar PDF
              </>
            )}
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={printPdf}
            disabled={isGeneratingPdf}
          >
            <Printer className="mr-2 h-4 w-4" />
            Imprimir
          </Button>
          <SendInvoiceDialog
            invoice={invoice as any}
            pdfBase64={pdfBase64}
            customerEmail={customerEmail}
            customerPhone={customerPhone}
          >
            <Button
              size="sm"
              disabled={isGeneratingPdf}
            >
              <Send className="mr-2 h-4 w-4" />
              Enviar
            </Button>
          </SendInvoiceDialog>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle>Resumo da Fatura</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-2">Informações Gerais</h3>
                <dl className="grid grid-cols-2 gap-1 text-sm">
                  <dt className="text-muted-foreground">Referência:</dt>
                  <dd className="font-medium text-right">{getReferencePeriod()}</dd>
                  
                  <dt className="text-muted-foreground">Vencimento:</dt>
                  <dd className="font-medium text-right">{getDueDate()}</dd>
                  
                  <dt className="text-muted-foreground">Instalação:</dt>
                  <dd className="font-medium text-right">{getInstallationNumber()}</dd>
                  
                  <dt className="text-muted-foreground">Status:</dt>
                  <dd className="font-medium text-right">
                    <Badge variant={getStatus() === "paid" ? "success" : getStatus() === "pending" ? "warning" : "destructive"}>
                      {getStatus() === "paid" ? "Pago" : getStatus() === "pending" ? "Pendente" : "Atrasado"}
                    </Badge>
                  </dd>
                </dl>
              </div>

              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-2">Valores</h3>
                <dl className="grid grid-cols-2 gap-1 text-sm">
                  <dt className="text-muted-foreground">Valor CEMIG Original:</dt>
                  <dd className="font-medium text-right">{formatCurrency(grossValue)}</dd>
                  
                  <dt className="text-muted-foreground">Desconto DMZ:</dt>
                  <dd className="font-medium text-right text-green-600">- {formatCurrency(discountValue)}</dd>
                  
                  <dt className="font-medium pt-2 border-t">Valor a Pagar:</dt>
                  <dd className="font-bold text-right pt-2 border-t">{formatCurrency(totalConsumption * billedRate)}</dd>
                  
                  <dt className="text-muted-foreground">Economia:</dt>
                  <dd className="font-medium text-right text-green-600">{discountPercentage.toFixed(1)}%</dd>
                </dl>
              </div>

              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-2">Tarifas</h3>
                <dl className="grid grid-cols-2 gap-1 text-sm">
                  <dt className="text-muted-foreground">Tarifa CEMIG:</dt>
                  <dd className="font-medium text-right">{formatCurrency(cemigRate)}/kWh</dd>
                  
                  <dt className="text-muted-foreground">Tarifa DMZ:</dt>
                  <dd className="font-medium text-right">{formatCurrency(billedRate)}/kWh</dd>
                  
                  <dt className="text-muted-foreground">Desconto na Tarifa:</dt>
                  <dd className="font-medium text-right text-green-600">
                    {((1 - billedRate / cemigRate) * 100).toFixed(1)}%
                  </dd>
                </dl>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle>Consumo e Compensação</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[250px]">
              <InvoiceChart invoice={invoice as any} invoiceHistory={invoiceHistory} />
            </div>
          </CardContent>
        </Card>
      </div>

      {hasCalculation && (
        <Accordion type="single" collapsible defaultValue="details">
          <AccordionItem value="details">
            <AccordionTrigger>Detalhes Técnicos</AccordionTrigger>
            <AccordionContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <h3 className="text-sm font-medium mb-2">Consumo</h3>
                  <dl className="grid grid-cols-2 gap-1 text-sm">
                    <dt className="text-muted-foreground">Consumo Total:</dt>
                    <dd className="font-medium text-right">{formatNumber(totalConsumption || 0)} kWh</dd>
                    
                    <dt className="text-muted-foreground">Ponta:</dt>
                    <dd className="font-medium text-right">{formatNumber(hasCalculation && 'calculation' in invoice ? invoice.calculation.peakConsumption || 0 : 0)} kWh</dd>
                    
                    <dt className="text-muted-foreground">Fora Ponta:</dt>
                    <dd className="font-medium text-right">{formatNumber(hasCalculation && 'calculation' in invoice ? invoice.calculation.offPeakConsumption || 0 : 0)} kWh</dd>
                  </dl>
                </div>

                <div>
                  <h3 className="text-sm font-medium mb-2">Compensação</h3>
                  <dl className="grid grid-cols-2 gap-1 text-sm">
                    <dt className="text-muted-foreground">Compensação Total:</dt>
                    <dd className="font-medium text-right">{formatNumber(hasCalculation && 'calculation' in invoice ? invoice.calculation.totalCompensation || 0 : 0)} kWh</dd>
                    
                    <dt className="text-muted-foreground">Saldo Anterior:</dt>
                    <dd className="font-medium text-right">{formatNumber(hasCalculation && 'calculation' in invoice ? invoice.calculation.previousBalance || 0 : 0)} kWh</dd>
                    
                    <dt className="text-muted-foreground">Saldo Atual:</dt>
                    <dd className="font-medium text-right">{formatNumber(hasCalculation && 'calculation' in invoice ? invoice.calculation.currentBalance || 0 : 0)} kWh</dd>
                  </dl>
                </div>

                <div>
                  <h3 className="text-sm font-medium mb-2">Impacto Ambiental</h3>
                  <dl className="grid grid-cols-2 gap-1 text-sm">
                    <dt className="text-muted-foreground">CO2 Evitado:</dt>
                    <dd className="font-medium text-right">{formatNumber(co2Savings || 0)} kg</dd>
                    
                    <dt className="text-muted-foreground">Árvores Equivalentes:</dt>
                    <dd className="font-medium text-right">{Math.round(co2Savings / 22)}</dd>
                  </dl>
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="history">
            <AccordionTrigger>Histórico de Faturas</AccordionTrigger>
            <AccordionContent>
              <ScrollArea className="h-[300px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Referência</TableHead>
                      <TableHead>Consumo (kWh)</TableHead>
                      <TableHead>Compensação (kWh)</TableHead>
                      <TableHead>Valor Original</TableHead>
                      <TableHead>Valor Pago</TableHead>
                      <TableHead>Economia</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sortedHistory.map((item, index) => {
                      const itemHasRates = 'rates' in item;
                      const itemHasCalculation = 'calculation' in item;
                      
                      const itemTotalConsumption = itemHasCalculation && 'calculation' in item ? item.calculation.totalConsumption || 0 : 'consumptionKwh' in item ? item.consumptionKwh || 0 : 0;
                      const itemCemigRate = itemHasRates && 'rates' in item ? item.rates.cemigRate || 0 : 'distributorRate' in item ? item.distributorRate || 0 : 0;
                      const itemBilledRate = itemHasRates && 'rates' in item ? item.rates.billedRate || 0 : 'effectiveRate' in item ? item.effectiveRate || 0 : 0;
                      
                      const itemGrossValue = itemTotalConsumption * itemCemigRate;
                      const itemSavings = itemGrossValue - itemTotalConsumption * itemBilledRate;
                      const itemSavingsPercent = (itemSavings / itemGrossValue) * 100 || 0;
                      
                      const itemId = 'id' in item ? item.id : `item-${index}`;
                      const itemStatus = 'status' in item ? item.status : '';
                      const itemReference = getInvoiceReference(item);
                      const itemCompensation = itemHasCalculation && 'calculation' in item ? item.calculation.totalCompensation || 0 : 0;
                      
                      return (
                        <TableRow key={itemId}>
                          <TableCell>{itemReference}</TableCell>
                          <TableCell>{formatNumber(itemTotalConsumption)}</TableCell>
                          <TableCell>{formatNumber(itemCompensation)}</TableCell>
                          <TableCell>{formatCurrency(itemGrossValue)}</TableCell>
                          <TableCell>{formatCurrency(itemTotalConsumption * itemBilledRate)}</TableCell>
                          <TableCell className="text-green-600">{itemSavingsPercent.toFixed(1)}%</TableCell>
                          <TableCell>
                            <Badge variant={itemStatus === "paid" ? "success" : itemStatus === "pending" ? "warning" : "destructive"}>
                              {itemStatus === "paid" ? "Pago" : itemStatus === "pending" ? "Pendente" : "Atrasado"}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </ScrollArea>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      )}
    </div>
  )
}

