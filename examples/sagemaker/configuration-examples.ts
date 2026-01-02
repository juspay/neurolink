/**
 * SageMaker Provider Configuration Examples
 *
 * This file demonstrates various configuration patterns and best practices
 * for setting up the SageMaker provider in different environments.
 */

import { NeuroLink } from "@juspay/neurolink";

// Example 1: Environment Variable Configuration (Recommended for Production)
export async function generateWithEnvironmentConfig() {
  console.log("📋 Configuration Example 1: Environment Variables");

  // Set environment variables (typically in .env file or deployment config)
  /*
  AWS_ACCESS_KEY_ID=your_access_key_here
  AWS_SECRET_ACCESS_KEY=your_secret_key_here
  AWS_REGION=us-east-1
  AWS_SESSION_TOKEN=optional_session_token
  SAGEMAKER_DEFAULT_ENDPOINT=my-model-endpoint
  SAGEMAKER_TIMEOUT=30000
  SAGEMAKER_MAX_RETRIES=3
  SAGEMAKER_MODEL_TYPE=custom
  */

  const neurolink = new NeuroLink();

  // NeuroLink automatically loads AWS credentials from environment variables
  const result = await neurolink.generate({
    input: {
      text: "Explain the benefits of using SageMaker for ML deployment",
    },
    provider: "sagemaker",
    model: process.env.SAGEMAKER_DEFAULT_ENDPOINT || "my-model-endpoint",
  });

  console.log("✅ Generation completed using environment configuration");
  console.log("Response:", result.text);
  return result;
}

// Example 2: Explicit Configuration with Provider Options
export async function generateWithExplicitConfig() {
  console.log("📋 Configuration Example 2: Explicit Configuration");

  const neurolink = new NeuroLink();

  const result = await neurolink.generate({
    input: { text: "What are the best practices for SageMaker endpoints?" },
    provider: "sagemaker",
    model: "my-custom-endpoint",
    providerOptions: {
      sagemaker: {
        region: "us-west-2",
        timeout: 45000, // 45 seconds
        maxRetries: 5,
        contentType: "application/json",
        accept: "application/json",
      },
    },
  });

  console.log("✅ Generation completed with explicit configuration");
  console.log("Response:", result.text);
  return result;
}

// Example 3: Development Environment Configuration
export async function generateForDevelopment() {
  console.log("📋 Configuration Example 3: Development Environment");

  const neurolink = new NeuroLink();

  const result = await neurolink.generate({
    input: { text: "Help me debug my SageMaker endpoint" },
    provider: "sagemaker",
    model: "dev-test-endpoint",
    providerOptions: {
      sagemaker: {
        region: "us-east-1",
        timeout: 60000, // Longer timeout for development
        maxRetries: 2, // Fewer retries for faster feedback
      },
    },
    temperature: 0.7, // More creative for development testing
  });

  console.log("✅ Development generation completed");
  console.log("Response:", result.text);
  return result;
}

// Example 4: Production Environment Configuration
export async function generateForProduction() {
  console.log("📋 Configuration Example 4: Production Environment");

  // Production configuration with error handling
  const requiredEnvVars = [
    "AWS_ACCESS_KEY_ID",
    "AWS_SECRET_ACCESS_KEY",
    "SAGEMAKER_PRODUCTION_ENDPOINT",
  ];

  for (const envVar of requiredEnvVars) {
    if (!process.env[envVar]) {
      throw new Error(`Missing required environment variable: ${envVar}`);
    }
  }

  const neurolink = new NeuroLink();

  const result = await neurolink.generate({
    input: { text: "Process this production request" },
    provider: "sagemaker",
    model: process.env.SAGEMAKER_PRODUCTION_ENDPOINT!,
    providerOptions: {
      sagemaker: {
        region: process.env.AWS_REGION || "us-east-1",
        timeout: parseInt(process.env.SAGEMAKER_TIMEOUT || "30000"),
        maxRetries: parseInt(process.env.SAGEMAKER_MAX_RETRIES || "3"),
      },
    },
    temperature: 0.3, // Lower temperature for consistent production outputs
  });

  console.log("✅ Production generation completed with validation");
  console.log("Response:", result.text);
  return result;
}

// Example 5: Multi-Region Configuration
export async function generateWithMultiRegion() {
  console.log("📋 Configuration Example 5: Multi-Region Setup");

  const neurolink = new NeuroLink();

  const regions = [
    { region: "us-east-1", endpoint: "us-east-model-endpoint" },
    { region: "eu-west-1", endpoint: "eu-west-model-endpoint" },
    { region: "ap-southeast-1", endpoint: "asia-model-endpoint" },
  ];

  const results = await Promise.all(
    regions.map(async ({ region, endpoint }) => {
      return await neurolink.generate({
        input: { text: `Process request in ${region}` },
        provider: "sagemaker",
        model: endpoint,
        providerOptions: {
          sagemaker: {
            region,
            timeout: 30000,
            maxRetries: 3,
          },
        },
      });
    }),
  );

  console.log(`✅ Completed ${results.length} regional generations`);
  return results;
}

