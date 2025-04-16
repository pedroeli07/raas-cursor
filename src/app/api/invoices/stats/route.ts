// src/app/api/invoices/stats/route.ts
/* eslint-disable @typescript-eslint/naming-convention */
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/db';
import { createLogger } from '@/lib/utils/logger';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { INVOICE_STATUS } from '@/lib/constants/invoice';
import { Role } from '@/hooks/use-auth';
import { prisma } from '@/lib/db/db';
import { Installation as PrismaInstallation, Invoice as PrismaInvoice } from '@prisma/client';

const logger = createLogger('InvoiceStatsAPI');

// Define types
interface Installation {
  id: string;
  ownerId: string;
}

interface Invoice {
  id: string;
  userId: string;
  installationId?: string;
  status: string;
  invoiceAmount: number;
  savings: number;
  referenceMonth: string;
  type?: 'customer' | 'renter';
}

export async function GET(request: NextRequest) {
  try {
    // Authenticate user
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get search parameters
    const searchParams = request.nextUrl.searchParams;
    const period = searchParams.get('period') || undefined;  // YYYY-MM format
    const userId = searchParams.get('userId') || undefined;
    const type = searchParams.get('type') || undefined;  // 'customer' or 'renter'

    logger.info('Fetching invoice statistics', { period, userId, type });

    // Query conditions based on role and params
    const conditions: any = {}; // Use any for flexibility
    
    // Add period filter if provided
    if (period) {
      conditions.referenceMonth = period;
    }
    
    // Role-based filtering
    const userRole = session.user.role as unknown as Role;
    
    if (userRole === Role.CUSTOMER) {
      conditions.userId = session.user.id;
    } else if (userRole === Role.ENERGY_RENTER) {
      // Renters can only see invoices related to their installations
      const renterInstallations = await prisma.installation.findMany({
        where: {
          ownerId: session.user.id
        }
      });
      
      const installationIds = renterInstallations.map((inst) => inst.id);
      
      if (installationIds.length === 0) {
        return NextResponse.json({
          data: {
            totalCount: 0,
            totalAmount: 0,
            totalSavings: 0,
            statuses: {},
            monthly: []
          }
        });
      }
      
      conditions.installationId = { in: installationIds };
    } else if (userId && [Role.ADMIN, Role.SUPER_ADMIN, Role.ADMIN_STAFF].includes(userRole)) {
      conditions.userId = userId;
    }
    
    // Additional filtering by type
    if (type === 'customer') {
      conditions.type = 'customer';
    } else if (type === 'renter') {
      conditions.type = 'renter';
    }
    
    // Get all invoices with filters
    const invoices = await prisma.invoice.findMany({
      where: conditions
    });
    
    if (!invoices || invoices.length === 0) {
      return NextResponse.json({
        data: {
          totalCount: 0,
          totalAmount: 0,
          totalSavings: 0,
          statuses: {},
          monthly: []
        }
      });
    }
    
    // Calculate stats, handling optional Decimal fields
    const totalCount = invoices.length;
    const totalAmountSum = invoices.reduce((sum, invoice) => {
      // Use 'invoice_amount' and handle potential null
      return sum + (invoice.invoice_amount ? Number(invoice.invoice_amount) : 0);
    }, 0);
    
    const totalSavingsSum = invoices.reduce((sum, invoice) => {
      // Use 'savings' and handle potential null
      return sum + (invoice.savings ? Number(invoice.savings) : 0);
    }, 0);
    
    // Group by status
    const statuses: Record<string, { count: number, amount: number }> = {};
    Object.values(INVOICE_STATUS).forEach(status => {
      statuses[status] = { count: 0, amount: 0 };
    });
    invoices.forEach((invoice) => {
      const status = invoice.status || INVOICE_STATUS.PENDING;
      if (!statuses[status]) {
        statuses[status] = { count: 0, amount: 0 };
      }
      statuses[status].count += 1;
      // Use 'invoice_amount' and handle null for status aggregation
      statuses[status].amount += invoice.invoice_amount ? Number(invoice.invoice_amount) : 0;
    });
    
    // Group by month for chart data
    const monthlyData: Record<string, { count: number, amount: number }> = {};
    invoices.forEach((invoice) => {
      const month = invoice.reference_month || 'Unknown';
      if (!monthlyData[month]) {
        monthlyData[month] = { count: 0, amount: 0 };
      }
      monthlyData[month].count += 1;
      // Use 'invoice_amount' and handle null for monthly aggregation
      monthlyData[month].amount += invoice.invoice_amount ? Number(invoice.invoice_amount) : 0;
    });
    
    // Convert to sorted array for chart data
    const monthly = Object.entries(monthlyData)
      .map(([month, data]) => ({
        month,
        count: data.count,
        amount: data.amount
      }))
      .sort((a, b) => {
        // Sort by month in MM/YYYY format
        const [aMonth, aYear] = a.month.split('/').map(Number);
        const [bMonth, bYear] = b.month.split('/').map(Number);
        
        if (aYear !== bYear) return aYear - bYear;
        return aMonth - bMonth;
      });
    
    logger.info('Invoice statistics fetched successfully', { 
      totalCount, 
      statusCount: Object.keys(statuses).length 
    });
    
    return NextResponse.json({
      data: {
        totalCount,
        totalAmount: totalAmountSum, // Use the calculated sum
        totalSavings: totalSavingsSum, // Use the calculated sum
        statuses,
        monthly
      }
    });
  } catch (error) {
    logger.error('Error fetching invoice statistics', { error });
    return NextResponse.json({ error: 'Failed to fetch invoice statistics' }, { status: 500 });
  }
} 