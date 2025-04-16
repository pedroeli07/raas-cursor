import { NextRequest, NextResponse } from 'next/server';
import { INVOICE_STATUS } from '@/lib/constants/invoice';
import { prisma } from '@/lib/db/db';
import { createLogger } from '@/lib/utils/logger';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { Role } from '@prisma/client';
import { z } from 'zod';

const logger = createLogger('InvoiceUpdateAPI');

interface RouteParams {
  params: {
    id: string;
  };
}

// Validation schema for invoice update request
const updateInvoiceSchema = z.object({
  // Define fields that admins can update AFTER initiation
  dueDate: z.string().datetime().optional(),
  status: z.nativeEnum(INVOICE_STATUS).optional(),
  description: z.string().optional().nullable(),
  // Allow updating financial details if needed during the finalization step
  amount: z.number().nonnegative().optional().nullable(), 
  totalAmount: z.number().nonnegative().optional().nullable(), 
  savings: z.number().optional().nullable(),
  discountPercentage: z.number().min(0).max(1).optional().nullable(), // Store as decimal (0.20)
  savingsPercentage: z.number().min(0).max(1).optional().nullable(),
  invoiceNumber: z.string().optional().nullable(),
  // billingAddress: z.string().optional().nullable(), // Only if you allow editing address later
});

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const id = params.id;
    logger.info(`Fetching invoice details for ID: ${id}`);
    
    // Add debugging for cookies and headers
    const cookies = request.cookies;
    logger.debug(`Request cookies: ${cookies.getAll().map(c => c.name).join(', ')}`);
    
    const session = await getServerSession(authOptions);
    logger.debug('Session data:', { 
      hasSession: !!session, 
      hasUser: !!session?.user,
      userRole: session?.user?.role,
      userId: session?.user?.id
    });
    
    if (!session?.user) {
      logger.warn('No session found or no user in session');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const invoice = await prisma.invoice.findUnique({
      where: { id: id },
      include: {
        User: true,
        Installation: {
          include: {
            distributor: true
          }
        }
      }
    });

    if (!invoice) {
      logger.warn(`Invoice not found: ${id}`);
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    // Role check using string comparison instead of enum
    const userRole = session.user.role as string; // Cast to string
    const isAdmin = [
      'ADMIN',
      'SUPER_ADMIN', // Ensure SUPER_ADMIN is checked
      'ADMIN_STAFF'
    ].includes(userRole);
    const isOwner = session.user.id === invoice.user_id;

    if (!isAdmin && !isOwner) {
      logger.warn(`Forbidden access attempt to invoice ${id} by user ${session.user.id} with role ${userRole}`);
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 }); // Use 403 Forbidden
    }

    // Fetch related energy data if needed (adapt as necessary)
    // Consider if this is always needed or only for specific statuses
    const energyData = await prisma.cemigEnergyBillData.findFirst({
      where: {
        installationId: invoice.installation_id,
        period: invoice.reference_month
      }
    });
    
    // Format response, handling optional fields
    const formattedInvoice = {
      id: invoice.id,
      invoiceNumber: invoice.invoice_number,
      userId: invoice.user_id,
      customerName: invoice.User?.name || invoice.User?.email || 'Cliente',
      installationId: invoice.installation_id,
      installationNumber: invoice.Installation?.installationNumber,
      distributorName: invoice.Installation?.distributor?.name,
      distributorId: invoice.Installation?.distributorId,
      referenceMonth: invoice.reference_month,
      issueDate: invoice.created_at,
      dueDate: invoice.due_date,
      status: invoice.status as keyof typeof INVOICE_STATUS,
      totalAmount: invoice.total_amount ? Number(invoice.total_amount) : null,
      invoiceAmount: invoice.invoice_amount ? Number(invoice.invoice_amount) : null,
      savings: invoice.savings ? Number(invoice.savings) : null,
      discountPercentage: invoice.discount_percentage ? Number(invoice.discount_percentage) * 100 : null,
      savingsPercentage: invoice.savings_percentage ? Number(invoice.savings_percentage) * 100 : null,
      consumptionKwh: energyData?.consumption ? Number(energyData.consumption) : null,
      compensation: energyData?.compensation ? Number(energyData.compensation) : null,
      received: energyData?.received ? Number(energyData.received) : null,
      isPaid: invoice.status === INVOICE_STATUS.PAID,
      paidAt: invoice.paid_at,
      billingAddress: invoice.billing_address,
      createdAt: invoice.created_at,
    };

    logger.info(`Successfully fetched invoice details for ID: ${id}`);
    // Return the single formatted invoice object
    return NextResponse.json(formattedInvoice); 
  } catch (error) {
    logger.error(`Error fetching invoice details for ID: ${params.id}`, { error });
    return NextResponse.json({ error: 'Failed to fetch invoice details' }, { status: 500 });
  }
}

