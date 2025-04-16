import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { sendEmail } from "@/lib/email";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { db } from "@/lib/db/db";
import { invoices } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

// Schema validation
const emailRequestSchema = z.object({
  email: z.string().email("E-mail inválido"),
  pdfBase64: z.string(),
  invoiceNumber: z.string(),
});

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
    const validationResult = emailRequestSchema.safeParse(body);
    
    if (!validationResult.success) {
      return NextResponse.json(
        { message: "Dados inválidos", errors: validationResult.error.errors },
        { status: 400 }
      );
    }
    
    const { email, pdfBase64, invoiceNumber } = validationResult.data;

    // Get invoice details
    const invoice = await db.query.invoices.findFirst({
      where: eq(invoices.id, params.id),
      with: {
        customer: true,
      },
    });

    if (!invoice) {
      return NextResponse.json(
        { message: "Fatura não encontrada" },
        { status: 404 }
      );
    }

    // Generate PDF attachment
    const buffer = Buffer.from(pdfBase64, "base64");
    
    // Send email with PDF attachment
    await sendEmail({
      to: email,
      subject: `Fatura RaaS Solar - ${invoiceNumber}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #14b8a6;">Fatura RaaS Solar</h1>
          <p>Olá ${invoice.customer?.name || "Cliente"},</p>
          <p>Sua fatura de energia solar referente ao mês ${invoice.referenceMonth} já está disponível.</p>
          <p><strong>Número da fatura:</strong> ${invoiceNumber}</p>
          <p><strong>Valor:</strong> R$ ${invoice.invoiceAmount.toFixed(2)}</p>
          <p><strong>Data de vencimento:</strong> ${new Date(invoice.dueDate).toLocaleDateString('pt-BR')}</p>
          <p>Você economizou R$ ${invoice.savings.toFixed(2)} (${invoice.savingsPercentage.toFixed(0)}%) com energia solar este mês!</p>
          <p>Em anexo está o PDF da sua fatura para seu controle.</p>
          <p>Caso tenha qualquer dúvida, entre em contato conosco.</p>
          <p>Atenciosamente,<br>Equipe RaaS Solar</p>
        </div>
      `,
      attachments: [
        {
          filename: `fatura-${invoiceNumber.replace(/\//g, "-")}.pdf`,
          content: buffer,
          contentType: "application/pdf",
        },
      ],
    });

    // Update invoice status to track that email was sent
    await db
      .update(invoices)
      .set({
        lastEmailSentAt: new Date(),
        status: invoice.status === "PENDING" ? "NOTIFIED" : invoice.status,
      })
      .where(eq(invoices.id, params.id));

    return NextResponse.json(
      { success: true, message: "E-mail enviado com sucesso" },
      { status: 200 }
    );
  } catch (error) {
    console.error("[INVOICE_EMAIL]", error);
    return NextResponse.json(
      { message: "Erro ao enviar e-mail", error: String(error) },
      { status: 500 }
    );
  }
} 