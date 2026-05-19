// NOTE: This example requires the Vercel AI SDK (`ai`) as a peer dependency
// (`pnpm add ai zod`). NeuroLink uses `ai` internally via the distributed seam
// (`src/lib/utils/{tool,generation,generationErrors}.ts`) but does NOT re-export
// `tool` on its public surface. Consumers who want to construct tools must
// import `tool` directly from `"ai"` until a future major release elevates it
// into the NeuroLink public API (memory-bank/native-runtime/).
import { z } from "zod";
import { tool } from "ai";
import { NeuroLink } from "../dist/index.js";

// Initialize NeuroLink
const neurolink = new NeuroLink();

// Define schemas
const WeatherSchema = z.object({
  location: z.string(),
  temperature: z.number(),
  conditions: z.string(),
  humidity: z.number(),
  windSpeed: z.number(),
});

const UserProfileSchema = z.object({
  name: z.string(),
  age: z.number(),
  email: z.string(),
  occupation: z.string(),
  hobbies: z.array(z.string()),
});

// Complex schema for large object test
const CompanyAnalysisSchema = z.object({
  companyName: z.string(),
  industry: z.string(),
  foundedYear: z.number(),
  headquarters: z.object({
    city: z.string(),
    country: z.string(),
    address: z.string(),
  }),
  financials: z.object({
    revenue: z.number(),
    profit: z.number(),
    expenses: z.number(),
    growthRate: z.number(),
  }),
  employees: z.array(
    z.object({
      name: z.string(),
      role: z.string(),
      department: z.string(),
      salary: z.number(),
      yearsAtCompany: z.number(),
    }),
  ),
  products: z.array(
    z.object({
      name: z.string(),
      description: z.string(),
      price: z.number(),
      category: z.string(),
      inStock: z.boolean(),
    }),
  ),
  marketAnalysis: z.object({
    marketShare: z.number(),
    competitors: z.array(z.string()),
    strengths: z.array(z.string()),
    weaknesses: z.array(z.string()),
    opportunities: z.array(z.string()),
    threats: z.array(z.string()),
  }),
  futureProjections: z.object({
    nextQuarterRevenue: z.number(),
    nextYearRevenue: z.number(),
    expectedGrowth: z.number(),
    riskFactors: z.array(z.string()),
  }),
});

// Define a mock weather tool
const getWeatherTool = tool({
  description: "Get current weather for a location",
  parameters: z.object({
    location: z.string().describe("The location to get weather for"),
  }),
  execute: async ({ location }) => {
    console.log(`[Tool] Getting weather for: ${location}`);
    return {
      location,
      temperature: 22,
      conditions: "Sunny",
      humidity: 65,
      windSpeed: 15,
    };
  },
});

async function testStructuredOutputWithoutTools() {
  console.log("\n=== Test 1: Structured Output WITHOUT Tools ===");

  try {
    const result = await neurolink.generate({
      input: {
        text: "Tell me about John Doe, a 30-year-old software engineer who likes hiking and photography",
      },
      schema: UserProfileSchema,
      output: { format: "json" },
      provider: "vertex",
      model: "claude-sonnet-4-5@20250929",
    });

    console.log("✅ Generation completed");
    console.log("Provider:", result.provider);
    console.log("Model:", result.model);
    console.log("Raw content:", result.content);

    // Parse and validate
    const parsed = JSON.parse(result.content);
    console.log("Parsed object:", parsed);

    // Validate against schema
    const validated = UserProfileSchema.parse(parsed);
    console.log("✅ Schema validation passed");
    console.log("Validated data:", validated);

    return true;
  } catch (error) {
    console.error("❌ Test failed:", (error as Error).message);
    return false;
  }
}

