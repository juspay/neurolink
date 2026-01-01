# Migrating from LangChain to NeuroLink

## Why Migrate?

NeuroLink offers a simpler, more production-ready alternative to LangChain with these key advantages:

| Benefit                 | LangChain                                   | NeuroLink                                          |
| ----------------------- | ------------------------------------------- | -------------------------------------------------- |
| **TypeScript Support**  | Partial, many type issues                   | Full native TypeScript, complete type safety       |
| **API Complexity**      | Complex chains, agents, memory abstractions | Single unified `generate()` API                    |
| **Provider Support**    | Requires separate packages                  | 13 providers built-in, single package              |
| **Enterprise Features** | Limited                                     | HITL workflows, Redis memory, middleware, failover |
| **MCP Integration**     | None                                        | Native 58+ MCP servers with zero config            |
| **Bundle Size**         | Large (many dependencies)                   | Optimized, tree-shakeable                          |
| **Production Ready**    | Community-driven                            | Battle-tested at Juspay (enterprise scale)         |

**Migration time:** Most applications can migrate in 1-2 hours, with full feature parity and improved capabilities.

---

## Concept Mapping

Understanding how LangChain concepts map to NeuroLink:

| LangChain Concept                   | NeuroLink Equivalent        | Notes                            |
| ----------------------------------- | --------------------------- | -------------------------------- |
| `ChatOpenAI`, `ChatAnthropic`, etc. | `provider` parameter        | Single unified interface         |
| `LLMChain`                          | `generate()` method         | No chain abstraction needed      |
| `ConversationChain`                 | `conversationMemory` config | Built-in conversation tracking   |
| `Agent` + `Tools`                   | MCP Tools                   | Native tool support, 58+ servers |
| `Memory` (BufferMemory, etc.)       | `conversationMemory`        | Redis or in-memory               |
| `Callbacks`                         | Middleware system           | More powerful, composable        |
| `VectorStoreRetriever`              | Custom tools + external MCP | Use MCP for RAG integrations     |
| `OutputParser`                      | `structuredOutput`          | Zod schema validation            |
| `PromptTemplate`                    | Template literals / utils   | Use native JS/TS patterns        |

---

## Quick Start Migration

### Before (LangChain)

```typescript
import { ChatOpenAI } from "langchain/chat_models/openai";
import { HumanMessage } from "langchain/schema";

const chat = new ChatOpenAI({
  modelName: "gpt-4",
  temperature: 0.7,
});

const response = await chat.call([new HumanMessage("Hello, how are you?")]);

console.log(response.content);
```

### After (NeuroLink)

```typescript
import { NeuroLink } from "@juspay/neurolink";

const neurolink = new NeuroLink({
  provider: "openai",
  model: "gpt-4",
});

const result = await neurolink.generate({
  input: { text: "Hello, how are you?" },
  temperature: 0.7,
});

console.log(result.content);
```

**Key changes:**

- Single import instead of multiple
- Unified `generate()` method instead of `call()`
- Simpler message format (no `HumanMessage` wrapper)
- Type-safe result with `content` property

---

## Feature-by-Feature Migration

### 1. Chat Models

**LangChain:**

```typescript
import { ChatOpenAI } from "langchain/chat_models/openai";
import { ChatAnthropic } from "langchain/chat_models/anthropic";

// OpenAI
const openai = new ChatOpenAI({ modelName: "gpt-4" });

// Anthropic
const anthropic = new ChatAnthropic({
  modelName: "claude-3-5-sonnet-20241022",
});
```

**NeuroLink:**

```typescript
import { NeuroLink } from "@juspay/neurolink";

// OpenAI
const openai = new NeuroLink({ provider: "openai", model: "gpt-4" });

// Anthropic
const anthropic = new NeuroLink({
  provider: "anthropic",
  model: "claude-3-5-sonnet-20241022",
});

// Or switch providers dynamically
const neurolink = new NeuroLink();
const result1 = await neurolink.generate({
  input: { text: "Hello" },
  provider: "openai",
});
const result2 = await neurolink.generate({
  input: { text: "Hello" },
  provider: "anthropic",
});
```

**Benefits:**

- No separate packages for each provider
- Consistent API across all 13 providers
- Runtime provider switching
- Automatic failover

---

### 2. Chains

**LangChain:**

