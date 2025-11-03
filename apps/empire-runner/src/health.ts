/**
 * PHASE 11.5: EMPIRE PRO+ HEALTH CHECKS
 * Service health monitoring and validation
 */

import { ServiceDescriptor, ServiceHealth } from './types.js';
import { Logger } from './logger.js';

export async function waitForHealth(
  service: ServiceDescriptor,
  logger: Logger,
  timeoutMs = 20000
): Promise<boolean> {
  const start = Date.now();
  let attempts = 0;
  
  logger.info({ service: service.name }, `⏳ Waiting for ${service.displayName} to be healthy...`);
  
  while (Date.now() - start < timeoutMs) {
    attempts++;
    try {
      const health = await service.health();
      
      if (health.status === 'up') {
        logger.info(
          { service: service.name, attempts, duration: Date.now() - start },
          `✅ ${service.displayName} is healthy`
        );
        return true;
      }
      
      if (health.status === 'degraded') {
        logger.warn(
          { service: service.name, details: health.details },
          `⚠️ ${service.displayName} is degraded but continuing...`
        );
        return true; // Accept degraded state
      }
      
    } catch (error: any) {
      logger.debug(
        { service: service.name, attempt: attempts, error: error.message },
        `Health check failed, retrying...`
      );
    }
    
    await new Promise(r => setTimeout(r, 1000)); // Wait 1 second between checks
  }
  
  throw new Error(
    `Service ${service.displayName} (${service.name}) failed health check after ${timeoutMs}ms (${attempts} attempts)`
  );
}

export async function checkAllServicesHealth(
  services: ServiceDescriptor[],
  logger: Logger
): Promise<Map<string, ServiceHealth>> {
  const healthMap = new Map<string, ServiceHealth>();
  
  logger.info('🔍 Running health checks on all services...');
  
  for (const service of services) {
    try {
      const health = await service.health();
      healthMap.set(service.name, health);
      
      const icon = health.status === 'up' ? '✅' : health.status === 'degraded' ? '⚠️' : '❌';
      logger.info(
        { service: service.name, status: health.status },
        `${icon} ${service.displayName}: ${health.status.toUpperCase()}`
      );
    } catch (error: any) {
      logger.error(
        { service: service.name, error: error.message },
        `❌ ${service.displayName} health check failed`
      );
      healthMap.set(service.name, {
        status: 'down',
        details: { error: error.message },
        timestamp: new Date().toISOString()
      });
    }
  }
  
  const totalServices = services.length;
  const upServices = Array.from(healthMap.values()).filter(h => h.status === 'up').length;
  const degradedServices = Array.from(healthMap.values()).filter(h => h.status === 'degraded').length;
  const downServices = totalServices - upServices - degradedServices;
  
  logger.info(
    { total: totalServices, up: upServices, degraded: degradedServices, down: downServices },
    `📊 Health Check Summary: ${upServices}/${totalServices} healthy, ${degradedServices} degraded, ${downServices} down`
  );
  
  return healthMap;
}
