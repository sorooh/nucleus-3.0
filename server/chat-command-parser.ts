/**
 * Nicholas Chat Command Parser
 * Detects executable commands in user messages
 */

export interface ParsedCommand {
  isCommand: boolean;
  action?: string;
  target?: string;
  parameters?: Record<string, any>;
  rawMessage: string;
}

/**
 * Parse user message for executable commands
 */
export function parseCommand(message: string): ParsedCommand {
  const msg = message.toLowerCase().trim();
  
  // Command patterns
  const deployPattern = /(?:نفذ|سوي|deploy|execute)\s+(?:deploy|نشر|توزيع)\s+(?:على|on|to)?\s*([\w\s-]+)/i;
  const restartPattern = /(?:نفذ|سوي|restart|أعد تشغيل)\s+(?:restart|إعادة تشغيل)\s+(?:على|on|to)?\s*([\w\s-]+)/i;
  const statusPattern = /(?:شو حالة|what.*status|status of|وضع)\s*([\w\s-]+)/i;
  const listPattern = /(?:اعرض|list|show|وريني)\s+(?:platforms|المنصات|منصات)/i;
  
  // Check for deploy command
  const deployMatch = message.match(deployPattern);
  if (deployMatch) {
    return {
      isCommand: true,
      action: 'deploy_side',
      target: deployMatch[1]?.trim() || 'all',
      parameters: {},
      rawMessage: message
    };
  }
  
  // Check for restart command
  const restartMatch = message.match(restartPattern);
  if (restartMatch) {
    return {
      isCommand: true,
      action: 'restart_platform',
      target: restartMatch[1]?.trim() || 'all',
      parameters: {},
      rawMessage: message
    };
  }
  
  // Check for status command
  const statusMatch = message.match(statusPattern);
  if (statusMatch) {
    return {
      isCommand: true,
      action: 'get_status',
      target: statusMatch[1]?.trim() || 'all',
      parameters: {},
      rawMessage: message
    };
  }
  
  // Check for list platforms
  if (listPattern.test(message)) {
    return {
      isCommand: true,
      action: 'list_platforms',
      parameters: {},
      rawMessage: message
    };
  }
  
  // Not a command
  return {
    isCommand: false,
    rawMessage: message
  };
}

/**
 * Map friendly platform names to actual IDs
 */
export function resolvePlatformId(name: string): string[] {
  const nameMap: Record<string, string[]> = {
    'mail hub': ['mail-hub'],
    'mailhub': ['mail-hub'],
    'mail': ['mail-hub'],
    
    'wallet': ['wallet-platform'],
    'محفظة': ['wallet-platform'],
    
    'docs': ['docs-platform'],
    'وثائق': ['docs-platform'],
    
    'all': ['mail-hub', 'wallet-platform', 'docs-platform'],
    'الكل': ['mail-hub', 'wallet-platform', 'docs-platform'],
    'كل المنصات': ['mail-hub', 'wallet-platform', 'docs-platform']
  };
  
  const normalized = name.toLowerCase().trim();
  return nameMap[normalized] || [normalized];
}
