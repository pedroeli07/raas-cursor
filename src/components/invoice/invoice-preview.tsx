"use client"

import { motion } from "framer-motion"
import { Card, CardContent } from "@/components/ui/card"
import type { InvoiceData } from "@/lib/models/energy-data"
import { QrCode } from "lucide-react"

interface InvoicePreviewProps {
  invoice: InvoiceData
}

export function InvoicePreview({ invoice }: InvoicePreviewProps) {
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
      <Card className="overflow-hidden">
        <CardContent className="p-0">
          <div className="bg-gradient-to-r from-blue-500 to-teal-500 p-6 text-white">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="grid grid-cols-3 gap-1">
                  {[...Array(9)].map((_, i) => (
                    <div
                      key={i}
                      className={`w-4 h-4 rounded-sm ${[1, 4, 7].includes(i) ? "bg-yellow-400" : "bg-teal-200"}`}
                    />
                  ))}
                </div>
                <h1 className="text-4xl font-bold">DMZ</h1>
              </div>
              <div className="text-right">
                <div className="text-xl font-semibold">SOLUÇÕES SOLARES</div>
                <div className="text-sm opacity-80">Energia limpa e econômica</div>
              </div>
            </div>
          </div>

          <div className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <h2 className="text-lg font-semibold">Cliente</h2>
                <div className="bg-gray-50 p-3 rounded-md">
                  <div className="font-medium">{invoice.client.name}</div>
                  <div className="text-sm text-gray-500">ID: {invoice.client.id}</div>
                  <div className="text-sm text-gray-500">Mês de Referência: {invoice.period.reference}</div>
                  <div className="text-sm text-gray-500">Vencimento: {invoice.dueDate}</div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="bg-gray-50 p-3 rounded-md flex flex-col items-center justify-center">
                  <div className="text-xs text-gray-500">VALOR KWH CEMIG</div>
                  <div className="text-lg font-bold text-center">R$ {invoice.rates.cemigRate.toFixed(3)}</div>
                </div>

                <div className="bg-gray-50 p-3 rounded-md flex flex-col items-center justify-center">
                  <div className="text-xs text-gray-500">DESCONTO</div>
                  <div className="text-lg font-bold text-center">{Math.round(invoice.rates.discount * 100)}%</div>
                </div>

                <div className="bg-gray-50 p-3 rounded-md flex flex-col items-center justify-center">
                  <div className="text-xs text-gray-500">VALOR KWH FATURADO</div>
                  <div className="text-lg font-bold text-center">R$ {invoice.rates.billedRate.toFixed(3)}</div>
                </div>
              </div>
            </div>

            <div>
              <h2 className="text-lg font-semibold mb-2">Informações Técnicas</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="p-2 text-left">Referência</th>
                      <th className="p-2 text-left">Instalação</th>
                      <th className="p-2 text-right">Consumo</th>
                      <th className="p-2 text-right">Compensação</th>
                      <th className="p-2 text-right">Recebimento</th>
                      <th className="p-2 text-right">Saldo Atual</th>
                      <th className="p-2 text-right">Valor (R$)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoice.technicalInfo.map((info, index) => (
                      <tr key={index} className="border-b border-gray-100">
                        <td className="p-2">{info.reference}</td>
                        <td className="p-2">{info.installation}</td>
                        <td className="p-2 text-right">{info.consumption.toLocaleString("pt-BR")}</td>
                        <td className="p-2 text-right">{info.compensation.toLocaleString("pt-BR")}</td>
                        <td className="p-2 text-right">{info.reception.toLocaleString("pt-BR")}</td>
                        <td className="p-2 text-right">{info.currentBalance.toLocaleString("pt-BR")}</td>
                        <td className="p-2 text-right">
                          {info.amount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    ))}
                    <tr className="bg-gray-50 font-medium">
                      <td className="p-2" colSpan={2}>
                        Total
                      </td>
                      <td className="p-2 text-right">{invoice.calculation.totalConsumption.toLocaleString("pt-BR")}</td>
                      <td className="p-2 text-right">
                        {invoice.calculation.totalCompensation.toLocaleString("pt-BR")}
                      </td>
                      <td className="p-2 text-right">-</td>
                      <td className="p-2 text-right">-</td>
                      <td className="p-2 text-right">
                        {invoice.calculation.finalAmount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-teal-50 p-4 rounded-md flex flex-col items-center justify-center">
                <h3 className="text-lg font-semibold text-teal-800 mb-2">HISTÓRICO</h3>
                <div className="text-sm w-full">
                  <div className="grid grid-cols-3 gap-2 text-center font-medium text-gray-600 mb-1">
                    <div>Período</div>
                    <div>Consumo</div>
                    <div>Compensação</div>
                  </div>
                  {invoice.history.slice(0, 3).map((item, index) => (
                    <div key={index} className="grid grid-cols-3 gap-2 text-center text-xs">
                      <div>{item.period}</div>
                      <div>{item.consumption.toLocaleString("pt-BR")}</div>
                      <div>{item.compensation.toLocaleString("pt-BR")}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-green-50 p-4 rounded-md flex flex-col items-center justify-center">
                <h3 className="text-lg font-semibold text-green-800 mb-2">COMPENSADO</h3>
                <div className="text-3xl font-bold text-green-700">
                  {invoice.calculation.totalCompensation.toLocaleString("pt-BR")} kWh
                </div>
              </div>

              <div className="bg-teal-600 p-4 rounded-md flex flex-col items-center justify-center text-white">
                <h3 className="text-lg font-semibold mb-2">VALOR A PAGAR</h3>
                <div className="text-3xl font-bold">
                  R$ {invoice.calculation.finalAmount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                </div>
              </div>
            </div>

            <div className="flex justify-between items-center border-t pt-4">
              <div className="max-w-xs">
                <h3 className="font-semibold mb-1">Benefícios para o seu bolso e para o planeta</h3>
                <div className="text-sm text-gray-600 space-y-1">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-green-500"></div>
                    <div>
                      Evitou que {Math.round(invoice.calculation.co2Avoided).toLocaleString("pt-BR")} kg de CO₂ fossem
                      emitidos à atmosfera.
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-teal-500"></div>
                    <div>
                      Economizou R${" "}
                      {invoice.calculation.savedAmount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex flex-col items-center">
                <div className="text-sm text-gray-500 mb-2">Pague esse boleto via Pix com o QR code abaixo</div>
                <div className="w-32 h-32 bg-gray-100 rounded-md flex items-center justify-center">
                  <QrCode size={100} className="text-gray-400" />
                </div>
              </div>
            </div>

            <div className="border-t pt-4">
              <div className="text-center text-xs text-gray-500">
                {invoice.invoiceNumber} | Vencimento: {invoice.dueDate}
              </div>
              <div className="mt-2 h-12 bg-gray-100 rounded flex items-center justify-center">
                <div className="text-xs text-gray-400">Código de barras</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}

