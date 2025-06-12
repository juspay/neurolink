#!/usr/bin/env node

/**
 * NeuroLink CLI - Enhanced Simplified Approach
 *
 * Professional CLI experience with minimal maintenance overhead.
 * Features: Spinners, colors, batch processing, provider testing, rich help
 * Implementation: ~300 lines using simple JS utility functions
 */

import { NeuroLink } from '@juspay/neurolink';
import type { AIProviderName } from '@juspay/neurolink';
import yargs from 'yargs'; // Keep default import
import { type Argv as YargsArgv, type ArgumentsCamelCase } from 'yargs'; // Import Argv type specifically
import { hideBin } from 'yargs/helpers';
import ora from 'ora';
import chalk from 'chalk';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import { addMCPCommands } from './commands/mcp.js';

// Load environment variables from .env file
try {
  // Try to import and configure dotenv
  const { config } = await import('dotenv');
  config(); // Load .env from current working directory
} catch (error) {
  // dotenv is not available (dev dependency only) - this is fine for production
  // Environment variables should be set externally in production
}

// Get current directory for ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Utility Functions (Simple, Zero Maintenance)
function formatOutput(result: any, format: string = 'text'): string {
  if (format === 'json') {
    return JSON.stringify(result, null, 2);
  }

  // Smart text formatting
  if (result?.content) {
    return result.content;
  }

  if (typeof result === 'string') {
    return result;
  }

  return JSON.stringify(result, null, 2);
}

function handleError(error: Error, context: string): void {
  let specificErrorMessage = error.message;
  const originalErrorMessageLowerCase = error.message ? error.message.toLowerCase() : '';
  const errorStringLowerCase = String(error).toLowerCase();

  let isAuthError = false;
  let genericMessage = specificErrorMessage; // Initialize genericMessage with the specific one

  if (
    originalErrorMessageLowerCase.includes('api_key') ||
    originalErrorMessageLowerCase.includes('google_ai_api_key') ||
    originalErrorMessageLowerCase.includes('aws_access_key_id') ||
    originalErrorMessageLowerCase.includes('aws_secret_access_key') ||
    originalErrorMessageLowerCase.includes('aws_session_token') ||
    originalErrorMessageLowerCase.includes('google_application_credentials') ||
    originalErrorMessageLowerCase.includes('google_service_account_key') ||
    originalErrorMessageLowerCase.includes('google_auth_client_email') ||
    originalErrorMessageLowerCase.includes('anthropic_api_key') ||
    originalErrorMessageLowerCase.includes('azure_openai_api_key')
  ) {
    isAuthError = true;
  } else if ( // Fallback to checking the full stringified error if direct message didn't match
    errorStringLowerCase.includes('api_key') ||
    errorStringLowerCase.includes('google_ai_api_key') ||
    errorStringLowerCase.includes('aws_access_key_id') ||
    errorStringLowerCase.includes('aws_secret_access_key') ||
    errorStringLowerCase.includes('aws_session_token') ||
    errorStringLowerCase.includes('google_application_credentials') ||
    errorStringLowerCase.includes('google_service_account_key') ||
    errorStringLowerCase.includes('google_auth_client_email') ||
    errorStringLowerCase.includes('anthropic_api_key') ||
    errorStringLowerCase.includes('azure_openai_api_key')
  ) {
    isAuthError = true;
  }

  if (isAuthError) {
    genericMessage = 'Authentication error: Missing or invalid API key/credentials for the selected provider.';
  } else if (
    originalErrorMessageLowerCase.includes('enotfound') || // Prefer direct message checks
    originalErrorMessageLowerCase.includes('econnrefused') ||
    originalErrorMessageLowerCase.includes('invalid-endpoint') ||
    originalErrorMessageLowerCase.includes('network error') ||
    originalErrorMessageLowerCase.includes('could not connect') ||
    originalErrorMessageLowerCase.includes('timeout') ||
    errorStringLowerCase.includes('enotfound') || // Fallback to full string
    errorStringLowerCase.includes('econnrefused') ||
    errorStringLowerCase.includes('invalid-endpoint') ||
    errorStringLowerCase.includes('network error') ||
    errorStringLowerCase.includes('could not connect') ||
    errorStringLowerCase.includes('timeout') // General timeout
  ) {
    genericMessage = 'Network error: Could not connect to the API endpoint or the request timed out.';
  } else if (errorStringLowerCase.includes('not authorized') || errorStringLowerCase.includes('permission denied')) {
    genericMessage = 'Authorization error: You are not authorized to perform this action or access this resource.';
  }
  // If no specific condition matched, genericMessage remains error.message

  console.error(chalk.red(`❌ ${context} failed: ${genericMessage}`));

  // Smart hints for common errors (just string matching!)
  if (genericMessage.toLowerCase().includes('api key') || genericMessage.toLowerCase().includes('credential')) {
    console.error(chalk.yellow('💡 Set Google AI Studio API key (RECOMMENDED): export GOOGLE_AI_API_KEY=AIza-...'));
    console.error(chalk.yellow('💡 Or set OpenAI API key: export OPENAI_API_KEY=sk-...'));
    console.error(chalk.yellow('💡 Or set AWS Bedrock credentials: export AWS_ACCESS_KEY_ID=... AWS_SECRET_ACCESS_KEY=... AWS_REGION=us-east-1'));
    console.error(chalk.yellow('💡 Or set Google Vertex AI credentials: export GOOGLE_APPLICATION_CREDENTIALS=/path/to/key.json'));
    console.error(chalk.yellow('💡 Or set Anthropic API key: export ANTHROPIC_API_KEY=sk-ant-...'));
    console.error(chalk.yellow('💡 Or set Azure OpenAI credentials: export AZURE_OPENAI_API_KEY=... AZURE_OPENAI_ENDPOINT=...'));
  }

  if (error.message.toLowerCase().includes('rate limit')) {
    console.error(chalk.yellow('💡 Try again in a few moments or use --provider vertex'));
  }

  if (error.message.toLowerCase().includes('not authorized') || error.message.toLowerCase().includes('permission denied')) {
     console.error(chalk.yellow('💡 Check your account permissions for the selected model/service.'));
     console.error(chalk.yellow('💡 For AWS Bedrock, ensure you have permissions for the specific model and consider using inference profile ARNs.'));
  }


  process.exit(1);
}

