// path: /admin/usuarios/convites
// Path: src/app/(main)/(private-pages)/admin/usuarios/(usuarios)/page.tsx

"use client";

import React, { useState, useEffect } from "react";
import { useUserManagementStore, Invitation } from "@/store/userManagementStore";
import { useUiPreferencesStore } from "@/store/uiPreferencesStore";
import { toast } from "sonner";
import { InvitationCard } from "@/components/ux/InvitationCard";
import { InvitationTable } from "@/components/ux/InvitationTable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { motion, AnimatePresence } from "framer-motion";
import { Role } from "@prisma/client";
import { format, isBefore, isEqual } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Search } from "lucide-react";
import { ViewToggle, ViewMode } from "@/components/ui/view-toggle";
// UI Components
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Badge,
  badgeVariants,
} from "@/components/ui/badge";

// Icons
import {
  RefreshCw,
  SendIcon,
  FilterIcon,
  CheckCircle,
  XCircle,
  Clock,
  CalendarIcon,
  UserPlusIcon,
  MailIcon,
  AlertTriangle,
  Settings,
  Trash2,
  Calendar
} from "lucide-react";

// Add import for ConfirmAlert
import { ConfirmAlert } from "@/components/ui/alert-dialog-custom";

// Add import for DatePicker
import { DatePicker } from "@/components/ui/date-picker";

// Validation schema for new invitation
const formSchema = z.object({
  email: z.string().email({ message: "Endereço de email inválido" }),
  name: z.string().optional(),
  role: z.string({ message: "Selecione um papel para o usuário" }),
  message: z.string().optional(),
  resend: z.boolean().optional(),
  revoke: z.boolean().optional(),
});

const roleOptions = [
  { value: Role.ADMIN, label: "Administrador" },
  { value: Role.ADMIN_STAFF, label: "Equipe Administrativa" },
  { value: Role.CUSTOMER, label: "Cliente" },
  { value: Role.ENERGY_RENTER, label: "Locador de Energia" },
];

// Card animation variants
const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      delay: i * 0.1,
      duration: 0.3,
      ease: "easeOut",
    },
  }),
};

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { 
    opacity: 1,
    transition: { staggerChildren: 0.05 }
  },
  exit: { 
    opacity: 0,
    transition: { staggerChildren: 0.03, staggerDirection: -1 }
  }
};