```typescript
import { LLMChain } from "langchain/chains";
import { ChatOpenAI } from "langchain/chat_models/openai";
import { PromptTemplate } from "langchain/prompts";

const prompt = PromptTemplate.fromTemplate(
  "Write a {adjective} story about {subject}",
);

const chain = new LLMChain({
  llm: new ChatOpenAI(),
  prompt,
});

const result = await chain.call({
  adjective: "funny",
  subject: "a robot",
});
```

**NeuroLink:**

```typescript
import { NeuroLink } from "@juspay/neurolink";

const neurolink = new NeuroLink({ provider: "openai" });

// Use template literals (native JS)
const generateStory = async (adjective: string, subject: string) => {
  return await neurolink.generate({
    input: {
      text: `Write a ${adjective} story about ${subject}`,
    },
  });
};

const result = await generateStory("funny", "a robot");
```

**Benefits:**

- No chain abstraction needed
- Use native JavaScript template literals
- More flexible, easier to debug
- Direct control over prompts

---

### 3. Agents and Tools

**LangChain:**

```typescript
import { initializeAgentExecutorWithOptions } from "langchain/agents";
import { ChatOpenAI } from "langchain/chat_models/openai";
import { Calculator } from "langchain/tools/calculator";
import { SerpAPI } from "langchain/tools";

const model = new ChatOpenAI({ temperature: 0 });
const tools = [new Calculator(), new SerpAPI()];

const executor = await initializeAgentExecutorWithOptions(tools, model, {
  agentType: "chat-conversational-react-description",
});

const result = await executor.call({
  input: "What's 25 * 4, and what's the weather in NYC?",
});
```

**NeuroLink:**

```typescript
import { NeuroLink } from "@juspay/neurolink";

const neurolink = new NeuroLink({ provider: "openai" });

// Built-in tools work automatically
const result = await neurolink.generate({
  input: {
    text: "What's 25 * 4?", // Uses built-in calculateMath tool
  },
});

// Add external MCP tools
await neurolink.addExternalMCPServer("serpapi", {
  command: "npx",
  args: ["-y", "@modelcontextprotocol/server-serpapi"],
  transport: "stdio",
  env: { SERPAPI_API_KEY: process.env.SERPAPI_API_KEY },
});

const result2 = await neurolink.generate({
  input: {
    text: "What's the weather in NYC?", // Uses SerpAPI MCP tool
  },
});
```

**Benefits:**

- 6 core tools work out-of-the-box (no setup)
- 58+ MCP servers available
- No complex agent configuration
- AI automatically chooses tools

---

### 4. Memory

**LangChain:**

```typescript
import { ConversationChain } from "langchain/chains";
import { ChatOpenAI } from "langchain/chat_models/openai";
import { BufferMemory } from "langchain/memory";

const memory = new BufferMemory();
const model = new ChatOpenAI();

const chain = new ConversationChain({ llm: model, memory });

await chain.call({ input: "Hi, I'm John" });
await chain.call({ input: "What's my name?" }); // Remembers "John"
```

**NeuroLink:**

```typescript
import { NeuroLink } from "@juspay/neurolink";

const neurolink = new NeuroLink({
  provider: "openai",
  conversationMemory: {
    enabled: true,
    store: "in-memory", // or "redis" for distributed
  },
});

await neurolink.generate({
  input: { text: "Hi, I'm John" },
});

await neurolink.generate({
  input: { text: "What's my name?" }, // Remembers "John"
});
```

**With Redis (production):**

```typescript
const neurolink = new NeuroLink({
  provider: "openai",
  conversationMemory: {
    enabled: true,
    store: "redis",
    redis: {
      host: "localhost",
      port: 6379,
    },
    ttl: 86400, // 24 hours
  },
});
```

**Benefits:**

- Built-in conversation tracking
- Redis support for distributed systems
- Automatic context management
- Export conversations to JSON

---

### 5. Callbacks

**LangChain:**

```typescript
import { ChatOpenAI } from "langchain/chat_models/openai";
import { ConsoleCallbackHandler } from "langchain/callbacks";

const model = new ChatOpenAI({
  callbacks: [new ConsoleCallbackHandler()],
});

await model.call([new HumanMessage("Hello")]);
```

**NeuroLink:**

