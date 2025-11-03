/**
 * PHASE 11.5: EMPIRE PRO+ ENTRY POINT
 * Emperor Nicholas - Autonomous Bootstrap Runner
 * 
 * Single command to start the entire Surooh Empire:
 * npm run start:empire
 */

import { createLogger } from './logger.js';
import { cfg } from './config.js';
import { bootstrap } from './bootstrap.js';

(async () => {
  const logger = createLogger();
  
  logger.info('');
  logger.info('╔═══════════════════════════════════════════════════════════════╗');
  logger.info('║                                                               ║');
  logger.info('║           👑 EMPEROR NICHOLAS - PHASE Ω (11.5)               ║');
  logger.info('║                                                               ║');
  logger.info('║              Autonomous Bootstrap Runner                      ║');
  logger.info('║           Supreme Sovereign Reference System                  ║');
  logger.info('║                                                               ║');
  logger.info('╚═══════════════════════════════════════════════════════════════╝');
  logger.info('');
  
  logger.info({ env: cfg.NODE_ENV, port: cfg.PORT }, '🔧 Configuration loaded');

  try {
    const result = await bootstrap({
      env: process.env,
      logger,
      startTime: Date.now()
    });

    if (!result.success) {
      logger.error('❌ Empire failed to start');
      process.exit(1);
    }

    // Keep process alive
    logger.info('💤 Runner active - Press Ctrl+C to shutdown');
    
  } catch (err: any) {
    logger.error({ err: err.message, stack: err.stack }, '⚠️ Fatal error during bootstrap');
    process.exit(1);
  }
})();
