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

const text = await provider.generate({
  prompt: "Write a short poem about the sea",
  middleware: middlewareOptions,
});

if (text) {
  console.log("Provider created Example 1 unfiltered:", text.content);
}

const textWithBadWords = await provider.generate({
  prompt: "Write a short poem about the sea with badword1 and badword2",
  middleware: middlewareOptions,
});

if (textWithBadWords) {
  console.log("Provider created Example 2 filtered:", textWithBadWords.content);
}
