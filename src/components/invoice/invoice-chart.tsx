"use client"

import { Card } from "@/components/ui/card"
import { InvoiceData } from "@/lib/models/energy-data"
import { formatCurrency } from "@/lib/utils/format"
import { formatNumber } from "@/lib/utils/format"
import { 
  Bar, 
  BarChart, 
  CartesianGrid, 
  Legend, 
  ResponsiveContainer, 
  Tooltip, 
  XAxis, 
  YAxis 
} from "recharts"

interface InvoiceChartProps {
  invoice: InvoiceData
  invoiceHistory?: InvoiceData[]
  months?: number
}

export function InvoiceChart({ invoice, invoiceHistory = [], months = 6 }: InvoiceChartProps) {
  // Combine current invoice with history and sort by date
  const allInvoices = [invoice, ...invoiceHistory]
  const sortedInvoices = [...allInvoices]
    .sort((a, b) => {
      const dateA = new Date(a.period.reference.split('/')[1] + '-' + a.period.reference.split('/')[0] + '-01')
      const dateB = new Date(b.period.reference.split('/')[1] + '-' + b.period.reference.split('/')[0] + '-01')
      return dateA.getTime() - dateB.getTime()
    })
    .slice(-months) // Keep only the most recent months

  // Process data for the chart
  const chartData = sortedInvoices.map((inv) => {
    // Calculate savings
    const grossValue = inv.calculation.totalConsumption * inv.rates.cemigRate
    const discountValue = grossValue - inv.calculation.totalConsumption * inv.rates.cemigRate
    const discountPercentage = (discountValue / grossValue) * 100

    return {
      name: inv.period.reference,
      consumo: inv.calculation.totalConsumption,
      compensacao: inv.calculation.totalCompensation,
      economia: discountPercentage,
      valorOriginal: grossValue,
      valorPago: inv.calculation.totalConsumption * inv.rates.cemigRate,
    }
  })

  // Custom tooltip to show more details
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <Card className="p-3 bg-white border shadow-sm text-xs">
          <p className="font-medium mb-1">{label}</p>
          <div className="space-y-1">
            <p>
              <span className="inline-block w-3 h-3 mr-1 bg-blue-500 rounded-full"></span>
              Consumo: {formatNumber(payload[0].value)} kWh
            </p>
            <p>
              <span className="inline-block w-3 h-3 mr-1 bg-green-500 rounded-full"></span>
              Compensação: {formatNumber(payload[1].value)} kWh
            </p>
            <div className="border-t my-1 pt-1">
              <p>Valor Original: {formatCurrency(payload[0].payload.valorOriginal)}</p>
              <p>Valor Pago: {formatCurrency(payload[0].payload.valorPago)}</p>
              <p>Economia: {payload[0].payload.economia.toFixed(1)}%</p>
            </div>
          </div>
        </Card>
      )
    }
    return null
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart
        data={chartData}
        margin={{ top: 10, right: 10, left: 0, bottom: 5 }}
        barGap={0}
        barSize={20}
      >
        <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
        <XAxis 
          dataKey="name" 
          axisLine={false}
          tickLine={false}
          tick={{ fontSize: 12 }}
        />
        <YAxis
          axisLine={false}
          tickLine={false}
          tick={{ fontSize: 12 }}
          tickFormatter={(value) => `${value}`}
        />
        <Tooltip content={<CustomTooltip />} />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Bar 
          dataKey="consumo" 
          name="Consumo (kWh)" 
          fill="#3b82f6" 
          radius={[2, 2, 0, 0]} 
        />
        <Bar 
          dataKey="compensacao" 
          name="Compensação (kWh)" 
          fill="#10b981" 
          radius={[2, 2, 0, 0]} 
        />
      </BarChart>
    </ResponsiveContainer>
  )
}

