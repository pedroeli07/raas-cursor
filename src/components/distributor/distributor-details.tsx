"use client"

import { useEffect, useState } from "react"
import { useDistributorStore } from "@/store/distributorStore"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Skeleton } from "@/components/ui/skeleton"
import { Address, DollarSign, MapPin, Building, AlertCircle, Calendar, Globe } from "lucide-react"
import { Button } from "@/components/ui/button"
import { formatCurrency, formatDate } from "@/lib/utils"

interface DistributorDetailsProps {
  distributorId: string
}

export function DistributorDetails({ distributorId }: DistributorDetailsProps) {
  const { 
    selectedDistributor, 
    fetchDistributorById, 
    isLoading, 
    error,
    setError
  } = useDistributorStore()

  useEffect(() => {
    fetchDistributorById(distributorId).catch(err => {
      console.error("Erro ao buscar detalhes da distribuidora:", err)
    })
  }, [distributorId, fetchDistributorById])

  const renderLoadingSkeleton = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <Skeleton className="h-8 w-2/3" />
          <Skeleton className="h-4 w-1/2" />
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-1/4" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-32 w-full" />
        </CardContent>
      </Card>
    </div>
  )

  const renderError = () => (
    <Card className="border-destructive/50">
      <CardHeader>
        <CardTitle className="flex items-center text-destructive gap-2">
          <AlertCircle className="h-5 w-5" />
          Erro ao carregar dados
        </CardTitle>
        <CardDescription>Não foi possível carregar os detalhes da distribuidora</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-destructive mb-4">{error}</p>
        <Button 
          variant="outline" 
          onClick={() => {
            setError(null)
            fetchDistributorById(distributorId)
          }}
        >
          Tentar novamente
        </Button>
      </CardContent>
    </Card>
  )

  const renderDetails = () => {
    if (!selectedDistributor) return null

    const { name, code, pricePerKwh, address, createdAt, updatedAt } = selectedDistributor

    return (
      <div className="space-y-6">
        <Card className="border-primary/20 shadow-md">
          <CardHeader>
            <CardTitle>{name}</CardTitle>
            <CardDescription>Código: {code || "Não definido"}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="flex items-start gap-2">
                  <DollarSign className="h-5 w-5 text-primary mt-0.5" />
                  <div>
                    <p className="font-medium">Preço do kWh</p>
                    <p className="text-2xl font-bold">{formatCurrency(pricePerKwh)}</p>
                  </div>
                </div>

                <div className="flex items-start gap-2">
                  <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="font-medium">Datas</p>
                    <div className="text-sm text-muted-foreground">
                      <p>Criado em: {formatDate(createdAt)}</p>
                      <p>Última atualização: {formatDate(updatedAt)}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-start gap-2">
                  <MapPin className="h-5 w-5 text-primary mt-0.5" />
                  <div>
                    <p className="font-medium">Endereço da Sede</p>
                    {address ? (
                      <div className="text-sm text-muted-foreground">
                        <p>{address.street}, {address.number}{address.complement ? `, ${address.complement}` : ''}</p>
                        <p>{address.neighborhood}, {address.city}/{address.state}</p>
                        <p>CEP: {address.zipCode || address.zip}</p>
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">Endereço não cadastrado</p>
                    )}
                  </div>
                </div>

                <div className="flex items-start gap-2">
                  <Building className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="font-medium">Instalações</p>
                    <p className="text-sm text-muted-foreground">
                      Total de instalações: {selectedDistributor.installationsCount || 0}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="installations" className="w-full">
          <TabsList>
            <TabsTrigger value="installations">Instalações</TabsTrigger>
            <TabsTrigger value="history">Histórico de Preços</TabsTrigger>
          </TabsList>
          
          <TabsContent value="installations" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Instalações Gerenciadas</CardTitle>
                <CardDescription>
                  Lista de unidades consumidoras e geradoras gerenciadas por esta distribuidora
                </CardDescription>
              </CardHeader>
              <CardContent>
                {selectedDistributor.installations && selectedDistributor.installations.length > 0 ? (
                  <div className="relative overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-muted/50">
                          <th className="text-left py-3 px-4 font-medium">Número</th>
                          <th className="text-left py-3 px-4 font-medium">Tipo</th>
                          <th className="text-left py-3 px-4 font-medium">Cliente</th>
                          <th className="text-left py-3 px-4 font-medium">Endereço</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedDistributor.installations.map(installation => (
                          <tr key={installation.id} className="border-b hover:bg-muted/30">
                            <td className="py-3 px-4">{installation.installationNumber}</td>
                            <td className="py-3 px-4">
                              {installation.type === 'generator' ? 'Geradora' : 'Consumidora'}
                            </td>
                            <td className="py-3 px-4">{installation.client?.name || 'N/A'}</td>
                            <td className="py-3 px-4 text-sm text-muted-foreground max-w-xs truncate">
                              {installation.address ? 
                                `${installation.address.city}/${installation.address.state}` : 'N/A'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-6 text-muted-foreground">
                    Nenhuma instalação associada a esta distribuidora.
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="history" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Histórico de Preços do kWh</CardTitle>
                <CardDescription>
                  Alterações no preço do kWh ao longo do tempo
                </CardDescription>
              </CardHeader>
              <CardContent>
                {selectedDistributor.kwhPrices && selectedDistributor.kwhPrices.length > 0 ? (
                  <div className="relative overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-muted/50">
                          <th className="text-left py-3 px-4 font-medium">Preço (R$)</th>
                          <th className="text-left py-3 px-4 font-medium">Data de Vigência</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedDistributor.kwhPrices.map(price => (
                          <tr key={price.id} className="border-b hover:bg-muted/30">
                            <td className="py-3 px-4">{formatCurrency(price.price / 1000)}</td>
                            <td className="py-3 px-4">{formatDate(price.startDate)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-6 text-muted-foreground">
                    Sem histórico de alterações de preço.
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    )
  }

  if (isLoading && !selectedDistributor) {
    return renderLoadingSkeleton()
  }

  if (error) {
    return renderError()
  }

  if (!selectedDistributor) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Distribuidora não encontrada</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Não foi possível encontrar a distribuidora com o ID {distributorId}.
          </p>
        </CardContent>
      </Card>
    )
  }

  return renderDetails()
} 