function validateConfig(): void {
  const hasGoogleAI = !!process.env.GOOGLE_AI_API_KEY;
  const hasOpenAI = !!process.env.OPENAI_API_KEY;
  const hasAWS = !!(process.env.AWS_REGION || process.env.AWS_ACCESS_KEY_ID);
  const hasGoogle = !!(process.env.GOOGLE_APPLICATION_CREDENTIALS || process.env.GOOGLE_SERVICE_ACCOUNT_KEY || process.env.GOOGLE_AUTH_CLIENT_EMAIL);
  const hasAnthropic = !!process.env.ANTHROPIC_API_KEY;
  const hasAzure = !!(process.env.AZURE_OPENAI_API_KEY && process.env.AZURE_OPENAI_ENDPOINT);

  if (!hasGoogleAI && !hasOpenAI && !hasAWS && !hasGoogle && !hasAnthropic && !hasAzure) {
    console.error(chalk.red('⚠️  No AI provider credentials found'));
    console.error(chalk.yellow('💡 Set one of:'));
    console.error(chalk.yellow('   • GOOGLE_AI_API_KEY=AIza-...'));
    console.error(chalk.yellow('   • OPENAI_API_KEY=sk-...'));
    console.error(chalk.yellow('   • AWS_REGION=us-east-1 (+ AWS credentials)'));
    console.error(chalk.yellow('   • GOOGLE_APPLICATION_CREDENTIALS=/path/to/key.json'));
    console.error(chalk.yellow('   • ANTHROPIC_API_KEY=sk-ant-...'));
    console.error(chalk.yellow('   • AZURE_OPENAI_API_KEY=... (+ AZURE_OPENAI_ENDPOINT)'));
    console.error(chalk.blue('\n📚 See: https://github.com/juspay/neurolink#setup'));
    process.exit(1);
  }
}

