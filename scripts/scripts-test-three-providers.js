#!/usr/bin/env node

/**
 * Demo test script for validating the three new AI providers
 * Tests Hugging Face, Ollama, and Mistral AI integration
 */

import chalk from "chalk";
import ora from "ora";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { AIProviderFactory } from "../dist/index.js";

// Load environment variables from neurolink-demo/.env
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const envPath = path.join(__dirname, "..", "neurolink-demo", ".env");
console.log(chalk.gray(`Loading environment from: ${envPath}`));
dotenv.config({ path: envPath });

console.log(chalk.blue.bold("\n🧪 Three-Provider Integration Test\n"));

// Test configurations
const testPrompt = "Write a haiku about artificial intelligence";
const testOptions = {
  temperature: 0.7,
  maxTokens: 100,
};

// Test results storage
const results = {
  huggingface: { status: "pending", response: null, error: null, time: 0 },
  ollama: { status: "pending", response: null, error: null, time: 0 },
  mistral: { status: "pending", response: null, error: null, time: 0 },
};

// Test Hugging Face
async function testHuggingFace() {
  const spinner = ora("Testing Hugging Face provider...").start();
  const startTime = Date.now();

  try {
    const provider = AIProviderFactory.createProvider("huggingface");
    const result = await provider.generate({
      input: { text: testPrompt },
      ...testOptions,
    });

    results.huggingface.status = "success";
    results.huggingface.response = result.text;
    results.huggingface.time = Date.now() - startTime;

    spinner.succeed(`Hugging Face: ✅ Success (${results.huggingface.time}ms)`);
  } catch (error) {
    results.huggingface.status = "failed";
    results.huggingface.error = error.message;
    results.huggingface.time = Date.now() - startTime;

    spinner.fail(`Hugging Face: ❌ Failed - ${error.message}`);
  }
}

// Test Ollama
async function testOllama() {
  const spinner = ora("Testing Ollama provider...").start();
  const startTime = Date.now();

  try {
    const provider = AIProviderFactory.createProvider("ollama");
    const result = await provider.generate({
      input: { text: testPrompt },
      ...testOptions,
    });

    results.ollama.status = "success";
    results.ollama.response = result.text;
    results.ollama.time = Date.now() - startTime;

    spinner.succeed(`Ollama: ✅ Success (${results.ollama.time}ms)`);
  } catch (error) {
    results.ollama.status = "failed";
    results.ollama.error = error.message;
    results.ollama.time = Date.now() - startTime;

    spinner.fail(`Ollama: ❌ Failed - ${error.message}`);
  }
}

// Test Mistral AI
async function testMistralAI() {
  const spinner = ora("Testing Mistral AI provider...").start();
  const startTime = Date.now();

  try {
    const provider = AIProviderFactory.createProvider("mistral");
    const result = await provider.generate({
      input: { text: testPrompt },
      ...testOptions,
    });

    results.mistral.status = "success";
    results.mistral.response = result.text;
    results.mistral.time = Date.now() - startTime;

    spinner.succeed(`Mistral AI: ✅ Success (${results.mistral.time}ms)`);
  } catch (error) {
    results.mistral.status = "failed";
    results.mistral.error = error.message;
    results.mistral.time = Date.now() - startTime;

    spinner.fail(`Mistral AI: ❌ Failed - ${error.message}`);
  }
}

// Test auto-selection with new providers
async function testAutoSelection() {
  const spinner = ora("Testing auto-selection with all 9 providers...").start();

  try {
    const provider = AIProviderFactory.createBestProvider();
    const providerName = provider.constructor.name;

    spinner.succeed(`Auto-selection: Selected ${providerName}`);
  } catch (error) {
    spinner.fail(`Auto-selection: ❌ Failed - ${error.message}`);
  }
}

// Performance comparison
async function performanceComparison() {
  console.log(chalk.blue("\n📊 Performance Comparison:\n"));

  const providers = ["openai", "huggingface", "ollama", "mistral"];
  const performances = [];

  for (const providerName of providers) {
    const spinner = ora(`Benchmarking ${providerName}...`).start();

    try {
      const provider = AIProviderFactory.createProvider(providerName);
      const startTime = Date.now();

      await provider.generate({
        input: { text: "Say 'test'" },
        temperature: 0.1,
        maxTokens: 10,
      });

      const time = Date.now() - startTime;
      performances.push({ provider: providerName, time, status: "success" });

      spinner.succeed(`${providerName}: ${time}ms`);
    } catch (error) {
      performances.push({ provider: providerName, time: 0, status: "failed" });
      spinner.fail(`${providerName}: Failed`);
    }
  }

  // Sort by performance
  performances
    .filter((p) => p.status === "success")
    .sort((a, b) => a.time - b.time)
    .forEach((p, index) => {
      console.log(chalk.green(`${index + 1}. ${p.provider}: ${p.time}ms`));
    });
}

// Main test runner
async function runTests() {
  console.log(chalk.gray('Prompt: "' + testPrompt + '"\n'));

  // Test each provider
  await testHuggingFace();
  await testOllama();
  await testMistralAI();

  // Test auto-selection
  console.log();
  await testAutoSelection();

  // Performance comparison
  await performanceComparison();

  // Summary
  console.log(chalk.blue.bold("\n📋 Test Summary:\n"));

  let successCount = 0;
  Object.entries(results).forEach(([provider, result]) => {
    if (result.status === "success") {
      successCount++;
      console.log(chalk.green(`✅ ${provider}: Success (${result.time}ms)`));
      if (result.response) {
        console.log(
          chalk.gray(`   Response: ${result.response.substring(0, 50)}...`),
        );
      }
    } else if (result.status === "failed") {
      console.log(chalk.red(`❌ ${provider}: Failed`));
      console.log(chalk.gray(`   Error: ${result.error}`));
    }
  });

  console.log(chalk.blue(`\nTotal: ${successCount}/3 providers working`));

  // Environment check
  console.log(chalk.blue.bold("\n🔍 Environment Check:\n"));

  const envVars = {
    HUGGINGFACE_API_KEY: process.env.HUGGINGFACE_API_KEY
      ? "✅ Set"
      : "❌ Not set",
    OLLAMA_BASE_URL:
      process.env.OLLAMA_BASE_URL || "✅ Default (http://localhost:11434)",
    MISTRAL_API_KEY: process.env.MISTRAL_API_KEY ? "✅ Set" : "❌ Not set",
  };

  Object.entries(envVars).forEach(([key, value]) => {
    console.log(`${key}: ${value}`);
  });

  // Tips
  console.log(chalk.blue.bold("\n💡 Tips:\n"));

  if (!process.env.HUGGINGFACE_API_KEY) {
    console.log(
      chalk.yellow("• Set HUGGINGFACE_API_KEY to test Hugging Face provider"),
    );
    console.log(
      chalk.gray(
        "  Get your API key at: https://huggingface.co/settings/tokens",
      ),
    );
  }

  if (results.ollama.status === "failed") {
    console.log(chalk.yellow("• Make sure Ollama is installed and running"));
    console.log(chalk.gray("  Install: https://ollama.ai"));
    console.log(chalk.gray("  Start: ollama serve"));
  }

  if (!process.env.MISTRAL_API_KEY) {
    console.log(
      chalk.yellow("• Set MISTRAL_API_KEY to test Mistral AI provider"),
    );
    console.log(chalk.gray("  Get your API key at: https://mistral.ai"));
  }
}

// Run tests
runTests().catch((error) => {
  console.error(chalk.red("\n❌ Test runner failed:"), error);
  process.exit(1);
});
