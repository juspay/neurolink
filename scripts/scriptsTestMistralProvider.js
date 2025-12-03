import { AIProviderFactory } from "../dist/lib/core/factory.js";
import chalk from "chalk";
import ora from "ora";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

async function testMistralProvider() {
  console.log(chalk.bold.blue("🧪 Testing Mistral AI Provider"));
  console.log("===================================\n");

  // Check if API key is set
  if (!process.env.MISTRAL_API_KEY) {
    console.log(chalk.red("❌ MISTRAL_API_KEY not found in environment"));
    console.log(chalk.yellow("\nPlease add to your .env file:"));
    console.log(chalk.gray("MISTRAL_API_KEY=your-mistral-api-key-here"));
    console.log(chalk.gray("MISTRAL_MODEL=mistral-small"));
    return;
  }

  console.log(chalk.green("✅ API Key found"));
  console.log(
    chalk.gray(`Model: ${process.env.MISTRAL_MODEL || "mistral-small"}\n`),
  );

  const spinner = ora("Creating Mistral provider...").start();

  try {
    // Create provider
    const provider = AIProviderFactory.createProvider("mistral");
    spinner.succeed("Provider created successfully");

    // Test 1: Simple generation
    spinner.start("Testing text generation...");
    const response1 = await provider.generate({
      input: { text: "Write a haiku about artificial intelligence" },
      maxTokens: 100,
      temperature: 0.7,
    });
    spinner.succeed("Text generation successful");
    console.log(chalk.cyan("\nResponse:"), response1.text);

    // Test 2: Multilingual (French)
    spinner.start("\nTesting multilingual support (French)...");
    const response2 = await provider.generate({
      input: { text: "Écrivez un court poème sur Paris en français" },
      maxTokens: 150,
      temperature: 0.7,
    });
    spinner.succeed("Multilingual generation successful");
    console.log(chalk.cyan("\nFrench Response:"), response2.text);

    // Test 3: Code generation
    spinner.start("\nTesting code generation...");
    const response3 = await provider.generate({
      input: { text: "Write a JavaScript function to calculate fibonacci numbers" },
      maxTokens: 200,
      temperature: 0.3,
    });
    spinner.succeed("Code generation successful");
    console.log(chalk.cyan("\nCode Response:"), response3.text);

    console.log(chalk.bold.green("\n✅ All Mistral AI tests passed!"));
    console.log(chalk.gray("\nMistral AI is ready to use in NeuroLink"));
  } catch (error) {
    spinner.fail("Test failed");
    console.error(chalk.red("\n❌ Error:"), error.message);

    if (error.message.includes("401")) {
      console.log(
        chalk.yellow("\n💡 Invalid API key. Please check your MISTRAL_API_KEY"),
      );
    } else if (error.message.includes("429")) {
      console.log(
        chalk.yellow("\n💡 Rate limit exceeded. Please try again later"),
      );
    } else {
      console.log(
        chalk.yellow(
          "\n💡 Make sure you have a valid Mistral AI account and API key",
        ),
      );
    }
  }
}

// Run the test
testMistralProvider().catch(console.error);
