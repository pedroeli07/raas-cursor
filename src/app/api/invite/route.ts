// Path: src/app/api/auth/invite/route.ts
import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { db } from '@/lib/db/db';
import log from '@/lib/logs/logger';
import { Role, InvitationStatus } from '@prisma/client';
import { EmailService } from '@/lib/email/emailService';
import { NotificationService } from '@/lib/notification/notificationService';
import { inviteSchema } from '@/lib/schemas/schemas';
import { RequestUser, InvitationResponse } from '@/lib/types/types';

// Helper function to get user information from request headers set by middleware
function getUserFromRequest(req: NextRequest): RequestUser {
  const userId = req.headers.get('x-user-id');
  const userEmail = req.headers.get('x-user-email');
  const userRole = req.headers.get('x-user-role') as Role | null;

  return { userId, userEmail, userRole };
}

// GET method to retrieve invitations
export async function GET(req: NextRequest) {
  log.info('Received request to fetch invitations');

  // Authorization check
  const { userRole } = getUserFromRequest(req);
  if (!(userRole === Role.SUPER_ADMIN || userRole === Role.ADMIN)) {
    log.warn('Unauthorized attempt to fetch invitations', { roleAttempted: userRole });
    return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
  }

  log.debug('Request authorized for invitation fetch', { userRole });

  try {
    // Get all invitations, ordered by creation date (newest first)
    const invitations = await db.invitation.findMany({
      orderBy: {
        createdAt: 'desc'
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        status: true,
        createdAt: true,
        expiresAt: true,
        // Exclude token for security reasons
      }
    });

    log.info('Invitations fetched successfully', { count: invitations.length });
    return NextResponse.json({ invitations });
  } catch (error) {
    log.error('Error fetching invitations', { error });
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  log.info('Received invitation request');

  // Get user information for creating notifications later
  const { userId, userEmail, userRole } = getUserFromRequest(req);

  // Authorization check
  if (!(userRole === Role.SUPER_ADMIN || userRole === Role.ADMIN)) {
      log.warn('Unauthorized attempt to create invitation', { roleAttempted: userRole });
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
  }

  log.debug('Request authorized', { userRole, userEmail });

  try {
    const body = await req.json();
    const validation = inviteSchema.safeParse(body);

    if (!validation.success) {
      log.warn('Invitation validation failed', { errors: validation.error.errors });
      return NextResponse.json({ errors: validation.error.errors }, { status: 400 });
    }

    const { email, name, role } = validation.data;
    log.debug('Validated invitation data', { email, name, role });

    // Check if user already exists through contact with this email
    const existingContact = await db.contact.findFirst({ where: { emails: { has: email } } });
    
    if (existingContact) {
      const existingUser = await db.user.findFirst({ where: { contactId: existingContact.id } });
      if (existingUser) {
        log.warn('Invitation failed: User already exists with this email', { email });
        return NextResponse.json({ message: 'User with this email already exists' }, { status: 409 });
      }
    }

    // Check for existing non-used invitation
    const existingInvitation = await db.invitation.findFirst({
        where: { email: email, status: InvitationStatus.PENDING, expiresAt: { gt: new Date() } }
    });
    if(existingInvitation){
        log.warn('Invitation failed: Active invitation already exists for this email', { email });
        return NextResponse.json({ message: 'An active invitation already exists for this email' }, { status: 409 });
    }

    // Generate unique token
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // Token expires in 24 hours

    log.debug('Generated invitation token', { email, token, expiresAt });

    // Store invitation in database
    const invitation = await db.invitation.create({
      data: {
        email,
        name,
        role,
        token,
        expiresAt,
      },
    });

    log.info('Invitation created successfully in DB', { invitationId: invitation.id, email });

    // Send invitation email
    const emailSent = await EmailService.sendInvitationEmail(email, name || null, role, token);
    
    if (!emailSent) {
      log.error('Failed to send invitation email', { email });
      return NextResponse.json({ message: 'Invitation created, but failed to send email' }, { status: 500 });
    }
    
    log.info('Invitation email sent successfully', { email });

    // Get the name of the admin who sent the invitation
    const adminName = await getUserName(userId);

    // Create notifications for admins about the new invitation
    await NotificationService.notifyAdminsAboutInvitation(email, adminName || null, role);
    
    log.info('Admin notifications created for invitation', { email, adminName });

    const invitationResponse: InvitationResponse = {
      id: invitation.id,
      email: invitation.email,
      name: adminName || undefined,
      role: invitation.role,
      status: invitation.status,
      createdAt: invitation.createdAt,
      expiresAt: invitation.expiresAt
    };

    return NextResponse.json({ 
      message: 'Invitation sent successfully',
      invitation: invitationResponse
    }, { status: 201 });

  } catch (error) {
    log.error('Error during invitation creation', { error });
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}

// Helper function to get a user's name
async function getUserName(userId: string | null): Promise<string> {
  if (!userId) return 'Um administrador';
  
  try {
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { name: true }
    });
    
    return user?.name || 'Um administrador';
  } catch (error) {
    log.error('Error fetching user name', { userId, error });
    return 'Um administrador';
  }
} 