import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/db';
import { backendLog as log } from '@/lib/logs/logger';
import { EnvironmentConfig } from '@/lib/config/environmentConfig';
import { InvitationStatus } from '@prisma/client';

/**
 * This is a development-only endpoint to examine invitations
 */
export async function GET(req: NextRequest) {
  // Only available in development
  if (!EnvironmentConfig.isDev) {
    log.warn('Dev endpoint accessed in non-dev environment');
    return NextResponse.json({ message: 'Endpoint only available in development' }, { status: 403 });
  }

  const searchParams = new URL(req.url).searchParams;
  const email = searchParams.get('email');
  const token = searchParams.get('token');
  const id = searchParams.get('id');
  
  try {
    log.debug('Fetching invitations for debugging', { email, token, id });
    
    let invitations;
    
    if (id) {
      // Fetch by ID
      const invitation = await prisma.invitation.findUnique({
        where: { id }
      });
      invitations = invitation ? [invitation] : [];
    } else if (token) {
      // Fetch by token
      const invitation = await prisma.invitation.findFirst({
        where: { token }
      });
      invitations = invitation ? [invitation] : [];
    } else if (email) {
      // Fetch by email
      invitations = await prisma.invitation.findMany({
        where: { email },
        orderBy: { createdAt: 'desc' }
      });
    } else {
      // Fetch all recent invitations
      invitations = await prisma.invitation.findMany({
        orderBy: { createdAt: 'desc' },
        take: 20
      });
    }
    
    log.info('Returning invitations for debug purposes', { count: invitations.length });
    
    return NextResponse.json(invitations);
  } catch (error) {
    log.error('Error fetching invitations for debug', { error });
    return NextResponse.json({ message: 'Error fetching invitations' }, { status: 500 });
  }
} 