export default function ConvitesPage() {
  const {
    invitations,
    invitationsLoading,
    invitationsError,
    fetchInvitations,
    createInvitation,
    formatDate,
  } = useUserManagementStore();

  // Use UI preferences from store instead of local state
  const {
    invitationsStatusFilter,
    invitationsRoleFilter,
    invitationsSearchText,
    invitationsSearchField,
    invitationsStartDate,
    invitationsEndDate,
    invitationsViewMode,
    setInvitationsStatusFilter,
    setInvitationsRoleFilter,
    setInvitationsSearchText,
    setInvitationsSearchField,
    setInvitationsStartDate,
    setInvitationsEndDate,
    setInvitationsViewMode
  } = useUiPreferencesStore();

  // Form handling with react-hook-form and zod
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
      name: "",
      role: Role.CUSTOMER,
      message: "",
      resend: false,
      revoke: false,
    },
  });

  // Maintain these states locally as they're not UI preferences
  const [dialogOpen, setDialogOpen] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);
  const [sending, setSending] = useState(false);
  const [editingInvitation, setEditingInvitation] = useState<Invitation | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Invitation | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Reference to track if component is mounted
  const isMounted = React.useRef(true);

  // Handle refresh with animation and toast
  const handleRefresh = async () => {
    try {
      setIsRefreshing(true);
      await fetchInvitations();
      
      if (isMounted.current) {
        toast.success("Dados atualizados", {
          description: "Lista de convites atualizada com sucesso.",
          duration: 3000,
          dismissible: true,
        });
      }
    } catch (error) {
      if (isMounted.current) {
        toast.error("Erro ao atualizar", {
          description: error instanceof Error ? error.message : String(error),
          duration: 3000,
          dismissible: true,
        });
      }
    } finally {
      if (isMounted.current) {
        setIsRefreshing(false);
      }
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMounted.current = false;
    };
  }, []);

  // Add this helper function to properly close and reset the dialog state
  const closeDialog = () => {
    console.log("Closing dialog and resetting form");
    setEditingInvitation(null);
    form.reset({
      email: "",
      name: "",
      role: Role.CUSTOMER,
      message: "",
      resend: false,
      revoke: false,
    });
    setDialogOpen(false);
  };

  // Handle dialog open
  const handleOpenInviteForm = () => {
    // Always ensure we're resetting the state before opening for a new invitation
    setEditingInvitation(null);
    form.reset({
      email: "",
      name: "",
      role: Role.CUSTOMER,
      message: "",
      resend: false,
      revoke: false,
    });
    setDialogOpen(true);
  };

  // Submit handler for the invitation form
  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      setSending(true);
      
      // If we're editing an existing invitation
      if (editingInvitation) {
        // Get the revoke checkbox value from the form
        const revoke = form.getValues('revoke');
        
        // If revoke is checked, revoke the invitation instead of updating it
        if (revoke) {
          await useUserManagementStore.getState().revokeInvitation(editingInvitation.id);
          
          toast.success("Convite revogado", {
            description: `Convite para ${values.email} foi revogado com sucesso`,
            duration: 3000,
            dismissible: true,
          });
        } else {
          // Get the resend checkbox value from the form
          const resend = form.getValues('resend');
          
          await useUserManagementStore.getState().updateInvitation(
            editingInvitation.id,
            {
              email: values.email,
              name: values.name,
              role: values.role,
              message: values.message,
              resend: !!resend
            }
          );

          toast.success("Convite atualizado", {
            description: resend 
              ? `Convite atualizado e reenviado para ${values.email}` 
              : `Convite atualizado para ${values.email}`,
            duration: 3000,
            dismissible: true,
          });
        }
      } else {
        // Create a new invitation
        await createInvitation({
          email: values.email,
          name: values.name,
          role: values.role,
          message: values.message,
        });

        toast.success("Convite enviado", {
          description: `Convite enviado com sucesso para ${values.email}`,
          duration: 3000,
          dismissible: true,
        });
      }
      
      // Use the closeDialog function to properly reset all state
      closeDialog();
      
      // Trigger confetti effect
      setShowCelebration(true);
      setTimeout(() => setShowCelebration(false), 3000);
      
      // Refresh the invitations list
      fetchInvitations();
      
    } catch (error) {
      toast.error(editingInvitation ? "Erro ao atualizar convite" : "Erro ao enviar convite", {
        description: error instanceof Error ? error.message : String(error),
        duration: 3000,
        dismissible: true,
      });
    } finally {
      setSending(false);
    }
  };

  // Load invitations on component mount
  useEffect(() => {
    fetchInvitations().catch((error) => {
      console.error("Erro ao buscar convites:", error);
      toast.error("Erro ao carregar convites", {
        description: error instanceof Error ? error.message : String(error),
        duration: 3000,
        dismissible: true,
      });
    });
  }, [fetchInvitations]);

  // Add debug logging when invitations change
  useEffect(() => {
    console.log("Invitations loaded:", invitations);
  }, [invitations]);

  // Filter invitations with date range filter using two DatePickers
  const filteredInvitations = React.useMemo(() => {
    return invitations.filter((invitation) => {
      const matchesStatus = invitationsStatusFilter === "all" || invitation.status === invitationsStatusFilter;
      const matchesRole = invitationsRoleFilter === "all" || invitation.role === invitationsRoleFilter;
      
      // Date range filter
      let matchesDateRange = true;
      const invitationDate = new Date(invitation.createdAt);
      
      if (invitationsStartDate && invitationsEndDate) {
        // Ensure start date is before or equal to end date
        if (isBefore(invitationsEndDate, invitationsStartDate)) {
          // Handle invalid range (e.g., show error or ignore)
          // For now, let's treat it as no date filter
        } else {
          matchesDateRange = !isBefore(invitationDate, invitationsStartDate) && !isBefore(invitationsEndDate, invitationDate);
        }
      } else if (invitationsStartDate) {
        matchesDateRange = !isBefore(invitationDate, invitationsStartDate) || isEqual(invitationDate, invitationsStartDate);
      } else if (invitationsEndDate) {
        matchesDateRange = !isBefore(invitationsEndDate, invitationDate) || isEqual(invitationDate, invitationsEndDate);
      }
      
      // Text search filter
      let matchesSearch = true;
      if (invitationsSearchText.trim() !== "") {
        const searchLower = invitationsSearchText.toLowerCase();
        if (invitationsSearchField === "email") {
          matchesSearch = invitation.email.toLowerCase().includes(searchLower);
        } else if (invitationsSearchField === "name" && invitation.name) {
          matchesSearch = invitation.name.toLowerCase().includes(searchLower);
        } else if (invitationsSearchField === "createdAt" && invitation.createdAt) {
          // Use format from date-fns directly instead of formatDate
          matchesSearch = format(new Date(invitation.createdAt), 'dd/MM/yyyy', { locale: ptBR }).includes(invitationsSearchText);
        } else if (invitationsSearchField === "status") {
          matchesSearch = getStatusLabel(invitation.status).toLowerCase().includes(searchLower);
        }
      }
      
      return matchesStatus && matchesRole && matchesSearch && matchesDateRange;
    });
  }, [invitations, invitationsStatusFilter, invitationsRoleFilter, invitationsSearchText, invitationsSearchField, invitationsStartDate, invitationsEndDate]);

  // Resend invitation
  const handleResendInvitation = async (invitation: Invitation) => {
    try {
      await createInvitation({
        email: invitation.email,
        name: invitation.name || undefined,
        role: invitation.role,
      });
      return Promise.resolve();
    } catch (error) {
      return Promise.reject(error);
    }
  };

  // Get status badge variant
  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "PENDING":
        return "warning";
      case "ACCEPTED":
        return "success";
      case "REVOKED":
        return "destructive";
      case "EXPIRED":
        return "outline";
      default:
        return "secondary";
    }
  };

  // Get status label
  const getStatusLabel = (status: string) => {
    switch (status) {
      case "PENDING":
        return "Pendente";
      case "ACCEPTED":
        return "Aceito";
      case "REVOKED":
        return "Revogado";
      case "EXPIRED":
        return "Expirado";
      default:
        return status;
    }
  };

  // Get status icon
  const getStatusIcon = (status: string) => {
    switch (status) {
      case "PENDING":
        return <Clock className="h-4 w-4 mr-1" />;
      case "ACCEPTED":
        return <CheckCircle className="h-4 w-4 mr-1" />;
      case "REVOKED":
        return <XCircle className="h-4 w-4 mr-1" />;
      case "EXPIRED":
        return <CalendarIcon className="h-4 w-4 mr-1" />;
      default:
        return <AlertTriangle className="h-4 w-4 mr-1" />;
    }
  };

  // Count invitations by status
  const countByStatus = React.useMemo(() => {
    const counts = {
      total: invitations.length,
      PENDING: 0,
      ACCEPTED: 0,
      REVOKED: 0,
      EXPIRED: 0
    };
    
    invitations.forEach(invitation => {
      if (invitation.status in counts) {
        counts[invitation.status as keyof typeof counts]++;
      }
    });
    
    return counts;
  }, [invitations]);

  // Function to open edit dialog
  const handleEditInvitation = (invitation: Invitation) => {
    setEditingInvitation(invitation);
    form.reset({
      email: invitation.email,
      name: invitation.name || "",
      role: invitation.role,
      message: "",
      resend: false,
      revoke: false,
    });
    setDialogOpen(true);
  };

  // Handle delete invitation
  const handleDeleteInvitation = async () => {
    if (!confirmDelete) return;
    
    try {
      setIsProcessing(true);
      await useUserManagementStore.getState().deleteInvitation(confirmDelete.id);
      
      toast.success("Convite excluído", {
        description: `Convite para ${confirmDelete.email} foi excluído permanentemente`,
        duration: 3000,
        dismissible: true,
      });
    } catch (error) {
      toast.error("Erro ao excluir convite", {
        description: error instanceof Error ? error.message : String(error),
        duration: 3000,
        dismissible: true,
      });
    } finally {
      setIsProcessing(false);
      setConfirmDelete(null);
    }
  };

  return (
    <>
      <div className="-mt-0 bg-gradient-to-r from-primary/10 to-accent/20 space-y-6 pb-8 h-full w-full overflow-hidden flex flex-col">
        <Card className="flex-1 overflow-hidden flex flex-col border-primary/20 dark:border-primary/30 shadow-md mx-4">
          <CardHeader className="pb-4">
            <CardTitle>Convites Enviados</CardTitle>
            <div className="flex flex-wrap gap-3 mt-2 items-center">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline" className="px-2.5 py-1">
                  <MailIcon className="h-3.5 w-3.5 mr-1.5" />
                  Total: {countByStatus.total}
                </Badge>
                
                <Badge variant="warning" className="px-2.5 py-1">
                  {getStatusIcon("PENDING")}
                  Pendentes: {countByStatus.PENDING}
                </Badge>
                
                <Badge variant="success" className="px-2.5 py-1">
                  {getStatusIcon("ACCEPTED")}
                  Aceitos: {countByStatus.ACCEPTED}
                </Badge>
                
                <Badge variant="destructive" className="px-2.5 py-1">
                  {getStatusIcon("REVOKED")}
                  Revogados: {countByStatus.REVOKED}
                </Badge>
                
                <Badge variant="outline" className="px-2.5 py-1">
                  {getStatusIcon("EXPIRED")}
                  Expirados: {countByStatus.EXPIRED}
                </Badge>
              </div>
            </div>

            <div className="flex flex-col gap-4 mt-4">
              {/* Filters section with grid layout */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 2xl:grid-cols-7 gap-4">
                {/* Status Filter */}
                <Select value={invitationsStatusFilter} onValueChange={setInvitationsStatusFilter}>
                  <SelectTrigger className="w-full border border-primary/40 focus:border-primary/90 hover:border-primary/40 hover:bg-primary/10 transition-all duration-300 hover:shadow-sm">
                    <SelectValue placeholder="Filtrar por status" />
                  </SelectTrigger>
                  <SelectContent className="hover:text-black hover:shadow-emerald-500 transition-all duration-300 hover:shadow-lg">
                    <SelectItem value="all">Todos os status</SelectItem>
                    <SelectItem value="PENDING">Pendentes</SelectItem>
                    <SelectItem value="ACCEPTED">Aceitos</SelectItem>
                    <SelectItem value="REVOKED">Revogados</SelectItem>
                    <SelectItem value="EXPIRED">Expirados</SelectItem>
                  </SelectContent>
                </Select>

                {/* Role Filter */}
                <Select value={invitationsRoleFilter} onValueChange={setInvitationsRoleFilter}>
                  <SelectTrigger className="w-full border border-primary/40 focus:border-primary/90 hover:border-primary/40 hover:bg-primary/10 transition-all duration-300 hover:shadow-sm">
                    <SelectValue placeholder="Filtrar por papel" />
                  </SelectTrigger>
                  <SelectContent className="hover:text-black hover:shadow-emerald-500 transition-all duration-300 hover:shadow-lg">
                    <SelectItem value="all">Todos os papéis</SelectItem>
                    {roleOptions.map((role) => (
                      <SelectItem key={role.value} value={role.value}>
                        {role.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* Search Field Select */}
                <Select
                  value={invitationsSearchField}
                  onValueChange={setInvitationsSearchField}
                >
                  <SelectTrigger className="w-full border border-primary/40 focus:border-primary/90 hover:border-primary/40 hover:bg-primary/10 transition-all duration-300 hover:shadow-sm">
                    <SelectValue className="text-black" placeholder="Buscar por" />
                  </SelectTrigger>
                  <SelectContent className="bg-white hover:text-black hover:shadow-emerald-500 transition-all duration-300 hover:shadow-lg">
                    <SelectItem value="email">Email</SelectItem>
                    <SelectItem value="name">Nome</SelectItem>
                    <SelectItem value="createdAt">Data</SelectItem>
                    <SelectItem value="status">Status</SelectItem>
                  </SelectContent>
                </Select>

                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="search"
                    placeholder={`Buscar por ${invitationsSearchField === 'email' ? 'email' : invitationsSearchField === 'name' ? 'nome' : invitationsSearchField === 'createdAt' ? 'data (dd/MM/yyyy)' : 'status'}...`}
                    value={invitationsSearchText}
                    onChange={(e) => setInvitationsSearchText(e.target.value)}
                    className="pl-8 w-full border border-primary/40 focus:border-primary/90 hover:border-primary/40 hover:bg-primary/10 transition-all duration-300 hover:shadow-sm"
                  />
                </div>

                {/* Start Date Picker */}
                <DatePicker
                  date={invitationsStartDate}
                  setDate={setInvitationsStartDate}
                  placeholder="Data de início"
                  className="border border-primary/40 focus:border-primary/90 hover:border-primary/40 hover:bg-primary/10 transition-all duration-300 hover:shadow-sm"
                />
                
                {/* End Date Picker */}
                <DatePicker
                  date={invitationsEndDate}
                  setDate={setInvitationsEndDate}
                  placeholder="Data de fim"
                  className="border border-primary/40 focus:border-primary/90 hover:border-primary/40 hover:bg-primary/10 transition-all duration-300 hover:shadow-sm"
                />
              </div>
              
              {/* Actions row with centered New Invitation button */}
              <div className="flex items-center justify-between mt-2">
                {/* Left corner - Refresh button with animation */}
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleRefresh}
                  disabled={isRefreshing}
                  className="border-primary/20 hover:border-primary/30"
                >
                  <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
                </Button>
                
                {/* Center - New Invitation button */}
                <div className="flex-1 flex justify-center">
                  <Button 
                    onClick={handleOpenInviteForm}
                    className="gap-1.5 bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 shadow-md hover:shadow-lg transition-all duration-300 hover:-translate-y-0.5 whitespace-nowrap"
                  >
                    <UserPlusIcon className="h-4 w-4" />
                    <span>Novo Convite</span>
                  </Button>
                </div>
                
                {/* Right corner - View toggle */}
                <ViewToggle mode={invitationsViewMode} onToggle={setInvitationsViewMode} />
              </div>
            </div>
          </CardHeader>

          <CardContent className="flex-grow overflow-auto pt-2 px-4 pb-6">
            {invitationsLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Card key={i} className="h-[220px]  flex flex-col animate-pulse">
                    <CardHeader className="pb-2">
                      <div className="h-5 w-3/4 bg-muted rounded mb-2"></div>
                      <div className="h-4 w-1/2 bg-muted rounded"></div>
                    </CardHeader>
                    <CardContent className="py-2 flex-grow">
                      <div className="space-y-4">
                        <div className="flex justify-between items-center">
                          <div className="h-4 w-1/4 bg-muted rounded"></div>
                          <div className="h-6 w-1/3 bg-muted rounded"></div>
                        </div>
                        <div className="flex justify-between items-center">
                          <div className="h-4 w-1/4 bg-muted rounded"></div>
                          <div className="h-4 w-1/3 bg-muted rounded"></div>
                        </div>
                        <div className="flex justify-between items-center">
                          <div className="h-4 w-1/4 bg-muted rounded"></div>
                          <div className="h-4 w-1/3 bg-muted rounded"></div>
                        </div>
                      </div>
                    </CardContent>
                    <CardFooter className="grid grid-cols-2 gap-2 pt-2">
                      <div className="h-8 bg-muted rounded"></div>
                      <div className="h-8 bg-muted rounded"></div>
                    </CardFooter>
                  </Card>
                ))}
              </div>
            ) : invitationsError ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-10">
                  <XCircle className="h-10 w-10 text-destructive mb-4" />
                  <h3 className="text-lg font-medium">Erro ao carregar convites</h3>
                  <p className="text-muted-foreground mt-1">{invitationsError}</p>
                  <Button 
                    variant="outline" 
                    className="mt-4 border-primary/20 hover:border-primary/30" 
                    onClick={() => fetchInvitations()}
                  >
                    Tentar novamente
                  </Button>
                </CardContent>
              </Card>
            ) : filteredInvitations.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-10">
                  <h3 className="text-lg font-medium">Nenhum convite encontrado</h3>
                  <p className="text-muted-foreground mt-1">
                    {invitationsStatusFilter !== "all" || invitationsRoleFilter !== "all"
                      ? "Tente alterar os filtros de busca"
                      : "Crie um novo convite usando o botão \"Novo Convite\""}
                  </p>
                  <Button 
                    onClick={handleOpenInviteForm}
                    className="mt-6 gap-1.5 bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90"
                  >
                    <UserPlusIcon className="h-4 w-4" />
                    <span>Novo Convite</span>
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <AnimatePresence mode="wait">
                {invitationsViewMode === 'card' ? (
                  <motion.div
                    key="card-view"
                    variants={containerVariants}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
                  >
                    {filteredInvitations.length > 0 ? (
                      filteredInvitations.map((invitation, index) => (
                        <InvitationCard
                          key={invitation.id}
                          invitation={invitation}
                          index={index}
                          formatDate={formatDate}
                          onEdit={handleEditInvitation}
                          onDelete={setConfirmDelete}
                          onResend={handleResendInvitation}
                          getStatusBadgeVariant={getStatusBadgeVariant}
                          getStatusLabel={getStatusLabel}
                          getStatusIcon={getStatusIcon}
                          roleOptions={roleOptions}
                        />
                      ))
                    ) : (
                      <div className="col-span-full text-center py-10 text-muted-foreground">
                        Nenhum convite encontrado com os filtros aplicados.
                      </div>
                    )}
                  </motion.div>
                ) : (
                  <motion.div
                    key="table-view"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <InvitationTable 
                      invitations={filteredInvitations}
                      loading={invitationsLoading}
                      error={invitationsError}
                      onEdit={handleEditInvitation}
                      onDelete={setConfirmDelete}
                      formatDate={formatDate}
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            )}
          </CardContent>
        </Card>
      </div>
      
      {/* Dialog for new invitation */}
      <Dialog open={dialogOpen} onOpenChange={(open) => {
        if (!open) {
          closeDialog();
        } else {
          // If we're opening and there's no editing invitation, ensure form is clean
          if (!editingInvitation) {
            form.reset({
              email: "",
              name: "",
              role: Role.CUSTOMER,
              message: "",
              resend: false,
              revoke: false,
            });
          }
        }
        setDialogOpen(open);
      }}>
        <DialogContent className="sm:max-w-[500px] p-0 overflow-hidden bg-card">
          <DialogHeader className="px-6 pt-6 pb-2">
            <DialogTitle className="text-xl flex items-center">
              <UserPlusIcon className="mr-2 h-5 w-5 text-primary" />
              {editingInvitation ? 'Editar Convite' : 'Enviar Novo Convite'}
            </DialogTitle>
            <DialogDescription>
              {editingInvitation 
                ? 'Edite os detalhes do convite existente' 
                : 'Convide novos usuários para acessar a plataforma'}
            </DialogDescription>
          </DialogHeader>
          
          <div className="px-6 py-4">
            <Form {...form}>
              <form id="invitation-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="email@exemplo.com" 
                          {...field} 
                          className="border-primary/20 focus:border-primary"
                        />
                      </FormControl>
                      <FormDescription>
                        O email onde o convite será enviado
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome (opcional)</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Nome do usuário" 
                          {...field} 
                          className="border-primary/20 focus:border-primary"
                        />
                      </FormControl>
                      <FormDescription>
                        O nome do usuário que receberá o convite
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="role"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Papel no Sistema</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger className="border-primary/20 focus:border-primary">
                            <SelectValue placeholder="Selecione um papel" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {roleOptions.map((role) => (
                            <SelectItem key={role.value} value={role.value}>
                              {role.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        O papel determina as permissões do usuário no sistema
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="message"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Mensagem Personalizada (opcional)</FormLabel>
                      <FormControl>
                        <textarea 
                          placeholder="Olá, estamos convidando você para participar..." 
                          className="w-full min-h-[100px] rounded-md border border-primary/20 focus:border-primary p-2"
                          {...field} 
                        />
                      </FormControl>
                      <FormDescription>
                        Mensagem personalizada para incluir no email de convite
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Resend option (only when editing) */}
                {editingInvitation && (
                  <>
                    <FormField
                      control={form.control}
                      name="resend"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border border-primary/20 p-4">
                          <FormControl>
                            <input
                              type="checkbox"
                              checked={field.value}
                              onChange={field.onChange}
                              className="h-4 w-4 mt-1 rounded border-primary/40 text-primary focus:ring-primary"
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel>Reenviar convite</FormLabel>
                            <FormDescription>
                              Quando marcado, o convite será reenviado ao destinatário com as alterações
                            </FormDescription>
                          </div>
                        </FormItem>
                      )}
                    />

                    {editingInvitation.status === "PENDING" && (
                      <FormField
                        control={form.control}
                        name="revoke"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border border-destructive/20 p-4 bg-destructive/5">
                            <FormControl>
                              <input
                                type="checkbox"
                                checked={field.value}
                                onChange={(e) => {
                                  field.onChange(e);
                                  if (e.target.checked) {
                                    form.setValue('resend', false);
                                  }
                                }}
                                className="h-4 w-4 mt-1 rounded border-destructive/40 text-destructive focus:ring-destructive"
                              />
                            </FormControl>
                            <div className="space-y-1 leading-none">
                              <FormLabel className="text-destructive">Revogar convite</FormLabel>
                              <FormDescription>
                                Quando marcado, o convite será revogado e o usuário não poderá mais se registrar com este convite
                              </FormDescription>
                            </div>
                          </FormItem>
                        )}
                      />
                    )}
                  </>
                )}
              </form>
            </Form>
          </div>
          
          <DialogFooter className="px-6 py-4 bg-muted/30">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => setDialogOpen(false)}
              className="border-primary/20 hover:border-primary/30"
            >
              Cancelar
            </Button>
            <Button 
              type="submit"
              form="invitation-form"
              disabled={sending}
              className="bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 transition-all duration-300"
            >
              {sending ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  {editingInvitation ? 'Salvando...' : 'Enviando...'}
                </>
              ) : (
                <>
                  <SendIcon className="mr-2 h-4 w-4" />
                  {editingInvitation ? 'Salvar Convite' : 'Enviar Convite'}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Celebration effect displayed when an invitation is successfully sent */}
      <CelebrationEffect show={showCelebration} />
      
      {/* Confirmation dialog for deletion */}
      <ConfirmAlert
        isOpen={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        onConfirm={handleDeleteInvitation}
        title="Excluir Convite"
        description={`Tem certeza que deseja excluir permanentemente o convite para ${confirmDelete?.email || ''}? Esta ação não pode ser desfeita.`}
        confirmText="Excluir"
        cancelText="Cancelar"
        variant="destructive"
        isProcessing={isProcessing}
      />
    </>
  );
}

// Celebration effect component
const CelebrationEffect = ({ show }: { show: boolean }) => {
  return (
    <AnimatePresence>
      {show && (
        <div className="fixed inset-0 z-50 pointer-events-none overflow-hidden">
          {Array.from({ length: 30 }).map((_, i) => (
            <motion.div
              key={i}
              className="absolute"
              initial={{
                top: "50%",
                left: "50%",
                scale: 0,
                opacity: 0,
              }}
              animate={{
                top: `${Math.random() * 100}%`,
                left: `${Math.random() * 100}%`,
                scale: 1,
                opacity: [0, 1, 0],
                rotate: 360,
              }}
              exit={{ opacity: 0, scale: 0 }}
              transition={{
                duration: 3,
                ease: "easeOut",
                times: [0, 0.3, 1],
                delay: i * 0.05,
              }}
            >
              <div 
                className="h-6 w-6 rounded-full bg-gradient-to-r from-yellow-400 to-yellow-300 shadow-md"
                style={{
                  boxShadow: "0 0 10px 2px rgba(251, 191, 36, 0.3)"
                }}
              >
                <div className="flex items-center justify-center h-full text-yellow-800 font-bold text-xs">
                  $
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </AnimatePresence>
  );
}; 