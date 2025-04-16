import { InstallationType } from '@prisma/client';

/**
 * Types for energy rates used in invoice calculations
 */
export interface EnergyRates {
  // Rate charged by the energy distributor (CEMIG in this case)
  cemigRate: number;
  
  // Discount applied to the customer (percentage in decimal form, e.g., 0.20 for 20%)
  discount: number;
  
  // Final rate after discount is applied
  billedRate: number;

  // Optional rate breakdowns
  peakRate?: number;
  offPeakRate?: number;
  publicLightingTax?: number;
  
  // Optional tax information
  taxes?: {
    icms: number;
    pis: number;
    cofins: number;
  };
}

/**
 * Interface for installation information in invoices
 */
export interface InstallationInfo {
  id: string;
  name?: string;
  type: 'geradora' | 'consumidora';
  quota: number;
  installationNumber?: string;
}

/**
 * Technical information for each installation in the invoice
 */
export interface TechnicalInfo {
  reference: string;
  installation: string;
  consumption: number;
  compensation: number;
  reception: number;
  currentBalance: number;
  amount: number;
}

/**
 * Historical energy data for visualization
 */
export interface EnergyHistoryItem {
  period: string;
  consumption: number;
  compensation: number;
}

/**
 * Calculation details for the invoice
 */
export interface InvoiceCalculation {
  // Total energy consumed in kWh
  totalConsumption: number;
  
  // Total energy compensated in kWh
  totalCompensation: number;
  
  // Original amount that would be charged without solar
  originalAmount: number;
  
  // Amount compensated due to solar generation
  compensatedAmount: number;
  
  // Final amount to be paid after compensation
  finalAmount: number;
  
  // Amount saved by using solar energy
  savedAmount: number;
  
  // CO2 emissions avoided (in kg)
  co2Avoided: number;
  
  // Additional properties for detailed breakdowns
  peakConsumption?: number;
  offPeakConsumption?: number;
  previousBalance?: number;
  currentBalance?: number;
}

/**
 * Client information for the invoice
 */
export interface ClientInfo {
  id: string;
  name: string;
  address?: string;
}

/**
 * Period information for the invoice
 */
export interface PeriodInfo {
  reference: string;  // Month/Year (e.g., "04/2025")
  start: Date;
  end: Date;
  dueDate?: string;   // Optional due date string
}

/**
 * Complete invoice data structure
 */
export interface InvoiceData {
  // Invoice identification
  id: string;
  invoiceNumber: string;
  
  // Client information
  client: ClientInfo;
  
  // Period information
  period: PeriodInfo;
  
  // Due date for payment
  dueDate: string;
  
  // Energy rates applied
  rates: EnergyRates;
  
  // Installations included in this invoice
  installations: InstallationInfo[];
  
  // Technical information for each installation
  technicalInfo: TechnicalInfo[];
  
  // Historical energy data for visualization
  history: EnergyHistoryItem[];
  
  // Calculation details
  calculation: InvoiceCalculation;
  
  // Status of the invoice
  status: 'pending' | 'paid' | 'overdue' | 'canceled';
  
  // Payment information
  paymentInfo?: {
    paidAt?: Date;
    paymentMethod?: string;
    transactionId?: string;
  };
} 