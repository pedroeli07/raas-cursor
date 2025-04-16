
import { 
  DEFAULT_DISCOUNT_PERCENTAGE, 
  KWH_TO_CO2_FACTOR, 
  CO2_TO_TREES_FACTOR,
  INVOICE_STATUS
} from "@/lib/constants/invoice";
import type { 
  Invoice, 
  InvoiceCalculation, 
  InvoiceEnvironmentalImpact,
  InvoiceFilters,
  InvoicePreview
} from "@/types/invoice";
import { logger } from "@/utils/logger";

/**
 * Calculates the invoice amount based on energy consumption and rates
 */
export function calculateInvoiceAmount(
  consumptionKwh: number,
  distributorRate: number,
  customDiscount?: number
): InvoiceCalculation {
  logger.debug("[BACKEND] Calculating invoice amount", { 
    consumptionKwh, 
    distributorRate, 
    customDiscount 
  });

  // Use default discount if none specified
  const discountPercentage = customDiscount ?? DEFAULT_DISCOUNT_PERCENTAGE;
  
  // Calculate the original value (without discount)
  const originalValue = consumptionKwh * distributorRate;
  
  // Calculate the actual invoice amount with discount
  const invoiceAmount = originalValue * (1 - discountPercentage / 100);
  
  // Calculate savings
  const savingsAmount = originalValue - invoiceAmount;
  const savingsPercentage = discountPercentage;

  // Calculate effective rate after discount
  const effectiveRate = distributorRate * (1 - discountPercentage / 100);

  logger.debug("[BACKEND] Invoice calculation results", { 
    originalValue, 
    invoiceAmount, 
    savingsAmount,
    savingsPercentage,
    effectiveRate
  });

  return {
    originalValue,
    invoiceAmount,
    savingsAmount,
    savingsPercentage,
    distributorRate,
    effectiveRate
  };
}

/**
 * Calculates the environmental impact based on energy consumption
 */
export function calculateEnvironmentalImpact(
  consumptionKwh: number
): InvoiceEnvironmentalImpact {
  // Calculate CO2 savings from solar energy usage
  const carbonSavings = consumptionKwh * KWH_TO_CO2_FACTOR;
  
  // Calculate tree equivalent based on CO2 absorption
  const treesEquivalent = carbonSavings / CO2_TO_TREES_FACTOR;

  return {
    carbonSavings,
    treesEquivalent,
    energySavingsKwh: consumptionKwh
  };
}

/**
 * Updates invoice status based on payment and due date
 */
export function determineInvoiceStatus(
  isPaid: boolean,
  dueDate: Date
): typeof INVOICE_STATUS[keyof typeof INVOICE_STATUS] {
  if (isPaid) {
    return INVOICE_STATUS.PAID;
  }
  
  const now = new Date();
  const dueDateObj = new Date(dueDate);
  
  if (now > dueDateObj) {
    return INVOICE_STATUS.OVERDUE;
  }
  
  return INVOICE_STATUS.PENDING;
}

/**
 * Generates a barcode for invoice payment
 * This is a placeholder function - would be replaced with actual implementation
 */
export function generateInvoiceBarcode(invoiceId: string): string {
  // This would be replaced with actual barcode generation logic
  return `RAAS${invoiceId.replace(/-/g, '')}`;
}

/**
 * Generates a QR code for invoice payment
 * This is a placeholder function - would be replaced with actual implementation
 */
export function generateInvoiceQRCode(invoice: Invoice): string {
  // This would be replaced with actual QR code generation logic
  return `https://raas.example.com/pay/${invoice.id}`;
}

/**
 * Service for handling invoice operations
 */
