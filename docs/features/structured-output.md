---
title: "Structured Output with Zod Schemas"
description: Generate type-safe, validated JSON responses using Zod schemas with the generate() function
keywords:
  [structured-output, zod, json-schema, type-safe, validation, json-response]
---

# Structured Output with Zod Schemas

Generate type-safe, validated JSON responses using Zod schemas. Available in `generate()` function only (not `stream()`).

## Quick Start

```typescript
import { z } from "zod";
import { NeuroLink } from "@juspay/neurolink";

const neurolink = new NeuroLink();

const UserSchema = z.object({
  name: z.string(),
  age: z.number(),
  email: z.string(),
});

const result = await neurolink.generate({
  input: { text: "Create a profile for John Doe, 30, software engineer" },
  schema: UserSchema,
  output: { format: "json" },
});

const user = JSON.parse(result.content);
console.log(user); // { name: "John Doe", age: 30, email: "john.doe@example.com" }
```

## Requirements

1. **`schema`**: A Zod schema defining the output structure — always required.
2. **`output.format`**: Must be `"json"` or `"structured"` to get a JSON string
   in `result.content` (defaults to `"text"` if not specified). This is
   independent of `structuredData`: passing `schema` alone, with no
   `output.format`, is enough for `result.structuredData` to be populated —
   this is the path the [tools section below](#works-with-tools) uses.

## Complex Schemas

```typescript
const CompanySchema = z.object({
  name: z.string(),
  headquarters: z.object({
    city: z.string(),
    country: z.string(),
  }),
  employees: z.array(
    z.object({
      name: z.string(),
      role: z.string(),
      salary: z.number(),
    }),
  ),
  financials: z.object({
    revenue: z.number(),
    profit: z.number(),
  }),
});

const result = await neurolink.generate({
  input: { text: "Analyze TechCorp company" },
  schema: CompanySchema,
  output: { format: "json" },
});
```

## Works with Tools

Structured output works seamlessly with MCP tools:

```typescript
const result = await neurolink.generate({
  input: { text: "Get weather for San Francisco" },
  schema: WeatherSchema,
  output: { format: "json" },
  tools: { getWeather: myWeatherTool },
});
// Tools execute first, then response is formatted as JSON
```

### How this works on OpenAI-compatible providers

Most OpenAI-compatible vendors reject `response_format` and `tools` in the same
request, so NeuroLink does not send them together. That leaves a turn with tools
attached — which is most turns, since built-in and MCP tools ride along by
default — with nothing telling the model to answer in JSON.

NeuroLink closes that gap itself. The tool turn runs untouched, and if its
answer does not satisfy your schema, the SDK re-asks **once** with the tools
removed, which is what makes native `response_format` legal again. That second
pass only reformats an answer the model has already produced, so tool results
still drive the content; `toolsUsed`, `toolExecutions` and `usage` cover the
whole turn, not just the reformat.

Two consequences worth knowing:

- A `generate({ schema })` call that needed the reformat costs **two** requests.
  Calls whose first answer already satisfies the schema cost one, as before.
- The reformat is accepted only if it actually produced a schema-valid value.
  If it fails, if the SDK's own turn deadline is reached, or if it comes back as
  prose anyway, the original answer is returned rather than an error — so this
  can improve an outcome but never degrade one. A caller that cancels the
  request still gets its cancellation. In those cases `structuredData` may still
  be unset, which is the honest signal that the model never produced the value.

The schema is deliberately **not** injected into the tool turn's system prompt.
Some models read a JSON Schema sitting next to a tool list as another tool and
answer by calling one that does not exist — Groq's `llama-3.3-70b-versatile`
tries to call a tool named `json`, which the server rejects outright.

The re-ask is not a single attempt. It tries native `response_format` first,
because removing the tools is precisely what makes that legal again. Some
vendors then reject the **schema itself** rather than the request: Groq answers
a non-object root with `invalid JSON schema for response_format: schema must
have type 'object'`, so an array- or scalar-rooted schema fails at this stage.
When that happens the SDK degrades a second time and re-runs the same tools-free
pass with the schema spelled into the prompt instead. That is why a
`z.array(z.string())` schema returns `["red","blue","yellow"]` with matching
`structuredData` rather than prose. Both stages run without tools; only the way
the schema is communicated changes.

### Important: Google Gemini Providers Limitation

**Google API Constraint:** Google Gemini (both Vertex AI and Google AI Studio) **cannot combine function calling with structured output (JSON schema validation)**. This is a documented Google API limitation, not a NeuroLink issue.

> **Gemini 3 / Gemini 2.5 Note:** This limitation applies to **all Gemini models**, including the latest Gemini 3 and Gemini 2.5 series (e.g., `gemini-2.5-pro`, `gemini-2.5-flash`). While these models have excellent JSON schema support for structured output, they still cannot use tools and JSON schema validation together in the same request.

**Error Message:**

```
Function calling with a response mime type: 'application/json' is unsupported
```

**Solution:** Use `disableTools: true` when using schemas with Google providers:

```typescript
const result = await neurolink.generate({
  input: { text: "Analyze TechCorp company" },
  schema: CompanySchema,
  output: { format: "json" },
  provider: "vertex", // or "google-ai"
  disableTools: true, // ✅ REQUIRED for Google providers with schemas
});
```

**This is Industry Standard:** All major AI frameworks (LangChain, Vercel AI SDK, Agno, Instructor) use the same approach - disabling tools when using response schemas with Google models.

### Workarounds for Gemini Tools + Structured Output

If you need both tool execution and structured output with Gemini, consider these approaches:

1. **Two-Step Approach:** First call with tools enabled (no schema), then a second call with schema to format the result:

   ```typescript
   // Step 1: Execute tools
   const toolResult = await neurolink.generate({
     input: { text: "Get current weather for Tokyo" },
     provider: "vertex",
     tools: { getWeather: myWeatherTool },
   });

   // Step 2: Format with schema
   const structured = await neurolink.generate({
     input: { text: `Format this data: ${toolResult.content}` },
     schema: WeatherSchema,
     output: { format: "json" },
     provider: "vertex",
     disableTools: true,
   });
   ```

2. **Use a Different Provider:** OpenAI and Anthropic support tools and structured output together:

   ```typescript
   const result = await neurolink.generate({
     input: { text: "Get weather and format as JSON" },
     schema: WeatherSchema,
     output: { format: "json" },
     provider: "openai", // ✅ Supports tools + schema together
     tools: { getWeather: myWeatherTool },
   });
   ```

3. **Choose One or the Other:** Design your workflow to use either tools OR structured output per request, not both.

**Related Limitation:** Complex schemas may trigger "Too many states for serving" errors. Solutions:

1. Simplify schema structure
2. Reduce nested objects
3. Use `disableTools: true` to reduce state complexity

## Important Notes

- **Only available in `generate()`** - Not supported in `stream()` function
- **`output.format` controls `result.content`** - If it is not "json" or "structured", `result.content` is plain text even with a schema; `result.structuredData` can still be populated from `schema` alone (see [Requirements](#requirements))
- **Auto-validated, with a no-throw fallback when tools are involved** - Without tools, an invalid response throws `NoObjectGeneratedError` with validation details. With tools attached, a failed schema match triggers the tool-free re-ask described in [Works with Tools](#works-with-tools); if that also fails, the original answer is returned rather than an error, and `structuredData` is left unset
- **Provider support** - Works with OpenAI, Anthropic, Google AI Studio, Vertex AI
- **Gemini JSON Schema Support** - Gemini 3 / Gemini 2.5 models have excellent native JSON schema support
- **Gemini Tools Limitation** - All Gemini models (including Gemini 3) cannot combine tools with schemas - use `disableTools: true`

## See Also

- [API Reference](../sdk/api-reference.md)
- [Custom Tools](../sdk/custom-tools.md)
- [MCP Integration](../advanced/mcp-integration.md)
