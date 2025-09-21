#!/usr/bin/env node

/**
 * NeuroLink Environment Setup Example
 *
 * This example demonstrates:
 * - How to set up API keys for different providers
 * - Environment variable validation
 * - Provider availability checking
 * - Best practices for configuration
 */

import { NeuroLink } from "@juspay/neurolink";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

async function environmentSetupExample() {
  console.log("🔧 NeuroLink Environment Setup Guide\n");

  // Check which providers are available
  console.log("📋 Checking provider availability...\n");

  const providers = [
    {
      name: "Google AI",
      envVar: "GOOGLE_AI_API_KEY",
      setup: "Get free API key at: https://ai.google.dev/",
      recommended: true,
    },
    {
      name: "OpenAI",
      envVar: "OPENAI_API_KEY",
      setup: "Get API key at: https://platform.openai.com/api-keys",
      recommended: false,
    },
    {
      name: "Anthropic",
      envVar: "ANTHROPIC_API_KEY",
      setup: "Get API key at: https://console.anthropic.com/",
      recommended: false,
    },
    {
      name: "AWS Bedrock",
      envVars: ["AWS_ACCESS_KEY_ID", "AWS_SECRET_ACCESS_KEY", "AWS_REGION"],
      setup: "Configure AWS credentials with Bedrock access",
      recommended: false,
    },
  ];

  const availableProviders = [];

  for (const provider of providers) {
    let isAvailable;
    let missingVars = [];

    if (provider.envVars) {
      // Check all required environment variables
      isAvailable = provider.envVars.every((envVar) => !!process.env[envVar]);
      if (!isAvailable) {
        missingVars = provider.envVars.filter((envVar) => !process.env[envVar]);
      }
    } else {
      // Backward compatibility for single envVar
      isAvailable = !!process.env[provider.envVar];
    }

    const status = isAvailable ? "✅ Available" : "❌ Not configured";
    const recommended = provider.recommended ? " (Recommended - Free)" : "";

    console.log(`${status} ${provider.name}${recommended}`);

    if (!isAvailable) {
      console.log(`   Setup: ${provider.setup}`);
      if (provider.envVars) {
        console.log(`   Missing variables: ${missingVars.join(", ")}`);
        console.log(`   Required variables: ${provider.envVars.join(", ")}`);
      } else {
        console.log(`   Environment variable: ${provider.envVar}`);
      }
    }

    if (isAvailable) {
      availableProviders.push(provider.name.toLowerCase().replace(/\s+/g, "-"));
    }

    console.log();
  }

  if (availableProviders.length === 0) {
    console.log("⚠️  No providers configured!");
    console.log("\n💡 Quick setup (recommended):");
    console.log("1. Get a free Google AI API key: https://ai.google.dev/");
    console.log("2. Add to your .env file:");
    console.log("   GOOGLE_AI_API_KEY=AIza-your-key-here");
    console.log("3. Run this example again");
    return;
  }

  console.log(
    `🎉 Found ${availableProviders.length} configured provider(s)!\n`,
  );

  // Test each configured provider individually
  console.log("🧪 Testing each provider individually...\n");

  const providerIdMap = {
    "google-ai": "google-ai",
    openai: "openai",
    anthropic: "anthropic",
    "aws-bedrock": "bedrock",
  };

  const testResults = [];

  for (const provider of providers) {
    let isConfigured;

    if (provider.envVars) {
      // Check all required environment variables
      isConfigured = provider.envVars.every((envVar) => !!process.env[envVar]);
    } else {
      // Backward compatibility for single envVar
      isConfigured = !!process.env[provider.envVar];
    }

    if (!isConfigured) {
      continue;
    }

    const providerKey = provider.name.toLowerCase().replace(/\s+/g, "-");
    const providerId = providerIdMap[providerKey];

    console.log(`--- Testing ${provider.name} ---`);

    try {
      // Create NeuroLink instance with specific provider
      const neurolink = new NeuroLink({ provider: providerId });

      const result = await neurolink.generateText({
        prompt: `Hello ${provider.name}, this is a connectivity test.`,
        maxTokens: 20,
      });

      // Check if the actual provider used matches what we requested
      const actualProvider = result.provider || "unknown";
      const requestedProvider = providerId;

      if (actualProvider === requestedProvider) {
        console.log(`✅ Success!`);
        console.log(`   Response: "${result.content.trim()}"`);
        if (result.usage) {
          console.log(`   Tokens used: ${result.usage.totalTokens}`);
        }
        testResults.push({ name: provider.name, status: "Working" });
      } else {
        console.log(`⚠️  Fallback Detected!`);
        console.log(
          `   Requested: ${requestedProvider}, but used: ${actualProvider}`,
        );
        console.log(`   This means ${provider.name} credentials are invalid`);
        testResults.push({
          name: provider.name,
          status: "Failed (Fallback)",
          error: `Used ${actualProvider} instead`,
        });
      }
    } catch (error) {
      console.error(`❌ Test Failed!`);
      console.error(`   Error: ${error.message}`);
      testResults.push({
        name: provider.name,
        status: "Failed",
        error: error.message,
      });
    }
    console.log("--------------------------\n");
  }

  // Final Summary
  console.log("📋 --- Final Test Summary ---");
  let allWorking = true;
  for (const result of testResults) {
    const statusIcon = result.status === "Working" ? "✅" : "❌";
    console.log(`${statusIcon} ${result.name}: ${result.status}`);
    if (result.status !== "Working") {
      allWorking = false;
    }
  }
  console.log("----------------------------");

  if (allWorking) {
    console.log("\n🎉 All configured providers are working correctly!");
  } else {
    console.log(
      "\n⚠️ Some providers failed. Check the error messages above for details.",
    );
  }

  // Show environment file example
  console.log("\n📄 Example .env file:");
  console.log("# NeuroLink Configuration");
  console.log("# Choose one or more providers:");
  console.log("");
  console.log("# Google AI (Recommended - Free tier available)");
  console.log("GOOGLE_AI_API_KEY=AIza-your-key-here");
  console.log("");
  console.log("# OpenAI");
  console.log("OPENAI_API_KEY=sk-your-key-here");
  console.log("");
  console.log("# Anthropic");
  console.log("ANTHROPIC_API_KEY=sk-ant-your-key-here");
  console.log("");
  console.log("# AWS Bedrock (requires AWS credentials)");
  console.log("AWS_ACCESS_KEY_ID=your-access-key");
  console.log("AWS_SECRET_ACCESS_KEY=your-secret-key");
  console.log("AWS_REGION=us-east-1");

  console.log("\n🚀 You're all set! Try running other examples:");
  console.log("- node examples/basic-usage.js");
  console.log("- node examples/mcp-built-in-tools.js");
  console.log("- pnpm cli generate 'Hello world'");
}

// Run the example
import { fileURLToPath } from "url";
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  environmentSetupExample().catch(console.error);
}

export { environmentSetupExample };
