import { NextRequest, NextResponse } from 'next/server';
import { createErrorResponse } from './response-helpers';
import { createLogger } from '@/lib/utils/logger';

const log = createLogger('api:auth-helpers');

// Extract user info from JWT or cookies in the request
export function getUserFromRequest(req: NextRequest) {
  // You would normally extract user info from the token
  // This is a simplified version that assumes headers are set by authentication middleware
  const userId = req.headers.get('x-user-id');
  const userEmail = req.headers.get('x-user-email');
  const userRole = req.headers.get('x-user-role');

  return {
    userId,
    userEmail,
    userRole
  };
}

// Validate that the user is authenticated
export function validateAuthentication(req: NextRequest): {
  isAuthenticated: boolean;
  errorResponse?: NextResponse;
} {
  // For now, we're simplifying this to allow all authenticated requests
  // You would add additional checks for specific roles or permissions here
  const { userId } = getUserFromRequest(req);

  if (!userId) {
    log.warn('Authentication failed: No user ID in request');
    return {
      isAuthenticated: false,
      errorResponse: createErrorResponse('Unauthorized', 401),
    };
  }

  return { isAuthenticated: true };
} 