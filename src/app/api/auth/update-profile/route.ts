// src/app/api/auth/update-profile/route.ts
import { NextRequest, NextResponse } from 'next/server';
import log from '@/lib/logs/logger';
import { prisma } from '@/lib/db/db';
import { z } from 'zod';
import { validateRequestBody, validateAuthentication, createErrorResponse } from '@/lib/validators/validators';
import { getUserFromRequest } from '@/lib/utils/utils';
import { User as PrismaUser, Document, Address, Contact } from '@prisma/client'; // Import necessary types

// Updated schema to match the UserProfile component
const profileUpdateSchema = z.object({
  fullName: z.string().min(3, { message: 'Nome deve ter pelo menos 3 caracteres' }).optional(),
  avatarUrl: z.string().url("URL inválida").optional(),
  phones: z.array(
    z.object({
      phone: z.string().min(10, { message: 'Telefone deve ter pelo menos 10 dígitos' }),
      isPrimary: z.boolean().default(true)
    })
  ).optional(),
  // Documents (Allow update but don't include email/cpf directly if changed)
  cpf: z.string().regex(/^\d{11}$/, "CPF deve ter 11 dígitos").optional(), // Validation remains, but handling changes
  cnpj: z.string().regex(/^\d{14}$/, "CNPJ deve ter 14 dígitos").optional(),
  rg: z.string().optional(),
  // Address
  postalCode: z.string().optional(),
  street: z.string().optional(),
  number: z.string().optional(),
  complement: z.string().optional(),
  neighborhood: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  // Email (Validation remains, but handling changes)
  email: z.string().email("Email inválido").optional(),
  // Profile completed flag might still be sent, especially on first update
  profileCompleted: z.boolean().optional(),
});


