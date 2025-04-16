"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"

type Installation = {
  id: string
  instalacaoNumber: string
  type: "generator" | "consumer"
  distribuidora: string
  owner?: string
  quota?: number
  status?: "active" | "inactive" | "pending"
}

type InstallationsTableProps = {
  installations: Installation[]
  onEdit?: (installation: Installation) => void
  onDelete?: (id: string) => void
  onView?: (id: string) => void
  onStatusChange?: (id: string, status: "active" | "inactive" | "pending") => void
}

// Custom Badge Component to show status
function StatusBadge({ status = "active" }: { status?: "active" | "inactive" | "pending" }) {
  const actualStatus = status || "active";
  
  const variants = {
    active: "bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 border-emerald-500/20",
    inactive: "bg-slate-500/10 text-slate-500 hover:bg-slate-500/20 border-slate-500/20",
    pending: "bg-amber-500/10 text-amber-500 hover:bg-amber-500/20 border-amber-500/20"
  }
  
  const labels = {
    active: "Ativo",
    inactive: "Inativo",
    pending: "Pendente"
  }
  
  return (
    <Badge className={`${variants[actualStatus]} border`}>
      {labels[actualStatus]}
    </Badge>
  )
}

export function InstallationsTable({ 
  installations,
  onEdit,
  onDelete,
  onView,
  onStatusChange
}: InstallationsTableProps) {
  const [searchTerm, setSearchTerm] = useState("")
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  
  const filteredInstallations = installations.filter(installation => 
    installation.instalacaoNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
    installation.distribuidora.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (installation.owner && installation.owner.toLowerCase().includes(searchTerm.toLowerCase()))
  )
  
  const handleStatusChange = (id: string, status: "active" | "inactive" | "pending") => {
    if (onStatusChange) {
      onStatusChange(id, status)
    }
  }
  
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Input
          placeholder="Buscar instalações..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-sm"
        />
      </div>
      
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nº Instalação</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Distribuidora</TableHead>
              <TableHead>Proprietário</TableHead>
              <TableHead>Quota</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <AnimatePresence>
              {filteredInstallations.length > 0 ? (
                filteredInstallations.map((installation) => (
                  <motion.tr
                    key={installation.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="group"
                  >
                    <TableCell className="font-medium">{installation.instalacaoNumber}</TableCell>
                    <TableCell>
                      {installation.type === "generator" ? (
                        <Badge variant="outline" className="bg-blue-500/10 text-blue-500 border-blue-500/20">
                          Geradora
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="bg-purple-500/10 text-purple-500 border-purple-500/20">
                          Consumidora
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>{installation.distribuidora}</TableCell>
                    <TableCell>{installation.owner || "-"}</TableCell>
                    <TableCell>{installation.quota ? `${installation.quota}%` : "-"}</TableCell>
                    <TableCell>
                      <StatusBadge status={installation.status} />
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <span className="sr-only">Abrir menu</span>
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <circle cx="12" cy="12" r="1" />
                              <circle cx="12" cy="5" r="1" />
                              <circle cx="12" cy="19" r="1" />
                            </svg>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Ações</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          
                          {onView && (
                            <DropdownMenuItem onClick={() => onView(installation.id)}>
                              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2">
                                <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
                                <circle cx="12" cy="12" r="3" />
                              </svg>
                              Visualizar
                            </DropdownMenuItem>
                          )}
                          
                          {onEdit && (
                            <DropdownMenuItem onClick={() => onEdit(installation)}>
                              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2">
                                <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
                              </svg>
                              Editar
                            </DropdownMenuItem>
                          )}
                          
                          <DropdownMenuSeparator />
                          
                          {onStatusChange && (
                            <>
                              <DropdownMenuItem 
                                onClick={() => handleStatusChange(installation.id, "active")}
                                className="text-emerald-500"
                                disabled={(installation.status || "active") === "active"}
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2">
                                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                                  <path d="m9 11 3 3L22 4" />
                                </svg>
                                Marcar como ativo
                              </DropdownMenuItem>
                              
                              <DropdownMenuItem 
                                onClick={() => handleStatusChange(installation.id, "inactive")}
                                className="text-slate-500"
                                disabled={(installation.status || "active") === "inactive"}
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2">
                                  <circle cx="12" cy="12" r="10" />
                                  <path d="M8 12h8" />
                                </svg>
                                Marcar como inativo
                              </DropdownMenuItem>
                              
                              <DropdownMenuItem 
                                onClick={() => handleStatusChange(installation.id, "pending")}
                                className="text-amber-500"
                                disabled={(installation.status || "active") === "pending"}
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2">
                                  <circle cx="12" cy="12" r="10" />
                                  <line x1="12" x2="12" y1="8" y2="12" />
                                  <line x1="12" x2="12.01" y1="16" y2="16" />
                                </svg>
                                Marcar como pendente
                              </DropdownMenuItem>
                              
                              <DropdownMenuSeparator />
                            </>
                          )}
                          
                          {onDelete && (
                            <Dialog open={confirmDelete === installation.id} onOpenChange={(open) => {
                              if (!open) setConfirmDelete(null)
                            }}>
                              <DialogTrigger asChild>
                                <DropdownMenuItem 
                                  onClick={() => setConfirmDelete(installation.id)}
                                  className="text-red-500"
                                >
                                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2">
                                    <path d="M3 6h18" />
                                    <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                                    <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                                  </svg>
                                  Excluir
                                </DropdownMenuItem>
                              </DialogTrigger>
                              <DialogContent>
                                <DialogHeader>
                                  <DialogTitle>Confirmar exclusão</DialogTitle>
                                  <DialogDescription>
                                    Tem certeza que deseja excluir a instalação <strong>{installation.instalacaoNumber}</strong>? Esta ação não pode ser desfeita.
                                  </DialogDescription>
                                </DialogHeader>
                                <DialogFooter>
                                  <Button variant="outline" onClick={() => setConfirmDelete(null)}>
                                    Cancelar
                                  </Button>
                                  <Button 
                                    variant="destructive" 
                                    onClick={() => {
                                      onDelete(installation.id)
                                      setConfirmDelete(null)
                                    }}
                                  >
                                    Excluir
                                  </Button>
                                </DialogFooter>
                              </DialogContent>
                            </Dialog>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </motion.tr>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center">
                    Nenhuma instalação encontrada.
                  </TableCell>
                </TableRow>
              )}
            </AnimatePresence>
          </TableBody>
        </Table>
      </div>
    </div>
  )
} 