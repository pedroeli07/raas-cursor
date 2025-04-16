"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import type { InvoiceData, EnergyRates } from "@/lib/models/energy-data"
import { recalculateInvoice } from "@/lib/utils/energy-data-processor"
import { InvoicePreview } from "@/components/invoice/invoice-preview"
import { InvoiceDetails } from "@/components/invoice/invoice-details"
import { InvoiceChart } from "@/components/invoice/invoice-chart"
import { Download, Edit, Save } from "lucide-react"

interface InvoiceViewerProps {
  initialInvoice: InvoiceData
}

export function InvoiceViewer({ initialInvoice }: InvoiceViewerProps) {
  const [invoice, setInvoice] = useState<InvoiceData>(initialInvoice)
  const [isEditing, setIsEditing] = useState(false)
  const [editedRates, setEditedRates] = useState<EnergyRates>(initialInvoice.rates)

  // Atualizar a fatura quando as taxas editadas mudarem
  useEffect(() => {
    if (isEditing) {
      const updatedInvoice = recalculateInvoice(initialInvoice, editedRates)
      setInvoice(updatedInvoice)
    }
  }, [editedRates, initialInvoice, isEditing])

  const handleSaveChanges = () => {
    setIsEditing(false)
    // Aqui você poderia salvar as alterações no servidor
  }

  const handleCancelChanges = () => {
    setIsEditing(false)
    setEditedRates(initialInvoice.rates)
    setInvoice(initialInvoice)
  }

  const handleDownloadInvoice = () => {
    // Implementação para download da fatura como PDF
    alert("Funcionalidade de download será implementada")
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold text-teal-800">Fatura de Energia</h2>
          <p className="text-gray-600">
            Referência: {invoice.period?.reference || 'N/A'} | Vencimento: {invoice.dueDate || 'N/A'}
          </p>
        </div>
        <div className="flex gap-2">
          {isEditing ? (
            <>
              <Button variant="outline" onClick={handleCancelChanges}>
                Cancelar
              </Button>
              <Button onClick={handleSaveChanges}>
                <Save className="mr-2 h-4 w-4" />
                Salvar Alterações
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={() => setIsEditing(true)}>
                <Edit className="mr-2 h-4 w-4" />
                Editar Valores
              </Button>
              <Button onClick={handleDownloadInvoice}>
                <Download className="mr-2 h-4 w-4" />
                Download PDF
              </Button>
            </>
          )}
        </div>
      </div>

      <Tabs defaultValue="preview" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="preview">Visualização</TabsTrigger>
          <TabsTrigger value="details">Detalhes</TabsTrigger>
          <TabsTrigger value="history">Histórico</TabsTrigger>
        </TabsList>

        <TabsContent value="preview" className="mt-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <InvoicePreview invoice={invoice} />
            </div>

            <div className="space-y-4">
              {isEditing ? (
                <Card>
                  <CardHeader>
                    <CardTitle>Editar Valores</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="cemigRate">Valor kWh CEMIG (R$)</Label>
                      <Input
                        id="cemigRate"
                        type="number"
                        step="0.001"
                        value={editedRates.cemigRate}
                        onChange={(e) =>
                          setEditedRates({
                            ...editedRates,
                            cemigRate: Number.parseFloat(e.target.value),
                          })
                        }
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="discount">Desconto (%)</Label>
                      <div className="flex items-center gap-4">
                        <Slider
                          id="discount"
                          min={0}
                          max={50}
                          step={1}
                          value={[editedRates.discount * 100]}
                          onValueChange={(value) =>
                            setEditedRates({
                              ...editedRates,
                              discount: value[0] / 100,
                              billedRate: editedRates.cemigRate * (1 - value[0] / 100),
                            })
                          }
                          className="flex-1"
                        />
                        <span className="w-12 text-right">{Math.round(editedRates.discount * 100)}%</span>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="billedRate">Valor kWh Faturado (R$)</Label>
                      <Input
                        id="billedRate"
                        type="number"
                        step="0.001"
                        value={editedRates.billedRate}
                        onChange={(e) =>
                          setEditedRates({
                            ...editedRates,
                            billedRate: Number.parseFloat(e.target.value),
                            discount: 1 - Number.parseFloat(e.target.value) / editedRates.cemigRate,
                          })
                        }
                      />
                    </div>
                  </CardContent>
                </Card>
              ) : null}

              <Card>
                <CardHeader>
                  <CardTitle>Resumo</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="text-sm text-gray-500">Valor kWh CEMIG:</div>
                    <div className="text-sm font-medium text-right">R$ {invoice.rates?.cemigRate?.toFixed(3) || "0.000"}</div>

                    <div className="text-sm text-gray-500">Desconto:</div>
                    <div className="text-sm font-medium text-right">{Math.round((invoice.rates?.discount || 0) * 100)}%</div>

                    <div className="text-sm text-gray-500">Valor kWh Faturado:</div>
                    <div className="text-sm font-medium text-right">R$ {invoice.rates?.billedRate?.toFixed(3) || "0.000"}</div>

                    <div className="text-sm text-gray-500">Consumo Total:</div>
                    <div className="text-sm font-medium text-right">
                      {invoice.calculation?.totalConsumption?.toLocaleString("pt-BR") || "0"} kWh
                    </div>

                    <div className="text-sm text-gray-500">Compensação:</div>
                    <div className="text-sm font-medium text-right">
                      {invoice.calculation?.totalCompensation?.toLocaleString("pt-BR") || "0"} kWh
                    </div>
                  </div>

                  <div className="border-t pt-4">
                    <div className="flex justify-between items-center">
                      <div className="text-gray-700 font-medium">Valor Original:</div>
                      <div className="text-gray-700 font-medium">
                        R${" "}
                        {(invoice.calculation?.originalAmount || 0).toLocaleString("pt-BR", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </div>
                    </div>

                    <div className="flex justify-between items-center">
                      <div className="text-gray-700 font-medium">Economia:</div>
                      <div className="text-green-600 font-medium">
                        R${" "}
                        {(invoice.calculation?.savedAmount || 0).toLocaleString("pt-BR", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </div>
                    </div>

                    <div className="flex justify-between items-center mt-2">
                      <div className="text-lg font-bold text-teal-800">Valor a Pagar:</div>
                      <div className="text-lg font-bold text-teal-800">
                        R${" "}
                        {(invoice.calculation?.finalAmount || 0).toLocaleString("pt-BR", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </div>
                    </div>
                  </div>

                  <div className="border-t pt-4">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-green-500"></div>
                      <div className="text-sm">
                        Você evitou {Math.round(invoice.calculation?.co2Avoided || 0).toLocaleString("pt-BR")} kg de CO₂
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="details" className="mt-4">
          <InvoiceDetails invoice={invoice} />
        </TabsContent>

        <TabsContent value="history" className="mt-4">
          <InvoiceChart invoice={invoice} />
        </TabsContent>
      </Tabs>
    </div>
  )
}