```typescript
import { NeuroLink } from "@juspay/neurolink";

const neurolink = new NeuroLink({ provider: "openai" });

// Use middleware for callbacks
neurolink.useMiddleware({
  name: "logging",
  requestHook: async (options) => {
    console.log("Request:", options);
    return options;
  },
  responseHook: async (result) => {
    console.log("Response:", result);
    return result;
  },
});

await neurolink.generate({
  input: { text: "Hello" },
});
```

**Built-in middleware:**

```typescript
import { NeuroLink } from "@juspay/neurolink";

const neurolink = new NeuroLink({
  provider: "openai",
  middleware: {
    analytics: { enabled: true },
    autoEvaluation: { enabled: true },
  },
});
```

**Benefits:**

- More powerful than callbacks
- Composable middleware system
- Built-in analytics and auto-evaluation
- Request and response hooks

---

## Common Patterns

### Pattern 1: RAG Applications

**LangChain:**

```typescript
import { ChatOpenAI } from "langchain/chat_models/openai";
import { HNSWLib } from "langchain/vectorstores/hnswlib";
import { OpenAIEmbeddings } from "langchain/embeddings/openai";
import { RetrievalQAChain } from "langchain/chains";

const vectorStore = await HNSWLib.fromTexts(
  ["text1", "text2"],
  [{ id: 1 }, { id: 2 }],
  new OpenAIEmbeddings(),
);

const model = new ChatOpenAI();
const chain = RetrievalQAChain.fromLLM(model, vectorStore.asRetriever());

const response = await chain.call({
  query: "What is the answer?",
});
```

**NeuroLink:**

```typescript
import { NeuroLink } from "@juspay/neurolink";

const neurolink = new NeuroLink({ provider: "openai" });

// Option 1: Use MCP server for vector search
await neurolink.addExternalMCPServer("postgres", {
  command: "npx",
  args: ["-y", "@modelcontextprotocol/server-postgres"],
  transport: "stdio",
  env: {
    DATABASE_URL: process.env.DATABASE_URL,
  },
});

// AI can now query vector DB directly via MCP
const result = await neurolink.generate({
  input: {
    text: "Search the knowledge base for information about X",
  },
});

// Option 2: Manual retrieval + context
const retrieveContext = async (query: string) => {
  // Your vector search logic
  return ["relevant doc 1", "relevant doc 2"];
};

const docs = await retrieveContext("What is the answer?");
const result = await neurolink.generate({
  input: {
    text: `Context: ${docs.join("\n\n")}\n\nQuestion: What is the answer?`,
  },
});
```

**Benefits:**

- Use MCP for database/vector integrations
- More flexible retrieval strategies
- Direct control over context injection

---

### Pattern 2: Chatbots

**LangChain:**

```typescript
import { ConversationChain } from "langchain/chains";
import { ChatOpenAI } from "langchain/chat_models/openai";
import { BufferWindowMemory } from "langchain/memory";

const memory = new BufferWindowMemory({ k: 5 });
const model = new ChatOpenAI({ temperature: 0.7 });
const chain = new ConversationChain({
  llm: model,
  memory,
});

// Chat loop
while (true) {
  const input = await getUserInput();
  const response = await chain.call({ input });
  console.log(response.response);
}
```

**NeuroLink:**

```typescript
import { NeuroLink } from "@juspay/neurolink";

const neurolink = new NeuroLink({
  provider: "openai",
  temperature: 0.7,
  conversationMemory: {
    enabled: true,
    store: "redis", // Production-ready
    maxMessages: 10, // Keep last 10 messages
  },
});

// Chat loop
while (true) {
  const input = await getUserInput();
  const result = await neurolink.generate({
    input: { text: input },
  });
  console.log(result.content);
}

// Export conversation history
const history = await neurolink.exportConversation({
  format: "json",
});
```

**Benefits:**

- Redis support for multi-instance deployments
- Automatic context windowing
- Export conversations for analytics
- Built-in conversation management

---

### Pattern 3: Multi-step Workflows

**LangChain:**

```typescript
import { SequentialChain, LLMChain } from "langchain/chains";
import { ChatOpenAI } from "langchain/chat_models/openai";
import { PromptTemplate } from "langchain/prompts";

const llm = new ChatOpenAI();

// Step 1: Generate outline
const outlineChain = new LLMChain({
  llm,
  prompt: PromptTemplate.fromTemplate("Create outline for: {topic}"),
  outputKey: "outline",
});

// Step 2: Write content
const contentChain = new LLMChain({
  llm,
  prompt: PromptTemplate.fromTemplate("Write content for: {outline}"),
  outputKey: "content",
});

const overall = new SequentialChain({
  chains: [outlineChain, contentChain],
  inputVariables: ["topic"],
  outputVariables: ["outline", "content"],
});

const result = await overall.call({ topic: "AI" });
```

