/**
 * Utility functions for sanitizing user input to prevent XSS attacks
 */

/**
 * Sanitizes a string by escaping HTML special characters
 * @param input The string to sanitize
 * @returns The sanitized string
 */
export function sanitizeString(input: string): string {
  if (!input) return '';
  
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Sanitizes an object by escaping HTML special characters in all string values
 * @param obj The object to sanitize
 * @returns A new object with sanitized string values
 */
export function sanitizeObject<T extends Record<string, any>>(obj: T): Record<string, any> {
  if (!obj) return obj;
  
  const result: Record<string, any> = { ...obj };
  
  Object.keys(result).forEach(key => {
    const value = result[key];
    
    if (typeof value === 'string') {
      result[key] = sanitizeString(value);
    } else if (typeof value === 'object' && value !== null) {
      result[key] = sanitizeObject(value);
    }
  });
  
  return result as T;
}

/**
 * Sanitizes user input before rendering it in the DOM
 * Use this for any user-generated content that needs to be displayed
 * @param content The content to sanitize
 * @returns The sanitized content
 */
export function sanitizeUserContent(content: string): string {
  if (!content) return '';
  
  // Basic HTML sanitization
  return sanitizeString(content);
}

/**
 * Validates and sanitizes a URL to prevent javascript: protocol exploits
 * @param url The URL to validate and sanitize
 * @returns The sanitized URL or an empty string if invalid
 */
export function sanitizeUrl(url: string): string {
  if (!url) return '';
  
  // Check for javascript: protocol
  if (/^javascript:/i.test(url)) {
    return '';
  }
  
  // Check for data: protocol
  if (/^data:/i.test(url)) {
    // Only allow data: URLs for images
    if (!/^data:image\//i.test(url)) {
      return '';
    }
  }
  
  return url;
}