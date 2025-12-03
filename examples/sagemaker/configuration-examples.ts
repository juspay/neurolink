/**
 * SageMaker Provider Configuration Examples
 *
 * This file demonstrates various configuration patterns and best practices
 * for setting up the SageMaker provider in different environments.
 */

import { AIProviderFactory } from "@juspay/neurolink";
import type {
  SageMakerConfig,
  SageMakerModelConfig,
} from "@juspay/neurolink/lib/providers/sagemaker/types";

// Example 1: Environment Variable Configuration (Recommended for Production)
export async function createProviderFromEnvironment() {
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

  const provider = await AIProviderFactory.createProvider("sagemaker", {
    // Provider will automatically load from environment variables
    endpointName: process.env.SAGEMAKER_DEFAULT_ENDPOINT,
  });

  console.log("✅ Provider created using environment configuration");
  return provider;
}

// Example 2: Explicit Configuration Object
export async function createProviderWithExplicitConfig() {
  console.log("📋 Configuration Example 2: Explicit Configuration");

  const config: SageMakerConfig = {
    accessKeyId: "AKIAIOSFODNN7EXAMPLE",
    secretAccessKey: "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY",
    region: "us-west-2",
    sessionToken: "optional-session-token",
    timeout: 45000, // 45 seconds
    maxRetries: 5,
    endpoint: "https://custom-sagemaker-endpoint.amazonaws.com",
  };

  const provider = await AIProviderFactory.createProvider("sagemaker", {
    config,
    endpointName: "my-custom-endpoint",
    modelName: "my-custom-model",
  });

  console.log("✅ Provider created with explicit configuration");
  return provider;
}

// Example 3: Development Environment Configuration
export async function createDevelopmentProvider() {
  console.log("📋 Configuration Example 3: Development Environment");

  const provider = await AIProviderFactory.createProvider("sagemaker", {
    config: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
      region: "us-east-1",
      timeout: 60000, // Longer timeout for development
      maxRetries: 2, // Fewer retries for faster feedback
    },
    endpointName: "dev-test-endpoint",
  });

  console.log("✅ Development provider created");
  return provider;
}

// Example 4: Production Environment Configuration
export async function createProductionProvider() {
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

  const provider = await AIProviderFactory.createProvider("sagemaker", {
    config: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
      region: process.env.AWS_REGION || "us-east-1",
      sessionToken: process.env.AWS_SESSION_TOKEN,
      timeout: parseInt(process.env.SAGEMAKER_TIMEOUT || "30000"),
      maxRetries: parseInt(process.env.SAGEMAKER_MAX_RETRIES || "3"),
    },
    endpointName: process.env.SAGEMAKER_PRODUCTION_ENDPOINT!,
    modelName: process.env.SAGEMAKER_MODEL_NAME || "production-model",
  });

  console.log("✅ Production provider created with validation");
  return provider;
}

// Example 5: Multi-Region Configuration
export async function createMultiRegionProviders() {
  console.log("📋 Configuration Example 5: Multi-Region Setup");

  const baseConfig = {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    timeout: 30000,
    maxRetries: 3,
  };

  const regions = [
    { region: "us-east-1", endpoint: "us-east-model-endpoint" },
    { region: "eu-west-1", endpoint: "eu-west-model-endpoint" },
    { region: "ap-southeast-1", endpoint: "asia-model-endpoint" },
  ];

  const providers = await Promise.all(
    regions.map(async ({ region, endpoint }) => {
      return await AIProviderFactory.createProvider("sagemaker", {
        config: { ...baseConfig, region },
        endpointName: endpoint,
      });
    }),
  );

  console.log(`✅ Created ${providers.length} regional providers`);
  return providers;
}

// Example 6: Configuration with Custom Model Types
export async function createTypedModelProviders() {
  console.log("📋 Configuration Example 6: Typed Model Configuration");

  const configs = [
    {
      name: "LLaMA Model",
      config: {
        endpointName: "llama-2-7b-endpoint",
        modelType: "llama" as const,
        contentType: "application/json",
        accept: "application/json",
      },
    },
    {
      name: "Mistral Model",
      config: {
        endpointName: "mistral-7b-endpoint",
        modelType: "mistral" as const,
        contentType: "application/json",
        accept: "application/json",
      },
    },
    {
      name: "HuggingFace Model",
      config: {
        endpointName: "huggingface-endpoint",
        modelType: "huggingface" as const,
        inputFormat: "huggingface" as const,
        outputFormat: "huggingface" as const,
      },
    },
  ];

  const providers = await Promise.all(
    configs.map(async ({ name, config }) => {
      const provider = await AIProviderFactory.createProvider(
        "sagemaker",
        config,
      );
      console.log(`   ✅ Created provider for ${name}`);
      return { name, provider };
    }),
  );

  return providers;
}

