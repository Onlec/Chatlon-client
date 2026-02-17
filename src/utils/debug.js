// src/utils/debug.js
/**
 * Centralized debug logging.
 * Checkt debugMode setting uit localStorage.
 */

/**
 * Check if debug mode is enabled
 */
const isDebugEnabled = () => {
  // Always debug in development mode
  if (process.env.NODE_ENV === 'development') {
    return true;
  }
  
  // In production, check settings
  try {
    const settings = localStorage.getItem('chatlon_settings');
    if (settings) {
      const parsed = JSON.parse(settings);
      return parsed.debugMode === true;
    }
  } catch (e) {
    // If settings can't be read, default to false
    return false;
  }
  
  return false;
};

/**
 * Tagged debug logging
 * @param {string} tag - Category/module name
 * @param {...any} args - Arguments to log
 */
export const log = (tag, ...args) => {
  if (isDebugEnabled()) {
    // Add timestamp for better debugging
    const timestamp = new Date().toLocaleTimeString('nl-NL', { 
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit',
      fractionalSecondDigits: 3
    });
    console.log(`[${timestamp}] [${tag}]`, ...args);
  }
};

/**
 * Always log (voor critical errors)
 */
export const logAlways = (tag, ...args) => {
  const timestamp = new Date().toLocaleTimeString('nl-NL', { 
    hour: '2-digit', 
    minute: '2-digit', 
    second: '2-digit',
    fractionalSecondDigits: 3
  });
  console.log(`[${timestamp}] [${tag}]`, ...args);
};

/**
 * Error logging (altijd zichtbaar)
 */
export const logError = (tag, ...args) => {
  const timestamp = new Date().toLocaleTimeString('nl-NL', { 
    hour: '2-digit', 
    minute: '2-digit', 
    second: '2-digit',
    fractionalSecondDigits: 3
  });
  console.error(`[${timestamp}] [${tag}]`, ...args);
};

/**
 * Warning logging (altijd zichtbaar)
 */
export const logWarn = (tag, ...args) => {
  const timestamp = new Date().toLocaleTimeString('nl-NL', { 
    hour: '2-digit', 
    minute: '2-digit', 
    second: '2-digit',
    fractionalSecondDigits: 3
  });
  console.warn(`[${timestamp}] [${tag}]`, ...args);
};

export default { log, logAlways, logError, logWarn };