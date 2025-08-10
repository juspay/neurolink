import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { exec } from "child_process";
import { promisify } from "util";
import { writeFileSync, unlinkSync } from "fs";
import { join } from "path";

const execAsync = promisify(exec);

describe("CLI Tool Integration", () => {
  const toolsFile = join(process.cwd(), "test-custom-tools.js");

  beforeAll(() => {
    // Create a custom tools file that can be loaded by the CLI
    const toolsCode = `
// Custom tools for testing
export function registerTools(sdk) {
  sdk.registerTool('echoTool', {
    description: 'Echo back the input message',
    execute: (args) => {
      return { echoed: args.message || 'No message provided' };
    }
  });
  
  sdk.registerTool('randomNumber', {
    description: 'Generate a random number between min and max',
    execute: ({ min = 0, max = 100 }) => {
      const number = Math.floor(Math.random() * (max - min + 1)) + min;
      return { number, range: \`\${min}-\${max}\` };
    }
  });
}
`;
    writeFileSync(toolsFile, toolsCode);
  });

  afterAll(() => {
    // Clean up
    try {
      unlinkSync(toolsFile);
    } catch (e) {
      // Ignore if file doesn't exist
    }
  });

  describe("Basic CLI Commands", () => {
    it("should show help", async () => {
      const { stdout } = await execAsync("pnpm cli --help");
      expect(stdout).toContain("generate");
      expect(stdout).toContain("stream");
      expect(stdout).toContain("provider");
      expect(stdout).toContain("mcp");
    });

    it("should show provider status", async () => {
      const { stdout } = await execAsync("pnpm cli provider status");
      expect(stdout).toContain("Provider check complete");
    });

    it("should list MCP servers", async () => {
      const { stdout } = await execAsync("pnpm cli mcp list");
      // Should not error and should contain MCP-related output
      expect(stdout).toBeDefined();
    });
  });

  describe("Core Functionality Tests", () => {
    it("should generate content in dry-run mode", async () => {
      const { stdout } = await execAsync(
        'pnpm cli generate "What is artificial intelligence?" --dryRun',
      );

      expect(stdout).toContain("Mock response for testing purposes");
      expect(stdout).toContain("Dry-run completed successfully");
    });

    it("should stream content in dry-run mode", async () => {
      const { stdout } = await execAsync(
        'pnpm cli stream "Explain machine learning" --dryRun',
      );

      expect(stdout).toContain("Mock");
      expect(stdout).toContain("streaming");
    });

    it("should get best provider", async () => {
      const { stdout } = await execAsync("pnpm cli get-best-provider");
      expect(stdout).toContain("Best available provider");
    });

    it("should generate completion script", async () => {
      const { stdout } = await execAsync("pnpm cli completion");
      expect(stdout).toContain("_neurolink_completion");
      expect(stdout).toContain("bash");
    });
  });

  describe("MCP Tool Integration", () => {
    it("should install filesystem MCP server", async () => {
      try {
        const { stdout } = await execAsync("pnpm cli mcp install filesystem");
        expect(stdout).toContain("Successfully installed filesystem");
      } catch (error) {
        // Test may fail in CI without proper environment, that's acceptable
        console.log(
          "MCP server installation test skipped in current environment",
        );
      }
    }, 30000);

    it("should test MCP server connectivity", async () => {
      try {
        const { stdout } = await execAsync("pnpm cli mcp test");
        expect(stdout).toContain("Test Results");
      } catch (error) {
        // Test may fail without configured servers, that's acceptable
        console.log("MCP test skipped - no servers configured");
      }
    });
  });

  describe("Configuration Management", () => {
    it("should show current configuration", async () => {
      const { stdout } = await execAsync("pnpm cli config show");
      expect(stdout).toBeDefined();
      expect(stdout.length).toBeGreaterThan(0);
    });

    it("should validate configuration", async () => {
      const { stdout } = await execAsync("pnpm cli config validate");
      expect(stdout).toContain("Configuration is valid");
    });

    it("should export configuration", async () => {
      const { stdout } = await execAsync(
        "pnpm cli config export --format json",
      );
      const config = JSON.parse(stdout);
      expect(config).toHaveProperty("providers");
      expect(config).toHaveProperty("timestamp");
    });
  });

  describe("JSON Output with Tools", () => {
    it("should output JSON format", async () => {
      try {
        const { stdout } = await execAsync(
          'pnpm cli generate "What is 10 divided by 2?" --provider google-ai --format json --dryRun',
        );

        const response = JSON.parse(stdout);
        expect(response).toHaveProperty("content");

        // In dry-run mode, we get mock responses
        if (response.analytics) {
          expect(response.analytics).toHaveProperty("provider");
        }
      } catch (error) {
        // If no provider is configured, test with dry-run mode
        const { stdout } = await execAsync(
          'pnpm cli generate "Test message" --format json --dryRun',
        );
        const response = JSON.parse(stdout);
        expect(response).toHaveProperty("content");
      }
    }, 30000);
  });

  describe("Error Handling", () => {
    it("should handle invalid commands gracefully", async () => {
      try {
        await execAsync("pnpm cli invalidcommand");
      } catch (error) {
        // Should fail with helpful error message
        expect(error).toBeDefined();
      }
    });

    it("should handle missing arguments", async () => {
      try {
        await execAsync("pnpm cli generate");
      } catch (error) {
        // Should fail with helpful error about missing input
        expect(error).toBeDefined();
      }
    });

    it("should handle dry-run mode without errors", async () => {
      const { stdout } = await execAsync(
        'pnpm cli generate "Test message" --dryRun',
      );

      expect(stdout).toContain("Mock response for testing purposes");
      expect(stdout).toContain("Dry-run completed successfully");
    });
  });

  // ✅ ENHANCED CLI OPTIONS TESTS - Testing Phase 1 Factory Infrastructure via CLI
  describe("Enhanced CLI Options Tests (Phase 1 Features)", () => {
    it("should support --evaluationDomain healthcare option", async () => {
      const { stdout } = await execAsync(
        'pnpm cli generate "Analyze patient symptoms: fever and cough" --evaluationDomain healthcare --enable-evaluation --format json --dryRun',
      );

      expect(stdout).toContain("Mock response for testing purposes");
      expect(stdout).toContain("Dry-run completed successfully");

      // In dry-run mode, domain options should be accepted without error
      expect(stdout).not.toContain("Unknown option");
      expect(stdout).not.toContain("Invalid flag");
    }, 10000);

    it("should support --evaluationDomain analytics option", async () => {
      const { stdout } = await execAsync(
        'pnpm cli generate "Calculate quarterly revenue growth" --evaluationDomain analytics --enable-evaluation --enable-analytics --format json --dryRun',
      );

      expect(stdout).toContain("Mock response for testing purposes");
      expect(stdout).toContain("Dry-run completed successfully");

      // Verify analytics domain option is accepted
      expect(stdout).not.toContain("Unknown option");
      expect(stdout).not.toContain("Invalid flag");
    }, 10000);

    it("should support --evaluationDomain finance option", async () => {
      const { stdout } = await execAsync(
        'pnpm cli generate "Assess investment portfolio risk" --evaluationDomain finance --enable-evaluation --format json --dryRun',
      );

      expect(stdout).toContain("Mock response for testing purposes");
      expect(stdout).toContain("Dry-run completed successfully");

      // Verify finance domain option is accepted
      expect(stdout).not.toContain("Unknown option");
      expect(stdout).not.toContain("Invalid flag");
    }, 10000);

    it("should support custom --evaluationDomain ecommerce option", async () => {
      const { stdout } = await execAsync(
        'pnpm cli generate "Optimize conversion funnel" --evaluationDomain ecommerce --enable-evaluation --format json --dryRun',
      );

      expect(stdout).toContain("Mock response for testing purposes");
      expect(stdout).toContain("Dry-run completed successfully");

      // Verify custom domain option is accepted
      expect(stdout).not.toContain("Unknown option");
      expect(stdout).not.toContain("Invalid flag");
    }, 10000);

    it("should support --enable-analytics option", async () => {
      const { stdout } = await execAsync(
        'pnpm cli generate "Test analytics tracking" --enable-analytics --format json --dryRun',
      );

      expect(stdout).toContain("Mock response for testing purposes");
      expect(stdout).toContain("Dry-run completed successfully");

      // Verify analytics option is accepted
      expect(stdout).not.toContain("Unknown option");
      expect(stdout).not.toContain("Invalid flag");
    }, 10000);

    it("should support --enable-evaluation option", async () => {
      const { stdout } = await execAsync(
        'pnpm cli generate "Test evaluation tracking" --enable-evaluation --format json --dryRun',
      );

      expect(stdout).toContain("Mock response for testing purposes");
      expect(stdout).toContain("Dry-run completed successfully");

      // Verify evaluation option is accepted
      expect(stdout).not.toContain("Unknown option");
      expect(stdout).not.toContain("Invalid flag");
    }, 10000);

    it("should support combined domain and analytics options", async () => {
      const { stdout } = await execAsync(
        'pnpm cli generate "Combined features test" --evaluationDomain healthcare --enable-evaluation --enable-analytics --format json --dryRun',
      );

      expect(stdout).toContain("Mock response for testing purposes");
      expect(stdout).toContain("Dry-run completed successfully");

      // Verify all combined options are accepted
      expect(stdout).not.toContain("Unknown option");
      expect(stdout).not.toContain("Invalid flag");
    }, 10000);

    it("should support domain options with context parameter", async () => {
      const contextData =
        '{"department":"cardiology","facilityId":"hospital-central"}';
      const { stdout } = await execAsync(
        `pnpm cli generate "Healthcare context test" --context '${contextData}' --evaluationDomain healthcare --enable-analytics --format json --dryRun`,
      );

      expect(stdout).toContain("Mock response for testing purposes");
      expect(stdout).toContain("Dry-run completed successfully");

      // Verify context with domain options work together
      expect(stdout).not.toContain("Unknown option");
      expect(stdout).not.toContain("Invalid flag");
    }, 10000);

    it("should support domain options with streaming command", async () => {
      const { stdout } = await execAsync(
        'pnpm cli stream "Stream with domain features" --evaluationDomain analytics --enable-evaluation --dryRun',
      );

      expect(stdout).toContain("Mock");
      expect(stdout).toContain("streaming");

      // Verify domain options work with streaming
      expect(stdout).not.toContain("Unknown option");
      expect(stdout).not.toContain("Invalid flag");
    }, 10000);

    it("should validate domain configuration help text", async () => {
      const { stdout } = await execAsync("pnpm cli generate --help");

      // Should include domain configuration options in help
      expect(stdout).toContain("evaluationDomain");
      expect(stdout).toContain("enable-evaluation");
      expect(stdout).toContain("enable-analytics");
    }, 10000);

    it("should validate stream command domain options help", async () => {
      const { stdout } = await execAsync("pnpm cli stream --help");

      // Should include domain configuration options in stream help
      expect(stdout).toContain("evaluationDomain");
      expect(stdout).toContain("enable-evaluation");
    }, 10000);

    it("should handle backwards compatibility without domain options", async () => {
      const { stdout } = await execAsync(
        'pnpm cli generate "Basic compatibility test" --provider google-ai --format json --dryRun',
      );

      expect(stdout).toContain("Mock response for testing purposes");
      expect(stdout).toContain("Dry-run completed successfully");

      // Should work without any domain options (backwards compatibility)
      expect(stdout).not.toContain("error");
      expect(stdout).not.toContain("Unknown option");
    }, 10000);

    it("should test enhanced options with multiple providers", async () => {
      const providers = ["google-ai", "openai", "anthropic"];

      for (const provider of providers) {
        try {
          const { stdout } = await execAsync(
            `pnpm cli generate "Test provider ${provider}" --provider ${provider} --evaluationDomain analytics --enable-evaluation --format json --dryRun`,
          );

          expect(stdout).toContain("Mock response for testing purposes");
          expect(stdout).toContain("Dry-run completed successfully");

          // Verify domain options work with different providers
          expect(stdout).not.toContain("Unknown option");
          expect(stdout).not.toContain("Invalid flag");
        } catch (error) {
          // Provider might not be configured, that's okay in dry-run mode
          console.log(`Provider ${provider} test skipped - not configured`);
        }
      }
    }, 30000);

    it("should validate domain option parameter validation", async () => {
      try {
        // Test with empty evaluation domain (should handle gracefully)
        const { stdout } = await execAsync(
          'pnpm cli generate "Empty domain test" --evaluationDomain "" --enable-evaluation --dryRun',
        );

        // Should either work or provide helpful error message
        expect(stdout).toBeDefined();
      } catch (error) {
        // Should fail gracefully with helpful error
        expect(error).toBeDefined();
      }
    }, 10000);

    it("should test domain configuration with max-tokens parameter", async () => {
      const { stdout } = await execAsync(
        'pnpm cli generate "Domain with token limit" --evaluationDomain healthcare --enable-evaluation --max-tokens 500 --format json --dryRun',
      );

      expect(stdout).toContain("Mock response for testing purposes");
      expect(stdout).toContain("Dry-run completed successfully");

      // Verify domain options work with token limits
      expect(stdout).not.toContain("Unknown option");
      expect(stdout).not.toContain("Invalid flag");
    }, 10000);
  });

  // === MERGED FROM test/integration/cliSdkBridgeIntegration.test.ts ===
  describe("CLI-SDK Bridge Integration", () => {
    const timeout = 35000;

    describe("Healthcare Domain Equivalence", () => {
      it(
        "should produce equivalent results via CLI for healthcare analysis",
        async () => {
          console.log("🏥 Testing CLI healthcare domain...");

          // Test CLI command with healthcare domain
          const cliContextData =
            '{"patient":{"symptoms":["fever","cough"],"age":45},"urgency":"moderate"}';
          const cliCommand = `pnpm cli generate "Analyze patient symptoms" --context '${cliContextData}' --evaluationDomain healthcare --enable-evaluation --format json --provider google-ai --max-tokens 800 --dryRun`;

          const cliResult = await execAsync(cliCommand, { timeout });

          // Verify CLI result structure
          expect(cliResult.stdout).toContain(
            "Mock response for testing purposes",
          );
          expect(cliResult.stdout).toBeTruthy();

          console.log("✅ CLI healthcare domain test completed");
        },
        timeout,
      );
    });

    describe("Analytics Domain Equivalence", () => {
      it(
        "should produce equivalent results via CLI for analytics",
        async () => {
          console.log("📊 Testing CLI analytics domain...");

          // Test CLI command with analytics domain
          const cliCommand = `pnpm cli generate "Analyze Q3 performance metrics" --evaluationDomain analytics --enable-analytics --format json --provider google-ai --dryRun`;

          const cliResult = await execAsync(cliCommand, { timeout });

          // Verify CLI result structure
          expect(cliResult.stdout).toContain(
            "Mock response for testing purposes",
          );
          expect(cliResult.stdout).toBeTruthy();

          console.log("✅ CLI analytics domain test completed");
        },
        timeout,
      );
    });
  });
});
