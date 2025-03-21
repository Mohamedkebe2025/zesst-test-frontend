/**
 * Input validation utilities to prevent security vulnerabilities
 * These functions help validate user input before processing or storing it
 */

/**
 * Validates an email address
 * @param email The email address to validate
 * @returns True if the email is valid, false otherwise
 */
export function isValidEmail(email: string): boolean {
  if (!email) return false;
  
  // RFC 5322 compliant email regex
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
  
  return emailRegex.test(email);
}

/**
 * Validates a password for strength requirements
 * @param password The password to validate
 * @returns An object with validation result and error message
 */
export function validatePassword(password: string): { isValid: boolean; message: string } {
  if (!password) {
    return { isValid: false, message: 'Password is required' };
  }
  
  if (password.length < 8) {
    return { isValid: false, message: 'Password must be at least 8 characters long' };
  }
  
  // Check for at least one uppercase letter
  if (!/[A-Z]/.test(password)) {
    return { isValid: false, message: 'Password must contain at least one uppercase letter' };
  }
  
  // Check for at least one lowercase letter
  if (!/[a-z]/.test(password)) {
    return { isValid: false, message: 'Password must contain at least one lowercase letter' };
  }
  
  // Check for at least one number
  if (!/[0-9]/.test(password)) {
    return { isValid: false, message: 'Password must contain at least one number' };
  }
  
  // Check for at least one special character
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    return { isValid: false, message: 'Password must contain at least one special character' };
  }
  
  return { isValid: true, message: 'Password is valid' };
}

/**
 * Validates a username for allowed characters and length
 * @param username The username to validate
 * @returns An object with validation result and error message
 */
export function validateUsername(username: string): { isValid: boolean; message: string } {
  if (!username) {
    return { isValid: false, message: 'Username is required' };
  }
  
  if (username.length < 3) {
    return { isValid: false, message: 'Username must be at least 3 characters long' };
  }
  
  if (username.length > 30) {
    return { isValid: false, message: 'Username must be at most 30 characters long' };
  }
  
  // Allow only alphanumeric characters, underscores, and hyphens
  if (!/^[a-zA-Z0-9_-]+$/.test(username)) {
    return { 
      isValid: false, 
      message: 'Username can only contain letters, numbers, underscores, and hyphens' 
    };
  }
  
  return { isValid: true, message: 'Username is valid' };
}

/**
 * Validates a URL for proper format and security
 * @param url The URL to validate
 * @returns An object with validation result and error message
 */
export function validateUrl(url: string): { isValid: boolean; message: string } {
  if (!url) {
    return { isValid: false, message: 'URL is required' };
  }
  
  try {
    // Try to create a URL object to validate the URL
    const urlObj = new URL(url);
    
    // Check for allowed protocols
    if (!['http:', 'https:'].includes(urlObj.protocol)) {
      return { 
        isValid: false, 
        message: 'URL must use http or https protocol' 
      };
    }
    
    return { isValid: true, message: 'URL is valid' };
  } catch (error) {
    return { isValid: false, message: 'Invalid URL format' };
  }
}

/**
 * Validates a workspace name for allowed characters and length
 * @param name The workspace name to validate
 * @returns An object with validation result and error message
 */
export function validateWorkspaceName(name: string): { isValid: boolean; message: string } {
  if (!name) {
    return { isValid: false, message: 'Workspace name is required' };
  }
  
  if (name.length < 3) {
    return { isValid: false, message: 'Workspace name must be at least 3 characters long' };
  }
  
  if (name.length > 50) {
    return { isValid: false, message: 'Workspace name must be at most 50 characters long' };
  }
  
  // Allow alphanumeric characters, spaces, and common punctuation
  if (!/^[a-zA-Z0-9\s.,_-]+$/.test(name)) {
    return { 
      isValid: false, 
      message: 'Workspace name can only contain letters, numbers, spaces, and common punctuation' 
    };
  }
  
  return { isValid: true, message: 'Workspace name is valid' };
}

/**
 * Validates user input against SQL injection patterns
 * @param input The user input to validate
 * @returns True if the input is safe, false if it might contain SQL injection
 */
export function isSqlInjectionSafe(input: string): boolean {
  if (!input) return true;
  
  // Check for common SQL injection patterns
  const sqlInjectionPatterns = [
    /'\s*OR\s*'1'\s*=\s*'1/i,      // ' OR '1'='1
    /'\s*OR\s*1\s*=\s*1/i,         // ' OR 1=1
    /'\s*OR\s*'\w+'\s*=\s*'\w+/i,  // ' OR 'x'='x
    /'\s*;\s*DROP\s+TABLE/i,       // '; DROP TABLE
    /'\s*;\s*DELETE\s+FROM/i,      // '; DELETE FROM
    /'\s*UNION\s+SELECT/i,         // ' UNION SELECT
    /'\s*INSERT\s+INTO/i,          // ' INSERT INTO
    /'\s*UPDATE\s+\w+\s+SET/i,     // ' UPDATE x SET
    /'\s*--/i,                     // ' --
    /\/\*/i,                       // /*
  ];
  
  return !sqlInjectionPatterns.some(pattern => pattern.test(input));
}

/**
 * Validates that a string doesn't contain potential XSS attack vectors
 * @param input The user input to validate
 * @returns True if the input is safe, false if it might contain XSS
 */
export function isXssSafe(input: string): boolean {
  if (!input) return true;
  
  // Check for common XSS patterns
  const xssPatterns = [
    /<script/i,
    /javascript:/i,
    /on\w+=/i,  // onclick=, onload=, etc.
    /<iframe/i,
    /<embed/i,
    /<object/i,
    /expression\(/i,
    /eval\(/i,
    /document\.cookie/i,
    /document\.write/i,
    /window\.location/i,
    /data:text\/html/i,
  ];
  
  return !xssPatterns.some(pattern => pattern.test(input));
}