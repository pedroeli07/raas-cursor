// Exportar todas as stores para facilitar importação
export { useAuthStore } from './authStore';
export { useUserStore } from './userStore';
export { useNotificationStore } from './notificationStore';
export { useInstallationStore } from './installationStore';
export { useDistributorStore } from './distributorStore';
export { useInvoiceStore } from './invoiceStore';
export { useAllocationStore } from './allocationStore';
export { useCemigDataStore } from './cemigDataStore';
export { useDashboardStore } from './dashboardStore';
export { useAppSettingsStore } from './appSettingsStore';

// Tipos adicionais que podem ser úteis
export type { AuthState } from './authStore';
export type { AppSetting } from './appSettingsStore'; 