"use client"

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Mail, Phone } from "lucide-react";
import { toast } from "sonner";
import { Invoice } from "@/types/invoice";
import { InvoiceData } from "@/lib/models/energy-data";
import { createLogger } from "@/lib/utils/logger";

const logger = createLogger("SendInvoiceDialog");

interface SendInvoiceDialogProps {
  invoice: Invoice | InvoiceData;
  pdfBase64?: string;
  customerEmail?: string;
  customerPhone?: string;
  children?: React.ReactNode;
}

export function SendInvoiceDialog({
  invoice,
  pdfBase64,
  customerEmail = "",
  customerPhone = "",
  children
}: React.PropsWithChildren<SendInvoiceDialogProps>) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState(customerEmail);
  const [phone, setPhone] = useState(customerPhone);
  const [isSending, setIsSending] = useState(false);
  const [activeTab, setActiveTab] = useState<string>(customerEmail ? "email" : "whatsapp");

  const invoiceId = 'id' in invoice ? invoice.id : '';
  const invoiceNumber = 'invoiceNumber' in invoice ? invoice.invoiceNumber : '';

  const handleSendEmail = async () => {
    if (!email) {
      toast.error("Por favor, insira um email válido");
      return;
    }

    setIsSending(true);
    try {
      // Se não temos o PDF em base64 ainda, precisamos gerar
      let pdfData = pdfBase64;
      if (!pdfData) {
        const response = await fetch(`/api/invoices/${invoiceId}/generate-pdf`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
        });
        
        if (!response.ok) {
          throw new Error('Falha ao gerar PDF');
        }
        
        const data = await response.json();
        pdfData = data.pdfBase64;
      }

      // Enviar email com PDF
      const sendResponse = await fetch(`/api/invoices/${invoiceId}/send-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          pdfBase64: pdfData,
          invoiceNumber
        }),
      });

      if (!sendResponse.ok) {
        throw new Error('Falha ao enviar email');
      }

      toast.success(`Fatura enviada para ${email}`);
      setOpen(false);
    } catch (error) {
      logger.error("Erro ao enviar email", { error });
      toast.error("Erro ao enviar email. Tente novamente.");
    } finally {
      setIsSending(false);
    }
  };

  const handleSendWhatsApp = async () => {
    if (!phone) {
      toast.error("Por favor, insira um número de WhatsApp válido");
      return;
    }

    // Formatar número de telefone (remover caracteres não numéricos)
    const formattedPhone = phone.replace(/\D/g, '');

    setIsSending(true);
    try {
      // Se não temos o PDF em base64 ainda, precisamos gerar
      let pdfData = pdfBase64;
      if (!pdfData) {
        const response = await fetch(`/api/invoices/${invoiceId}/generate-pdf`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
        });
        
        if (!response.ok) {
          throw new Error('Falha ao gerar PDF');
        }
        
        const data = await response.json();
        pdfData = data.pdfBase64;
      }

      // Enviar WhatsApp com PDF
      const sendResponse = await fetch(`/api/invoices/${invoiceId}/send-whatsapp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phone: formattedPhone,
          pdfBase64: pdfData,
          invoiceNumber
        }),
      });

      if (!sendResponse.ok) {
        throw new Error('Falha ao enviar WhatsApp');
      }

      toast.success(`Fatura enviada para WhatsApp ${phone}`);
      setOpen(false);
    } catch (error) {
      logger.error("Erro ao enviar WhatsApp", { error });
      toast.error("Erro ao enviar WhatsApp. Tente novamente.");
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Enviar Fatura</DialogTitle>
          <DialogDescription>
            Envie a fatura {invoiceNumber} diretamente para o cliente.
          </DialogDescription>
        </DialogHeader>
        
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full mt-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="email">Email</TabsTrigger>
            <TabsTrigger value="whatsapp">WhatsApp</TabsTrigger>
          </TabsList>
          
          <TabsContent value="email" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="email">Endereço de Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="cliente@exemplo.com"
              />
            </div>
            
            <DialogFooter>
              <Button 
                onClick={handleSendEmail} 
                disabled={isSending || !email}
                className="w-full"
              >
                {isSending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Enviando...
                  </>
                ) : (
                  <>
                    <Mail className="mr-2 h-4 w-4" />
                    Enviar Email
                  </>
                )}
              </Button>
            </DialogFooter>
          </TabsContent>
          
          <TabsContent value="whatsapp" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="phone">Número de WhatsApp</Label>
              <Input
                id="phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="(31) 99999-9999"
              />
              <p className="text-xs text-muted-foreground">
                Inclua o DDD. Exemplo: (31) 99999-9999
              </p>
            </div>
            
            <DialogFooter>
              <Button 
                onClick={handleSendWhatsApp} 
                disabled={isSending || !phone}
                className="w-full"
              >
                {isSending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Enviando...
                  </>
                ) : (
                  <>
                    <Phone className="mr-2 h-4 w-4" />
                    Enviar WhatsApp
                  </>
                )}
              </Button>
            </DialogFooter>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
} 