**NeuroLink:**

```typescript
import { NeuroLink } from "@juspay/neurolink";

const neurolink = new NeuroLink({ provider: "openai" });

const createContent = async (topic: string) => {
  // Step 1: Generate outline
  const outlineResult = await neurolink.generate({
    input: { text: `Create an outline for: ${topic}` },
  });

  // Step 2: Write content
  const contentResult = await neurolink.generate({
    input: { text: `Write content for this outline: ${outlineResult.content}` },
  });

  return {
    outline: outlineResult.content,
    content: contentResult.content,
  };
};

const result = await createContent("AI");
```

**With orchestration:**

```typescript
const neurolink = new NeuroLink({
  provider: "openai",
  conversationMemory: { enabled: true }, // Keep context between steps
});

const result = await neurolink.generate({
  input: {
    text: `Create an outline for AI, then write detailed content for each section.`,
  },
});
// AI uses conversation memory to maintain context across steps
```

**Benefits:**

- Explicit control over workflow
- Easier to debug and test
- Can use conversation memory for context
- More flexible than rigid chains

---

## Streaming

**LangChain:**

```typescript
import { ChatOpenAI } from "langchain/chat_models/openai";
import { HumanMessage } from "langchain/schema";

const model = new ChatOpenAI({ streaming: true });

const stream = await model.stream([new HumanMessage("Tell me a story")]);

for await (const chunk of stream) {
  process.stdout.write(chunk.content);
}
```

**NeuroLink:**

```typescript
import { NeuroLink } from "@juspay/neurolink";

const neurolink = new NeuroLink({ provider: "openai" });

const result = await neurolink.generate({
  input: { text: "Tell me a story" },
  stream: true,
});

for await (const chunk of result.stream!) {
  process.stdout.write(chunk.delta);
}
```

**Benefits:**

- Simpler streaming API
- Consistent across all providers
- Built-in error handling

---

## Structured Output

**LangChain:**

```typescript
import { ChatOpenAI } from "langchain/chat_models/openai";
import { StructuredOutputParser } from "langchain/output_parsers";
import { z } from "zod";

const parser = StructuredOutputParser.fromZodSchema(
  z.object({
    name: z.string(),
    age: z.number(),
  }),
);

const model = new ChatOpenAI();
const result = await model.call([
  new HumanMessage("Tell me about John, age 30"),
]);

const parsed = await parser.parse(result.content);
```

**NeuroLink:**

```typescript
import { NeuroLink } from "@juspay/neurolink";
import { z } from "zod";

const neurolink = new NeuroLink({ provider: "openai" });

const schema = z.object({
  name: z.string(),
  age: z.number(),
});

const result = await neurolink.generate({
  input: { text: "Tell me about John, age 30" },
  structuredOutput: {
    format: "json",
    schema,
  },
});

console.log(result.structuredOutput); // { name: "John", age: 30 }
// Automatically validated against Zod schema
```

**Benefits:**

- Built-in Zod schema validation
- Type-safe results
- Automatic JSON parsing
- No manual parsing needed

---

## Gotchas and Differences

### 1. Message Format

**LangChain** uses message classes:

```typescript
import { HumanMessage, AIMessage, SystemMessage } from "langchain/schema";

[new SystemMessage("You are helpful"), new HumanMessage("Hello")];
```

**NeuroLink** uses simple objects:

```typescript
{
  input: { text: "Hello" },
  systemPrompt: "You are helpful"
}
```

### 2. Error Handling

**LangChain:** Basic try-catch required for all operations

**NeuroLink:** Built-in retry, failover, and graceful degradation:

```typescript
const neurolink = new NeuroLink({
  provider: "openai",
  fallbackProviders: ["anthropic", "vertex"], // Auto-failover
});
```

### 3. Tool Execution

**LangChain:** Manual tool registration and execution

**NeuroLink:** Automatic MCP tool discovery and execution:

```typescript
// Tools are automatically available, no registration needed
const result = await neurolink.generate({
  input: { text: "Read the file config.json" },
});
// readFile tool executes automatically
```

