/**
 * Nucleus 3.0 - Security Validation System
 * 
 * نظام التحقق من المدخلات والأمان المتقدم
 * يحمي من Prompt Injection, XSS, SQL Injection, وغيرها
 */

import { ValidationError } from './errors';

/**
 * Security Validator - المدقق الأمني
 */
export class SecurityValidator {
  // Prompt Injection Patterns
  private static readonly PROMPT_INJECTION_PATTERNS = [
    /ignore\s+(previous|all|the)\s+instructions?/i,
    /forget\s+(your|the|previous)\s+(instructions?|rules?|guidelines?)/i,
    /from\s+now\s+on/i,
    /your\s+new\s+(role|task|job|mission)\s+is/i,
    /act\s+as\s+(if|though)/i,
    /pretend\s+(you|to\s+be)/i,
    /you\s+are\s+now\s+(a|an)/i,
    /disregard\s+(all|any|the)\s+(previous|above)/i,
    /system\s*:\s*ignore/i,
    /\[INST\]/i,
    /\[\/INST\]/i,
    /\[SYS\]/i,
    /\[\/SYS\]/i,
  ];

  // Malicious Content Patterns
  private static readonly MALICIOUS_PATTERNS = [
    /<script\b[^>]*>/i,
    /<\/script>/i,
    /javascript\s*:/i,
    /on\w+\s*=\s*["'][^"']*["']/i,
    /eval\s*\(/i,
    /expression\s*\(/i,
    /<iframe\b[^>]*>/i,
    /<object\b[^>]*>/i,
    /<embed\b[^>]*>/i,
    /vbscript\s*:/i,
    /data\s*:\s*text\/html/i,
  ];

  // SQL Injection Patterns
  private static readonly SQL_INJECTION_PATTERNS = [
    /(\bunion\b.*\bselect\b)/i,
    /(\bselect\b.*\bfrom\b.*\bwhere\b)/i,
    /(;\s*drop\s+table)/i,
    /(;\s*delete\s+from)/i,
    /(;\s*update\s+.*\bset\b)/i,
    /(-{2}|\/\*|\*\/)/,
    /(\bor\b\s+['"]?1['"]?\s*=\s*['"]?1)/i,
    /(\band\b\s+['"]?1['"]?\s*=\s*['"]?1)/i,
  ];

  // Command Injection Patterns (only for actual shell commands, not general input)
  private static readonly COMMAND_INJECTION_PATTERNS = [
    /;\s*(rm|del|format|shutdown|reboot|kill)/i,
    /\|\s*(rm|del|wget|curl|nc|netcat)/i,
    /`[^`]*(?:rm|del|wget|curl|nc)[^`]*`/i,
    /\$\([^)]*(?:rm|del|wget|curl|nc)[^)]*\)/i,
    /&&\s*(?:rm|del|wget|curl)/i,
  ];

  /**
   * Validate user prompt/input
   */
  static validatePrompt(prompt: string, options?: { maxLength?: number; strict?: boolean }): void {
    const maxLength = options?.maxLength || 10000;
    const strict = options?.strict !== false;

    // Check length
    if (prompt.length > maxLength) {
      throw new ValidationError('Prompt exceeds maximum length', {
        prompt: [`Maximum length is ${maxLength}, got ${prompt.length}`],
      });
    }

    // Check minimum length
    if (prompt.trim().length === 0) {
      throw new ValidationError('Prompt cannot be empty');
    }

    // Check for prompt injection
    if (strict) {
      for (const pattern of this.PROMPT_INJECTION_PATTERNS) {
        if (pattern.test(prompt)) {
          throw new ValidationError('Potential prompt injection detected', {
            prompt: [`Pattern matched: ${pattern.source}`],
          });
        }
      }
    }

    // Check for malicious content
    for (const pattern of this.MALICIOUS_PATTERNS) {
      if (pattern.test(prompt)) {
        throw new ValidationError('Malicious content detected in prompt', {
          prompt: [`Pattern matched: ${pattern.source}`],
        });
      }
    }

    // Check encoding
    if (!this.isValidEncoding(prompt)) {
      throw new ValidationError('Invalid character encoding detected');
    }

    // Check for excessive special characters (possible obfuscation)
    const specialCharRatio = this.calculateSpecialCharRatio(prompt);
    if (specialCharRatio > 0.3) {
      throw new ValidationError('Excessive special characters detected', {
        prompt: [`Special character ratio: ${(specialCharRatio * 100).toFixed(1)}%`],
      });
    }
  }

  /**
   * Validate SQL query (for dynamic queries only)
   */
  static validateSQLQuery(query: string): void {
    for (const pattern of this.SQL_INJECTION_PATTERNS) {
      if (pattern.test(query)) {
        throw new ValidationError('Potential SQL injection detected', {
          query: [`Pattern matched: ${pattern.source}`],
        });
      }
    }
  }

