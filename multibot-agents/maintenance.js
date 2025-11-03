import { notifyCore } from './core-client.js';
import { getOrCreateIdentity } from './identity.js';
import { requestPermission, registerCommandHandler } from './control-channel.js';

let identity = null;
let maintenanceInterval = null;
let isRunning = false;

export async function startMaintenance() {
  console.log('🛠️  Maintenance Bot starting...');
  
  identity = await getOrCreateIdentity();
  
  // Register command handlers
  registerCommandHandler('start', startMaintenanceTask);
  registerCommandHandler('stop', stopMaintenanceTask);
  registerCommandHandler('task', executeMaintenanceTask);
  
  // Notify activation
  try {
    await notifyCore('activated', {
      uuid: identity.uuid,
      ip: identity.ip,
      agentType: 'maintenance',
      name: process.env.BOT_NAME
    });
    console.log('✅ Maintenance Bot activated - Nucleus notified');
  } catch (err) {
    console.error('⚠️  Activation notification failed:', err.message);
  }
  
  // Schedule maintenance checks (every 5 minutes)
  maintenanceInterval = setInterval(async () => {
    await performMaintenanceCheck();
  }, 300000);
  
  isRunning = true;
  console.log('🛠️  Maintenance Bot ready - awaiting Nucleus commands');
}

async function performMaintenanceCheck() {
  console.log('🔍 Running system checks...');
  
  // Collect system metrics
  const metrics = {
    memory: process.memoryUsage(),
    uptime: process.uptime(),
    cpu: process.cpuUsage()
  };

  // Check if maintenance needed
  const needsMaintenance = detectMaintenanceNeeds(metrics);
  
  if (needsMaintenance.length > 0) {
    console.log('⚠️  Maintenance needed:', needsMaintenance);
    
    // Request permission from Nucleus for each maintenance task
    for (const task of needsMaintenance) {
      await requestMaintenancePermission(task);
    }
  } else {
    console.log('✅ System checks complete - no maintenance needed');
  }
}

async function requestMaintenancePermission(task) {
  try {
    console.log(`🔐 Requesting permission: ${task.action}`);
    
    // Request permission from Nucleus
    const response = await requestPermission(task.action, task.details, identity);
    
    if (response.approved) {
      console.log(`✅ Permission granted - executing: ${task.action}`);
      await executeMaintenanceAction(task);
      
      // Report completion
      await notifyCore('maintenance_completed', {
        uuid: identity.uuid,
        action: task.action,
        status: 'success',
        timestamp: Date.now()
      });
    } else {
      console.log(`❌ Permission denied: ${task.action}`);
      console.log(`Reason: ${response.reason}`);
    }
  } catch (err) {
    console.error(`❌ Permission request failed: ${err.message}`);
  }
}

function detectMaintenanceNeeds(metrics) {
  const tasks = [];
  
  // Check memory usage
  const memoryUsagePercent = (metrics.memory.heapUsed / metrics.memory.heapTotal) * 100;
  if (memoryUsagePercent > 80) {
    tasks.push({
      action: 'MEMORY_CLEANUP',
      priority: 'high',
      details: {
        currentUsage: memoryUsagePercent.toFixed(2) + '%',
        threshold: '80%',
        reason: 'High memory usage detected'
      }
    });
  }

  // Check uptime (restart if > 24 hours)
  const uptimeHours = metrics.uptime / 3600;
  if (uptimeHours > 24) {
    tasks.push({
      action: 'RESTART_SERVICE',
      priority: 'medium',
      details: {
        uptime: uptimeHours.toFixed(2) + ' hours',
        threshold: '24 hours',
        reason: 'Long uptime - preventive restart recommended'
      }
    });
  }

  return tasks;
}

async function executeMaintenanceAction(task) {
  console.log(`⚙️  Executing maintenance: ${task.action}`);
  
  switch (task.action) {
    case 'MEMORY_CLEANUP':
      // Force garbage collection
      if (global.gc) {
        global.gc();
        console.log('✅ Memory cleanup executed');
      } else {
        console.warn('⚠️  Garbage collection not available (run with --expose-gc)');
      }
      break;
    
    case 'RESTART_SERVICE':
      console.log('🔄 Preparing for restart...');
      // Graceful restart logic
      await notifyCore('restarting', {
        uuid: identity.uuid,
        reason: 'Scheduled maintenance'
      });
      setTimeout(() => process.exit(0), 2000);
      break;
    
    case 'CACHE_CLEANUP':
      console.log('🧹 Cleaning cache...');
      // Cache cleanup logic
      break;
    
    case 'LOG_ROTATION':
      console.log('📋 Rotating logs...');
      // Log rotation logic
      break;
    
    default:
      console.warn('⚠️  Unknown maintenance action:', task.action);
  }
}

function startMaintenanceTask(command) {
  console.log('▶️  Starting maintenance task:', command.task);
  isRunning = true;
}

function stopMaintenanceTask(command) {
  console.log('⏹️  Stopping maintenance task:', command.task);
  isRunning = false;
}

async function executeMaintenanceTask(command) {
  // Check if we have permission
  console.log('🔐 Requesting permission for task:', command.task);
  
  try {
    const response = await requestPermission(
      `EXECUTE_${command.task}`,
      command.details || {},
      identity
    );
    
    if (response.approved) {
      console.log('✅ Permission granted - executing task');
      await executeMaintenanceAction({
        action: command.task,
        priority: command.priority || 'medium',
        details: command.details || {}
      });
    }
  } catch (err) {
    console.error('❌ Task execution failed:', err.message);
  }
}

export function stopMaintenance() {
  if (maintenanceInterval) {
    clearInterval(maintenanceInterval);
  }
  isRunning = false;
  console.log('🛠️  Maintenance Bot stopped');
}
