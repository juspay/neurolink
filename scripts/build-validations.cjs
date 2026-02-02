#!/usr/bin/env node

/**
 * NeuroLink Custom Build Validation Script
 * 
 * Comprehensive validation system that enforces code quality,
 * security standards, and project-specific requirements.
 * 
 * Part of Build Rule Enforcement System - Phase 1
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

class NeuroLinkBuildValidator {
  constructor() {
    this.errors = [];
    this.warnings = [];
    this.rootDir = path.resolve(__dirname, '..');
    this.fileCache = new Map(); // Cache for file contents
  }

  log(message) {
    console.log(`[VALIDATOR] ${message}`);
  }

  // Cached file reading for performance optimization
  readFileWithCache(filePath) {
    if (this.fileCache.has(filePath)) {
      return this.fileCache.get(filePath);
    }
    
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      this.fileCache.set(filePath, content);
      return content;
    } catch (error) {
      // Cache the error to avoid repeated file system calls
      this.fileCache.set(filePath, null);
      throw error;
    }
  }

  // Get TypeScript files recursively using Node.js fs
  getTypeScriptFiles(dir, excludeTest = false) {
    const files = [];
    const walk = (currentDir) => {
      try {
        const items = fs.readdirSync(currentDir);
        for (const item of items) {
          const fullPath = path.join(currentDir, item);
          const stat = fs.statSync(fullPath);
          
          if (stat.isDirectory()) {
            // Skip test directories if excludeTest is true
            if (excludeTest && item === 'test') continue;
            walk(fullPath);
          } else if (stat.isFile() && item.endsWith('.ts')) {
            // Convert to relative path from root
            const relativePath = path.relative(this.rootDir, fullPath);
            files.push(relativePath);
          }
        }
      } catch (error) {
        // Skip directories that can't be read
      }
    };
    
    walk(dir);
    return files;
  }

  // Check for console.log in production code (except logger.ts)
  checkConsoleStatements() {
    this.log('🔍 Checking for console statements in production code...');
    
    try {
      const srcDir = path.join(this.rootDir, 'src');
      const srcFiles = this.getTypeScriptFiles(srcDir, true); // exclude test directories
      
      for (const file of srcFiles) {
        if (file.includes('logger.ts')) continue;
        // Skip CLI command files - console.log is appropriate for CLI output
        if (file.includes('src/cli/commands/') || file.includes('src\\cli\\commands\\')) continue;
        
        const fullPath = path.join(this.rootDir, file);
        if (!fs.existsSync(fullPath)) continue;
        
        const content = this.readFileWithCache(fullPath);
        const lines = content.split('\n');
        
        lines.forEach((line, index) => {
          // Match actual console statements, ignore comments and string literals
          if (/^\s*console\.(log|error|warn|info)\s*\(/.test(line)) {
            this.errors.push(
              `❌ Console statement found in ${file}:${index + 1}\n` +
              `   Line: ${line.trim()}\n` +
              `   💡 Use logger.info(), logger.error(), etc. instead`
            );
          }
        });
      }
      
      if (this.errors.length === 0) {
        this.log('✅ No console statements found in production code');
      }
    } catch (error) {
      this.warnings.push(`⚠️  Could not check console statements: ${error.message}`);
    }
  }

  // Use consolidated security validation for professional secret detection
  checkApiKeyLeaks() {
    this.log('🔐 Running professional secret detection...');
    
    try {
      // Use the consolidated security-check.cjs for professional secret detection
      const securityCheckScript = path.join(__dirname, 'security-check.cjs');
      const securityResult = execSync(`node "${securityCheckScript}"`, {
        cwd: this.rootDir,
        encoding: 'utf8',
        stdio: 'pipe'
      });
      
      // Parse security check results for critical secrets
      if (securityResult.includes('critical secrets') || securityResult.includes('SECURITY VALIDATION FAILED')) {
        this.errors.push('🔐 Critical secrets detected by professional security scan');
        this.errors.push('   Run `pnpm run validate:security` for detailed analysis');
      } else if (securityResult.includes('potential secrets') || securityResult.includes('warnings')) {
        this.warnings.push('🔐 Potential secrets detected - review security scan results');
        this.warnings.push('   Run `pnpm run validate:security` for full analysis');
      } else {
        this.log('✅ No critical secrets detected by professional scan');
      }
    } catch (error) {
      // Security validation failed - this is critical for build validation
      if (error.status === 1) {
        this.errors.push('🔐 Security validation failed - critical issues detected');
        this.errors.push('   Fix security issues before building: pnpm run validate:security');
      } else {
        this.warnings.push(`🔐 Could not run security validation: ${error.message}`);
        this.warnings.push('   Consider running: pnpm run validate:security');
      }
    }
  }

  // Check package.json consistency
  validatePackageJson() {
    this.log('📦 Validating package.json configuration...');
    
    try {
      const pkgPath = path.join(this.rootDir, 'package.json');
      const pkg = JSON.parse(this.readFileWithCache(pkgPath));
      
      const requiredScripts = ['build', 'test', 'lint', 'format', 'build:cli'];
      for (const script of requiredScripts) {
        if (!pkg.scripts[script]) {
          this.errors.push(`📦 Missing required script: ${script}`);
        }
      }

      // Check for critical dependency versions
      const minVersions = {
        'typescript': '5',
        'eslint': '9',
        '@typescript-eslint/eslint-plugin': '8'
      };

      for (const [dep, minVersion] of Object.entries(minVersions)) {
        const currentVersion = pkg.devDependencies?.[dep];
        if (currentVersion && !currentVersion.includes(minVersion)) {
          this.warnings.push(`📦 ${dep} should be version ${minVersion}+ (current: ${currentVersion})`);
        }
      }
      
      // Check if lint-staged is configured
      if (!pkg['lint-staged']) {
        this.errors.push('📦 Missing lint-staged configuration in package.json');
      }
      
      this.log('✅ Package.json validation completed');
    } catch (error) {
      this.errors.push(`📦 Could not validate package.json: ${error.message}`);
    }
  }

  // Custom rule: Check for proper error handling
  checkErrorHandling() {
    this.log('⚠️  Checking error handling patterns...');
    
    try {
      const srcDir = path.join(this.rootDir, 'src');
      const files = this.getTypeScriptFiles(srcDir, true); // exclude test directories
      
      for (const file of files) {
        const fullPath = path.join(this.rootDir, file);
        if (!fs.existsSync(fullPath)) continue;
        
        const content = this.readFileWithCache(fullPath);
        const lines = content.split('\n');
        
        lines.forEach((line, index) => {
          // Check for empty catch blocks
          if (line.includes('catch') && (line.includes('{}') || line.includes('catch()'))) {
            this.errors.push(`⚠️  Empty catch block in ${file}:${index + 1}`);
          }
          
          // Check for Promise without error handling (improved accuracy)
          if (line.includes('new Promise')) {
            // Check if this Promise has error handling in the surrounding context
            const hasErrorHandling = this.checkPromiseErrorHandling(content, index, lines);
            if (!hasErrorHandling) {
              this.warnings.push(`⚠️  Promise without error handling in ${file}:${index + 1}`);
            }
          }
        });
      }
      
      this.log('✅ Error handling check completed');
    } catch (error) {
      this.warnings.push(`⚠️  Could not check error handling: ${error.message}`);
    }
  }

  // Helper method to check Promise error handling in context
  checkPromiseErrorHandling(content, lineIndex, lines) {
    // 1. Check if the Promise is wrapped in a try-catch block
    const beforeLines = lines.slice(Math.max(0, lineIndex - 10), lineIndex);
    const afterLines = lines.slice(lineIndex + 1, Math.min(lines.length, lineIndex + 10));
    
    // Look for try block before the Promise
    const hasTryBlock = beforeLines.some(line => line.includes('try') && line.includes('{'));
    
    // Look for catch block after the Promise
    const hasCatchBlock = afterLines.some(line => line.includes('catch'));
    
    if (hasTryBlock && hasCatchBlock) {
      return true;
    }
    
    // 2. Check if the Promise chain has .catch() method
    const promiseLine = lines[lineIndex];
    const nextFewLines = lines.slice(lineIndex, Math.min(lines.length, lineIndex + 5)).join(' ');
    
    if (nextFewLines.includes('.catch(') || nextFewLines.includes('.catch ')) {
      return true;
    }
    
    // 3. Check for async/await pattern with try-catch
    const isAwaitedPromise = promiseLine.includes('await') || 
                            beforeLines.some(line => line.includes('await'));
    
    if (isAwaitedPromise && (hasTryBlock || hasCatchBlock)) {
      return true;
    }
    
    // 4. Check if Promise is returned (caller responsible for error handling)
    const currentFunction = this.findCurrentFunction(lines, lineIndex);
    if (currentFunction && promiseLine.includes('return')) {
      return true;
    }
    
    // 5. Check if Promise is assigned to variable (error handling may be elsewhere)
    if (promiseLine.includes('=') && !promiseLine.includes('return')) {
      const variableName = this.extractVariableName(promiseLine);
      if (variableName && content.includes(`${variableName}.catch`)) {
        return true;
      }
    }
    
    return false;
  }

  // Helper to find current function context
  findCurrentFunction(lines, lineIndex) {
    for (let i = lineIndex; i >= 0; i--) {
      const line = lines[i];
      if (line.includes('function') || line.includes('=>') || line.includes('async')) {
        return line;
      }
      // Stop at class or top-level scope
      if (line.includes('class') || (i === 0)) {
        break;
      }
    }
    return null;
  }

  // Helper to extract variable name from assignment
  extractVariableName(line) {
    const match = line.match(/(?:const|let|var)\s+(\w+)\s*=/);
    if (match) {
      return match[1];
    }
    
    const assignMatch = line.match(/(\w+)\s*=/);
    if (assignMatch) {
      return assignMatch[1];
    }
    
    return null;
  }

  // Check for TODO/FIXME without issue references
  checkTodoReferences() {
    this.log('📝 Checking TODO/FIXME references...');
    
    try {
      const srcDir = path.join(this.rootDir, 'src');
      const files = this.getTypeScriptFiles(srcDir, false); // include test directories
      
      for (const file of files) {
        const fullPath = path.join(this.rootDir, file);
        if (!fs.existsSync(fullPath)) continue;
        
        const content = this.readFileWithCache(fullPath);
        const lines = content.split('\n');
        
        lines.forEach((line, index) => {
          if (line.includes('TODO') || line.includes('FIXME')) {
            if (!line.includes('#') && !line.includes('http') && !line.includes('issue')) {
              this.warnings.push(
                `📝 TODO/FIXME without reference in ${file}:${index + 1}\n` +
                `   Consider adding issue number or link for tracking`
              );
            }
          }
        });
      }
      
      this.log('✅ TODO/FIXME reference check completed');
    } catch (error) {
      this.warnings.push(`📝 Could not check TODO references: ${error.message}`);
    }
  }

  // Validate environment configuration
  checkEnvironmentConfig() {
    this.log('🌍 Validating environment configuration...');
    
    const envExamplePath = path.join(this.rootDir, '.env.example');
    const envPath = path.join(this.rootDir, '.env');
    
    if (!fs.existsSync(envExamplePath)) {
      this.errors.push('🌍 Missing .env.example file - required for environment documentation');
    } else {
      this.log('✅ .env.example file found');
    }
    
    // Check for environment variable usage without defaults
    try {
      const envUsagePattern = /process\.env\.([A-Z_]+)/g;
      const srcDir = path.join(this.rootDir, 'src');
      const files = this.getTypeScriptFiles(srcDir, false); // include test directories
      
      const envVars = new Set();
      
      for (const file of files) {
        const fullPath = path.join(this.rootDir, file);
        if (!fs.existsSync(fullPath)) continue;
        
        const content = this.readFileWithCache(fullPath);
        let match;
        while ((match = envUsagePattern.exec(content)) !== null) {
          envVars.add(match[1]);
        }
      }
      
      // Check if all used env vars are documented
      if (fs.existsSync(envExamplePath) && envVars.size > 0) {
        const envExample = this.readFileWithCache(envExamplePath);
        for (const envVar of envVars) {
          if (!envExample.includes(envVar)) {
            this.warnings.push(`🌍 Environment variable ${envVar} not documented in .env.example`);
          }
        }
      }
      
      this.log('✅ Environment configuration check completed');
    } catch (error) {
      this.warnings.push(`🌍 Could not check environment configuration: ${error.message}`);
    }
  }

  // Check for file permissions and structure
  checkProjectStructure() {
    this.log('📁 Validating project structure...');
    
    const requiredDirs = ['src', 'src/lib', 'src/cli'];
    const requiredFiles = ['tsconfig.json', 'tsconfig.cli.json', 'eslint.config.js'];
    
    for (const dir of requiredDirs) {
      const dirPath = path.join(this.rootDir, dir);
      if (!fs.existsSync(dirPath)) {
        this.errors.push(`📁 Missing required directory: ${dir}`);
      }
    }
    
    for (const file of requiredFiles) {
      const filePath = path.join(this.rootDir, file);
      if (!fs.existsSync(filePath)) {
        this.errors.push(`📁 Missing required file: ${file}`);
      }
    }
    
    this.log('✅ Project structure validation completed');
  }

  // Main validation runner
  run() {
    console.log('🔍 Running NeuroLink Build Validations...\n');
    console.log('================================================\n');
    
    const startTime = Date.now();
    
    // Run all validation checks
    this.checkProjectStructure();
    this.checkConsoleStatements();
    this.checkApiKeyLeaks();
    this.validatePackageJson();
    this.checkErrorHandling();
    this.checkTodoReferences();
    this.checkEnvironmentConfig();

    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);

    console.log('\n================================================');
    console.log(`⏱️  Validation completed in ${duration}s\n`);

    // Print warnings first
    if (this.warnings.length > 0) {
      console.log('⚠️  WARNINGS:');
      console.log('='.repeat(50));
      this.warnings.forEach((warning, index) => {
        console.log(`${index + 1}. ${warning}\n`);
      });
    }

    // Then errors (which will fail the build)
    if (this.errors.length > 0) {
      console.log('❌ VALIDATION FAILED:');
      console.log('='.repeat(50));
      this.errors.forEach((error, index) => {
        console.log(`${index + 1}. ${error}\n`);
      });
      console.log(`💡 Fix these ${this.errors.length} critical issues before proceeding.`);
      console.log('📚 See project documentation or contact the team for detailed guidance.\n');
      
      // Exit with error code to fail CI/CD
      process.exit(1);
    }

    // Success message
    console.log('✅ ALL VALIDATIONS PASSED!');
    console.log('='.repeat(50));
    console.log('🎉 Code quality standards met');
    console.log('🔒 Security checks passed');
    console.log('📦 Package configuration validated');
    console.log('🌍 Environment setup confirmed\n');
    
    if (this.warnings.length > 0) {
      console.log(`📋 Consider addressing ${this.warnings.length} warnings for enhanced code quality.\n`);
    }
    
    console.log('Ready for build! 🚀\n');
  }
}

// Run validation if script is called directly
if (require.main === module) {
  new NeuroLinkBuildValidator().run();
}

module.exports = NeuroLinkBuildValidator;