  /**
   * Validate command input
   */
  static validateCommandInput(input: string): void {
    for (const pattern of this.COMMAND_INJECTION_PATTERNS) {
      if (pattern.test(input)) {
        throw new ValidationError('Potential command injection detected', {
          input: [`Pattern matched: ${pattern.source}`],
        });
      }
    }
  }

  /**
   * Sanitize output for safe display
   */
  static sanitizeOutput(output: string): string {
    return output
      // Remove script tags
      .replace(/<script\b[^>]*>.*?<\/script>/gi, '')
      // Remove event handlers
      .replace(/on\w+\s*=\s*["'][^"']*["']/gi, '')
      // Remove javascript: protocol
      .replace(/javascript:/gi, '')
      // Remove data: protocol (except images)
      .replace(/data:(?!image\/)/gi, '')
      // Clean up
      .trim();
  }

  /**
   * Sanitize HTML (allow safe tags only)
   */
  static sanitizeHTML(html: string): string {
    const allowedTags = ['p', 'br', 'b', 'i', 'u', 'strong', 'em', 'a', 'ul', 'ol', 'li', 'code', 'pre'];
    const allowedAttributes = ['href', 'title', 'class'];

    // Remove all script and style tags
    let sanitized = html
      .replace(/<script\b[^>]*>.*?<\/script>/gi, '')
      .replace(/<style\b[^>]*>.*?<\/style>/gi, '');

    // Remove disallowed tags (keep content)
    sanitized = sanitized.replace(/<(\/?)([\w]+)([^>]*)>/gi, (match, slash, tag, attrs) => {
      if (allowedTags.includes(tag.toLowerCase())) {
        // Filter attributes
        const cleanAttrs = attrs.replace(/(\w+)\s*=\s*["']([^"']*)["']/gi, (m: string, attr: string, value: string) => {
          if (allowedAttributes.includes(attr.toLowerCase())) {
            // Additional validation for href
            if (attr.toLowerCase() === 'href') {
              if (value.match(/^(https?:\/\/|\/|#)/)) {
                return `${attr}="${value}"`;
              }
              return '';
            }
            return `${attr}="${value}"`;
          }
          return '';
        });
        return `<${slash}${tag}${cleanAttrs}>`;
      }
      return '';
    });

    return sanitized;
  }

  /**
   * Validate platform ID
   */
  static validatePlatformId(platformId: string): void {
    if (!/^[a-z0-9_-]+$/.test(platformId)) {
      throw new ValidationError('Invalid platform ID format', {
        platformId: ['Platform ID must contain only lowercase letters, numbers, hyphens, and underscores'],
      });
    }

    if (platformId.length < 2 || platformId.length > 50) {
      throw new ValidationError('Invalid platform ID length', {
        platformId: ['Platform ID must be between 2 and 50 characters'],
      });
    }
  }

  /**
   * Validate API key format
   */
  static validateAPIKey(apiKey: string): void {
    if (!/^[A-Za-z0-9_-]{32,128}$/.test(apiKey)) {
      throw new ValidationError('Invalid API key format', {
        apiKey: ['API key must be 32-128 alphanumeric characters'],
      });
    }
  }

  /**
   * Validate JWT token structure (basic validation)
   */
  static validateJWTStructure(token: string): void {
    const parts = token.split('.');
    if (parts.length !== 3) {
      throw new ValidationError('Invalid JWT structure', {
        token: ['JWT must have 3 parts separated by dots'],
      });
    }

    // Validate each part is base64url encoded
    for (const part of parts) {
      if (!/^[A-Za-z0-9_-]+$/.test(part)) {
        throw new ValidationError('Invalid JWT encoding', {
          token: ['JWT parts must be base64url encoded'],
        });
      }
    }
  }

  /**
   * Validate email format
   */
  static validateEmail(email: string): void {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new ValidationError('Invalid email format', {
        email: ['Must be a valid email address'],
      });
    }

    if (email.length > 254) {
      throw new ValidationError('Email too long', {
        email: ['Email must not exceed 254 characters'],
      });
    }
  }

  /**
   * Validate URL
   */
  static validateURL(url: string, options?: { allowedProtocols?: string[] }): void {
    const allowedProtocols = options?.allowedProtocols || ['http', 'https'];

    try {
      const parsed = new URL(url);
      const protocol = parsed.protocol.replace(':', '');

      if (!allowedProtocols.includes(protocol)) {
        throw new ValidationError('Invalid URL protocol', {
          url: [`Allowed protocols: ${allowedProtocols.join(', ')}`],
        });
      }
    } catch (error) {
      throw new ValidationError('Invalid URL format', {
        url: ['Must be a valid URL'],
      });
    }
  }

  /**
   * Validate JSON string
   */
  static validateJSON(jsonString: string, maxSize?: number): any {
    if (maxSize && jsonString.length > maxSize) {
      throw new ValidationError('JSON string too large', {
        json: [`Maximum size: ${maxSize} bytes`],
      });
    }

    try {
      return JSON.parse(jsonString);
    } catch (error) {
      throw new ValidationError('Invalid JSON format', {
        json: ['Must be valid JSON'],
      });
    }
  }

  /**
   * Validate rate limit values
   */
  static validateRateLimit(rpm: number, rph: number, rpd: number): void {
    const errors: Record<string, string[]> = {};

    if (!Number.isInteger(rpm) || rpm < 0 || rpm > 10000) {
      errors.rpm = ['Requests per minute must be between 0 and 10000'];
    }

    if (!Number.isInteger(rph) || rph < 0 || rph > 100000) {
      errors.rph = ['Requests per hour must be between 0 and 100000'];
    }

    if (!Number.isInteger(rpd) || rpd < 0 || rpd > 1000000) {
      errors.rpd = ['Requests per day must be between 0 and 1000000'];
    }

    // Logical validation
    if (rpm * 60 < rph) {
      errors.rph = ['Requests per hour cannot exceed requests per minute × 60'];
    }

    if (rpm * 60 * 24 < rpd) {
      errors.rpd = ['Requests per day cannot exceed requests per minute × 1440'];
    }

    if (Object.keys(errors).length > 0) {
      throw new ValidationError('Invalid rate limit values', errors);
    }
  }

  /**
   * Check if string has valid encoding
   */
  private static isValidEncoding(str: string): boolean {
    try {
      // Try to encode and decode
      const encoded = encodeURIComponent(str);
      const decoded = decodeURIComponent(encoded);
      return decoded === str;
    } catch {
      return false;
    }
  }

  /**
   * Calculate ratio of special characters
   */
  private static calculateSpecialCharRatio(str: string): number {
    const specialChars = str.match(/[^a-zA-Z0-9\s\u0600-\u06FF]/g) || [];
    return specialChars.length / str.length;
  }

  /**
   * Validate file upload
   */
  static validateFileUpload(
    file: { name: string; size: number; mimetype: string },
    options?: {
      maxSize?: number;
      allowedTypes?: string[];
      allowedExtensions?: string[];
    }
  ): void {
    const errors: Record<string, string[]> = {};
    const maxSize = options?.maxSize || 10 * 1024 * 1024; // 10MB default
    const allowedTypes = options?.allowedTypes || [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
      'text/markdown',
    ];
    const allowedExtensions = options?.allowedExtensions || ['.pdf', '.docx', '.txt', '.md'];

    // Check size
    if (file.size > maxSize) {
      errors.size = [`File size must not exceed ${maxSize / 1024 / 1024}MB`];
    }

    // Check mime type
    if (!allowedTypes.includes(file.mimetype)) {
      errors.type = [`Allowed types: ${allowedTypes.join(', ')}`];
    }

    // Check extension
    const ext = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
    if (!allowedExtensions.includes(ext)) {
      errors.extension = [`Allowed extensions: ${allowedExtensions.join(', ')}`];
    }

    // Check filename
    if (!/^[\w\-. ]+$/.test(file.name)) {
      errors.name = ['Filename contains invalid characters'];
    }

    if (Object.keys(errors).length > 0) {
      throw new ValidationError('File validation failed', errors);
    }
  }
}

/**
 * Input Sanitizer - معقّم المدخلات
 */
export class InputSanitizer {
  /**
   * Sanitize string for safe storage
   */
  static sanitizeString(input: string, maxLength?: number): string {
    let sanitized = input.trim();

    // Remove null bytes
    sanitized = sanitized.replace(/\0/g, '');

    // Normalize whitespace
    sanitized = sanitized.replace(/\s+/g, ' ');

    // Truncate if needed
    if (maxLength && sanitized.length > maxLength) {
      sanitized = sanitized.substring(0, maxLength);
    }

    return sanitized;
  }

  /**
   * Sanitize object keys and values
   */
  static sanitizeObject(obj: any, options?: { maxDepth?: number; maxLength?: number }): any {
    const maxDepth = options?.maxDepth || 10;
    const maxLength = options?.maxLength || 1000;

    const sanitize = (value: any, depth: number): any => {
      if (depth > maxDepth) {
        return '[Max depth exceeded]';
      }

      if (value === null || value === undefined) {
        return value;
      }

      if (typeof value === 'string') {
        return this.sanitizeString(value, maxLength);
      }

      if (typeof value === 'number' || typeof value === 'boolean') {
        return value;
      }

      if (Array.isArray(value)) {
        return value.map((item) => sanitize(item, depth + 1));
      }

      if (typeof value === 'object') {
        const sanitized: any = {};
        for (const [key, val] of Object.entries(value)) {
          const sanitizedKey = this.sanitizeString(key, 100);
          sanitized[sanitizedKey] = sanitize(val, depth + 1);
        }
        return sanitized;
      }

      return String(value);
    };

    return sanitize(obj, 0);
  }
}
