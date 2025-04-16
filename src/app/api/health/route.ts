import { NextResponse } from 'next/server';
import { EnvironmentConfig } from '@/lib/config/environmentConfig';
import { backendLog as log } from '@/lib/logs/logger';

export async function GET() {
  log.info('Health check requested');
  
  const now = new Date();
  
  const healthData = {
    status: 'ok',
    timestamp: now.toISOString(),
    environment: process.env.NODE_ENV || 'development',
    baseUrl: EnvironmentConfig.baseUrl,
    serverTime: now.toLocaleString('pt-BR'),
  };
  
  return NextResponse.json(healthData);
} 