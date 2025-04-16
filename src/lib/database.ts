import { Pool } from 'pg';
import pino from 'pino';

const logger = pino({
  name: 'database',
  level: process.env.LOG_LEVEL || 'info',
});

// Configuração do pool de conexões PostgreSQL
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : undefined,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Inicialização do pool
pool.on('connect', () => {
  logger.debug('Nova conexão com o banco de dados estabelecida');
});

pool.on('error', (err) => {
  logger.error({ err }, 'Erro na conexão com o banco de dados');
});

/**
 * Executa uma consulta SQL no banco de dados
 * @param text Consulta SQL a ser executada
 * @param params Parâmetros para a consulta
 * @returns Resultado da consulta
 */
export async function query(text: string, params?: any[]) {
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    logger.debug({ query: text, duration, rows: res.rowCount }, 'Consulta executada');
    return res;
  } catch (error) {
    logger.error({ error, query: text }, 'Erro ao executar consulta');
    throw error;
  }
}

/**
 * Obtém uma conexão do pool
 * @returns Cliente de conexão PostgreSQL
 */
export async function getClient() {
  const client = await pool.connect();
  const query = client.query;
  const release = client.release;
  
  // Set a timeout of 5 seconds, after which we release the client
  const timeout = setTimeout(() => {
    logger.error('Um cliente está sendo liberado por timeout');
    release();
  }, 5000);

  // Monkey patch the query method to keep track of the last query executed
  client.query = (...args: any[]) => {
    client.lastQuery = args;
    return query.apply(client, args);
  };

  client.release = () => {
    clearTimeout(timeout);
    client.query = query;
    client.release = release;
    return release.apply(client);
  };

  return client;
}

/**
 * Fecha todas as conexões do pool
 */
export async function closePool() {
  await pool.end();
  logger.info('Pool de conexões encerrado');
} 