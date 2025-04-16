/* eslint-disable @typescript-eslint/naming-convention */
import pino from 'pino';
import { query } from '../database';
import logger from '../logger';

const loggerService = pino({
  name: 'settings-service',
  level: process.env.LOG_LEVEL || 'info',
});

export type Setting = {
  id: number;
  key: string;
  value: string;
  description: string;
  createdAt: Date;
  updatedAt: Date;
};

// Cache de configurações para reduzir consultas ao banco
const settingsCache: Record<string, { value: string; timestamp: number }> = {};
const CACHE_TTL = 5 * 60 * 1000; // 5 minutos em milissegundos

// Default settings values
const DEFAULT_SETTINGS = {
  'auth.tokenExpiration': '168h', // Default token expiration time (168 hours = 7 days)
  'auth.cookieMaxAge': 604800, // Default cookie max age in seconds (168 hours = 7 days)
};

type SettingKey = keyof typeof DEFAULT_SETTINGS;

/**
 * Inicializa a tabela de configurações se não existir
 */
export async function initSettingsTable() {
  try {
    // Verificar se a tabela settings existe
    const checkTable = await query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'settings'
      );
    `);

    if (!checkTable.rows[0].exists) {
      // Criar a tabela de configurações
      await query(`
        CREATE TABLE settings (
          id SERIAL PRIMARY KEY,
          key VARCHAR(100) UNIQUE NOT NULL,
          value TEXT NOT NULL,
          description TEXT,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
      `);

      // Inserir configurações padrão
      await query(`
        INSERT INTO settings (key, value, description) VALUES
        ('AUTH_TOKEN_EXPIRY_HOURS', '24', 'Tempo de expiração do token de autenticação em horas'),
        ('MAINTENANCE_MODE', 'false', 'Sistema em modo de manutenção'),
        ('MIN_PASSWORD_LENGTH', '8', 'Tamanho mínimo de senha');
      `);

      loggerService.info('Tabela de configurações inicializada com valores padrão');
    }
  } catch (error) {
    loggerService.error({ error }, 'Erro ao inicializar tabela de configurações');
    throw error;
  }
}

/**
 * Get a setting value from database or fallback to default
 * @param key - The setting key to retrieve
 * @returns The setting value
 */
export async function getSetting<K extends SettingKey>(
  key: K
): Promise<(typeof DEFAULT_SETTINGS)[K]> {
  try {
    // TODO: Replace with actual database query once DB is set up
    // For now, return default values
    return DEFAULT_SETTINGS[key];
  } catch (error) {
    logger.error({ error, key }, '[BACKEND] Error retrieving setting');
    return DEFAULT_SETTINGS[key];
  }
}

/**
 * Update a setting value
 * @param key - The setting key to update
 * @param value - The new value
 */
export async function updateSetting<K extends SettingKey>(
  key: K,
  value: (typeof DEFAULT_SETTINGS)[K]
): Promise<void> {
  try {
    // TODO: Replace with actual database update once DB is set up
    logger.info({ key, value }, '[BACKEND] Setting updated (mock)');
  } catch (error) {
    logger.error({ error, key, value }, '[BACKEND] Error updating setting');
    throw error;
  }
}

/**
 * Obtém todas as configurações
 * @returns Lista de configurações
 */
export async function getAllSettings(): Promise<Setting[]> {
  try {
    const result = await query('SELECT * FROM settings ORDER BY key');
    return result.rows;
  } catch (error) {
    loggerService.error({ error }, 'Erro ao obter todas as configurações');
    return [];
  }
}

/**
 * Limpa o cache de configurações
 */
export function clearSettingsCache() {
  Object.keys(settingsCache).forEach(key => {
    delete settingsCache[key];
  });
  loggerService.debug('Cache de configurações limpo');
} 