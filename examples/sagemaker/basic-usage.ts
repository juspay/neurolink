/**
 * Basic SageMaker Provider Usage Example
 *
 * This example demonstrates the fundamental usage patterns of the SageMaker provider
 * including initialization, text generation, and error handling.
 */

import { AIProviderFactory } from "@juspay/neurolink";

async function basicUsageExample() {
  console.log("🚀 SageMaker Provider - Basic Usage Example\n");

  try {
    // 1. Initialize the provider using factory pattern
    console.log("1. Initializing SageMaker provider...");
    const provider = await AIProviderFactory.createProvider("sagemaker", {
      endpointName: process.env.SAGEMAKER_ENDPOINT_NAME || "my-custom-endpoint",
    });

    // 2. Test connectivity
    console.log("2. Testing connectivity...");
    const connectivityTest = await provider.testConnectivity();
    if (!connectivityTest.success) {
      throw new Error(`Connectivity test failed: ${connectivityTest.error}`);
    }
    console.log("✅ Connectivity test passed");

    // 3. Basic text generation
    console.log("\n3. Generating text...");
    const result = await provider.generate({
      prompt:
        "You are a helpful assistant. What are the benefits of using AWS SageMaker for machine learning?",
      maxTokens: 200,
      temperature: 0.7,
    });

    console.log("📝 Generated Response:");
    console.log(`   Input tokens: ${result.usage?.inputTokens || "N/A"}`);
    console.log(`   Output tokens: ${result.usage?.outputTokens || "N/A"}`);
    console.log(`   Total tokens: ${result.usage?.totalTokens || "N/A"}`);
    console.log(`   Response: ${result.text}\n`);

    // 4. Follow-up question
    console.log("4. Follow-up question...");
    const conversationResult = await provider.generate({
      prompt:
        "Based on your previous answer about SageMaker, can you give me a simple example of how it's used?",
      maxTokens: 150,
      temperature: 0.6,
    });

    console.log("🗨️  Follow-up Response:");
    console.log(`   Response: ${conversationResult.text}\n`);

    // 5. Provider information
    console.log("5. Provider information:");
    const providerInfo = provider.getProviderInfo();
    console.log(`   Provider: ${providerInfo.name}`);
    console.log(
      `   Endpoint: ${providerInfo.config?.endpointName || "Default"}`,
    );
    console.log(`   Region: ${providerInfo.config?.region || "Default"}\n`);

    console.log("✅ Basic usage example completed successfully!");
  } catch (error) {
    console.error("❌ Error in basic usage example:");
    console.error(error instanceof Error ? error.message : String(error));

    // Common error scenarios and solutions
    if (error instanceof Error) {
      const message = error.message.toLowerCase();

      if (message.includes("credentials") || message.includes("access")) {
        console.log("\n💡 Solution: Check your AWS credentials");
        console.log('   export AWS_ACCESS_KEY_ID="your_key"');
        console.log('   export AWS_SECRET_ACCESS_KEY="your_secret"');
        console.log('   export AWS_REGION="us-east-1"');
      } else if (
        message.includes("endpoint") ||
        message.includes("not found")
      ) {
        console.log("\n💡 Solution: Check your SageMaker endpoint");
        console.log('   export SAGEMAKER_ENDPOINT_NAME="your_endpoint"');
        console.log("   aws sagemaker list-endpoints");
      } else if (message.includes("timeout") || message.includes("network")) {
        console.log(
          "\n💡 Solution: Check network connectivity and timeout settings",
        );
        console.log('   export SAGEMAKER_TIMEOUT="60000"');
      }
    }

    process.exit(1);
  }
}

// Run the example
if (require.main === module) {
  basicUsageExample();
}
