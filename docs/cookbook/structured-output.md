# Structured Output with JSON Schema

## Problem

AI models return unstructured text by default:

- Inconsistent formatting
- Manual parsing required
- Type safety missing
- Error-prone extraction
- Difficult validation

Applications need structured, typed data:

- JSON objects for APIs
- Type-safe TypeScript interfaces
- Database records
- Form data

## Solution

Use JSON schema to enforce structured output:

1. Define TypeScript interfaces
2. Generate JSON schemas
3. Validate responses
4. Type-safe parsing
5. Error handling

## Code

```typescript
import { NeuroLink } from "@juspay/neurolink";

// Define your data structure
type ProductReview = {
  productName: string;
  rating: number;
  sentiment: "positive" | "negative" | "neutral";
  pros: string[];
  cons: string[];
  recommendationScore: number;
  summary: string;
};

// JSON Schema for validation
const productReviewSchema = {
  type: "object",
  properties: {
    productName: {
      type: "string",
      description: "Name of the product being reviewed",
    },
    rating: {
      type: "number",
      minimum: 1,
      maximum: 5,
      description: "Rating from 1 to 5 stars",
    },
    sentiment: {
      type: "string",
      enum: ["positive", "negative", "neutral"],
      description: "Overall sentiment of the review",
    },
    pros: {
      type: "array",
      items: { type: "string" },
      description: "List of positive aspects",
    },
    cons: {
      type: "array",
      items: { type: "string" },
      description: "List of negative aspects",
    },
    recommendationScore: {
      type: "number",
      minimum: 0,
      maximum: 100,
      description: "Likelihood to recommend (0-100)",
    },
    summary: {
      type: "string",
      description: "Brief summary of the review",
    },
  },
  required: [
    "productName",
    "rating",
    "sentiment",
    "pros",
    "cons",
    "recommendationScore",
    "summary",
  ],
};

class StructuredOutputGenerator {
  private neurolink: NeuroLink;

  constructor() {
    this.neurolink = new NeuroLink();
  }

  /**
   * Extract structured data from text
   */
  async extractStructured<T>(
    prompt: string,
    schema: any,
    provider: string = "openai",
  ): Promise<T> {
    const result = await this.neurolink.generate({
      input: { text: prompt },
      provider,
      structuredOutput: {
        type: "json",
        schema,
      },
    });

    // Parse and validate JSON
    try {
      const parsed = JSON.parse(result.content);
      this.validateAgainstSchema(parsed, schema);
      return parsed as T;
    } catch (error: any) {
      throw new Error(`Failed to parse structured output: ${error.message}`);
    }
  }

  /**
   * Basic schema validation
   */
  private validateAgainstSchema(data: any, schema: any): void {
    // Check required fields
    if (schema.required) {
      for (const field of schema.required) {
        if (!(field in data)) {
          throw new Error(`Missing required field: ${field}`);
        }
      }
    }

    // Check types
    for (const [key, value] of Object.entries(data)) {
      const fieldSchema = schema.properties?.[key];
      if (!fieldSchema) continue;

      const actualType = Array.isArray(value) ? "array" : typeof value;
      if (fieldSchema.type !== actualType) {
        throw new Error(
          `Field "${key}" has wrong type. Expected ${fieldSchema.type}, got ${actualType}`,
        );
      }

      // Validate enum
      if (fieldSchema.enum && !fieldSchema.enum.includes(value)) {
        throw new Error(
          `Field "${key}" must be one of: ${fieldSchema.enum.join(", ")}`,
        );
      }

      // Validate number ranges
      if (fieldSchema.type === "number") {
        if (fieldSchema.minimum !== undefined && value < fieldSchema.minimum) {
          throw new Error(`Field "${key}" must be >= ${fieldSchema.minimum}`);
        }
        if (fieldSchema.maximum !== undefined && value > fieldSchema.maximum) {
          throw new Error(`Field "${key}" must be <= ${fieldSchema.maximum}`);
        }
      }
    }
  }

  /**
   * Batch extraction with retry on validation failure
   */
  async extractWithRetry<T>(
    prompt: string,
    schema: any,
    maxRetries: number = 3,
  ): Promise<T> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await this.extractStructured<T>(prompt, schema);
      } catch (error: any) {
        lastError = error;
        console.error(`❌ Attempt ${attempt} failed: ${error.message}`);

        if (attempt < maxRetries) {
          console.log("🔄 Retrying with more explicit instructions...");
          // Add validation error to prompt
          prompt += `\n\nPrevious attempt failed validation: ${error.message}. Please ensure strict adherence to the schema.`;
        }
      }
    }

    throw lastError || new Error("Extraction failed");
  }
}

// Usage Examples
async function example1_ProductReview() {
  const generator = new StructuredOutputGenerator();

  const reviewText = `
    I recently purchased the UltraBook Pro laptop and I'm mostly impressed.
    The build quality is excellent, the screen is gorgeous, and battery life
    is amazing - easily lasts 12 hours. However, the keyboard feels a bit mushy
    and it can get quite hot during intensive tasks. Overall, I'd recommend it
    for productivity work but gamers should look elsewhere.
  `;

  const review = await generator.extractStructured<ProductReview>(
    `Extract a structured review from this text: ${reviewText}`,
    productReviewSchema,
  );

  console.log("✅ Extracted Review:");
  console.log(JSON.stringify(review, null, 2));
}

// Example 2: Contact Information Extraction
type ContactInfo = {
  name: string;
  email: string;
  phone?: string;
  company?: string;
  role?: string;
};

const contactSchema = {
  type: "object",
  properties: {
    name: { type: "string" },
    email: { type: "string", format: "email" },
    phone: { type: "string" },
    company: { type: "string" },
    role: { type: "string" },
  },
  required: ["name", "email"],
};

async function example2_ContactExtraction() {
  const generator = new StructuredOutputGenerator();

  const text = `
    Hi, I'm John Smith, Senior Engineer at TechCorp Inc.
    You can reach me at john.smith@techcorp.com or call me at
    +1-555-0123. Looking forward to connecting!
  `;

  const contact = await generator.extractStructured<ContactInfo>(
    `Extract contact information from: ${text}`,
    contactSchema,
  );

  console.log("✅ Extracted Contact:");
  console.log(contact);
}

// Example 3: Database Record Generation
type UserProfile = {
  userId: string;
  username: string;
  age: number;
  interests: string[];
  subscriptionTier: "free" | "basic" | "premium";
  joinedDate: string;
};

const userProfileSchema = {
  type: "object",
  properties: {
    userId: { type: "string", pattern: "^[A-Z0-9]{8}$" },
    username: { type: "string", minLength: 3, maxLength: 20 },
    age: { type: "number", minimum: 13, maximum: 120 },
    interests: { type: "array", items: { type: "string" } },
    subscriptionTier: { type: "string", enum: ["free", "basic", "premium"] },
    joinedDate: { type: "string", format: "date" },
  },
  required: [
    "userId",
    "username",
    "age",
    "interests",
    "subscriptionTier",
    "joinedDate",
  ],
};

async function example3_DatabaseRecord() {
  const generator = new StructuredOutputGenerator();

  const userData = `
    Create a user profile for Sarah Chen, a 28-year-old photography enthusiast
    who also loves hiking and cooking. She's on our premium plan and joined
    last month.
  `;

  const profile = await generator.extractStructured<UserProfile>(
    userData,
    userProfileSchema,
    "anthropic", // Claude handles structured output well
  );

  console.log("✅ User Profile:");
  console.log(profile);
}

// Main
async function main() {
  console.log("=== Example 1: Product Review ===\n");
  await example1_ProductReview();

  console.log("\n=== Example 2: Contact Extraction ===\n");
  await example2_ContactExtraction();

  console.log("\n=== Example 3: Database Record ===\n");
  await example3_DatabaseRecord();
}

main();
```

