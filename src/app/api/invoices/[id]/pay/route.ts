/* eslint-disable @typescript-eslint/naming-convention */
import { NextRequest, NextResponse } from 'next/server';
import { INVOICE_STATUS } from '@/lib/constants/invoice';
import { prisma } from '@/lib/db/db'; // Import prisma
import { getServerSession } from 'next-auth'; // Import auth
import { authOptions } from '@/lib/auth-options';
import { createLogger } from '@/lib/utils/logger';
import { Role } from '@/hooks/use-auth';

const logger = createLogger('InvoicePayAPI');

interface RouteParams {
  params: {
    id: string;
  };
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || ![Role.ADMIN, Role.SUPER_ADMIN, Role.ADMIN_STAFF].includes(session.user.role as unknown as Role)) {
      logger.warn('Unauthorized attempt to mark invoice as paid', { userId: session?.user?.id, invoiceId: params.id });
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const id = params.id;
    
    // Optional: Parse body for payment details if needed in the future
    // const body = await request.json();
    // const { paymentDate, paymentMethod } = body;
    
    logger.info(`Attempting to mark invoice ${id} as paid by admin ${session.user.id}`);

    // 1. Verify the invoice exists
    const invoice = await prisma.invoice.findUnique({
      where: { id: id },
    });

    if (!invoice) {
       logger.warn(`Invoice not found for payment: ${id}`);
      return NextResponse.json(
        { 
          success: false,
          error: 'Invoice not found',
          message: `No invoice found with ID ${id}`
        },
        { status: 404 }
      );
    }
    
    // Check if invoice is already paid
    if (invoice.status === INVOICE_STATUS.PAID) {
       logger.warn(`Invoice ${id} is already paid, payment attempt rejected.`);
      return NextResponse.json(
        { 
          success: false,
          error: 'Invoice already paid',
          message: `Invoice ${id} is already marked as paid`
        },
        { status: 400 } // Bad Request, already paid
      );
    }
    
    // Check if invoice is cancelled
    if (invoice.status === INVOICE_STATUS.CANCELED) {
      logger.warn(`Invoice ${id} is cancelled, payment attempt rejected.`);
      return NextResponse.json(
        { 
          success: false,
          error: 'Invoice is cancelled',
          message: `Cannot pay a cancelled invoice`
        },
        { status: 400 } // Bad Request, cancelled
      );
    }
    
    // 2. Update the invoice status in the database
    const updatedInvoice = await prisma.invoice.update({
      where: { id: id },
      data: {
        status: INVOICE_STATUS.PAID,
        paid_at: new Date(), // Set payment date to now
        // paymentMethod: paymentMethod, // Add if needed from body
      },
    });

    logger.info(`Invoice ${id} successfully marked as paid.`);
    
    // 3. Return the updated invoice
    return NextResponse.json({
      success: true,
      message: `Invoice ${id} marked as paid`,
      invoice: updatedInvoice // Return the actual updated data
    });

  } catch (error) {
    logger.error(`Error marking invoice ${params.id} as paid:`, { error });
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to mark invoice as paid',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
} 