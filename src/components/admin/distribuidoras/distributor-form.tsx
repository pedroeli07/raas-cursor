"use client"

import { useEffect, useState } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { useRouter } from "next/navigation"
import { useToast } from "@/components/ui/use-toast"
import { Button } from "@/components/ui/button"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Distributor, useDistributorStore } from "@/store/distributorStore"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import { statesOfBrazil } from "@/lib/constants/states-brazil"
import { BrazilStatesSelect } from "@/components/custom/brazil-states-select"

// Schema de validação para o formulário
const distributorFormSchema = z.object({
  name: z
    .string()
    .min(3, { message: "O nome deve ter pelo menos 3 caracteres." })
    .max(100, { message: "O nome não pode exceder 100 caracteres." }),
  code: z
    .string()
    .min(2, { message: "O código deve ter pelo menos 2 caracteres." })
    .max(20, { message: "O código não pode exceder 20 caracteres." }),
  pricePerKwh: z
    .string()
    .refine((value) => !isNaN(parseFloat(value.replace(",", "."))), {
      message: "O preço deve ser um número válido.",
    }),
  address: z.object({
    street: z
      .string()
      .min(3, { message: "A rua deve ter pelo menos 3 caracteres." })
      .max(100, { message: "A rua não pode exceder 100 caracteres." }),
    number: z
      .string()
      .min(1, { message: "O número é obrigatório." })
      .max(10, { message: "O número não pode exceder 10 caracteres." }),
    complement: z
      .string()
      .max(100, { message: "O complemento não pode exceder 100 caracteres." })
      .optional(),
    neighborhood: z
      .string()
      .min(2, { message: "O bairro deve ter pelo menos 2 caracteres." })
      .max(100, { message: "O bairro não pode exceder 100 caracteres." }),
    city: z
      .string()
      .min(2, { message: "A cidade deve ter pelo menos 2 caracteres." })
      .max(100, { message: "A cidade não pode exceder 100 caracteres." }),
    state: z
      .string()
      .min(2, { message: "O estado deve ter pelo menos 2 caracteres." })
      .max(2, { message: "O estado deve ter exatamente 2 caracteres." }),
    zipCode: z
      .string()
      .min(8, { message: "O CEP deve ter pelo menos 8 caracteres." })
      .max(9, { message: "O CEP não pode exceder 9 caracteres." }),
  }),
  contactInfo: z.object({
    email: z
      .string()
      .email({ message: "Formato de e-mail inválido." })
      .min(5, { message: "O e-mail deve ter pelo menos 5 caracteres." })
      .max(100, { message: "O e-mail não pode exceder 100 caracteres." }),
    phone: z
      .string()
      .min(10, { message: "O telefone deve ter pelo menos 10 caracteres." })
      .max(15, { message: "O telefone não pode exceder 15 caracteres." }),
    website: z
      .string()
      .url({ message: "URL do website inválida." })
      .max(100, { message: "O website não pode exceder 100 caracteres." })
      .optional(),
  }),
})

type DistributorFormValues = z.infer<typeof distributorFormSchema>

interface DistributorFormProps {
  distributorId?: string
  onSuccess?: () => void
}

