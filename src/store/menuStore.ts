import { create } from 'zustand';
import { MenuSection, UserRole } from '@/components/global/sidebar/menu-config';
import { getMenuSections } from '@/components/global/sidebar/menu-config';
import { logger } from '@/utils/logger';
import { User } from '@/lib/types/app-types';

interface MenuState {
  // Menu data cache by role
  menuCache: Record<UserRole, MenuSection[]>;
  // Last loaded role
  currentRole: UserRole | null;
  // Expanded menu items state
  expandedItems: Record<string, boolean>;
  // Current user
  user: User | null;
  
  // Actions
  getMenuForRole: (role: UserRole, user: User) => MenuSection[];
  setCurrentRole: (role: UserRole) => void;
  toggleSubMenu: (path: string) => void;
  resetExpandedItems: () => void;
  setUser: (user: User) => void;
}

export const useMenuStore = create<MenuState>((set, get) => ({
  // Initialize empty cache
  menuCache: {} as Record<UserRole, MenuSection[]>,
  currentRole: null,
  expandedItems: {},
  user: null,
  
  // Get menu sections for a role (from cache or generate new)
  getMenuForRole: (role: UserRole, user: User) => {
    const { menuCache } = get();
    
    // If we have this role cached, return from cache
    if (menuCache[role]) {
      logger.debug(`Using cached menu for role: ${role}`);
      return menuCache[role];
    }
    
    // Generate menu for this role and cache it
    logger.info(`Generating menu for user: ${user?.email || 'unknown'} and role: ${role}`);
    const menuSections = getMenuSections(role);
    
    // Update the cache
    set(state => ({
      menuCache: {
        ...state.menuCache,
        [role]: menuSections
      },
      currentRole: role
    }));
    
    return menuSections;
  },
  
  // Set current role
  setCurrentRole: (role: UserRole) => {
    // Only update if role changed
    if (get().currentRole !== role) {
      set({ currentRole: role });
      // Ensure menu for this role is cached
      const currentUser = get().user;
      if (currentUser) {
        get().getMenuForRole(role, currentUser);
      }
    }
  },
  
  // Set current user
  setUser: (user: User) => {
    set({ user });
  },
  
  // Toggle submenu expanded state
  toggleSubMenu: (path: string) => {
    set(state => ({
      expandedItems: {
        ...state.expandedItems,
        [path]: !state.expandedItems[path]
      }
    }));
  },
  
  // Reset expanded items
  resetExpandedItems: () => {
    set({ expandedItems: {} });
  }
})); 