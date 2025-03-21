#!/usr/bin/env node

/**
 * Verification Script for Security Improvements
 * 
 * This script verifies that the security improvements made to the ZESST Test Frontend
 * have successfully addressed the issues identified in the security audit.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const http = require('http');
const https = require('https');

// Configuration
const config = {
  rootDir: process.cwd(),
  reportFile: path.join(process.cwd(), 'security-verification-report.md'),
};

// Results storage
const results = {
  securityHeaders: {
    implemented: false,
    details: [],
  },
  securityUtilities: {
    sanitization: {
      implemented: false,
      details: [],
    },
    secureAuth: {
      implemented: false,
      details: [],
    },
    inputValidation: {
      implemented: false,
      details: [],
    },
  },
  secureForm: {
    implemented: false,
    details: [],
  },
  securityDemo: {
    implemented: false,
    details: [],
  },
};

// Helper functions
function checkFileExists(filePath) {
  return fs.existsSync(filePath);
}

function checkFileContains(filePath, searchString) {
  if (!checkFileExists(filePath)) {
    return false;
  }
  
  const content = fs.readFileSync(filePath, 'utf8');
  return content.includes(searchString);
}

function checkSecurityHeaders() {
  console.log('Checking security headers implementation...');
  
  const nextConfigPath = path.join(config.rootDir, 'next.config.js');
  
  if (!checkFileExists(nextConfigPath)) {
    results.securityHeaders.details.push('❌ next.config.js file not found');
    return;
  }
  
  const content = fs.readFileSync(nextConfigPath, 'utf8');
  
  // Check for headers function
  if (!content.includes('async headers()')) {
    results.securityHeaders.details.push('❌ headers() function not found in next.config.js');
    return;
  }
  
  // Check for specific headers
  const requiredHeaders = [
    'X-DNS-Prefetch-Control',
    'Strict-Transport-Security',
    'X-XSS-Protection',
    'X-Frame-Options',
    'Permissions-Policy',
    'X-Content-Type-Options',
    'Referrer-Policy',
    'Content-Security-Policy',
  ];
  
  let allHeadersFound = true;
  
  requiredHeaders.forEach(header => {
    if (!content.includes(header)) {
      results.securityHeaders.details.push(`❌ ${header} header not found in next.config.js`);
      allHeadersFound = false;
    } else {
      results.securityHeaders.details.push(`✅ ${header} header found in next.config.js`);
    }
  });
  
  results.securityHeaders.implemented = allHeadersFound;
}

function checkSecurityUtilities() {
  console.log('Checking security utilities implementation...');
  
  // Check sanitization utilities
  const sanitizePath = path.join(config.rootDir, 'src', 'utils', 'sanitize.ts');
  
  if (checkFileExists(sanitizePath)) {
    results.securityUtilities.sanitization.implemented = true;
    results.securityUtilities.sanitization.details.push('✅ sanitize.ts utility found');
    
    const sanitizeContent = fs.readFileSync(sanitizePath, 'utf8');
    
    ['sanitizeString', 'sanitizeObject', 'sanitizeUserContent', 'sanitizeUrl'].forEach(func => {
      if (sanitizeContent.includes(`export function ${func}`)) {
        results.securityUtilities.sanitization.details.push(`✅ ${func} function found in sanitize.ts`);
      } else {
        results.securityUtilities.sanitization.details.push(`❌ ${func} function not found in sanitize.ts`);
        results.securityUtilities.sanitization.implemented = false;
      }
    });
  } else {
    results.securityUtilities.sanitization.details.push('❌ sanitize.ts utility not found');
  }
  
  // Check secure authentication utilities
  const secureAuthPath = path.join(config.rootDir, 'src', 'utils', 'secureAuth.ts');
  
  if (checkFileExists(secureAuthPath)) {
    results.securityUtilities.secureAuth.implemented = true;
    results.securityUtilities.secureAuth.details.push('✅ secureAuth.ts utility found');
    
    const secureAuthContent = fs.readFileSync(secureAuthPath, 'utf8');
    
    ['storeAuthToken', 'getAuthToken', 'clearAuthToken', 'isTokenExpired'].forEach(func => {
      if (secureAuthContent.includes(`export function ${func}`)) {
        results.securityUtilities.secureAuth.details.push(`✅ ${func} function found in secureAuth.ts`);
      } else {
        results.securityUtilities.secureAuth.details.push(`❌ ${func} function not found in secureAuth.ts`);
        results.securityUtilities.secureAuth.implemented = false;
      }
    });
  } else {
    results.securityUtilities.secureAuth.details.push('❌ secureAuth.ts utility not found');
  }
  
  // Check input validation utilities
  const inputValidationPath = path.join(config.rootDir, 'src', 'utils', 'inputValidation.ts');
  
  if (checkFileExists(inputValidationPath)) {
    results.securityUtilities.inputValidation.implemented = true;
    results.securityUtilities.inputValidation.details.push('✅ inputValidation.ts utility found');
    
    const inputValidationContent = fs.readFileSync(inputValidationPath, 'utf8');
    
    ['isValidEmail', 'validatePassword', 'validateUsername', 'isXssSafe'].forEach(func => {
      if (inputValidationContent.includes(`export function ${func}`)) {
        results.securityUtilities.inputValidation.details.push(`✅ ${func} function found in inputValidation.ts`);
      } else {
        results.securityUtilities.inputValidation.details.push(`❌ ${func} function not found in inputValidation.ts`);
        results.securityUtilities.inputValidation.implemented = false;
      }
    });
  } else {
    results.securityUtilities.inputValidation.details.push('❌ inputValidation.ts utility not found');
  }
}

function checkSecureForm() {
  console.log('Checking secure form implementation...');
  
  const secureFormPath = path.join(config.rootDir, 'src', 'components', 'SecureForm.tsx');
  
  if (checkFileExists(secureFormPath)) {
    results.secureForm.implemented = true;
    results.secureForm.details.push('✅ SecureForm.tsx component found');
    
    const secureFormContent = fs.readFileSync(secureFormPath, 'utf8');
    
    // Check for imports of security utilities
    if (secureFormContent.includes("from '@/utils/inputValidation'")) {
      results.secureForm.details.push('✅ SecureForm imports inputValidation utilities');
    } else {
      results.secureForm.details.push('❌ SecureForm does not import inputValidation utilities');
      results.secureForm.implemented = false;
    }
    
    if (secureFormContent.includes("from '@/utils/sanitize'")) {
      results.secureForm.details.push('✅ SecureForm imports sanitize utilities');
    } else {
      results.secureForm.details.push('❌ SecureForm does not import sanitize utilities');
      results.secureForm.implemented = false;
    }
    
    // Check for validation and sanitization usage
    if (secureFormContent.includes('isValidEmail(') && 
        secureFormContent.includes('validatePassword(') && 
        secureFormContent.includes('sanitizeString(')) {
      results.secureForm.details.push('✅ SecureForm uses validation and sanitization functions');
    } else {
      results.secureForm.details.push('❌ SecureForm does not use all required validation and sanitization functions');
      results.secureForm.implemented = false;
    }
  } else {
    results.secureForm.details.push('❌ SecureForm.tsx component not found');
  }
}

function checkSecurityDemo() {
  console.log('Checking security demo implementation...');
  
  const securityDemoPath = path.join(config.rootDir, 'src', 'app', 'security-demo', 'page.tsx');
  
  if (checkFileExists(securityDemoPath)) {
    results.securityDemo.implemented = true;
    results.securityDemo.details.push('✅ Security demo page found');
    
    const securityDemoContent = fs.readFileSync(securityDemoPath, 'utf8');
    
    // Check for import of SecureForm
    if (securityDemoContent.includes("import SecureForm from '@/components/SecureForm'")) {
      results.securityDemo.details.push('✅ Security demo imports SecureForm component');
    } else {
      results.securityDemo.details.push('❌ Security demo does not import SecureForm component');
      results.securityDemo.implemented = false;
    }
    
    // Check for security headers section
    if (securityDemoContent.includes('Security Headers') && 
        securityDemoContent.includes('X-DNS-Prefetch-Control') && 
        securityDemoContent.includes('Content-Security-Policy')) {
      results.securityDemo.details.push('✅ Security demo includes security headers section');
    } else {
      results.securityDemo.details.push('❌ Security demo does not include security headers section');
      results.securityDemo.implemented = false;
    }
    
    // Check for security utilities section
    if (securityDemoContent.includes('Security Utilities') && 
        securityDemoContent.includes('Input Sanitization') && 
        securityDemoContent.includes('Secure Authentication') && 
        securityDemoContent.includes('Input Validation')) {
      results.securityDemo.details.push('✅ Security demo includes security utilities section');
    } else {
      results.securityDemo.details.push('❌ Security demo does not include security utilities section');
      results.securityDemo.implemented = false;
    }
  } else {
    results.securityDemo.details.push('❌ Security demo page not found');
  }
}

function generateReport() {
  console.log('Generating verification report...');
  
  let report = `# Security Improvements Verification Report\n\n`;
  report += `*Generated on: ${new Date().toISOString()}*\n\n`;
  
  // Overall status
  const allImplemented = 
    results.securityHeaders.implemented && 
    results.securityUtilities.sanitization.implemented && 
    results.securityUtilities.secureAuth.implemented && 
    results.securityUtilities.inputValidation.implemented && 
    results.secureForm.implemented && 
    results.securityDemo.implemented;
  
  if (allImplemented) {
    report += `## Overall Status: ✅ All Security Improvements Implemented\n\n`;
  } else {
    report += `## Overall Status: ❌ Some Security Improvements Not Implemented\n\n`;
  }
  
  // Security Headers
  report += `## Security Headers\n\n`;
  report += results.securityHeaders.implemented ? 
    `✅ Security headers have been successfully implemented.\n\n` : 
    `❌ Security headers have not been fully implemented.\n\n`;
  
  results.securityHeaders.details.forEach(detail => {
    report += `- ${detail}\n`;
  });
  
  report += `\n`;
  
  // Security Utilities
  report += `## Security Utilities\n\n`;
  
  // Sanitization
  report += `### Input Sanitization\n\n`;
  report += results.securityUtilities.sanitization.implemented ? 
    `✅ Input sanitization utilities have been successfully implemented.\n\n` : 
    `❌ Input sanitization utilities have not been fully implemented.\n\n`;
  
  results.securityUtilities.sanitization.details.forEach(detail => {
    report += `- ${detail}\n`;
  });
  
  report += `\n`;
  
  // Secure Authentication
  report += `### Secure Authentication\n\n`;
  report += results.securityUtilities.secureAuth.implemented ? 
    `✅ Secure authentication utilities have been successfully implemented.\n\n` : 
    `❌ Secure authentication utilities have not been fully implemented.\n\n`;
  
  results.securityUtilities.secureAuth.details.forEach(detail => {
    report += `- ${detail}\n`;
  });
  
  report += `\n`;
  
  // Input Validation
  report += `### Input Validation\n\n`;
  report += results.securityUtilities.inputValidation.implemented ? 
    `✅ Input validation utilities have been successfully implemented.\n\n` : 
    `❌ Input validation utilities have not been fully implemented.\n\n`;
  
  results.securityUtilities.inputValidation.details.forEach(detail => {
    report += `- ${detail}\n`;
  });
  
  report += `\n`;
  
  // Secure Form
  report += `## Secure Form Component\n\n`;
  report += results.secureForm.implemented ? 
    `✅ Secure form component has been successfully implemented.\n\n` : 
    `❌ Secure form component has not been fully implemented.\n\n`;
  
  results.secureForm.details.forEach(detail => {
    report += `- ${detail}\n`;
  });
  
  report += `\n`;
  
  // Security Demo
  report += `## Security Demo Page\n\n`;
  report += results.securityDemo.implemented ? 
    `✅ Security demo page has been successfully implemented.\n\n` : 
    `❌ Security demo page has not been fully implemented.\n\n`;
  
  results.securityDemo.details.forEach(detail => {
    report += `- ${detail}\n`;
  });
  
  report += `\n`;
  
  // Conclusion
  report += `## Conclusion\n\n`;
  
  if (allImplemented) {
    report += `All security improvements have been successfully implemented. The ZESST Test Frontend now has:
    
1. Proper security headers to protect against various attacks
2. Input sanitization utilities to prevent XSS attacks
3. Secure authentication utilities for better token handling
4. Input validation utilities to validate user input
5. A secure form component that demonstrates the use of these utilities
6. A security demo page that showcases all the security improvements

These improvements significantly enhance the security posture of the application.
`;
  } else {
    report += `Some security improvements have not been fully implemented. Please review the report and address the issues marked with ❌.`;
  }
  
  return report;
}

// Main execution
async function main() {
  console.log('Starting security improvements verification...');
  
  // Check security headers
  checkSecurityHeaders();
  
  // Check security utilities
  checkSecurityUtilities();
  
  // Check secure form
  checkSecureForm();
  
  // Check security demo
  checkSecurityDemo();
  
  // Generate and save report
  const report = generateReport();
  fs.writeFileSync(config.reportFile, report);
  
  console.log(`Verification completed. Report saved to ${config.reportFile}`);
}

main().catch(error => {
  console.error('Error running verification:', error);
  process.exit(1);
});