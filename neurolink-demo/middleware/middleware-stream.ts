import { createAIProvider } from "../../src/lib/index";
import dotenv from "dotenv";

dotenv.config();

const provider = await createAIProvider("vertex");

const customMiddleware = {
  metadata: { id: "custom-only", name: "Custom Only" },
  wrapGenerate: async ({ doGenerate, params: _params }) => {
    const result = await doGenerate();
    console.log("Custom Middleware Invoked here");
    return result;
  },
};

const middlewareOptions = {
  middleware: [customMiddleware],
  enabledMiddleware: ["guardrails", "custom-only"],
  middlewareConfig: {
    guardrails: {
      config: {
        badWords: {
          enabled: true,
          list: ["badword1", "badword2"],
        },
      },
    },
  },
};

async function getStreamText(streamResult) {
  for await (const chunk of streamResult.stream) {
    if ("content" in chunk) {
      console.log(chunk.content);
    }
  }
}

const result1 = await provider.stream({
  input: { text: "Write a short poem about the sea in 20 words max" },
  middleware: middlewareOptions,
});

console.log("Provider created Example 1 unfiltered:");
await getStreamText(result1);

const result2 = await provider.stream({
  input: {
    text: "Write a short poem about the sea with badword1 and badword2",
  },
  middleware: middlewareOptions,
});

console.log("--------------------------------------------");

console.log("Provider created Example 2 filtered:");
await getStreamText(result2);