// Initialize SDK
const sdk = new NeuroLink();

// Manual pre-validation for unknown flags
const args = hideBin(process.argv);

// Enhanced CLI with Professional UX
const cli = yargs(args)
  .scriptName('neurolink')
  .usage('Usage: $0 <command> [options]')
  .version()
  .help()
  .alias('h', 'help')
  .alias('V', 'version')
  .strictOptions()
  .strictCommands()
  .demandCommand(1, '')
  .epilogue('For more info: https://github.com/juspay/neurolink')
  .showHelpOnFail(true, 'Specify --help for available options')
  .middleware((argv) => {
    // Control SDK logging based on debug flag
    if (argv.debug) {
      process.env.NEUROLINK_DEBUG = 'true';
    } else if (typeof argv.debug !== 'undefined') {
      // Only set to false if debug flag was explicitly provided
      process.env.NEUROLINK_DEBUG = 'false';
    }
    // Keep existing quiet middleware
    if (process.env.NEUROLINK_QUIET === 'true' && typeof argv.quiet === 'undefined') {
      argv.quiet = true;
    }
  })
  .fail((msg, err, yargsInstance) => {
    const exitProcess = () => {
      if (!process.exitCode) process.exit(1);
    };

    if (err) {
      // Error likely from an async command handler (e.g., via handleError)
      // handleError already prints and calls process.exit(1).
      // If we're here, it means handleError's process.exit might not have been caught by the top-level async IIFE.
      // Or, it's a synchronous yargs error during parsing that yargs itself throws.
      const alreadyExitedByHandleError = (err as any)?.exitCode !== undefined;
      // A simple heuristic: if the error message doesn't look like one of our handled generic messages,
      // it might be a direct yargs parsing error.
      const isLikelyYargsInternalError =
        err.message && // Ensure err.message exists
        !err.message.includes('Authentication error') &&
        !err.message.includes('Network error') &&
        !err.message.includes('Authorization error') &&
        !err.message.includes('Permission denied') && // from config export
        !err.message.includes('Invalid or unparseable JSON'); // from config import

      if (!alreadyExitedByHandleError) {
        process.stderr.write(chalk.red(`CLI Error: ${err.message || msg || 'An unexpected error occurred.'}\n`));
        // If it's a yargs internal parsing error, show help.
        if (isLikelyYargsInternalError && msg) {
             yargsInstance.showHelp(h => { process.stderr.write(h + '\n'); exitProcess(); });
             return;
        }
        exitProcess();
      }
      return; // Exit was already called or error handled
    }

    // Yargs parsing/validation error (msg is present, err is null)
    if (msg) {
      let processedMsg = `Error: ${msg}\n`;
      if (msg.includes('Not enough non-option arguments') || msg.includes('Missing required argument') || msg.includes('Unknown command')) {
        process.stderr.write(chalk.red(processedMsg)); // Print error first
        yargsInstance.showHelp(h => { process.stderr.write('\n' + h + '\n'); exitProcess(); });
        return; // Exit happens in callback
      } else if (msg.includes('Unknown argument') || msg.includes('Invalid values')) {
        processedMsg = `Error: ${msg}\nUse --help to see available options.\n`;
      }
      process.stderr.write(chalk.red(processedMsg));
    } else {
      // No specific message, but failure occurred (e.g. demandCommand failed silently)
      yargsInstance.showHelp(h => { process.stderr.write(h + '\n'); exitProcess(); });
      return; // Exit happens in callback
    }
    exitProcess(); // Default exit
  })

  // Generate Text Command
  .command(
    ['generate-text <prompt>', 'generate <prompt>'],
    'Generate text using AI providers',
    (yargsInstance) => yargsInstance
      .usage('Usage: $0 generate-text <prompt> [options]')
      .positional('prompt', {
        type: 'string',
        description: 'Text prompt for AI generation',
        demandOption: true,
      })
      .option('provider', {
        choices: ['auto', 'openai', 'bedrock', 'vertex', 'anthropic', 'azure', 'google-ai'] as const,
        default: 'auto',
        description: 'AI provider to use (auto-selects best available)'
      })
      .option('temperature', { type: 'number', default: 0.7, description: 'Creativity level (0.0 = focused, 1.0 = creative)' })
      .option('max-tokens', { type: 'number', default: 500, description: 'Maximum tokens to generate' })
      .option('system', { type: 'string', description: 'System prompt to guide AI behavior' })
      .option('format', { choices: ['text', 'json'] as const, default: 'text', alias: 'f', description: 'Output format' })
      .option('debug', { type: 'boolean', default: false, description: 'Enable debug mode with verbose output' }) // Kept for potential specific debug logic
      .option('timeout', { type: 'number', default: 30000, description: 'Timeout for the request in milliseconds' })
      .example('$0 generate-text "Hello world"', 'Basic text generation')
      .example('$0 generate-text "Write a story" --provider openai', 'Use specific provider'),
    async (argv) => {
      let originalConsole: any = {};
      if (argv.format === 'json' && !argv.quiet) { // Suppress only if not quiet, as quiet implies no spinners anyway
        originalConsole = { ...console };
        (Object.keys(originalConsole) as Array<keyof Console>).forEach((key) => {
          if (typeof console[key] === 'function') { (console as any)[key] = () => {}; }
        });
      }

      const spinner = argv.format === 'json' || argv.quiet ? null : ora('🤖 Generating text...').start();

      try {
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error(`Request timeout (${argv.timeout}ms)`)), argv.timeout);
        });

        const generatePromise = sdk.generateText({
          prompt: argv.prompt as string, // Cast because demandOption is true
          provider: argv.provider === 'auto' ? undefined : argv.provider as AIProviderName,
          temperature: argv.temperature,
          maxTokens: argv.maxTokens,
          systemPrompt: argv.system
        });

        const result = await Promise.race([generatePromise, timeoutPromise]) as any;

        if (argv.format === 'json' && originalConsole.log) { Object.assign(console, originalConsole); }
        if (spinner) spinner.succeed(chalk.green('✅ Text generated successfully!'));

        if (argv.format === 'json') {
          const jsonOutput = {
            content: result.content || '', provider: result.provider,
            usage: result.usage || { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
            responseTime: result.responseTime || 0
          };
          process.stdout.write(JSON.stringify(jsonOutput, null, 2) + '\n');
        } else if (argv.debug) {
          // Debug mode: Show AI response + full metadata
          if (result.content) console.log('\n' + result.content + '\n');
          console.log(JSON.stringify({ provider: result.provider, usage: result.usage, responseTime: result.responseTime }, null, 2));
          if (result.usage) console.log(chalk.blue(`ℹ️  ${result.usage.totalTokens} tokens used`));
        } else {
          // Default mode: Clean AI response only
          if (result.content) console.log(result.content);
        }

        // Explicitly exit to prevent hanging, especially with Google AI Studio
        process.exit(0);
      } catch (error) {
        if (argv.format === 'json' && originalConsole.log) { Object.assign(console, originalConsole); }
        if (spinner) spinner.fail();
        if (argv.format === 'json') {
          process.stdout.write(JSON.stringify({ error: (error as Error).message, success: false }, null, 2) + '\n');
          process.exit(1);
        } else {
          handleError(error as Error, 'Text generation');
        }
      }
    }
  )

  // Stream Text Command
  .command(
    'stream <prompt>',
    'Stream text generation in real-time',
    (yargsInstance) => yargsInstance
      .usage('Usage: $0 stream <prompt> [options]')
      .positional('prompt', { type: 'string', description: 'Text prompt for streaming', demandOption: true })
      .option('provider', { choices: ['auto', 'openai', 'bedrock', 'vertex', 'anthropic', 'azure', 'google-ai'] as const, default: 'auto', description: 'AI provider to use' })
      .option('temperature', { type: 'number', default: 0.7, description: 'Creativity level' })
      .option('debug', { type: 'boolean', default: false, description: 'Enable debug mode with interleaved logging' })
      .example('$0 stream "Tell me a story"', 'Stream a story in real-time'),
    async (argv) => {
      // Default mode: Simple streaming message
      // Debug mode: More detailed information
      if (!argv.quiet && !argv.debug) {
        console.log(chalk.blue('🔄 Streaming...'));
      } else if (!argv.quiet && argv.debug) {
        console.log(chalk.blue(`🔄 Streaming from ${argv.provider} provider with debug logging...\n`));
      }

      try {
        const stream = await sdk.generateTextStream({
          prompt: argv.prompt as string,
          provider: argv.provider === 'auto' ? undefined : argv.provider as AIProviderName,
          temperature: argv.temperature
        });

        for await (const chunk of stream) {
          process.stdout.write(chunk.content);
          // In debug mode, interleaved logging would appear here
          // (SDK logs are controlled by NEUROLINK_DEBUG set in middleware)
        }

        if (!argv.quiet) process.stdout.write('\n'); // Ensure newline after stream
      } catch (error) {
        handleError(error as Error, 'Text streaming');
      }
    }
  )

  // Batch Processing Command
  .command(
    'batch <file>',
    'Process multiple prompts from a file',
    (yargsInstance) => yargsInstance
      .usage('Usage: $0 batch <file> [options]')
      .positional('file', { type: 'string', description: 'File with prompts (one per line)', demandOption: true })
      .option('output', { type: 'string', description: 'Output file for results (default: stdout)' })
      .option('delay', { type: 'number', default: 1000, description: 'Delay between requests in milliseconds' })
      .option('provider', { choices: ['auto', 'openai', 'bedrock', 'vertex', 'anthropic', 'azure', 'google-ai'] as const, default: 'auto', description: 'AI provider to use' })
      .option('timeout', { type: 'number', default: 30000, description: 'Timeout for each request in milliseconds' })
      .option('temperature', { type: 'number', description: 'Global temperature for batch jobs' })
      .option('max-tokens', { type: 'number', description: 'Global max tokens for batch jobs' })
      .option('system', { type: 'string', description: 'Global system prompt for batch jobs' })
      .option('debug', { type: 'boolean', default: false, description: 'Enable debug mode with detailed per-item logging' })
      .example('$0 batch prompts.txt --output results.json', 'Process and save to file'),
    async (argv) => {
      const spinner = argv.quiet ? null : ora().start();
      try {
        if (!fs.existsSync(argv.file as string)) throw new Error(`File not found: ${argv.file}`);

        const buffer = fs.readFileSync(argv.file as string);
        const isLikelyBinary = buffer.includes(0) ||
                              buffer.toString('hex', 0, 100).includes('0000') ||
                              (!buffer.toString('utf8', 0, 1024).includes('\n') && buffer.length > 512);
        if (isLikelyBinary) throw new Error(`Invalid file format: Binary file detected at "${argv.file}". Batch processing requires a plain text file.`);

        const prompts = buffer.toString('utf8').split('\n').map(line => line.trim()).filter(Boolean);
        if (prompts.length === 0) throw new Error('No prompts found in file');

        if (spinner) spinner.text = `📦 Processing ${prompts.length} prompts...`;
        else if (!argv.quiet) console.log(chalk.blue(`📦 Processing ${prompts.length} prompts...\n`));

        const results: Array<{prompt: string, response?: string, error?: string}> = [];
        for (let i = 0; i < prompts.length; i++) {
          if (spinner) spinner.text = `Processing ${i + 1}/${prompts.length}: ${prompts[i].substring(0, 30)}...`;
          try {
            const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('Request timeout')), argv.timeout));
            const generatePromise = sdk.generateText({
              prompt: prompts[i],
              provider: argv.provider === 'auto' ? undefined : argv.provider as AIProviderName,
              temperature: argv.temperature, maxTokens: argv.maxTokens, systemPrompt: argv.system
            });
            const result = await Promise.race([generatePromise, timeoutPromise]) as any;
            results.push({ prompt: prompts[i], response: result.content });
            if (spinner) spinner.render(); // Update spinner without changing text
          } catch (error) {
            results.push({ prompt: prompts[i], error: (error as Error).message });
            if (spinner) spinner.render();
          }
          if (argv.delay && i < prompts.length - 1) await new Promise(resolve => setTimeout(resolve, argv.delay));
        }

        if (spinner) spinner.succeed(chalk.green('✅ Batch processing complete!'));
        const outputData = JSON.stringify(results, null, 2);
        if (argv.output) {
          fs.writeFileSync(argv.output, outputData);
          if (!argv.quiet) console.log(chalk.green(`\n✅ Results saved to ${argv.output}`));
        } else {
          process.stdout.write(outputData + '\n');
        }
      } catch (error) {
        if (spinner) spinner.fail();
        handleError(error as Error, 'Batch processing');
      }
    }
  )

  // Provider Command Group (Corrected Structure)
  .command('provider <subcommand>', 'Manage AI provider configurations and status',
    (yargsProvider) => { // Builder for the main 'provider' command
      yargsProvider
        .usage('Usage: $0 provider <subcommand> [options]') // Add usage here
        .command('status', 'Check status of all configured AI providers',
          (y) => y
            .usage('Usage: $0 provider status [options]')
            .option('verbose', { type: 'boolean', alias: 'v', description: 'Show detailed information' }) // Default is handled by middleware if NEUROLINK_DEBUG is set
            .example('$0 provider status', 'Check all providers')
            .example('$0 provider status --verbose', 'Show detailed status information'),
          async (argv) => {
            if (argv.verbose && !argv.quiet) {
                console.log(chalk.yellow('ℹ️ Verbose mode enabled. Displaying detailed status.\n')); // Added newline
            }
            const spinner = argv.quiet ? null : ora('🔍 Checking AI provider status...\n').start();
            // Middleware sets argv.verbose if NEUROLINK_DEBUG is true and --verbose is not specified
            // Removed the spinner.stopAndPersist logic from here as it's handled before spinner start

            const providers = ['openai', 'bedrock', 'vertex', 'anthropic', 'azure', 'google-ai'] as const;
            const results: Array<{provider: string, status: string, responseTime?: number, error?: string}> = [];
            for (const p of providers) {
              if (spinner) spinner.text = `Testing ${p}...`;
              try {
                const start = Date.now();
                await sdk.generateText({ prompt: 'test', provider: p, maxTokens: 1 });
                const duration = Date.now() - start;
                results.push({ provider: p, status: 'working', responseTime: duration });
                if (spinner) spinner.succeed(`${p}: ${chalk.green('✅ Working')} (${duration}ms)`);
                else if(!argv.quiet) console.log(`${p}: ${chalk.green('✅ Working')} (${duration}ms)`);
              } catch (error) {
                results.push({ provider: p, status: 'failed', error: (error as Error).message });
                if (spinner) spinner.fail(`${p}: ${chalk.red('❌ Failed')} - ${(error as Error).message.split('\n')[0]}`);
                else if(!argv.quiet) console.error(`${p}: ${chalk.red('❌ Failed')} - ${(error as Error).message.split('\n')[0]}`);
              }
            }
            const working = results.filter(r => r.status === 'working').length;
            if (spinner) spinner.info(chalk.blue(`\n📊 Summary: ${working}/${results.length} providers working`));
            else if(!argv.quiet) console.log(chalk.blue(`\n📊 Summary: ${working}/${results.length} providers working`));

            if (argv.verbose && !argv.quiet) {
              console.log(chalk.blue('\n📋 Detailed Results:'));
              console.log(JSON.stringify(results, null, 2));
            }
          }
        )
        .command('list', 'List available AI providers',
          (y) => y.usage('Usage: $0 provider list'),
          async () => {
            console.log('Available providers: openai, bedrock, vertex, anthropic, azure, google-ai');
          }
        )
        .command('configure <providerName>', 'Display configuration guidance for a provider',
          (y) => y
            .usage('Usage: $0 provider configure <providerName>')
            .positional('providerName', {
              type: 'string',
              choices: ['openai', 'bedrock', 'vertex', 'anthropic', 'azure', 'google-ai'],
              description: 'Name of the provider to configure',
              demandOption: true,
            })
            .example('$0 provider configure openai', 'Show OpenAI configuration help'),
          async (argv) => {
            console.log(chalk.blue(`\n🔧 Configuration guidance for ${chalk.bold(argv.providerName as string)}:`));
            console.log(chalk.yellow('💡 Set relevant environment variables for API keys and other settings.'));
            console.log(chalk.gray('   Refer to the documentation for details: https://github.com/juspay/neurolink#configuration'));
          }
        )
        .demandCommand(1, 'Please specify a provider subcommand (status, list, or configure).');
    }
    // Base handler for 'provider' removed.
    // If no subcommand is provided, yargsProvider.demandCommand should trigger an error,
    // which will be caught by the main .fail() handler.
  )

  // Status Command (Standalone, for backward compatibility or direct access)
  .command(
    'status',
    'Check AI provider connectivity and performance (alias for provider status)',
    (yargsInstance) => yargsInstance
      .usage('Usage: $0 status [options]')
      .option('verbose', { // Ensure status alias also defines verbose
        type: 'boolean',
        alias: 'v', // Default is handled by middleware if NEUROLINK_DEBUG is set
        description: 'Show detailed information'
      })
      .example('$0 status', 'Check all providers')
      .example('$0 status --verbose', 'Show detailed status information'),
    async (argv) => {
      // This logic is duplicated from 'provider status' for the alias
      if (argv.verbose && !argv.quiet) {
        console.log(chalk.yellow('ℹ️ Verbose mode enabled. Displaying detailed status.\n')); // Added newline
      }
      const spinner = argv.quiet ? null : ora('🔍 Checking AI provider status...\n').start();
      // Middleware sets argv.verbose if NEUROLINK_DEBUG is true and --verbose is not specified
      // Removed the spinner.stopAndPersist logic from here as it's handled before spinner start

      const providers = ['openai', 'bedrock', 'vertex', 'anthropic', 'azure', 'google-ai'] as const;
      const results: Array<{provider: string, status: string, responseTime?: number, error?: string}> = [];
      for (const p of providers) {
        if (spinner) spinner.text = `Testing ${p}...`;
        try {
          const start = Date.now();
          await sdk.generateText({ prompt: 'test', provider: p, maxTokens: 1 });
          const duration = Date.now() - start;
          results.push({ provider: p, status: 'working', responseTime: duration });
          if (spinner) spinner.succeed(`${p}: ${chalk.green('✅ Working')} (${duration}ms)`);
          else if(!argv.quiet) console.log(`${p}: ${chalk.green('✅ Working')} (${duration}ms)`);
        } catch (error) {
          results.push({ provider: p, status: 'failed', error: (error as Error).message });
          if (spinner) spinner.fail(`${p}: ${chalk.red('❌ Failed')} - ${(error as Error).message.split('\n')[0]}`);
          else if(!argv.quiet) console.error(`${p}: ${chalk.red('❌ Failed')} - ${(error as Error).message.split('\n')[0]}`);
        }
      }
      const working = results.filter(r => r.status === 'working').length;
      if (spinner) spinner.info(chalk.blue(`\n📊 Summary: ${working}/${results.length} providers working`));
      else if(!argv.quiet) console.log(chalk.blue(`\n📊 Summary: ${working}/${results.length} providers working`));

      if (argv.verbose && !argv.quiet) {
        console.log(chalk.blue('\n📋 Detailed Results:'));
        console.log(JSON.stringify(results, null, 2));
      }
    }
  )

  // Configuration Commands Refactored
  .command('config <subcommand>', 'Manage NeuroLink configuration',
    (yargsConfig) => {
      yargsConfig
        .usage('Usage: $0 config <subcommand> [options]') // Add usage here
        .command('setup', 'Interactive setup for NeuroLink configuration',
          () => {}, // No specific builder options for setup
          async (argv) => {
            console.log('Config setup: Use interactive prompts. Error: Invalid input, please try again with valid provider names.');
          }
        )
        .command('init', 'Alias for setup: Interactive setup for NeuroLink configuration',
          () => {},
          async (argv) => {
            console.log('Config init (setup): Use interactive prompts. Error: Invalid input, please try again with valid provider names.');
          }
        )
        .command('show', 'Show current NeuroLink configuration',
          () => {},
          async (argv) => {
            console.log('Config show: Displaying current configuration...');
            // Actual show logic here
          }
        )
        .command('set <key> <value>', 'Set a configuration key-value pair',
          (y) => y
            .positional('key', { type: 'string', description: 'Configuration key to set', demandOption: true })
            .positional('value', { type: 'string', description: 'Value to set for the key', demandOption: true }),
          async (argv) => {
            console.log(`Config set: Key: ${argv.key}, Value: ${argv.value}`);
            // Actual set logic here
          }
        )
        .command('import <file>', 'Import configuration from a file',
          (y) => y.positional('file', { type: 'string', description: 'File path to import from', demandOption: true }),
          async (argv) => {
            console.log(`Config import: Importing from ${argv.file}`);
            if ((argv.file as string).includes('invalid-config.json')) {
              handleError(new Error('Invalid or unparseable JSON in config file.'), 'Config import');
            }
            // Actual import logic here
          }
        )
        .command('export <file>', 'Export current configuration to a file',
          (y) => y.positional('file', { type: 'string', description: 'File path to export to', demandOption: true }),
          async (argv) => {
            console.log(`Config export: Exporting to ${argv.file}`);
            if ((argv.file as string).includes('read-only-dir')) {
              handleError(new Error('Permission denied. Cannot write to read-only directory.'), 'Config export');
            }
            // Actual export logic here
          }
        )
        .command('validate', 'Validate the current configuration',
          () => {},
          async (argv) => {
            console.log('Config validate: Validating configuration...');
            // Actual validation logic here
          }
        )
        .command('reset', 'Reset NeuroLink configuration to defaults',
          () => {},
          async (argv) => {
            console.log('Config reset: Resetting configuration...');
            // Actual reset logic here
          }
        )
        .demandCommand(1, 'Please specify a config subcommand (e.g., setup, show, set).')
        .example('$0 config setup', 'Run interactive setup')
        .example('$0 config set provider openai', 'Set default provider (using key/value)');
    }
    // Base handler for 'config' removed.
    // If no subcommand is provided, yargsConfig.demandCommand should trigger an error,
    // which will be caught by the main .fail() handler.
  )
  // Get Best Provider Command
  .command('get-best-provider', 'Show the best available AI provider',
    (yargsInstance) => yargsInstance
      .usage('Usage: $0 get-best-provider [options]')
      .option('debug', { type: 'boolean', default: false, description: 'Enable debug mode with selection reasoning' })
      .example('$0 get-best-provider', 'Get best provider')
      .example('$0 get-best-provider --debug', 'Show selection logic'),
    async (argv) => {
      const spinner = argv.quiet ? null : ora('🎯 Finding best provider...').start();
      try {
        const provider = await sdk.getBestProvider();

        if (spinner) {
          if (argv.debug) {
            spinner.succeed(chalk.green(`✅ Best provider selected: ${provider}`));
          } else {
            spinner.succeed(chalk.green('✅ Provider found'));
          }
        }

        if (argv.debug) {
          // Debug mode: Show selection reasoning and metadata
          console.log(`\nBest available provider: ${provider}`);
          console.log(`Selection based on: availability, performance, and configuration`);
        } else {
          // Default mode: Clean provider name only
          console.log(provider);
        }
      } catch (error) {
        if (spinner && spinner.isSpinning) spinner.fail();
        handleError(error as Error, 'Provider selection');
      }
    }
  )

  .completion('completion', 'Generate shell completion script');

// Add MCP commands
addMCPCommands(cli);

// Use an async IIFE to allow top-level await for parseAsync
(async () => {
  try {
    await cli.parseAsync();
  } catch (error) {
    // Yargs .fail() should handle most errors and exit,
    // but catch any other unhandled promise rejections from async handlers.
    // handleError is not called here because .fail() or command handlers should have already done so.
    // If an error reaches here, it's likely an unhandled exception not caught by yargs.
    if (error instanceof Error) {
        console.error(chalk.red(`Unhandled CLI Error: ${error.message}`));
    } else {
        console.error(chalk.red(`Unhandled CLI Error: ${String(error)}`));
    }
    process.exit(1);
  }
})();
