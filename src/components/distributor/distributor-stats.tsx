"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Building, Zap, MapPin, DollarSign } from "lucide-react"
import { useDistributorStore } from "@/store/distributorStore"

interface StatsData {
  totalDistributors: number
  avgPricePerKwh: number
  states: number
  totalInstallations: number
}

export function DistributorStats() {
  const { distributors, isLoading } = useDistributorStore()
  const [stats, setStats] = useState<StatsData>({
    totalDistributors: 0,
    avgPricePerKwh: 0,
    states: 0,
    totalInstallations: 0,
  })

  useEffect(() => {
    if (distributors.length > 0) {
      const totalDistributors = distributors.length
      
      // Calcular preço médio do kWh
      const totalPrice = distributors.reduce(
        (sum, distributor) => sum + (distributor.pricePerKwh || 0),
        0
      )
      const avgPricePerKwh = totalDistributors > 0 ? totalPrice / totalDistributors : 0
      
      // Contar estados únicos
      const uniqueStates = new Set()
      distributors.forEach(distributor => {
        if (distributor.address?.state) {
          uniqueStates.add(distributor.address.state)
        }
      })
      
      // Contar instalações (supondo que cada distribuidora tenha uma propriedade installationsCount)
      const totalInstallations = distributors.reduce(
        (sum, distributor) => sum + (distributor.installationsCount || 0),
        0
      )
      
      setStats({
        totalDistributors,
        avgPricePerKwh,
        states: uniqueStates.size,
        totalInstallations,
      })
    }
  }, [distributors])

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value)
  }

  const renderSkeleton = () => (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {Array(4)
        .fill(0)
        .map((_, i) => (
          <Card key={i} className="bg-white shadow-sm">
            <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-sm font-medium">
                <Skeleton className="h-4 w-24" />
              </CardTitle>
              <Skeleton className="h-8 w-8 rounded-full" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-7 w-16 mb-1" />
              <Skeleton className="h-4 w-28" />
            </CardContent>
          </Card>
        ))}
    </div>
  )

  if (isLoading) {
    return renderSkeleton()
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <Card className="bg-white shadow-sm">
        <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-sm font-medium">Total de Distribuidoras</CardTitle>
          <Building className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.totalDistributors}</div>
          <p className="text-xs text-muted-foreground">
            Distribuidoras cadastradas
          </p>
        </CardContent>
      </Card>

      <Card className="bg-white shadow-sm">
        <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-sm font-medium">Preço Médio kWh</CardTitle>
          <DollarSign className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatCurrency(stats.avgPricePerKwh)}</div>
          <p className="text-xs text-muted-foreground">
            Média do preço do kWh
          </p>
        </CardContent>
      </Card>

      <Card className="bg-white shadow-sm">
        <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-sm font-medium">Estados</CardTitle>
          <MapPin className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.states}</div>
          <p className="text-xs text-muted-foreground">
            Estados com distribuidoras
          </p>
        </CardContent>
      </Card>

      <Card className="bg-white shadow-sm">
        <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-sm font-medium">Instalações</CardTitle>
          <Zap className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.totalInstallations}</div>
          <p className="text-xs text-muted-foreground">
            Total de pontos de medição
          </p>
        </CardContent>
      </Card>
    </div>
  )
} 