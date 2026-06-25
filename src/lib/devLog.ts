/**
 * Development-only logging utilities
 *
 * Guards console.log statements to only run in development mode.
 * In production, these are no-ops to reduce bundle size and noise.
 */

const isDevelopment = process.env.NODE_ENV === 'development';

export const devLog = {
  info: (...args: any[]) => {
    if (isDevelopment) {
      console.log('[DEV]', ...args);
    }
  },

  warn: (...args: any[]) => {
    if (isDevelopment) {
      console.warn('[DEV]', ...args);
    }
  },

  error: (...args: any[]) => {
    // Always log errors, even in production
    console.error('[ERROR]', ...args);
  },

  group: (label: string) => {
    if (isDevelopment) {
      console.group(`[DEV] ${label}`);
    }
  },

  groupEnd: () => {
    if (isDevelopment) {
      console.groupEnd();
    }
  },

  table: (data: any) => {
    if (isDevelopment) {
      console.table(data);
    }
  },
};

/**
 * Labeled logging for specific features
 */
export const featureLog = {
  frontage: (...args: any[]) => devLog.info('[Frontage]', ...args),
  orientation: (...args: any[]) => devLog.info('[Orientation]', ...args),
  market: (...args: any[]) => devLog.info('[Market]', ...args),
  resCode: (...args: any[]) => devLog.info('[ResCode]', ...args),
  ssd: (...args: any[]) => devLog.info('[SSD]', ...args),
};
