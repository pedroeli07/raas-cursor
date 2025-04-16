import { Installation } from '@prisma/client';
import type { InvoiceData, EnergyRates, TechnicalInfo, EnergyHistoryItem, InstallationInfo } from '@/lib/models/energy-data';
import { formatDate } from '@/lib/utils/utils';
import { createLogger } from './logger';
import { CemigDataStore } from '@/store/cemigDataStore';

// CO2 emissions constant: kWh to kg of CO2 (average for Brazil)
const KWH_TO_CO2_KG = 0.09; // 90g of CO2 per kWh

// Base installation type for energy records
export interface EnergyRecord {
  installationNumber: string;
  type: string;
  period: string;
  quota: number;
  consumption?: number;
  generation?: number;
  compensation?: number;
  transferred?: number;
  received?: number;
  previousBalance?: number;
  currentBalance?: number;
  expiringAmount?: number;
  expirationPeriod?: string;
}

const logger = createLogger('EnergyDataProcessor');

/**
 * Process raw CEMIG data from store
 * This is a placeholder implementation that should be replaced with actual processing logic
 */
export function processRawCemigData(store: CemigDataStore): any[] {
  logger.info('Processing CEMIG data');

  try {
    // Access cemigData from the store instead of passing it directly
    const rawData = store.cemigData || [];
    
    if (rawData.length === 0) {
      logger.warn('No data to process');
      return [];
    }
    
    // Process each record (this is a simplified example)
    const processedData = rawData.map((item, index) => {
      return {
        id: `record-${index}`,
        period: item.period || 'Unknown',
        installationNumber: item.installationNumber || 'Unknown',
        consumption: parseFloat((item.consumption || '0').toString()),
        generation: parseFloat((item.generation || '0').toString()),
        balance: parseFloat((item.currentBalance || '0').toString()),
        processed: true
      };
    });
    
    logger.info(`Processed ${processedData.length} records`);
    return processedData;
  } catch (error) {
    logger.error('Error processing CEMIG data:', { error: String(error) });
    return [];
  }
}

/**
 * Generate invoice data from energy records and installations
 */
export function generateInvoiceData(
  energyRecords: EnergyRecord[], 
  installations: Installation[], 
  defaultRate: number = 0.96, 
  defaultDiscount: number = 0.20
): InvoiceData[] {
  logger.info('Generating invoice data', { recordCount: energyRecords.length, installationCount: installations.length });
  
  // Group records by installation number
  const recordsByInstallation = groupBy(energyRecords, 'installationNumber');
  
  // Create mapping of installation numbers to installation objects
  const installationMap = new Map(installations.map(inst => [inst.installationNumber, inst]));
  
  // Group records by period to generate invoices by month
  const recordsByPeriod = groupBy(energyRecords, 'period');
  
  const invoices: InvoiceData[] = [];
  
  // Process each period (month) to generate an invoice
  Object.keys(recordsByPeriod).forEach(period => {
    const periodRecords = recordsByPeriod[period];
    
    // Get unique installation numbers for this period
    const uniqueInstallationNumbers = [...new Set(periodRecords.map(r => r.installationNumber))];
    
    // Filter to only consumer installations (these will be billed)
    const consumerInstallations = uniqueInstallationNumbers
      .filter(instNum => {
        const records = recordsByInstallation[instNum] || [];
        return records.some(r => r.type === 'CONSUMER');
      })
      .filter(instNum => installationMap.has(instNum));
    
    logger.debug(`Processing period ${period}: found ${consumerInstallations.length} consumer installations`);
    
    // Generate an invoice for each consumer installation
    consumerInstallations.forEach(installationNumber => {
      const installation = installationMap.get(installationNumber);
      if (!installation) return;
      
      try {
        // Get records for this installation and period
        const installationRecords = periodRecords.filter(r => r.installationNumber === installationNumber);
        if (installationRecords.length === 0) return;
        
        // Calculate totals for this installation
        const totalConsumption = installationRecords.reduce((sum, r) => sum + (r.consumption || 0), 0);
        const totalCompensation = installationRecords.reduce((sum, r) => sum + (r.compensation || 0), 0);
        const totalReceived = installationRecords.reduce((sum, r) => sum + (r.received || 0), 0);
        
        // Calculate financial values
        const cemigRate = defaultRate;
        const discount = defaultDiscount;
        const billedRate = cemigRate * (1 - discount);
        
        const originalAmount = totalConsumption * cemigRate;
        const compensatedAmount = totalCompensation * cemigRate;
        const finalAmount = (totalConsumption - totalCompensation) * billedRate;
        const savedAmount = originalAmount - finalAmount;
        
        // Calculate CO2 savings (kg)
        const co2Avoided = totalCompensation * KWH_TO_CO2_KG;
        
        // Parse period (MM/YYYY)
        const [month, year] = period.split('/');
        const periodStartDate = new Date(parseInt(year), parseInt(month) - 1, 1);
        const periodEndDate = new Date(parseInt(year), parseInt(month), 0); // Last day of the month
        
        // Due date (15 days after the end of the period)
        const dueDate = new Date(periodEndDate);
        dueDate.setDate(dueDate.getDate() + 15);
        
        // Generate a unique invoice ID
        const invoiceId = `INV-${installation.id}-${period.replace('/', '')}`;
        
        // Collect technical information for each installation
        const technicalInfo: TechnicalInfo[] = installationRecords.map(record => ({
          reference: installation.installationNumber,
          installation: record.installationNumber,
          consumption: record.consumption || 0,
          compensation: record.compensation || 0,
          reception: record.received || 0,
          currentBalance: record.currentBalance || 0,
          amount: (record.consumption || 0) * billedRate,
        }));
        
        // Get historical data (using mock data for now)
        // In a real implementation, this would come from a database query
        const history: EnergyHistoryItem[] = generateMockHistory(period, 5);
        
        // Create installation info
        const installationsInfo: InstallationInfo[] = [{
          id: installation.id,
          name: installation.installationNumber,
          type: 'consumidora',
          quota: 100, // Default for direct consumers
        }];
        
        // Create the invoice data
        const invoice: InvoiceData = {
          id: invoiceId,
          invoiceNumber: `${installation.id.substring(0, 4)}-${period.replace('/', '')}-${Math.floor(Math.random() * 1000)}`,
          client: {
            id: installation.ownerId || 'unknown',
            name: installation.installationNumber,
          },
          period: {
            reference: period,
            start: periodStartDate,
            end: periodEndDate,
          },
          dueDate: formatDate(dueDate),
          rates: {
            cemigRate,
            discount,
            billedRate,
          },
          installations: installationsInfo,
          technicalInfo,
          history,
          calculation: {
            totalConsumption,
            totalCompensation,
            originalAmount,
            compensatedAmount,
            finalAmount,
            savedAmount,
            co2Avoided,
          },
          status: 'pending',
        };
        
        logger.debug(`Generated invoice for ${installationNumber}, period ${period}`, {
          invoiceId,
          totalConsumption,
          totalCompensation,
          finalAmount,
        });
        
        invoices.push(invoice);
      } catch (error) {
        logger.error(`Error generating invoice for installation ${installationNumber}`, { error });
      }
    });
  });
  
  logger.info(`Successfully generated ${invoices.length} invoices`);
  return invoices;
}

