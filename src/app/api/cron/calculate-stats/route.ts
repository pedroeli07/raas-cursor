/**
 * Endpoint cron para cálculo de estatísticas agregadas
 * 
 * Este endpoint é projetado para ser chamado programaticamente:
 * - Por uma tarefa cron/schedule externa (ex: GitHub Actions, Vercel Cron)
 * - Manualmente por um admin via ferramentas internas
 * 
 * Calcula e armazena estatísticas agregadas de energia em vários períodos de tempo,
 * otimizando a performance de dashboards e relatórios.
 */

import { NextRequest, NextResponse } from 'next/server';
import log from '@/lib/logs/logger';
import { updateAllAggregateStats } from '@/lib/api/historicalData';
import { validateAuthenticationForCron } from '@/lib/validators/cronValidator';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

/**
 * Handler para requisições GET ao endpoint /api/cron/calculate-stats
 * Executa o cálculo de estatísticas agregadas para todos os períodos relevantes
 */
export async function GET(req: NextRequest) {
  try {
    log.info('CRON: Received request to calculate aggregate statistics');
    
    // Validar autenticação (requer chave de API ou token admin)
    const authResult = validateAuthenticationForCron(req);
    if (!authResult.isAuthenticated) {
      log.warn('CRON: Unauthorized request to calculate stats');
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }
    
    // Obter parâmetros da query
    const url = new URL(req.url);
    const forceParam = url.searchParams.get('force') === 'true';
    const notifyParam = url.searchParams.get('notify') === 'true';
    
    log.info('CRON: Starting calculation of aggregate statistics', {
      force: forceParam,
      notify: notifyParam
    });
    
    // Registrar hora de início para cálculo de duração
    const startTime = Date.now();
    
    // Executar cálculo de estatísticas agregadas
    await updateAllAggregateStats();
    
    // Calcular duração total
    const duration = Date.now() - startTime;
    log.info('CRON: Completed calculation of aggregate statistics', { durationMs: duration });
    
    // Enviar notificação, se solicitado
    if (notifyParam) {
      try {
        log.info('CRON: Sending notification about completed statistics calculation');
        // Implementar notificação (email, webhook, etc.)
        // Por exemplo: await sendNotification('stats_calculated', { duration });
      } catch (notifyError) {
        log.error('CRON: Error sending notification', { error: notifyError });
      }
    }
    
    return NextResponse.json({
      success: true,
      message: 'Estatísticas agregadas calculadas com sucesso',
      meta: {
        durationMs: duration,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    log.error('CRON: Error calculating aggregate statistics', { error });
    
    return NextResponse.json({
      success: false,
      error: 'Erro ao calcular estatísticas agregadas',
      message: error instanceof Error ? error.message : 'Erro desconhecido'
    }, { status: 500 });
  }
} 