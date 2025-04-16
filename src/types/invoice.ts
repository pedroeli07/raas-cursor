/**
 * Types for invoice-related data structures
 */

import { INVOICE_STATUS } from "@/lib/constants/invoice";

export interface Customer {
  id: string
  name: string
  email: string
  address: string
  documentNumber: string // CPF or CNPJ
}

export interface Installation {
  id: string
  installationNumber: string
  distributor: Distributor
  type: 'consumer' | 'generator'
  address?: string
}

export interface Distributor {
  id: string
  name: string
  baseRate: number // R$/kWh
}

export interface InvoiceCalculation {
  originalValue: number; // Value without discount
  invoiceAmount: number; // Final amount to be paid
  savingsAmount: number; // Amount saved with discount
  savingsPercentage: number; // Percentage saved
  distributorRate: number; // Original rate
  effectiveRate: number; // Rate after discount
}

export interface InvoiceEnvironmentalImpact {
  carbonSavings: number; // CO2 savings in kg
  treesEquivalent: number; // Equivalent number of trees that would absorb the same CO2
  energySavingsKwh: number; // Energy savings in kWh
}

export interface Invoice {
  id: string;
  customerId: string;
  customerName: string;
  installationId: string;
  installationNumber: string;
  distributorId: string;
  distributorName: string;
  
  // Invoice details
  invoiceNumber: string;
  referenceMonth: string; // Format: "MM/YYYY"
  issueDate: Date;
  dueDate: Date;
  status: typeof INVOICE_STATUS[keyof typeof INVOICE_STATUS];
  
  // Energy information
  consumptionKwh: number;
  distributorRate: number; // Rate per kWh from distributor
  discountPercentage: number;
  effectiveRate: number; // Rate after discount
  
  // Technical information
  previousRead?: number;
  currentRead?: number;
  compensation?: number;
  remainingCredits?: number;
  
  // Amount information
  originalValue: number; // Value without discount
  invoiceAmount: number; // Final amount to be paid
  savingsAmount: number; // Amount saved with discount
  
  // Payment information
  isPaid: boolean;
  paymentDate?: Date;
  paymentMethod?: string;
  barcode: string;
  qrCode: string;
  
  // Environmental impact
  environmentalImpact: InvoiceEnvironmentalImpact;
  
  // Metadata
  createdAt: Date;
  updatedAt: Date;
}

// Used for chart/history display
export interface InvoiceHistoryItem {
  month: string // YYYY-MM
  consumption: number
  compensation: number
  originalValue: number
  invoiceAmount: number
  savingsPercentage: number
}

export interface InvoiceHistory {
  referenceMonth: string;
  consumptionKwh: number;
  invoiceAmount: number;
  status: typeof INVOICE_STATUS[keyof typeof INVOICE_STATUS];
}

export interface InvoiceFilters {
  customerId?: string;
  status?: typeof INVOICE_STATUS[keyof typeof INVOICE_STATUS];
  startDate?: Date;
  endDate?: Date;
  distributorId?: string;
  installationId?: string;
}

export interface InvoicePreview {
  id: string;
  customerName: string;
  referenceMonth: string;
  dueDate: Date;
  invoiceAmount: number;
  status: typeof INVOICE_STATUS[keyof typeof INVOICE_STATUS];
  isPaid: boolean;
} 