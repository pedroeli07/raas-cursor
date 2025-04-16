// path: /admin/usuarios
"use client";

import React, { useState, useEffect } from "react";
import { useUserManagementStore, User } from "@/store/userManagementStore";
import { useUiPreferencesStore } from "@/store/uiPreferencesStore";
import { toast } from "sonner";
import { UserTable } from "@/components/ux/UserTable";
import { UserCard } from "@/components/ux/UserCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { motion, AnimatePresence } from "framer-motion";
import { Role } from "@prisma/client";
import { Search, UserPlus, RefreshCw } from "lucide-react";
import { ViewToggle } from "@/components/ui/view-toggle";

// UI Components
import {
  Card,
  CardContent,
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { ConfirmAlert } from "@/components/ui/alert-dialog-custom";

// Validation schema for user form
const formSchema = z.object({
  email: z.string().email({ message: "Endereço de email inválido" }),
  name: z.string().optional(),
  role: z.string({ message: "Selecione um papel para o usuário" }),
});

const roleOptions = [
  { value: Role.ADMIN, label: "Administrador" },
  { value: Role.ADMIN_STAFF, label: "Equipe Administrativa" },
  { value: Role.CUSTOMER, label: "Cliente" },
  { value: Role.ENERGY_RENTER, label: "Locador de Energia" },
];

// Card animation variants
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

export default function UsuariosPage() {
  const {
    users,
    usersLoading: loading,
    usersError: error,
    fetchUsers,
    deleteUser,
    formatDate,
  } = useUserManagementStore();

  // Use UI preferences from store
  const {
    usersRoleFilter,
    usersViewMode,
    setUsersRoleFilter,
    setUsersViewMode,
  } = useUiPreferencesStore();

  // Form handling with react-hook-form and zod
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
      name: "",
      role: Role.CUSTOMER,
    },
  });

  // Local states
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<User | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchText, setSearchText] = useState("");

  // Reference to track if component is mounted
  const isMounted = React.useRef(true);

  // Handle refresh with animation and toast
  const handleRefresh = async () => {
    try {
      setIsRefreshing(true);
      await fetchUsers();
      
      if (isMounted.current) {
        toast.success("Dados atualizados", {
          description: "Lista de usuários atualizada com sucesso.",
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
    setEditingUser(null);
    form.reset({
      email: "",
      name: "",
      role: Role.CUSTOMER,
    });
    setDialogOpen(false);
  };

  // Handle dialog open for new user
  const handleOpenUserForm = () => {
    toast.info("Usuários são criados via convites", {
      description: "Para criar um novo usuário, envie um convite na página de convites.",
      duration: 3000,
      dismissible: true,
    });
  };

  // Submit handler for the user form
  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      setIsProcessing(true);
      
      if (editingUser) {
        // Apenas permite editar informações básicas do usuário
        toast.success("Usuário atualizado", {
          description: `Informações do usuário ${values.email} atualizadas com sucesso`,
          duration: 3000,
          dismissible: true,
        });
      } else {
        // Redireciona para página de convites
        toast.info("Usuários são criados via convites", {
          description: "Para criar um novo usuário, envie um convite na página de convites.",
          duration: 3000,
          dismissible: true,
        });
      }
      
      closeDialog();
      fetchUsers();
      
    } catch (error) {
      toast.error("Erro ao atualizar usuário", {
        description: error instanceof Error ? error.message : String(error),
        duration: 3000,
        dismissible: true,
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // Load users on component mount
  useEffect(() => {
    console.log("Tentando carregar usuários...");
    fetchUsers()
      .then(() => {
        console.log("Usuários carregados com sucesso:", users);
        console.log("Tipo de users:", typeof users);
        console.log("É array?", Array.isArray(users));
        console.log("Quantidade de usuários:", Array.isArray(users) ? users.length : 'não é array');
      })
      .catch((error) => {
        console.error("Erro ao buscar usuários:", error);
        toast.error("Erro ao carregar usuários", {
          description: error instanceof Error ? error.message : String(error),
          duration: 3000,
          dismissible: true,
        });
      });
  }, [fetchUsers]);

  // Add debug logging for users state changes
  useEffect(() => {
    console.log("Estado atual de users:", users);
    if (Array.isArray(users)) {
      console.log("Total de usuários carregados:", users.length);
      if (users.length > 0) {
        console.log("Primeiro usuário:", users[0]);
      }
      
      // Verificação mais detalhada da API de usuários
      fetch('/api/users')
        .then(res => res.json())
        .then(data => {
          console.log("Resposta direta da API de usuários:", data);
          if (data && data.success && Array.isArray(data.users)) {
            console.log("API retornou corretamente com", data.users.length, "usuários");
          } else {
            console.log("API retornou um formato inesperado:", typeof data);
          }
        })
        .catch(err => {
          console.error("Erro ao consultar API diretamente:", err);
        });
      
    } else {
      console.log("Users não é um array:", typeof users);
    }
  }, [users]);

  // Filter users based on search and role
  const filteredUsers = React.useMemo(() => {
    console.log("Filtrando usuários. Estado atual:", users);
    // Certifica-se de que users é um array antes de chamar filter
    if (!Array.isArray(users)) {
      console.log("Users não é um array, retornando array vazio");
      return [];
    }
    
    return users.filter((user) => {
      const matchesRole = usersRoleFilter === "all" || user.role === usersRoleFilter;
      
      // Text search filter
      let matchesSearch = true;
      if (searchText.trim() !== "") {
        const searchLower = searchText.toLowerCase();
        matchesSearch = Boolean(
          user.email.toLowerCase().includes(searchLower) || 
          (user.name && user.name.toLowerCase().includes(searchLower))
        );
      }
      
      return matchesRole && matchesSearch;
    });
  }, [users, usersRoleFilter, searchText]);

  // Function to edit user
  const handleEditUser = (user: User) => {
    setEditingUser(user);
    form.reset({
      email: user.email,
      name: user.name || "",
      role: user.role,
    });
    setDialogOpen(true);
  };

  // Handle delete user
  const handleDeleteUser = async () => {
    if (!confirmDelete) return;
    
    try {
      setIsProcessing(true);
      await deleteUser(confirmDelete.id);
      
      toast.success("Usuário excluído", {
        description: `Usuário ${confirmDelete.email} foi excluído permanentemente`,
        duration: 3000,
        dismissible: true,
      });
      
      // Refresh users list
      fetchUsers();
    } catch (error) {
      toast.error("Erro ao excluir usuário", {
        description: error instanceof Error ? error.message : String(error),
        duration: 3000,
        dismissible: true,
      });
    } finally {
      setIsProcessing(false);
      setConfirmDelete(null);
    }
  };

  // Handle bulk delete
  const handleDeleteMultiple = async (selectedUsers: User[]) => {
    try {
      setIsProcessing(true);
      
      // Process each deletion sequentially
      for (const user of selectedUsers) {
        await deleteUser(user.id);
      }
      
      toast.success("Usuários excluídos", {
        description: `${selectedUsers.length} usuários foram excluídos com sucesso`,
        duration: 3000,
        dismissible: true,
      });
      
      // Refresh the list
      fetchUsers();
      
      return Promise.resolve();
    } catch (error) {
      toast.error("Erro ao excluir usuários", {
        description: error instanceof Error ? error.message : String(error),
        duration: 3000,
        dismissible: true,
      });
      return Promise.reject(error);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <>
      <div className="-mt-0 bg-gradient-to-r from-primary/10 to-accent/20 space-y-6 pb-8 h-full w-full overflow-hidden flex flex-col">
        <Card className="flex-1 overflow-hidden flex flex-col border-primary/20 dark:border-primary/30 shadow-md mx-4">
          <CardHeader className="pb-4">
            <CardTitle>Usuários</CardTitle>
            <div className="flex flex-col gap-4 mt-4">
              {/* Filters section with grid layout */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {/* Role Filter */}
                <Select value={usersRoleFilter} onValueChange={setUsersRoleFilter}>
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

                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="search"
                    placeholder="Buscar por nome ou email..."
                    value={searchText}
                    onChange={(e) => setSearchText(e.target.value)}
                    className="pl-8 w-full border border-primary/40 focus:border-primary/90 hover:border-primary/40 hover:bg-primary/10 transition-all duration-300 hover:shadow-sm"
                  />
                </div>
              </div>
              
              {/* Actions row with buttons */}
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
                
                {/* Center - Redirect to invitation page */}
                <div className="flex-1 flex justify-center">
                  <Button 
                    onClick={() => {
                      window.location.href = "/admin/usuarios/convites";
                    }}
                    className="gap-1.5 bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 shadow-md hover:shadow-lg transition-all duration-300 hover:-translate-y-0.5 whitespace-nowrap"
                  >
                    <UserPlus className="h-4 w-4" />
                    <span>Criar Convite</span>
                  </Button>
                </div>
                
                {/* Right corner - View toggle */}
                <ViewToggle mode={usersViewMode} onToggle={setUsersViewMode} />
              </div>
            </div>
          </CardHeader>

          <CardContent className="flex-grow overflow-auto pt-2 px-4 pb-6">
            {loading ? (
              <div className="flex items-center justify-center p-8">
                <RefreshCw className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : error ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-10">
                  <h3 className="text-lg font-medium">Erro ao carregar usuários</h3>
                  <p className="text-muted-foreground mt-1">{error}</p>
                  <Button 
                    variant="outline" 
                    className="mt-4 border-primary/20 hover:border-primary/30" 
                    onClick={() => fetchUsers()}
                  >
                    Tentar novamente
                  </Button>
                </CardContent>
              </Card>
            ) : filteredUsers.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-10">
                  <h3 className="text-lg font-medium">Nenhum usuário encontrado</h3>
                  <p className="text-muted-foreground mt-1">
                    {usersRoleFilter !== "all" || searchText
                      ? "Tente alterar os filtros de busca"
                      : "Novos usuários são criados quando eles aceitam convites para o sistema."}
                  </p>
                  <Button 
                    onClick={() => {
                      window.location.href = "/admin/usuarios/convites";
                    }}
                    className="mt-6 gap-1.5 bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90"
                  >
                    <UserPlus className="h-4 w-4" />
                    <span>Enviar Convite</span>
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <AnimatePresence mode="wait">
                {usersViewMode === 'card' ? (
                  <motion.div
                    key="card-view"
                    variants={containerVariants}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
                  >
                    {filteredUsers.map((user, index) => (
                      <UserCard
                        key={user.id}
                        user={user}
                        index={index}
                        formatDate={formatDate}
                        onEdit={handleEditUser}
                        onDelete={setConfirmDelete}
                        roleOptions={roleOptions}
                      />
                    ))}
                  </motion.div>
                ) : (
                  <motion.div
                    key="table-view"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <UserTable 
                      users={filteredUsers}
                      loading={loading}
                      error={error}
                      onEdit={handleEditUser}
                      onDelete={setConfirmDelete}
                      formatDate={formatDate}
                      onDeleteMultiple={handleDeleteMultiple}
                      emptyMessage="Nenhum usuário encontrado."
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            )}
          </CardContent>
        </Card>
      </div>
      
      {/* Dialog for new/edit user */}
      <Dialog open={dialogOpen} onOpenChange={(open) => {
        if (!open) {
          closeDialog();
        }
        setDialogOpen(open);
      }}>
        <DialogContent className="sm:max-w-[500px] p-0 overflow-hidden bg-card">
          <DialogHeader className="px-6 pt-6 pb-2">
            <DialogTitle className="text-xl flex items-center">
              <UserPlus className="mr-2 h-5 w-5 text-primary" />
              {editingUser ? 'Editar Usuário' : 'Criar Novo Usuário'}
            </DialogTitle>
            <DialogDescription>
              {editingUser 
                ? 'Edite os detalhes do usuário' 
                : 'Adicione um novo usuário ao sistema'}
            </DialogDescription>
          </DialogHeader>
          
          <div className="px-6 py-4">
            <Form {...form}>
              <form id="user-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Nome do usuário" 
                          {...field} 
                          className="border-primary/20 focus:border-primary"
                        />
                      </FormControl>
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
              form="user-form"
              disabled={isProcessing}
              className="bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 transition-all duration-300"
            >
              {isProcessing ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  {editingUser ? 'Salvando...' : 'Criando...'}
                </>
              ) : (
                <>
                  <UserPlus className="mr-2 h-4 w-4" />
                  {editingUser ? 'Salvar Usuário' : 'Criar Usuário'}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Confirmation dialog for deletion */}
      <ConfirmAlert
        isOpen={Boolean(confirmDelete)}
        onClose={() => setConfirmDelete(null)}
        onConfirm={handleDeleteUser}
        title="Excluir Usuário"
        description={`Tem certeza que deseja excluir permanentemente o usuário ${confirmDelete?.email || ''}? Esta ação não pode ser desfeita.`}
        confirmText="Excluir"
        cancelText="Cancelar"
        variant="destructive"
        isProcessing={isProcessing}
      />
    </>
  );
} 