export class InvoiceService {
  /**
   * Get all invoices with optional filtering
   */
  static async getInvoices(filters?: InvoiceFilters): Promise<InvoicePreview[]> {
    try {
      // Build query parameters from filters
      const queryParams = new URLSearchParams();
      
      if (filters?.customerId) {
        queryParams.append('customerId', filters.customerId);
      }
      
      if (filters?.status) {
        queryParams.append('status', filters.status);
      }
      
      if (filters?.startDate) {
        queryParams.append('startDate', filters.startDate.toISOString());
      }
      
      if (filters?.endDate) {
        queryParams.append('endDate', filters.endDate.toISOString());
      }
      
      if (filters?.distributorId) {
        queryParams.append('distributorId', filters.distributorId);
      }
      
      if (filters?.installationId) {
        queryParams.append('installationId', filters.installationId);
      }
      
      // Call API to get invoices
      const response = await fetch(`/api/invoices?${queryParams.toString()}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch invoices');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error fetching invoices:', error);
      throw error;
    }
  }

  /**
   * Get invoice by ID
   */
  static async getInvoiceById(id: string): Promise<Invoice> {
    try {
      const response = await fetch(`/api/invoices/${id}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch invoice');
      }
      
      return await response.json();
    } catch (error) {
      console.error(`Error fetching invoice with id ${id}:`, error);
      throw error;
    }
  }

  /**
   * Generate invoice PDF and return the URL
   */
  static async generateInvoicePdf(id: string): Promise<string> {
    try {
      const response = await fetch(`/api/invoices/${id}/generate-pdf`, {
        method: 'POST',
      });
      
      if (!response.ok) {
        throw new Error('Failed to generate invoice PDF');
      }
      
      const data = await response.json();
      return data.pdfUrl;
    } catch (error) {
      console.error(`Error generating PDF for invoice ${id}:`, error);
      throw error;
    }
  }

  /**
   * Mark invoice as paid
   */
  static async markAsPaid(id: string, paymentDetails: {
    paymentDate: Date,
    paymentMethod: string
  }): Promise<Invoice> {
    try {
      const response = await fetch(`/api/invoices/${id}/pay`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(paymentDetails),
      });
      
      if (!response.ok) {
        throw new Error('Failed to mark invoice as paid');
      }
      
      return await response.json();
    } catch (error) {
      console.error(`Error marking invoice ${id} as paid:`, error);
      throw error;
    }
  }

  /**
   * Cancel invoice
   */
  static async cancelInvoice(id: string, reason: string): Promise<Invoice> {
    try {
      const response = await fetch(`/api/invoices/${id}/cancel`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ reason }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to cancel invoice');
      }
      
      return await response.json();
    } catch (error) {
      console.error(`Error cancelling invoice ${id}:`, error);
      throw error;
    }
  }

  /**
   * Send invoice reminder to customer
   */
  static async sendReminder(id: string): Promise<{ success: boolean }> {
    try {
      const response = await fetch(`/api/invoices/${id}/send-reminder`, {
        method: 'POST',
      });
      
      if (!response.ok) {
        throw new Error('Failed to send invoice reminder');
      }
      
      return await response.json();
    } catch (error) {
      console.error(`Error sending reminder for invoice ${id}:`, error);
      throw error;
    }
  }

  /**
   * Get invoice status badge color
   */
  static getStatusColor(status: typeof INVOICE_STATUS[keyof typeof INVOICE_STATUS]): string {
    switch (status) {
      case INVOICE_STATUS.PAID:
        return 'bg-green-100 text-green-800';
      case INVOICE_STATUS.PENDING:
        return 'bg-yellow-100 text-yellow-800';
      case INVOICE_STATUS.OVERDUE:
        return 'bg-red-100 text-red-800';
      case INVOICE_STATUS.CANCELED:
        return 'bg-gray-100 text-gray-800';
      case INVOICE_STATUS.PROCESSING:
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  }

  /**
   * Format currency value to BRL
   */
  static formatCurrency(value: number): string {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  }

  /**
   * Format date to dd/MM/yyyy
   */
  static formatDate(date: Date): string {
    return new Intl.DateTimeFormat('pt-BR').format(new Date(date));
  }
} 