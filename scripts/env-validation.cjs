#!/usr/bin/env node

/**
 * NeuroLink Environment Validation Script
 *
 * Validates environment configuration including:
 * - .env.example completeness and accuracy
 * - Environment variable presence and format validation
 * - API key pattern validation
 * - Provider configuration validation
 * - Development vs production environment checks
 */

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

class EnvironmentValidator {
  constructor() {
    this.issues = [];
    this.warnings = [];
    this.startTime = Date.now();
    this.projectRoot = process.cwd();
    this.requiredEnvVars = new Set();
    this.optionalEnvVars = new Set();
    this.foundEnvVars = new Set();
  }

  log(message, color = 'reset') {
    console.log(`${colors[color]}[ENV] ${message}${colors.reset}`);
  }

  addIssue(severity, category, message, suggestion = null) {
    const issue = {
      severity,
      category,
      message,
      suggestion,
      timestamp: new Date().toISOString()
    };

    if (severity === 'error') {
      this.issues.push(issue);
    } else {
      this.warnings.push(issue);
    }
  }

  // 1. Parse .env.example file
  parseEnvExample() {
    this.log('📄 Parsing .env.example file...', 'blue');

    const envExamplePath = path.join(this.projectRoot, '.env.example');
    if (!fs.existsSync(envExamplePath)) {
      this.addIssue('error', 'config', '.env.example file not found',
        'Create .env.example to document required environment variables');
      return;
    }

    try {
      const content = fs.readFileSync(envExamplePath, 'utf8');
      const lines = content.split('\n');

      let currentSection = 'general';
      let lineNumber = 0;

      for (const line of lines) {
        lineNumber++;
        const trimmedLine = line.trim();

        // Skip empty lines and comments
        if (!trimmedLine || trimmedLine.startsWith('#')) {
          // Extract section names from comments
          if (trimmedLine.includes('='.repeat(10))) {
            const sectionMatch = trimmedLine.match(/# (.+) CONFIGURATION/);
            if (sectionMatch) {
              currentSection = sectionMatch[1].toLowerCase();
            }
          }
          continue;
        }

        // Parse environment variable
        const envMatch = trimmedLine.match(/^([A-Z_][A-Z0-9_]*)\s*=/);
        if (envMatch) {
          const varName = envMatch[1];
          this.foundEnvVars.add(varName);

          // Determine if required or optional based on context
          const value = trimmedLine.split('=', 2)[1] || '';
          const isOptional = trimmedLine.includes('# Optional') ||
                           trimmedLine.includes('(Optional)') ||
                           value.includes('optional');

          if (isOptional) {
            this.optionalEnvVars.add(varName);
          } else {
            this.requiredEnvVars.add(varName);
          }

          // Validate variable format and value
          this.validateEnvVariable(varName, value, currentSection, lineNumber);
        }
      }

      this.log(`✅ Found ${this.foundEnvVars.size} environment variables (${this.requiredEnvVars.size} required, ${this.optionalEnvVars.size} optional)`, 'green');

    } catch (error) {
      this.addIssue('error', 'config', `Failed to parse .env.example: ${error.message}`);
    }
  }

  // 2. Validate individual environment variables
  validateEnvVariable(name, value, section, lineNumber) {
    // API Key patterns validation
    const apiKeyPatterns = {
      'OPENAI_API_KEY': {
        pattern: /^sk-[a-zA-Z0-9]{48,}$/,
        example: 'sk-your-openai-api-key-here'
      },
      'GOOGLE_AI_API_KEY': {
        pattern: /^AIza[a-zA-Z0-9_-]{35}$/,
        example: 'your-google-ai-studio-api-key'
      },
      'ANTHROPIC_API_KEY': {
        pattern: /^sk-ant-[a-zA-Z0-9_-]+$/,
        example: 'sk-ant-your-anthropic-api-key'
      },
      'HUGGINGFACE_API_KEY': {
        pattern: /^hf_[a-zA-Z0-9]{30,}$/,
        example: 'hf_your-hugging-face-api-key-here'
      },
      'MISTRAL_API_KEY': {
        pattern: /^[a-zA-Z0-9]{32,}$/,
        example: 'your-mistral-api-key-here'
      }
    };

    // AWS credentials validation
    const awsPatterns = {
      'AWS_ACCESS_KEY_ID': {
        pattern: /^AKIA[A-Z0-9]{16}$/,
        example: 'your-aws-access-key-id'
      },
      'AWS_SECRET_ACCESS_KEY': {
        pattern: /^[a-zA-Z0-9/+=]{40}$/,
        example: 'your-aws-secret-access-key'
      }
    };

    // URL patterns validation
    const urlPatterns = {
      'OLLAMA_BASE_URL': {
        pattern: /^https?:\/\/.+$/,
        example: 'http://localhost:11434'
      },
      'LITELLM_BASE_URL': {
        pattern: /^https?:\/\/.+$/,
        example: 'https://api.litellm.ai'
      }
    };

    // Check API key patterns
    if (apiKeyPatterns[name]) {
      const { pattern, example } = apiKeyPatterns[name];
      if (value && !value.includes('your-') && !value.includes('...') && !pattern.test(value)) {
        this.addIssue('warning', 'format', `${name} format may be incorrect`,
          `Expected format example: ${example}`);
      }
    }

    // Check AWS patterns
    if (awsPatterns[name]) {
      const { pattern, example } = awsPatterns[name];
      if (value && !value.includes('your-') && !value.includes('...') && !pattern.test(value)) {
        this.addIssue('warning', 'format', `${name} format may be incorrect`,
          `Expected format example: ${example}`);
      }
    }

    // Check URL patterns
    if (urlPatterns[name]) {
      const { pattern, example } = urlPatterns[name];
      if (value && !value.includes('your-') && !pattern.test(value)) {
        this.addIssue('warning', 'format', `${name} should be a valid URL`,
          `Expected format example: ${example}`);
      }
    }

    // Check for placeholder values that should be replaced
    const placeholders = ['your-', 'your_', 'CHANGE_ME', 'REPLACE_ME', '...', 'xxx'];
    if (value && placeholders.some(placeholder => value.includes(placeholder))) {
      // This is expected in .env.example, so just note it
      return;
    }

    // Validate specific environment variables
    this.validateSpecificEnvVar(name, value);
  }

  // 3. Validate specific environment variables
  validateSpecificEnvVar(name, value) {
    switch (name) {
      case 'NODE_ENV':
        if (value && !['development', 'production', 'test'].includes(value)) {
          this.addIssue('warning', 'value', 'NODE_ENV should be development, production, or test');
        }
        break;

      case 'LOG_LEVEL':
        if (value && !['error', 'warn', 'info', 'debug', 'trace'].includes(value)) {
          this.addIssue('warning', 'value', 'LOG_LEVEL should be error, warn, info, debug, or trace');
        }
        break;

      case 'PORT':
        if (value && (isNaN(value) || parseInt(value) < 1 || parseInt(value) > 65535)) {
          this.addIssue('warning', 'value', 'PORT should be a valid port number (1-65535)');
        }
        break;

      case 'DEFAULT_PROVIDER':
        const validProviders = ['openai', 'anthropic', 'google-ai', 'vertex', 'bedrock', 'ollama', 'huggingface', 'mistral', 'litellm', 'auto'];
        if (value && !validProviders.includes(value)) {
          this.addIssue('warning', 'value', `DEFAULT_PROVIDER should be one of: ${validProviders.join(', ')}`);
        }
        break;

      case 'ENABLE_FALLBACK':
      case 'NEUROLINK_DEBUG':
      case 'NEUROLINK_EVALUATION_ENABLED':
        if (value && !['true', 'false'].includes(value.toLowerCase())) {
          this.addIssue('warning', 'value', `${name} should be true or false`);
        }
        break;
    }
  }

  // 4. Check for missing environment variables
  checkMissingEnvVars() {
    this.log('🔍 Checking for missing environment variables in codebase...', 'blue');

    const codebaseEnvVars = this.extractEnvVarsFromCode();
    const missingFromExample = [];

    for (const envVar of codebaseEnvVars) {
      if (!this.foundEnvVars.has(envVar)) {
        missingFromExample.push(envVar);
      }
    }

    if (missingFromExample.length > 0) {
      this.addIssue('warning', 'completeness',
        `Environment variables used in code but not documented in .env.example: ${missingFromExample.join(', ')}`,
        'Add these variables to .env.example for better developer experience');
    } else {
      this.log('✅ All environment variables from code are documented', 'green');
    }
  }

  // 5. Extract environment variables from codebase
  extractEnvVarsFromCode() {
    const envVars = new Set();
    const processEnvPattern = /process\.env\.([A-Z_][A-Z0-9_]*)/g;

    const filesToCheck = this.getSourceFiles();

    for (const file of filesToCheck) {
      try {
        const content = fs.readFileSync(file, 'utf8');
        for (const match of content.matchAll(processEnvPattern)) {
          envVars.add(match[1]);
        }
      } catch (error) {
        // Skip files that can't be read
      }
    }

    return envVars;
  }

  // 6. Validate provider configurations
  validateProviderConfigs() {
    this.log('🔌 Validating provider configurations...', 'blue');

    const providerConfigs = {
      'OpenAI': {
        required: ['OPENAI_API_KEY'],
        optional: ['OPENAI_MODEL'],
        check: () => this.foundEnvVars.has('OPENAI_API_KEY')
      },
      'Google AI Studio': {
        required: ['GOOGLE_AI_API_KEY'],
        optional: ['GOOGLE_AI_MODEL'],
        check: () => this.foundEnvVars.has('GOOGLE_AI_API_KEY') || this.foundEnvVars.has('GOOGLE_GENERATIVE_AI_API_KEY')
      },
      'AWS Bedrock': {
        required: ['AWS_ACCESS_KEY_ID', 'AWS_SECRET_ACCESS_KEY'],
        optional: ['AWS_SESSION_TOKEN', 'AWS_REGION', 'BEDROCK_MODEL_ID'],
        check: () => this.foundEnvVars.has('AWS_ACCESS_KEY_ID') && this.foundEnvVars.has('AWS_SECRET_ACCESS_KEY')
      },
      'Google Vertex AI': {
        required: ['GOOGLE_VERTEX_PROJECT'],
        optional: ['GOOGLE_APPLICATION_CREDENTIALS', 'GOOGLE_SERVICE_ACCOUNT_KEY', 'GOOGLE_VERTEX_LOCATION', 'VERTEX_MODEL_ID'],
        check: () => this.foundEnvVars.has('GOOGLE_VERTEX_PROJECT')
      },
      'Anthropic': {
        required: ['ANTHROPIC_API_KEY'],
        optional: ['ANTHROPIC_MODEL'],
        check: () => this.foundEnvVars.has('ANTHROPIC_API_KEY')
      },
      'Ollama': {
        required: [],
        optional: ['OLLAMA_BASE_URL', 'OLLAMA_MODEL', 'OLLAMA_TIMEOUT'],
        check: () => true // Ollama works without API keys
      },
      'Hugging Face': {
        required: ['HUGGINGFACE_API_KEY'],
        optional: ['HUGGINGFACE_MODEL'],
        check: () => this.foundEnvVars.has('HUGGINGFACE_API_KEY') || this.foundEnvVars.has('HF_TOKEN')
      },
      'Mistral AI': {
        required: ['MISTRAL_API_KEY'],
        optional: ['MISTRAL_MODEL', 'MISTRAL_ENDPOINT'],
        check: () => this.foundEnvVars.has('MISTRAL_API_KEY')
      },
      'LiteLLM': {
        required: ['LITELLM_API_KEY'],
        optional: ['LITELLM_BASE_URL', 'LITELLM_MODEL'],
        check: () => this.foundEnvVars.has('LITELLM_API_KEY')
      }
    };

    let configuredProviders = 0;

    for (const [providerName, config] of Object.entries(providerConfigs)) {
      const hasRequiredVars = config.required.every(varName => this.foundEnvVars.has(varName));
      const isConfigured = config.check();

      if (isConfigured) {
        configuredProviders++;
        this.log(`✅ ${providerName} configuration found`, 'green');

        // Check for missing optional but recommended variables
        const missingOptional = config.optional.filter(varName => !this.foundEnvVars.has(varName));
        if (missingOptional.length > 0) {
          this.addIssue('info', 'enhancement',
            `${providerName}: Consider adding optional variables: ${missingOptional.join(', ')}`);
        }
      } else if (config.required.length > 0) {
        // Only warn about missing required vars if there are any
        const missingRequired = config.required.filter(varName => !this.foundEnvVars.has(varName));
        if (missingRequired.length > 0) {
          this.addIssue('info', 'provider',
            `${providerName}: Missing required variables: ${missingRequired.join(', ')}`);
        }
      }
    }

    if (configuredProviders === 0) {
      this.addIssue('warning', 'providers', 'No AI providers appear to be configured',
        'Add at least one provider configuration to use NeuroLink');
    } else {
      this.log(`✅ Found ${configuredProviders} configured providers`, 'green');
    }
  }

  // 7. Check environment consistency
  checkEnvironmentConsistency() {
    this.log('🔄 Checking environment consistency...', 'blue');

    // Check for conflicting configurations
    const conflicts = [
      {
        vars: ['GOOGLE_AI_API_KEY', 'GOOGLE_GENERATIVE_AI_API_KEY'],
        message: 'Both GOOGLE_AI_API_KEY and GOOGLE_GENERATIVE_AI_API_KEY are set - use only one'
      },
      {
        vars: ['HUGGINGFACE_API_KEY', 'HF_TOKEN'],
        message: 'Both HUGGINGFACE_API_KEY and HF_TOKEN are set - use only one'
      }
    ];

    for (const conflict of conflicts) {
      const presentVars = conflict.vars.filter(varName => this.foundEnvVars.has(varName));
      if (presentVars.length > 1) {
        this.addIssue('warning', 'consistency', conflict.message);
      }
    }

    // Check for evaluation system consistency
    if (this.foundEnvVars.has('NEUROLINK_EVALUATION_ENABLED')) {
      const evaluationVars = [
        'NEUROLINK_EVALUATION_MODEL',
        'NEUROLINK_EVALUATION_PROVIDER'
      ];

      const missingEvalVars = evaluationVars.filter(varName => !this.foundEnvVars.has(varName));
      if (missingEvalVars.length > 0) {
        this.addIssue('warning', 'consistency',
          `Evaluation enabled but missing: ${missingEvalVars.join(', ')}`);
      }
    }
  }

  getSourceFiles() {
    const extensions = ['.js', '.ts', '.jsx', '.tsx'];
    const ignoreDirs = ['node_modules', '.git', 'dist', 'build', '.svelte-kit'];

    const files = [];

    const walk = (dir) => {
      try {
        const items = fs.readdirSync(dir);

        for (const item of items) {
          const fullPath = path.join(dir, item);
          const stat = fs.statSync(fullPath);

          if (stat.isDirectory()) {
            if (!ignoreDirs.includes(item)) {
              walk(fullPath);
            }
          } else if (stat.isFile()) {
            const ext = path.extname(item);
            if (extensions.includes(ext)) {
              files.push(fullPath);
            }
          }
        }
      } catch (error) {
        // Skip directories that can't be read
      }
    };

    walk(this.projectRoot);
    return files;
  }

  // Main execution function
  async run() {
    this.log('🌍 Starting NeuroLink Environment Validation...', 'cyan');
    console.log('\n' + '='.repeat(50) + '\n');

    try {
      this.parseEnvExample();
      this.checkMissingEnvVars();
      this.validateProviderConfigs();
      this.checkEnvironmentConsistency();

    } catch (error) {
      this.addIssue('error', 'system', `Environment validation failed: ${error.message}`);
    }

    this.printResults();
  }

  printResults() {
    const duration = ((Date.now() - this.startTime) / 1000).toFixed(2);

    console.log('\n' + '='.repeat(50));
    this.log(`⏱️  Environment validation completed in ${duration}s`, 'cyan');

    if (this.issues.length > 0) {
      console.log(`\n${colors.red}❌ ENVIRONMENT ISSUES FOUND:${colors.reset}`);
      console.log('='.repeat(50));

      this.issues.forEach((issue, index) => {
        console.log(`${index + 1}. ${colors.red}[${issue.severity.toUpperCase()}]${colors.reset} ${issue.category}: ${issue.message}`);
        if (issue.suggestion) {
          console.log(`   💡 Suggestion: ${issue.suggestion}`);
        }
        console.log('');
      });
    }

    if (this.warnings.length > 0) {
      console.log(`\n${colors.yellow}⚠️  ENVIRONMENT WARNINGS:${colors.reset}`);
      console.log('='.repeat(50));

      this.warnings.forEach((warning, index) => {
        console.log(`${index + 1}. ${colors.yellow}[WARNING]${colors.reset} ${warning.category}: ${warning.message}`);
        if (warning.suggestion) {
          console.log(`   💡 Suggestion: ${warning.suggestion}`);
        }
        console.log('');
      });
    }

    if (this.issues.length === 0 && this.warnings.length === 0) {
      console.log(`\n${colors.green}✅ ALL ENVIRONMENT CHECKS PASSED!${colors.reset}`);
      console.log('='.repeat(50));
      console.log(`${colors.green}🌍 Environment configuration is valid${colors.reset}`);
      console.log(`${colors.green}📄 .env.example is complete and accurate${colors.reset}`);
      console.log(`${colors.green}🔌 Provider configurations look good${colors.reset}`);
      console.log(`${colors.green}🔄 No consistency issues found${colors.reset}`);
    } else {
      console.log(`\n${colors.yellow}📋 Consider addressing ${this.warnings.length} warnings for better environment setup.${colors.reset}`);
    }

    if (this.issues.length > 0) {
      console.log(`\n${colors.red}🚫 ENVIRONMENT VALIDATION FAILED!${colors.reset}`);
      console.log(`${colors.red}Please address ${this.issues.length} critical environment issues before proceeding.${colors.reset}`);
      process.exit(1);
    } else {
      console.log(`\n${colors.green}Environment validation passed! 🌍${colors.reset}`);
      process.exit(0);
    }
  }
}

// Run the environment validator
if (require.main === module) {
  const validator = new EnvironmentValidator();
  validator.run().catch(error => {
    console.error(`${colors.red}Environment validation crashed: ${error.message}${colors.reset}`);
    process.exit(1);
  });
}

module.exports = EnvironmentValidator;
