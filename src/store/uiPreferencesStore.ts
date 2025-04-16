import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { ViewMode } from '@/components/ui/view-toggle';

// Define column filter type
export type ColumnFilter = {
  column: string;
  value: string | string[] | [Date | undefined, Date | undefined];
};

// Define sort direction type
export type SortDirection = 'asc' | 'desc' | undefined;

interface UiPreferencesState {
  // Invitation filters
  invitationsStatusFilter: string;
  invitationsRoleFilter: string;
  invitationsSearchText: string;
  invitationsSearchField: string;
  invitationsStartDate: Date | undefined;
  invitationsEndDate: Date | undefined;
  invitationsViewMode: ViewMode;
  invitationsSortColumn: string | undefined;
  invitationsSortDirection: SortDirection;
  invitationsColumnFilters: Record<string, any>;

  // Users table preferences
  usersStatusFilter: string;
  usersRoleFilter: string;
  usersViewMode: ViewMode;
  usersActiveTab: string;
  usersSortColumn: string | undefined;
  usersSortDirection: SortDirection;
  usersColumnFilters: Record<string, any>;
  
  // Installations table preferences
  installationsTypeFilter: string;
  installationsDistributorFilter: string;
  installationsSearchText: string;
  installationsSearchField: string;
  installationsCreationDate: Date | undefined;
  installationsUpdateDate: Date | undefined;
  installationsViewMode: ViewMode;
  installationsSortColumn: string | undefined;
  installationsSortDirection: SortDirection;
  installationsColumnFilters: Record<string, any>;
  
  // Actions for invitations page
  setInvitationsStatusFilter: (filter: string) => void;
  setInvitationsRoleFilter: (filter: string) => void;
  setInvitationsSearchText: (text: string) => void;
  setInvitationsSearchField: (field: string) => void;
  setInvitationsStartDate: (date: Date | undefined) => void;
  setInvitationsEndDate: (date: Date | undefined) => void;
  setInvitationsViewMode: (mode: ViewMode) => void;
  setInvitationsSortColumn: (column: string | undefined) => void;
  setInvitationsSortDirection: (direction: SortDirection) => void;
  setInvitationsColumnFilter: (column: string, value: any) => void;
  clearInvitationsColumnFilter: (column: string) => void;
  clearAllInvitationsColumnFilters: () => void;
  
  // Actions for users page
  setUsersStatusFilter: (filter: string) => void;
  setUsersRoleFilter: (filter: string) => void;
  setUsersViewMode: (mode: ViewMode) => void;
  setUsersActiveTab: (tab: string) => void;
  setUsersSortColumn: (column: string | undefined) => void;
  setUsersSortDirection: (direction: SortDirection) => void;
  setUsersColumnFilter: (column: string, value: any) => void;
  clearUsersColumnFilter: (column: string) => void;
  clearAllUsersColumnFilters: () => void;
  
  // Actions for installations page
  setInstallationsTypeFilter: (filter: string) => void;
  setInstallationsDistributorFilter: (filter: string) => void;
  setInstallationsSearchText: (text: string) => void;
  setInstallationsSearchField: (field: string) => void;
  setInstallationsCreationDate: (date: Date | undefined) => void;
  setInstallationsUpdateDate: (date: Date | undefined) => void;
  setInstallationsViewMode: (mode: ViewMode) => void;
  setInstallationsSortColumn: (column: string | undefined) => void;
  setInstallationsSortDirection: (direction: SortDirection) => void;
  setInstallationsColumnFilter: (column: string, value: any) => void;
  clearInstallationsColumnFilter: (column: string) => void;
  clearAllInstallationsColumnFilters: () => void;
}

