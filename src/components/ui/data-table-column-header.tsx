"use client"

import { Column } from "@tanstack/react-table"
import { ChevronsUpDown, EyeOff, ArrowUpDown, ArrowUp, ArrowDown, Filter } from "lucide-react"
import { cn } from "@/lib/utils/utils"
import { Button } from "@/components/ui/button"
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

interface DataTableColumnHeaderProps<TData, TValue> {
  column: Column<TData, TValue>
  title: string
  className?: string
  enableSorting?: boolean
  enableHiding?: boolean
  enableFiltering?: boolean
  filterableOptions?: { value: string; label: string }[]
}

export function DataTableColumnHeader<TData, TValue>({
  column,
  title,
  className,
  enableSorting = true,
  enableHiding = true,
  enableFiltering = false,
  filterableOptions = []
}: DataTableColumnHeaderProps<TData, TValue>) {
  const [filterOpen, setFilterOpen] = useState(false)
  const [appliedFilters, setAppliedFilters] = useState<string[]>([])
  const [hasActiveFilter, setHasActiveFilter] = useState(false)
  const [blinkEffect, setBlinkEffect] = useState(false)

  // Don't show buttons for the actions column
  if (column.id === "actions") {
    return <div className={cn("flex items-center justify-center", className)}>{title}</div>
  }

  // Initialize appliedFilters from column.getFilterValue
  useEffect(() => {
    const currentFilter = column.getFilterValue()
    if (Array.isArray(currentFilter)) {
      setAppliedFilters(currentFilter as string[])
      setHasActiveFilter(true)
    } else if (currentFilter) {
      setHasActiveFilter(true)
    } else {
      setAppliedFilters([])
      setHasActiveFilter(false)
    }
  }, [column.getFilterValue()])

  // Add blink effect when filter is applied
  useEffect(() => {
    if (hasActiveFilter) {
      setBlinkEffect(true)
      const timer = setTimeout(() => setBlinkEffect(false), 1000)
      return () => clearTimeout(timer)
    }
  }, [hasActiveFilter])

  const handleFilterChange = (value: string, checked: boolean) => {
    setAppliedFilters(prev => {
      if (checked) {
        return [...prev, value]
      } else {
        return prev.filter(item => item !== value)
      }
    })
  }

  const applyFilter = () => {
    if (appliedFilters.length === 0) {
      column.setFilterValue(undefined)
      setHasActiveFilter(false)
    } else {
      column.setFilterValue(appliedFilters)
      setHasActiveFilter(true)
    }
    setFilterOpen(false)
  }

  const clearFilter = () => {
    setAppliedFilters([])
    column.setFilterValue(undefined)
    setHasActiveFilter(false)
    setFilterOpen(false)
  }

  const sortingState = column.getIsSorted()

  return (
    <div className={cn("flex items-center space-x-2", className)}>
      <div className="flex-1 flex items-center text-sm font-medium">
        {title}
        
        {/* Show the active sort/filter indicators */}
        {(sortingState || hasActiveFilter) && (
          <div className="flex gap-1 items-center ml-2">
            {sortingState === "asc" && <ArrowUp className="h-3.5 w-3.5 text-primary" />}
            {sortingState === "desc" && <ArrowDown className="h-3.5 w-3.5 text-primary" />}
            {hasActiveFilter && (
              <motion.div 
                initial={{ scale: 1 }}
                animate={{ 
                  scale: blinkEffect ? [1, 1.2, 1] : 1,
                  color: blinkEffect ? ["#10b981", "#10b981", "#10b981"] : "#10b981"
                }}
                transition={{ duration: 0.7, ease: "easeInOut" }}
              >
                <Filter className={cn(
                  "h-3.5 w-3.5",
                  blinkEffect ? "text-emerald-400" : "text-primary",
                  "transition-colors duration-300"
                )} />
              </motion.div>
            )}
          </div>
        )}
      </div>
      
      <div className="flex items-center gap-1">
        {/* Sorting and column visibility */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="-ml-3 h-8 data-[state=open]:bg-accent"
            >
              <ArrowUpDown className="h-3.5 w-3.5" />
              <span className="sr-only">Sort and filter menu</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            {enableSorting && (
              <>
                <DropdownMenuItem
                  onClick={() => column.toggleSorting(false)}
                  className="flex items-center gap-2"
                >
                  <ArrowUp className="h-3.5 w-3.5 text-muted-foreground" />
                  <span>Ordenar (A → Z)</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => column.toggleSorting(true)}
                  className="flex items-center gap-2"
                >
                  <ArrowDown className="h-3.5 w-3.5 text-muted-foreground" />
                  <span>Ordenar (Z → A)</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
              </>
            )}
            {enableHiding && (
              <DropdownMenuItem
                onClick={() => column.toggleVisibility(false)}
                className="flex items-center gap-2"
              >
                <EyeOff className="h-3.5 w-3.5 text-muted-foreground" />
                <span>Ocultar</span>
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
        
        {/* Filtering */}
        {enableFiltering && filterableOptions.length > 0 && (
          <DropdownMenu open={filterOpen} onOpenChange={setFilterOpen}>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className={cn(
                  "-mr-3 h-8 data-[state=open]:bg-accent",
                  hasActiveFilter && "bg-primary/10"
                )}
              >
                <Filter className={cn(
                  "h-3.5 w-3.5",
                  hasActiveFilter && "text-primary"
                )} />
                <span className="sr-only">Filtrar</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-[200px]">
              <div className="p-2">
                <div className="text-sm font-medium mb-2">Filtrar por {title}</div>
                <div className="space-y-2 max-h-[200px] overflow-auto">
                  {filterableOptions.map((option) => (
                    <div key={option.value} className="flex items-center">
                      <input
                        type="checkbox"
                        id={`filter-${column.id}-${option.value}`}
                        checked={appliedFilters.includes(option.value)}
                        onChange={(e) => handleFilterChange(option.value, e.target.checked)}
                        className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                      />
                      <label 
                        htmlFor={`filter-${column.id}-${option.value}`}
                        className="ml-2 text-sm"
                      >
                        {option.label}
                      </label>
                    </div>
                  ))}
                </div>
                <div className="flex justify-between mt-4">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={clearFilter}
                    className="text-xs"
                  >
                    Limpar
                  </Button>
                  <Button 
                    size="sm" 
                    onClick={applyFilter}
                    className="text-xs"
                  >
                    Aplicar
                  </Button>
                </div>
              </div>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </div>
  )
} 