import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Utility function to conditionally join class names
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format currency in BRL format
 */
export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

/**
 * Format date to Brazilian format (DD/MM/YYYY)
 */
export function formatDate(date: Date | string): string {
  if (!date) return "-";
  
  return new Intl.DateTimeFormat("pt-BR").format(
    typeof date === "string" ? new Date(date) : date
  );
}

/**
 * Format a date with time in Brazilian format (DD/MM/YYYY HH:MM)
 */
export function formatDateTime(date: Date | string): string {
  if (!date) return "";
  
  const dateObj = typeof date === "string" ? new Date(date) : date;
  
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(dateObj);
}

/**
 * Format a large number with thousand separators
 */
export function formatNumber(value: number, decimals: number = 2): string {
  return new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

/**
 * Truncate a text to a specific length
 */
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + "...";
}

/**
 * Generate a random color from a string (consistent for same input)
 */
export function stringToColor(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  let color = "#";
  for (let i = 0; i < 3; i++) {
    const value = (hash >> (i * 8)) & 0xFF;
    color += ("00" + value.toString(16)).slice(-2);
  }
  
  return color;
}

/**
 * Generate initials from a name (up to 2 letters)
 */
export function getInitials(name: string): string {
  if (!name) return "";
  
  return name
    .split(" ")
    .map(part => part.charAt(0))
    .filter(char => char.match(/[A-Za-z]/))
    .join("")
    .toUpperCase()
    .substring(0, 2);
}

/**
 * Format a phone number in Brazilian format
 */
export function formatPhoneNumber(phone: string): string {
  if (!phone) return "";
  
  // Remove non-numeric characters
  const cleaned = phone.replace(/\D/g, "");
  
  // Check if it's a mobile or landline number
  if (cleaned.length === 11) {
    // Mobile: (XX) 9XXXX-XXXX
    return `(${cleaned.substring(0, 2)}) ${cleaned.substring(2, 7)}-${cleaned.substring(7, 11)}`;
  } else if (cleaned.length === 10) {
    // Landline: (XX) XXXX-XXXX
    return `(${cleaned.substring(0, 2)}) ${cleaned.substring(2, 6)}-${cleaned.substring(6, 10)}`;
  }
  
  // Return original if format doesn't match
  return phone;
}

/**
 * Format a postal code (CEP) in Brazilian format (XXXXX-XXX)
 */
export function formatPostalCode(cep: string): string {
  if (!cep) return "";
  
  // Remove non-numeric characters
  const cleaned = cep.replace(/\D/g, "");
  
  if (cleaned.length !== 8) return cep;
  
  return `${cleaned.substring(0, 5)}-${cleaned.substring(5, 8)}`;
}

/**
 * Get a file extension from a filename
 */
export function getFileExtension(filename: string): string {
  if (!filename) return "";
  return filename.split(".").pop()?.toLowerCase() || "";
}

/**
 * Convert bytes to human-readable format
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 Bytes";
  
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

/**
 * Helper to capitalize first letter of a string
 */
export function capitalizeFirstLetter(str: string): string {
  if (!str) return "";
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

/**
 * Generate a random ID
 */
export function generateId(length = 8): string {
  return Math.random().toString(36).substring(2, 2 + length);
}

/**
 * Get the type of a value
 */
export function getTypeOf(value: any): string {
  if (value === null) return "null";
  if (Array.isArray(value)) return "array";
  return typeof value;
}

/**
 * Formata um CPF/CNPJ adicionando pontuação
 * @param value - O valor do CPF (11 dígitos) ou CNPJ (14 dígitos)
 * @returns String formatada
 */
export function formatDocument(value: string): string {
  if (!value) return '';
  
  // Remove caracteres não numéricos
  const cleanValue = value.replace(/\D/g, '');
  
  // Formata como CPF se tiver 11 dígitos
  if (cleanValue.length === 11) {
    return cleanValue.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  }
  
  // Formata como CNPJ se tiver 14 dígitos
  if (cleanValue.length === 14) {
    return cleanValue.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
  }
  
  // Retorna o valor original se não for CPF nem CNPJ
  return value;
} 