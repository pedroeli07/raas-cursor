"use client"

import { useState, useMemo, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Plus, MoreHorizontal, Search, Pencil, Trash2, RefreshCcw } from "lucide-react"
import { ColumnDef, flexRender, getCoreRowModel, getPaginationRowModel, getSortedRowModel, SortingState, useReactTable } from "@tanstack/react-table"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card"
import { useToast } from "@/components/ui/use-toast"
import { Skeleton } from "@/components/ui/skeleton"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Distributor, useDistributorStore } from "@/store/distributorStore"
import { formatCurrency } from "@/lib/utils"

interface DistributorListProps {
  onRowClick?: (distributor: Distributor) => void
}

export function DistributorList({ onRowClick }: DistributorListProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [searchTerm, setSearchTerm] = useState("")
  const [sorting, setSorting] = useState<SortingState>([])
  const [currentPage, setCurrentPage] = useState(0)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [distributorToDelete, setDistributorToDelete] = useState<Distributor | null>(null)

  const { 
    distributors,
    isLoading, 
    errorMessage,
    fetchDistributors,
    deleteDistributor
  } = useDistributorStore()

  // Buscar distribuidoras ao montar o componente
  useEffect(() => {
    fetchDistributors()
  }, [fetchDistributors])

  // Filtrar distribuidoras de acordo com o termo de busca
  const filteredDistributors = useMemo(() => {
    if (!searchTerm.trim()) return distributors

    const lowercaseSearchTerm = searchTerm.toLowerCase()
    return distributors.filter((distributor) => 
      distributor.name.toLowerCase().includes(lowercaseSearchTerm) || 
      distributor.code.toLowerCase().includes(lowercaseSearchTerm) ||
      distributor.address?.city?.toLowerCase()?.includes(lowercaseSearchTerm) ||
      distributor.address?.state?.toLowerCase()?.includes(lowercaseSearchTerm)
    )
  }, [distributors, searchTerm])

  // Definir colunas da tabela
  const columns: ColumnDef<Distributor>[] = [
    {
      accessorKey: "name",
      header: "Nome",
      cell: ({ row }) => <div className="font-medium">{row.getValue("name")}</div>,
    },
    {
      accessorKey: "code",
      header: "Código",
      cell: ({ row }) => <div>{row.getValue("code")}</div>,
    },
    {
      accessorKey: "location",
      header: "Localização",
      cell: ({ row }) => {
        const distributor = row.original
        const city = distributor.address?.city || ""
        const state = distributor.address?.state || ""
        return <div>{city ? `${city}${state ? ` - ${state}` : ""}` : "Não definida"}</div>
      },
    },
    {
      accessorKey: "pricePerKwh",
      header: "Preço/kWh",
      cell: ({ row }) => {
        const price = parseFloat(row.original.pricePerKwh?.toString() || "0")
        return <div>{price ? formatCurrency(price) : "Não definido"}</div>
      },
    },
    {
      id: "actions",
      cell: ({ row }) => {
        return (
          <div className="flex justify-end">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-8 w-8 p-0">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Ações</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation()
                    handleEditDistributor(row.original)
                  }}
                >
                  <Pencil className="mr-2 h-4 w-4" />
                  Editar
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="text-red-600"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleDeleteClick(row.original)
                  }}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Excluir
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )
      },
    },
  ]

  // Configuração da tabela com react-table
  const table = useReactTable({
    data: filteredDistributors,
    columns,
    state: {
      sorting,
      pagination: {
        pageIndex: currentPage,
        pageSize: 10,
      }
    },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  })

  // Manipuladores de evento
  const handleCreateDistributor = () => {
    router.push("/admin/distribuidoras/nova")
  }

  const handleEditDistributor = (distributor: Distributor) => {
    router.push(`/admin/distribuidoras/${distributor.id}/editar`)
  }

  const handleDeleteClick = (distributor: Distributor) => {
    setDistributorToDelete(distributor)
    setDeleteDialogOpen(true)
  }

  const handleDeleteConfirm = async () => {
    if (!distributorToDelete) return

    try {
      await deleteDistributor(distributorToDelete.id)
      toast({
        title: "Sucesso",
        description: `Distribuidora "${distributorToDelete.name}" excluída com sucesso`,
      })
    } catch (error) {
      console.error("Erro ao excluir distribuidora:", error)
      toast({
        title: "Erro",
        description: "Não foi possível excluir a distribuidora",
        variant: "destructive",
      })
    } finally {
      setDeleteDialogOpen(false)
      setDistributorToDelete(null)
    }
  }

  const handleRefresh = () => {
    fetchDistributors()
  }

  const handleRowClick = (distributor: Distributor) => {
    if (onRowClick) {
      onRowClick(distributor)
    } else {
      router.push(`/admin/distribuidoras/${distributor.id}`)
    }
  }

  // Renderização de estados de carregamento e erro
  if (errorMessage) {
    return (
      <Card className="w-full">
        <CardHeader className="pb-2">
          <CardTitle>Distribuidoras</CardTitle>
          <CardDescription>
            Ocorreu um erro ao carregar as distribuidoras
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="text-red-500">{errorMessage}</div>
            <Button
              onClick={handleRefresh}
              variant="outline"
              size="sm"
              className="h-8"
            >
              <RefreshCcw className="mr-2 h-4 w-4" />
              Tentar novamente
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-full">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Distribuidoras</CardTitle>
            <CardDescription>
              Gerencie as distribuidoras de energia cadastradas no sistema
            </CardDescription>
          </div>
          <Button onClick={handleCreateDistributor}>
            <Plus className="mr-2 h-4 w-4" />
            Nova Distribuidora
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Buscar distribuidora..."
              className="pl-8"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Button
            onClick={handleRefresh}
            variant="outline"
            size="icon"
            className="ml-2 h-10 w-10"
          >
            <RefreshCcw className="h-4 w-4" />
          </Button>
        </div>

        {isLoading ? (
          // Skeleton loader para estado de carregamento
          <div className="space-y-2">
            {Array(5)
              .fill(0)
              .map((_, index) => (
                <div key={index} className="flex items-center space-x-2">
                  <Skeleton className="h-10 w-full" />
                </div>
              ))}
          </div>
        ) : filteredDistributors.length === 0 ? (
          <div className="py-8 text-center text-muted-foreground">
            {searchTerm
              ? "Nenhuma distribuidora encontrada para esta busca"
              : "Nenhuma distribuidora cadastrada"}
          </div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                {table.getHeaderGroups().map((headerGroup) => (
                  <TableRow key={headerGroup.id}>
                    {headerGroup.headers.map((header) => {
                      return (
                        <TableHead key={header.id}>
                          {header.isPlaceholder
                            ? null
                            : flexRender(
                                header.column.columnDef.header,
                                header.getContext()
                              )}
                        </TableHead>
                      )
                    })}
                  </TableRow>
                ))}
              </TableHeader>
              <TableBody>
                {table.getRowModel().rows?.length ? (
                  table.getRowModel().rows.map((row) => (
                    <TableRow
                      key={row.id}
                      data-state={row.getIsSelected() && "selected"}
                      className="cursor-pointer"
                      onClick={() => handleRowClick(row.original)}
                    >
                      {row.getVisibleCells().map((cell) => (
                        <TableCell key={cell.id}>
                          {flexRender(
                            cell.column.columnDef.cell,
                            cell.getContext()
                          )}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell
                      colSpan={columns.length}
                      className="h-24 text-center"
                    >
                      Nenhum resultado encontrado
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
      <CardFooter className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          {!isLoading && `Mostrando ${filteredDistributors.length} distribuidoras`}
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            Anterior
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            Próximo
          </Button>
        </div>
      </CardFooter>

      {/* Diálogo de confirmação de exclusão */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir a distribuidora{" "}
              <strong>{distributorToDelete?.name}</strong>? Esta ação não pode ser
              desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90"
              onClick={handleDeleteConfirm}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  )
} 