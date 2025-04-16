import { useState, useEffect, useMemo } from 'react';
import { CemigEnergyBillData, InstallationType } from '@prisma/client';
import { createWorker } from '@/lib/utils/utils';
import { frontendLog as log } from '@/lib/logs/logger';

interface InstallationWithEnergyBills {
  id: string;
  installationNumber: string;
  type: InstallationType;
  cemigEnergyBills?: CemigEnergyBillData[];
  [key: string]: any;
}

interface DateRange {
  from?: Date;
  to?: Date;
}

interface EnergyStats {
  totalConsumption: number;
  totalGeneration: number;
  totalReceived: number;
  totalTransferred: number;
  installationCount: number;
}

/**
 * Hook for optimized energy data calculations with web worker support
 */
export function useEnergyDataCalculator(
  detailedInstallations: InstallationWithEnergyBills[],
  dateRange: DateRange
) {
  const [processedData, setProcessedData] = useState<any[]>([]);
  const [workerStatus, setWorkerStatus] = useState<'idle' | 'processing' | 'completed' | 'error'>('idle');
  
  // Helper function to parse MM/YYYY format to Date
  const parseBillPeriod = (period: string): Date | null => {
    try {
      const [month, year] = period.split('/').map(Number);
      if (isNaN(month) || isNaN(year)) return null;
      return new Date(year, month - 1);
    } catch {
      return null;
    }
  };
  
  // Process data in a worker if supported
  useEffect(() => {
    if (detailedInstallations.length === 0) {
      setProcessedData([]);
      return;
    }
    
    const workerCode = `
      self.onmessage = function(e) {
        const { installations, dateRange } = e.data;
        
        // Process data
        const result = processInstallationsData(installations, dateRange);
        
        // Send results back
        self.postMessage({ result });
      };
      
      function parseBillPeriod(period) {
        try {
          const [month, year] = period.split('/').map(Number);
          if (isNaN(month) || isNaN(year)) return null;
          return new Date(year, month - 1);
        } catch {
          return null;
        }
      }
      
      function processInstallationsData(installations, dateRange) {
        // Collect all energy bills from all selected installations
        const uniqueBillsMap = new Map();
        
        installations.forEach(installation => {
          if (!installation.cemigEnergyBills || installation.cemigEnergyBills.length === 0) return;
          
          installation.cemigEnergyBills.forEach(bill => {
            const billKey = \`\${installation.installationNumber}-\${bill.period}\`;
            if (!uniqueBillsMap.has(billKey)) {
              uniqueBillsMap.set(billKey, {
                ...bill,
                installationNumber: installation.installationNumber,
                installationType: installation.type
              });
            }
          });
        });
        
        let allBills = Array.from(uniqueBillsMap.values());
        
        // Filter by date range if specified
        if (dateRange.from || dateRange.to) {
          allBills = allBills.filter(bill => {
            const billDate = parseBillPeriod(bill.period);
            if (!billDate) return true;
            
            const isAfterStart = !dateRange.from || billDate >= new Date(dateRange.from);
            const isBeforeEnd = !dateRange.to || billDate <= new Date(dateRange.to);
            
            return isAfterStart && isBeforeEnd;
          });
        }
        
        return allBills;
      }
    `;
    
    // Use worker if available
    const worker = createWorker(workerCode);
    if (worker) {
      setWorkerStatus('processing');
      
      worker.onmessage = (e) => {
        const { result } = e.data;
        setProcessedData(result);
        setWorkerStatus('completed');
        worker.terminate();
      };
      worker.onerror = (error: ErrorEvent) => {
        log.error('Worker error:', { message: error.message, filename: error.filename, lineno: error.lineno });
        setWorkerStatus('error');
        worker.terminate();
        
        // Fallback to synchronous processing
        processDataSynchronously();
      };
      
      worker.postMessage({
        installations: detailedInstallations,
        dateRange: {
          from: dateRange.from?.toISOString(),
          to: dateRange.to?.toISOString()
        }
      });
    } else {
      // Fallback if worker not supported
      processDataSynchronously();
    }
    
    function processDataSynchronously() {
      const uniqueBillsMap = new Map();
      
      detailedInstallations.forEach(installation => {
        if (!installation.cemigEnergyBills || installation.cemigEnergyBills.length === 0) return;
        
        installation.cemigEnergyBills.forEach(bill => {
          const billKey = `${installation.installationNumber}-${bill.period}`;
          if (!uniqueBillsMap.has(billKey)) {
            uniqueBillsMap.set(billKey, {
              ...bill,
              installationNumber: installation.installationNumber,
              installationType: installation.type
            });
          }
        });
      });
      
      let allBills = Array.from(uniqueBillsMap.values());
      
      // Filter by date range if specified
      if (dateRange.from || dateRange.to) {
        allBills = allBills.filter(bill => {
          const billDate = parseBillPeriod(bill.period);
          if (!billDate) return true;
          
          const isAfterStart = !dateRange.from || billDate >= dateRange.from;
          const isBeforeEnd = !dateRange.to || billDate <= dateRange.to;
          
          return isAfterStart && isBeforeEnd;
        });
      }
      
      setProcessedData(allBills);
      setWorkerStatus('completed');
    }
    
    // Cleanup function
    return () => {
      if (worker) {
        worker.terminate();
      }
    };
  }, [detailedInstallations, dateRange]);
  
  // Calculate stats for energy data
  const energyStats = useMemo((): EnergyStats => {
    if (!detailedInstallations.length) {
      return {
        totalConsumption: 0,
        totalGeneration: 0,
        totalReceived: 0,
        totalTransferred: 0,
        installationCount: 0
      };
    }
    
    // Find the latest bills for each installation
    const latestBills = detailedInstallations.map(installation => {
      if (!installation.cemigEnergyBills || installation.cemigEnergyBills.length === 0) {
        return null;
      }
      
      // Sort bills by date (most recent first)
      return [...installation.cemigEnergyBills].sort((a, b) => {
        const aDate = parseBillPeriod(a.period);
        const bDate = parseBillPeriod(b.period);
        if (!aDate || !bDate) return 0;
        return bDate.getTime() - aDate.getTime();
      })[0]; // Get the most recent bill
    }).filter(bill => bill !== null) as CemigEnergyBillData[];
    
    // Calculate totals from the latest bills
    const totalConsumption = latestBills.reduce((sum, bill) => sum + (bill.consumption || 0), 0);
    const totalGeneration = latestBills.reduce((sum, bill) => sum + (bill.generation || 0), 0);
    const totalReceived = latestBills.reduce((sum, bill) => sum + (bill.received || 0), 0);
    const totalTransferred = latestBills.reduce((sum, bill) => sum + (bill.transferred || 0), 0);
    
    return {
      totalConsumption,
      totalGeneration,
      totalReceived,
      totalTransferred,
      installationCount: detailedInstallations.length
    };
  }, [detailedInstallations]);
  
  // Prepare chart data from energy bills
  const chartData = useMemo(() => {
    if (!detailedInstallations.length) return [];
    
    // Group data by period (month)
    const dataByPeriod = new Map<string, any>();
    
    detailedInstallations.forEach(installation => {
      if (!installation.cemigEnergyBills) return;
      
      installation.cemigEnergyBills.forEach(bill => {
        if (!dataByPeriod.has(bill.period)) {
          dataByPeriod.set(bill.period, {
            period: bill.period,
            consumption: 0,
            generation: 0,
            received: 0,
            compensation: 0,
            transferred: 0,
            previousBalance: 0,
            currentBalance: 0
          });
        }
        
        const periodData = dataByPeriod.get(bill.period);
        
        // Sum metrics for this period
        periodData.consumption += bill.consumption || 0;
        periodData.generation += bill.generation || 0;
        periodData.received += bill.received || 0;
        periodData.compensation += bill.compensation || 0;
        periodData.transferred += bill.transferred || 0;
        periodData.previousBalance += bill.previousBalance || 0;
        periodData.currentBalance += bill.currentBalance || 0;
      });
    });
    
    // Convert map to array and sort by period
    return Array.from(dataByPeriod.values()).sort((a, b) => {
      const aDate = parseBillPeriod(a.period);
      const bDate = parseBillPeriod(b.period);
      if (!aDate || !bDate) return 0;
      return aDate.getTime() - bDate.getTime();
    });
  }, [detailedInstallations]);
  
  return {
    filteredEnergyData: processedData,
    energyStats,
    chartData,
    isProcessing: workerStatus === 'processing',
    error: workerStatus === 'error'
  };
} 