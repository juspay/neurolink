import dotenv from "dotenv";
dotenv.config();

import { createAIProvider, type EvaluationData } from "../../src/lib/index.js";

const provider = await createAIProvider("vertex");

const callback = (evaluation: EvaluationData) => {
  console.log("\n--- Evaluation Complete ---");
  console.log(
    "Auto-evaluation middleware invoked with evaluation:",
    evaluation,
  );
  console.log("-------------------------\n");
};

const middlewareOptions = {
  enabledMiddleware: ["autoEvaluation"],
  middlewareConfig: {
    autoEvaluation: {
      config: {
        provider: "vertex", // Provider to use for the evaluation
        evaluationModel: "gemini-2.5-pro", // Model for the evaluation
        onEvaluationComplete: callback,
        blocking: false, // Note: blocking is ignored for streams, but set for clarity
      },
    },
  },
};

console.log("--- Running Streaming Test Case ---");
const positiveResult = await provider.stream({
  input: { text: "What is the capital of France?" },
  context: { information: "The capital of France is Paris." },
  middleware: middlewareOptions,
  model: "gemini-2.5-flash",
});

if (positiveResult) {
  process.stdout.write("Provider Response: ");
  for await (const chunk of positiveResult.stream) {
    if ("content" in chunk && typeof chunk.content === "string") {
      process.stdout.write(chunk.content);
    }
  }
  console.log("\n");
}

console.log("--- Running Streaming Test Case ---");
const negativeResult = await provider.stream({
  input: { text: "If z = 2 - 3i, then find z^2." },
  context: { information: "The user wants to do maths" }, // Correct context
  middleware: middlewareOptions,
  model: "gemini-2.5-flash",
});

if (negativeResult) {
  process.stdout.write("Provider Response: ");
  for await (const chunk of negativeResult.stream) {
    if ("content" in chunk && typeof chunk.content === "string") {
      process.stdout.write(chunk.content);
    }
  }
  console.log("\n");
}
