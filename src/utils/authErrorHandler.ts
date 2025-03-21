/**
 * Utility functions for handling authentication errors
 */

import supabase from './supabase';

/**
 * Handles refresh token errors by clearing local storage and redirecting to login
 */
export const handleRefreshTokenError = () => {
  // Clear any stored session data
  localStorage.removeItem('supabase.auth.token');
  
  // Clear any other auth-related items in localStorage
  const authKeys = Object.keys(localStorage).filter(key => 
    key.startsWith('supabase.auth.') || 
    key.includes('token') || 
    key.includes('invitation')
  );
  
  authKeys.forEach(key => {
    localStorage.removeItem(key);
  });
  
  // Sign out from Supabase
  supabase.auth.signOut().catch(error => {
    console.error('Error signing out:', error);
  });
  
  // Redirect to login page
  if (typeof window !== 'undefined') {
    // Use a small delay to ensure the signOut completes
    setTimeout(() => {
      window.location.href = '/login';
    }, 100);
  }
};

/**
 * Global error handler for Supabase auth errors
 * This can be attached to window events
 */
export const setupGlobalAuthErrorHandler = () => {
  if (typeof window === 'undefined') return;
  
  const handleAuthError = (event: any) => {
    if (event && event.detail && event.detail.error) {
      const error = event.detail.error;
      
      // Handle refresh token errors
      if (error.message && (
        error.message.includes('Invalid Refresh Token') || 
        error.message.includes('Refresh Token Not Found')
      )) {
        handleRefreshTokenError();
      }
    }
  };
  
  // Add event listener for auth errors
  window.addEventListener('supabase.auth.error', handleAuthError);
  
  // Return a cleanup function
  return () => {
    window.removeEventListener('supabase.auth.error', handleAuthError);
  };
};

/**
 * Intercepts Supabase auth errors and handles them gracefully
 */
export const initAuthErrorInterceptor = () => {
  if (typeof window === 'undefined') return;
  
  // Override the fetch function to intercept auth errors
  const originalFetch = window.fetch;
  
  window.fetch = async function(input, init) {
    try {
      const response = await originalFetch(input, init);
      
      // Check if this is an auth request
      if (typeof input === 'string' && 
          (input.includes('/auth/v1/token') || input.includes('/auth/v1/user'))) {
        
        // Clone the response so we can read it
        const clonedResponse = response.clone();
        
        // Check if it's a 400 or 401 error
        if (response.status === 400 || response.status === 401) {
          try {
            const data = await clonedResponse.json();
            
            // Check for refresh token errors
            if (data.error && (
              data.error.includes('Invalid Refresh Token') || 
              data.error.includes('Refresh Token Not Found')
            )) {
              // Suppress the error in console
              console.log('Handling auth error gracefully:', data.error);
              
              // Handle the error
              handleRefreshTokenError();
            }
          } catch (e) {
            // If we can't parse the response, just return it
          }
        }
      }
      
      return response;
    } catch (error) {
      // Let other errors pass through
      throw error;
    }
  };
};