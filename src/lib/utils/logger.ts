/**
 * NeuroLink Logger Utility
 *
 * Provides conditional logging based on NEUROLINK_DEBUG environment variable
 */

export const logger = {
  debug: (...args: any[]) => {
    if (process.env.NEUROLINK_DEBUG === 'true') {
      console.log(...args);
    }
  },
  info: (...args: any[]) => {
    // Completely disabled for clean CLI demo output
  },
  warn: (...args: any[]) => {
    // Completely disabled for clean CLI demo output
  },
  error: (...args: any[]) => {
    // Always show errors regardless of debug mode
    console.error(...args);
  },
  always: (...args: any[]) => {
    console.log(...args);
  }
};