// PATCH method for updating invoice
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    // Authorization: Only Admins/SuperAdmins can update
    const userRole = session?.user?.role as string; // Cast to string
    if (!session?.user || !['ADMIN', 'SUPER_ADMIN', 'ADMIN_STAFF'].includes(userRole)) {
      logger.warn('Unauthorized attempt to update invoice', { userId: session?.user?.id, invoiceId: params.id });
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 }); // Keep 401 if no session/user
    }

    const id = params.id;
    const body = await request.json();

    // Validate request body
    const validationResult = updateInvoiceSchema.safeParse(body);
    if (!validationResult.success) {
      logger.error('Invalid update data', { invoiceId: id, errors: validationResult.error.format() });
      return NextResponse.json({ error: 'Invalid request data', details: validationResult.error.format() }, { status: 400 });
    }

    const updateData = validationResult.data;

    // Check if the invoice exists
    const existingInvoice = await prisma.invoice.findUnique({
      where: { id: id },
    });

    if (!existingInvoice) {
      logger.warn(`Invoice not found for update: ${id}`);
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    logger.info(`Attempting to update invoice ${id}`, { adminUserId: session.user.id, updateData });

    // Prepare data for Prisma update (map camelCase schema to snake_case model)
    const dataToUpdate: Record<string, any> = {};
    if (updateData.dueDate !== undefined) dataToUpdate.due_date = updateData.dueDate;
    if (updateData.status !== undefined) dataToUpdate.status = updateData.status;
    if (updateData.description !== undefined) dataToUpdate.description = updateData.description;
    if (updateData.amount !== undefined) dataToUpdate.invoice_amount = updateData.amount; // Map amount to invoice_amount
    if (updateData.totalAmount !== undefined) dataToUpdate.total_amount = updateData.totalAmount;
    if (updateData.savings !== undefined) dataToUpdate.savings = updateData.savings;
    if (updateData.discountPercentage !== undefined) dataToUpdate.discount_percentage = updateData.discountPercentage;
    if (updateData.savingsPercentage !== undefined) dataToUpdate.savings_percentage = updateData.savingsPercentage;
    if (updateData.invoiceNumber !== undefined) dataToUpdate.invoice_number = updateData.invoiceNumber;
    // if (updateData.billingAddress !== undefined) dataToUpdate.billing_address = updateData.billingAddress; // If needed

    // Automatically update paidAt if status is set to PAID
    if (updateData.status === INVOICE_STATUS.PAID && !existingInvoice.paid_at) {
      dataToUpdate.paid_at = new Date();
    }
    // Clear paidAt if status is changed from PAID to something else
    else if (updateData.status && updateData.status !== INVOICE_STATUS.PAID && existingInvoice.paid_at) {
      dataToUpdate.paid_at = null;
    }

    // Update the invoice in the database
    const updatedInvoice = await prisma.invoice.update({
      where: { id: id },
      data: dataToUpdate,
    });

    logger.info(`Invoice ${id} updated successfully`);

    return NextResponse.json({ 
      success: true, 
      message: 'Invoice updated successfully', 
      invoice: updatedInvoice 
    });

  } catch (error) {
    logger.error(`Error updating invoice ${params.id}:`, { error });
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to update invoice', 
        message: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
} 