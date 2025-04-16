import { create } from 'zustand';
import { User, UserWithDetailsDto } from '@/lib/types/app-types';
import { useAuthStore } from './authStore';

interface UserStore {
  // Estado
  userDetails: UserWithDetailsDto | null;
  usersListing: User[];
  selectedUser: UserWithDetailsDto | null;
  isLoading: boolean;
  error: string | null;
  
  // Ações
  fetchUserDetails: () => Promise<void>;
  fetchUsersList: () => Promise<void>;
  fetchUserById: (userId: string) => Promise<void>;
  updateUser: (userId: string, data: Partial<User>) => Promise<void>;
  inviteUser: (email: string, role: string) => Promise<void>;
  clearError: () => void;
}

export const useUserStore = create<UserStore>((set, get) => ({
  userDetails: null,
  usersListing: [],
  selectedUser: null,
  isLoading: false,
  error: null,

  fetchUserDetails: async () => {
    const authState = useAuthStore.getState();
    if (!authState.token || !authState.isAuthenticated) {
      set({ error: 'Usuário não autenticado' });
      return;
    }

    try {
      set({ isLoading: true, error: null });
      const response = await fetch('/api/users/me', {
        headers: {
          Authorization: `Bearer ${authState.token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Falha ao carregar detalhes do usuário');
      }

      const userDetails = await response.json();
      set({ userDetails, isLoading: false });
    } catch (error) {
      console.error('Error fetching user details:', error);
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido ao carregar detalhes',
      });
    }
  },

  fetchUsersList: async () => {
    const authState = useAuthStore.getState();
    if (!authState.token || !authState.isAuthenticated) {
      set({ error: 'Usuário não autenticado' });
      return;
    }

    try {
      set({ isLoading: true, error: null });
      const response = await fetch('/api/users', {
        headers: {
          Authorization: `Bearer ${authState.token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Falha ao carregar lista de usuários');
      }

      const users = await response.json();
      set({ usersListing: users, isLoading: false });
    } catch (error) {
      console.error('Error fetching users list:', error);
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido ao carregar usuários',
      });
    }
  },

  fetchUserById: async (userId: string) => {
    const authState = useAuthStore.getState();
    if (!authState.token || !authState.isAuthenticated) {
      set({ error: 'Usuário não autenticado' });
      return;
    }

    try {
      set({ isLoading: true, error: null });
      const response = await fetch(`/api/users/${userId}`, {
        headers: {
          Authorization: `Bearer ${authState.token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Falha ao carregar dados do usuário');
      }

      const user = await response.json();
      set({ selectedUser: user, isLoading: false });
    } catch (error) {
      console.error('Error fetching user by ID:', error);
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido ao carregar usuário',
      });
    }
  },

  updateUser: async (userId: string, data: Partial<User>) => {
    const authState = useAuthStore.getState();
    if (!authState.token || !authState.isAuthenticated) {
      set({ error: 'Usuário não autenticado' });
      return;
    }

    try {
      set({ isLoading: true, error: null });
      const response = await fetch(`/api/users/${userId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authState.token}`,
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Falha ao atualizar usuário');
      }

      const updatedUser = await response.json();
      
      // Se for o usuário logado, atualiza os detalhes
      const currentUserDetails = get().userDetails;
      if (currentUserDetails && currentUserDetails.id === userId) {
        set({ userDetails: { ...currentUserDetails, ...updatedUser } });
      }
      
      // Se for o usuário selecionado, atualiza os dados
      const currentSelectedUser = get().selectedUser;
      if (currentSelectedUser && currentSelectedUser.id === userId) {
        set({ selectedUser: { ...currentSelectedUser, ...updatedUser } });
      }
      
      // Atualiza a lista de usuários
      const updatedList = get().usersListing.map(user => 
        user.id === userId ? { ...user, ...updatedUser } : user
      );
      
      set({ usersListing: updatedList, isLoading: false });
    } catch (error) {
      console.error('Error updating user:', error);
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido ao atualizar usuário',
      });
    }
  },

  inviteUser: async (email: string, role: string) => {
    const authState = useAuthStore.getState();
    if (!authState.token || !authState.isAuthenticated) {
      set({ error: 'Usuário não autenticado' });
      return;
    }

    try {
      set({ isLoading: true, error: null });
      const response = await fetch('/api/invite', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authState.token}`,
        },
        body: JSON.stringify({ email, role }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Falha ao enviar convite');
      }

      set({ isLoading: false });
    } catch (error) {
      console.error('Error inviting user:', error);
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido ao enviar convite',
      });
    }
  },

  clearError: () => set({ error: null }),
})); 