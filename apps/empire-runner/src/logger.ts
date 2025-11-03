/**
 * PHASE 11.5: EMPIRE PRO+ LOGGER
 * Structured logging with Pino
 */

import pino from 'pino';

export const createLogger = () => pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: process.env.NODE_ENV === 'production' ? undefined : {
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'SYS:yyyy-mm-dd HH:MM:ss',
      ignore: 'pid,hostname',
      messageFormat: '👑 {msg}'
    }
  },
  formatters: {
    level: (label) => {
      return { level: label.toUpperCase() };
    }
  },
  timestamp: pino.stdTimeFunctions.isoTime
});

export type Logger = ReturnType<typeof createLogger>;
