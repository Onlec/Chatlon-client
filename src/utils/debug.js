// src/utils/debug.js
/**
 * Centralized debug logging.
 * Set DEBUG to false voor productie.
 */

const DEBUG = true; // Toggle voor alle debug logs

export const log = (tag, ...args) => {
  if (DEBUG) console.log(`[${tag}]`, ...args);
};

export default { log };