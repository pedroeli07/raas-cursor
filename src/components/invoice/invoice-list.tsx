"use client"

import { useState, useEffect } from "react"
import {
  ArrowDownIcon,
  ArrowUpIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  DownloadIcon,
  EyeIcon,
  MailIcon,
  XCircleIcon,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { InvoiceFilters, InvoicePreview } from "@/types/invoice"
import { INVOICE_STATUS } from "@/lib/constants/invoice"
import { InvoiceService } from "@/lib/services/invoice-service"
import { InvoiceFilters as InvoiceFilterComponent } from "./invoice-filters"
import { InvoiceStatusBadge } from "./invoice-status-badge"

interface InvoiceListProps {
  initialFilters?: InvoiceFilters
  showFilters?: boolean
  onViewInvoice?: (invoiceId: string) => void
}

export function InvoiceList({ initialFilters, showFilters = true, onViewInvoice }: InvoiceListProps) {
  const [invoices, setInvoices] = useState<InvoicePreview[]>([])
  const [filters, setFilters] = useState<InvoiceFilters>(initialFilters || {})
  const [searchTerm, setSearchTerm] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [sort, setSort] = useState<{ field: keyof InvoicePreview; direction: "asc" | "desc" }>({
    field: "dueDate",
    direction: "desc",
  })
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10

  useEffect(() => {
    loadInvoices()
  }, [filters])

  const loadInvoices = async () => {
    setIsLoading(true)
    try {
      const data = await InvoiceService.getInvoices(filters)
      setInvoices(data)
    } catch (error) {
      console.error("Failed to load invoices:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSort = (field: keyof InvoicePreview) => {
    setSort((prevSort) => ({
      field,
      direction: prevSort.field === field && prevSort.direction === "asc" ? "desc" : "asc",
    }))
  }

  const getSortedInvoices = () => {
    const filteredInvoices = searchTerm
      ? invoices.filter((invoice) =>
          invoice.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          invoice.referenceMonth.toLowerCase().includes(searchTerm.toLowerCase()) ||
          invoice.id.includes(searchTerm)
        )
      : invoices

    return [...filteredInvoices].sort((a, b) => {
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

  const sortedInvoices = getSortedInvoices()
  const totalPages = Math.ceil(sortedInvoices.length / itemsPerPage)
  const displayedInvoices = sortedInvoices.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  )

  const handleFilterChange = (newFilters: InvoiceFilters) => {
    setFilters(newFilters)
    setCurrentPage(1) // Reset to first page when filter changes
  }

  const handleSearchChange = (term: string) => {
    setSearchTerm(term)
    setCurrentPage(1) // Reset to first page when search changes
  }

  const handleSendReminder = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    try {
      await InvoiceService.sendReminder(id)
      // Show success toast or feedback
    } catch (error) {
      // Show error toast or feedback
      console.error("Failed to send reminder:", error)
    }
  }

  const handleGeneratePdf = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    try {
      const pdfUrl = await InvoiceService.generateInvoicePdf(id)
      window.open(pdfUrl, "_blank")
    } catch (error) {
      // Show error toast or feedback
      console.error("Failed to generate PDF:", error)
    }
  }

  const handleViewInvoice = (id: string) => {
    if (onViewInvoice) {
      onViewInvoice(id)
    } else {
      // Default behavior if no custom handler provided
      window.location.href = `/invoices/${id}`
    }
  }

  const renderSortIcon = (field: keyof InvoicePreview) => {
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
            <Skeleton className="h-4 w-40" />
          </td>
          <td className="py-3 px-4">
            <Skeleton className="h-4 w-24" />
          </td>
          <td className="py-3 px-4">
            <Skeleton className="h-4 w-24" />
          </td>
          <td className="py-3 px-4">
            <div className="flex justify-center">
              <Skeleton className="h-8 w-20" />
            </div>
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

  return (
    <Card className="shadow-md">
      <CardHeader className="pb-2">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <CardTitle>Faturas</CardTitle>
          {showFilters && (
            <InvoiceFilterComponent
              filters={{
                ...filters, 
                status: filters.status || '',
                startDate: filters.startDate || new Date(),
                endDate: filters.endDate || new Date()
              }}
              onFilterChange={handleFilterChange}
              searchTerm={searchTerm}
              onSearchChange={handleSearchChange}
            />
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
                  onClick={() => handleSort("customerName")}
                >
                  <div className="flex items-center">
                    Cliente
                    {renderSortIcon("customerName")}
                  </div>
                </th>
                <th
                  className="py-3 px-4 text-left cursor-pointer"
                  onClick={() => handleSort("referenceMonth")}
                >
                  <div className="flex items-center">
                    Mês de Referência
                    {renderSortIcon("referenceMonth")}
                  </div>
                </th>
                <th
                  className="py-3 px-4 text-left cursor-pointer"
                  onClick={() => handleSort("dueDate")}
                >
                  <div className="flex items-center">
                    Vencimento
                    {renderSortIcon("dueDate")}
                  </div>
                </th>
                <th
                  className="py-3 px-4 text-left cursor-pointer"
                  onClick={() => handleSort("invoiceAmount")}
                >
                  <div className="flex items-center">
                    Valor
                    {renderSortIcon("invoiceAmount")}
                  </div>
                </th>
                <th
                  className="py-3 px-4 text-center cursor-pointer"
                  onClick={() => handleSort("status")}
                >
                  <div className="flex items-center justify-center">
                    Status
                    {renderSortIcon("status")}
                  </div>
                </th>
                <th className="py-3 px-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                renderSkeletonRows()
              ) : displayedInvoices.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-gray-500">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <XCircleIcon className="h-10 w-10 text-gray-300" />
                      <p>Nenhuma fatura encontrada.</p>
                      {(Object.keys(filters).length > 0 || searchTerm) && (
                        <Button 
                          variant="link" 
                          onClick={() => {
                            setFilters({})
                            setSearchTerm("")
                          }}
                        >
                          Limpar filtros
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                displayedInvoices.map((invoice) => (
                  <tr
                    key={invoice.id}
                    className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer"
                    onClick={() => handleViewInvoice(invoice.id)}
                  >
                    <td className="py-3 px-4 font-medium">{invoice.customerName}</td>
                    <td className="py-3 px-4">{invoice.referenceMonth}</td>
                    <td className="py-3 px-4">
                      {InvoiceService.formatDate(invoice.dueDate)}
                    </td>
                    <td className="py-3 px-4 font-medium">
                      {InvoiceService.formatCurrency(invoice.invoiceAmount)}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex justify-center">
                        <InvoiceStatusBadge status={invoice.status} />
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex justify-end space-x-2">
                        {!invoice.isPaid && invoice.status === INVOICE_STATUS.PENDING && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => handleSendReminder(invoice.id, e)}
                            title="Enviar lembrete"
                          >
                            <MailIcon className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => handleGeneratePdf(invoice.id, e)}
                          title="Baixar PDF"
                        >
                          <DownloadIcon className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleViewInvoice(invoice.id)
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

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-between items-center mt-4">
            <div className="text-sm text-gray-500">
              Mostrando {(currentPage - 1) * itemsPerPage + 1} a{" "}
              {Math.min(currentPage * itemsPerPage, sortedInvoices.length)} de{" "}
              {sortedInvoices.length} faturas
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
    </Card>
  )
} 