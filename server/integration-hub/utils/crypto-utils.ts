/**
 * ═══════════════════════════════════════════════════════════
 * Crypto & Encoding Utilities
 * ═══════════════════════════════════════════════════════════
 * Professional data integrity and encoding utilities
 * - SHA-256 checksums for file integrity
 * - Base64 encoding/decoding for binary files
 * - UTF-8 text handling
 */

import crypto from 'crypto';

export type ContentEncoding = 'utf-8' | 'base64' | 'binary';

export interface EncodedContent {
  content: string;
  encoding: ContentEncoding;
  checksum: string;
  size: number;
}

/**
 * حساب Checksum (SHA-256)
 * Calculate SHA-256 checksum for data integrity
 * IMPORTANT: Operates on raw bytes to support binary files
 */
export function calculateChecksum(content: string | Buffer): string {
  // Convert string to Buffer if needed, preserving original bytes
  const buffer = Buffer.isBuffer(content)
    ? content
    : Buffer.from(content, 'utf-8');
    
  return crypto
    .createHash('sha256')
    .update(buffer)
    .digest('hex');
}

/**
 * التحقق من Checksum
 * Verify checksum matches expected value
 * IMPORTANT: Operates on raw bytes to support binary files
 */
export function verifyChecksum(content: string | Buffer, expectedChecksum: string): boolean {
  const actualChecksum = calculateChecksum(content);
  return actualChecksum === expectedChecksum;
}

/**
 * تشفير المحتوى (Base64 أو UTF-8)
 * Encode content to Base64 or UTF-8
 */
export function encodeContent(
  content: string | Buffer,
  targetEncoding: ContentEncoding
): string {
  if (targetEncoding === 'base64') {
    // Convert to Base64 for binary data
    const buffer = Buffer.isBuffer(content)
      ? content
      : Buffer.from(content, 'utf-8');
    return buffer.toString('base64');
  }

  // UTF-8 text (default)
  return Buffer.isBuffer(content) ? content.toString('utf-8') : content;
}

/**
 * فك تشفير المحتوى
 * Decode content from Base64 or UTF-8 to Buffer
 * CRITICAL: Returns Buffer to preserve binary integrity
 */
export function decodeContent(content: string, encoding: ContentEncoding): Buffer {
  if (encoding === 'base64') {
    // Decode Base64 to ORIGINAL bytes (NO UTF-8 conversion!)
    return Buffer.from(content, 'base64');
  }

  // UTF-8 text to bytes
  return Buffer.from(content, 'utf-8');
}

/**
 * كشف نوع المحتوى
 * Detect if content is binary or text
 */
export function detectEncoding(content: string | Buffer): ContentEncoding {
  if (Buffer.isBuffer(content)) {
    return 'base64'; // Binary content needs Base64 encoding
  }

  // Check if string contains binary characters (non-printable)
  const hasNonPrintable = /[\x00-\x08\x0E-\x1F\x7F-\xFF]/.test(content);
  
  if (hasNonPrintable) {
    return 'base64'; // Binary content in string form
  }

  return 'utf-8'; // Regular text content
}

/**
 * معالجة المحتوى بشكل كامل
 * Process content with encoding and checksum
 * CRITICAL FIX: Uses correct encoding when converting string to Buffer
 */
export function processContent(
  content: string | Buffer,
  preferredEncoding?: ContentEncoding
): EncodedContent {
  // Auto-detect encoding if not specified - BEFORE Buffer conversion!
  // This ensures we distinguish between text strings and binary Buffers
  const encoding = preferredEncoding || detectEncoding(content);
  
  // Convert to Buffer using CORRECT encoding
  // CRITICAL: If API says "base64", decode from Base64, not UTF-8!
  let originalBuffer: Buffer;
  
  if (Buffer.isBuffer(content)) {
    originalBuffer = content;
  } else if (encoding === 'base64') {
    // Binary content in Base64 string - decode to ORIGINAL bytes
    originalBuffer = Buffer.from(content, 'base64');
  } else {
    // Text content - convert UTF-8 string to bytes
    originalBuffer = Buffer.from(content, 'utf-8');
  }
  
  // CRITICAL: For binary files, keep as Base64 (don't convert to UTF-8!)
  // For text files, keep as UTF-8
  const encodedContent = encoding === 'base64' 
    ? originalBuffer.toString('base64') // Keep Base64 for binary
    : originalBuffer.toString('utf-8');   // Keep UTF-8 for text
  
  // CRITICAL: Calculate checksum on ORIGINAL BYTES (preserves binary integrity)
  const checksum = calculateChecksum(originalBuffer);
  
  // Calculate size in bytes of ORIGINAL content
  const size = originalBuffer.length;

  return {
    content: encodedContent,
    encoding,
    checksum,
    size,
  };
}

/**
 * استرجاع المحتوى مع التحقق
 * Restore content and verify integrity
 * CRITICAL FIX: Returns Base64 for binary files, UTF-8 for text files
 */
export function restoreContent(
  encodedData: EncodedContent,
  verifyIntegrity = true
): string {
  // Decode content based on encoding type to ORIGINAL bytes
  let decodedBuffer: Buffer;
  
  if (encodedData.encoding === 'base64') {
    // Binary content: decode from Base64 to original bytes
    decodedBuffer = Buffer.from(encodedData.content, 'base64');
  } else {
    // Text content: convert string to Buffer
    decodedBuffer = Buffer.from(encodedData.content, 'utf-8');
  }
  
  // Verify checksum if requested (operates on ORIGINAL raw bytes)
  if (verifyIntegrity) {
    const isValid = verifyChecksum(decodedBuffer, encodedData.checksum);
    
    if (!isValid) {
      throw new Error(
        `Checksum verification failed! ` +
        `Expected: ${encodedData.checksum}, ` +
        `Got: ${calculateChecksum(decodedBuffer)}`
      );
    }
  }

  // CRITICAL: For binary files, keep as Base64 (API-safe transport)
  // For text files, return as UTF-8 string
  if (encodedData.encoding === 'base64') {
    return decodedBuffer.toString('base64'); // Keep Base64 for binary
  } else {
    return decodedBuffer.toString('utf-8'); // UTF-8 for text
  }
}

/**
 * معلومات المحتوى
 * Get content metadata
 * CRITICAL: Operates on ORIGINAL bytes for accurate size/checksum
 */
export function getContentInfo(content: string | Buffer): {
  size: number;
  checksum: string;
  encoding: ContentEncoding;
  isBinary: boolean;
} {
  const encoding = detectEncoding(content);
  
  // Convert to Buffer using CORRECT encoding to get ORIGINAL bytes
  let buffer: Buffer;
  if (Buffer.isBuffer(content)) {
    buffer = content;
  } else if (encoding === 'base64') {
    // Binary content in Base64 - decode to ORIGINAL bytes
    buffer = Buffer.from(content, 'base64');
  } else {
    // Text content - UTF-8 bytes
    buffer = Buffer.from(content, 'utf-8');
  }
  
  return {
    size: buffer.length, // Size of ORIGINAL bytes
    checksum: calculateChecksum(buffer), // Checksum on ORIGINAL bytes
    encoding,
    isBinary: encoding === 'base64',
  };
}
