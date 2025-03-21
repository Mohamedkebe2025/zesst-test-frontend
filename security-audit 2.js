#!/usr/bin/env node

/**
 * Comprehensive Security Audit Script for ZESST Test Frontend
 * 
 * This script performs a security audit on the ZESST Test Frontend codebase,
 * checking for common security issues and vulnerabilities.
 * 
 * Features:
 * - Dependency vulnerability check (npm audit)
 * - Hardcoded secrets detection
 * - Insecure authentication practices
 * - Insecure API endpoints
 * - Missing security headers
 * - Insecure data handling
 * - CSRF vulnerabilities
 * - XSS vulnerabilities
 * - Insecure direct object references
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const util = require('util');

// Configuration
const config = {
  rootDir: process.cwd(),
  srcDir: path.join(process.cwd(), 'src'),
  reportFile: path.join(process.cwd(), 'security-audit-report.md'),
  excludeDirs: ['node_modules', '.next', 'public'],
  secretPatterns: [
    /(['"])(?:api|jwt|auth|secret|password|token|key).*?\1\s*(?::|=)\s*(['"])(?!process\.env)[^\2]+\2/i,
    /const\s+(?:api|jwt|auth|secret|password|token|key).*?=\s*(['"])(?!process\.env)[^\1]+\1/i,
    /(?:api|jwt|auth|secret|password|token|key).*?:\s*(['"])(?!process\.env)[^\1]+\1/i,
  ],
  xssVulnerablePatterns: [
    /dangerouslySetInnerHTML/,
    /innerHTML\s*=/,
    /document\.write/,
    /eval\(/,
    /setTimeout\(\s*['"`]/,
    /setInterval\(\s*['"`]/,
    /new\s+Function\(/,
  ],
  insecureAuthPatterns: [
    /localStorage\.setItem\(\s*(['"])(?:token|auth|jwt|session)/i,
    /localStorage\.getItem\(\s*(['"])(?:token|auth|jwt|session)/i,
    /sessionStorage\.setItem\(\s*(['"])(?:token|auth|jwt|session)/i,
    /sessionStorage\.getItem\(\s*(['"])(?:token|auth|jwt|session)/i,
  ],
  insecureApiPatterns: [
    /fetch\(\s*['"`]https?:\/\/(?!localhost)/i,
    /axios\.(?:get|post|put|delete|patch)\(\s*['"`]https?:\/\/(?!localhost)/i,
  ],
  insecureDataHandlingPatterns: [
    /JSON\.parse\(\s*localStorage\.getItem/i,
    /JSON\.parse\(\s*sessionStorage\.getItem/i,
    /JSON\.parse\(\s*document\.cookie/i,
  ],
  csrfVulnerablePatterns: [
    /fetch\(\s*['"`].*?['"`],\s*\{\s*(?!.*csrf)/i,
    /axios\.(?:post|put|delete|patch)\(\s*['"`].*?['"`],\s*.*?,\s*\{\s*(?!.*csrf)/i,
  ],
};

// Results storage
const results = {
  npmAudit: null,
  hardcodedSecrets: [],
  insecureAuth: [],
  insecureApi: [],
  xssVulnerabilities: [],
  insecureDataHandling: [],
  csrfVulnerabilities: [],
  missingSecurityHeaders: [],
  insecureDirectObjectReferences: [],
};

// Helper functions
function getAllFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  
  files.forEach(file => {
    const filePath = path.join(dir, file);
    
    // Skip excluded directories
    if (config.excludeDirs.some(excluded => filePath.includes(excluded))) {
      return;
    }
    
    if (fs.statSync(filePath).isDirectory()) {
      getAllFiles(filePath, fileList);
    } else {
      // Only include relevant file types
      if (/\.(js|jsx|ts|tsx)$/.test(filePath)) {
        fileList.push(filePath);
      }
    }
  });
  
  return fileList;
}

function checkFile(filePath, patterns, resultArray) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    
    lines.forEach((line, index) => {
      patterns.forEach(pattern => {
        if (pattern.test(line)) {
          resultArray.push({
            file: path.relative(config.rootDir, filePath),
            line: index + 1,
            content: line.trim(),
          });
        }
      });
    });
  } catch (error) {
    console.error(`Error reading file ${filePath}:`, error);
  }
}

function checkForInsecureDirectObjectReferences(filePath, resultArray) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    
    // Check for patterns that might indicate insecure direct object references
    const idorPatterns = [
      /\.from\(['"`].*?['"`]\)\.select\(\s*['"`]\*['"`]\)/i, // Selecting all columns without filtering
      /\.eq\(\s*['"`]id['"`],\s*(?!user\.id)/i, // Using an ID that might not belong to the user
      /params\.id/i, // Using ID directly from params without validation
      /\.from\(['"`].*?['"`]\)(?!.*?\.auth\.)/i, // Database access without RLS check
    ];
    
    const lines = content.split('\n');
    
    lines.forEach((line, index) => {
      idorPatterns.forEach(pattern => {
        if (pattern.test(line)) {
          resultArray.push({
            file: path.relative(config.rootDir, filePath),
            line: index + 1,
            content: line.trim(),
          });
        }
      });
    });
  } catch (error) {
    console.error(`Error reading file ${filePath}:`, error);
  }
}

function checkForMissingSecurityHeaders() {
  // Check Next.js config for security headers
  const nextConfigPath = path.join(config.rootDir, 'next.config.js');
  const nextTsConfigPath = path.join(config.rootDir, 'next.config.ts');
  const nextMjsConfigPath = path.join(config.rootDir, 'next.config.mjs');
  
  let configPath = null;
  if (fs.existsSync(nextConfigPath)) {
    configPath = nextConfigPath;
  } else if (fs.existsSync(nextTsConfigPath)) {
    configPath = nextTsConfigPath;
  } else if (fs.existsSync(nextMjsConfigPath)) {
    configPath = nextMjsConfigPath;
  }
  
  if (!configPath) {
    results.missingSecurityHeaders.push({
      issue: 'Next.js config file not found',
      recommendation: 'Create a Next.js config file with security headers',
    });
    return;
  }
  
  try {
    const content = fs.readFileSync(configPath, 'utf8');
    
    // Check for security headers
    const securityHeaders = [
      'X-DNS-Prefetch-Control',
      'Strict-Transport-Security',
      'X-XSS-Protection',
      'X-Frame-Options',
      'Permissions-Policy',
      'X-Content-Type-Options',
      'Referrer-Policy',
      'Content-Security-Policy',
    ];
    
    securityHeaders.forEach(header => {
      if (!content.includes(header)) {
        results.missingSecurityHeaders.push({
          header,
          file: path.relative(config.rootDir, configPath),
          recommendation: `Add ${header} to security headers in Next.js config`,
        });
      }
    });
  } catch (error) {
    console.error(`Error reading Next.js config:`, error);
  }
}

function runNpmAudit() {
  try {
    const output = execSync('npm audit --json', { encoding: 'utf8' });
    return JSON.parse(output);
  } catch (error) {
    // npm audit returns non-zero exit code if vulnerabilities are found
    if (error.stdout) {
      try {
        return JSON.parse(error.stdout);
      } catch (parseError) {
        console.error('Error parsing npm audit output:', parseError);
        return { error: 'Failed to parse npm audit output' };
      }
    }
    console.error('Error running npm audit:', error);
    return { error: 'Failed to run npm audit' };
  }
}

function generateReport() {
  let report = `# Security Audit Report for ZESST Test Frontend\n\n`;
  report += `*Generated on: ${new Date().toISOString()}*\n\n`;
  
  // NPM Audit results
  report += `## Dependency Vulnerabilities\n\n`;
  if (results.npmAudit && results.npmAudit.error) {
    report += `Error running npm audit: ${results.npmAudit.error}\n\n`;
  } else if (results.npmAudit && results.npmAudit.vulnerabilities) {
    const vulnCount = Object.keys(results.npmAudit.vulnerabilities).length;
    if (vulnCount === 0) {
      report += `✅ No vulnerabilities found in dependencies.\n\n`;
    } else {
      report += `⚠️ Found ${vulnCount} vulnerabilities in dependencies.\n\n`;
      
      Object.entries(results.npmAudit.vulnerabilities).forEach(([key, vuln]) => {
        report += `### ${vuln.name}\n\n`;
        report += `- Severity: ${vuln.severity}\n`;
        report += `- Version: ${vuln.version}\n`;
        report += `- Path: ${vuln.path}\n`;
        report += `- Recommendation: ${vuln.recommendation || 'No specific recommendation'}\n\n`;
      });
    }
  } else {
    report += `✅ No vulnerabilities found in dependencies.\n\n`;
  }
  
  // Hardcoded Secrets
  report += `## Hardcoded Secrets\n\n`;
  if (results.hardcodedSecrets.length === 0) {
    report += `✅ No hardcoded secrets found.\n\n`;
  } else {
    report += `⚠️ Found ${results.hardcodedSecrets.length} potential hardcoded secrets.\n\n`;
    results.hardcodedSecrets.forEach(item => {
      report += `- **${item.file}:${item.line}**\n`;
      report += `  \`${item.content}\`\n\n`;
    });
    report += `**Recommendation:** Replace hardcoded secrets with environment variables.\n\n`;
  }
  
  // Insecure Authentication
  report += `## Insecure Authentication Practices\n\n`;
  if (results.insecureAuth.length === 0) {
    report += `✅ No insecure authentication practices found.\n\n`;
  } else {
    report += `⚠️ Found ${results.insecureAuth.length} potential insecure authentication practices.\n\n`;
    results.insecureAuth.forEach(item => {
      report += `- **${item.file}:${item.line}**\n`;
      report += `  \`${item.content}\`\n\n`;
    });
    report += `**Recommendation:** Use secure authentication methods like HttpOnly cookies with secure and SameSite attributes.\n\n`;
  }
  
  // Insecure API Endpoints
  report += `## Insecure API Endpoints\n\n`;
  if (results.insecureApi.length === 0) {
    report += `✅ No insecure API endpoints found.\n\n`;
  } else {
    report += `⚠️ Found ${results.insecureApi.length} potential insecure API endpoints.\n\n`;
    results.insecureApi.forEach(item => {
      report += `- **${item.file}:${item.line}**\n`;
      report += `  \`${item.content}\`\n\n`;
    });
    report += `**Recommendation:** Use environment variables for API endpoints and ensure HTTPS is used.\n\n`;
  }
  
  // Missing Security Headers
  report += `## Missing Security Headers\n\n`;
  if (results.missingSecurityHeaders.length === 0) {
    report += `✅ All recommended security headers are present.\n\n`;
  } else {
    report += `⚠️ Found ${results.missingSecurityHeaders.length} missing security headers.\n\n`;
    results.missingSecurityHeaders.forEach(item => {
      if (item.header) {
        report += `- **${item.header}** is missing in ${item.file || 'configuration'}\n`;
        report += `  Recommendation: ${item.recommendation}\n\n`;
      } else {
        report += `- ${item.issue}\n`;
        report += `  Recommendation: ${item.recommendation}\n\n`;
      }
    });
  }
  
  // XSS Vulnerabilities
  report += `## XSS Vulnerabilities\n\n`;
  if (results.xssVulnerabilities.length === 0) {
    report += `✅ No potential XSS vulnerabilities found.\n\n`;
  } else {
    report += `⚠️ Found ${results.xssVulnerabilities.length} potential XSS vulnerabilities.\n\n`;
    results.xssVulnerabilities.forEach(item => {
      report += `- **${item.file}:${item.line}**\n`;
      report += `  \`${item.content}\`\n\n`;
    });
    report += `**Recommendation:** Avoid using dangerouslySetInnerHTML and ensure all user input is properly sanitized.\n\n`;
  }
  
  // Insecure Data Handling
  report += `## Insecure Data Handling\n\n`;
  if (results.insecureDataHandling.length === 0) {
    report += `✅ No insecure data handling practices found.\n\n`;
  } else {
    report += `⚠️ Found ${results.insecureDataHandling.length} potential insecure data handling practices.\n\n`;
    results.insecureDataHandling.forEach(item => {
      report += `- **${item.file}:${item.line}**\n`;
      report += `  \`${item.content}\`\n\n`;
    });
    report += `**Recommendation:** Use secure methods for storing sensitive data and validate all data before processing.\n\n`;
  }
  
  // CSRF Vulnerabilities
  report += `## CSRF Vulnerabilities\n\n`;
  if (results.csrfVulnerabilities.length === 0) {
    report += `✅ No potential CSRF vulnerabilities found.\n\n`;
  } else {
    report += `⚠️ Found ${results.csrfVulnerabilities.length} potential CSRF vulnerabilities.\n\n`;
    results.csrfVulnerabilities.forEach(item => {
      report += `- **${item.file}:${item.line}**\n`;
      report += `  \`${item.content}\`\n\n`;
    });
    report += `**Recommendation:** Implement CSRF tokens for all state-changing operations.\n\n`;
  }
  
  // Insecure Direct Object References
  report += `## Insecure Direct Object References\n\n`;
  if (results.insecureDirectObjectReferences.length === 0) {
    report += `✅ No potential insecure direct object references found.\n\n`;
  } else {
    report += `⚠️ Found ${results.insecureDirectObjectReferences.length} potential insecure direct object references.\n\n`;
    results.insecureDirectObjectReferences.forEach(item => {
      report += `- **${item.file}:${item.line}**\n`;
      report += `  \`${item.content}\`\n\n`;
    });
    report += `**Recommendation:** Implement proper access control checks and use Row Level Security in Supabase.\n\n`;
  }
  
  // Summary
  report += `## Summary\n\n`;
  const totalIssues = 
    results.hardcodedSecrets.length +
    results.insecureAuth.length +
    results.insecureApi.length +
    results.missingSecurityHeaders.length +
    results.xssVulnerabilities.length +
    results.insecureDataHandling.length +
    results.csrfVulnerabilities.length +
    results.insecureDirectObjectReferences.length;
  
  if (totalIssues === 0) {
    report += `✅ No security issues found in the codebase.\n\n`;
  } else {
    report += `⚠️ Found ${totalIssues} potential security issues in the codebase.\n\n`;
    report += `| Category | Issues |\n`;
    report += `| -------- | ------ |\n`;
    report += `| Hardcoded Secrets | ${results.hardcodedSecrets.length} |\n`;
    report += `| Insecure Authentication | ${results.insecureAuth.length} |\n`;
    report += `| Insecure API Endpoints | ${results.insecureApi.length} |\n`;
    report += `| Missing Security Headers | ${results.missingSecurityHeaders.length} |\n`;
    report += `| XSS Vulnerabilities | ${results.xssVulnerabilities.length} |\n`;
    report += `| Insecure Data Handling | ${results.insecureDataHandling.length} |\n`;
    report += `| CSRF Vulnerabilities | ${results.csrfVulnerabilities.length} |\n`;
    report += `| Insecure Direct Object References | ${results.insecureDirectObjectReferences.length} |\n`;
  }
  
  return report;
}

// Main execution
async function main() {
  console.log('Starting security audit...');
  
  // Run npm audit
  console.log('Running npm audit...');
  results.npmAudit = runNpmAudit();
  
  // Get all relevant files
  console.log('Scanning files...');
  const files = getAllFiles(config.srcDir);
  
  // Check for hardcoded secrets
  console.log('Checking for hardcoded secrets...');
  files.forEach(file => {
    checkFile(file, config.secretPatterns, results.hardcodedSecrets);
  });
  
  // Check for insecure authentication
  console.log('Checking for insecure authentication practices...');
  files.forEach(file => {
    checkFile(file, config.insecureAuthPatterns, results.insecureAuth);
  });
  
  // Check for insecure API endpoints
  console.log('Checking for insecure API endpoints...');
  files.forEach(file => {
    checkFile(file, config.insecureApiPatterns, results.insecureApi);
  });
  
  // Check for XSS vulnerabilities
  console.log('Checking for XSS vulnerabilities...');
  files.forEach(file => {
    checkFile(file, config.xssVulnerablePatterns, results.xssVulnerabilities);
  });
  
  // Check for insecure data handling
  console.log('Checking for insecure data handling...');
  files.forEach(file => {
    checkFile(file, config.insecureDataHandlingPatterns, results.insecureDataHandling);
  });
  
  // Check for CSRF vulnerabilities
  console.log('Checking for CSRF vulnerabilities...');
  files.forEach(file => {
    checkFile(file, config.csrfVulnerablePatterns, results.csrfVulnerabilities);
  });
  
  // Check for insecure direct object references
  console.log('Checking for insecure direct object references...');
  files.forEach(file => {
    checkForInsecureDirectObjectReferences(file, results.insecureDirectObjectReferences);
  });
  
  // Check for missing security headers
  console.log('Checking for missing security headers...');
  checkForMissingSecurityHeaders();
  
  // Generate and save report
  console.log('Generating report...');
  const report = generateReport();
  fs.writeFileSync(config.reportFile, report);
  
  console.log(`Security audit completed. Report saved to ${config.reportFile}`);
}

main().catch(error => {
  console.error('Error running security audit:', error);
  process.exit(1);
});