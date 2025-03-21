'use client';

import './globals.css';
import { Inter } from 'next/font/google';
import StyledComponentsRegistry from '@/components/AntdRegistry';
import { AuthProvider } from '@/contexts/AuthContext';
import { WorkspaceProvider } from '@/contexts/WorkspaceContext';
import { MembersProvider } from '@/contexts/MembersContext';
import { FoldersProvider } from '@/contexts/FoldersContext';
import { DocumentsProvider } from '@/contexts/DocumentsContext';
import { useEffect } from 'react';
import { initAuthErrorInterceptor } from '@/utils/authErrorHandler';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Initialize auth error interceptor at the app root level
  useEffect(() => {
    // Initialize the auth error interceptor
    initAuthErrorInterceptor();

    // This will help suppress the "Invalid Refresh Token" errors in the console
    const originalConsoleError = console.error;
    console.error = function (...args) {
      // Filter out the refresh token errors
      if (args[0] && typeof args[0] === 'string' &&
        (args[0].includes('Invalid Refresh Token') ||
          args[0].includes('Refresh Token Not Found'))) {
        console.log('Suppressed auth error in console:', args[0]);
        return;
      }
      originalConsoleError.apply(console, args);
    };

    return () => {
      // Restore original console.error when component unmounts
      console.error = originalConsoleError;
    };
  }, []);

  return (
    <html lang="en">
      <body className={`${inter.variable} antialiased`}>
        <StyledComponentsRegistry>
          <AuthProvider>
            <WorkspaceProvider>
              <MembersProvider>
                <FoldersProvider>
                  <DocumentsProvider>
                    {children}
                  </DocumentsProvider>
                </FoldersProvider>
              </MembersProvider>
            </WorkspaceProvider>
          </AuthProvider>
        </StyledComponentsRegistry>
      </body>
    </html>
  );
}
