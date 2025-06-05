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
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import ora from 'ora';
import chalk from 'chalk';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

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
  console.error(chalk.red(`❌ ${context} failed: ${error.message}`));

  // Smart hints for common errors (just string matching!)
  if (error.message.includes('API key')) {
    console.error(chalk.yellow('💡 Set API key: export OPENAI_API_KEY=sk-...'));
    console.error(chalk.yellow('💡 Or set: export AWS_REGION=us-east-1'));
    console.error(chalk.yellow('💡 Or set: export GOOGLE_APPLICATION_CREDENTIALS=/path/to/key.json'));
  }

  if (error.message.includes('rate limit')) {
    console.error(chalk.yellow('💡 Try again in a few moments or use --provider vertex'));
  }

  if (error.message.includes('not authorized')) {
    console.error(chalk.yellow('💡 Check your account permissions for the selected model'));
    console.error(chalk.yellow('💡 For AWS Bedrock: Use inference profile ARNs'));
  }

  process.exit(1);
}

function validateConfig(): void {
  const hasOpenAI = !!process.env.OPENAI_API_KEY;
  const hasAWS = !!(process.env.AWS_REGION || process.env.AWS_ACCESS_KEY_ID);
  const hasGoogle = !!(process.env.GOOGLE_APPLICATION_CREDENTIALS || process.env.GOOGLE_SERVICE_ACCOUNT_KEY);

  if (!hasOpenAI && !hasAWS && !hasGoogle) {
    console.error(chalk.red('⚠️  No AI provider credentials found'));
    console.error(chalk.yellow('💡 Set one of:'));
    console.error(chalk.yellow('   • OPENAI_API_KEY=sk-...'));
    console.error(chalk.yellow('   • AWS_REGION=us-east-1 (+ AWS credentials)'));
    console.error(chalk.yellow('   • GOOGLE_APPLICATION_CREDENTIALS=/path/to/key.json'));
    console.error(chalk.blue('\n📚 See: https://github.com/juspay/neurolink#setup'));
    process.exit(1);
  }
}

// Initialize SDK
const sdk = new NeuroLink();

