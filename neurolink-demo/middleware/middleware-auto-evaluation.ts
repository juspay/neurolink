import dotenv from "dotenv";
dotenv.config(); // Ensure env variables are loaded first

import { createAIProvider, type EvaluationData } from "../../src/lib/index.js";

const provider = await createAIProvider("vertex");

const callback = (evaluation: EvaluationData) => {
  console.log(
    "Auto-evaluation middleware invoked with evaluation:",
    evaluation,
  );
};

const middlewareOptions = {
  enabledMiddleware: ["autoEvaluation"],
  middlewareConfig: {
    autoEvaluation: {
      config: {
        provider: "vertex", // Provider to use for the evaluation
        evaluationModel: "gemini-2.5-pro", // Model for the evaluation
        onEvaluationComplete: callback,
        blocking: false,
      },
    },
  },
};

console.log("-- Running Test Case ---");
const negativeResult = await provider.generate({
  prompt:
    "If z = 2 - 3i + 4i^2 + 641451134, then find z^2. Do it one step only ", // Intentionally incorrect statement
  context: { information: "The user wants to do maths" }, // Correct context
  middleware: middlewareOptions,
  model: "gemini-2.5-flash",
});

if (negativeResult) {
  console.log("Provider Response (Incorrect):", negativeResult.content);
}
