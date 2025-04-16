"use client"

import { useState } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/components/ui/use-toast"
import { useDistributorStore } from "@/store/distributorStore"
import { Loader2 } from "lucide-react"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"

// Schema de validação com Zod
const distributorFormSchema = z.object({
  name: z.string().min(3, {
    message: "O nome deve ter pelo menos 3 caracteres.",
  }),
  code: z.string().optional(),
  pricePerKwh: z.string().refine(
    (val) => {
      const num = parseFloat(val.replace(",", "."))
      return !isNaN(num) && num > 0
    },
    {
      message: "O preço deve ser um número positivo.",
    }
  ),
  street: z.string().optional(),
  number: z.string().optional(),
  complement: z.string().optional(),
  neighborhood: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional().refine(
    (val) => !val || val.length === 2,
    {
      message: "O estado deve ter 2 caracteres (ex: SP).",
    }
  ),
  zipCode: z.string().optional(),
})

type DistributorFormValues = z.infer<typeof distributorFormSchema>

interface AddDistributorFormProps {
  onSuccess?: () => void
}

export function AddDistributorForm({ onSuccess }: AddDistributorFormProps) {
  const { createDistributor } = useDistributorStore()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { toast } = useToast()

  const form = useForm<DistributorFormValues>({
    resolver: zodResolver(distributorFormSchema),
    defaultValues: {
      name: "",
      code: "",
      pricePerKwh: "",
      street: "",
      number: "",
      complement: "",
      neighborhood: "",
      city: "",
      state: "",
      zipCode: "",
    },
  })

  const onSubmit = async (data: DistributorFormValues) => {
    setIsSubmitting(true)
    
    try {
      // Preparar dados para o formato esperado pela API
      const distributorData = {
        name: data.name,
        code: data.code || "",
        pricePerKwh: parseFloat(data.pricePerKwh.replace(",", ".")),
        address: {
          street: data.street || "",
          number: data.number || "",
          complement: data.complement || "",
          neighborhood: data.neighborhood || "",
          city: data.city || "",
          state: data.state || "",
          zipCode: data.zipCode || "",
          country: "Brasil", // Valor padrão
        },
      }
      
      await createDistributor(distributorData)
      
      toast({
        title: "Distribuidora criada com sucesso",
        description: `A distribuidora ${data.name} foi adicionada ao sistema.`,
      })
      
      form.reset()
      if (onSuccess) onSuccess()
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Erro desconhecido"
      toast({
        title: "Erro ao criar distribuidora",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome da Distribuidora *</FormLabel>
                  <FormControl>
                    <Input placeholder="CEMIG" {...field} />
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
                    <Input placeholder="CEM001" {...field} />
                  </FormControl>
                  <FormDescription>
                    Código interno da distribuidora (opcional)
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
                <FormLabel>Preço do kWh (R$) *</FormLabel>
                <FormControl>
                  <Input placeholder="0,89" {...field} />
                </FormControl>
                <FormDescription>
                  Preço cobrado por kWh (use vírgula ou ponto como separador decimal)
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="pt-4 border-t">
            <h3 className="text-lg font-medium mb-2">Endereço da Sede</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="street"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Rua</FormLabel>
                    <FormControl>
                      <Input placeholder="Av. Barbacena" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="grid grid-cols-2 gap-2">
                <FormField
                  control={form.control}
                  name="number"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Número</FormLabel>
                      <FormControl>
                        <Input placeholder="1200" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="complement"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Complemento</FormLabel>
                      <FormControl>
                        <Input placeholder="Andar 12" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
              <FormField
                control={form.control}
                name="neighborhood"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Bairro</FormLabel>
                    <FormControl>
                      <Input placeholder="Santo Agostinho" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="city"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cidade</FormLabel>
                    <FormControl>
                      <Input placeholder="Belo Horizonte" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="grid grid-cols-2 gap-2">
                <FormField
                  control={form.control}
                  name="state"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>UF</FormLabel>
                      <FormControl>
                        <Input placeholder="MG" maxLength={2} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="zipCode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>CEP</FormLabel>
                      <FormControl>
                        <Input placeholder="30190-131" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>
          </div>
        </div>
        
        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => form.reset()}
            disabled={isSubmitting}
          >
            Cancelar
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Salvando...
              </>
            ) : (
              "Salvar Distribuidora"
            )}
          </Button>
        </div>
      </form>
    </Form>
  )
} 