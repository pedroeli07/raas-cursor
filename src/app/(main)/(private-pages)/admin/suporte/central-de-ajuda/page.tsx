// path: /admin/suporte/central-de-ajuda
"use client";

import React, { useState, useEffect } from "react";
import {
  LifeBuoy,
  MessageSquarePlus,
  Search,
  Plus,
  ArrowRight,
  Clock,
  CheckCircle, 
  AlertCircle,
  MessageCircle,
  MoreHorizontal,
  Loader2
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale/pt-BR";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { cn } from "@/lib/utils/utils";
import { Skeleton } from "@/components/ui/skeleton";

// Tipos
type HelpRequest = {
  id: string;
  userId: string;
  adminId?: string | null;
  title: string;
  message: string;
  status: "OPEN" | "IN_PROGRESS" | "RESOLVED" | "CLOSED";
  createdAt: Date;
  updatedAt: Date;
  user: {
    id: string;
    name: string;
    role: string;
    contact?: {
      emails: string[];
      phones: string[];
    };
  };
  responses: HelpResponse[];
};

type HelpResponse = {
  id: string;
  helpRequestId: string;
  userId: string;
  message: string;
  createdAt: Date;
  updatedAt: Date;
  user: {
    id: string;
    name: string;
    role: string;
  };
};

export default function HelpCenterPage() {
  const [helpRequests, setHelpRequests] = useState<HelpRequest[]>([]);
  const [filteredRequests, setFilteredRequests] = useState<HelpRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  
  // Novo pedido de ajuda
  const [newRequestTitle, setNewRequestTitle] = useState("");
  const [newRequestMessage, setNewRequestMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showNewRequestDialog, setShowNewRequestDialog] = useState(false);

  // Carregar solicitações de ajuda
  const fetchHelpRequests = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/help");
      
      if (!response.ok) {
        throw new Error("Falha ao carregar solicitações de ajuda");
      }
      
      const data = await response.json();
      setHelpRequests(data.helpRequests);
      filterRequests(data.helpRequests, activeTab, searchQuery);
    } catch (error) {
      toast.error("Erro", {
        description: "Não foi possível carregar as solicitações de ajuda"
      });
      console.error("Error fetching help requests:", error);
    } finally {
      setLoading(false);
    }
  };

  // Filtrar solicitações
  const filterRequests = (requests: HelpRequest[], tab: string, query: string) => {
    let filtered = [...requests];
    
    // Filtrar por status
    if (tab !== "all") {
      filtered = filtered.filter(req => {
        if (tab === "open") return req.status === "OPEN";
        if (tab === "inProgress") return req.status === "IN_PROGRESS";
        if (tab === "resolved") return req.status === "RESOLVED";
        if (tab === "closed") return req.status === "CLOSED";
        return true;
      });
    }
    
    // Filtrar por pesquisa
    if (query) {
      const lowerQuery = query.toLowerCase();
      filtered = filtered.filter(req => 
        req.title.toLowerCase().includes(lowerQuery) ||
        req.message.toLowerCase().includes(lowerQuery)
      );
    }
    
    setFilteredRequests(filtered);
  };

  // Manipular mudança de tab
  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    filterRequests(helpRequests, tab, searchQuery);
  };

  // Manipular pesquisa
  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);
    filterRequests(helpRequests, activeTab, query);
  };

  // Criar nova solicitação de ajuda
  const handleCreateRequest = async () => {
    if (!newRequestTitle.trim() || !newRequestMessage.trim()) {
      toast.error("Por favor, preencha todos os campos");
      return;
    }

    try {
      setIsSubmitting(true);
      const response = await fetch("/api/help", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: newRequestTitle,
          message: newRequestMessage,
        }),
      });

      if (!response.ok) {
        throw new Error("Falha ao criar solicitação");
      }

      const data = await response.json();
      
      // Atualizar a lista de solicitações
      await fetchHelpRequests();
      
      // Resetar o formulário
      setNewRequestTitle("");
      setNewRequestMessage("");
      setShowNewRequestDialog(false);
      
      toast.success("Solicitação criada com sucesso");
    } catch (error) {
      toast.error("Erro", {
        description: "Não foi possível criar a solicitação"
      });
      console.error("Error creating help request:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Atribuir solicitação a si mesmo (admin)
  const assignToSelf = async (requestId: string) => {
    try {
      const response = await fetch("/api/help", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          operation: "assign",
          helpRequestId: requestId,
        }),
      });

      if (!response.ok) {
        throw new Error("Falha ao atribuir solicitação");
      }

      await fetchHelpRequests();
      toast.success("Solicitação atribuída a você");
    } catch (error) {
      toast.error("Erro", {
        description: "Não foi possível atribuir a solicitação"
      });
      console.error("Error assigning help request:", error);
    }
  };

  // Atualizar status da solicitação
  const updateRequestStatus = async (requestId: string, status: string) => {
    try {
      const response = await fetch("/api/help", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          operation: "updateStatus",
          helpRequestId: requestId,
          status,
        }),
      });

      if (!response.ok) {
        throw new Error(`Falha ao atualizar status para ${status}`);
      }

      await fetchHelpRequests();
      toast.success(`Status atualizado para ${getStatusDisplayName(status)}`);
    } catch (error) {
      toast.error("Erro", {
        description: "Não foi possível atualizar o status"
      });
      console.error("Error updating help request status:", error);
    }
  };

  // Obter nome de exibição para o status
  const getStatusDisplayName = (status: string) => {
    switch (status) {
      case "OPEN": return "Aberto";
      case "IN_PROGRESS": return "Em Andamento";
      case "RESOLVED": return "Resolvido";
      case "CLOSED": return "Fechado";
      default: return status;
    }
  };

  // Obter cor para o status
  const getStatusColor = (status: string) => {
    switch (status) {
      case "OPEN":
        return "bg-yellow-100 text-yellow-800 hover:bg-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-300";
      case "IN_PROGRESS":
        return "bg-blue-100 text-blue-800 hover:bg-blue-200 dark:bg-blue-900/20 dark:text-blue-300";
      case "RESOLVED":
        return "bg-emerald-100 text-emerald-800 hover:bg-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-300";
      case "CLOSED":
        return "bg-gray-100 text-gray-800 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300";
      default:
        return "bg-gray-100 text-gray-800 hover:bg-gray-200";
    }
  };

  // Obter ícone para o status
  const getStatusIcon = (status: string) => {
    switch (status) {
      case "OPEN":
        return <AlertCircle className="h-4 w-4" />;
      case "IN_PROGRESS":
        return <Clock className="h-4 w-4" />;
      case "RESOLVED":
        return <CheckCircle className="h-4 w-4" />;
      case "CLOSED":
        return <MessageCircle className="h-4 w-4" />;
      default:
        return <AlertCircle className="h-4 w-4" />;
    }
  };

  // Formatar data relativa
  const formatRelativeDate = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - new Date(date).getTime();
    
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (minutes < 60) {
      return `há ${minutes === 0 ? 1 : minutes} ${minutes === 1 ? 'minuto' : 'minutos'}`;
    } else if (hours < 24) {
      return `há ${hours} ${hours === 1 ? 'hora' : 'horas'}`;
    } else if (days < 7) {
      return `há ${days} ${days === 1 ? 'dia' : 'dias'}`;
    } else {
      return format(new Date(date), "dd 'de' MMM 'de' yyyy", { locale: ptBR });
    }
  };

  // Inicialização
  useEffect(() => {
    fetchHelpRequests();
  }, []);

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex flex-col space-y-2">
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <LifeBuoy className="h-7 w-7 text-emerald-500" />
          Central de Ajuda
        </h1>
        <p className="text-muted-foreground">
          Solicite suporte ou visualize suas solicitações anteriores
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="relative w-full sm:w-auto">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar solicitações..."
            className="pl-9 w-full sm:w-[320px]"
            value={searchQuery}
            onChange={handleSearch}
          />
        </div>
        
        <Dialog open={showNewRequestDialog} onOpenChange={setShowNewRequestDialog}>
          <DialogTrigger asChild>
            <Button className="w-full sm:w-auto">
              <Plus className="mr-2 h-4 w-4" />
              Nova Solicitação
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Nova Solicitação de Ajuda</DialogTitle>
              <DialogDescription>
                Preencha os detalhes da sua solicitação. Nossa equipe irá atendê-lo o mais rápido possível.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="title">Título</Label>
                <Input
                  id="title"
                  placeholder="Ex: Problema ao acessar dashboard"
                  value={newRequestTitle}
                  onChange={(e) => setNewRequestTitle(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="message">Mensagem</Label>
                <Textarea
                  id="message"
                  placeholder="Descreva seu problema detalhadamente..."
                  rows={5}
                  value={newRequestMessage}
                  onChange={(e) => setNewRequestMessage(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button 
                variant="outline" 
                onClick={() => setShowNewRequestDialog(false)}
                disabled={isSubmitting}
              >
                Cancelar
              </Button>
              <Button 
                onClick={handleCreateRequest}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Enviando...
                  </>
                ) : (
                  <>
                    <MessageSquarePlus className="mr-2 h-4 w-4" />
                    Enviar Solicitação
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs 
        defaultValue="all" 
        value={activeTab}
        onValueChange={handleTabChange}
        className="w-full"
      >
        <TabsList className="grid grid-cols-2 sm:grid-cols-5 mb-4">
          <TabsTrigger value="all">Todas</TabsTrigger>
          <TabsTrigger value="open">Abertas</TabsTrigger>
          <TabsTrigger value="inProgress">Em Andamento</TabsTrigger>
          <TabsTrigger value="resolved">Resolvidas</TabsTrigger>
          <TabsTrigger value="closed">Fechadas</TabsTrigger>
        </TabsList>
        
        <TabsContent value={activeTab} className="mt-0">
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[320px]">Título</TableHead>
                  <TableHead className="hidden md:table-cell">Status</TableHead>
                  <TableHead className="hidden md:table-cell">Data</TableHead>
                  <TableHead className="hidden md:table-cell">Respostas</TableHead>
                  <TableHead className="w-[80px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  // Loading skeleton
                  [...Array(5)].map((_, index) => (
                    <TableRow key={index}>
                      <TableCell><Skeleton className="h-5 w-full" /></TableCell>
                      <TableCell className="hidden md:table-cell"><Skeleton className="h-5 w-24" /></TableCell>
                      <TableCell className="hidden md:table-cell"><Skeleton className="h-5 w-28" /></TableCell>
                      <TableCell className="hidden md:table-cell"><Skeleton className="h-5 w-10" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-8" /></TableCell>
                    </TableRow>
                  ))
                ) : filteredRequests.length === 0 ? (
                  // Empty state
                  <TableRow>
                    <TableCell colSpan={5} className="h-32 text-center">
                      <div className="flex flex-col items-center justify-center py-5">
                        <LifeBuoy className="h-10 w-10 text-muted-foreground mb-2" />
                        <h3 className="text-lg font-medium">Nenhuma solicitação encontrada</h3>
                        <p className="text-sm text-muted-foreground mt-1 mb-5">
                          {searchQuery 
                            ? 'Tente uma busca diferente' 
                            : 'Crie sua primeira solicitação para obter ajuda'}
                        </p>
                        <Button onClick={() => setShowNewRequestDialog(true)}>
                          <Plus className="mr-2 h-4 w-4" />
                          Nova Solicitação
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  // Help requests list
                  filteredRequests.map((request) => (
                    <TableRow 
                      key={request.id}
                      className={cn(
                        request.status === "OPEN" ? "bg-yellow-50/30 dark:bg-yellow-950/10" : "",
                        request.status === "CLOSED" ? "opacity-80" : ""
                      )}
                    >
                      <TableCell className="font-medium">
                        <div className="flex flex-col">
                          <div className="flex items-center">
                            {request.status === "OPEN" && (
                              <div className="h-2 w-2 bg-yellow-500 rounded-full mr-2" />
                            )}
                            <a 
                              href={`/admin/suporte/central-de-ajuda/${request.id}`}
                              className="hover:text-emerald-600 dark:hover:text-emerald-400 hover:underline transition-colors"
                            >
                              {request.title}
                            </a>
                          </div>
                          <div className="md:hidden flex items-center gap-2 mt-1">
                            <Badge 
                              variant="outline" 
                              className={cn("flex items-center gap-1 text-xs", getStatusColor(request.status))}
                            >
                              {getStatusIcon(request.status)}
                              {getStatusDisplayName(request.status)}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {formatRelativeDate(new Date(request.createdAt))}
                            </span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <Badge 
                          variant="outline" 
                          className={cn("flex items-center gap-1", getStatusColor(request.status))}
                        >
                          {getStatusIcon(request.status)}
                          {getStatusDisplayName(request.status)}
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                        {formatRelativeDate(new Date(request.createdAt))}
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <Badge variant="secondary" className="text-xs">
                          {request.responses.length}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem 
                              onClick={() => window.location.href = `/admin/suporte/central-de-ajuda/${request.id}`}
                            >
                              <MessageCircle className="mr-2 h-4 w-4" />
                              Ver detalhes
                            </DropdownMenuItem>
                            
                            {request.status === "OPEN" && (
                              <DropdownMenuItem 
                                onClick={() => assignToSelf(request.id)}
                              >
                                <ArrowRight className="mr-2 h-4 w-4" />
                                Atribuir a mim
                              </DropdownMenuItem>
                            )}
                            
                            <DropdownMenuSeparator />
                            
                            {request.status !== "RESOLVED" && request.status !== "CLOSED" && (
                              <DropdownMenuItem
                                onClick={() => updateRequestStatus(request.id, "RESOLVED")}
                              >
                                <CheckCircle className="mr-2 h-4 w-4" />
                                Marcar como resolvido
                              </DropdownMenuItem>
                            )}
                            
                            {request.status !== "CLOSED" && (
                              <DropdownMenuItem
                                onClick={() => updateRequestStatus(request.id, "CLOSED")}
                              >
                                <MessageCircle className="mr-2 h-4 w-4" />
                                Fechar solicitação
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>

      {helpRequests.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Total de Solicitações</CardTitle>
              <CardDescription>Todas as solicitações</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{helpRequests.length}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Abertas</CardTitle>
              <CardDescription>Aguardando atendimento</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex justify-between items-center">
                <div className="text-3xl font-bold">{helpRequests.filter(r => r.status === "OPEN").length}</div>
                <Badge className={getStatusColor("OPEN")}>
                  {getStatusIcon("OPEN")}
                </Badge>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Em Andamento</CardTitle>
              <CardDescription>Sendo atendidas</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex justify-between items-center">
                <div className="text-3xl font-bold">{helpRequests.filter(r => r.status === "IN_PROGRESS").length}</div>
                <Badge className={getStatusColor("IN_PROGRESS")}>
                  {getStatusIcon("IN_PROGRESS")}
                </Badge>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Resolvidas</CardTitle>
              <CardDescription>Finalizadas com sucesso</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex justify-between items-center">
                <div className="text-3xl font-bold">{helpRequests.filter(r => r.status === "RESOLVED").length}</div>
                <Badge className={getStatusColor("RESOLVED")}>
                  {getStatusIcon("RESOLVED")}
                </Badge>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
