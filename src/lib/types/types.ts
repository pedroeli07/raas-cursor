import { Role, NotificationType, NotificationStatus, HelpRequestStatus, InvitationStatus } from '@prisma/client';

/**
 * Authentication and User Types
 */

// User information extracted from JWT and request headers
export interface RequestUser {
  userId: string | null;
  userEmail: string | null;
  userRole: Role | null;

}

// User data returned from login/registration
export interface UserResponse {
  id: string;
  name?: string;
  email: string;
  role: Role;
  contactId?: string;
  addressId?: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Invitation Types
 */

// Invitation data for response
export interface InvitationResponse {
  id: string;
  email: string;
  name?: string;
  role: Role;
  status: InvitationStatus;
  message?: string;
  sender?: string;
  createdAt: Date;
  expiresAt: Date;
}

/**
 * Notification Types
 */

// Notification data structure
export interface NotificationResponse {
  id: string;
  title: string;
  message: string;
  type: NotificationType;
  status: NotificationStatus;
  userId: string;
  relatedId?: string;
  readAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Help Request Types
 */

// Help request data structure
export interface HelpRequestResponse {
  id: string;
  title: string;
  message: string;
  status: HelpRequestStatus;
  userId: string;
  adminId?: string;
  createdAt: Date;
  updatedAt: Date;
  user?: {
    id: string;
    name?: string;
    role: Role;
    contact?: {
      email: string;
      phone: string;
    };
  };
  responses?: HelpResponseResponse[];
}

// Help response data structure
export interface HelpResponseResponse {
  id: string;
  message: string;
  helpRequestId: string;
  userId: string;
  createdAt: Date;
  user?: {
    id: string;
    name?: string;
    role: Role;
  };
}

/**
 * API Response Types
 */

// Standard success response
export interface SuccessResponse<T> {
  message: string;
  data?: T;
  status?: number;
}

// Error response
export interface ErrorResponse {
  message: string;
  errors?: Array<{ field?: string; message: string }>;
  status?: number;
}
