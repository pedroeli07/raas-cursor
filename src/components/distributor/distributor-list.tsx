"use client"

import { useState, useEffect } from "react"
import {
  ArrowDownIcon,
  ArrowUpIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  EyeIcon,
  PlusIcon,
  EditIcon,
  TrashIcon,
  SearchIcon,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { useDistributorStore } from "@/store/distributorStore"
import { Distributor } from "@/lib/types/app-types"
import { useRouter } from "next/navigation"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { AddDistributorForm } from "./add-distributor-form"
import { ConfirmDeleteDialog } from "../ui/confirm-delete-dialog"

interface DistributorListProps {
  showFilters?: boolean
  onViewDistributor?: (distributorId: string) => void
}

export function DistributorList({ showFilters = true, onViewDistributor }: DistributorListProps) {
  const router = useRouter()
  const { 
    distributors, 
    isLoading, 
    error, 
    fetchDistributors,
    deleteDistributor 
  } = useDistributorStore()
  
  const [searchTerm, setSearchTerm] = useState("")
  const [sort, setSort] = useState<{ field: keyof Distributor; direction: "asc" | "desc" }>({
    field: "name",
    direction: "asc",
  })
  const [currentPage, setCurrentPage] = useState(1)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [distributorToDelete, setDistributorToDelete] = useState<Distributor | null>(null)
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const itemsPerPage = 10

  useEffect(() => {
    fetchDistributors()
  }, [fetchDistributors])

  const handleSort = (field: keyof Distributor) => {
    setSort((prevSort) => ({
      field,
      direction: prevSort.field === field && prevSort.direction === "asc" ? "desc" : "asc",
    }))
  }

  const getSortedDistributors = () => {
    const filteredDistributors = searchTerm
      ? distributors.filter((distributor) =>
          distributor.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          distributor.code.toLowerCase().includes(searchTerm.toLowerCase())
        )
      : distributors

    return [...filteredDistributors].sort((a, b) => {
      const fieldA = a[sort.field]
      const fieldB = b[sort.field]

      if (fieldA instanceof Date && fieldB instanceof Date) {
        return sort.direction === "asc"
          ? fieldA.getTime() - fieldB.getTime()
          : fieldB.getTime() - fieldA.getTime()
      }

      if (typeof fieldA === "string" && typeof fieldB === "string") {
        return sort.direction === "asc"
          ? fieldA.localeCompare(fieldB)
          : fieldB.localeCompare(fieldA)
      }

      if (typeof fieldA === "number" && typeof fieldB === "number") {
        return sort.direction === "asc" ? fieldA - fieldB : fieldB - fieldA
      }

      return 0
    })
  }

  const sortedDistributors = getSortedDistributors()
  const totalPages = Math.ceil(sortedDistributors.length / itemsPerPage)
  const displayedDistributors = sortedDistributors.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  )

  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(event.target.value)
    setCurrentPage(1) // Reset to first page when search changes
  }

  const handleViewDistributor = (id: string) => {
    if (onViewDistributor) {
      onViewDistributor(id)
    } else {
      // Default behavior if no custom handler provided
      router.push(`/distributors/${id}`)
    }
  }

  const handleDeleteClick = (distributor: Distributor, e: React.MouseEvent) => {
    e.stopPropagation()
    setDistributorToDelete(distributor)
    setDeleteDialogOpen(true)
  }

  const handleConfirmDelete = async () => {
    if (distributorToDelete) {
      await deleteDistributor(distributorToDelete.id)
      setDeleteDialogOpen(false)
      setDistributorToDelete(null)
    }
  }

  const handleEditClick = (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    router.push(`/distributors/${id}/edit`)
  }

  const renderSortIcon = (field: keyof Distributor) => {
    if (sort.field !== field) return null

    return sort.direction === "asc" ? (
      <ArrowUpIcon className="ml-1 h-4 w-4" />
    ) : (
      <ArrowDownIcon className="ml-1 h-4 w-4" />
    )
  }

  const renderSkeletonRows = () => {
    return Array(itemsPerPage)
      .fill(0)
      .map((_, i) => (
        <tr key={i} className="border-b border-gray-100 hover:bg-gray-50">
          <td className="py-3 px-4">
            <Skeleton className="h-4 w-32" />
          </td>
          <td className="py-3 px-4">
            <Skeleton className="h-4 w-24" />
          </td>
          <td className="py-3 px-4">
            <Skeleton className="h-4 w-24" />
          </td>
          <td className="py-3 px-4">
            <div className="flex justify-end space-x-2">
              <Skeleton className="h-8 w-8 rounded-full" />
              <Skeleton className="h-8 w-8 rounded-full" />
              <Skeleton className="h-8 w-8 rounded-full" />
            </div>
          </td>
        </tr>
      ))
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value)
  }

  const formatDate = (date: Date | string) => {
    return new Intl.DateTimeFormat("pt-BR").format(new Date(date))
  }

  return (
    <Card className="shadow-md">
      <CardHeader className="pb-2">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <CardTitle>Distribuidoras</CardTitle>
          {showFilters && (
            <div className="flex gap-4">
              <div className="relative">
                <SearchIcon className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Buscar distribuidora..."
                  className="pl-8 w-[250px]"
                  value={searchTerm}
                  onChange={handleSearchChange}
                />
              </div>
              <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <PlusIcon className="h-4 w-4 mr-2" />
                    Nova Distribuidora
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[600px]">
                  <DialogHeader>
                    <DialogTitle>Adicionar Nova Distribuidora</DialogTitle>
                  </DialogHeader>
                  <AddDistributorForm onSuccess={() => setAddDialogOpen(false)} />
                </DialogContent>
              </Dialog>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-gray-500 font-medium">
                <th
                  className="py-3 px-4 text-left cursor-pointer"
                  onClick={() => handleSort("name")}
                >
                  <div className="flex items-center">
                    Nome
                    {renderSortIcon("name")}
                  </div>
                </th>
                <th
                  className="py-3 px-4 text-left cursor-pointer"
                  onClick={() => handleSort("code")}
                >
                  <div className="flex items-center">
                    Código
                    {renderSortIcon("code")}
                  </div>
                </th>
                <th
                  className="py-3 px-4 text-left cursor-pointer"
                  onClick={() => handleSort("pricePerKwh")}
                >
                  <div className="flex items-center">
                    Preço kWh
                    {renderSortIcon("pricePerKwh")}
                  </div>
                </th>
                <th className="py-3 px-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && displayedDistributors.length === 0 ? (
                renderSkeletonRows()
              ) : error ? (
                <tr>
                  <td colSpan={4} className="py-4 text-center text-red-500">
                    Erro ao carregar distribuidoras: {error}
                  </td>
                </tr>
              ) : displayedDistributors.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-4 text-center text-muted-foreground">
                    Nenhuma distribuidora encontrada
                  </td>
                </tr>
              ) : (
                displayedDistributors.map((distributor) => (
                  <tr
                    key={distributor.id}
                    className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer"
                    onClick={() => handleViewDistributor(distributor.id)}
                  >
                    <td className="py-3 px-4 font-medium">{distributor.name}</td>
                    <td className="py-3 px-4">{distributor.code || "-"}</td>
                    <td className="py-3 px-4">{formatCurrency(distributor.pricePerKwh)}</td>
                    <td className="py-3 px-4">
                      <div className="flex justify-end space-x-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => handleEditClick(distributor.id, e)}
                          title="Editar distribuidora"
                        >
                          <EditIcon className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => handleDeleteClick(distributor, e)}
                          title="Excluir distribuidora"
                          className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleViewDistributor(distributor.id)
                          }}
                          title="Visualizar detalhes"
                        >
                          <EyeIcon className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex justify-between items-center mt-4">
            <div className="text-sm text-gray-500">
              Mostrando {(currentPage - 1) * itemsPerPage + 1} a{" "}
              {Math.min(currentPage * itemsPerPage, sortedDistributors.length)} de{" "}
              {sortedDistributors.length} distribuidoras
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="icon"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >
                <ChevronLeftIcon className="h-4 w-4" />
              </Button>
              <div className="flex items-center space-x-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                  <Button
                    key={page}
                    variant={page === currentPage ? "default" : "outline"}
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setCurrentPage(page)}
                  >
                    {page}
                  </Button>
                ))}
              </div>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
              >
                <ChevronRightIcon className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </CardContent>

      <ConfirmDeleteDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="Excluir Distribuidora"
        description={`Tem certeza que deseja excluir a distribuidora "${distributorToDelete?.name}"? Esta ação não pode ser desfeita.`}
        onConfirm={handleConfirmDelete}
      />
    </Card>
  )
} 