/* eslint-disable @typescript-eslint/naming-convention */
/**
 * Constants used for invoice calculations
 */

// Default discount percentage offered to customers
export const DEFAULT_DISCOUNT_PERCENTAGE = 0.20; // 20%

// Constants for environmental impact calculations
export const KWH_TO_CO2_FACTOR = 0.09; // kg of CO2 per kWh
export const CO2_TO_TREES_FACTOR = 22; // kg of CO2 absorbed by one tree per year

// Constants for invoice status
export const INVOICE_STATUS = {
  PENDING: 'PENDING',
  NOTIFIED: 'NOTIFIED',
  PROCESSING: 'PROCESSING',
  PAID: 'PAID',
  OVERDUE: 'OVERDUE',
  CANCELED: 'CANCELED'
};

// Number of months to show in customer history
export const INVOICE_HISTORY_MONTHS = 6;

// Delay in days after due date to consider invoice overdue
export const INVOICE_OVERDUE_DAYS = 5;

/**
 * Environmental impact constants
 * Source: Various environmental agencies and research papers
 */
export const ENVIRONMENTAL_IMPACT = {
  // CO2 emission per kWh of traditional energy in Brazil (kg)
  CO2_PER_KWH: 0.074,
  
  // Number of trees needed to absorb 1 ton of CO2 per year
  TREES_PER_TON_CO2: 45,
  
  // Conversion factor for kWh to kg CO2 saved through solar energy
  KWH_TO_CO2_SAVING_FACTOR: 0.5,
} as const;

/**
 * Invoice calculation constants
 */
export const INVOICE_CALCULATION = {
  // Default discount percentage for invoice calculations
  DEFAULT_DISCOUNT_PERCENTAGE: 0.15, // 15% discount
  
  // Minimum discount percentage allowed
  MIN_DISCOUNT_PERCENTAGE: 0.05, // 5% discount
  
  // Maximum discount percentage allowed
  MAX_DISCOUNT_PERCENTAGE: 0.25, // 25% discount
  
  // Value added on top of cost for our margin (percentage)
  DEFAULT_MARGIN_PERCENTAGE: 0.05, // 5% margin
  
  // Tipos de Cálculo
  RECEIPT: 'receipt',
  COMPENSATION: 'compensation'
} as const;

/**
 * Payment constants
 */
export const PAYMENT = {
  // Number of days an invoice is due after issuing
  DEFAULT_DUE_DAYS: 10,
  
  // Days before due date to send reminder
  REMINDER_DAYS_BEFORE_DUE: 3,
  
  // Days after which an unpaid invoice is considered overdue
  OVERDUE_DAYS_AFTER_DUE: 1,
} as const;

// Limite máximo para falhas de leitura
export const MAX_READ_FAILURES = 3; 