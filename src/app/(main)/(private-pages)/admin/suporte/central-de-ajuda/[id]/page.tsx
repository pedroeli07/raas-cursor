"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  LifeBuoy,
  ArrowLeft,
  Clock,
  CheckCircle,
  AlertCircle,
  MessageCircle,
  Send,
  User,
  Loader2,
  Shield,
  Calendar
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale/pt-BR";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils/utils";

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

export default function HelpRequestDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [helpRequest, setHelpRequest] = useState<HelpRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [responseMessage, setResponseMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  // Carregar solicitação
  const fetchHelpRequest = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/help/${params.id}`);
      
      if (!response.ok) {
        throw new Error("Falha ao carregar a solicitação");
      }
      
      const data = await response.json();
      setHelpRequest(data.helpRequest);
      
      // Obter informações do usuário atual (do cookie ou localStorage, depende de como foi implementado)
      const currentUserRole = localStorage.getItem("userRole") || "user";
      const currentUserId = localStorage.getItem("userId") || "";
      setUserRole(currentUserRole);
      setUserId(currentUserId);
    } catch (error) {
      toast.error("Erro", {
        description: "Não foi possível carregar a solicitação"
      });
      console.error("Error fetching help request:", error);
    } finally {
      setLoading(false);
    }
  };

  // Enviar resposta
  const submitResponse = async () => {
    if (!responseMessage.trim()) {
      toast.error("A mensagem não pode estar vazia");
      return;
    }

    try {
      setIsSubmitting(true);
      const response = await fetch(`/api/help/response`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          helpRequestId: params.id,
          message: responseMessage,
        }),
      });

      if (!response.ok) {
        throw new Error("Falha ao enviar resposta");
      }

      setResponseMessage("");
      await fetchHelpRequest();
      
      toast.success("Resposta enviada com sucesso");
    } catch (error) {
      toast.error("Erro", {
        description: "Não foi possível enviar a resposta"
      });
      console.error("Error submitting response:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Atribuir solicitação a si mesmo (admin)
  const assignToSelf = async () => {
    try {
      const response = await fetch("/api/help", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          operation: "assign",
          helpRequestId: params.id,
        }),
      });

      if (!response.ok) {
        throw new Error("Falha ao atribuir solicitação");
      }

      await fetchHelpRequest();
      toast.success("Solicitação atribuída a você");
    } catch (error) {
      toast.error("Erro", {
        description: "Não foi possível atribuir a solicitação"
      });
      console.error("Error assigning help request:", error);
    }
  };

  // Atualizar status da solicitação
  const updateRequestStatus = async (status: string) => {
    try {
      const response = await fetch("/api/help", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          operation: "updateStatus",
          helpRequestId: params.id,
          status,
        }),
      });

      if (!response.ok) {
        throw new Error(`Falha ao atualizar status para ${status}`);
      }

      await fetchHelpRequest();
      toast.success(`Status atualizado para ${getStatusDisplayName(status)}`);
    } catch (error) {
      toast.error("Erro", {
        description: "Não foi possível atualizar o status"
      });
      console.error("Error updating help request status:", error);
    }
  };

  // Verificar se o usuário é admin
  const isAdmin = () => {
    return userRole === "admin" || userRole === "super_admin" || userRole === "admin_staff";
  };

  // Verificar se o usuário é o proprietário da solicitação
  const isOwner = () => {
    return userId === helpRequest?.userId;
  };

  // Verificar se o usuário é o admin atribuído
  const isAssignedAdmin = () => {
    return isAdmin() && userId === helpRequest?.adminId;
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

  // Formatar data completa
  const formatDate = (date: Date) => {
    return format(new Date(date), "dd 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: ptBR });
  };

  // Obter iniciais do nome
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(part => part[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  // Obter cor do avatar baseado no papel do usuário
  const getAvatarColor = (role: string) => {
    switch (role) {
      case "super_admin":
        return "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300";
      case "admin":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300";
      case "admin_staff":
        return "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-300";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300";
    }
  };

  // Obter ícone baseado no papel do usuário
  const getRoleInfo = (role: string) => {
    switch (role) {
      case "super_admin":
        return {
          icon: <Shield className="h-3 w-3" />,
          text: "Super Admin",
          color: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300"
        };
      case "admin":
        return {
          icon: <Shield className="h-3 w-3" />,
          text: "Admin",
          color: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300"
        };
      case "admin_staff":
        return {
          icon: <Shield className="h-3 w-3" />,
          text: "Suporte",
          color: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300"
        };
      default:
        return {
          icon: <User className="h-3 w-3" />,
          text: "Cliente",
          color: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300"
        };
    }
  };

  // Inicialização
  useEffect(() => {
    fetchHelpRequest();
  }, [params.id]);

  return (
    <div className="container mx-auto py-6 space-y-6">
      <Button
        variant="outline"
        className="mb-4"
        onClick={() => router.push('/admin/suporte/central-de-ajuda')}
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Voltar
      </Button>

      {loading ? (
        // Loading skeleton
        <div className="space-y-4">
          <div className="flex justify-between items-start">
            <div>
              <Skeleton className="h-8 w-[300px] mb-2" />
              <Skeleton className="h-4 w-[200px]" />
            </div>
            <Skeleton className="h-9 w-24" />
          </div>
          
          <Skeleton className="h-[200px] w-full mt-6" />
          
          <div className="mt-8">
            <Skeleton className="h-6 w-32 mb-4" />
            {[...Array(3)].map((_, index) => (
              <div key={index} className="flex gap-4 mb-6">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="flex-1">
                  <Skeleton className="h-5 w-40 mb-2" />
                  <Skeleton className="h-20 w-full" />
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : !helpRequest ? (
        // Not found
        <div className="text-center py-12">
          <LifeBuoy className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2">Solicitação não encontrada</h2>
          <p className="text-muted-foreground mb-6">
            A solicitação que você está procurando não existe ou foi removida.
          </p>
          <Button onClick={() => router.push('/admin/suporte/central-de-ajuda')}>
            Voltar para Central de Ajuda
          </Button>
        </div>
      ) : (
        <>
          <div className="flex flex-col md:flex-row justify-between items-start gap-4">
            <div>
              <h1 className="text-2xl font-bold tracking-tight mb-2 flex items-center gap-2">
                <LifeBuoy className="h-6 w-6 text-emerald-500" />
                {helpRequest.title}
              </h1>
              
              <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  <span>Aberta em {formatDate(new Date(helpRequest.createdAt))}</span>
                </div>
                
                <div className="flex items-center gap-1">
                  <span>•</span>
                  <span>Por {helpRequest.user.name}</span>
                </div>
                
                {helpRequest.adminId && (
                  <div className="flex items-center gap-1">
                    <span>•</span>
                    <span>Atribuída a um atendente</span>
                  </div>
                )}
              </div>
            </div>
            
            <div className="flex gap-2 self-start">
              <Badge 
                variant="outline" 
                className={cn(
                  "flex items-center gap-1 px-3 py-1",
                  getStatusColor(helpRequest.status)
                )}
              >
                {getStatusIcon(helpRequest.status)}
                {getStatusDisplayName(helpRequest.status)}
              </Badge>
              
              {(isAdmin() || isOwner()) && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm">
                      Ações
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {isAdmin() && !helpRequest.adminId && (
                      <DropdownMenuItem onClick={assignToSelf}>
                        <Clock className="mr-2 h-4 w-4" />
                        Atribuir a mim
                      </DropdownMenuItem>
                    )}
                    
                    {(isAdmin() || isOwner()) && helpRequest.status !== "RESOLVED" && (
                      <DropdownMenuItem onClick={() => updateRequestStatus("RESOLVED")}>
                        <CheckCircle className="mr-2 h-4 w-4" />
                        Marcar como resolvido
                      </DropdownMenuItem>
                    )}
                    
                    {(isAdmin() || isOwner()) && helpRequest.status !== "CLOSED" && (
                      <DropdownMenuItem onClick={() => updateRequestStatus("CLOSED")}>
                        <MessageCircle className="mr-2 h-4 w-4" />
                        Fechar solicitação
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          </div>
          
          <Card className="mt-6">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <Avatar className={getAvatarColor(helpRequest.user.role)}>
                  <AvatarFallback>{getInitials(helpRequest.user.name)}</AvatarFallback>
                </Avatar>
                
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium">{helpRequest.user.name}</span>
                    <Badge 
                      variant="outline" 
                      className={cn(
                        "flex items-center gap-1 text-xs py-0",
                        getRoleInfo(helpRequest.user.role).color
                      )}
                    >
                      {getRoleInfo(helpRequest.user.role).icon}
                      {getRoleInfo(helpRequest.user.role).text}
                    </Badge>
                  </div>
                  
                  <p className="text-muted-foreground text-sm mb-4">
                    {formatDate(new Date(helpRequest.createdAt))}
                  </p>
                  
                  <div className="prose prose-sm dark:prose-invert max-w-none">
                    {helpRequest.message.split('\n').map((line, i) => (
                      <p key={i} className="mb-3">{line}</p>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <div className="mt-8">
            <h2 className="text-xl font-semibold mb-6">
              Respostas {helpRequest.responses.length > 0 && `(${helpRequest.responses.length})`}
            </h2>
            
            {helpRequest.responses.length === 0 ? (
              <div className="text-center py-8 border rounded-md bg-muted/10">
                <MessageCircle className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-muted-foreground">
                  Ainda não há respostas para esta solicitação.
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                {helpRequest.responses.map((response) => (
                  <Card key={response.id} className="overflow-hidden">
                    <CardContent className="p-6">
                      <div className="flex items-start gap-4">
                        <Avatar className={getAvatarColor(response.user.role)}>
                          <AvatarFallback>{getInitials(response.user.name)}</AvatarFallback>
                        </Avatar>
                        
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium">{response.user.name}</span>
                            <Badge 
                              variant="outline" 
                              className={cn(
                                "flex items-center gap-1 text-xs py-0",
                                getRoleInfo(response.user.role).color
                              )}
                            >
                              {getRoleInfo(response.user.role).icon}
                              {getRoleInfo(response.user.role).text}
                            </Badge>
                          </div>
                          
                          <p className="text-muted-foreground text-sm mb-4">
                            {formatDate(new Date(response.createdAt))}
                          </p>
                          
                          <div className="prose prose-sm dark:prose-invert max-w-none">
                            {response.message.split('\n').map((line, i) => (
                              <p key={i} className="mb-3">{line}</p>
                            ))}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
          
          {helpRequest.status !== "CLOSED" && (
            <div className="mt-8">
              <h3 className="text-lg font-medium mb-2">Sua resposta</h3>
              <div className="flex flex-col gap-4">
                <Textarea
                  placeholder="Digite sua resposta..."
                  className="min-h-[120px]"
                  value={responseMessage}
                  onChange={(e) => setResponseMessage(e.target.value)}
                />
                <Button 
                  className="self-end"
                  onClick={submitResponse}
                  disabled={isSubmitting || !responseMessage.trim()}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Enviando...
                    </>
                  ) : (
                    <>
                      <Send className="mr-2 h-4 w-4" />
                      Enviar resposta
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
} 