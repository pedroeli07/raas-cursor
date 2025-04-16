"use client"

import { useEffect, useState } from "react"
import { 
  AlertCircleIcon, 
  ArrowDownIcon, 
  ArrowUpIcon, 
  BanknoteIcon, 
  CheckIcon, 
  ClockIcon,
  InfoIcon
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { InvoiceService } from "@/lib/services/invoice-service"
import { INVOICE_STATUS } from "@/lib/constants/invoice"

interface InvoiceStatsData {
  totalInvoiced: number
  totalPaid: number
  totalPending: number
  totalOverdue: number
  averageValue: number
  pendingCount: number
  overdueCount: number
  paidCount: number
  paidPercentage: number
  pendingPercentage: number
  overduePercentage: number
  monthlyChange: {
    invoiced: number
    paid: number
  }
}

interface StatCardProps {
  title: string
  value: string
  description?: string
  icon: React.ReactNode
  trend?: {
    value: number
    label: string
  }
  loading?: boolean
  tooltipText?: string
}

function StatCard({
  title,
  value,
  description,
  icon,
  trend,
  loading = false,
  tooltipText
}: StatCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">
          {title}
          {tooltipText && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <InfoIcon className="h-4 w-4 ml-1 text-muted-foreground inline-block cursor-help" />
                </TooltipTrigger>
                <TooltipContent>
                  <p className="max-w-xs">{tooltipText}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </CardTitle>
        <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-primary">
          {icon}
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <>
            <Skeleton className="h-8 w-[100px] mb-1" />
            <Skeleton className="h-4 w-[180px]" />
          </>
        ) : (
          <>
            <div className="text-2xl font-bold">{value}</div>
            <p className="text-xs text-muted-foreground">
              {description}
              {trend && (
                <span
                  className={`ml-1 font-medium ${
                    trend.value > 0 ? "text-green-600" : trend.value < 0 ? "text-red-600" : "text-gray-500"
                  }`}
                >
                  {trend.value > 0 ? (
                    <ArrowUpIcon className="h-3 w-3 inline" />
                  ) : trend.value < 0 ? (
                    <ArrowDownIcon className="h-3 w-3 inline" />
                  ) : null}
                  {trend.value > 0 ? "+" : ""}
                  {trend.value}% {trend.label}
                </span>
              )}
            </p>
          </>
        )}
      </CardContent>
    </Card>
  )
}

export function InvoiceStats() {
  const [stats, setStats] = useState<InvoiceStatsData | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setIsLoading(true)
        // In a real app, this would be an API call
        // For demo purposes, we're creating mock data
        const response = await fetch('/api/invoices/stats')
        
        if (response.ok) {
          const data = await response.json()
          setStats(data)
        } else {
          // Fallback to mock data if API fails
          setTimeout(() => {
            setStats({
              totalInvoiced: 357689.45,
              totalPaid: 246789.32,
              totalPending: 84532.18,
              totalOverdue: 26367.95,
              averageValue: 1243.76,
              pendingCount: 68,
              overdueCount: 21,
              paidCount: 198,
              paidPercentage: 69,
              pendingPercentage: 24,
              overduePercentage: 7,
              monthlyChange: {
                invoiced: 12.4,
                paid: 8.6
              }
            })
          }, 1000)
        }
      } catch (error) {
        console.error('Failed to load invoice stats:', error)
        // Fallback to mock data if API fails
        setStats({
          totalInvoiced: 357689.45,
          totalPaid: 246789.32,
          totalPending: 84532.18,
          totalOverdue: 26367.95,
          averageValue: 1243.76,
          pendingCount: 68,
          overdueCount: 21,
          paidCount: 198,
          paidPercentage: 69,
          pendingPercentage: 24,
          overduePercentage: 7,
          monthlyChange: {
            invoiced: 12.4,
            paid: 8.6
          }
        })
      } finally {
        setIsLoading(false)
      }
    }

    fetchStats()
  }, [])

  return (
    <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
      <StatCard
        title="Total Faturado"
        value={stats ? InvoiceService.formatCurrency(stats.totalInvoiced) : "R$ 0,00"}
        description={`${stats ? stats.paidCount + stats.pendingCount + stats.overdueCount : 0} faturas emitidas`}
        icon={<BanknoteIcon className="h-4 w-4" />}
        trend={stats ? { value: stats.monthlyChange.invoiced, label: "que mês anterior" } : undefined}
        loading={isLoading}
        tooltipText="Total de todas as faturas emitidas, incluindo pendentes, pagas e vencidas."
      />
      
      <StatCard
        title="Total Recebido"
        value={stats ? InvoiceService.formatCurrency(stats.totalPaid) : "R$ 0,00"}
        description={`${stats ? stats.paidPercentage : 0}% do total faturado`}
        icon={<CheckIcon className="h-4 w-4" />}
        trend={stats ? { value: stats.monthlyChange.paid, label: "que mês anterior" } : undefined}
        loading={isLoading}
        tooltipText="Valor total de todas as faturas pagas até o momento."
      />
      
      <StatCard
        title="Pendente"
        value={stats ? InvoiceService.formatCurrency(stats.totalPending) : "R$ 0,00"}
        description={`${stats ? stats.pendingCount : 0} faturas (${stats ? stats.pendingPercentage : 0}%)`}
        icon={<ClockIcon className="h-4 w-4" />}
        loading={isLoading}
        tooltipText="Valor total das faturas emitidas que ainda não foram pagas mas estão dentro do prazo."
      />
      
      <StatCard
        title="Vencido"
        value={stats ? InvoiceService.formatCurrency(stats.totalOverdue) : "R$ 0,00"}
        description={`${stats ? stats.overdueCount : 0} faturas (${stats ? stats.overduePercentage : 0}%)`}
        icon={<AlertCircleIcon className="h-4 w-4" />}
        loading={isLoading}
        tooltipText="Valor total das faturas que estão com o pagamento em atraso (vencidas)."
      />
    </div>
  )
} 