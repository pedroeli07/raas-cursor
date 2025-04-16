// Path: src/lib/logs/logger.ts
// Enhanced logger with development mode support and colors

const isDev = process.env.NODE_ENV === 'development';

// ANSI Color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  black: '\x1b[30m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  brightRed: '\x1b[91m',
  brightGreen: '\x1b[92m',
  brightYellow: '\x1b[93m',
  brightBlue: '\x1b[94m',
  brightMagenta: '\x1b[95m',
  brightCyan: '\x1b[96m',
  brightWhite: '\x1b[97m',
  bgRed: '\x1b[41m',
  bgGreen: '\x1b[42m',
  bgYellow: '\x1b[43m',
  bgBlue: '\x1b[44m',
};

// Map log levels to colors
const levelColors = {
  DEBUG: colors.blue,
  INFO: colors.green,
  WARN: colors.yellow,
  ERROR: colors.red,
  FATAL: colors.brightRed + colors.bgRed,
};

// Map source to colors
const sourceColors = {
  FRONTEND: colors.magenta,
  BACKEND: colors.cyan,
};

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
 * @param obj - Object to stringify
 * @param includeSensitive - Whether to include sensitive data (only in development)
 */
function safeStringify(obj: Record<string, unknown> | undefined, includeSensitive = false): string {
  if (!obj) return '';
  
  // Create a set of all Form data for debugging
  if (obj.formData && typeof obj.formData === 'object') {
    try {
      // Clone the formData to avoid modifying the original
      const formDebug: Record<string, any> = {};
      Object.entries(obj.formData as Record<string, any>).forEach(([key, value]) => {
        // For nested form data like address objects
        if (value && typeof value === 'object') {
          formDebug[key] = { ...value };
        } else {
          formDebug[key] = value;
        }
      });
      
      // Add the form debug data separately
      obj = { ...obj, formDebug };
    } catch (e) {
      // If anything goes wrong, just continue with the original object
    }
  }
  
  const cache: unknown[] = [];
  return JSON.stringify(obj, (key, value) => {
    // Handle form values specially to get better debugging
    if (key === 'formData' || key === 'formValues') {
      return value; // Already handled above
    }
    
    // Don't mask sensitive data in development mode or if explicitly allowed
    if (isDev || includeSensitive) {
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
 * Formats a log message with timestamp, level, source, and color
 */
function formatLog(level: string, source: 'FRONTEND' | 'BACKEND', msg: string, obj?: Record<string, unknown>): string {
  const timestamp = new Date().toISOString();
  const callerInfo = isDev ? ` ${getCallerInfo()}` : '';
  const objStr = obj ? ' ' + safeStringify(obj) : '';
  
  // Basic formatted log without colors (for file logging)
  const basicLog = `[${timestamp}] [${level}] [${source}]${callerInfo} ${msg}${objStr}`;
  
  // Colored log for console
  if (typeof window === 'undefined') {
    // Node.js environment (server-side)
    const levelColor = levelColors[level as keyof typeof levelColors] || '';
    const sourceColor = sourceColors[source] || '';
    
    return `${colors.white}[${timestamp}] ${levelColor}[${level}]${colors.reset} ${sourceColor}[${source}]${colors.reset}${callerInfo} ${msg}${objStr}`;
  }
  
  // Browser environment (client-side) - no color codes
  return basicLog;
}

/**
 * Log to both console and any additional targets
 */
function logToTargets(level: string, source: 'FRONTEND' | 'BACKEND', msg: string, obj?: Record<string, unknown>) {
  const formattedMsg = formatLog(level, source, msg, obj);
  
  // In browser, we can use the console styling
  if (typeof window !== 'undefined') {
    const style = level === 'ERROR' || level === 'FATAL' 
      ? 'color: red; font-weight: bold'
      : level === 'WARN'
        ? 'color: orange; font-weight: bold'
        : level === 'INFO'
          ? 'color: green'
          : 'color: gray';
    
    const sourceStyle = source === 'FRONTEND' 
      ? 'color: purple; font-weight: bold'
      : 'color: blue; font-weight: bold';
    
    switch (level) {
      case 'DEBUG':
        console.debug(`%c[${level}] %c[${source}]`, style, sourceStyle, msg, obj || '');
        break;
      case 'INFO':
        console.info(`%c[${level}] %c[${source}]`, style, sourceStyle, msg, obj || '');
        break;
      case 'WARN':
        console.warn(`%c[${level}] %c[${source}]`, style, sourceStyle, msg, obj || '');
        break;
      case 'ERROR':
      case 'FATAL':
        console.error(`%c[${level}] %c[${source}]`, style, sourceStyle, msg, obj || '');
        break;
    }
  } else {
    // Node.js environment - use the formatted message with ANSI color codes
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
  form: (formName: string, formValues: Record<string, any>) => {
    // Specially formatted log for form submissions
    logToTargets('INFO', 'FRONTEND', `Form Submission: ${formName}`, { formData: formValues });
  },
};

// Exportar para o resto da aplicação
export { frontendLog, backendLog };
export default backendLog; // Default export para compatibilidade com importações existentes 