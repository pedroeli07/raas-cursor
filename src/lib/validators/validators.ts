import { ZodError, ZodSchema } from 'zod';
import { NextRequest, NextResponse } from 'next/server';
import log from '../logs/logger';
import { Role, NotificationStatus, HelpRequestStatus } from '@prisma/client';
import { getUserFromRequest, isAdmin } from '../utils/utils';
import { ErrorResponse } from '../types/types';

/**
 * Generic Validation
 */

// Validate request body against a Zod schema
export async function validateRequestBody<T>(
  req: NextRequest,
  schema: ZodSchema<T>,
  logPrefix: string = 'Validation'
): Promise<{ success: true; data: T } | { success: false; error: NextResponse }> {
  try {
    const body = await req.json();
    const result = schema.safeParse(body);

    if (!result.success) {
      const errors = (result as { error: ZodError }).error.errors;
      log.warn(`${logPrefix} failed`, { errors });
      return {
        success: false,
        error: NextResponse.json(
          { message: `Invalid request data`, errors },
          { status: 400 }
        ),
      };
    }

    return { success: true, data: result.data };
  } catch (error) {
    log.error(`${logPrefix} error: Failed to parse request body`, { error });
    return {
      success: false,
      error: NextResponse.json(
        { message: 'Invalid JSON in request body' },
        { status: 400 }
      ),
    };
  }
}

// Create a standard error response
export function createErrorResponse(
  message: string,
  status: number = 500,
  errors?: unknown[]
): NextResponse<ErrorResponse> {
  return NextResponse.json({ message, errors: errors as { field?: string; message: string }[] }, { status });
}

/**
 * Authentication Validators
 */

// Validate that a user is authenticated
export function validateAuthentication(req: NextRequest): {
  isAuthenticated: boolean;
  errorResponse?: NextResponse;
} {
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

// Validate that a user has admin rights
export function validateAdminRights(req: NextRequest): {
  isAuthorized: boolean;
  errorResponse?: NextResponse;
} {
  const { userRole } = getUserFromRequest(req);

  if (!isAdmin(userRole)) {
    log.warn('Authorization failed: Insufficient privileges', { 
      roleAttempted: userRole
    });
    return {
      isAuthorized: false,
      errorResponse: createErrorResponse('Forbidden: Admin privileges required', 403),
    };
  }

  return { isAuthorized: true };
}

// Validate user has permission to access a resource
export function validateResourceAccess(
  userId: string | null,
  resourceOwnerId: string,
  adminId?: string | null,
  userRole?: Role | null
): boolean {
  if (!userId) return false;
  
  // User is the resource owner
  if (userId === resourceOwnerId) return true;
  
  // User is the assigned admin
  if (adminId && userId === adminId) return true;
  
  // User is a super admin or admin
  if (userRole && (userRole === Role.SUPER_ADMIN || userRole === Role.ADMIN)) return true;
  
  return false;
}

/**
 * Data Validators
 */

// Validate notification status
export function isValidNotificationStatus(status: string): status is NotificationStatus {
  return ['READ', 'UNREAD', 'ARCHIVED'].includes(status);
}

// Validate help request status
export function isValidHelpRequestStatus(status: string): status is HelpRequestStatus {
  return ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'].includes(status);
}

// Validate email format
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// Validate password strength
export function validatePasswordStrength(password: string): {
  isValid: boolean;
  message?: string;
} {
  if (password.length < 8) {
    return { isValid: false, message: 'Password must be at least 8 characters long' };
  }
  
  // Check for at least one uppercase letter
  if (!/[A-Z]/.test(password)) {
    return { isValid: false, message: 'Password must contain at least one uppercase letter' };
  }
  
  // Check for at least one lowercase letter
  if (!/[a-z]/.test(password)) {
    return { isValid: false, message: 'Password must contain at least one lowercase letter' };
  }
  
  // Check for at least one number
  if (!/\d/.test(password)) {
    return { isValid: false, message: 'Password must contain at least one number' };
  }
  
  return { isValid: true };
}

// Validate URL
export function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}