## Explanation

### 1. JSON Schema Definition

Define structure upfront:

```typescript
const schema = {
  type: "object",
  properties: {
    field: { type: "string" },
  },
  required: ["field"],
};
```

### 2. Type Safety

Use TypeScript interfaces for compile-time checking:

```typescript
type MyData = {
  field: string;
};

const data = await extract<MyData>(prompt, schema);
// data.field is typed as string
```

### 3. Validation

Validate parsed JSON against schema:

- Required fields present
- Correct types
- Enum values valid
- Number ranges respected

### 4. Error Handling

Retry with enhanced prompt on validation failure:

```typescript
prompt += `\nPrevious failed: ${error.message}`;
```

### 5. Provider Selection

Different providers handle structured output differently:

- **OpenAI**: Excellent JSON mode
- **Anthropic**: Good with clear schemas
- **Google AI**: NOTE - Cannot use tools with structured output

## Variations

### Nested Objects

Handle complex nested structures:

```typescript
type Company = {
  name: string;
  employees: Array<{
    name: string;
    role: string;
    department: {
      name: string;
      budget: number;
    };
  }>;
};

const companySchema = {
  type: "object",
  properties: {
    name: { type: "string" },
    employees: {
      type: "array",
      items: {
        type: "object",
        properties: {
          name: { type: "string" },
          role: { type: "string" },
          department: {
            type: "object",
            properties: {
              name: { type: "string" },
              budget: { type: "number" },
            },
            required: ["name", "budget"],
          },
        },
        required: ["name", "role", "department"],
      },
    },
  },
  required: ["name", "employees"],
};
```