/**
 * Generate mock historical data for an invoice
 */
function generateMockHistory(currentPeriod: string, months: number): EnergyHistoryItem[] {
  const [currentMonth, currentYear] = currentPeriod.split('/').map(Number);
  const history: EnergyHistoryItem[] = [];
  
  for (let i = 1; i <= months; i++) {
    let month = currentMonth - i;
    let year = currentYear;
    
    if (month <= 0) {
      month += 12;
      year -= 1;
    }
    
    const consumption = 1000 + Math.floor(Math.random() * 500);
    const compensation = Math.floor(consumption * 0.7 + Math.random() * 200);
    
    history.push({
      period: `${month.toString().padStart(2, '0')}/${year}`,
      consumption,
      compensation,
    });
  }
  
  return history;
}

/**
 * Recalculate an invoice with new rates
 */
export function recalculateInvoice(invoice: InvoiceData, newRates: Partial<EnergyRates>): InvoiceData {
  logger.info('Recalculating invoice with new rates', { 
    invoiceId: invoice.id, 
    originalRates: invoice.rates, 
    newRates 
  });
  
  // Get the current values or use new ones
  const cemigRate = newRates.cemigRate ?? invoice.rates.cemigRate;
  const discount = newRates.discount ?? invoice.rates.discount;
  const billedRate = newRates.billedRate ?? cemigRate * (1 - discount);
  
  // Calculate new financial values
  const totalConsumption = invoice.calculation.totalConsumption;
  const totalCompensation = invoice.calculation.totalCompensation;
  
  const originalAmount = totalConsumption * cemigRate;
  const compensatedAmount = totalCompensation * cemigRate;
  const finalAmount = (totalConsumption - totalCompensation) * billedRate;
  const savedAmount = originalAmount - finalAmount;
  
  // Calculate new CO2 savings (might change based on new consumption values)
  const co2Avoided = totalCompensation * KWH_TO_CO2_KG;
  
  // Update technical info with new rates
  const updatedTechnicalInfo = invoice.technicalInfo.map(info => ({
    ...info,
    amount: info.consumption * billedRate,
  }));
  
  logger.debug('Recalculation results', { 
    originalAmount, 
    finalAmount, 
    savedAmount,
    co2Avoided
  });
  
  // Return updated invoice
  return {
    ...invoice,
    rates: {
      cemigRate,
      discount,
      billedRate,
    },
    technicalInfo: updatedTechnicalInfo,
    calculation: {
      ...invoice.calculation,
      originalAmount,
      compensatedAmount,
      finalAmount,
      savedAmount,
      co2Avoided,
    },
  };
}

/**
 * Helper function to group an array by a key
 */
function groupBy<T>(array: T[], key: keyof T): { [key: string]: T[] } {
  return array.reduce((result, item) => {
    const groupKey = String(item[key]);
    if (!result[groupKey]) {
      result[groupKey] = [];
    }
    result[groupKey].push(item);
    return result;
  }, {} as { [key: string]: T[] });
} 