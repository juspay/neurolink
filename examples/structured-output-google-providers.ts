/**
 * Example: Structured Output with Google Providers
 *
 * Demonstrates correct usage of Zod schemas with Google Gemini providers
 * (Vertex AI and Google AI Studio)
 */

import { z } from "zod";
import { NeuroLink } from "@juspay/neurolink";

const neurolink = new NeuroLink();

// Define schema
const CompanyAnalysisSchema = z.object({
  name: z.string().describe("Company name"),
  industry: z.string().describe("Industry sector"),
  strengths: z.array(z.string()).describe("Key strengths"),
  weaknesses: z.array(z.string()).describe("Key weaknesses"),
  recommendation: z.string().describe("Investment recommendation"),
});

async function exampleCorrectUsage() {
  console.log(
    "✅ CORRECT: Google providers with schemas require disableTools\n",
  );

  const result = await neurolink.generate({
    input: {
      text: "Analyze TechCorp as an investment opportunity. They are a cloud computing company with strong AWS market share but facing competition.",
    },
    schema: CompanyAnalysisSchema,
    output: { format: "json" },
    provider: "vertex", // or "google-ai"
    disableTools: true, // REQUIRED for Google providers
  });

  const analysis = JSON.parse(result.content);
  console.log("Analysis:", JSON.stringify(analysis, null, 2));
}

async function exampleIncorrectUsage() {
  console.log("\n❌ INCORRECT: Will fail with error\n");

  // This will fail with error:
  // "Function calling with a response mime type: 'application/json' is unsupported"

  try {
    const result = await neurolink.generate({
      input: {
        text: "Analyze TechCorp as an investment opportunity",
      },
      schema: CompanyAnalysisSchema,
      output: { format: "json" },
      provider: "vertex",
      // Missing: disableTools: true
    });
  } catch (error) {
    console.error("Expected error:", error);
  }
}

async function exampleOtherProviders() {
  console.log(
    "\n✅ Other providers (OpenAI, Anthropic) work without disableTools\n",
  );

  const result = await neurolink.generate({
    input: {
      text: "Analyze TechCorp as an investment opportunity",
    },
    schema: CompanyAnalysisSchema,
    output: { format: "json" },
    provider: "openai", // No restriction
    // disableTools not needed - OpenAI supports both
  });

  console.log("OpenAI result:", result.content);
}

async function exampleVertexClaude() {
  console.log("\n✅ Vertex AI with Claude models (no limitation)\n");

  const result = await neurolink.generate({
    input: {
      text: "Analyze TechCorp as an investment opportunity",
    },
    schema: CompanyAnalysisSchema,
    output: { format: "json" },
    provider: "vertex",
    model: "claude-sonnet-4-5@20250929",
    // No disableTools needed - Claude supports both
  });

  console.log("Claude via Vertex result:", result.content);
}

async function exampleComplexSchemaIssue() {
  console.log("\n⚠️ Complex schemas may trigger 'Too many states' error\n");

  // This schema is overly complex and may fail
  const ComplexSchema = z.object({
    level1: z.object({
      level2: z.object({
        level3: z.object({
          level4: z.object({
            data: z.string(),
          }),
        }),
      }),
    }),
    largeArray: z
      .array(
        z.object({
          field1: z.string(),
          field2: z.number(),
          field3: z.boolean(),
        }),
      )
      .max(100),
  });

  try {
    const result = await neurolink.generate({
      input: { text: "Generate complex data" },
      schema: ComplexSchema,
      output: { format: "json" },
      provider: "vertex",
      disableTools: true,
    });
  } catch (error) {
    console.error("Complex schema error:", error);
    console.log("\nSolution: Simplify schema or use different provider");
  }
}

// Main execution
async function main() {
  console.log("=".repeat(60));
  console.log("Structured Output with Google Providers Examples");
  console.log("=".repeat(60));

  await exampleCorrectUsage();
  await exampleIncorrectUsage();
  await exampleOtherProviders();
  await exampleVertexClaude();
  await exampleComplexSchemaIssue();

  await neurolink.dispose();
}

main().catch(console.error);
