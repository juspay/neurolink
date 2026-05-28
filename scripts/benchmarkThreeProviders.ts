import { AIProviderFactory } from "../dist/lib/core/factory.js";
import chalk from "chalk";
import ora from "ora";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

type BenchmarkPrompt = {
  name: string;
  prompt: string;
  maxTokens: number;
};

type PromptResult = {
  attempts: number;
  times: number[];
  avgTime: number;
  success: boolean;
  error: string | null;
};

type ProviderResult = {
  available: boolean;
  prompts: Record<string, PromptResult>;
  totalTime: number;
  avgResponseTime: number;
  errors: string[];
};

type BenchmarkSummary = {
  totalProviders: number;
  availableProviders: number;
  fastestProvider: string;
  slowestProvider: string;
  avgResponseTimeAcrossProviders: number;
};

type BenchmarkResults = {
  timestamp: string;
  providers: Record<string, ProviderResult>;
  summary: Partial<BenchmarkSummary>;
};

const BENCHMARK_PROMPTS: BenchmarkPrompt[] = [
  {
    name: "Short Response",
    prompt: "Say hello in one word",
    maxTokens: 10,
  },
  {
    name: "Medium Response",
    prompt: "Write a three-sentence story about AI",
    maxTokens: 100,
  },
  {
    name: "Long Response",
    prompt: "Explain quantum computing in simple terms",
    maxTokens: 500,
  },
];

const PROVIDERS_TO_BENCHMARK: string[] = [
  "openai",
  "anthropic",
  "google-ai",
  "azure",
  "vertex",
  "bedrock",
  "huggingface",
  "ollama",
  "mistral",
];

// Performance tracking
const benchmarkResults: BenchmarkResults = {
  timestamp: new Date().toISOString(),
  providers: {},
  summary: {},
};

async function benchmarkProvider(providerName: string): Promise<ProviderResult> {
  const spinner = ora(`Benchmarking ${chalk.cyan(providerName)}...`).start();

  const results = {
    available: false,
    prompts: {},
    totalTime: 0,
    avgResponseTime: 0,
    errors: [],
  };

  try {
    // Create provider instance
    const provider = AIProviderFactory.createProvider(providerName);
    results.available = true;

    // Test each prompt
    for (const promptConfig of BENCHMARK_PROMPTS) {
      const promptResults = {
        attempts: 3,
        times: [],
        avgTime: 0,
        success: false,
        error: null,
      };

      // Run 3 attempts for each prompt
      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          const startTime = Date.now();

          const response = await provider.generate({
            input: { text: promptConfig.prompt },
            maxTokens: promptConfig.maxTokens,
            temperature: 0.7,
          });

          const endTime = Date.now();
          const responseTime = endTime - startTime;

          promptResults.times.push(responseTime);
          promptResults.success = true;

          spinner.text = `${chalk.cyan(providerName)} - ${promptConfig.name}: Attempt ${attempt}/3 (${responseTime}ms)`;
        } catch (error: unknown) {
          promptResults.error = (error as Error).message;
          spinner.text = `${chalk.red(providerName)} - ${promptConfig.name}: Attempt ${attempt}/3 failed`;
        }
      }

      // Calculate average time
      if (promptResults.times.length > 0) {
        promptResults.avgTime = Math.round(
          promptResults.times.reduce((a, b) => a + b, 0) /
            promptResults.times.length,
        );
      }

      results.prompts[promptConfig.name] = promptResults;
      results.totalTime += promptResults.avgTime;
    }

    // Calculate overall average
    const successfulPrompts = Object.values(results.prompts).filter(
      (p: PromptResult) => p.success,
    ).length;
    if (successfulPrompts > 0) {
      results.avgResponseTime = Math.round(
        results.totalTime / successfulPrompts,
      );
    }

    spinner.succeed(
      `${chalk.green(providerName)} - Avg response time: ${results.avgResponseTime}ms`,
    );
  } catch (error) {
    results.errors.push((error as Error).message);
    spinner.fail(
      `${chalk.red(providerName)} - Provider not available: ${(error as Error).message}`,
    );
  }

  benchmarkResults.providers[providerName] = results;
  return results;
}

