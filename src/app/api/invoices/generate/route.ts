/* eslint-disable @typescript-eslint/naming-convention */
// src/app/api/invoices/generate/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/db';
import { createLogger } from '@/lib/utils/logger';
import { INVOICE_STATUS } from '@/lib/constants/invoice';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { z } from 'zod';

const logger = createLogger('InvoiceGenerateAPI');

// Validation schema for invoice generation request
const generateInvoiceSchema = z.object({
  userId: z.string(),
  installationNumbers: z.array(z.string()).min(1),
  period: z.string().regex(/^\d{2}\/\d{4}$/), // MM/YYYY format
  kwhRate: z.number().positive(), // Distributor's rate for calculating original cost
  discount: z.number().min(0).max(1), // Discount as decimal (e.g., 0.20)
  issueDate: z.string().datetime().optional(),
  dueDate: z.string().datetime(),
  description: z.string().optional().nullable(),
  invoiceNumber: z.string().optional().nullable(),
});

// Type for Energy Record data
interface EnergyRecord {
  installationNumber: string;
  period: string;
  consumption?: number;
  compensation?: number;
  received?: number;
  currentBalance?: number;
}

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse request body
    const body = await request.json();
    
    // Validate request data
    const validationResult = generateInvoiceSchema.safeParse(body);
    if (!validationResult.success) {
      logger.error('Validation error', { errors: validationResult.error.format() });
      return NextResponse.json({ error: 'Invalid request data', details: validationResult.error.format() }, { status: 400 });
    }
    
    const data = validationResult.data;
    
    logger.info('Generating invoice (full generation flow)', { 
      userId: data.userId,
      period: data.period,
      installations: data.installationNumbers.length
    });
    
    // Get client information including address
    const client = await prisma.user.findUnique({
      where: { id: data.userId },
      include: { 
        installations: true,
        address: true
      }
    });
    
    if (!client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 });
    }
    
    // Get installations included in this invoice
    const installations = await prisma.installation.findMany({
      where: { 
        installationNumber: { in: data.installationNumbers },
        ownerId: client.id
      }
    });
    
    if (installations.length === 0 || installations.length !== data.installationNumbers.length) {
      return NextResponse.json({ error: 'One or more installations not found or do not belong to the user' }, { status: 400 });
    }
    
    // Fetch energy data for the period and installations, including related installation data
    const energyData = await prisma.cemigEnergyBillData.findMany({
      where: {
        installation: {
          installationNumber: { in: data.installationNumbers }
        },
        period: data.period
      },
      include: {
        installation: true // Include installation data
      }
    });
    
    if (energyData.length === 0) {
      return NextResponse.json({ error: 'No energy data found for the selected period/installations' }, { status: 400 });
    }
    
    // Calculate totals based on energy data
    const totalCompensation = energyData.reduce((sum, record) => sum + Number(record.compensation || 0), 0);
    const totalKwhToBill = totalCompensation; // Simplified example
    
    // Calculate values based on schema
    const discountDecimal = data.discount;
    const effectiveRate = data.kwhRate * (1 - discountDecimal);
    const calculatedAmount = totalKwhToBill * effectiveRate; // Amount RaaS charges (use 'amount' field)
    const calculatedTotalAmount = totalKwhToBill * data.kwhRate; // Original amount (before RaaS discount)
    const calculatedSavings = calculatedTotalAmount - calculatedAmount;
    
    // Parse dates
    const issueDate = data.issueDate ? new Date(data.issueDate) : new Date();
    const dueDate = new Date(data.dueDate);
    
    // Generate invoice number if not provided
    const invoiceNumber = data.invoiceNumber || `INV-${client.id.substring(0, 4)}-${data.period.replace('/', '')}-${Math.floor(Math.random() * 10000)}`;
    
    // Get billing address string
    const billingAddress = client.address ? 
      `${client.address.street ?? ''}, ${client.address.number ?? ''}${client.address.complement ? ' - ' + client.address.complement : ''}, ${client.address.neighborhood ?? ''}, ${client.address.city ?? ''} - ${client.address.state ?? ''}, CEP ${client.address.zip ?? ''}`.trim().replace(/ ,|,$/g, '')
      : null;

    // Create invoice in database, aligning with the NEW schema
    const invoice = await prisma.invoice.create({
      data: {
        
        invoice_number: invoiceNumber,
        
        user_id: client.id,
        
        installation_id: installations[0].id,
        
        reference_month: data.period,
        
        due_date: dueDate,
        
        invoice_amount: calculatedAmount,
        
        total_amount: calculatedTotalAmount,
        savings: calculatedSavings,
        
        discount_percentage: discountDecimal,
        
        savings_percentage: discountDecimal,
        
        billing_address: billingAddress ?? '',
        status: INVOICE_STATUS.PENDING,
        
        created_at: issueDate,
      }
    });
    
    logger.info('Invoice generated successfully (full flow)', { 
      invoiceId: invoice.id,
      invoiceNumber: invoice.invoice_number,
      invoiceAmount: invoice.invoice_amount
    });
    
    return NextResponse.json({ 
      success: true, 
      invoiceId: invoice.id,
      invoiceNumber: invoice.invoice_number
    });
  } catch (error) {
    logger.error('Error generating invoice (full flow)', { error });
    return NextResponse.json({ error: 'Failed to generate invoice' }, { status: 500 });
  }
} 