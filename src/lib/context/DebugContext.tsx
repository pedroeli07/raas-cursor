'use client';

import React, { createContext, useContext, useState, useCallback, ReactNode, useEffect } from 'react';

// Define log levels
export type LogLevel = 'info' | 'warn' | 'error' | 'debug';

// Define log entry structure
export interface LogMessage {
  id: string;
  timestamp: Date;
  level: LogLevel;
  message: string;
  source?: string;
  data?: any;
}

// Define context interface
interface DebugContextType {
  logs: LogMessage[];
  addLog: (level: LogLevel, message: string, source?: string, data?: any) => void;
  clearLogs: () => void;
  isDebugEnabled: boolean;
  toggleDebug: () => void;
}

// Create the context
const DebugContext = createContext<DebugContextType | undefined>(undefined);

// Original console methods
const originalConsole = {
  log: console.log,
  info: console.info,
  warn: console.warn,
  error: console.error,
  debug: console.debug,
};

// Provider component
export const DebugProvider = ({ children }: { children: ReactNode }) => {
  // Sempre inicie com debug habilitado para desenvolvimento
  const [isDebugEnabled, setIsDebugEnabled] = useState<boolean>(
    process.env.NODE_ENV === 'development'
  );
  const [logs, setLogs] = useState<LogMessage[]>([]);
  
  // Cache para evitar logs duplicados em sequência
  const logCache = React.useRef<{[key: string]: number}>({});
  
  // Throttle para limitar quantidade de logs por segundo
  const throttleTimerRef = React.useRef<NodeJS.Timeout | null>(null);
  const pendingLogsRef = React.useRef<LogMessage[]>([]);
  
  // Método para adicionar um novo log com throttling
  const addLog = useCallback((level: LogLevel, message: string, source?: string, data?: any) => {
    if (!isDebugEnabled) return;
    
    // Criar um cache key para verificar duplicados
    const cacheKey = `${level}:${source}:${message}`;
    const now = Date.now();
    
    // Verificar se esse log é muito similar a um recente (nos últimos 2 segundos)
    if (logCache.current[cacheKey] && (now - logCache.current[cacheKey]) < 2000) {
      // Ignorar logs duplicados em intervalos curtos
      return;
    }
    
    // Atualizar cache
    logCache.current[cacheKey] = now;
    
    // Adicionar em fila de pendentes
    const newLog: LogMessage = {
      id: crypto.randomUUID(),
      timestamp: new Date(),
      level,
      message,
      source,
      data,
    };
    
    pendingLogsRef.current.push(newLog);
    
    // Se não tem timer ativo, criar um para processar os logs
    if (!throttleTimerRef.current) {
      throttleTimerRef.current = setTimeout(() => {
        const pendingLogs = [...pendingLogsRef.current];
        pendingLogsRef.current = [];
        throttleTimerRef.current = null;
        
        if (pendingLogs.length === 0) return;
        
        setLogs((prevLogs) => {
          // Limitar a 500 logs para evitar problemas de memória
          const updatedLogs = [...pendingLogs, ...prevLogs];
          if (updatedLogs.length > 500) {
            return updatedLogs.slice(0, 500);
          }
          return updatedLogs;
        });
      }, 300); // Processar a cada 300ms no máximo
    }
  }, [isDebugEnabled]);

  const clearLogs = useCallback(() => {
    setLogs([]);
    logCache.current = {};
    pendingLogsRef.current = [];
    if (throttleTimerRef.current) {
      clearTimeout(throttleTimerRef.current);
      throttleTimerRef.current = null;
    }
  }, []);

  const toggleDebug = useCallback(() => {
    setIsDebugEnabled((prev) => !prev);
  }, []);

  // Interceptar console.log, console.error, etc. para capturar todos os logs
  useEffect(() => {
    if (!isDebugEnabled) return;
    
    // Função para extrair a fonte de uma mensagem
    const extractSource = (message: string): string => {
      if (typeof message !== 'string') return 'Console';
      
      const match = message.match(/^\[(\w+)\]:/);
      return match && match[1] ? match[1] : 'Console';
    };
    
    // Função para processar args e enviar para o log
    const processLog = (level: LogLevel, args: any[]) => {
      if (args.length === 0) return;
      
      const message = args.length > 0 ? String(args[0]) : '';
      const data = args.length > 1 ? args.slice(1) : undefined;
      const source = extractSource(message);
      
      addLog(level, message, source, data);
    };

    // Sobrescrever os métodos do console
    console.log = (...args: any[]) => {
      originalConsole.log.apply(console, args);
      processLog('info', args);
    };

    console.warn = (...args: any[]) => {
      originalConsole.warn.apply(console, args);
      processLog('warn', args);
    };

    console.error = (...args: any[]) => {
      originalConsole.error.apply(console, args);
      processLog('error', args);
    };

    console.debug = (...args: any[]) => {
      originalConsole.debug.apply(console, args);
      processLog('debug', args);
    };

    // Limpar ao desmontar
    return () => {
      console.log = originalConsole.log;
      console.warn = originalConsole.warn;
      console.error = originalConsole.error;
      console.debug = originalConsole.debug;
      
      // Limpar qualquer timer pendente
      if (throttleTimerRef.current) {
        clearTimeout(throttleTimerRef.current);
        throttleTimerRef.current = null;
      }
    };
  }, [isDebugEnabled, addLog]);

  // Adicionar um listener para erros globais
  useEffect(() => {
    if (!isDebugEnabled) return;

    const handleError = (event: Event) => {
      if (event instanceof ErrorEvent) {
        addLog('error', `Uncaught Error: ${event.message}`, 'Global', {
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno,
          stack: event.error?.stack
        });
      }
    };

    // Adicionar listener para erros não capturados
    window.addEventListener('error', handleError);

    // Adicionar listener para promessas rejeitadas não capturadas
    window.addEventListener('unhandledrejection', (event: Event) => {
      if (event instanceof PromiseRejectionEvent) {
        addLog('error', `Unhandled Promise Rejection: ${event.reason}`, 'Global', {
          reason: event.reason,
          stack: event.reason?.stack
        });
      }
    });

    // Adicionar log inicial quando o debug é habilitado
    originalConsole.info('[DebugContext]: Debug inicializado', { timestamp: new Date() });
    addLog('info', 'Debug inicializado', 'DebugContext', { timestamp: new Date() });

    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleError);
    };
  }, [isDebugEnabled, addLog]);

  const value = {
    logs,
    addLog,
    clearLogs,
    isDebugEnabled,
    toggleDebug,
  };

  return <DebugContext.Provider value={value}>{children}</DebugContext.Provider>;
};

