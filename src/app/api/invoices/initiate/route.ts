/* eslint-disable @typescript-eslint/naming-convention */
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/db';
import { createLogger } from '@/lib/utils/logger';
import { INVOICE_STATUS } from '@/lib/constants/invoice';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { z } from 'zod';

const logger = createLogger('InvoiceInitiateAPI');

// Validation schema for invoice initiation request
const initiateInvoiceSchema = z.object({
  customerId: z.string().min(1, 'Cliente é obrigatório'),
});

export async function POST(request: NextRequest) {
  try {
    // Primary authentication method: Use session 
    const session = await getServerSession(authOptions);
    
    // Secondary fallback: Check auth headers set by middleware
    const headerUserId = request.headers.get('x-user-id');
    const headerUserEmail = request.headers.get('x-user-email');
    const headerUserRole = request.headers.get('x-user-role');
    
    // Log both auth sources
    logger.info('Initiate API - Authentication sources', {
      sessionAuth: {
        hasSession: !!session,
        sessionUserId: session?.user?.id,
        sessionUserEmail: session?.user?.email,
        sessionUserRole: session?.user?.role,
      },
      headerAuth: {
        headerUserId,
        headerUserEmail, 
        headerUserRole
      },
      cookies: request.cookies.getAll().map(c => c.name),
    });
    
    // Determine effective auth data (prefer session, fallback to headers)
    let userId, userEmail, userRole;
    
    if (session?.user) {
      // Use session auth
      userId = session.user.id;
      userEmail = session.user.email;
      userRole = session.user.role;
      logger.info('Using session-based authentication');
    } else if (headerUserId && headerUserRole) {
      // Fallback to header auth
      userId = headerUserId;
      userEmail = headerUserEmail;
      userRole = headerUserRole;
      logger.info('Using header-based authentication');
    } else {
      // No valid auth source
      logger.warn('No valid authentication source available');
      return NextResponse.json({ 
        error: 'Unauthorized', 
        reason: 'No valid authentication source' 
      }, { status: 401 });
    }
    
    // Define allowed roles
    const allowedRoleStrings = ['ADMIN', 'SUPER_ADMIN', 'ADMIN_STAFF'];
    const hasRequiredRole = userRole ? allowedRoleStrings.includes(userRole as string) : false;

    // Role check logging
    logger.debug('Role check details:', {
      userId,
      userRole,
      allowedRoles: allowedRoleStrings,
      hasRequiredRole
    });

    // Check if user has appropriate role
    if (!userId || !userRole || !hasRequiredRole) {
      logger.warn('Authorization check failed', { 
        userIdPresent: !!userId,
        userRolePresent: !!userRole,
        roleCheckPassed: hasRequiredRole, 
        receivedRole: userRole,
      });
      return NextResponse.json({ 
        error: 'Unauthorized', 
        reason: 'Invalid role or missing user ID' 
      }, { status: 401 });
    }

    logger.info('User authorized', { userId, userRole });

    // Parse and validate request body
    const body = await request.json();
    const validationResult = initiateInvoiceSchema.safeParse(body);
    
    if (!validationResult.success) {
      logger.error('Invalid initiate invoice data', { errors: validationResult.error.format() });
      return NextResponse.json({ 
        error: 'Invalid request data', 
        details: validationResult.error.format() 
      }, { status: 400 });
    }

    const { customerId } = validationResult.data;

    // Check if customer exists
    const customer = await prisma.user.findUnique({
      where: { id: customerId },
      include: {
        installations: {
          where: { type: 'CONSUMER' },
        },
        // No need to include address anymore for this step
      },
    });

    if (!customer) {
      logger.warn(`Customer not found: ${customerId}`);
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    }

    if (customer.installations.length === 0) {
      logger.warn(`Customer has no consumer installations: ${customerId}`);
      return NextResponse.json({ 
        error: 'Customer has no consumer installations',
        message: 'The customer must have at least one consumer installation'
      }, { status: 400 });
    }

    // Get current date for reference
    const now = new Date();
    const referenceMonth = `${(now.getMonth() + 1).toString().padStart(2, '0')}/${now.getFullYear()}`;
    
    // Calculate due date (10 days from now)
    const dueDate = new Date(now);
    dueDate.setDate(dueDate.getDate() + 10);

    // Create a draft invoice with only essential/defaulted fields
    const newInvoice = await prisma.invoice.create({
      data: {
        // Essential Links
        
        user_id: customerId, // Link to the customer (Corrected: userId -> user_id)
        
        installation_id: customer.installations[0].id, // Link to their first consumer installation (Corrected: installationId -> installation_id)
        
        // Defaults for this draft stage
        status: INVOICE_STATUS.PENDING, 
        
        due_date: dueDate, // (Corrected: dueDate -> due_date)
        
       
        reference_month: referenceMonth, // (Corrected: referenceMonth -> reference_month)
        
        // Add required fields with defaults
       
        total_amount: 0, // Required field, default to 0
       
        billing_address: '', // Required field, default to empty string
        
        // Optional fields will be null/undefined by default in the DB
        // description: `Fatura inicial para ${referenceMonth}`, // Example if needed
        // createdBy: userId, // Optionally track the admin who created it
      },
    });

    logger.info('Draft invoice created successfully', { 
      invoiceId: newInvoice.id,
      customerId: customerId,
      adminId: userId // The admin who initiated
    });

    return NextResponse.json({
      success: true,
      message: 'Draft invoice created successfully',
      id: newInvoice.id,
    });

  } catch (error) {
    // Log the specific error caught
    logger.error('Error creating draft invoice', { 
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        errorStack: error instanceof Error ? error.stack : null,
        errorDetails: error 
    });
    return NextResponse.json({ 
      error: 'Failed to create draft invoice',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 