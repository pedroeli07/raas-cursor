"use client"

import { useState } from "react"
import {
  CalendarIcon,
  FilterIcon,
  SearchIcon,
  XIcon,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { Badge } from "@/components/ui/badge"
import { INVOICE_STATUS } from "@/lib/constants/invoice"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"

type InvoiceFilters = {
  status: string
  startDate: Date
  endDate: Date
}


interface InvoiceFiltersProps {
  filters: InvoiceFilters
  onFilterChange: (filters: InvoiceFilters) => void
  searchTerm?: string
  onSearchChange?: (searchTerm: string) => void
  showSearch?: boolean
  showClearFilters?: boolean
  className?: string
}

export function InvoiceFilters({
  filters,
  onFilterChange,
  searchTerm = "",
  onSearchChange,
  showSearch = true,
  showClearFilters = true,
  className = "",
}: InvoiceFiltersProps) {
  const [localSearchTerm, setLocalSearchTerm] = useState(searchTerm)

  const handleFilterChange = (key: keyof InvoiceFilters, value: any) => {
    const newFilters = { ...filters, [key]: value }
    onFilterChange(newFilters)
  }

  const clearFilters = () => {
    onFilterChange({
      status: "",
      startDate: new Date(),
      endDate: new Date()
    })
    if (onSearchChange) {
      onSearchChange("")
      setLocalSearchTerm("")
    }
  }

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setLocalSearchTerm(value)
    if (onSearchChange) {
      onSearchChange(value)
    }
  }

  const activeFiltersCount = Object.keys(filters).filter(key => 
    filters[key as keyof InvoiceFilters] !== undefined && 
    filters[key as keyof InvoiceFilters] !== null && 
    filters[key as keyof InvoiceFilters] !== ""
  ).length

  return (
    <div className={`flex flex-wrap gap-2 ${className}`}>
      {showSearch && (
        <div className="relative">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Buscar faturas..."
            value={localSearchTerm}
            onChange={handleSearchChange}
            className="pl-9 w-[250px]"
          />
          {localSearchTerm && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6"
              onClick={() => {
                setLocalSearchTerm("")
                if (onSearchChange) onSearchChange("")
              }}
            >
              <XIcon className="h-3 w-3" />
            </Button>
          )}
        </div>
      )}

      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" className="flex items-center gap-1">
            <FilterIcon className="h-4 w-4" />
            Filtros
            {activeFiltersCount > 0 && (
              <Badge className="ml-1 h-5 w-5 p-0 flex items-center justify-center rounded-full bg-primary text-white">
                {activeFiltersCount}
              </Badge>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80">
          <div className="space-y-4">
            <div className="space-y-2">
              <h4 className="font-medium">Status</h4>
              <Select
                value={filters.status || ""}
                onValueChange={(value) =>
                  handleFilterChange("status", value || undefined)
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Todos os status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Todos os status</SelectItem>
                  <SelectItem value={INVOICE_STATUS.PENDING}>Pendente</SelectItem>
                  <SelectItem value={INVOICE_STATUS.PAID}>Pago</SelectItem>
                  <SelectItem value={INVOICE_STATUS.OVERDUE}>Vencido</SelectItem>
                  <SelectItem value={INVOICE_STATUS.CANCELED}>Cancelado</SelectItem>
                  <SelectItem value={INVOICE_STATUS.PROCESSING}>Em processamento</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <h4 className="font-medium">Data Inicial</h4>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-left font-normal"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {filters.startDate ? (
                      format(filters.startDate, "dd/MM/yyyy")
                    ) : (
                      <span>Selecionar data</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={filters.startDate}
                    onSelect={(date) => handleFilterChange("startDate", date)}
                    initialFocus
                    locale={ptBR}
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <h4 className="font-medium">Data Final</h4>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-left font-normal"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {filters.endDate ? (
                      format(filters.endDate, "dd/MM/yyyy")
                    ) : (
                      <span>Selecionar data</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={filters.endDate}
                    onSelect={(date) => handleFilterChange("endDate", date)}
                    initialFocus
                    locale={ptBR}
                  />
                </PopoverContent>
              </Popover>
            </div>

            {showClearFilters && (
              <div className="flex justify-between pt-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={clearFilters}
                  disabled={activeFiltersCount === 0 && !searchTerm}
                >
                  Limpar filtros
                </Button>
                <Button size="sm" onClick={() => onFilterChange({ ...filters })}>
                  Aplicar
                </Button>
              </div>
            )}
          </div>
        </PopoverContent>
      </Popover>

      {showClearFilters && activeFiltersCount > 0 && (
        <Button variant="ghost" size="sm" onClick={clearFilters} className="h-10">
          Limpar filtros
        </Button>
      )}
    </div>
  )
} 