async function generateReport(): Promise<void> {
  console.log("\n Generating Benchmark Report...\n");

  // Calculate summary statistics
  const availableProviders = Object.entries(benchmarkResults.providers).filter(
    ([, results]) => results.available,
  );

  const providersBySpeed = availableProviders
    .filter(([, results]) => results.avgResponseTime > 0)
    .sort((a, b) => a[1].avgResponseTime - b[1].avgResponseTime);

  benchmarkResults.summary = {
    totalProviders: PROVIDERS_TO_BENCHMARK.length,
    availableProviders: availableProviders.length,
    fastestProvider: providersBySpeed[0]?.[0] || "N/A",
    slowestProvider:
      providersBySpeed[providersBySpeed.length - 1]?.[0] || "N/A",
    avgResponseTimeAcrossProviders: Math.round(
      providersBySpeed.reduce((sum, [, r]) => sum + r.avgResponseTime, 0) /
        providersBySpeed.length || 0,
    ),
  };

  // Display results
  console.log(chalk.bold.blue("🏆 Performance Rankings:"));
  console.log("========================\n");

  providersBySpeed.forEach(([provider, results], index) => {
    const medal =
      index === 0 ? "🥇" : index === 1 ? "🥈" : index === 2 ? "🥉" : "  ";
    console.log(
      `${medal} ${chalk.cyan(provider.padEnd(15))} - ${chalk.yellow(results.avgResponseTime + "ms")} avg response time`,
    );
  });

  console.log("\n" + chalk.bold.blue("📈 Detailed Results:"));
  console.log("====================\n");

  for (const [provider, results] of Object.entries(
    benchmarkResults.providers,
  )) {
    if (!results.available) {
      console.log(`${chalk.red("✗")} ${chalk.gray(provider)} - Not available`);
      continue;
    }

    console.log(`${chalk.green("✓")} ${chalk.bold(provider)}`);

    for (const [promptName, promptResults] of Object.entries(results.prompts)) {
      if (promptResults.success) {
        console.log(
          `   ${promptName}: ${chalk.green(promptResults.avgTime + "ms")} (${promptResults.times.join(", ")}ms)`,
        );
      } else {
        console.log(
          `   ${promptName}: ${chalk.red("Failed")} - ${promptResults.error}`,
        );
      }
    }
    console.log("");
  }

  // Save results to file
  const reportPath = path.join(
    PROJECT_ROOT,
    "docs",
    "test-reports",
    "three-provider-benchmark-report.json",
  );
  await fs.mkdir(path.dirname(reportPath), { recursive: true });
  await fs.writeFile(reportPath, JSON.stringify(benchmarkResults, null, 2));

  console.log(chalk.bold.blue("📊 Summary:"));
  console.log("===========\n");
  console.log(
    `Total providers tested: ${benchmarkResults.summary.totalProviders}`,
  );
  console.log(
    `Available providers: ${benchmarkResults.summary.availableProviders}`,
  );
  console.log(
    `Fastest provider: ${chalk.green(benchmarkResults.summary.fastestProvider)}`,
  );
  console.log(
    `Slowest provider: ${chalk.yellow(benchmarkResults.summary.slowestProvider)}`,
  );
  console.log(
    `Average response time: ${chalk.cyan(benchmarkResults.summary.avgResponseTimeAcrossProviders + "ms")}`,
  );

  console.log(`\n✅ Full report saved to: ${chalk.gray(reportPath)}\n`);
}

async function main(): Promise<void> {
  console.log(chalk.bold.blue("🚀 NeuroLink Provider Performance Benchmark"));
  console.log("===========================================\n");

  console.log("Testing providers with 3 different prompts:");
  BENCHMARK_PROMPTS.forEach((p) => console.log(`  • ${p.name}: "${p.prompt}"`));
  console.log("\n");

  for (const provider of PROVIDERS_TO_BENCHMARK) {
    await benchmarkProvider(provider);
  }

  await generateReport();
}

const PROJECT_ROOT = path.join(__dirname, "..");

// Run the benchmark
main().catch(console.error);
