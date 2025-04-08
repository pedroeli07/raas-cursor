// ATENÇÃO: Esta rota só funciona em ambiente de desenvolvimento
// Path: src/app/api/dev/logs/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { backendLog as log } from '@/lib/logs/logger';

// Array para armazenar os últimos logs
const recentLogs: unknown[] = [];

// Função para capturar logs
export function captureLog(level: string, message: string, meta?: unknown) {
  const logEntry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    meta
  };
  
  // Limitar a 100 entradas para não consumir muita memória
  if (recentLogs.length >= 100) {
    recentLogs.shift();
  }
  
  recentLogs.push(logEntry);
}

// Interceptar os métodos do logger para capturar logs
const originalInfo = log.info;
const originalError = log.error;
const originalWarn = log.warn;
const originalDebug = log.debug;

log.info = function(message: string, meta?: Record<string, unknown>) {
  captureLog('info', message, meta);
  return originalInfo.call(this, message, meta);
};

log.error = function(message: string, meta?: Record<string, unknown>) {
  captureLog('error', message, meta);
  return originalError.call(this, message, meta);
};

log.warn = function(message: string, meta?: Record<string, unknown>) {
  captureLog('warn', message, meta);
  return originalWarn.call(this, message, meta);
};

log.debug = function(message: string, meta?: Record<string, unknown>) {
  captureLog('debug', message, meta);
  return originalDebug.call(this, message, meta);
};

export async function GET(req: NextRequest) {
  // Verificar se estamos em ambiente de desenvolvimento
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ error: 'This endpoint is only available in development mode' }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const limit = parseInt(searchParams.get('limit') || '50', 10);
  const level = searchParams.get('level');
  const search = searchParams.get('search');

  let filteredLogs = [...recentLogs];

  // Filtrar por nível
  if (level) {
    filteredLogs = filteredLogs.filter((log: unknown) => (log as { level: string }).level === level);
  }

  // Filtrar por termo de busca
  if (search) {
    const searchLower = search.toLowerCase();
    filteredLogs = filteredLogs.filter((log: unknown) => 
      (log as { message: string }).message.toLowerCase().includes(searchLower) || 
      JSON.stringify((log as { meta: unknown }).meta).toLowerCase().includes(searchLower)
    );
  }

  // Limitar e ordenar (mais recentes primeiro)
  filteredLogs = filteredLogs
    .sort((a, b) => new Date((b as { timestamp: string }).timestamp).getTime() - new Date((a as { timestamp: string }).timestamp).getTime())
    .slice(0, limit);

  return NextResponse.json(filteredLogs);
} 