export function DistributorForm({ distributorId, onSuccess }: DistributorFormProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  const { 
    distributors, 
    isLoading, 
    fetchDistributorById, 
    createDistributor, 
    updateDistributor 
  } = useDistributorStore()

  const [loadingDistributor, setLoadingDistributor] = useState(
    distributorId ? true : false
  )
  const [distributor, setDistributor] = useState<Distributor | null>(null)

  const isEditMode = !!distributorId

  // Formulário com validação
  const form = useForm<DistributorFormValues>({
    resolver: zodResolver(distributorFormSchema),
    defaultValues: {
      name: "",
      code: "",
      pricePerKwh: "",
      address: {
        street: "",
        number: "",
        complement: "",
        neighborhood: "",
        city: "",
        state: "",
        zipCode: "",
      },
      contactInfo: {
        email: "",
        phone: "",
        website: "",
      },
    },
    mode: "onChange",
  })

  // Buscar distribuidora se estiver em modo de edição
  useEffect(() => {
    const loadDistributor = async () => {
      if (distributorId) {
        try {
          setLoadingDistributor(true)
          const data = await fetchDistributorById(distributorId)
          
          if (data) {
            setDistributor(data)
            
            // Preencher o formulário com os dados existentes
            form.reset({
              name: data.name || "",
              code: data.code || "",
              pricePerKwh: data.pricePerKwh ? data.pricePerKwh.toString().replace(".", ",") : "",
              address: {
                street: data.address?.street || "",
                number: data.address?.number || "",
                complement: data.address?.complement || "",
                neighborhood: data.address?.neighborhood || "",
                city: data.address?.city || "",
                state: data.address?.state || "",
                zipCode: data.address?.zipCode || "",
              },
              contactInfo: {
                email: data.contactInfo?.email || "",
                phone: data.contactInfo?.phone || "",
                website: data.contactInfo?.website || "",
              },
            })
          } else {
            toast({
              title: "Erro",
              description: "Distribuidora não encontrada",
              variant: "destructive",
            })
            router.push("/admin/distribuidoras")
          }
        } catch (error) {
          console.error("Erro ao carregar distribuidora:", error)
          toast({
            title: "Erro",
            description: "Não foi possível carregar os dados da distribuidora",
            variant: "destructive",
          })
        } finally {
          setLoadingDistributor(false)
        }
      }
    }

    loadDistributor()
  }, [distributorId, fetchDistributorById, form, router, toast])

  const onSubmit = async (values: DistributorFormValues) => {
    if (isSubmitting) return

    setIsSubmitting(true)

    try {
      const formattedData = {
        ...values,
        pricePerKwh: parseFloat(values.pricePerKwh.replace(",", ".")),
      }

      let result
      
      if (isEditMode && distributorId) {
        result = await updateDistributor(distributorId, formattedData)
        toast({
          title: "Sucesso",
          description: "Distribuidora atualizada com sucesso",
        })
      } else {
        result = await createDistributor(formattedData)
        toast({
          title: "Sucesso",
          description: "Distribuidora criada com sucesso",
        })
        form.reset() // Limpar formulário após criação
      }

      if (onSuccess) {
        onSuccess()
      } else if (!isEditMode) {
        router.push(`/admin/distribuidoras/${result.id}`)
      } else {
        router.push(`/admin/distribuidoras`)
      }
    } catch (error) {
      console.error("Erro ao salvar distribuidora:", error)
      toast({
        title: "Erro",
        description: isEditMode
          ? "Não foi possível atualizar a distribuidora"
          : "Não foi possível criar a distribuidora",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCancel = () => {
    if (onSuccess) {
      onSuccess()
    } else {
      router.push("/admin/distribuidoras")
    }
  }

  if (loadingDistributor) {
    return (
      <Card className="w-full">
        <CardHeader>
          <Skeleton className="h-8 w-64 mb-2" />
          <Skeleton className="h-4 w-full" />
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
          <Separator />
          <div className="space-y-4">
            <Skeleton className="h-4 w-32" />
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex justify-between">
          <Skeleton className="h-10 w-24" />
          <Skeleton className="h-10 w-24" />
        </CardFooter>
      </Card>
    )
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>
          {isEditMode ? "Editar Distribuidora" : "Nova Distribuidora"}
        </CardTitle>
      </CardHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <CardContent className="space-y-6">
            {/* Informações Básicas */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Informações Básicas</h3>
              
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome da Distribuidora</FormLabel>
                      <FormControl>
                        <Input placeholder="Ex: CEMIG" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="code"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Código</FormLabel>
                      <FormControl>
                        <Input placeholder="Ex: CEMIG01" {...field} />
                      </FormControl>
                      <FormDescription>
                        Código interno da distribuidora
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <FormField
                control={form.control}
                name="pricePerKwh"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Preço por kWh (R$)</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Ex: 0,89" 
                        {...field} 
                        onChange={(e) => {
                          // Permitir apenas números e vírgula
                          const value = e.target.value.replace(/[^0-9,]/g, "")
                          field.onChange(value)
                        }}
                      />
                    </FormControl>
                    <FormDescription>
                      Valor em reais por quilowatt-hora
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <Separator />
            
            {/* Endereço */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Endereço</h3>
              
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="address.street"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Rua/Logradouro</FormLabel>
                      <FormControl>
                        <Input placeholder="Ex: Av. Barbacena" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <div className="grid grid-cols-2 gap-2">
                  <FormField
                    control={form.control}
                    name="address.number"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Número</FormLabel>
                        <FormControl>
                          <Input placeholder="Ex: 1200" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="address.complement"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Complemento</FormLabel>
                        <FormControl>
                          <Input placeholder="Ex: 3º andar" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                <FormField
                  control={form.control}
                  name="address.neighborhood"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Bairro</FormLabel>
                      <FormControl>
                        <Input placeholder="Ex: Santo Agostinho" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="address.zipCode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>CEP</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Ex: 30190-131" 
                          {...field}
                          maxLength={9}
                          onChange={(e) => {
                            // Formatar CEP (00000-000)
                            let value = e.target.value.replace(/\D/g, "")
                            if (value.length > 5) {
                              value = value.substring(0, 5) + "-" + value.substring(5, 8)
                            }
                            field.onChange(value)
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="address.city"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Cidade</FormLabel>
                      <FormControl>
                        <Input placeholder="Ex: Belo Horizonte" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="address.state"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Estado</FormLabel>
                      <FormControl>
                        <BrazilStatesSelect
                          value={field.value}
                          onValueChange={field.onChange}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>
            
            <Separator />
            
            {/* Informações de Contato */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Informações de Contato</h3>
              
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="contactInfo.email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>E-mail</FormLabel>
                      <FormControl>
                        <Input 
                          type="email" 
                          placeholder="Ex: contato@cemig.com.br" 
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="contactInfo.phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Telefone</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Ex: (31) 3506-3900" 
                          {...field}
                          onChange={(e) => {
                            // Formatar telefone
                            let value = e.target.value.replace(/\D/g, "")
                            if (value.length > 0) {
                              value = value.replace(/^(\d{2})(\d)/g, "($1) $2")
                              if (value.length > 10) {
                                value = value.replace(/(\d)(\d{4})$/, "$1-$2")
                              } else {
                                value = value.replace(/(\d)(\d{3})$/, "$1-$2")
                              }
                            }
                            field.onChange(value)
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="contactInfo.website"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Website</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Ex: https://www.cemig.com.br" 
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>
          </CardContent>
          
          <CardFooter className="flex justify-between">
            <Button
              type="button"
              variant="outline"
              onClick={handleCancel}
            >
              Cancelar
            </Button>
            <Button 
              type="submit" 
              disabled={isSubmitting}
            >
              {isSubmitting
                ? "Salvando..."
                : isEditMode
                ? "Atualizar"
                : "Criar Distribuidora"}
            </Button>
          </CardFooter>
        </form>
      </Form>
    </Card>
  )
} 