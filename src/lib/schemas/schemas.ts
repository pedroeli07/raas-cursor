import { z } from 'zod';
import { Role } from '@prisma/client';

/**
 * Authentication Schemas
 */

// Schema for user login
export const loginSchema = z.object({
  email: z.string().email({ message: 'Invalid email address' }),
  password: z.string().min(1, { message: 'Password is required' }),
});

// Schema for user registration
export const registerSchema = z.object({
  email: z.string().email({ message: 'Invalid email address' }),
  password: z.string().min(8, { message: 'Password must be at least 8 characters long' }),
  name: z.string().optional(),
  token: z.string().optional(), // Invitation token
});

/**
 * Invitation Schemas
 */

// Schema for creating invitations
export const inviteSchema = z.object({
  email: z.string().email({ message: 'Invalid email address' }),
  name: z.string().optional(),
  role: z.nativeEnum(Role), // Ensure the role is one of the defined Enum values
});

/**
 * Help Request Schemas
 */

// Schema for creating a help request
export const createHelpRequestSchema = z.object({
  title: z.string().min(5, { message: 'Title must be at least 5 characters long' }),
  message: z.string().min(10, { message: 'Message must be at least 10 characters long' }),
});

// Schema for adding a response to a help request
export const addResponseSchema = z.object({
  helpRequestId: z.string().min(1, { message: 'Help request ID is required' }),
  message: z.string().min(5, { message: 'Response must be at least 5 characters long' }),
});

// Schema for adding a response to a specific help request (without helpRequestId)
export const helpResponseSchema = z.object({
  message: z.string().min(5, { message: 'Response must be at least 5 characters long' }),
});

/**
 * Notification Schemas
 */

// Schema for operations on notifications
export const notificationOperationSchema = z.object({
  notificationId: z.string().min(1, { message: 'Notification ID is required' }),
  operation: z.enum(['markAsRead', 'archive']),
});

// Schema for updating help request status
export const helpRequestStatusUpdateSchema = z.object({
  helpRequestId: z.string().min(1, { message: 'Help request ID is required' }),
  status: z.enum(['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED']),
  operation: z.literal('updateStatus'),
});

// Schema for assigning help request to admin
export const helpRequestAssignSchema = z.object({
  helpRequestId: z.string().min(1, { message: 'Help request ID is required' }),
  operation: z.literal('assign'),
});

// Schema for Distributor creation
export const createDistributorSchema = z.object({
  name: z.string().min(3, { message: 'Distributor name must be at least 3 characters long' }),
  price_per_kwh: z.number().positive({ message: 'Price per kWh must be a positive number' })
});

// Schema for Installation creation
export const createInstallationSchema = z.object({
  installationNumber: z.string().min(5, { message: 'Installation number must be at least 5 characters long' }),
  type: z.enum(['GENERATOR', 'CONSUMER'], { message: 'Invalid installation type' }), // Matches InstallationType enum
  distributorId: z.string().cuid({ message: 'Invalid Distributor ID' }),
  ownerId: z.string().cuid({ message: 'Invalid Owner User ID' }),
  addressId: z.string().cuid({ message: 'Invalid Address ID' }).optional(),
});

// Schema for email verification
export const verifyEmailSchema = z.object({
  userId: z.string().min(1, { message: 'ID do usuário é obrigatório' }),
  code: z.string().min(1, { message: 'Código de verificação é obrigatório' }),
});

// Schema for two-factor authentication
export const twoFactorSchema = z.object({
  userId: z.string().min(1, { message: 'ID do usuário é obrigatório' }),
  code: z.string().min(1, { message: 'Código de verificação é obrigatório' }),
});

// Schema for toggling two-factor authentication
export const toggleTwoFactorSchema = z.object({
  enabled: z.boolean(),
});