// Example 7: Configuration Validation and Testing
export async function validateAndTestConfiguration() {
  console.log("📋 Configuration Example 7: Validation and Testing");

  try {
    // Create provider
    const provider = await AIProviderFactory.createProvider("sagemaker", {
      endpointName: process.env.SAGEMAKER_TEST_ENDPOINT || "test-endpoint",
    });

    // Get model and test connectivity
    const model = await provider.getAISDKModel();

    console.log("   🔍 Testing configuration...");
    const connectivityTest = await model.testConnectivity();

    if (connectivityTest.success) {
      console.log("   ✅ Configuration validated successfully");

      // Get model info
      const modelInfo = model.getModelInfo();
      console.log("   📊 Model Information:");
      console.log(`      Provider: ${modelInfo.provider}`);
      console.log(`      Model ID: ${modelInfo.modelId}`);
      console.log(`      Endpoint: ${modelInfo.endpointName}`);
      console.log(`      Region: ${modelInfo.region}`);

      // Test capabilities
      const capabilities = model.getModelCapabilities();
      console.log("   🎯 Model Capabilities:");
      console.log(`      Streaming: ${capabilities.capabilities.streaming}`);
      console.log(
        `      Tool Calling: ${capabilities.capabilities.toolCalling}`,
      );
      console.log(
        `      Structured Output: ${capabilities.capabilities.structuredOutput}`,
      );

      return { success: true, provider, model };
    } else {
      console.log("   ❌ Configuration validation failed");
      console.log(`      Error: ${connectivityTest.error}`);
      return { success: false, error: connectivityTest.error };
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
export async function createProviderFromConfigFile(configPath: string) {
  console.log("📋 Configuration Example 8: File-based Configuration");

  try {
    // Example config file structure
    const exampleConfig = {
      aws: {
        accessKeyId: "your-access-key",
        secretAccessKey: "your-secret-key",
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

    // For demonstration, using example config
    const provider = await AIProviderFactory.createProvider("sagemaker", {
      config: exampleConfig.aws,
      endpointName: exampleConfig.sagemaker.defaultEndpoint,
    });

    console.log("   ✅ Provider created from configuration file");
    return provider;
  } catch (error) {
    console.log("   ❌ Failed to load configuration from file");
    throw error;
  }
}

// Example 9: Dynamic Configuration Selection
export async function createProviderByEnvironment(
  environment: "development" | "staging" | "production",
) {
  console.log(
    `📋 Configuration Example 9: ${environment.toUpperCase()} Environment`,
  );

  const configurations = {
    development: {
      config: {
        accessKeyId: process.env.DEV_AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.DEV_AWS_SECRET_ACCESS_KEY!,
        region: "us-east-1",
        timeout: 60000,
        maxRetries: 1,
      },
      endpointName: "dev-model-endpoint",
      modelName: "development-model",
    },
    staging: {
      config: {
        accessKeyId: process.env.STAGING_AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.STAGING_AWS_SECRET_ACCESS_KEY!,
        region: "us-west-2",
        timeout: 45000,
        maxRetries: 2,
      },
      endpointName: "staging-model-endpoint",
      modelName: "staging-model",
    },
    production: {
      config: {
        accessKeyId: process.env.PROD_AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.PROD_AWS_SECRET_ACCESS_KEY!,
        region: process.env.PROD_AWS_REGION || "us-east-1",
        timeout: 30000,
        maxRetries: 3,
      },
      endpointName: process.env.PROD_SAGEMAKER_ENDPOINT!,
      modelName: "production-model",
    },
  };

  const config = configurations[environment];
  const provider = await AIProviderFactory.createProvider("sagemaker", config);

  console.log(`   ✅ ${environment} provider created`);
  return provider;
}

// Example 10: Configuration Best Practices Summary
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
        "Use connection pooling for high-throughput applications",
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
    await createProviderFromEnvironment();
    console.log();

    await createProviderWithExplicitConfig();
    console.log();

    await createDevelopmentProvider();
    console.log();

    await createProductionProvider();
    console.log();

    await createMultiRegionProviders();
    console.log();

    await createTypedModelProviders();
    console.log();

    await validateAndTestConfiguration();
    console.log();

    await createProviderFromConfigFile("./config/sagemaker.json");
    console.log();

    await createProviderByEnvironment("development");
    console.log();

    showConfigurationBestPractices();
  } catch (error) {
    console.error("❌ Error running configuration examples:");
    console.error(error instanceof Error ? error.message : String(error));
  }
}

// Run examples if this file is executed directly
if (require.main === module) {
  runAllConfigurationExamples();
}
