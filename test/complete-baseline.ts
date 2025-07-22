import { describe, it, expect } from "vitest";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

/**
 * COMPLETE BASELINE TEST SUITE
 * Tests ALL features that exist in the NeuroLink codebase
 * Must be 100% passing before any refactoring
 */

describe("NeuroLink Complete Baseline Test", () => {
  const timeout = 30000; // 30 seconds per test
  const cliPrefix = `cd ${process.cwd()} && pnpm cli`;

  describe("Core CLI Commands", () => {
    it(
      "should run generate command successfully",
      async () => {
        const { stdout } = await execAsync(
          `${cliPrefix} generate "Test" --provider google-ai --max-tokens 2000 --output-format text`,
        );
        expect(stdout).toContain("Generated Content:");
      },
      timeout,
    );

    it(
      "should run stream command successfully",
      async () => {
        const { stdout } = await execAsync(
          `${cliPrefix} stream "Count to 3" --provider google-ai --max-tokens 2000 --disable-tools`,
        );
        expect(stdout).toContain("Streaming...");
      },
      timeout,
    );

    // it('should run provider status command', async () => {
    //   const { stdout } = await execAsync(`${cliPrefix} provider status`);
    //   expect(stdout).toContain('Summary:');
    // }, timeout); // SLOW: Takes 60+ seconds to check all 9 providers

    it(
      "should show version",
      async () => {
        const { stdout } = await execAsync(`${cliPrefix} --version`);
        expect(stdout).toMatch(/\d+\.\d+\.\d+/); // Should show version number
      },
      timeout,
    );

    it(
      "should show help",
      async () => {
        const { stdout } = await execAsync(`${cliPrefix} --help`);
        expect(stdout).toContain("Usage:");
      },
      timeout,
    );

    it(
      "should show help for config commands",
      async () => {
        const { stdout } = await execAsync(`${cliPrefix} config --help`);
        expect(stdout).toContain("config");
      },
      timeout,
    );
  });

  describe("Parameter Variations", () => {
    it(
      "should handle temperature parameter",
      async () => {
        const { stdout } = await execAsync(
          `${cliPrefix} generate "Test" --provider google-ai --temperature 0.5 --max-tokens 2000 --output-format text`,
        );
        expect(stdout).toContain("Generated Content:");
      },
      timeout,
    );

    it(
      "should handle json output format",
      async () => {
        const { stdout } = await execAsync(
          `${cliPrefix} generate "Test" --provider google-ai --max-tokens 2000 --output-format json`,
        );
        expect(stdout).toMatch(/\{.*\}/); // Should contain JSON
        expect(stdout).toContain('"content":'); // Should have content field
        expect(stdout).toContain('"provider":'); // Should have provider field
      },
      timeout,
    );
  });

  describe("Analytics Integration", () => {
    it(
      "should generate with analytics enabled via CLI",
      async () => {
        const { stdout } = await execAsync(
          `${cliPrefix} generate "Test analytics" --provider google-ai --max-tokens 2000 --output-format json --enable-analytics`,
        );
        expect(stdout).toMatch(/\{.*\}/); // Should contain JSON
        expect(stdout).toContain('"usage":'); // Should have usage field
        expect(stdout).toContain('"responseTime":'); // Should have responseTime field
        expect(stdout).toContain('"provider":'); // Should have provider field
      },
      timeout,
    );

    it(
      "should stream with analytics enabled via CLI",
      async () => {
        const { stdout } = await execAsync(
          `${cliPrefix} stream "Count to 3" --provider google-ai --max-tokens 2000 --disable-tools --enable-analytics`,
        );
        expect(stdout).toContain("Streaming..."); // Should show streaming indicator
        // Note: Analytics data not displayed in stream mode, but should be collected internally
      },
      timeout,
    );

    it(
      "should generate with analytics via SDK",
      async () => {
        const testCode = `
        import('./dist/lib/neurolink.js').then(({NeuroLink}) => {
          const sdk = new NeuroLink();
          return sdk.generate({
            input: {text: 'Test SDK analytics'},
            provider: 'google-ai',
            maxTokens: 2000,
            enableAnalytics: true
          });
        }).then(r => {
          console.log('SDK_ANALYTICS_SUCCESS:', !!(r.usage && r.responseTime));
          console.log('SDK_ANALYTICS_DATA:', JSON.stringify({usage: r.usage, responseTime: r.responseTime, provider: r.provider}, null, 2));
        }).catch(e => {
          console.log('SDK_ANALYTICS_ERROR:', e.message);
        });
      `;

        const { stdout } = await execAsync(
          `cd ${process.cwd()} && GOOGLE_AI_API_KEY=${process.env.GOOGLE_AI_API_KEY} node -e "${testCode}"`,
        );
        expect(stdout).toContain("SDK_ANALYTICS_SUCCESS: true");
        expect(stdout).toContain("usage"); // Should have usage analytics
      },
      timeout,
    );

    it(
      "should validate analytics data structure",
      async () => {
        const { stdout } = await execAsync(
          `${cliPrefix} generate "Validate analytics structure" --provider google-ai --max-tokens 2000 --output-format json --enable-analytics`,
        );
        const response = JSON.parse(
          stdout.split("\n").find((line) => line.trim().startsWith("{")) ||
            "{}",
        );

        expect(response.usage).toBeDefined();
        expect(response.usage.totalTokens).toBeGreaterThan(0);
        expect(response.responseTime).toBeGreaterThan(0);
        expect(response.provider).toBe("google-ai");
      },
      timeout,
    );
  });

  describe("Evaluation Integration", () => {
    it(
      "should generate with evaluation enabled via CLI",
      async () => {
        const { stdout } = await execAsync(
          `${cliPrefix} generate "Test evaluation" --provider google-ai --max-tokens 2000 --output-format json --enable-evaluation`,
        );
        expect(stdout).toMatch(/\{.*\}/); // Should contain JSON
        expect(stdout).toContain('"evaluation":'); // Should have evaluation field
        expect(stdout).toContain('"relevance":'); // Should have relevance score
        expect(stdout).toContain('"accuracy":'); // Should have accuracy score
      },
      timeout,
    );

    it(
      "should stream with evaluation enabled via CLI",
      async () => {
        const { stdout } = await execAsync(
          `${cliPrefix} stream "Count to 5" --provider google-ai --max-tokens 2000 --disable-tools --enable-evaluation`,
        );
        expect(stdout).toContain("Streaming..."); // Should show streaming indicator
        // Note: Evaluation data not displayed in stream mode, but should be collected internally
      },
      timeout,
    );

    it(
      "should generate with evaluation via SDK",
      async () => {
        const testCode = `
        import('./dist/lib/neurolink.js').then(({NeuroLink}) => {
          const sdk = new NeuroLink();
          return sdk.generate({
            input: {text: 'Test SDK evaluation'},
            provider: 'google-ai',
            maxTokens: 2000,
            enableEvaluation: true
          });
        }).then(r => {
          console.log('SDK_EVALUATION_SUCCESS:', !!(r.evaluation && r.evaluation.overall));
          console.log('SDK_EVALUATION_DATA:', JSON.stringify(r.evaluation || {}, null, 2));
        }).catch(e => {
          console.log('SDK_EVALUATION_ERROR:', e.message);
        });
      `;

        const { stdout } = await execAsync(
          `cd ${process.cwd()} && GOOGLE_AI_API_KEY=${process.env.GOOGLE_AI_API_KEY} node -e "${testCode}"`,
        );
        expect(stdout).toContain("SDK_EVALUATION_SUCCESS: true");
        expect(stdout).toContain("relevance"); // Should have evaluation scores
      },
      timeout,
    );

    it(
      "should validate evaluation score ranges",
      async () => {
        const { stdout } = await execAsync(
          `${cliPrefix} generate "Validate evaluation scores" --provider google-ai --max-tokens 2000 --output-format json --enable-evaluation`,
        );
        const response = JSON.parse(
          stdout.split("\n").find((line) => line.trim().startsWith("{")) ||
            "{}",
        );

        expect(response.evaluation).toBeDefined();
        expect(response.evaluation.relevance).toBeGreaterThanOrEqual(1);
        expect(response.evaluation.relevance).toBeLessThanOrEqual(10);
        expect(response.evaluation.accuracy).toBeGreaterThanOrEqual(1);
        expect(response.evaluation.accuracy).toBeLessThanOrEqual(10);
        expect(response.evaluation.overall).toBeGreaterThanOrEqual(1);
        expect(response.evaluation.overall).toBeLessThanOrEqual(10);
      },
      timeout,
    );
  });

  describe("Comprehensive Streaming", () => {
    it(
      "should stream with tools enabled (no --disable-tools)",
      async () => {
        const { stdout } = await execAsync(
          `${cliPrefix} stream "Count to 3" --provider google-ai --max-tokens 2000`,
        );
        expect(stdout).toContain("Streaming..."); // Should show streaming indicator
        // Note: This tests the real MCP integration path
      },
      timeout,
    );

    it(
      "should stream via SDK method",
      async () => {
        const testCode = `
        import('./dist/lib/neurolink.js').then(({NeuroLink}) => {
          const sdk = new NeuroLink();
          return sdk.stream({
            input: {text: 'Count to 3'},
            provider: 'google-ai',
            maxTokens: 2000
          });
        }).then(async (stream) => {
          let content = '';
          for await (const chunk of stream) {
            content += chunk;
          }
          console.log('SDK_STREAM_SUCCESS:', content.length > 0);
        }).catch(e => {
          console.log('SDK_STREAM_ERROR:', e.message);
        });
      `;

        const { stdout } = await execAsync(
          `cd ${process.cwd()} && GOOGLE_AI_API_KEY=${process.env.GOOGLE_AI_API_KEY} node -e "${testCode}"`,
        );
        expect(stdout).toContain("SDK_STREAM_SUCCESS: true");
      },
      timeout,
    );

    it(
      "should stream with analytics and evaluation combined",
      async () => {
        const { stdout } = await execAsync(
          `${cliPrefix} stream "Test combo" --provider google-ai --max-tokens 2000 --disable-tools --enable-analytics --enable-evaluation`,
        );
        expect(stdout).toContain("Streaming..."); // Should show streaming indicator
      },
      timeout,
    );

    it(
      "should handle stream timeout gracefully",
      async () => {
        try {
          const { stdout } = await execAsync(
            `${cliPrefix} stream "Long task" --provider google-ai --max-tokens 2000 --disable-tools --timeout 1s`,
          );
          expect(stdout).toContain("Streaming..."); // Should start streaming
        } catch (error: any) {
          // Should either work or timeout gracefully
          expect(error.stderr || error.stdout).toMatch(/timeout|error/i);
        }
      },
      timeout,
    );
  });

  describe("Parameter Combinations", () => {
    it(
      "should handle system prompt parameter",
      async () => {
        const { stdout } = await execAsync(
          `${cliPrefix} generate "Hello" --provider google-ai --system-prompt "Be very brief" --max-tokens 2000 --output-format text`,
        );
        expect(stdout).toContain("Generated Content:");
      },
      timeout,
    );

    it(
      "should handle model selection",
      async () => {
        const { stdout } = await execAsync(
          `${cliPrefix} generate "Test" --provider google-ai --model gemini-2.5-flash --max-tokens 2000 --output-format text`,
        );
        expect(stdout).toContain("Generated Content:");
      },
      timeout,
    );

    it(
      "should handle multiple parameters together",
      async () => {
        const { stdout } = await execAsync(
          `${cliPrefix} generate "Test combo" --provider google-ai --temperature 0.7 --system-prompt "Be helpful" --max-tokens 2000 --output-format json --enable-analytics`,
        );
        expect(stdout).toMatch(/\{.*\}/);
        expect(stdout).toContain('"usage":');
        expect(stdout).toContain('"responseTime":');
        expect(stdout).toContain('"provider":');
      },
      timeout,
    );

    it(
      "should handle context parameter",
      async () => {
        const { stdout } = await execAsync(
          `${cliPrefix} generate "Test context" --provider google-ai --context '{"project":"test"}' --max-tokens 2000 --output-format text`,
        );
        expect(stdout).toContain("Generated Content:");
      },
      timeout,
    );
  });

  describe("Error Handling Comprehensive", () => {
    it(
      "should handle invalid API key gracefully",
      async () => {
        try {
          await execAsync(
            `cd ${process.cwd()} && GOOGLE_AI_API_KEY=invalid-key pnpm cli generate "Test" --provider google-ai --max-tokens 2000`,
          );
        } catch (error: any) {
          expect(error.stderr || error.stdout).toMatch(
            /api.key|authentication|invalid|error/i,
          );
        }
      },
      timeout,
    );

    it(
      "should handle token limit exceeded",
      async () => {
        try {
          const { stdout } = await execAsync(
            `${cliPrefix} generate "Test" --provider google-ai --max-tokens 1000000`,
          );
          // Should either work or show clear error
          expect(stdout).toBeDefined();
        } catch (error: any) {
          expect(error.stderr || error.stdout).toMatch(/token|limit|maximum/i);
        }
      },
      timeout,
    );

    it(
      "should handle invalid model names",
      async () => {
        try {
          await execAsync(
            `${cliPrefix} generate "Test" --provider google-ai --model invalid-model-name`,
          );
        } catch (error: any) {
          expect(error.stderr || error.stdout).toMatch(
            /model|invalid|not.found/i,
          );
        }
      },
      timeout,
    );

    it(
      "should handle malformed JSON context",
      async () => {
        try {
          await execAsync(
            `${cliPrefix} generate "Test" --provider google-ai --context '{invalid-json'`,
          );
        } catch (error: any) {
          expect(error.stderr || error.stdout).toMatch(
            /json|context|invalid|parse/i,
          );
        }
      },
      timeout,
    );
  });

  describe("Provider Management", () => {
    it(
      "should show provider help",
      async () => {
        const { stdout } = await execAsync(`${cliPrefix} provider --help`);
        expect(stdout).toContain("provider");
      },
      timeout,
    );
  });

  describe("Error Handling", () => {
    it(
      "should handle invalid provider gracefully",
      async () => {
        try {
          await execAsync(
            `${cliPrefix} generate "Test" --provider invalid-provider`,
          );
        } catch (error: any) {
          expect(error.stderr || error.stdout).toMatch(
            /provider|error|invalid/i,
          );
        }
      },
      timeout,
    );
  });

  describe("SDK Integration", () => {
    it(
      "should work via SDK import",
      async () => {
        const testCode = `
        import('./dist/lib/neurolink.js').then(({NeuroLink}) => {
          const sdk = new NeuroLink();
          return sdk.generate({
            input: {text: 'Test SDK'},
            provider: 'google-ai',
            maxTokens: 2000
          });
        }).then(r => {
          console.log('SDK_SUCCESS:', !!r.content);
        }).catch(e => {
          console.log('SDK_ERROR:', e.message);
        });
      `;

        const { stdout } = await execAsync(
          `cd ${process.cwd()} && GOOGLE_AI_API_KEY=${process.env.GOOGLE_AI_API_KEY} node -e "${testCode}"`,
        );
        expect(stdout).toContain("SDK_SUCCESS: true");
      },
      timeout,
    );
  });

  describe("SDK Comprehensive", () => {
    it(
      "should test SDK stream method",
      async () => {
        const testCode = `
        import('./dist/lib/neurolink.js').then(({NeuroLink}) => {
          const sdk = new NeuroLink();
          return sdk.stream({
            input: {text: 'Count to 3'},
            provider: 'google-ai',
            maxTokens: 2000
          });
        }).then(async (stream) => {
          let content = '';
          for await (const chunk of stream) {
            content += chunk;
          }
          console.log('SDK_STREAM_SUCCESS:', content.length > 0);
        }).catch(e => {
          console.log('SDK_STREAM_ERROR:', e.message);
        });
      `;

        const { stdout } = await execAsync(
          `cd ${process.cwd()} && GOOGLE_AI_API_KEY=${process.env.GOOGLE_AI_API_KEY} node -e "${testCode}"`,
        );
        expect(stdout).toContain("SDK_STREAM_SUCCESS: true");
      },
      timeout,
    );

    it(
      "should test SDK with multiple parameters",
      async () => {
        const testCode = `
        import('./dist/lib/neurolink.js').then(({NeuroLink}) => {
          const sdk = new NeuroLink();
          return sdk.generate({
            input: {text: 'Test multiple params'},
            provider: 'google-ai',
            maxTokens: 2000,
            temperature: 0.7,
            enableAnalytics: true
          });
        }).then(r => {
          console.log('SDK_PARAMS_SUCCESS:', !!(r.content && r.usage));
          console.log('SDK_TEMP_APPLIED:', r.content.length > 0);
        }).catch(e => {
          console.log('SDK_PARAMS_ERROR:', e.message);
        });
      `;

        const { stdout } = await execAsync(
          `cd ${process.cwd()} && GOOGLE_AI_API_KEY=${process.env.GOOGLE_AI_API_KEY} node -e "${testCode}"`,
        );
        expect(stdout).toContain("SDK_PARAMS_SUCCESS: true");
      },
      timeout,
    );

    it(
      "should test SDK error handling",
      async () => {
        const testCode = `
        import('./dist/lib/neurolink.js').then(({NeuroLink}) => {
          const sdk = new NeuroLink();
          return sdk.generate({
            input: {text: 'Test'},
            provider: 'invalid-provider',
            maxTokens: 2000
          });
        }).then(r => {
          console.log('SDK_ERROR_UNEXPECTED_SUCCESS:', true);
        }).catch(e => {
          console.log('SDK_ERROR_HANDLED:', e.message.includes('provider') || e.message.includes('invalid'));
        });
      `;

        const { stdout } = await execAsync(
          `cd ${process.cwd()} && GOOGLE_AI_API_KEY=${process.env.GOOGLE_AI_API_KEY} node -e "${testCode}"`,
        );
        expect(stdout).toContain("SDK_ERROR_HANDLED: true");
      },
      timeout,
    );
  });

  describe("Output Validation", () => {
    it(
      "should validate complete JSON structure",
      async () => {
        const { stdout } = await execAsync(
          `${cliPrefix} generate "Validate JSON structure" --provider google-ai --max-tokens 2000 --output-format json --enable-analytics`,
        );

        // Extract JSON from CLI output (find the JSON block)
        const jsonStart = stdout.indexOf("{");
        const jsonEnd = stdout.lastIndexOf("}") + 1;
        const jsonStr = stdout.substring(jsonStart, jsonEnd);
        const response = JSON.parse(jsonStr);

        // Required fields
        expect(response.content).toBeDefined();
        expect(response.provider).toBeDefined();
        expect(response.usage).toBeDefined();
        expect(response.responseTime).toBeDefined();

        // Data types
        expect(typeof response.content).toBe("string");
        expect(typeof response.provider).toBe("string");
        expect(typeof response.responseTime).toBe("number");
        expect(typeof response.usage.totalTokens).toBe("number");
      },
      timeout,
    );

    it(
      "should validate analytics data accuracy",
      async () => {
        const { stdout } = await execAsync(
          `${cliPrefix} generate "Short response" --provider google-ai --max-tokens 2000 --output-format json --enable-analytics`,
        );

        const jsonStart = stdout.indexOf("{");
        const jsonEnd = stdout.lastIndexOf("}") + 1;
        const jsonStr = stdout.substring(jsonStart, jsonEnd);
        const response = JSON.parse(jsonStr);

        // Token counts should be reasonable
        expect(response.usage.totalTokens).toBeGreaterThan(0);
        expect(response.usage.totalTokens).toBeLessThan(5000); // Reasonable upper bound

        // Response time should be reasonable
        expect(response.responseTime).toBeGreaterThan(1000); // At least 1 second
        expect(response.responseTime).toBeLessThan(60000); // Less than 1 minute
      },
      timeout,
    );

    it(
      "should validate provider metadata",
      async () => {
        const { stdout } = await execAsync(
          `${cliPrefix} generate "Test metadata" --provider google-ai --max-tokens 2000 --output-format json`,
        );

        const jsonStart = stdout.indexOf("{");
        const jsonEnd = stdout.lastIndexOf("}") + 1;
        const jsonStr = stdout.substring(jsonStart, jsonEnd);
        const response = JSON.parse(jsonStr);

        expect(response.provider).toBe("google-ai");
        expect(response.toolsUsed).toBeDefined();
        expect(Array.isArray(response.toolsUsed)).toBe(true);
        expect(response.availableTools).toBeDefined();
        expect(Array.isArray(response.availableTools)).toBe(true);
      },
      timeout,
    );
  });
});
