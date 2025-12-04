# Structured Output with Zod Schemas

Generate type-safe, validated JSON responses using Zod schemas. Available in `generate()` function only (not `stream()`).

## Quick Example

```typescript
import { z } from "zod";
import { NeuroLink } from "@juspay/neurolink";

const neurolink = new NeuroLink();

// Define your schema
const UserSchema = z.object({
  name: z.string(),
  age: z.number(),
  email: z.string(),
  occupation: z.string(),
});

// Generate with schema
const result = await neurolink.generate({
  input: {
    text: "Create a user profile for John Doe, 30 years old, software engineer",
  },
  schema: UserSchema,
  output: { format: "json" }, // Required: must be "json" or "structured"
  provider: "vertex",
  model: "gemini-2.0-flash-exp",
});

// result.content is validated JSON string
const user = JSON.parse(result.content);
console.log(user); // { name: "John Doe", age: 30, email: "...", occupation: "software engineer" }
```

## Requirements

Both parameters are required for structured output:

1. **`schema`**: A Zod schema defining the output structure
2. **`output.format`**: Must be `"json"` or `"structured"` (defaults to `"text"` if not specified)

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

### Important: Google Gemini Providers Limitation

**Google API Constraint:** Google Gemini (both Vertex AI and Google AI Studio) **cannot combine function calling with structured output**. This is a documented Google API limitation, not a NeuroLink issue.

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

**Future Support:** Future Gemini versions may support both features - check official Google documentation for updates.

**Related Limitation:** Complex schemas may trigger "Too many states for serving" errors. Solutions:

1. Simplify schema structure
2. Reduce nested objects
3. Use `disableTools: true` to reduce state complexity

## Important Notes

- **Only available in `generate()`** - Not supported in `stream()` function
- **Requires both `schema` and `output.format`** - If `output.format` is not "json" or "structured", regular text is returned even with a schema
- **Auto-validated** - Invalid responses throw `NoObjectGeneratedError` with validation details
- **Provider support** - Works with OpenAI, Anthropic, Google AI Studio, Vertex AI
- **Google Gemini Limitation** - Cannot combine tools with schemas - use `disableTools: true`

## See Also

- [API Reference](../sdk/api-reference.md#generate)
- [Custom Tools](../sdk/custom-tools.md)
- [MCP Integration](../advanced/mcp-integration.md)
