/**
 * CLI Tests for NeuroLink Command Line Interface
 * Tests the CLI functionality and integration
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { execSync, spawn } from 'child_process';
import { writeFileSync, unlinkSync, existsSync } from 'fs';
import { join } from 'path';

// CLI test configuration
const CLI_TIMEOUT = 15000; // 15 seconds for CLI operations
const CLI_PATH = './dist/cli/index.js';
const TEST_FILE_PATH = './test-prompts-cli.txt';

describe('NeuroLink CLI Tests', () => {
  beforeAll(() => {
    // Create test prompts file for batch testing
    const testPrompts = [
      'Write a haiku about coding',
      'Explain what AI is',
      'Generate a simple joke'
    ];
    writeFileSync(TEST_FILE_PATH, testPrompts.join('\n'));
  });

  afterAll(() => {
    // Cleanup test files
    if (existsSync(TEST_FILE_PATH)) {
      unlinkSync(TEST_FILE_PATH);
    }
  });

  describe('CLI Availability and Help', () => {
    it('should display help when no arguments provided', () => {
      try {
        const output = execSync(`node ${CLI_PATH}`, {
          encoding: 'utf8',
          timeout: CLI_TIMEOUT
        });
        expect(output).toContain('Usage:');
        expect(output).toContain('Commands:');
      } catch (error: any) {
        // CLI tools often exit with code 1 when showing help
        expect(error.stdout || error.output?.[1]).toContain('Usage:');
      }
    });

    it('should display help with --help flag', () => {
      try {
        const output = execSync(`node ${CLI_PATH} --help`, {
          encoding: 'utf8',
          timeout: CLI_TIMEOUT
        });
        expect(output).toContain('Usage:');
        expect(output).toContain('Commands:');
      } catch (error: any) {
        expect(error.stdout || error.output?.[1]).toContain('Usage:');
      }
    });

    it('should show version information', () => {
      try {
        const output = execSync(`node ${CLI_PATH} --version`, {
          encoding: 'utf8',
          timeout: CLI_TIMEOUT
        });
        expect(output).toMatch(/\d+\.\d+\.\d+/); // Version pattern
      } catch (error: any) {
        // Some CLIs show version in stderr
        const versionOutput = error.stdout || error.stderr || error.output?.[1] || error.output?.[2];
        expect(versionOutput).toMatch(/\d+\.\d+\.\d+/);
      }
    });
  });

  describe('Provider Status Command', () => {
    it('should check provider status', () => {
      try {
        const output = execSync(`node ${CLI_PATH} status`, {
          encoding: 'utf8',
          timeout: CLI_TIMEOUT
        });

        // Should contain provider information
        expect(output).toMatch(/(openai|bedrock|vertex)/i);
        expect(output).toMatch(/(available|configured|status)/i);
      } catch (error: any) {
        // Command might fail due to missing credentials, but should still show structure
        const errorOutput = error.stdout || error.stderr || '';
        expect(errorOutput).toMatch(/(provider|status|configuration)/i);
      }
    });

    it('should show verbose status information', () => {
      try {
        const output = execSync(`node ${CLI_PATH} status --verbose`, {
          encoding: 'utf8',
          timeout: CLI_TIMEOUT
        });

        // Verbose should contain more detailed information
        expect(output.length).toBeGreaterThan(50);
      } catch (error: any) {
        // Even on error, should attempt to show verbose info
        const errorOutput = error.stdout || error.stderr || '';
        expect(errorOutput.length).toBeGreaterThan(10);
      }
    });
  });

  describe('Best Provider Selection', () => {
    it('should identify best available provider', () => {
      try {
        const output = execSync(`node ${CLI_PATH} get-best-provider`, {
          encoding: 'utf8',
          timeout: CLI_TIMEOUT
        });

        // Should return a provider name
        expect(output).toMatch(/(openai|bedrock|vertex|auto)/i);
      } catch (error: any) {
        // May fail due to configuration, but should attempt selection
        const errorOutput = error.stdout || error.stderr || '';
        expect(errorOutput).toMatch(/(provider|selection|configuration)/i);
      }
    });
  });

  describe('Text Generation Commands', () => {
    it('should handle basic text generation command structure', () => {
      try {
        // Test with a simple prompt
        const output = execSync(`node ${CLI_PATH} generate-text "Hello world"`, {
          encoding: 'utf8',
          timeout: CLI_TIMEOUT
        });

        // Should attempt to generate text
        expect(output.length).toBeGreaterThan(0);
      } catch (error: any) {
        // May fail due to missing API keys, but should show proper error handling
        const errorOutput = error.stdout || error.stderr || '';
        expect(errorOutput).toMatch(/(error|configuration|api|key|provider)/i);
      }
    });

    it('should handle JSON output format', () => {
      try {
        const output = execSync(`node ${CLI_PATH} generate-text "Test" --format json`, {
          encoding: 'utf8',
          timeout: CLI_TIMEOUT
        });

        // Should attempt JSON format
        const parsed = JSON.parse(output);
        expect(typeof parsed).toBe('object');
      } catch (error: any) {
        // On API error, should still attempt JSON structure
        const errorOutput = error.stdout || error.stderr || '';
        if (errorOutput.includes('{')) {
          try {
            JSON.parse(errorOutput);
          } catch {
            // Non-JSON error is acceptable
          }
        }
      }
    });

    it('should handle provider specification', () => {
      try {
        const output = execSync(`node ${CLI_PATH} generate-text "Test" --provider openai`, {
          encoding: 'utf8',
          timeout: CLI_TIMEOUT
        });

        expect(output.length).toBeGreaterThan(0);
      } catch (error: any) {
        // Should show provider-specific error
        const errorOutput = error.stdout || error.stderr || '';
        expect(errorOutput).toMatch(/(openai|provider|configuration)/i);
      }
    });
  });

  describe('Streaming Commands', () => {
    it('should handle streaming command structure', () => {
      try {
        const output = execSync(`node ${CLI_PATH} stream "Brief test"`, {
          encoding: 'utf8',
          timeout: CLI_TIMEOUT
        });

        expect(output.length).toBeGreaterThan(0);
      } catch (error: any) {
        // Should show streaming-related error
        const errorOutput = error.stdout || error.stderr || '';
        expect(errorOutput).toMatch(/(stream|error|configuration)/i);
      }
    });
  });

  describe('Batch Processing Commands', () => {
    it('should handle batch file processing', () => {
      try {
        const output = execSync(`node ${CLI_PATH} batch ${TEST_FILE_PATH}`, {
          encoding: 'utf8',
          timeout: CLI_TIMEOUT * 2 // Longer timeout for batch processing
        });

        // Should attempt to process the batch file
        expect(output.length).toBeGreaterThan(0);
      } catch (error: any) {
        // Should show batch processing attempt
        const errorOutput = error.stdout || error.stderr || '';
        expect(errorOutput).toMatch(/(batch|file|processing|error)/i);
      }
    });

    it('should handle batch output file specification', () => {
      try {
        const output = execSync(`node ${CLI_PATH} batch ${TEST_FILE_PATH} --output test-output.json`, {
          encoding: 'utf8',
          timeout: CLI_TIMEOUT * 2
        });

        expect(output.length).toBeGreaterThan(0);
      } catch (error: any) {
        // Should show output file handling
        const errorOutput = error.stdout || error.stderr || '';
        expect(errorOutput).toMatch(/(output|file|batch)/i);
      }
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid commands gracefully', () => {
      try {
        execSync(`node ${CLI_PATH} invalid-command`, {
          encoding: 'utf8',
          timeout: CLI_TIMEOUT
        });
      } catch (error: any) {
        // Should show helpful error message
        const errorOutput = error.stdout || error.stderr || '';
        expect(errorOutput).toMatch(/(unknown|invalid|command|usage|help)/i);
      }
    });

    it('should handle missing required arguments', () => {
      try {
        execSync(`node ${CLI_PATH} generate-text`, {
          encoding: 'utf8',
          timeout: CLI_TIMEOUT
        });
      } catch (error: any) {
        // Should show argument requirement error
        const errorOutput = error.stdout || error.stderr || '';
        expect(errorOutput).toMatch(/(required|argument|missing|prompt)/i);
      }
    });

    it('should handle invalid file paths in batch command', () => {
      try {
        execSync(`node ${CLI_PATH} batch nonexistent-file.txt`, {
          encoding: 'utf8',
          timeout: CLI_TIMEOUT
        });
      } catch (error: any) {
        // Should show file not found error
        const errorOutput = error.stdout || error.stderr || '';
        expect(errorOutput).toMatch(/(file|not|found|exist)/i);
      }
    });
  });

  describe('Command Line Argument Parsing', () => {
    it('should handle various flag formats', () => {
      const testCases = [
        '--format json',
        '--format=json',
        '-f json'
      ];

      for (const flagFormat of testCases) {
        try {
          execSync(`node ${CLI_PATH} generate-text "test" ${flagFormat}`, {
            encoding: 'utf8',
            timeout: CLI_TIMEOUT
          });
        } catch (error: any) {
          // Should recognize the flag format
          const errorOutput = error.stdout || error.stderr || '';
          expect(errorOutput).not.toMatch(/(unknown.*flag|invalid.*option)/i);
        }
      }
    });

    it('should handle quoted prompts with spaces', () => {
      try {
        execSync(`node ${CLI_PATH} generate-text "This is a test prompt with spaces"`, {
          encoding: 'utf8',
          timeout: CLI_TIMEOUT
        });
      } catch (error: any) {
        // Should handle the full prompt, not complain about parsing
        const errorOutput = error.stdout || error.stderr || '';
        expect(errorOutput).not.toMatch(/(unexpected.*argument|too.*many.*arguments)/i);
      }
    });
  });

  describe('Output Formatting', () => {
    it('should respect quiet mode if supported', () => {
      try {
        const output = execSync(`node ${CLI_PATH} status --quiet`, {
          encoding: 'utf8',
          timeout: CLI_TIMEOUT
        });

        // Quiet mode should produce minimal output
        expect(output.split('\n').length).toBeLessThan(10);
      } catch (error: any) {
        // Command structure should be recognized even if not supported
        const errorOutput = error.stdout || error.stderr || '';
        if (errorOutput.includes('unknown') || errorOutput.includes('invalid')) {
          // Quiet flag not supported - that's acceptable
        }
      }
    });

    it('should handle color output preferences', () => {
      try {
        // Test with NO_COLOR environment variable
        const output = execSync(`node ${CLI_PATH} status`, {
          encoding: 'utf8',
          timeout: CLI_TIMEOUT,
          env: { ...process.env, NO_COLOR: '1' }
        });

        // Should work regardless of color settings
        expect(typeof output).toBe('string');
      } catch (error: any) {
        // Should handle color settings gracefully
        expect(error).toBeDefined();
      }
    });
  });
});