// Enhanced CLI with Professional UX
const cli = yargs(hideBin(process.argv))
  .scriptName('neurolink')
  .usage(chalk.blue('🧠 $0 <command> [options]'))
  .middleware([validateConfig])
  .version()
  .help()
  .strict()
  .demandCommand(1, chalk.red('❌ Specify a command'))
  .epilogue(chalk.blue('💡 For more info: https://github.com/juspay/neurolink'))

  // Generate Text Command - Core functionality with professional UX
  .command(
    'generate-text <prompt>',
    'Generate text using AI providers',
    (yargs) => yargs
      .positional('prompt', {
        type: 'string',
        description: 'Text prompt for AI generation'
      })
      .option('provider', {
        choices: ['auto', 'openai', 'bedrock', 'vertex'] as const,
        default: 'auto',
        description: 'AI provider to use (auto-selects best available)'
      })
      .option('temperature', {
        type: 'number',
        default: 0.7,
        description: 'Creativity level (0.0 = focused, 1.0 = creative)'
      })
      .option('max-tokens', {
        type: 'number',
        default: 500,
        description: 'Maximum tokens to generate'
      })
      .option('format', {
        choices: ['text', 'json'] as const,
        default: 'text',
        description: 'Output format'
      })
      .example('$0 generate-text "Hello world"', 'Basic text generation')
      .example('$0 generate-text "Write a story" --provider openai', 'Use specific provider')
      .example('$0 generate-text "Technical doc" --format json', 'Get JSON output'),
    async (argv) => {
      const spinner = ora('🤖 Generating text...').start();

      try {
        if (!argv.prompt) {
          throw new Error('Prompt is required');
        }

        const result = await sdk.generateText({
          prompt: argv.prompt,
          provider: argv.provider === 'auto' ? undefined : argv.provider as 'openai' | 'bedrock' | 'vertex',
          temperature: argv.temperature,
          maxTokens: argv.maxTokens
        });

        spinner.succeed(chalk.green('✅ Text generated successfully!'));
        console.log(formatOutput(result, argv.format));

        // Show usage info for text format
        if (argv.format === 'text' && result.usage) {
          console.log(chalk.blue(`ℹ️  ${result.usage.totalTokens} tokens used`));
        }
      } catch (error) {
        spinner.fail();
        handleError(error as Error, 'Text generation');
      }
    }
  )

  // Stream Text Command - Real-time generation
  .command(
    'stream <prompt>',
    'Stream text generation in real-time',
    (yargs) => yargs
      .positional('prompt', {
        type: 'string',
        description: 'Text prompt for streaming'
      })
      .option('provider', {
        choices: ['auto', 'openai', 'bedrock', 'vertex'] as const,
        default: 'auto',
        description: 'AI provider to use'
      })
      .option('temperature', {
        type: 'number',
        default: 0.7,
        description: 'Creativity level'
      })
      .example('$0 stream "Tell me a story"', 'Stream a story in real-time')
      .example('$0 stream "Explain AI" --provider vertex', 'Stream with specific provider'),
    async (argv) => {
      console.log(chalk.blue(`🔄 Streaming from ${argv.provider} provider...\n`));

      try {
        if (!argv.prompt) {
          throw new Error('Prompt is required');
        }

        const stream = await sdk.generateTextStream({
          prompt: argv.prompt,
          provider: argv.provider === 'auto' ? undefined : argv.provider as 'openai' | 'bedrock' | 'vertex',
          temperature: argv.temperature
        });

        for await (const chunk of stream) {
          process.stdout.write(chunk.content);
        }
        console.log('\n');
      } catch (error) {
        handleError(error as Error, 'Text streaming');
      }
    }
  )

  // Batch Processing Command - Power user feature with simple implementation
  .command(
    'batch <file>',
    'Process multiple prompts from a file',
    (yargs) => yargs
      .positional('file', {
        type: 'string',
        description: 'File with prompts (one per line)'
      })
      .option('output', {
        type: 'string',
        description: 'Output file for results (default: stdout)'
      })
      .option('delay', {
        type: 'number',
        default: 1000,
        description: 'Delay between requests in milliseconds'
      })
      .option('provider', {
        choices: ['auto', 'openai', 'bedrock', 'vertex'] as const,
        default: 'auto',
        description: 'AI provider to use'
      })
      .example('$0 batch prompts.txt', 'Process prompts from file')
      .example('$0 batch prompts.txt --output results.json', 'Save results to file')
      .example('$0 batch prompts.txt --delay 2000', 'Add 2s delay between requests'),
    async (argv) => {
      try {
        // Validate file argument
        if (!argv.file) {
          throw new Error('File path is required');
        }

        // Read and validate input file
        if (!fs.existsSync(argv.file)) {
          throw new Error(`File not found: ${argv.file}`);
        }

        const prompts = fs.readFileSync(argv.file, 'utf8')
          .split('\n')
          .map(line => line.trim())
          .filter(Boolean);

        if (prompts.length === 0) {
          throw new Error('No prompts found in file');
        }

        const results: Array<{prompt: string, response?: string, error?: string}> = [];

        console.log(chalk.blue(`📦 Processing ${prompts.length} prompts...\n`));

        // Sequential processing with progress tracking
        for (let i = 0; i < prompts.length; i++) {
          const spinner = ora(`Processing ${i + 1}/${prompts.length}: ${prompts[i].substring(0, 50)}...`).start();

          try {
            const result = await sdk.generateText({
              prompt: prompts[i],
              provider: argv.provider === 'auto' ? undefined : argv.provider as 'openai' | 'bedrock' | 'vertex'
            });

            results.push({
              prompt: prompts[i],
              response: result.content
            });

            spinner.succeed(`${i + 1}/${prompts.length} completed`);
          } catch (error) {
            results.push({
              prompt: prompts[i],
              error: (error as Error).message
            });

            spinner.fail(`${i + 1}/${prompts.length} failed: ${(error as Error).message}`);
          }

          // Add delay between requests (except for last one)
          if (argv.delay && i < prompts.length - 1) {
            await new Promise(resolve => setTimeout(resolve, argv.delay));
          }
        }

        // Output results
        const output = JSON.stringify(results, null, 2);

        if (argv.output) {
          fs.writeFileSync(argv.output, output);
          console.log(chalk.green(`\n✅ Results saved to ${argv.output}`));
        } else {
          console.log('\n' + output);
        }

      } catch (error) {
        handleError(error as Error, 'Batch processing');
      }
    }
  )

  // Provider Status Command - Testing and diagnostics
  .command(
    'status',
    'Check AI provider connectivity and performance',
    (yargs) => yargs
      .option('verbose', {
        type: 'boolean',
        default: false,
        alias: 'v',
        description: 'Show detailed information'
      })
      .example('$0 status', 'Check all providers')
      .example('$0 status --verbose', 'Show detailed status information'),
    async (argv) => {
      console.log(chalk.blue('🔍 Checking AI provider status...\n'));

      const providers = ['openai', 'bedrock', 'vertex'] as const;
      const results: Array<{provider: string, status: string, responseTime?: number, error?: string}> = [];

      for (const provider of providers) {
        const spinner = ora(`Testing ${provider}`).start();

        try {
          const start = Date.now();
          await sdk.generateText({
            prompt: 'test',
            provider,
            maxTokens: 1
          });
          const duration = Date.now() - start;

          results.push({
            provider,
            status: 'working',
            responseTime: duration
          });

          spinner.succeed(`${provider}: ${chalk.green('✅ Working')} (${duration}ms)`);
        } catch (error) {
          results.push({
            provider,
            status: 'failed',
            error: (error as Error).message
          });

          spinner.fail(`${provider}: ${chalk.red('❌ Failed')} - ${(error as Error).message}`);
        }
      }

      // Show summary
      const working = results.filter(r => r.status === 'working').length;
      const total = results.length;

      console.log(chalk.blue(`\n📊 Summary: ${working}/${total} providers working`));

      if (argv.verbose) {
        console.log(chalk.blue('\n📋 Detailed Results:'));
        console.log(JSON.stringify(results, null, 2));
      }
    }
  )

  // Get Best Provider Command - Auto-selection testing
  .command(
    'get-best-provider',
    'Show the best available AI provider',
    () => {},
    async () => {
      const spinner = ora('🎯 Finding best provider...').start();

      try {
        const provider = await sdk.getBestProvider();
        spinner.succeed(chalk.green(`✅ Best provider: ${provider}`));
      } catch (error) {
        spinner.fail();
        handleError(error as Error, 'Provider selection');
      }
    }
  );

// Execute CLI
cli.parse();