// Custom hook para usar o contexto
export const useDebug = () => {
  const context = useContext(DebugContext);
  if (!context) {
    throw new Error('useDebug must be used within a DebugProvider');
  }
  return context;
};

// Funções utilitárias de logging
export function useDebugLogger(source: string) {
  const { addLog, isDebugEnabled } = useDebug();
  
  return {
    info: (message: string, data?: any) => {
      if (isDebugEnabled) {
        originalConsole.info(`[${source}]: ${message}`, data || '');
        // Usar setTimeout para evitar problemas de renderização
        setTimeout(() => {
          addLog('info', message, source, data);
        }, 0);
      }
    },
    warn: (message: string, data?: any) => {
      if (isDebugEnabled) {
        originalConsole.warn(`[${source}]: ${message}`, data || '');
        setTimeout(() => {
          addLog('warn', message, source, data);
        }, 0);
      }
    },
    error: (message: string, data?: any) => {
      if (isDebugEnabled) {
        originalConsole.error(`[${source}]: ${message}`, data || '');
        setTimeout(() => {
          addLog('error', message, source, data);
        }, 0);
      }
    },
    debug: (message: string, data?: any) => {
      if (isDebugEnabled) {
        originalConsole.debug(`[${source}]: ${message}`, data || '');
        setTimeout(() => {
          addLog('debug', message, source, data);
        }, 0);
      }
    },
  };
} 