import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale/pt-BR';
import { Role } from '@prisma/client';

// Types
export type User = {
  id: string;
  name: string | null;
  email: string;
  role: string;
  emailVerified: Date | null;
  image: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type Invitation = {
  id: string;
  email: string;
  name: string | null;
  role: string;
  status: string; // "PENDING", "ACCEPTED", "REVOKED", "EXPIRED", "RESENT"
  token: string;
  message?: string;
  createdAt: Date;
  updatedAt: Date;
  expiresAt: Date;
  createdBy?: string; // Name of the admin who created the invitation
  senderId?: string; // ID of the user who sent the invitation
  sender?: {
    id?: string;
    name?: string;
    email?: string;
  }; // User who sent the invitation
};

interface UserManagementState {
  // Users state
  users: User[];
  usersLoading: boolean;
  usersError: string | null;
  lastUsersFetch: number | null;
  
  // Invitations state
  invitations: Invitation[];
  invitationsLoading: boolean;
  invitationsError: string | null;
  lastInvitationsFetch: number | null;
  
  // Actions
  fetchUsers: () => Promise<void>;
  fetchInvitations: () => Promise<void>;
  createInvitation: (data: { email: string; name?: string; role: string; message?: string; createdBy?: string }) => Promise<void>;
  updateInvitation: (id: string, data: { email?: string; name?: string; role?: string; message?: string; resend?: boolean; createdBy?: string }) => Promise<void>;
  deleteUser: (userId: string) => Promise<void>;
  clearErrors: () => void;
  
  // Utility functions
  formatDate: (date: Date | string | number) => string;
  getRoleBadgeVariant: (role: string) => "default" | "secondary" | "destructive" | "outline" | "success";
  getRoleLabel: (role: string) => string;
  getStatusBadgeVariant: (status: string) => "warning" | "success" | "destructive" | "outline" | "secondary" | "default";
  
  // New methods
  revokeInvitation: (id: string) => Promise<void>;
  deleteInvitation: (id: string) => Promise<boolean>;
  resendInvitation: (invitation: Invitation, createdBy?: string) => Promise<void>;
  deleteInvitations: (ids: string[]) => Promise<number>;
}

// Cache expiration time: 15 minutes
const CACHE_EXPIRATION = 15 * 60 * 1000;

// Store a timestamp for the last request start to throttle calls
let lastFetchUsersRequestStartedAt = 0;

// Create the store
export const useUserManagementStore = create<UserManagementState>()(
  persist(
    (set, get) => ({
      // Initial state
      users: [],
      usersLoading: false,
      usersError: null,
      lastUsersFetch: null,
      
      invitations: [],
      invitationsLoading: false,
      invitationsError: null,
      lastInvitationsFetch: null,
      
      // Fetch users with throttling to prevent multiple calls
      fetchUsers: async () => {
        // Get current state
        const { lastUsersFetch, users, usersLoading } = get();
        const now = Date.now();
        
        // Don't fetch if we're already loading
        if (usersLoading) return;
        
        // Don't fetch if we've already fetched recently (throttling)
        if (now - lastFetchUsersRequestStartedAt < 1000) {
          // Recently started a request, skip this one
          return;
        }
        
        // Check if cache is valid
        if (
          lastUsersFetch && 
          now - lastUsersFetch < CACHE_EXPIRATION && 
          users.length > 0
        ) {
          // Cache is valid, use existing data
          return;
        }
        
        // Record that we're starting a request
        lastFetchUsersRequestStartedAt = now;
        
        // Set loading state
        set({ usersLoading: true, usersError: null });
        
        // Retry configuration
        const maxRetries = 3;
        let retryCount = 0;
        
        while (retryCount < maxRetries) {
          try {
            const response = await fetch("/api/users", {
              cache: 'no-store', // Prevent caching
            });
            
            if (!response.ok) {
              const errorData = await response.json();
              throw new Error(errorData.message || "Erro ao buscar usuários");
            }
            
            const data = await response.json();
            
            set({ 
              users: data.users, 
              usersLoading: false, 
              lastUsersFetch: now 
            });
            
            // Success, exit retry loop
            return;
          } catch (error) {
            retryCount++;
            
            // Specific handling for network connectivity issues
            if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
              console.error('Erro de conexão ao buscar usuários', { 
                error, 
                retry: `${retryCount}/${maxRetries}` 
              });
              
              // Only set error if we've exhausted all retries
              if (retryCount >= maxRetries) {
                const errorMessage = 'Erro de conexão com o servidor. Verifique sua conexão com a internet.';
                
                set({ 
                  usersLoading: false, 
                  usersError: errorMessage
                });
              } else {
                // Wait before retrying (exponential backoff)
                await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, retryCount)));
              }
            } else {
              // For other types of errors, log and set error state immediately
              const errorMessage = error instanceof Error ? error.message : "Erro desconhecido";
              
              set({ 
                usersLoading: false, 
                usersError: errorMessage
              });
              
              // Don't retry for non-network errors
              break;
            }
          }
        }
      },
      
      // Fetch invitations with caching
      fetchInvitations: async () => {
        const { lastInvitationsFetch, invitations } = get();
        const now = Date.now();
        
        // Return cached data if it's still valid and we have data
        if (
          lastInvitationsFetch && 
          now - lastInvitationsFetch < CACHE_EXPIRATION && 
          invitations.length > 0
        ) {
          return;
        }
        
        // If already loading, don't start another request
        if (get().invitationsLoading) return;
        
        try {
          set({ invitationsLoading: true, invitationsError: null });
          const response = await fetch("/api/invite");
          
          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || "Erro ao buscar convites");
          }
          
          const data = await response.json();
          set({ 
            invitations: data.invitations || [], 
            invitationsLoading: false, 
            lastInvitationsFetch: now 
          });
        } catch (error) {
          set({ 
            invitationsLoading: false, 
            invitationsError: error instanceof Error ? error.message : "Erro desconhecido"
          });
          throw error;
        }
      },
      
      // Create invitation
      createInvitation: async (data) => {
        try {
          const response = await fetch("/api/invite", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(data),
          });
          
          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || "Erro ao criar convite");
          }
          
          const responseData = await response.json();
          const newInvitation = responseData.invitation;
          
          // Optimistically update the state
          set((state) => ({
            invitations: [...state.invitations, newInvitation],
          }));

          // Return the new invitation for possible use by caller
          return newInvitation;
        } catch (error) {
          throw error;
        }
      },
      
      // Update invitation
      updateInvitation: async (id, data) => {
        try {
          const response = await fetch("/api/invite", {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              id,
              ...data
            }),
          });
          
          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || "Erro ao atualizar convite");
          }
          
          const responseData = await response.json();
          const updatedInvitation = responseData.invitation;
          
          // Update the state with the modified invitation
          set((state) => ({
            invitations: state.invitations.map((invitation) => 
              invitation.id === id ? updatedInvitation : invitation
            ),
          }));

          // Refresh invitations to ensure we have the latest data
          get().fetchInvitations();
          
          // Return the updated invitation for possible use by caller
          return updatedInvitation;
        } catch (error) {
          throw error;
        }
      },
      
      // Revoke invitation
      revokeInvitation: async (id) => {
        try {
          const response = await fetch("/api/invite", {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ id }),
          });
          
          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || "Erro ao revogar convite");
          }
          
          const responseData = await response.json();
          const revokedInvitation = responseData.invitation;
          
          // Update the state with the revoked invitation
          set((state) => ({
            invitations: state.invitations.map((invitation) => 
              invitation.id === id ? revokedInvitation : invitation
            ),
          }));

          // Refresh invitations to ensure we have the latest data
          get().fetchInvitations();
          
          return revokedInvitation;
        } catch (error) {
          throw error;
        }
      },
      
      // Delete invitation
      deleteInvitation: async (id) => {
        try {
          const response = await fetch(`/api/invite?id=${id}`, {
            method: "DELETE",
          });
          
          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || "Erro ao excluir convite");
          }
          
          // Remove the invitation from state
          set((state) => ({
            invitations: state.invitations.filter((invitation) => invitation.id !== id),
          }));
          
          return true;
        } catch (error) {
          throw error;
        }
      },
      
      // Delete user
      deleteUser: async (userId) => {
        try {
          const response = await fetch(`/api/users/${userId}`, {
            method: "DELETE",
          });
          
          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || "Erro ao excluir usuário");
          }
          
          // Optimistically update the state
          set((state) => ({
            users: state.users.filter((user) => user.id !== userId),
          }));
        } catch (error) {
          throw error;
        }
      },
      
      // Clear errors
      clearErrors: () => {
        set({ usersError: null, invitationsError: null });
      },
      
      // Format date helper
      formatDate: (date) => {
        if (!date) return "";
        return format(new Date(date), "dd 'de' MMM 'de' yyyy", { locale: ptBR });
      },
      
      // Get badge variant for a role
      getRoleBadgeVariant: (role) => {
        switch (role.toUpperCase()) {
          case "SUPER_ADMIN":
            return "destructive";
          case "ADMIN":
            return "secondary";
          case "CUSTOMER":
            return "default";
          case "ENERGY_RENTER":
            return "success";
          default:
            return "outline";
        }
      },
      
      // Get human-readable label for a role
      getRoleLabel: (role) => {
        switch (role.toUpperCase()) {
          case "SUPER_ADMIN":
            return "Super Admin";
          case "ADMIN":
            return "Admin";
          case "ADMIN_STAFF":
            return "Admin Staff";
          case "CUSTOMER":
            return "Cliente";
          case "ENERGY_RENTER":
            return "Locador";
          default:
            return role;
        }
      },
      
      // Get badge variant for a status
      getStatusBadgeVariant: (status) => {
        switch (status.toUpperCase()) {
          case "PENDING":
            return "warning";
          case "ACCEPTED":
            return "success";
          case "REVOKED":
            return "destructive";
          case "EXPIRED":
            return "outline";
          case "RESENT":
            return "secondary";
          default:
            return "default";
        }
      },
      
      // Resend invitation
      resendInvitation: async (invitation, createdBy) => {
        try {
          const response = await fetch("/api/invite/resend", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              invitationId: invitation.id,
              createdBy: createdBy || get().users[0].name
            }),
          });
          
          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || "Erro ao reenviar convite");
          }
          
          const responseData = await response.json();
          const updatedInvitation = responseData.invitation;
          
          // Update the state with the modified invitation
          set((state) => ({
            invitations: state.invitations.map((invitation) => 
              invitation.id === updatedInvitation.id ? updatedInvitation : invitation
            ),
          }));

          // Refresh invitations to ensure we have the latest data
          get().fetchInvitations();
          
          return updatedInvitation;
        } catch (error) {
          throw error;
        }
      },
      
      // Bulk delete invitations
      deleteInvitations: async (ids) => {
        try {
          const response = await fetch(`/api/invite?ids=${ids.join(',')}`, {
            method: "DELETE",
          });
          
          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || "Erro ao excluir convites");
          }
          
          const result = await response.json();
          
          // Remove the invitations from state
          set((state) => ({
            invitations: state.invitations.filter((invitation) => !ids.includes(invitation.id)),
          }));
          
          return result.count;
        } catch (error) {
          throw error;
        }
      }
    }),
    {
      name: "raas-user-management",
      partialize: (state) => ({
        // Only persist the last fetch time and any needed references
        lastUsersFetch: state.lastUsersFetch,
        lastInvitationsFetch: state.lastInvitationsFetch,
      }),
    }
  )
); 