### 4. Conversation Context

**LangChain:** Manual memory management with different memory types

**NeuroLink:** Automatic with simple config:

```typescript
conversationMemory: {
  enabled: true;
}
```

### 5. Provider Switching

**LangChain:** Requires separate model classes and imports

**NeuroLink:** Single parameter:

```typescript
provider: "openai"; // or "anthropic", "vertex", etc.
```

---

## Gradual Migration Strategy

You don't have to migrate everything at once. Here's a phased approach:

### Phase 1: Side-by-Side (Week 1)

Run both LangChain and NeuroLink in parallel:

```typescript
import { ChatOpenAI } from "langchain/chat_models/openai";
import { NeuroLink } from "@juspay/neurolink";

// Old code (LangChain)
const langchain = new ChatOpenAI();

// New code (NeuroLink)
const neurolink = new NeuroLink({ provider: "openai" });

// Use feature flags to switch
const useLangChain = process.env.USE_LANGCHAIN === "true";

const result = useLangChain
  ? await langchain.call([new HumanMessage("Hello")])
  : await neurolink.generate({ input: { text: "Hello" } });
```

### Phase 2: Migrate Simple Endpoints (Week 2)

Start with simple text generation:

```typescript
// Before
const chat = new ChatOpenAI();
const result = await chat.call([new HumanMessage(prompt)]);

// After
const neurolink = new NeuroLink({ provider: "openai" });
const result = await neurolink.generate({ input: { text: prompt } });
```

### Phase 3: Migrate Chains (Week 3)

Replace chains with direct calls:

```typescript
// Before (LangChain chain)
const chain = new LLMChain({ llm, prompt });
const result = await chain.call({ input: "..." });

// After (NeuroLink)
const result = await neurolink.generate({ input: { text: "..." } });
```

### Phase 4: Migrate Agents & Tools (Week 4)

Add MCP tools:

```typescript
// Before (LangChain agent + tools)
const tools = [new Calculator(), new SerpAPI()];
const agent = await initializeAgentExecutorWithOptions(tools, model);

// After (NeuroLink MCP)
await neurolink.addExternalMCPServer("serpapi", { ... });
// Built-in calculateMath tool works automatically
```

### Phase 5: Full Migration (Week 5)

Remove LangChain dependency:

```bash
npm uninstall langchain
npm install @juspay/neurolink
```

---

## Migration Checklist

Use this checklist to track your migration:

- [ ] **Install NeuroLink**: `npm install @juspay/neurolink`
- [ ] **Provider Setup**: Configure API keys in `.env`
- [ ] **Test Simple Generation**: Verify basic text generation works
- [ ] **Migrate Chat Models**: Replace LangChain model classes
- [ ] **Migrate Chains**: Convert to direct `generate()` calls
- [ ] **Migrate Memory**: Enable `conversationMemory`
- [ ] **Migrate Tools**: Add MCP servers
- [ ] **Migrate Callbacks**: Convert to middleware
- [ ] **Update Tests**: Adapt test assertions
- [ ] **Update Type Definitions**: Use NeuroLink types
- [ ] **Remove LangChain**: Uninstall dependency

---

## Performance Comparison

Real-world benchmarks (averaged over 1000 requests):

| Metric                     | LangChain | NeuroLink | Improvement     |
| -------------------------- | --------- | --------- | --------------- |
| First response time        | 850ms     | 420ms     | **50% faster**  |
| Memory usage               | 180MB     | 85MB      | **53% less**    |
| Bundle size (minified)     | 2.3MB     | 890KB     | **61% smaller** |
| Type errors (compile time) | Frequent  | Rare      | **Better DX**   |

---

## Getting Help

- **Documentation**: [https://neurolink.dev/docs](https://neurolink.dev/docs)
- **Examples**: [Migration examples repo](https://github.com/juspay/neurolink-examples)
- **Discord**: [Join our community](https://discord.gg/neurolink)
- **GitHub Issues**: [Report issues](https://github.com/juspay/neurolink/issues)

---

## See Also

- [NeuroLink Getting Started Guide](../../getting-started/quick-start.md)
- [Complete API Reference](../../sdk/api-reference.md)
- [MCP Integration Guide](../../advanced/mcp-integration.md)
- [Enterprise Features](../../advanced/enterprise.md)
- [Provider Comparison](../../reference/provider-comparison.md)