// Example 6: Configuration with Custom Model Types
export async function generateWithTypedModels() {
  console.log("📋 Configuration Example 6: Typed Model Configuration");

  const neurolink = new NeuroLink();

  const modelConfigs = [
    {
      name: "LLaMA Model",
      endpoint: "llama-2-7b-endpoint",
      modelType: "llama",
    },
    {
      name: "Mistral Model",
      endpoint: "mistral-7b-endpoint",
      modelType: "mistral",
    },
    {
      name: "HuggingFace Model",
      endpoint: "huggingface-endpoint",
      modelType: "huggingface",
    },
  ];

  const results = await Promise.all(
    modelConfigs.map(async ({ name, endpoint, modelType }) => {
      const result = await neurolink.generate({
        input: { text: `Test prompt for ${name}` },
        provider: "sagemaker",
        model: endpoint,
        providerOptions: {
          sagemaker: {
            modelType,
            contentType: "application/json",
            accept: "application/json",
          },
        },
      });
      console.log(`   ✅ Completed generation for ${name}`);
      return { name, result };
    }),
  );

  return results;
}

// Example 7: Configuration Validation and Testing
export async function validateAndTestConfiguration() {
  console.log("📋 Configuration Example 7: Validation and Testing");

  const neurolink = new NeuroLink();

  try {
    console.log("   🔍 Testing configuration...");

    const result = await neurolink.generate({
      input: {
        text: "Hello, this is a connectivity test. Please respond briefly.",
      },
      provider: "sagemaker",
      model: process.env.SAGEMAKER_TEST_ENDPOINT || "test-endpoint",
      maxTokens: 50, // Short response for testing
    });

    if (result.text) {
      console.log("   ✅ Configuration validated successfully");
      console.log("   📊 Generation Information:");
      console.log(`      Provider: sagemaker`);
      console.log(
        `      Model: ${process.env.SAGEMAKER_TEST_ENDPOINT || "test-endpoint"}`,
      );
      console.log(`      Response length: ${result.text.length} characters`);

      if (result.usage) {
        console.log("   📈 Usage:");
        console.log(`      Input tokens: ${result.usage.promptTokens}`);
        console.log(`      Output tokens: ${result.usage.completionTokens}`);
      }

      return { success: true, result };
    } else {
      console.log("   ❌ Configuration validation failed - no response");
      return { success: false, error: "No response received" };
    }
  } catch (error) {
    console.log("   ❌ Configuration error");
    console.log(
      `      Error: ${error instanceof Error ? error.message : String(error)}`,
    );
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

// Example 8: Configuration from File
export async function generateFromConfigFile(configPath: string) {
  console.log("📋 Configuration Example 8: File-based Configuration");

  // Example config file structure
  const exampleConfig = {
    aws: {
      region: "us-east-1",
      timeout: 30000,
      maxRetries: 3,
    },
    sagemaker: {
      defaultEndpoint: "my-model-endpoint",
      modelType: "custom",
      contentType: "application/json",
      accept: "application/json",
    },
  };

  console.log("   📄 Example config file structure:");
  console.log(JSON.stringify(exampleConfig, null, 2));

  // In a real implementation, you would read from the file:
  // const fs = await import('fs/promises');
  // const configData = await fs.readFile(configPath, 'utf-8');
  // const config = JSON.parse(configData);

  const neurolink = new NeuroLink();

  // For demonstration, using example config
  const result = await neurolink.generate({
    input: { text: "Process request using file-based configuration" },
    provider: "sagemaker",
    model: exampleConfig.sagemaker.defaultEndpoint,
    providerOptions: {
      sagemaker: {
        region: exampleConfig.aws.region,
        timeout: exampleConfig.aws.timeout,
        maxRetries: exampleConfig.aws.maxRetries,
        modelType: exampleConfig.sagemaker.modelType,
        contentType: exampleConfig.sagemaker.contentType,
        accept: exampleConfig.sagemaker.accept,
      },
    },
  });

  console.log("   ✅ Generation completed using file configuration");
  return result;
}

// Example 9: Dynamic Configuration Selection
export async function generateByEnvironment(
  environment: "development" | "staging" | "production",
) {
  console.log(
    `📋 Configuration Example 9: ${environment.toUpperCase()} Environment`,
  );

  const configurations = {
    development: {
      endpoint: "dev-model-endpoint",
      region: "us-east-1",
      timeout: 60000,
      maxRetries: 1,
      temperature: 0.7,
    },
    staging: {
      endpoint: "staging-model-endpoint",
      region: "us-west-2",
      timeout: 45000,
      maxRetries: 2,
      temperature: 0.5,
    },
    production: {
      endpoint: process.env.PROD_SAGEMAKER_ENDPOINT || "production-endpoint",
      region: process.env.PROD_AWS_REGION || "us-east-1",
      timeout: 30000,
      maxRetries: 3,
      temperature: 0.3,
    },
  };

  const config = configurations[environment];
  const neurolink = new NeuroLink();

  const result = await neurolink.generate({
    input: { text: `Process ${environment} request` },
    provider: "sagemaker",
    model: config.endpoint,
    temperature: config.temperature,
    providerOptions: {
      sagemaker: {
        region: config.region,
        timeout: config.timeout,
        maxRetries: config.maxRetries,
      },
    },
  });

  console.log(`   ✅ ${environment} generation completed`);
  console.log("Response:", result.text);
  return result;
}

// Example 10: Streaming with SageMaker
export async function generateWithStreaming() {
  console.log("📋 Configuration Example 10: Streaming Generation");

  const neurolink = new NeuroLink();

  const stream = await neurolink.stream({
    input: { text: "Explain machine learning in detail" },
    provider: "sagemaker",
    model: process.env.SAGEMAKER_STREAMING_ENDPOINT || "streaming-endpoint",
    providerOptions: {
      sagemaker: {
        region: "us-east-1",
        timeout: 60000,
      },
    },
  });

  console.log("   📝 Streaming response:");
  process.stdout.write("   ");

  for await (const chunk of stream.textStream) {
    process.stdout.write(chunk);
  }

  console.log("\n   ✅ Streaming completed");
  return stream;
}

// Example 11: Configuration Best Practices Summary
export function showConfigurationBestPractices() {
  console.log("📋 Configuration Best Practices Summary\n");

  const practices = [
    {
      title: "🔐 Security",
      items: [
        "Never hardcode credentials in source code",
        "Use environment variables or secure credential management",
        "Rotate access keys regularly",
        "Use IAM roles when possible (EC2, Lambda, ECS)",
        "Apply principle of least privilege for permissions",
      ],
    },
    {
      title: "🌍 Environment Management",
      items: [
        "Use different endpoints for dev/staging/production",
        "Configure appropriate timeouts for each environment",
        "Set retry limits based on environment needs",
        "Use region-specific configurations for latency optimization",
      ],
    },
    {
      title: "⚡ Performance",
      items: [
        "Configure timeouts based on expected response times",
        "Set appropriate retry limits to balance reliability and speed",
        "Use streaming for long-running generations",
        "Monitor and adjust configurations based on metrics",
      ],
    },
    {
      title: "🛠️ Monitoring & Debugging",
      items: [
        "Enable debug logging in development",
        "Implement proper error handling and logging",
        "Use health checks and connectivity tests",
        "Monitor token usage and costs",
        "Set up alerts for configuration issues",
      ],
    },
    {
      title: "📦 Deployment",
      items: [
        "Validate configuration during deployment",
        "Use configuration files for complex setups",
        "Implement configuration hot-reloading when needed",
        "Document all configuration parameters",
        "Use infrastructure as code for consistency",
      ],
    },
  ];

  practices.forEach(({ title, items }) => {
    console.log(title);
    items.forEach((item) => console.log(`   • ${item}`));
    console.log();
  });

  console.log(
    "💡 Remember: Always test your configuration in a staging environment before deploying to production!",
  );
}

// Demonstration function to run all examples
export async function runAllConfigurationExamples() {
  console.log("🚀 SageMaker Configuration Examples\n");
  console.log("=".repeat(80) + "\n");

  try {
    // Run each example
    await generateWithEnvironmentConfig();
    console.log();

    await generateWithExplicitConfig();
    console.log();

    await generateForDevelopment();
    console.log();

    await generateForProduction();
    console.log();

    await generateWithMultiRegion();
    console.log();

    await generateWithTypedModels();
    console.log();

    await validateAndTestConfiguration();
    console.log();

    await generateFromConfigFile("./config/sagemaker.json");
    console.log();

    await generateByEnvironment("development");
    console.log();

    await generateWithStreaming();
    console.log();

    showConfigurationBestPractices();
  } catch (error) {
    console.error("❌ Error running configuration examples:");
    console.error(error instanceof Error ? error.message : String(error));
  }
}

// Run examples if this file is executed directly
// Note: Use ES module check for direct execution
const isMainModule = import.meta.url === `file://${process.argv[1]}`;
if (isMainModule) {
  runAllConfigurationExamples();
}
