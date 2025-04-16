// src/app/api/invoices/route.ts
/* eslint-disable @typescript-eslint/naming-convention */
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db/db';
import { createLogger } from '@/lib/utils/logger';
import { INVOICE_STATUS } from '@/lib/constants/invoice';

const logger = createLogger('InvoicesAPI');

export async function GET(request: NextRequest) {
  logger.info('[API] GET /api/invoices');
  const searchParams = request.nextUrl.searchParams;
  
  // Debug: log all headers
  logger.debug('All request headers:', {
    headers: Object.fromEntries(request.headers.entries())
  });
  
  try {
    // Try to get the user from session first
    const session = await getServerSession(authOptions);
    logger.info('[API] Session check result', { 
      hasSession: !!session, 
      sessionUser: session?.user || null 
    });
    
    // Alternative: Check headers for user info
    const userId = request.headers.get('x-user-id');
    const userEmail = request.headers.get('x-user-email');
    const userRole = request.headers.get('x-user-role');
    
    logger.info('[API] Header authentication check', {
      userId,
      userEmail,
      userRole
    });
    
    // FOR TEST SCRIPTS: Accept any valid header values without additional checks
    const isTestMode = request.headers.get('x-test-mode') === 'true';
    
    // Decide which auth method to use
    let currentUserId;
    let currentUserRole;
    
    if (session?.user) {
      // Use session authentication
      currentUserId = session.user.id;
      currentUserRole = session.user.role;
      logger.info('[API] Using session authentication', { 
        userId: currentUserId, 
        role: currentUserRole 
      });
    } else if (userId && userRole) {
      // Fallback to header authentication
      currentUserId = userId;
      currentUserRole = userRole;
      logger.info('[API] Using header authentication', { 
        userId: currentUserId, 
        role: currentUserRole 
      });
      
      // In test mode, we don't verify the user exists in the database
      if (!isTestMode) {
        // Verify that this user actually exists in the database
        const userExists = await prisma.user.findUnique({
          where: { id: currentUserId }
        });
        
        if (!userExists) {
          logger.warn('[API] Header authentication failed: User not found', { userId: currentUserId });
          return NextResponse.json(
            { error: "Unauthorized", message: "User not found" },
            { status: 401 }
          );
        }
      }
    } else {
      // No authentication found
      logger.warn('[API] Unauthorized access attempt to GET /api/invoices');
      return NextResponse.json(
        { error: "Unauthorized", message: "Authentication required to access this resource" },
        { status: 401 }
      );
    }
    
    // Now use currentUserId and currentUserRole for authorization
    const isAdmin = ['ADMIN', 'SUPER_ADMIN', 'ADMIN_STAFF'].includes(currentUserRole);
    const isCustomer = currentUserRole === 'CUSTOMER';
    
    if (!isAdmin && !isCustomer) {
      logger.warn('[API] Unauthorized role attempting to access invoices', { role: currentUserRole });
      return NextResponse.json(
        { error: "Forbidden", message: "Insufficient permissions" },
        { status: 403 }
      );
    }

    // Build filter conditions
    const conditions: any = {};
    
    // Status filter
    const status = searchParams.get('status');
    if (status && status !== 'all') {
      conditions.status = status;
    }
    
    // Month filter (YYYY-MM format)
    const month = searchParams.get('month');
    if (month) {
      const [year, monthNumber] = month.split('-');
      const startDate = new Date(parseInt(year), parseInt(monthNumber) - 1, 1);
      const endDate = new Date(parseInt(year), parseInt(monthNumber), 0);
      
      conditions.reference_month = {
        gte: startDate,
        lte: endDate,
      };
    }
    
    // User ID filter (admin can filter by user, customer sees only their own)
    if (isCustomer) {
      conditions.user_id = currentUserId;
    } else {
      const userIdFilter = searchParams.get('userId');
      if (userIdFilter) {
        conditions.user_id = userIdFilter;
      }
    }
    
    // Fetch invoices
    const invoicesData = await prisma.invoice.findMany({
      where: conditions,
      orderBy: {
        due_date: 'desc'
      },
      include: {
        User: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        Installation: {
          select: {
            id: true,
            installationNumber: true,
            distributorId: true,
            distributor: { select: { name: true } }
          }
        }
      },
    });
    
    // Format invoices for response (basic transformation)
    const formattedInvoices = invoicesData.map((invoice: any) => {
      // Safely access potentially null decimal fields
      const invoiceAmount = invoice.invoice_amount ? Number(invoice.invoice_amount) : null;
      const totalAmount = invoice.total_amount ? Number(invoice.total_amount) : null;
      const savings = invoice.savings ? Number(invoice.savings) : null;
      const discountPercentage = invoice.discount_percentage ? Number(invoice.discount_percentage) * 100 : null;
      const savingsPercentage = invoice.savings_percentage ? Number(invoice.savings_percentage) * 100 : null;

      return {
        id: invoice.id,
        customerName: invoice.User?.name || invoice.User?.email || 'Cliente',
        userId: invoice.user_id,
        installationNumber: invoice.Installation?.installationNumber,
        installationId: invoice.installation_id,
        referenceMonth: invoice.reference_month,
        dueDate: invoice.due_date,
        invoiceAmount: invoiceAmount,
        totalAmount: totalAmount,
        savings: savings,
        savingsPercentage: savingsPercentage,
        discountPercentage: discountPercentage,
        status: invoice.status,
        isPaid: invoice.status === INVOICE_STATUS.PAID,
        invoiceNumber: invoice.invoice_number,
        paidAt: invoice.paid_at,
        createdAt: invoice.created_at
      };
    });
    
    logger.info('[API] Successfully fetched invoices', { count: invoicesData.length });
    return NextResponse.json({ invoices: formattedInvoices });
  } catch (error) {
    logger.error('Error fetching invoices:', error);
    return NextResponse.json(
      { message: 'Failed to fetch invoices' },
      { status: 500 }
    );
  }
} 