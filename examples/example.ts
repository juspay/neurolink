import {
  NeuroLink,
  setLangfuseContext,
  type StreamResult,
} from "../dist/index.js";
import { randomUUID } from "crypto";

const neurolink = new NeuroLink({
  observability: {
    langfuse: {
      enabled: true,
      publicKey: process.env.LANGFUSE_PUBLIC_KEY!,
      secretKey: process.env.LANGFUSE_SECRET_KEY!,
      baseUrl: process.env.LANGFUSE_BASE_URL || "https://cloud.langfuse.com",
      environment: process.env.PUBLIC_APP_ENVIRONMENT || "dev",
    },
  },
});

async function main(): Promise<void> {
  const result = await setLangfuseContext<StreamResult>(
    {
      userId: "kitty",
      sessionId: randomUUID(),
      metadata: {
        text: "metadata can also be customized like this",
      },
    },
    () =>
      neurolink.stream({
        input: { text: "meow" },
        provider: "azure",
        maxTokens: 1000,
        temperature: 0.7,
        context: {
          merchantId: "falafel",
        },
      }),
  );

  if (!result) {
    return;
  }

  for await (const chunk of result.stream) {
    if ("content" in chunk && chunk.content) {
      process.stdout.write(chunk.content || "");
    }
  }

  await neurolink.shutdown();
}

main().catch(console.error);
