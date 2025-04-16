// src/components/features/perfil/UserProfile.tsx

"use client";

import { useState, useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useAuthStore } from "@/store/authStore";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/components/ui/use-toast";
import { Icons } from "@/components/icons";
import { frontendLog as log } from '@/lib/logs/logger';

// Schema for profile update
const profileSchema = z.object({
  fullName: z.string().min(3, "Nome deve ter pelo menos 3 caracteres").optional(),
  phoneNumber: z.string().min(10, "Telefone deve ter pelo menos 10 dígitos").optional(),
  avatarUrl: z.string().url("URL inválida").optional(),
  // Documents - Allow update but might trigger support later
  cpf: z.string().regex(/^\d{11}$/, "CPF deve ter 11 dígitos").optional(),
  cnpj: z.string().regex(/^\d{14}$/, "CNPJ deve ter 14 dígitos").optional(),
  rg: z.string().optional(),
  // Address
  postalCode: z.string().optional(),
  street: z.string().optional(),
  number: z.string().optional(),
  complement: z.string().optional(),
  neighborhood: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  // Email - Allow update but might trigger support later
  email: z.string().email("Email inválido").optional(),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

// Define a custom User type that includes potential profile fields
interface ExtendedUser {
  id?: string;
  name?: string;
  email?: string;
  avatarUrl?: string;
  profileCompleted?: boolean;
  document?: {
    cpf?: string | null;
    cnpj?: string | null;
    rg?: string | null;
  } | null;
  address?: {
    zip?: string | null;
    street?: string | null;
    number?: string | null;
    complement?: string | null;
    neighborhood?: string | null;
    city?: string | null;
    state?: string | null;
  } | null;
  contact?: {
    phones?: string[] | null;
    emails?: string[] | null;
  } | null;
  [key: string]: any; // Allow any other properties
}

export function UserProfile() {
  const { user, updateProfile, token } = useAuthStore();
  const [isLoading, setIsLoading] = useState(false);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string>("");
  const [activeTab, setActiveTab] = useState<string>("personal");
  const { toast } = useToast();

  // Cast user to ExtendedUser
  const extendedUser = user as ExtendedUser | null;

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      fullName: "",
      phoneNumber: "",
      avatarUrl: "",
      cpf: "",
      cnpj: "",
      rg: "",
      postalCode: "",
      street: "",
      number: "",
      complement: "",
      neighborhood: "",
      city: "",
      state: "",
      email: "",
    }
  });

  // Populate form with user data when available
  useEffect(() => {
    if (extendedUser) {
      log.debug('Populating profile form with user data', { userId: extendedUser.id });
      
      // Handle both possible field names for profile image
      const profileImage = extendedUser.avatarUrl || extendedUser.profileImageUrl || extendedUser.image || "";
      
      form.reset({
        fullName: extendedUser.name || "",
        phoneNumber: extendedUser.contact?.phones?.[0] || "", // Assuming first phone is primary
        avatarUrl: profileImage,
        cpf: extendedUser.document?.cpf || "",
        cnpj: extendedUser.document?.cnpj || "",
        rg: extendedUser.document?.rg || "",
        postalCode: extendedUser.address?.zip || "",
        street: extendedUser.address?.street || "",
        number: extendedUser.address?.number || "",
        complement: extendedUser.address?.complement || "",
        neighborhood: extendedUser.address?.neighborhood || "",
        city: extendedUser.address?.city || "",
        state: extendedUser.address?.state || "",
        email: extendedUser.email || "",
      });
      setAvatarPreview(profileImage);
    } else {
      log.warn('UserProfile: No user data available to populate form.');
      // Optionally redirect or show an error if no user is found after a delay
    }
  }, [user, form]); // Rerun when user object changes

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      // Basic validation (can be expanded)
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
          toast({ title: "Erro", description: "Imagem muito grande (máx 5MB).", variant: "destructive" });
          return;
      }
      if (!file.type.startsWith("image/")) {
          toast({ title: "Erro", description: "Arquivo inválido. Selecione uma imagem.", variant: "destructive" });
          return;
      }

      setAvatarFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result as string);
        log.debug('Avatar preview generated');
      };
      reader.onerror = () => {
        log.error('Failed to read avatar file');
        toast({ title: "Erro", description: "Não foi possível carregar a imagem.", variant: "destructive" });
      };
      reader.readAsDataURL(file);
    }
  };

  const onSubmit = async (formData: ProfileFormValues) => {
    if (!extendedUser) {
        toast({ title: "Erro", description: "Usuário não autenticado.", variant: "destructive" });
        return;
    }

    const originalEmail = extendedUser.email;
    const originalCpf = extendedUser.document?.cpf;
    const sensitiveChanges: string[] = [];

    if (formData.email && formData.email !== originalEmail) {
        sensitiveChanges.push("email");
    }
    if (formData.cpf && formData.cpf !== originalCpf) {
        sensitiveChanges.push("CPF");
    }
    // Add password change check here if implementing password change

    if (sensitiveChanges.length > 0) {
        log.warn('Sensitive data change requested', { userId: extendedUser.id, fields: sensitiveChanges });
        toast({
            title: "Alteração de Dados Sensíveis",
            description: `Para alterar ${sensitiveChanges.join(' e ')}, por favor, entre em contato com o suporte. Por segurança, esta alteração requer verificação adicional.`,
            variant: "warning",
            duration: 10000,
        });
        // Reset sensitive fields in the form to original values or disable submission
        form.resetField("email");
        form.resetField("cpf");
        // Potentially return here to prevent the API call for other fields until support resolves sensitive ones
        // return;
    }

    // Filter out sensitive fields before sending if they haven't changed or if we are blocking the update
    const dataToSend: Partial<ProfileFormValues> & { phones?: { phone: string; isPrimary: boolean }[] } = { ...formData };
    if (sensitiveChanges.includes("email")) delete dataToSend.email;
    if (sensitiveChanges.includes("cpf")) delete dataToSend.cpf;

    // Reconstruct phone data if provided
    if(formData.phoneNumber) {
        dataToSend.phones = [{ phone: formData.phoneNumber, isPrimary: true }];
    }
    delete dataToSend.phoneNumber; // Remove the original field


    try {
      log.info('Profile update form submitted', { userId: extendedUser.id });
      setIsLoading(true);

      // Add avatar logic if needed (e.g., upload file, get URL)
      // For now, just using the preview/existing URL
      dataToSend.avatarUrl = avatarPreview || formData.avatarUrl;

      // API call to update profile (adjust endpoint if necessary)
      const response = await fetch('/api/auth/update-profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : '',
        },
        body: JSON.stringify(dataToSend),
      });

      const responseData = await response.json();
      log.debug('Profile update API response', { status: response.status, success: response.ok });

      if (!response.ok) {
        throw new Error(responseData.message || 'Erro ao atualizar perfil');
      }

      // Update local store with potentially updated user data from response
      const updatedUserData = responseData.user || {};
      const userUpdate: Partial<ExtendedUser> = {
          name: updatedUserData.name || formData.fullName,
          avatarUrl: dataToSend.avatarUrl,
          profileImageUrl: dataToSend.avatarUrl, // Add this field for compatibility with User interface
          email: updatedUserData.email, // Use email from response if API returns it (though we block sensitive changes for now)
          document: updatedUserData.document,
          address: updatedUserData.address,
          contact: updatedUserData.contact,
          profileCompleted: updatedUserData.profileCompleted,
      };

      log.info('Updating user profile in store', { userId: extendedUser.id });
      updateProfile(userUpdate as any); // Update Zustand store

      toast({
        title: "Perfil atualizado",
        description: "Suas informações foram atualizadas com sucesso.",
      });
      // No redirect needed, stay on the profile page
    } catch (error) {
      log.error('Error updating profile', { userId: extendedUser.id, error: error instanceof Error ? error.message : 'Unknown error' });
      toast({
        title: "Erro",
        description: "Ocorreu um erro ao atualizar seu perfil. Tente novamente.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (!extendedUser) {
    // Show loading state or a message if user data is not yet available
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <Icons.spinner className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  log.debug('Rendering UserProfile component', { userId: extendedUser.id, activeTab });

  return (
    <Card className="w-full shadow-lg border-primary/20">
      <CardHeader className="pb-4">
        <CardTitle className="text-2xl">Meu Perfil</CardTitle>
        <CardDescription>
          Atualize suas informações pessoais, de contato e endereço.
        </CardDescription>
      </CardHeader>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="px-6 pt-2">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="personal">Pessoal</TabsTrigger>
            <TabsTrigger value="contact">Contato</TabsTrigger>
            <TabsTrigger value="address">Endereço</TabsTrigger>
          </TabsList>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <CardContent className="p-6">
              {/* Personal Info Tab */}
              <TabsContent value="personal" className="space-y-6 mt-0">
                <div className="flex items-center gap-6">
                  <Avatar className="h-24 w-24 ring-2 ring-primary/30">
                    <AvatarImage src={avatarPreview || ""} alt={extendedUser.name || "Avatar"} />
                    <AvatarFallback className="text-3xl bg-muted">
                      {extendedUser.name ? extendedUser.name[0].toUpperCase() : extendedUser.email ? extendedUser.email[0].toUpperCase() : '?'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <FormLabel htmlFor="avatar" className="cursor-pointer text-sm font-medium text-primary hover:underline">
                      Alterar foto de perfil
                      <span className="block text-xs text-muted-foreground mt-1">Clique para selecionar (JPG, PNG, max 5MB)</span>
                    </FormLabel>
                    <Input
                      id="avatar"
                      type="file"
                      accept="image/jpeg, image/png"
                      className="hidden"
                      onChange={handleAvatarChange}
                    />
                    {/* Hidden field to store the URL if needed */}
                    <FormField control={form.control} name="avatarUrl" render={({ field }) => <Input type="hidden" {...field} />} />
                  </div>
                </div>

                <Separator />

                <FormField
                  control={form.control}
                  name="fullName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome completo</FormLabel>
                      <FormControl>
                        <Input placeholder="Seu nome completo" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="cpf"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>CPF</FormLabel>
                        <FormControl>
                          <Input placeholder="000.000.000-00" {...field} />
                        </FormControl>
                         <FormDescription className="text-xs text-amber-600">Alteração requer contato com suporte.</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                   <FormField
                    control={form.control}
                    name="rg"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>RG</FormLabel>
                        <FormControl>
                          <Input placeholder="0000000" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="cnpj"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>CNPJ (se aplicável)</FormLabel>
                      <FormControl>
                        <Input placeholder="00.000.000/0000-00" {...field} />
                      </FormControl>
                       {/*<FormDescription className="text-xs text-amber-600">Alteração requer contato com suporte.</FormDescription>*/}
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </TabsContent>

              {/* Contact Info Tab */}
               <TabsContent value="contact" className="space-y-6 mt-0">
                 <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email Principal</FormLabel>
                        <FormControl>
                          <Input type="email" placeholder="seu@email.com" {...field} />
                        </FormControl>
                        <FormDescription className="text-xs text-amber-600">Alteração requer contato com suporte.</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="phoneNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Telefone Principal</FormLabel>
                        <FormControl>
                          <Input type="tel" placeholder="(00) 00000-0000" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  {/* Add fields for secondary emails/phones if needed */}
               </TabsContent>


              {/* Address Tab */}
              <TabsContent value="address" className="space-y-6 mt-0">
                <FormField
                  control={form.control}
                  name="postalCode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>CEP</FormLabel>
                      <FormControl>
                        <Input placeholder="00000-000" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="street"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Rua</FormLabel>
                      <FormControl>
                        <Input placeholder="Nome da rua" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="number"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Número</FormLabel>
                        <FormControl>
                          <Input placeholder="123" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="complement"
                    render={({ field }) => (
                      <FormItem className="sm:col-span-2">
                        <FormLabel>Complemento</FormLabel>
                        <FormControl>
                          <Input placeholder="Apto, Bloco, etc." {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={form.control}
                  name="neighborhood"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Bairro</FormLabel>
                      <FormControl>
                        <Input placeholder="Nome do bairro" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="city"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Cidade</FormLabel>
                        <FormControl>
                          <Input placeholder="Cidade" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="state"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Estado</FormLabel>
                        <FormControl>
                          <Input placeholder="UF" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </TabsContent>
            </CardContent>

            <CardFooter className="flex justify-end border-t p-6">
              <Button type="submit" disabled={isLoading} className="bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 shadow-md">
                {isLoading ? (
                    <>
                        <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
                        Salvando...
                    </>
                 ) : (
                    "Salvar Alterações"
                 )}
              </Button>
            </CardFooter>
          </form>
        </Form>
      </Tabs>
    </Card>
  );
} 