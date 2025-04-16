import { z } from 'zod';
import { Role } from '@prisma/client';

/**
 * Common Field Definitions
 */
const fields = {
  // Common validations with consistent error messages
  email: z.string().email({ message: 'Invalid email address' }),
  password: {
    required: z.string().min(1, { message: 'Password is required' }),
    secure: z.string().min(8, { message: 'Password must be at least 8 characters long' })
  },
  id: {
    required: z.string().min(1, { message: 'ID is required' }),
    cuid: z.string().cuid({ message: 'Invalid ID format' })
  },
  messages: {
    standard: z.string().min(5, { message: 'Must be at least 5 characters long' }),
    detailed: z.string().min(10, { message: 'Must be at least 10 characters long' })
  },
  name: z.string().min(3, { message: 'Name must be at least 3 characters long' }).optional(),
};

/**
 * Authentication Schemas
 */
export const loginSchema = z.object({
  email: fields.email,
  password: fields.password.required,
});

export const registerSchema = z.object({
  email: fields.email,
  password: fields.password.secure,
  name: fields.name,
  token: z.string().optional(), // Invitation token
});

export const verifyEmailSchema = z.object({
  userId: fields.id.required,
  code: fields.id.required.describe('Verification code'),
});

export const twoFactorSchema = verifyEmailSchema;

export const toggleTwoFactorSchema = z.object({
  enabled: z.boolean(),
});

/**
 * Invitation Schemas
 */
export const inviteSchema = z.object({
  email: fields.email,
  name: fields.name,
  role: z.nativeEnum(Role),
  message: z.string().optional(),
});

/**
 * Help Request Schemas
 */
// Base schema for help request operations
const helpRequestBase = {
  helpRequestId: fields.id.required,
};

export const createHelpRequestSchema = z.object({
  title: fields.messages.standard,
  message: fields.messages.detailed,
});

export const createHelpResponseSchema = z.object({
  ...helpRequestBase,
  message: fields.messages.standard,
});

export const helpRequestStatusUpdateSchema = z.object({
  ...helpRequestBase,
  status: z.enum(['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'], {
    message: 'Status must be one of: OPEN, IN_PROGRESS, RESOLVED, CLOSED'
  }),
  operation: z.literal('updateStatus'),
});

export const helpRequestAssignSchema = z.object({
  ...helpRequestBase,
  operation: z.literal('assign'),
});

/**
 * Distributor and Installation Schemas
 */
export const createDistributorSchema = z.object({
  name: fields.name,
  price_per_kwh: z.number().positive({ message: 'Price per kWh must be a positive number' })
});

export const createInstallationSchema = z.object({
  installationNumber: z.string().min(5, { message: 'Installation number must be at least 5 characters long' }),
  type: z.enum(['GENERATOR', 'CONSUMER'], { message: 'Invalid installation type' }),
  distributorId: fields.id.cuid,
  ownerId: fields.id.cuid.optional(),
  addressId: fields.id.cuid.optional(),
});

/**
 * Address Schema
 */
export const createAddressSchema = z.object({
  street: z.string().min(1, { message: 'Street is required' }),
  number: z.string().min(1, { message: 'Number is required' }),
  complement: z.string().optional(),
  neighborhood: z.string().min(1, { message: 'Neighborhood is required' }),
  city: z.string().min(1, { message: 'City is required' }),
  state: z.string().min(2, { message: 'State is required' }),
  zip: z.string().min(1, { message: 'ZIP code is required' }),
  type: z.enum(['USER', 'INSTALLATION', 'DISTRIBUTOR']).optional(),
});