export async function PUT(request: NextRequest) {
  log.info('[API Profile Update] Received request');

  const authCheck = validateAuthentication(request);
  if (!authCheck.isAuthenticated) {
    return authCheck.errorResponse;
  }

  // Validate request body using the updated schema
  const validation = await validateRequestBody(
    request,
    profileUpdateSchema, // Use the updated schema
    'Profile update validation'
  );

  if (!validation.success) {
    return validation.error;
  }

  try {
    const { userId } = getUserFromRequest(request);
    const profileData = validation.data;
    
    log.debug('[API Profile Update] Processing update', { userId, fields: Object.keys(profileData) });

    // Fetch current user data to check for sensitive changes
    const currentUser = await prisma.user.findUnique({
      where: { id: userId as string },
      include: { document: true, address: true, contact: true }
    });

    if (!currentUser) {
        log.error('[API Profile Update] User not found', { userId });
        return createErrorResponse('Usuário não encontrado', 404);
    }

    // Check for sensitive changes (Email, CPF)
    const sensitiveChanges: string[] = [];
    if (profileData.email && profileData.email !== currentUser.email) {
        sensitiveChanges.push('Email');
        log.warn('[API Profile Update] Sensitive change detected: Email', { userId });
        // Remove email from data to prevent update via this route
        delete profileData.email;
    }
    if (profileData.cpf && profileData.cpf !== currentUser.document?.cpf) {
        sensitiveChanges.push('CPF');
        log.warn('[API Profile Update] Sensitive change detected: CPF', { userId });
        // Remove CPF from data to prevent update via this route
        delete profileData.cpf;
    }

    // Handle the update within a transaction
    const updatedUser = await prisma.$transaction(async (tx) => {
        let documentId = currentUser.documentId;
        let addressId = currentUser.addressId;
        let contactId = currentUser.contactId;

        // --- Update/Create Document --- (Excluding CPF if changed)
        const documentUpdateData: { cnpj?: string; rg?: string } = {};
        if (profileData.cnpj !== undefined) documentUpdateData.cnpj = profileData.cnpj;
        if (profileData.rg !== undefined) documentUpdateData.rg = profileData.rg;

        if (Object.keys(documentUpdateData).length > 0) {
            if (documentId) {
                await tx.document.update({ where: { id: documentId }, data: documentUpdateData });
                log.debug('[API Profile Update] Updated existing document', { userId, documentId });
            } else {
                // Create new document only if non-sensitive fields are provided
                const newDocument = await tx.document.create({ data: documentUpdateData });
                documentId = newDocument.id;
                log.debug('[API Profile Update] Created new document', { userId, documentId });
            }
        } else if (!documentId && (profileData.cnpj || profileData.rg)) {
             // Case where user had no document, but provided non-sensitive fields
             const newDocument = await tx.document.create({ data: documentUpdateData });
             documentId = newDocument.id;
             log.debug('[API Profile Update] Created new document (initial non-sensitive)', { userId, documentId });
        }

        // --- Update/Create Address --- (If any address field is present)
        const addressFields = ['postalCode', 'street', 'number', 'complement', 'neighborhood', 'city', 'state'];
        const hasAddressData = addressFields.some(field => profileData[field as keyof typeof profileData] !== undefined);

        if (hasAddressData) {
             const addressUpdateData = {
                street: profileData.street ?? currentUser.address?.street ?? "",
                number: profileData.number ?? currentUser.address?.number ?? "",
                complement: profileData.complement ?? currentUser.address?.complement,
                neighborhood: profileData.neighborhood ?? currentUser.address?.neighborhood ?? "",
                city: profileData.city ?? currentUser.address?.city ?? "",
                state: profileData.state ?? currentUser.address?.state ?? "",
                zip: profileData.postalCode ?? currentUser.address?.zip ?? "",
                type: "USER" as const, // Ensure type is always USER
            };

            if (addressId) {
                await tx.address.update({ where: { id: addressId }, data: addressUpdateData });
                log.debug('[API Profile Update] Updated existing address', { userId, addressId });
            } else {
                const newAddress = await tx.address.create({ data: addressUpdateData });
                addressId = newAddress.id;
                log.debug('[API Profile Update] Created new address', { userId, addressId });
            }
        }

        // --- Update/Create Contact --- (Handling phone numbers)
        const primaryPhone = profileData.phones?.[0]?.phone;
        if (primaryPhone !== undefined || (currentUser.contact && primaryPhone !== currentUser.contact.phones?.[0])) {
             const contactUpdateData = {
                phones: primaryPhone ? [primaryPhone] : [],
                emails: [currentUser.email], // Keep original email
             };

            if (contactId) {
                 await tx.contact.update({ where: { id: contactId }, data: contactUpdateData });
                 log.debug('[API Profile Update] Updated existing contact', { userId, contactId });
            } else if (primaryPhone) { // Only create if phone is provided
                const newContact = await tx.contact.create({ data: contactUpdateData });
                contactId = newContact.id;
                log.debug('[API Profile Update] Created new contact', { userId, contactId });
            }
        }

        // --- Update User Record --- (Name, Avatar, Flags, Links)
        const userUpdateData: { name?: string; avatarUrl?: string; documentId?: string | null; addressId?: string | null; contactId?: string | null; profileCompleted?: boolean } = {};
        if (profileData.fullName !== undefined) userUpdateData.name = profileData.fullName;
        if (profileData.avatarUrl !== undefined) userUpdateData.avatarUrl = profileData.avatarUrl;
        if (documentId !== currentUser.documentId) userUpdateData.documentId = documentId;
        if (addressId !== currentUser.addressId) userUpdateData.addressId = addressId;
        if (contactId !== currentUser.contactId) userUpdateData.contactId = contactId;

        // Always mark profile as completed if it wasn't already, or if flag is explicitly sent
        if (!currentUser.profileCompleted || profileData.profileCompleted === true) {
             userUpdateData.profileCompleted = true;
             log.debug('[API Profile Update] Setting profileCompleted to true', { userId });
        }

        // Only update user if there are changes
        if (Object.keys(userUpdateData).length > 0) {
            log.debug('[API Profile Update] Updating user record', { userId, fields: Object.keys(userUpdateData) });
            return tx.user.update({
                where: { id: userId as string },
                data: userUpdateData,
                include: { document: true, address: true, contact: true }
            });
        } else {
             log.debug('[API Profile Update] No direct user fields changed, returning current user data', { userId });
             // Need to fetch again within the transaction to get potentially updated relations
              return tx.user.findUnique({
                  where: { id: userId as string },
                  include: { document: true, address: true, contact: true }
              });
        }
    });

    // Ensure updatedUser is not null before proceeding
     if (!updatedUser) {
        log.error('[API Profile Update] Transaction failed or returned null user', { userId });
        return createErrorResponse('Erro interno ao atualizar perfil (transação falhou)', 500);
    }

    // Add type assertion for clarity
    type UpdatedUserWithRelations = PrismaUser & {
        document: Document | null;
        address: Address | null;
        contact: Contact | null;
    };
    const typedUpdatedUser = updatedUser as UpdatedUserWithRelations;

    log.info('[API Profile Update] Profile updated successfully', { userId });

    // Prepare response data using the typed variable
    const responsePayload = {
        id: typedUpdatedUser.id,
        name: typedUpdatedUser.name,
        email: typedUpdatedUser.email, // Return current email (sensitive changes handled by support)
        avatarUrl: (typedUpdatedUser as any).avatarUrl || null, // Use type assertion to bypass TS check
        profileCompleted: typedUpdatedUser.profileCompleted,
        // Make sure nested objects are included
        document: typedUpdatedUser.document ? {
            id: typedUpdatedUser.document.id,
            cpf: typedUpdatedUser.document.cpf,
            cnpj: typedUpdatedUser.document.cnpj,
            rg: typedUpdatedUser.document.rg
        } : null,
        address: typedUpdatedUser.address ? {
            id: typedUpdatedUser.address.id,
            street: typedUpdatedUser.address.street,
            number: typedUpdatedUser.address.number,
            complement: typedUpdatedUser.address.complement,
            neighborhood: typedUpdatedUser.address.neighborhood,
            city: typedUpdatedUser.address.city,
            state: typedUpdatedUser.address.state,
            zip: typedUpdatedUser.address.zip
        } : null,
        contact: typedUpdatedUser.contact ? {
            id: typedUpdatedUser.contact.id,
            phones: typedUpdatedUser.contact.phones,
            emails: typedUpdatedUser.contact.emails
        } : null,
    };

    // Include warning message if sensitive changes were attempted
    let message = 'Perfil atualizado com sucesso';
    if (sensitiveChanges.length > 0) {
        message += `. Alterações em ${sensitiveChanges.join(' e ')} requerem contato com o suporte.`;
    }

    return NextResponse.json({
      success: true,
      message: message,
      user: responsePayload,
      // No need to return token unless it needs refreshing
    }, { status: 200 });

  } catch (error: any) {
    log.error('[API Profile Update] Error updating profile', { userId: (getUserFromRequest(request) || {}).userId, error: error?.message || 'Unknown error' });
    // Check for specific errors, e.g., unique constraint violations
    if (error.code === 'P2002') { // Prisma unique constraint violation
        return createErrorResponse('Erro: Informação duplicada (ex: CPF/CNPJ já existe).', 409);
    }
    return createErrorResponse('Erro interno ao atualizar perfil', 500);
  }
}
