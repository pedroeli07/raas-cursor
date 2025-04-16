/**
 * Service functions for calculating and storing historical aggregate data
 * These functions help create pre-calculated statistics for dashboards and reports
 */
import { prisma } from '@/lib/db/db';
import log from '@/lib/logs/logger';
import { format, subMonths, parse, getYear, getMonth } from 'date-fns';
import { InstallationType } from '@prisma/client';

/**
 * Tipo de período para agregação de dados
 */
export type PeriodType = 'monthly' | 'quarterly' | 'yearly';

/**
 * Formata um período para o formato padrão MM/YYYY
 */
export function formatPeriod(date: Date): string {
  return format(date, 'MM/yyyy');
}

/**
 * Formata um trimestre no formato QX/YYYY (ex: Q1/2023)
 */
export function formatQuarter(date: Date): string {
  const month = getMonth(date);
  const quarter = Math.floor(month / 3) + 1;
  return `Q${quarter}/${getYear(date)}`;
}

/**
 * Calcula a redução de CO2 com base na energia gerada
 * @param generationKwh Total de energia gerada em kWh
 * @returns Quantidade estimada de CO2 não emitido (em kg)
 */
export function calculateCO2Reduction(generationKwh: number): number {
  // Fator médio de emissão para o Brasil: 0.090 kgCO2/kWh
  // Fonte: https://www.gov.br/mcti/pt-br/acompanhe-o-mcti/sirene/dados-e-ferramentas/fatores-de-emissao
  const emissionFactor = 0.090; 
  return generationKwh * emissionFactor;
}

/**
 * Calcula a economia estimada com base nos dados de energia
 * @param consumption Consumo total em kWh
 * @param compensation Compensação total em kWh
 * @param kwhPrice Preço médio do kWh em centavos
 * @returns Economia estimada em centavos
 */
export function calculateEstimatedSavings(
  consumption: number, 
  compensation: number, 
  kwhPrice: number
): number {
  // A economia é o valor que teria sido pago pela energia compensada
  return Math.min(consumption, compensation) * kwhPrice;
}

/**
 * Calcula estatísticas agregadas para um período específico
 * @param period Período no formato MM/YYYY ou YYYY
 * @param periodType Tipo de período (mensal, trimestral, anual)
 */
export async function calculateAggregateStats(
  period: string,
  periodType: PeriodType = 'monthly'
): Promise<void> {
  try {
    log.info(`Calculating aggregate statistics for ${periodType} period: ${period}`);
    
    // Definir o filtro de consulta com base no tipo de período
    let periodFilter: any = {};
    
    if (periodType === 'monthly') {
      // Para mensal, usamos o campo period diretamente (MM/YYYY)
      periodFilter = { period: period };
    } else if (periodType === 'quarterly') {
      // Para trimestral, extraímos o trimestre e ano (ex: Q1/2023)
      const [quarter, year] = period.replace('Q', '').split('/');
      const quarterNumber = parseInt(quarter);
      const startMonth = (quarterNumber - 1) * 3 + 1;
      const endMonth = quarterNumber * 3;
      
      // Criamos um array de períodos possíveis neste trimestre
      const periods = [];
      for (let month = startMonth; month <= endMonth; month++) {
        const formattedMonth = month.toString().padStart(2, '0');
        periods.push(`${formattedMonth}/${year}`);
      }
      
      periodFilter = { period: { in: periods } };
    } else if (periodType === 'yearly') {
      // Para anual, verificamos se o período termina com o ano
      periodFilter = { period: { endsWith: `/${period}` } };
    }
    
    // Buscar preço médio do kWh no período
    const kwhPrices = await prisma.kwhPrice.findMany({
      where: {
        OR: [
          { 
            startDate: { lte: new Date() },
            endDate: { gte: new Date() }
          },
          {
            startDate: { lte: new Date() },
            endDate: null
          }
        ]
      }
    });
    
    // Calcular preço médio simples (ou usar um valor padrão se não houver preços)
    const avgKwhPrice = kwhPrices.length > 0
      ? kwhPrices.reduce((sum, price) => sum + price.price, 0) / kwhPrices.length
      : 80; // Valor padrão: R$ 0,80 por kWh (80 centavos)
    
    // Buscar dados de energia para o período
    const energyData = await prisma.cemigEnergyBillData.findMany({
      where: periodFilter,
      include: {
        installation: {
          select: {
            id: true,
            type: true,
          }
        }
      }
    });
    
    // Se não houver dados para o período, registrar e sair
    if (energyData.length === 0) {
      log.warn(`No energy data found for ${periodType} period: ${period}`);
      return;
    }
    
    // Calcular estatísticas agregadas
    let totalGeneration = 0;
    let totalConsumption = 0;
    let totalTransfer = 0;
    let totalCredits = 0;
    
    // Contadores
    const generators = new Set<string>();
    const consumers = new Set<string>();
    
    // Processar dados de energia
    for (const data of energyData) {
      if (data.installation.type === InstallationType.GENERATOR) {
        totalGeneration += data.generation || 0;
        totalTransfer += data.transferred || 0;
        generators.add(data.installation.id);
      } else {
        totalConsumption += data.consumption || 0;
        consumers.add(data.installation.id);
      }
      
      // Somar créditos gerados (baseado no saldo atual menos o anterior + expirado)
      if (data.currentBalance && data.previousBalance) {
        const expiredBalance = data.expiredBalance || 0;
        const creditsGenerated = data.currentBalance - data.previousBalance + expiredBalance;
        if (creditsGenerated > 0) {
          totalCredits += creditsGenerated;
        }
      }
    }
    
    // Calcular eficiência média (geração / número de geradores, se houver)
    const avgGenerationEfficiency = generators.size > 0
      ? totalGeneration / generators.size
      : 0;
    
    // Calcular economia estimada e redução de CO2
    const estimatedSavings = calculateEstimatedSavings(
      totalConsumption,
      Math.min(totalGeneration, totalConsumption),
      avgKwhPrice
    );
    
    const co2Reduction = calculateCO2Reduction(totalGeneration);
    
    // Salvar ou atualizar as estatísticas
    await prisma.energyAggregateStats.upsert({
      where: {
        periodPeriodType: {
          period,
          periodType
        }
      },
      update: {
        totalGeneration,
        totalConsumption,
        totalTransfer,
        totalCredits,
        avgGenerationEfficiency,
        estimatedSavings,
        co2Reduction,
        activeGenerators: generators.size,
        activeConsumers: consumers.size,
        calculatedAt: new Date()
      },
      create: {
        period,
        periodType,
        totalGeneration,
        totalConsumption,
        totalTransfer,
        totalCredits,
        avgGenerationEfficiency,
        estimatedSavings,
        co2Reduction,
        activeGenerators: generators.size,
        activeConsumers: consumers.size,
        calculatedAt: new Date()
      }
    });
    
    log.info(`Successfully calculated and stored aggregate stats for ${periodType} period: ${period}`, {
      totalGeneration,
      totalConsumption,
      activeGenerators: generators.size,
      activeConsumers: consumers.size,
    });
  } catch (error) {
    log.error(`Error calculating aggregate stats for ${periodType} period: ${period}`, { error });
    throw error;
  }
}