async function testStructuredOutputWithTools() {
  console.log("\n=== Test 2: Structured Output WITH Tools ===");

  try {
    const result = await neurolink.generate({
      input: {
        text: "What's the weather like in San Francisco?",
      },
      schema: WeatherSchema,
      output: { format: "json" },
      provider: "vertex",
      model: "claude-sonnet-4-5@20250929",
      tools: {
        getWeather: getWeatherTool,
      },
    });

    console.log("✅ Generation completed");
    console.log("Provider:", result.provider);
    console.log("Model:", result.model);
    console.log("Tools used:", result.toolsUsed);
    console.log("Tool executions:", result.toolExecutions);
    console.log("Raw content:", result.content);

    // Parse and validate
    const parsed = JSON.parse(result.content);
    console.log("Parsed object:", parsed);

    // Validate against schema
    const validated = WeatherSchema.parse(parsed);
    console.log("✅ Schema validation passed");
    console.log("Validated data:", validated);

    // Verify tool was called
    if (result.toolsUsed && result.toolsUsed.length > 0) {
      console.log("✅ Tools were executed");
    } else {
      console.warn("⚠️ No tools were executed");
    }

    return true;
  } catch (error) {
    console.error("❌ Test failed:", (error as Error).message);
    console.error("Error stack:", (error as Error).stack);
    return false;
  }
}

async function testLargeComplexObject() {
  console.log("\n=== Test 3: Large Complex Object ===");

  try {
    const result = await neurolink.generate({
      input: {
        text: "Analyze TechCorp, a technology company founded in 2010. Include details about their operations, financials, team, products, and market position.",
      },
      output: { format: "json" },
      schema: CompanyAnalysisSchema,
      provider: "vertex",
      model: "claude-sonnet-4-5@20250929",
    });

    console.log("✅ Generation completed");
    console.log("Provider:", result.provider);
    console.log("Model:", result.model);
    console.log("Content length:", result.content.length, "characters");

    // Parse and validate
    const parsed = JSON.parse(result.content);
    console.log("Parsed object keys:", Object.keys(parsed));
    console.log("Number of employees:", parsed.employees?.length);
    console.log("Number of products:", parsed.products?.length);

    // Validate against schema
    const validated = CompanyAnalysisSchema.parse(parsed);
    console.log("✅ Schema validation passed");
    console.log("Company name:", validated.companyName);
    console.log("Revenue:", validated.financials.revenue);
    console.log("Market share:", validated.marketAnalysis.marketShare);

    return true;
  } catch (error) {
    console.error("❌ Test failed:", (error as Error).message);
    console.error("Error details:", error);
    return false;
  }
}

async function testRegularTextGeneration() {
  console.log(
    "\n=== Test 4: Regular Text Generation (Backward Compatibility) ===",
  );

  try {
    const result = await neurolink.generate({
      input: { text: "Say hello in one sentence" },
      provider: "vertex",
      model: "claude-sonnet-4-5@20250929",
    });

    console.log("✅ Generation completed");
    console.log("Provider:", result.provider);
    console.log("Model:", result.model);
    console.log("Content:", result.content);

    // Ensure it's NOT JSON
    if (typeof result.content === "string" && result.content.length > 0) {
      console.log("✅ Regular text generation works");
      return true;
    } else {
      console.error("❌ Unexpected content type");
      return false;
    }
  } catch (error) {
    console.error("❌ Test failed:", (error as Error).message);
    return false;
  }
}

async function runAllTests() {
  console.log("🧪 Starting Structured Output Tests\n");

  const results = {
    test1: await testStructuredOutputWithoutTools(),
    test2: await testStructuredOutputWithTools(),
    test3: await testLargeComplexObject(),
    test4: await testRegularTextGeneration(),
  };

  console.log("\n=== Test Summary ===");
  console.log(
    "Test 1 (Structured without tools):",
    results.test1 ? "✅ PASS" : "❌ FAIL",
  );
  console.log(
    "Test 2 (Structured with tools):",
    results.test2 ? "✅ PASS" : "❌ FAIL",
  );
  console.log(
    "Test 3 (Large complex object):",
    results.test3 ? "✅ PASS" : "❌ FAIL",
  );
  console.log("Test 4 (Regular text):", results.test4 ? "✅ PASS" : "❌ FAIL");

  const allPassed = Object.values(results).every((r) => r === true);
  console.log(
    "\nOverall:",
    allPassed ? "✅ ALL TESTS PASSED" : "❌ SOME TESTS FAILED",
  );

  process.exit(allPassed ? 0 : 1);
}

runAllTests().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
