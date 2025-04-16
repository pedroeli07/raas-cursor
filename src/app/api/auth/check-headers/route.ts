import { NextRequest, NextResponse } from 'next/server';
import log from '@/lib/logs/logger';

export async function GET(req: NextRequest) {
  log.info('Headers check endpoint called');
  
  // Get all headers
  const headers: Record<string, string> = {};
  req.headers.forEach((value, key) => {
    headers[key] = value;
  });
  
  // Extract user info from headers set by middleware
  const userId = req.headers.get('x-user-id');
  const userEmail = req.headers.get('x-user-email');
  const userRole = req.headers.get('x-user-role');
  const authHeader = req.headers.get('authorization');
  
  // Print request information
  log.info('Request headers check', { 
    userId, 
    userEmail, 
    userRole,
    hasAuthHeader: !!authHeader,
    authHeaderLength: authHeader ? authHeader.length : 0
  });
  
  return NextResponse.json({
    message: 'Headers check',
    userInfo: {
      userId,
      userEmail,
      userRole
    },
    hasAuthorizationHeader: !!authHeader,
    authorizationHeaderPrefix: authHeader ? authHeader.substring(0, 15) + '...' : null,
    allHeaders: headers
  });
} 