import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { createLogger } from "@/lib/utils/logger";
import { db, prisma } from "@/lib/db/db";
import { authOptions } from "@/lib/auth-options";
import { invoices } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

// Schema validation
const whatsappRequestSchema = z.object({
  phone: z.string().min(10, "Número de telefone inválido"),
  pdfBase64: z.string(),
  invoiceNumber: z.string(),
});

const logger = createLogger("InvoiceWhatsAppSender");

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { message: "Não autorizado" },
        { status: 401 }
      );
    }

    // Validate request body
    const body = await req.json();
    const validationResult = whatsappRequestSchema.safeParse(body);
    
    if (!validationResult.success) {
      return NextResponse.json(
        { message: "Dados inválidos", errors: validationResult.error.errors },
        { status: 400 }
      );
    }
    
    const { phone, pdfBase64, invoiceNumber } = validationResult.data;

    // Get invoice details
    const invoice = await db.query.invoices.findFirst({
      where: eq(invoices.id, params.id),
    });

    if (!invoice) {
      return NextResponse.json(
        { message: "Fatura não encontrada" },
        { status: 404 }
      );
    }

    // Get customer details
    const customer = await prisma.user.findUnique({
      where: { id: invoice.userId },
    });

    // Format phone number (remove non-digits and ensure it starts with country code)
    const formattedPhone = formatPhoneNumber(phone);
    
    // Create WhatsApp message with invoice details
    const message = `Olá ${customer?.name || "Cliente"},\n\n` +
      `Sua fatura de energia solar referente ao mês ${invoice.referenceMonth} já está disponível.\n\n` +
      `Número da fatura: ${invoiceNumber}\n` +
      `Valor: R$ ${invoice.totalAmount.toFixed(2)}\n` +
      `Data de vencimento: ${new Date(invoice.dueDate).toLocaleDateString('pt-BR')}\n\n` +
      `Você economizou R$ ${invoice.totalAmount.toFixed(2)} (${invoice.discountPercentage.toFixed(0)}%) com energia solar este mês!\n\n` +
      `Em anexo está o PDF da sua fatura para seu controle.\n\n` +
      `Atenciosamente,\nEquipe RaaS Solar`;

    // Here you would integrate with a WhatsApp API service like Twilio, MessageBird, etc.
    // For now we'll simulate the integration
    // In a real application, replace this with your WhatsApp API integration code
    
    // Simulated WhatsApp API call
    // await sendWhatsAppMessage(formattedPhone, message, pdfBase64);

    // For demonstration purposes, we're just logging the action
    logger.info("WhatsApp enviado", {
      phone: formattedPhone,
      invoiceId: params.id,
      hasAttachment: pdfBase64.length > 0
    });
    
    // Update invoice status to track that WhatsApp was sent
    await db
      .update(invoices)
      .set({
        lastWhatsAppSentAt: new Date(),
        status: invoice.status === "PENDING" ? "NOTIFIED" : invoice.status,
      })
      .where(eq(invoices.id, params.id));

    return NextResponse.json(
      { success: true, message: "WhatsApp enviado com sucesso" },
      { status: 200 }
    );
  } catch (error) {
    logger.error("Erro ao enviar WhatsApp", { error: String(error) });
    return NextResponse.json(
      { message: "Erro ao enviar WhatsApp", error: String(error) },
      { status: 500 }
    );
  }
}

// Helper function to format phone number for WhatsApp
function formatPhoneNumber(phone: string): string {
  // Remove non-digit characters
  const digits = phone.replace(/\D/g, "");
  
  // Ensure it has the Brazil country code (55)
  if (digits.startsWith("55")) {
    return digits;
  } else {
    return `55${digits}`;
  }
} 