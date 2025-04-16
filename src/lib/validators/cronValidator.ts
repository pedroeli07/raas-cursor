/**
 * Validador para endpoints cron e tarefas programadas
 * Verifica credenciais de autenticação especiais para endpoints que são executados automaticamente
 */
import { NextRequest } from 'next/server';
import log from '@/lib/logs/logger';
import { getUserFromRequest } from '@/lib/utils/utils';

interface CronAuthResult {
  isAuthenticated: boolean;
  message?: string;
  source?: 'api_key' | 'admin_token' | 'secret_header' | 'ip_whitelist';
}

/**
 * Valida a autenticação para endpoints cron usando várias estratégias:
 * 1. Chave de API no header X-API-Key
 * 2. Token de admin normal (cookie/session)
 * 3. Header secreto específico para cron
 * 4. Whitelist de IPs para ambientes de desenvolvimento
 * 
 * @param req Requisição do Next.js
 * @returns Resultado de autenticação
 */
export function validateAuthenticationForCron(req: NextRequest): CronAuthResult {
  try {
    // Método 1: Verificar chave de API no header
    const apiKey = req.headers.get('X-API-Key');
    const expectedApiKey = process.env.CRON_API_KEY || process.env.API_KEY;
    
    if (apiKey && expectedApiKey && apiKey === expectedApiKey) {
      log.debug('CRON Auth: Authenticated via API key');
      return { isAuthenticated: true, source: 'api_key' };
    }
    
    // Método 2: Verificar token de admin normal
    try {
      const { userRole } = getUserFromRequest(req);
      if (userRole === 'ADMIN' || userRole === 'SUPER_ADMIN') {
        log.debug('CRON Auth: Authenticated via admin token');
        return { isAuthenticated: true, source: 'admin_token' };
      }
    } catch (userError) {
      // Silenciar erro para tentar outros métodos de autenticação
      log.debug('CRON Auth: No valid user token', { error: userError });
    }
    
    // Método 3: Verificar header secreto específico para cron
    const cronSecret = req.headers.get('X-Cron-Secret');
    const expectedCronSecret = process.env.CRON_SECRET;
    
    if (cronSecret && expectedCronSecret && cronSecret === expectedCronSecret) {
      log.debug('CRON Auth: Authenticated via cron secret header');
      return { isAuthenticated: true, source: 'secret_header' };
    }
    
    // Método 4: Verificar IP (apenas em desenvolvimento)
    if (process.env.NODE_ENV === 'development') {
      const clientIp = req.headers.get('x-forwarded-for') || 'unknown';
      const allowedIps = ['127.0.0.1', 'localhost', '::1'];
      
      if (allowedIps.includes(clientIp)) {
        log.debug('CRON Auth: Authenticated via IP whitelist (development only)');
        return { isAuthenticated: true, source: 'ip_whitelist' };
      }
    }
    
    // Nenhum método de autenticação teve sucesso
    log.warn('CRON Auth: Failed authentication for cron endpoint', {
      ip: req.headers.get('x-forwarded-for') || 'unknown',
      method: req.method,
      url: req.url
    });
    
    return { 
      isAuthenticated: false, 
      message: 'Credenciais de autenticação inválidas para endpoint cron'
    };
  } catch (error) {
    log.error('CRON Auth: Error validating cron authentication', { error });
    return { 
      isAuthenticated: false, 
      message: 'Erro ao validar autenticação'
    };
  }
}

/**
 * Obtém a chave de API para uso em requisições de cron
 * Útil para configurar jobs de CI/CD ou outros sistemas externos
 * @returns Chave de API para cron ou null se não configurada
 */
export function getCronApiKey(): string | null {
  return process.env.CRON_API_KEY || process.env.API_KEY || null;
} 