export const useUiPreferencesStore = create<UiPreferencesState>()(
  persist(
    (set) => ({

      // installations page
      installationsTypeFilter: 'all',
      installationsDistributorFilter: 'all',
      installationsSearchText: '',
      installationsSearchField: 'number',
      installationsCreationDate: undefined,
      installationsUpdateDate: undefined,
      installationsViewMode: 'card',
      installationsSortColumn: undefined,
      installationsSortDirection: undefined,
      installationsColumnFilters: {},

      
      // Default values for invitations page
      invitationsStatusFilter: 'all',
      invitationsRoleFilter: 'all',
      invitationsSearchText: '',
      invitationsSearchField: 'email',
      invitationsStartDate: undefined,
      invitationsEndDate: undefined,
      invitationsViewMode: 'card',
      invitationsSortColumn: undefined,
      invitationsSortDirection: undefined,
      invitationsColumnFilters: {},
      
      // Default values for users page
      usersStatusFilter: 'all',
      usersRoleFilter: 'all',
      usersViewMode: 'table',
      usersActiveTab: 'todos',
      usersSortColumn: undefined,
      usersSortDirection: undefined,
      usersColumnFilters: {},

      // Actions for installations page
      setInstallationsTypeFilter: (filter: string) => set({ installationsTypeFilter: filter }),
      setInstallationsDistributorFilter: (filter: string) => set({ installationsDistributorFilter: filter }),
      setInstallationsSearchText: (text: string) => set({ installationsSearchText: text }),
      setInstallationsSearchField: (field: string) => set({ installationsSearchField: field }),
      setInstallationsCreationDate: (date: Date | undefined) => set({ installationsCreationDate: date }),
      setInstallationsUpdateDate: (date: Date | undefined ) => set({ installationsUpdateDate: date }),
      setInstallationsViewMode: (mode: ViewMode) => set({ installationsViewMode: mode }),
      setInstallationsSortColumn: (column: string | undefined) => set({ installationsSortColumn: column }),
      setInstallationsSortDirection: (direction: SortDirection) => set({ installationsSortDirection: direction }),
      setInstallationsColumnFilter: (column: string, value: any) => 
        set((state) => ({ 
          installationsColumnFilters: { 
            ...state.installationsColumnFilters, 
            [column]: value 
          } 
        })),
      clearInstallationsColumnFilter: (column: string) => 
        set((state) => {
          const newFilters = { ...state.installationsColumnFilters };
          delete newFilters[column];
          return { installationsColumnFilters: newFilters };
        }),
      clearAllInstallationsColumnFilters: () => 
        set({ installationsColumnFilters: {} }),
      
      // Actions for invitations page
      setInvitationsStatusFilter: (filter) => set({ invitationsStatusFilter: filter }),
      setInvitationsRoleFilter: (filter) => set({ invitationsRoleFilter: filter }),
      setInvitationsSearchText: (text) => set({ invitationsSearchText: text }),
      setInvitationsSearchField: (field) => set({ invitationsSearchField: field }),
      setInvitationsStartDate: (date) => set({ invitationsStartDate: date }),
      setInvitationsEndDate: (date) => set({ invitationsEndDate: date }),
      setInvitationsViewMode: (mode) => set({ invitationsViewMode: mode }),
      setInvitationsSortColumn: (column) => set({ invitationsSortColumn: column }),
      setInvitationsSortDirection: (direction) => set({ invitationsSortDirection: direction }),
      setInvitationsColumnFilter: (column, value) => 
        set((state) => ({ 
          invitationsColumnFilters: { 
            ...state.invitationsColumnFilters, 
            [column]: value 
          } 
        })),
      clearInvitationsColumnFilter: (column) => 
        set((state) => {
          const newFilters = { ...state.invitationsColumnFilters };
          delete newFilters[column];
          return { invitationsColumnFilters: newFilters };
        }),
      clearAllInvitationsColumnFilters: () => 
        set({ invitationsColumnFilters: {} }),
      
      // Actions for users page
      setUsersStatusFilter: (filter) => set({ usersStatusFilter: filter }),
      setUsersRoleFilter: (filter) => set({ usersRoleFilter: filter }),
      setUsersViewMode: (mode) => set({ usersViewMode: mode }),
      setUsersActiveTab: (tab) => set({ usersActiveTab: tab }),
      setUsersSortColumn: (column) => set({ usersSortColumn: column }),
      setUsersSortDirection: (direction) => set({ usersSortDirection: direction }),
      setUsersColumnFilter: (column, value) => 
        set((state) => ({ 
          usersColumnFilters: { 
            ...state.usersColumnFilters, 
            [column]: value 
          } 
        })),
      clearUsersColumnFilter: (column) => 
        set((state) => {
          const newFilters = { ...state.usersColumnFilters };
          delete newFilters[column];
          return { usersColumnFilters: newFilters };
        }),
      clearAllUsersColumnFilters: () => 
        set({ usersColumnFilters: {} }),
    }),
    {
      name: 'raas-ui-preferences',
      partialize: (state) => ({
        // Persist all invitations preferences
        invitationsStatusFilter: state.invitationsStatusFilter,
        invitationsRoleFilter: state.invitationsRoleFilter,
        invitationsSearchField: state.invitationsSearchField,
        invitationsViewMode: state.invitationsViewMode,
        invitationsSortColumn: state.invitationsSortColumn,
        invitationsSortDirection: state.invitationsSortDirection,
        invitationsColumnFilters: state.invitationsColumnFilters,
        
        // Don't persist search text and dates to avoid unintended filtering on refresh
        
        // Users preferences
        usersViewMode: state.usersViewMode,
        usersActiveTab: state.usersActiveTab,
        usersSortColumn: state.usersSortColumn,
        usersSortDirection: state.usersSortDirection,
        usersColumnFilters: state.usersColumnFilters,

        // Installations preferences
        installationsTypeFilter: state.installationsTypeFilter,
        installationsDistributorFilter: state.installationsDistributorFilter,
        installationsViewMode: state.installationsViewMode,
        installationsSortColumn: state.installationsSortColumn,
        installationsSortDirection: state.installationsSortDirection,
        installationsColumnFilters: state.installationsColumnFilters,
      }),
    }
  )
); 