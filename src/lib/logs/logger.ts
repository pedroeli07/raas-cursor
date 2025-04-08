// Path: src/lib/logs/logger.ts
// Enhanced logger with development mode support

const isDev = process.env.NODE_ENV === 'development';

/**
 * Gets the stack trace to identify where the log is coming from
 * Only used for internal debugging purposes, not included in actual logs
 */
function getCallerInfo() {
  try {
    const err = new Error();
    const stackLines = err.stack?.split('\n') || [];
    
    // Skip the first 3 lines (Error, getCallerInfo, and the logger method)
    const callerLine = stackLines[3] || '';
    
    // Extract file path and line number
    const match = callerLine.match(/at\s+(.+?)\s+\((.+?):(\d+):(\d+)\)/);
    if (match) {
      const [, funcName, filePath, lineNumber] = match;
      const filePathShort = filePath.split('/').slice(-2).join('/');
      return `${filePathShort}:${lineNumber} ${funcName}`;
    }
    return '';
  } catch (e) {
    return '';
  }
}

/**
 * Safely stringifies objects for logging, handling circular references
 */
function safeStringify(obj: Record<string, unknown> | undefined): string {
  if (!obj) return '';
  
  const cache: unknown[] = [];
  return JSON.stringify(obj, (key, value) => {
    // Don't mask sensitive data in development mode
    if (isDev) {
      if (typeof value === 'object' && value !== null) {
        if (cache.includes(value)) return '[Circular]';
        cache.push(value);
      }
      return value;
    }
    
    // In production, mask sensitive data
    if (key === 'password' || key === 'token' || key.includes('Token') || key.includes('Secret')) {
      return typeof value === 'string' 
        ? `[${value.substring(0, 3)}***${value.substring(value.length - 3)}]` 
        : '[MASKED]';
    }
    
    if (key === 'email' && typeof value === 'string') {
      const [name, domain] = value.split('@');
      if (name && domain) {
        return `${name.substring(0, 2)}***@${domain}`;
      }
    }
    
    if (typeof value === 'object' && value !== null) {
      if (cache.includes(value)) return '[Circular]';
      cache.push(value);
    }
    
    return value;
  }, 2);
}

/**
 * Formats a log message with timestamp, level, and source info
 */
function formatLog(level: string, source: 'FRONTEND' | 'BACKEND', msg: string, obj?: Record<string, unknown>): string {
  const timestamp = new Date().toISOString();
  // Removed callerInfo to clean up logs
  const objStr = obj ? safeStringify(obj) : '';
  
  return `[${timestamp}] [${level}] [${source}] ${msg} ${objStr}`;
}

/**
 * Log to both console and any additional targets
 */
function logToTargets(level: string, source: 'FRONTEND' | 'BACKEND', msg: string, obj?: Record<string, unknown>) {
  const formattedMsg = formatLog(level, source, msg, obj);
  
  switch (level) {
    case 'DEBUG':
      console.debug(formattedMsg);
      break;
    case 'INFO':
      console.info(formattedMsg);
      break;
    case 'WARN':
      console.warn(formattedMsg);
      break;
    case 'ERROR':
    case 'FATAL':
      console.error(formattedMsg);
      break;
  }
  
  // Here we can add additional log targets if needed (e.g., send to server, file, etc.)
}

// Backend logger
const backendLog = {
  debug: (msg: string, obj?: Record<string, unknown>) => {
    logToTargets('DEBUG', 'BACKEND', msg, obj);
  },
  info: (msg: string, obj?: Record<string, unknown>) => {
    logToTargets('INFO', 'BACKEND', msg, obj);
  },
  warn: (msg: string, obj?: Record<string, unknown>) => {
    logToTargets('WARN', 'BACKEND', msg, obj);
  },
  error: (msg: string, obj?: Record<string, unknown>) => {
    logToTargets('ERROR', 'BACKEND', msg, obj);
  },
  fatal: (msg: string, obj?: Record<string, unknown>) => {
    logToTargets('FATAL', 'BACKEND', msg, obj);
  },
};

// Frontend logger
const frontendLog = {
  debug: (msg: string, obj?: Record<string, unknown>) => {
    logToTargets('DEBUG', 'FRONTEND', msg, obj);
  },
  info: (msg: string, obj?: Record<string, unknown>) => {
    logToTargets('INFO', 'FRONTEND', msg, obj);
  },
  warn: (msg: string, obj?: Record<string, unknown>) => {
    logToTargets('WARN', 'FRONTEND', msg, obj);
  },
  error: (msg: string, obj?: Record<string, unknown>) => {
    logToTargets('ERROR', 'FRONTEND', msg, obj);
  },
  fatal: (msg: string, obj?: Record<string, unknown>) => {
    logToTargets('FATAL', 'FRONTEND', msg, obj);
  },
};

// Default export for backward compatibility
export default backendLog;

// Named exports for specific loggers
export { backendLog, frontendLog }; 