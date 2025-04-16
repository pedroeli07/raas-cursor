"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Loader2, Download, Printer, Mail, Phone, Eye } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { 
  generatePdfFromElement, 
  downloadPdf, 
  openPdfInNewTab 
} from "@/lib/utils/pdf-generator";

interface InvoiceExportProps {
  invoiceId: string;
  invoiceNumber: string;
  customerEmail?: string;
  customerPhone?: string;
  printRef?: React.RefObject<HTMLDivElement>;
}

export function InvoiceExport({
  invoiceId,
  invoiceNumber,
  customerEmail,
  customerPhone,
  printRef,
}: InvoiceExportProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState<string | null>(null);
  const defaultRef = useRef<HTMLDivElement>(null);
  
  // Use provided printRef or fallback to default
  const elementRef = printRef || defaultRef;

  const handleGeneratePdf = async (action: "download" | "preview" | "email" | "whatsapp") => {
    try {
      // Prevent multiple operations at once
      if (loading) return;

      setLoading(action);
      
      // Check if we have an element to capture
      if (!elementRef.current) {
        throw new Error("Elemento de fatura não encontrado");
      }

      // Generate filename with invoice number
      const filename = `fatura-${invoiceNumber.replace(/\//g, "-")}.pdf`;
      
      // Generate PDF from the element
      const pdfBlob = await generatePdfFromElement(elementRef.current, filename);
      
      // Handle based on action type
      switch (action) {
        case "download":
          downloadPdf(pdfBlob, filename);
          toast({
            title: "Download iniciado",
            description: `Fatura ${invoiceNumber} pronta para download`,
          });
          break;
          
        case "preview":
          openPdfInNewTab(pdfBlob);
          toast({
            title: "Visualização aberta",
            description: "PDF aberto em nova aba",
          });
          break;
          
        case "email":
          if (!customerEmail) {
            throw new Error("Cliente não possui e-mail cadastrado");
          }
          await sendInvoiceByEmail(invoiceId, pdfBlob, customerEmail);
          toast({
            title: "E-mail enviado",
            description: `Fatura enviada para ${customerEmail}`,
          });
          break;
          
        case "whatsapp":
          if (!customerPhone) {
            throw new Error("Cliente não possui WhatsApp cadastrado");
          }
          await sendInvoiceByWhatsApp(invoiceId, pdfBlob, customerPhone);
          toast({
            title: "WhatsApp enviado",
            description: `Fatura enviada para ${customerPhone}`,
          });
          break;
      }
    } catch (error) {
      console.error("Erro ao exportar fatura:", error);
      toast({
        variant: "destructive",
        title: "Erro ao exportar fatura",
        description: error instanceof Error ? error.message : "Ocorreu um erro desconhecido",
      });
    } finally {
      setLoading(null);
    }
  };

  // Function to send invoice by email - will be implemented in API integration
  const sendInvoiceByEmail = async (
    invoiceId: string,
    pdfBlob: Blob,
    email: string
  ): Promise<void> => {
    // Convert blob to base64 for sending
    const base64 = await blobToBase64(pdfBlob);
    
    // Call API to send email
    const response = await fetch(`/api/invoices/${invoiceId}/send-email`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email,
        pdfBase64: base64,
        invoiceNumber,
      }),
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || "Falha ao enviar email");
    }
    
    return response.json();
  };

  // Function to send invoice by WhatsApp - will be implemented in API integration
  const sendInvoiceByWhatsApp = async (
    invoiceId: string,
    pdfBlob: Blob,
    phone: string
  ): Promise<void> => {
    // Convert blob to base64 for sending
    const base64 = await blobToBase64(pdfBlob);
    
    // Call API to send WhatsApp
    const response = await fetch(`/api/invoices/${invoiceId}/send-whatsapp`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        phone,
        pdfBase64: base64,
        invoiceNumber,
      }),
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || "Falha ao enviar WhatsApp");
    }
    
    return response.json();
  };

  // Helper function to convert Blob to base64
  const blobToBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        // Remove data URL prefix and return only base64 string
        const base64 = reader.result?.toString().split(",")[1];
        if (base64) {
          resolve(base64);
        } else {
          reject(new Error("Falha ao converter PDF para base64"));
        }
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  };

  return (
    <div className="flex space-x-2">
      <Button
        variant="outline"
        size="sm"
        onClick={() => handleGeneratePdf("download")}
        disabled={!!loading}
      >
        {loading === "download" ? (
          <Loader2 className="h-4 w-4 animate-spin mr-2" />
        ) : (
          <Download className="h-4 w-4 mr-2" />
        )}
        Baixar PDF
      </Button>
      
      <Button
        variant="outline"
        size="sm"
        onClick={() => handleGeneratePdf("preview")}
        disabled={!!loading}
      >
        {loading === "preview" ? (
          <Loader2 className="h-4 w-4 animate-spin mr-2" />
        ) : (
          <Eye className="h-4 w-4 mr-2" />
        )}
        Visualizar
      </Button>
      
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" disabled={!!loading}>
            {loading === "email" || loading === "whatsapp" ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Mail className="h-4 w-4 mr-2" />
            )}
            Enviar
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem
            onClick={() => handleGeneratePdf("email")}
            disabled={!customerEmail || !!loading}
            className={!customerEmail ? "opacity-50 cursor-not-allowed" : ""}
          >
            <Mail className="h-4 w-4 mr-2" />
            <span>E-mail</span>
            {!customerEmail && (
              <span className="ml-2 text-xs text-muted-foreground">
                (não disponível)
              </span>
            )}
          </DropdownMenuItem>
          
          <DropdownMenuItem
            onClick={() => handleGeneratePdf("whatsapp")}
            disabled={!customerPhone || !!loading}
            className={!customerPhone ? "opacity-50 cursor-not-allowed" : ""}
          >
            <Phone className="h-4 w-4 mr-2" />
            <span>WhatsApp</span>
            {!customerPhone && (
              <span className="ml-2 text-xs text-muted-foreground">
                (não disponível)
              </span>
            )}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
} 