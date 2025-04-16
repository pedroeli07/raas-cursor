const isDevelopment = process.env.NODE_ENV !== 'production';
const isClient = typeof window !== 'undefined';

type LogLevel = 'info' | 'warn' | 'error' | 'debug';

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  module: string;
  data?: any;
}

export function createLogger(module: string) {
  const logWithLevel = (level: LogLevel, message: string, data?: any) => {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      module,
      data,
    };

    if (isDevelopment) {
      const colors = {
        info: '\x1b[32m', // green
        warn: '\x1b[33m', // yellow
        error: '\x1b[31m', // red
        debug: '\x1b[36m', // cyan
      };
      const reset = '\x1b[0m';

      console[level === 'error' ? 'error' : level === 'warn' ? 'warn' : 'log'](
        `${colors[level]}[${level.toUpperCase()}]${reset} [${module}] ${message}`,
        data ? data : ''
      );
    } else {
      // In production, we'd typically use structured logging
      console[level === 'error' ? 'error' : level === 'warn' ? 'warn' : 'log'](JSON.stringify(entry));
    }
  };

  return {
    info: (message: string, data?: any) => logWithLevel('info', message, data),
    warn: (message: string, data?: any) => logWithLevel('warn', message, data),
    error: (message: string, data?: any) => logWithLevel('error', message, data),
    debug: (message: string, data?: any) => {
      if (isDevelopment) {
        logWithLevel('debug', message, data);
      }
    },
  };
} 