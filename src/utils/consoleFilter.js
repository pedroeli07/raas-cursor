// Console filter utility
// This script intercepts and filters console messages to improve debugging experience

/**
 * Set up console filtering to hide specific log messages in the browser
 * @param {Array<string|RegExp>} patterns - Array of string patterns or RegExp objects to filter out
 */
export function setupConsoleFilters(patterns = []) {
  // Only run in browser environment
  if (typeof window === 'undefined') return;

  // Default patterns to filter
  const defaultPatterns = [
    '[Fast Refresh]',
    'Download the React DevTools'
  ];

  // Combine default and custom patterns
  const allPatterns = [...defaultPatterns, ...patterns];

  // Store original console methods
  const originalConsole = {
    log: console.log,
    info: console.info,
    warn: console.warn,
    error: console.error,
    debug: console.debug
  };

  // Helper to check if a message matches any pattern
  const shouldFilter = (args) => {
    if (!args || args.length === 0) return false;
    
    const message = String(args[0]);
    
    return allPatterns.some(pattern => {
      if (pattern instanceof RegExp) {
        return pattern.test(message);
      }
      return message.includes(pattern);
    });
  };

  // Override console methods
  console.log = function(...args) {
    if (!shouldFilter(args)) {
      originalConsole.log.apply(console, args);
    }
  };

  console.info = function(...args) {
    if (!shouldFilter(args)) {
      originalConsole.info.apply(console, args);
    }
  };

  console.warn = function(...args) {
    if (!shouldFilter(args)) {
      originalConsole.warn.apply(console, args);
    }
  };

  console.error = function(...args) {
    // We typically don't filter errors, but if they're in the pattern list, we will
    if (!shouldFilter(args)) {
      originalConsole.error.apply(console, args);
    }
  };

  console.debug = function(...args) {
    if (!shouldFilter(args)) {
      originalConsole.debug.apply(console, args);
    }
  };

  // Log a silent message to indicate filtering is active
  // This won't appear in the console due to our filter
  originalConsole.log(
    "%c[Console Filter] %cActive - Filtering unwanted messages", 
    "color: purple; font-weight: bold", 
    "color: gray"
  );
}

/**
 * Add additional patterns to filter after setup
 * @param {Array<string|RegExp>} patterns - Array of string patterns or RegExp objects to filter out
 */
export function addConsoleFilters(patterns = []) {
  if (typeof window === 'undefined') return;
  
  const currentFilters = window.__CONSOLE_FILTERS || [];
  window.__CONSOLE_FILTERS = [...currentFilters, ...patterns];
  
  // Re-setup with new patterns
  setupConsoleFilters(window.__CONSOLE_FILTERS);
}

export default setupConsoleFilters; 