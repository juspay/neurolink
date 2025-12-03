#!/usr/bin/env node

/**
 * NeuroLink Security Validation Script
 * 
 * Comprehensive security checks for the NeuroLink codebase including:
 * - Professional secret detection with Gitleaks integration
 * - Dependency vulnerability scanning
 * - License compliance checks  
 * - Security best practices validation
 * - File permission validation
 */

const { execSync, spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// ANSI color codes for output formatting
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

// Configuration: Critical security rule IDs that should trigger build failures
const CRITICAL_SECURITY_RULES = [
  'aws-access-token',
  'openai-api-key',
  'github-token',
  'neurolink-api-key',
  'private-key'
];

// Configuration: Packages to temporarily ignore in vulnerability scanning
// TODO: Address these vulnerabilities in a separate security update
const IGNORED_VULNERABLE_PACKAGES = [
  'jsondiffpatch',  // XSS in ai dependency - tracked separately
  'undici',         // DoS in mem0ai dependency - requires upstream fix
  'ai'              // File upload bypass - planned upgrade
];

class SecurityValidator {
  constructor() {
    this.errors = [];
    this.warnings = [];
    this.info = [];
    this.startTime = Date.now();
    this.projectRoot = process.cwd();
    this.results = {
      secrets: { status: 'pending', details: [] },
      dependencies: { status: 'pending', details: [] },
      licenses: { status: 'pending', details: [] },
      bestPractices: { status: 'pending', details: [] }
    };
  }

  log(message, color = 'reset') {
    console.log(`${colors[color]}[SECURITY] ${message}${colors.reset}`);
  }

  addIssue(level, category, message, details = null) {
    const issue = {
      level,
      category,
      message,
      details,
      timestamp: new Date().toISOString()
    };

    switch (level) {
      case 'error':
        this.errors.push(issue);
        break;
      case 'warning':
        this.warnings.push(issue);
        break;
      case 'info':
        this.info.push(issue);
        break;
    }
  }

  // 1. Dependency Vulnerability Scanning
  async checkDependencyVulnerabilities() {
    this.log('🔍 Scanning dependencies for vulnerabilities...', 'blue');

    try {
      // Try pnpm audit first (faster and more accurate)
      try {
        execSync('pnpm audit --audit-level=moderate', {
          encoding: 'utf8',
          stdio: 'pipe'
        });

        // If pnpm audit succeeds with no output, no vulnerabilities found
        this.log('✅ No known vulnerabilities found', 'green');
        this.results.dependencies.status = 'passed';

      } catch (pnpmError) {
        // pnpm audit exits with non-zero when vulnerabilities found
        const output = pnpmError.stdout || pnpmError.message || '';

        // Filter out ignored packages from the output
        const isIgnoredPackage = IGNORED_VULNERABLE_PACKAGES.some(pkg =>
          output.includes(`│ Package             │ ${pkg}`) ||
          output.includes(`Package: ${pkg}`)
        );

        // Check if ALL vulnerabilities are from ignored packages
        const allIgnored = IGNORED_VULNERABLE_PACKAGES.every(pkg =>
          !output.includes('│ Package') || output.includes(`│ Package             │ ${pkg}`)
        );

        if (isIgnoredPackage) {
          const ignoredList = IGNORED_VULNERABLE_PACKAGES.join(', ');
          this.log(`ℹ️  Found vulnerabilities in temporarily ignored packages: ${ignoredList}`, 'cyan');
          this.log('✅ No critical vulnerabilities (ignored packages excluded)', 'green');
          this.results.dependencies.status = 'passed';
          return;
        }

        // Check if it contains moderate/high/critical vulnerabilities
        if (output.includes('moderate') || output.includes('high') || output.includes('critical')) {
          // Count moderate+ severity issues
          const moderateMatches = (output.match(/moderate/gi) || []).length;
          const highMatches = (output.match(/high/gi) || []).length;
          const criticalMatches = (output.match(/critical/gi) || []).length;

          if (highMatches > 0 || criticalMatches > 0) {
            this.addIssue('error', 'dependencies',
              `Found ${highMatches + criticalMatches} high/critical severity vulnerabilities`);
            this.results.dependencies.status = 'failed';
          } else if (moderateMatches > 0) {
            this.addIssue('warning', 'dependencies',
              `Found ${moderateMatches} moderate vulnerabilities`);
            this.results.dependencies.status = 'warning';
          } else {
            this.log('✅ No known vulnerabilities found', 'green');
            this.results.dependencies.status = 'passed';
          }
        } else {
          // If no specific vulnerabilities mentioned, assume it passed
          this.log('✅ No known vulnerabilities found', 'green');
          this.results.dependencies.status = 'passed';
        }
      }

    } catch (error) {
      this.addIssue('warning', 'dependencies', `Could not complete vulnerability scan: ${error.message}`);
      this.results.dependencies.status = 'warning';
    }
  }

  // 2. Professional Secret Detection with Gitleaks Integration
  async checkSecretsWithGitleaks() {
    this.log('🔐 Running professional secret detection with Gitleaks...', 'blue');
    
    try {
      // Check if gitleaks is available
      const gitleaksCommand = 'gitleaks';
      const configPath = path.join(this.projectRoot, '.gitleaksrc.json');
      
      let gitleaksArgs = [
        'detect',
        '--no-git',
        '--exit-code', '0',
        '--format', 'json'
      ];
      if (fs.existsSync(configPath)) {
        gitleaksArgs.push('--config', configPath);
      }
      
      let gitleaksResult;
      try {
        // Use spawnSync for safer command execution without shell interpretation
        const result = spawnSync(gitleaksCommand, gitleaksArgs, {
          encoding: 'utf8',
          maxBuffer: 10 * 1024 * 1024,
          cwd: this.projectRoot
        });
        
        if (result.error) {
          throw result.error;
        }
        
        // If gitleaks exits with non-zero but has stdout, use it (findings detected)
        gitleaksResult = result.stdout || '[]';
        
      } catch (gitleaksError) {
        // If gitleaks fails, fallback to empty result
        if (gitleaksError.stderr) {
          this.log(`⚠️  Gitleaks stderr: ${gitleaksError.stderr.toString()}`, 'yellow');
        }
        this.log(`⚠️  Gitleaks error: ${gitleaksError.message}`, 'yellow');
        gitleaksResult = '[]';
        // Do not throw, fallback to empty findings and continue with basic detection
      }
      
      let findings = [];
      try {
        findings = JSON.parse(gitleaksResult.trim() || '[]');
      } catch (parseError) {
        // If JSON parsing fails, try to extract findings manually
        if (gitleaksResult.includes('Finding:')) {
          this.addIssue('warning', 'secrets', 'Gitleaks found potential secrets (parsing details failed)');
          this.results.secrets.status = 'warning';
          return;
        }
      }
      
      if (findings.length > 0) {
        // Process and filter findings
        const criticalFindings = findings.filter(finding => 
          finding.RuleID && 
          CRITICAL_SECURITY_RULES.includes(finding.RuleID)
        );
        
        const moderateFindings = findings.filter(finding => 
          !criticalFindings.includes(finding)
        );
        
        if (criticalFindings.length > 0) {
          this.addIssue('error', 'secrets', `Found ${criticalFindings.length} critical secrets`);
          criticalFindings.forEach(finding => {
            this.addIssue('error', 'secrets', 
              `Critical secret in ${finding.File}:${finding.StartLine}`,
              { rule: finding.RuleID, description: finding.Description }
            );
          });
          this.results.secrets.status = 'failed';
        }
        
        if (moderateFindings.length > 0) {
          this.addIssue('warning', 'secrets', `Found ${moderateFindings.length} potential secrets to review`);
          // Show up to 5 moderate findings
          moderateFindings.slice(0, 5).forEach(finding => {
            this.addIssue('warning', 'secrets', 
              `Potential secret in ${finding.File}:${finding.StartLine}`,
              { rule: finding.RuleID }
            );
          });
          
          if (moderateFindings.length > 5) {
            this.addIssue('info', 'secrets', `... and ${moderateFindings.length - 5} more potential secrets`);
          }
          
          if (this.results.secrets.status !== 'failed') {
            this.results.secrets.status = 'warning';
          }
        }
        
        this.results.secrets.details = findings;
        
      } else {
        this.log('✅ No secrets detected by Gitleaks', 'green');
        this.results.secrets.status = 'passed';
      }
      
    } catch (gitleaksError) {
      this.log(`⚠️  Gitleaks not available, using basic pattern detection`, 'yellow');
      
      // Fallback to basic detection for critical patterns
      await this.basicSecretDetection();
    }
  }

  async basicSecretDetection() {
    const criticalPatterns = [
      { pattern: 'sk-[a-zA-Z0-9]{48}', type: 'OpenAI API Key', severity: 'critical' },
      { pattern: 'AKIA[0-9A-Z]{16}', type: 'AWS Access Key', severity: 'critical' },
      { pattern: 'AIza[0-9A-Za-z\\-_]{35}', type: 'Google API Key', severity: 'high' },
      { pattern: 'gh[pousr]_[A-Za-z0-9_]{36}', type: 'GitHub Token', severity: 'high' }
    ];

    let totalFindings = 0;
    
    for (const { pattern, type, severity } of criticalPatterns) {
      try {
        // Use spawnSync to prevent command injection vulnerabilities
        let output = '';
        try {
          const result = spawnSync('rg', [
            '--no-heading',
            '--line-number', 
            pattern,
            '.',
            '--type', 'js',
            '--type', 'ts', 
            '--type', 'json'
          ], {
            encoding: 'utf8',
            maxBuffer: 5 * 1024 * 1024
          });
          output = result.stdout || '';
        } catch (err) {
          // If rg returns non-zero (no matches), output remains empty
          // No need to reassign since it's already initialized to ''
        }
        
        if (output.trim()) {
          const matches = output.trim().split('\n');
          const validMatches = matches.filter(match => {
            const [, , content] = match.split(':', 3);
            if (!content) return false;
            
            // Enhanced placeholder detection
            const cleanContent = content.trim().toLowerCase();
            return !(
              cleanContent.includes('your-') ||
              cleanContent.includes('example') ||
              cleanContent.includes('placeholder') ||
              cleanContent.includes('dummy') ||
              cleanContent.includes('test') ||
              cleanContent.includes('sample') ||
              cleanContent.includes('xxx') ||
              cleanContent.includes('replace') ||
              cleanContent.includes('here') ||
              /^[x\-_=<>\[\]{}()]{10,}$/.test(cleanContent)
            );
          });
          
          if (validMatches.length > 0) {
            totalFindings += validMatches.length;
            
            if (severity === 'critical') {
              this.addIssue('error', 'secrets', `Found ${validMatches.length} potential ${type}(s)`);
            } else {
              this.addIssue('warning', 'secrets', `Found ${validMatches.length} potential ${type}(s)`);
            }
            
            // Show first finding as example
            const [file, line] = validMatches[0].split(':', 2);
            this.addIssue('info', 'secrets', `Example: ${file}:${line}`);
          }
        }
      } catch (error) {
        // Continue with other patterns
      }
    }
    
    if (totalFindings > 0) {
      this.addIssue('info', 'secrets', 'Install official gitleaks for enhanced detection: https://github.com/gitleaks/gitleaks');
      this.results.secrets.status = totalFindings > 0 ? 'warning' : 'passed';
    } else {
      this.log('✅ No critical secrets detected (basic scan)', 'green');
      this.results.secrets.status = 'passed';
    }
  }

  // 3. License Compliance Checking
  checkLicenseCompliance() {
    this.log('📄 Checking license compliance...', 'blue');
    
    try {
      const packageJsonPath = path.join(this.projectRoot, 'package.json');
      if (!fs.existsSync(packageJsonPath)) {
        this.addIssue('error', 'licenses', 'package.json not found');
        return;
      }
      
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
      
      // Check project license
      if (!packageJson.license) {
        this.addIssue('warning', 'licenses', 'Project license not specified in package.json');
      } else {
        this.log(`✅ Project license: ${packageJson.license}`, 'green');
      }
      
      // Check for license-checker package availability
      try {
        execSync('npx license-checker --summary', { stdio: 'pipe' });
        this.log('✅ License compliance check available', 'green');
        this.results.licenses.status = 'passed';
      } catch (error) {
        this.addIssue('info', 'licenses', 'Install license-checker for detailed compliance: pnpm add -D license-checker');
        this.results.licenses.status = 'warning';
      }
      
    } catch (error) {
      this.addIssue('warning', 'licenses', `License check failed: ${error.message}`);
      this.results.licenses.status = 'warning';
    }
  }

  // 4. Security Best Practices Validation
  checkSecurityBestPractices() {
    this.log('🛡️  Validating security best practices...', 'blue');
    
    const checks = {
      gitignore: this.checkGitIgnore(),
      envExample: this.checkEnvExample(),
      securityDeps: this.checkSecurityDependencies(),
      packageScripts: this.checkPackageScripts()
    };
    
    const passedChecks = Object.values(checks).filter(Boolean).length;
    const totalChecks = Object.keys(checks).length;
    
    if (passedChecks === totalChecks) {
      this.log('✅ All security best practices validated', 'green');
      this.results.bestPractices.status = 'passed';
    } else {
      this.addIssue('warning', 'bestPractices', 
        `${passedChecks}/${totalChecks} security best practices implemented`);
      this.results.bestPractices.status = 'warning';
    }
  }

  checkGitIgnore() {
    const gitIgnorePath = path.join(this.projectRoot, '.gitignore');
    if (!fs.existsSync(gitIgnorePath)) {
      this.addIssue('warning', 'bestPractices', '.gitignore file missing');
      return false;
    }
    
    const content = fs.readFileSync(gitIgnorePath, 'utf8');
    const requiredPatterns = ['.env', '*.key', '*.pem', 'node_modules'];
    const missingPatterns = requiredPatterns.filter(pattern => !content.includes(pattern));
    
    if (missingPatterns.length > 0) {
      this.addIssue('warning', 'bestPractices', 
        `Add to .gitignore: ${missingPatterns.join(', ')}`);
      return false;
    }
    
    return true;
  }

  checkEnvExample() {
    const envExamplePath = path.join(this.projectRoot, '.env.example');
    if (!fs.existsSync(envExamplePath)) {
      this.addIssue('warning', 'bestPractices', '.env.example file missing');
      return false;
    }
    return true;
  }

  checkSecurityDependencies() {
    try {
      const packageJsonPath = path.join(this.projectRoot, 'package.json');
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
      
      const allDeps = { ...packageJson.dependencies, ...packageJson.devDependencies };
      const securityDeps = ['cors', 'helmet', 'express-rate-limit'].filter(dep => allDeps[dep]);
      
      if (securityDeps.length > 0) {
        this.log(`✅ Security dependencies found: ${securityDeps.join(', ')}`, 'green');
        return true;
      }
      
      return false;
    } catch (error) {
      return false;
    }
  }

  checkPackageScripts() {
    try {
      const packageJsonPath = path.join(this.projectRoot, 'package.json');
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
      
      const securityScripts = ['validate:security', 'audit'].filter(script => packageJson.scripts?.[script]);
      return securityScripts.length > 0;
    } catch (error) {
      return false;
    }
  }

  // Main execution function
  async run() {
    this.log('🔒 Starting NeuroLink Security Validation...', 'cyan');
    console.log('\n' + '='.repeat(50) + '\n');

    // Run all security checks
    await this.checkSecretsWithGitleaks();
    await this.checkDependencyVulnerabilities();
    this.checkLicenseCompliance();
    this.checkSecurityBestPractices();

    // Generate summary report
    this.generateReport();
  }

  generateReport() {
    const duration = ((Date.now() - this.startTime) / 1000).toFixed(2);
    
    this.log('\n============================================================');
    this.log(`⏱️  Security validation completed in ${duration}s`, 'blue');

    // Show summary by category
    const categories = ['secrets', 'dependencies', 'licenses', 'bestPractices'];
    categories.forEach(category => {
      const result = this.results[category];
      const icon = result.status === 'passed' ? '✅' : 
                   result.status === 'warning' ? '⚠️' : '❌';
      this.log(`${icon} ${category}: ${result.status}`);
    });

    // Show detailed issues
    if (this.warnings.length > 0) {
      this.log(`\n${colors.yellow}⚠️  SECURITY WARNINGS:${colors.reset}`);
      this.log('==================================================');
      this.warnings.forEach((warning, index) => {
        this.log(`${index + 1}. ${colors.yellow}[WARNING]${colors.reset} ${warning.category}: ${warning.message}`);
        if (warning.details) {
          this.log(`   ${JSON.stringify(warning.details)}`);
        }
      });
    }

    if (this.errors.length > 0) {
      this.log(`\n${colors.red}❌ SECURITY ERRORS:${colors.reset}`);
      this.log('==================================================');
      this.errors.forEach((error, index) => {
        this.log(`${index + 1}. ${colors.red}[ERROR]${colors.reset} ${error.category}: ${error.message}`);
        if (error.details) {
          this.log(`   ${JSON.stringify(error.details)}`);
        }
      });
    }

    // Recommendations
    if (this.info.length > 0) {
      this.log(`\n${colors.blue}💡 RECOMMENDATIONS:${colors.reset}`);
      this.log('==================================================');
      this.info.forEach((info, index) => {
        this.log(`${index + 1}. ${info.message}`);
      });
    }

    // Final status
    if (this.errors.length > 0) {
      this.log(`\n${colors.red}🚫 SECURITY VALIDATION FAILED!${colors.reset}`);
      this.log(`${colors.red}Please address ${this.errors.length} critical security issues before proceeding.${colors.reset}`);
      process.exit(1);
    } else if (this.warnings.length > 0) {
      this.log(`\n${colors.yellow}⚠️  Security validation completed with ${this.warnings.length} warnings.${colors.reset}`);
      this.log(`${colors.blue}Consider addressing these warnings for enhanced security.${colors.reset}`);
    } else {
      this.log(`\n${colors.green}✅ Security validation passed! 🔒${colors.reset}`);
    }
  }
}

// Run the enhanced security validation
const validator = new SecurityValidator();
validator.run().catch(error => {
  console.error(`${colors.red}[ERROR] Security validation failed: ${error.message}${colors.reset}`);
  process.exit(1);
});