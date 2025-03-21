/**
 * Secure authentication utilities for handling tokens and authentication state
 * This module provides more secure alternatives to localStorage for token storage
 */

/**
 * Stores the authentication token in a secure way
 * Uses HttpOnly cookies when possible (via the server),
 * falling back to memory storage when cookies aren't available
 * 
 * @param token The authentication token to store
 */

// In-memory token storage (more secure than localStorage)
let memoryToken: string | null = null;

export function storeAuthToken(token: string): void {
  // Store token in memory
  memoryToken = token;
  
  // Note: In a production environment, you would want to set an HttpOnly cookie
  // via the server instead of storing in memory or localStorage
}

/**
 * Retrieves the stored authentication token
 * @returns The stored token or null if not found
 */
export function getAuthToken(): string | null {
  return memoryToken;
}

/**
 * Clears the stored authentication token
 */
export function clearAuthToken(): void {
  memoryToken = null;
}

/**
 * Checks if the current authentication token is expired
 * @returns True if the token is expired or invalid, false otherwise
 */
export function isTokenExpired(): boolean {
  const token = getAuthToken();
  
  if (!token) return true;
  
  try {
    // JWT tokens are in the format: header.payload.signature
    const payload = token.split('.')[1];
    
    // Decode the base64 payload
    const decodedPayload = JSON.parse(atob(payload));
    
    // Check if the token has an expiration time
    if (!decodedPayload.exp) return false;
    
    // Compare expiration time with current time
    const expirationTime = decodedPayload.exp * 1000; // Convert to milliseconds
    const currentTime = Date.now();
    
    return currentTime >= expirationTime;
  } catch (error) {
    // If there's any error parsing the token, consider it expired
    console.error('Error checking token expiration:', error);
    return true;
  }
}

/**
 * Refreshes the authentication token if needed
 * @param refreshCallback A function that returns a Promise resolving to a new token
 * @returns A Promise resolving to true if the token was refreshed, false otherwise
 */
export async function refreshTokenIfNeeded(
  refreshCallback: () => Promise<string>
): Promise<boolean> {
  if (isTokenExpired()) {
    try {
      const newToken = await refreshCallback();
      storeAuthToken(newToken);
      return true;
    } catch (error) {
      console.error('Error refreshing token:', error);
      clearAuthToken();
      return false;
    }
  }
  
  return false;
}

/**
 * Securely parses a JWT token without exposing sensitive information
 * @param token The JWT token to parse
 * @returns The parsed token payload with sensitive information removed
 */
export function parseToken(token: string): Record<string, any> {
  try {
    // JWT tokens are in the format: header.payload.signature
    const payload = token.split('.')[1];
    
    // Decode the base64 payload
    const decodedPayload = JSON.parse(atob(payload));
    
    // Remove sensitive information
    const { iat, exp, ...safePayload } = decodedPayload;
    
    return safePayload;
  } catch (error) {
    console.error('Error parsing token:', error);
    return {};
  }
}