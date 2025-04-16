/**
 * Utility functions for formatting various types of data
 */

/**
 * Format a number with thousands separator
 */
export function formatNumber(value: number): string {
  return value.toLocaleString('pt-BR')
}

/**
 * Format a value as currency (BRL)
 */
export function formatCurrency(value: number): string {
  return value.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  })
}

/**
 * Format a date string from ISO or other format to Brazilian format (DD/MM/YYYY)
 */
export function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  return date.toLocaleDateString('pt-BR')
}

/**
 * Format a percentage value
 */
export function formatPercentage(value: number, decimals = 2): string {
  return `${value.toFixed(decimals)}%`
}

/**
 * Format energy units (kWh)
 */
export function formatEnergy(value: number): string {
  return `${formatNumber(value)} kWh`
}

/**
 * Format carbon savings (kg CO₂)
 */
export function formatCarbonSavings(value: number): string {
  return `${formatNumber(value)} kg CO₂`
} 