### Streaming Structured Output

Stream and validate incrementally:

```typescript
async function streamStructuredOutput<T>(
  prompt: string,
  schema: any,
): Promise<T> {
  let buffer = "";

  const stream = await neurolink.stream({
    input: { text: prompt },
    structuredOutput: { type: "json", schema },
  });

  for await (const chunk of stream) {
    if (chunk.type === "content-delta") {
      buffer += chunk.delta;
      process.stdout.write(chunk.delta);
    }
  }

  return JSON.parse(buffer) as T;
}
```

### Union Types

Handle multiple possible schemas:

```typescript
type Response = SuccessResponse | ErrorResponse;

type SuccessResponse = {
  status: "success";
  data: any;
};

type ErrorResponse = {
  status: "error";
  error: string;
  code: number;
};

async function parseResponse(text: string): Promise<Response> {
  const result = await generator.extractStructured(text, responseSchema);

  if (result.status === "success") {
    return result as SuccessResponse;
  } else {
    return result as ErrorResponse;
  }
}
```

### Schema from TypeScript

Auto-generate schemas from interfaces:

```typescript
import { zodToJsonSchema } from "zod-to-json-schema";
import { z } from "zod";

const UserSchema = z.object({
  name: z.string(),
  age: z.number().min(0).max(120),
  email: z.string().email(),
});

const jsonSchema = zodToJsonSchema(UserSchema);

const user = await generator.extractStructured<z.infer<typeof UserSchema>>(
  prompt,
  jsonSchema,
);
```

## Use Cases

| Use Case           | Schema Complexity | Recommended Provider |
| ------------------ | ----------------- | -------------------- |
| Data extraction    | Simple            | OpenAI, Anthropic    |
| Form filling       | Medium            | OpenAI               |
| API responses      | Medium            | OpenAI, Google AI    |
| Database records   | Complex           | OpenAI               |
| Classification     | Simple            | Any provider         |
| Sentiment analysis | Simple            | Anthropic            |

## Best Practices

1. **Define schemas upfront**: Don't rely on prompt engineering alone
2. **Use TypeScript types**: Compile-time safety prevents runtime errors
3. **Validate responses**: Don't trust AI output blindly
4. **Retry on failure**: Validation errors can be recovered
5. **Test schemas**: Verify with sample data before production
6. **Keep schemas simple**: Complex nesting reduces accuracy

## See Also

- [Batch Processing](batch-processing.md)
- [Error Recovery](error-recovery.md)
- [API Reference - Generate Method](../sdk/api-reference.md#generate)
- [Provider Comparison](../reference/provider-comparison.md)
