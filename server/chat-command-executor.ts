/**
 * Nicholas Chat Command Executor
 * Executes parsed commands and returns results
 */

import { actionExecutor } from './proactive-actions/action-executor';
import type { ParsedCommand } from './chat-command-parser';
import { resolvePlatformId } from './chat-command-parser';

export interface ExecutionResult {
  success: boolean;
  message: string;
  details?: any;
  actionId?: string;
}

/**
 * Execute a parsed command
 */
export async function executeCommand(command: ParsedCommand): Promise<ExecutionResult> {
  if (!command.isCommand || !command.action) {
    return {
      success: false,
      message: 'ليس أمراً قابلاً للتنفيذ'
    };
  }
  
  try {
    switch (command.action) {
      case 'deploy_side':
        return await executeDeploy(command);
        
      case 'restart_platform':
        return await executeRestart(command);
        
      case 'get_status':
        return await executeGetStatus(command);
        
      case 'list_platforms':
        return await executeListPlatforms();
        
      default:
        return {
          success: false,
          message: `الأمر "${command.action}" غير معروف`
        };
    }
  } catch (error: any) {
    return {
      success: false,
      message: `❌ فشل التنفيذ: ${error.message}`
    };
  }
}

/**
 * Execute deploy command
 */
async function executeDeploy(command: ParsedCommand): Promise<ExecutionResult> {
  const platformIds = resolvePlatformId(command.target || 'all');
  
  try {
    const action = await actionExecutor.executeAction({
      type: 'api_call',
      targetPlatform: platformIds.join(','),
      payload: { 
        action: 'deploy_side',
        platforms: platformIds 
      },
      title: `Deploy SIDE to ${platformIds.join(', ')}`,
      description: `Deployed via Nicholas Chat Command`,
      requiresApproval: false,
      priority: 'high'
    });
    
    return {
      success: true,
      message: `✅ تم بدء نشر SIDE على ${platformIds.length} منصة:\n${platformIds.map(p => `• ${p}`).join('\n')}\n\n⏳ جاري التنفيذ...`,
      details: { platforms: platformIds },
      actionId: action.id
    };
  } catch (error: any) {
    return {
      success: false,
      message: `❌ فشل النشر: ${error.message}`
    };
  }
}

/**
 * Execute restart command
 */
async function executeRestart(command: ParsedCommand): Promise<ExecutionResult> {
  const platformIds = resolvePlatformId(command.target || 'all');
  
  try {
    const action = await actionExecutor.executeAction({
      type: 'api_call',
      targetPlatform: platformIds.join(','),
      payload: { 
        action: 'restart_platform',
        platforms: platformIds 
      },
      title: `Restart ${platformIds.join(', ')}`,
      description: `Restarted via Nicholas Chat Command`,
      requiresApproval: false,
      priority: 'high'
    });
    
    return {
      success: true,
      message: `✅ تم إرسال أمر إعادة التشغيل لـ ${platformIds.length} منصة:\n${platformIds.map(p => `• ${p}`).join('\n')}`,
      details: { platforms: platformIds },
      actionId: action.id
    };
  } catch (error: any) {
    return {
      success: false,
      message: `❌ فشل إعادة التشغيل: ${error.message}`
    };
  }
}

/**
 * Get platform status
 */
async function executeGetStatus(command: ParsedCommand): Promise<ExecutionResult> {
  const platformIds = resolvePlatformId(command.target || 'all');
  
  // This is a read operation, just return mock status for now
  // In production, this would query real platform status
  const statuses = platformIds.map(p => `• ${p}: 🟢 Online`).join('\n');
  
  return {
    success: true,
    message: `📊 حالة المنصات:\n${statuses}`,
    details: { platforms: platformIds }
  };
}

/**
 * List all platforms
 */
async function executeListPlatforms(): Promise<ExecutionResult> {
  const platforms = [
    '• Mail Hub - 🟢 Online',
    '• Wallet Platform - 🟢 Online',
    '• Docs Platform - 🟢 Online'
  ];
  
  return {
    success: true,
    message: `📋 المنصات المتاحة:\n${platforms.join('\n')}`,
    details: { count: platforms.length }
  };
}