/**
 * Calcula estatísticas para os últimos N meses
 * @param months Número de meses a calcular, incluindo o mês atual
 */
export async function calculateRecentMonthlyStats(months: number = 12): Promise<void> {
  try {
    log.info(`Calculating monthly statistics for the last ${months} months`);
    
    const today = new Date();
    const currentMonth = today;
    
    for (let i = 0; i < months; i++) {
      const targetMonth = subMonths(currentMonth, i);
      const period = formatPeriod(targetMonth);
      
      await calculateAggregateStats(period, 'monthly');
    }
    
    log.info(`Completed calculating monthly statistics for the last ${months} months`);
  } catch (error) {
    log.error(`Error calculating recent monthly statistics`, { error, months });
    throw error;
  }
}

/**
 * Calcula estatísticas trimestrais para o ano atual e o anterior
 */
export async function calculateRecentQuarterlyStats(): Promise<void> {
  try {
    log.info('Calculating quarterly statistics for current and previous year');
    
    const today = new Date();
    const currentYear = getYear(today);
    const currentQuarter = Math.floor(getMonth(today) / 3) + 1;
    
    // Calcular para o ano atual até o trimestre atual
    for (let q = 1; q <= currentQuarter; q++) {
      const period = `Q${q}/${currentYear}`;
      await calculateAggregateStats(period, 'quarterly');
    }
    
    // Calcular para o ano anterior (todos os trimestres)
    const previousYear = currentYear - 1;
    for (let q = 1; q <= 4; q++) {
      const period = `Q${q}/${previousYear}`;
      await calculateAggregateStats(period, 'quarterly');
    }
    
    log.info('Completed calculating quarterly statistics');
  } catch (error) {
    log.error('Error calculating recent quarterly statistics', { error });
    throw error;
  }
}

/**
 * Calcula estatísticas anuais para os últimos N anos
 * @param years Número de anos a calcular, incluindo o ano atual
 */
export async function calculateYearlyStats(years: number = 5): Promise<void> {
  try {
    log.info(`Calculating yearly statistics for the last ${years} years`);
    
    const currentYear = getYear(new Date());
    
    for (let i = 0; i < years; i++) {
      const year = currentYear - i;
      await calculateAggregateStats(year.toString(), 'yearly');
    }
    
    log.info(`Completed calculating yearly statistics for the last ${years} years`);
  } catch (error) {
    log.error(`Error calculating yearly statistics`, { error, years });
    throw error;
  }
}

/**
 * Função principal para atualizar todas as estatísticas agregadas
 * Pode ser executada periodicamente (diariamente ou semanalmente)
 */
export async function updateAllAggregateStats(): Promise<void> {
  try {
    log.info('Starting complete update of all aggregate statistics');
    
    // Calcular estatísticas mensais para os últimos 24 meses
    await calculateRecentMonthlyStats(24);
    
    // Calcular estatísticas trimestrais (ano atual e anterior)
    await calculateRecentQuarterlyStats();
    
    // Calcular estatísticas anuais para os últimos 5 anos
    await calculateYearlyStats(5);
    
    log.info('Successfully updated all aggregate statistics');
  } catch (error) {
    log.error('Error updating aggregate statistics', { error });
    throw error;
  }
} 