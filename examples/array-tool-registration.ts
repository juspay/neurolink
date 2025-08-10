/**
 * Unified Tool Registration Example
 * Shows how to register multiple tools using both object and array formats
 */

import { NeuroLink } from "../src/lib/neurolink.js";
import { z } from "zod";

// Example: Register tools using unified registerTools() method
async function demonstrateUnifiedToolRegistration() {
  console.log("🔧 Unified Tool Registration Demo\n");

  const neurolink = new NeuroLink();

  // Define tools in an array format
  const toolsArray = [
    {
      name: "calculator",
      tool: {
        description: "Performs basic mathematical calculations",
        parameters: z.object({
          operation: z.enum(["add", "subtract", "multiply", "divide"]),
          a: z.number(),
          b: z.number(),
        }),
        execute: async (params: any) => {
          const { operation, a, b } = params;
          switch (operation) {
            case "add":
              return a + b;
            case "subtract":
              return a - b;
            case "multiply":
              return a * b;
            case "divide":
              return b !== 0 ? a / b : "Cannot divide by zero";
            default:
              return "Invalid operation";
          }
        },
      },
    },
    {
      name: "weather",
      tool: {
        description: "Gets weather information for a location",
        parameters: z.object({
          location: z.string(),
          units: z.enum(["celsius", "fahrenheit"]).optional(),
        }),
        execute: async (params: any) => {
          const { location, units = "celsius" } = params;
          // Mock weather data
          return {
            location,
            temperature: units === "celsius" ? "22°C" : "72°F",
            condition: "Sunny",
            humidity: "65%",
          };
        },
      },
    },
    {
      name: "greeter",
      tool: {
        description: "Generates personalized greetings",
        parameters: z.object({
          name: z.string(),
          timeOfDay: z.enum(["morning", "afternoon", "evening"]).optional(),
        }),
        execute: async (params: any) => {
          const { name, timeOfDay = "morning" } = params;
          const greetings = {
            morning: "Good morning",
            afternoon: "Good afternoon",
            evening: "Good evening",
          };
          return `${greetings[timeOfDay]}, ${name}! Have a wonderful day!`;
        },
      },
    },
  ];

  // Register all tools using the unified method (array format)
  console.log("📝 Registering tools from array using unified method...");
  neurolink.registerTools(toolsArray);
  console.log(`✅ Registered ${toolsArray.length} tools from array\n`);

  // Also demonstrate object format registration
  const objectTools = {
    textFormatter: {
      description: "Format text in various ways",
      parameters: z.object({
        text: z.string(),
        format: z.enum(["uppercase", "lowercase", "capitalize"]),
      }),
      execute: async ({ text, format }: any) => {
        switch (format) {
          case "uppercase":
            return text.toUpperCase();
          case "lowercase":
            return text.toLowerCase();
          case "capitalize":
            return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
          default:
            return text;
        }
      },
    },
  };

  console.log("📝 Registering tools from object using unified method...");
  neurolink.registerTools(objectTools);
  console.log(`✅ Registered object tools\n`);

  // List all available tools
  const allTools = await neurolink.getAllAvailableTools();
  const customTools = allTools.filter(
    (tool) => tool.category === "user-defined",
  );

  console.log("🔧 Available Tools:");
  for (const tool of customTools) {
    console.log(`   - ${tool.name}: ${tool.description}`);
  }

  // Test tools through AI generation (proper usage)
  console.log("\n🧪 Testing Tools via AI Generation:\n");

  try {
    // Test with generate() method
    console.log("1️⃣ Generate Test (with tools):");
    const generateResult = await neurolink.generate({
      input: {
        text: "Calculate 15 × 7 and format the result text to uppercase",
      },
      provider: "auto",
    });
    console.log(`   AI Response: ${generateResult.content}\n`);

    if (
      generateResult.toolExecutions &&
      generateResult.toolExecutions.length > 0
    ) {
      console.log(
        `   🔧 Tools used: ${generateResult.toolExecutions.map((t) => t.name).join(", ")}\n`,
      );
    }

    // Test with stream() method
    console.log("2️⃣ Stream Test (with tools):");
    const streamResult = await neurolink.stream({
      input: {
        text: "What's the weather like in San Francisco and greet me for the afternoon?",
      },
      provider: "auto",
    });

    console.log("   AI Streaming Response:");
    for await (const chunk of streamResult.stream) {
      process.stdout.write(chunk.content);
    }
    console.log("\n");
  } catch (error) {
    console.log("   ⚠️  AI generation requires provider configuration");
    console.log(
      "   💡 This example demonstrates tool registration - tools would be used automatically by AI\n",
    );
  }

  // Show tool statistics
  const customToolsMap = neurolink.getCustomTools();
  console.log("📊 Tool Registration Summary:");
  console.log(`   - Total custom tools: ${customToolsMap.size}`);
  console.log(
    `   - Tool names: ${Array.from(customToolsMap.keys()).join(", ")}`,
  );

  console.log("\n✅ Unified tool registration completed successfully!");

  return {
    toolsRegistered: customToolsMap.size,
    toolNames: Array.from(customToolsMap.keys()),
    registrationFormats: {
      arrayFormat: ["calculator", "weather", "greeter"],
      objectFormat: ["textFormatter"],
    },
  };
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  demonstrateUnifiedToolRegistration()
    .then((result) => {
      console.log("\n🎉 Demo completed:", result);
    })
    .catch((error) => {
      console.error("\n❌ Demo failed:", error);
    });
}

export { demonstrateUnifiedToolRegistration };
