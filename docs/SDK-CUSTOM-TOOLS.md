# 🔧 SDK Custom Tools Guide

Build powerful AI applications by extending NeuroLink with your own custom tools.

## 📋 Overview

NeuroLink's SDK allows you to register custom tools programmatically, giving your AI assistants access to any functionality you need. All registered tools work seamlessly with the built-in tool system across all supported providers.

### Key Features

- ✅ **Type-Safe**: Full TypeScript support with Zod schema validation
- ✅ **Provider Agnostic**: Works with all providers that support tools
- ✅ **Easy Integration**: Simple API for tool registration
- ✅ **Async Support**: All tools run asynchronously
- ✅ **Error Handling**: Graceful error handling built-in

## 🚀 Quick Start

### Basic Tool Registration

```typescript
import { NeuroLink } from "@juspay/neurolink";
import { z } from "zod";

const neurolink = new NeuroLink();

// Register a simple tool
neurolink.registerTool("greetUser", {
  description: "Generate a personalized greeting",
  parameters: z.object({
    name: z.string().describe("User name"),
    language: z.enum(["en", "es", "fr", "de"]).default("en"),
  }),
  execute: async ({ name, language }) => {
    const greetings = {
      en: `Hello, ${name}!`,
      es: `¡Hola, ${name}!`,
      fr: `Bonjour, ${name}!`,
      de: `Hallo, ${name}!`,
    };
    return { greeting: greetings[language] };
  },
});

// AI will now use your tool
const result = await neurolink.generate({
  input: { text: "Greet John in Spanish" },
});
// AI calls: greetUser({ name: "John", language: "es" })
// Returns: "¡Hola, John!"
```

## 📖 SimpleTool Interface

All custom tools implement the `SimpleTool` interface:

```typescript
interface SimpleTool<T = any, R = any> {
  description: string; // What the tool does
  parameters?: ZodSchema<T>; // Input validation schema
  execute: (args: T) => Promise<R>; // Tool implementation
}
```

### Interface Components

- **description**: Clear, actionable description that helps the AI understand when to use the tool
- **parameters**: Optional Zod schema for validating inputs (highly recommended)
- **execute**: Async function that implements the tool's logic

## 🛠️ Registration Methods

### Register Single Tool

```typescript
neurolink.registerTool(name: string, tool: SimpleTool): void
```

### Register Multiple Tools

```typescript
neurolink.registerTools(tools: Record<string, SimpleTool>): void
```

### Get Registered Tools

```typescript
const tools = neurolink.getRegisteredTools(); // Returns string[]
```

## 💡 Common Use Cases

### 1. API Integration

```typescript
neurolink.registerTool("weatherLookup", {
  description: "Get current weather for any city",
  parameters: z.object({
    city: z.string().describe("City name"),
    country: z.string().optional().describe("Country code (ISO 2-letter)"),
    units: z.enum(["celsius", "fahrenheit"]).default("celsius"),
  }),
  execute: async ({ city, country, units }) => {
    const response = await fetch(
      `https://api.weather.com/v1/current?city=${city}&country=${country || ""}&units=${units}`,
      { headers: { "API-Key": process.env.WEATHER_API_KEY } },
    );
    const data = await response.json();

    return {
      city,
      temperature: data.temp,
      condition: data.condition,
      humidity: data.humidity,
      units,
    };
  },
});
```

### 2. Database Operations

```typescript
neurolink.registerTool("userLookup", {
  description: "Find user information by email or ID",
  parameters: z.object({
    identifier: z.string().describe("Email address or user ID"),
    fields: z
      .array(z.string())
      .optional()
      .describe("Specific fields to return"),
  }),
  execute: async ({ identifier, fields }) => {
    const db = getDatabase();
    const query = identifier.includes("@")
      ? { email: identifier }
      : { id: identifier };

    const user = await db.users.findOne(query);
    if (!user) {
      return { error: "User not found" };
    }

    // Return only requested fields if specified
    if (fields && fields.length > 0) {
      return fields.reduce((acc, field) => {
        acc[field] = user[field];
        return acc;
      }, {});
    }

    return user;
  },
});
```

### 3. Data Processing

```typescript
neurolink.registerTool("analyzeSentiment", {
  description: "Analyze sentiment of text using ML model",
  parameters: z.object({
    text: z.string().describe("Text to analyze"),
    language: z.string().default("en").describe("Language code"),
    detailed: z.boolean().default(false).describe("Include detailed analysis"),
  }),
  execute: async ({ text, language, detailed }) => {
    const sentimentModel = await loadSentimentModel(language);
    const result = await sentimentModel.analyze(text);

    if (detailed) {
      return {
        sentiment: result.sentiment,
        score: result.score,
        emotions: result.emotions,
        keywords: result.keywords,
        confidence: result.confidence,
      };
    }

    return {
      sentiment: result.sentiment,
      score: result.score,
    };
  },
});
```

### 4. File Operations

```typescript
neurolink.registerTool("processSpreadsheet", {
  description: "Process Excel/CSV files with various operations",
  parameters: z.object({
    filePath: z.string().describe("Path to spreadsheet file"),
    operation: z.enum(["summarize", "filter", "pivot", "chart"]),
    options: z.record(z.any()).optional(),
  }),
  execute: async ({ filePath, operation, options = {} }) => {
    const workbook = await loadSpreadsheet(filePath);

    switch (operation) {
      case "summarize":
        return {
          sheets: workbook.sheetNames,
          totalRows: workbook.getTotalRows(),
          columns: workbook.getColumns(),
          summary: workbook.generateSummary(),
        };

      case "filter":
        const filtered = workbook.filter(options.criteria);
        return {
          matchingRows: filtered.length,
          data: filtered,
        };

      case "pivot":
        return workbook.createPivotTable(
          options.rows,
          options.columns,
          options.values,
        );

      case "chart":
        const chartData = workbook.prepareChartData(
          options.type,
          options.series,
        );
        return { chartData, recommendation: suggestChartType(chartData) };
    }
  },
});
```

### 5. External Service Integration

```typescript
neurolink.registerTools({
  sendEmail: {
    description: "Send email via SMTP",
    parameters: z.object({
      to: z.string().email(),
      subject: z.string(),
      body: z.string(),
      cc: z.array(z.string().email()).optional(),
      attachments: z.array(z.string()).optional(),
    }),
    execute: async ({ to, subject, body, cc, attachments }) => {
      const mailer = getMailer();
      const result = await mailer.send({
        to,
        subject,
        body,
        cc,
        attachments: attachments
          ? await Promise.all(attachments.map(loadAttachment))
          : undefined,
      });

      return {
        messageId: result.messageId,
        status: "sent",
        timestamp: new Date().toISOString(),
      };
    },
  },

  scheduleCalendarEvent: {
    description: "Create calendar event",
    parameters: z.object({
      title: z.string(),
      startTime: z.string().datetime(),
      duration: z.number().describe("Duration in minutes"),
      attendees: z.array(z.string().email()).optional(),
      location: z.string().optional(),
      description: z.string().optional(),
    }),
    execute: async (params) => {
      const calendar = getCalendarService();
      const event = await calendar.createEvent({
        ...params,
        endTime: addMinutes(params.startTime, params.duration),
      });

      return {
        eventId: event.id,
        eventLink: event.htmlLink,
        status: "created",
      };
    },
  },
});
```

## 🎯 Best Practices

### 1. Clear Descriptions

Make tool descriptions specific and actionable:

```typescript
// ❌ Bad
description: "Database tool";

// ✅ Good
description: "Search customer database by name, email, or order ID";
```

### 2. Parameter Validation

Always use Zod schemas for type safety:

```typescript
// ❌ Bad - No validation
parameters: undefined,
execute: async (args: any) => {
  // Risky - args could be anything
}

// ✅ Good - Full validation
parameters: z.object({
  userId: z.string().uuid(),
  action: z.enum(['view', 'edit', 'delete']),
  reason: z.string().min(10).optional()
}),
execute: async ({ userId, action, reason }) => {
  // Type-safe with validated inputs
}
```

### 3. Error Handling

Handle errors gracefully:

```typescript
execute: async (args) => {
  try {
    const result = await riskyOperation(args);
    return { success: true, data: result };
  } catch (error) {
    // Return error info instead of throwing
    return {
      success: false,
      error: error.message,
      code: error.code || "UNKNOWN_ERROR",
    };
  }
};
```

### 4. Async Operations

All execute functions must return promises:

```typescript
// ❌ Bad - Synchronous
execute: (args) => {
  return { result: "data" };
};

// ✅ Good - Asynchronous
execute: async (args) => {
  const result = await fetchData(args);
  return { result };
};
```

### 5. Tool Naming

Use clear, consistent naming:

```typescript
// ❌ Bad naming
neurolink.registerTool('tool1', { ... });
neurolink.registerTool('doStuff', { ... });
neurolink.registerTool('x', { ... });

// ✅ Good naming
neurolink.registerTool('searchProducts', { ... });
neurolink.registerTool('calculateShipping', { ... });
neurolink.registerTool('updateInventory', { ... });
```

## 🧪 Testing Your Tools

### Unit Testing

```typescript
import { describe, it, expect } from "vitest";

describe("weatherLookup tool", () => {
  it("should return weather data for valid city", async () => {
    const tool = {
      description: "Get weather data",
      parameters: z.object({
        city: z.string(),
      }),
      execute: async ({ city }) => {
        // Mock implementation for testing
        return {
          city,
          temperature: 22,
          condition: "sunny",
        };
      },
    };

    const result = await tool.execute({ city: "London" });
    expect(result).toHaveProperty("temperature");
    expect(result.city).toBe("London");
  });
});
```

### Integration Testing

```typescript
import { NeuroLink } from "@juspay/neurolink";

describe("Custom tools integration", () => {
  let neurolink: NeuroLink;

  beforeEach(() => {
    neurolink = new NeuroLink();
    neurolink.registerTool("testTool", {
      description: "Test tool for integration testing",
      parameters: z.object({ input: z.string() }),
      execute: async ({ input }) => ({ output: input.toUpperCase() }),
    });
  });

  it("should use custom tool in generation", async () => {
    const result = await neurolink.generate({
      input: { text: "Use the test tool with input 'hello'" },
      provider: "google-ai",
    });

    expect(result.content).toContain("HELLO");
  });
});
```

## 🔍 Debugging Tools

### Enable Debug Mode

```bash
export NEUROLINK_DEBUG=true
```

### Log Tool Execution

```typescript
neurolink.registerTool("debuggedTool", {
  description: "Tool with debug logging",
  parameters: z.object({ data: z.any() }),
  execute: async (args) => {
    console.log("[Tool] Executing with args:", args);

    try {
      const result = await processData(args);
      console.log("[Tool] Success:", result);
      return result;
    } catch (error) {
      console.error("[Tool] Error:", error);
      throw error;
    }
  },
});
```

## 🚀 Advanced Patterns

### Tool Composition

```typescript
// Base tools
const baseTools = {
  fetchData: {
    description: "Fetch data from API",
    execute: async ({ endpoint }) => {
      const response = await fetch(endpoint);
      return response.json();
    },
  },

  transformData: {
    description: "Transform data format",
    execute: async ({ data, format }) => {
      return transform(data, format);
    },
  },
};

// Composed tool
neurolink.registerTool("fetchAndTransform", {
  description: "Fetch data and transform it",
  parameters: z.object({
    endpoint: z.string().url(),
    format: z.enum(["json", "csv", "xml"]),
  }),
  execute: async ({ endpoint, format }) => {
    const data = await baseTools.fetchData.execute({ endpoint });
    return baseTools.transformData.execute({ data, format });
  },
});
```

### Tool Middleware

```typescript
// Wrap tools with middleware
function withRateLimit(tool: SimpleTool, limit: number): SimpleTool {
  const rateLimiter = new RateLimiter(limit);

  return {
    ...tool,
    execute: async (args) => {
      await rateLimiter.acquire();
      return tool.execute(args);
    },
  };
}

// Register with rate limiting
neurolink.registerTool(
  "limitedApi",
  withRateLimit(
    {
      description: "Rate-limited API call",
      execute: async (args) => callExpensiveAPI(args),
    },
    10,
  ), // 10 calls per minute
);
```

### Dynamic Tool Registration

```typescript
// Register tools based on configuration
async function registerDynamicTools(config: ToolConfig[]) {
  const tools: Record<string, SimpleTool> = {};

  for (const toolConfig of config) {
    tools[toolConfig.name] = {
      description: toolConfig.description,
      parameters: createZodSchema(toolConfig.parameters),
      execute: createExecutor(toolConfig),
    };
  }

  neurolink.registerTools(tools);
}

// Load from configuration
const toolConfigs = await loadToolConfigs();
await registerDynamicTools(toolConfigs);
```

## 📊 Performance Considerations

### 1. Timeout Handling

```typescript
execute: async (args) => {
  const timeout = new Promise((_, reject) =>
    setTimeout(() => reject(new Error("Tool timeout")), 30000),
  );

  const operation = performOperation(args);

  return Promise.race([operation, timeout]);
};
```

### 2. Caching

```typescript
const cache = new Map();

execute: async (args) => {
  const cacheKey = JSON.stringify(args);

  if (cache.has(cacheKey)) {
    return cache.get(cacheKey);
  }

  const result = await expensiveOperation(args);
  cache.set(cacheKey, result);

  return result;
};
```

### 3. Batch Operations

```typescript
neurolink.registerTool("batchProcess", {
  description: "Process multiple items efficiently",
  parameters: z.object({
    items: z.array(z.any()),
    operation: z.string(),
  }),
  execute: async ({ items, operation }) => {
    // Process in parallel with concurrency limit
    const results = await pLimit(5)(
      items.map((item) => () => processItem(item, operation)),
    );

    return {
      processed: results.length,
      results,
    };
  },
});
```

## 🔒 Security Considerations

### Input Sanitization

```typescript
parameters: z.object({
  sqlQuery: z
    .string()
    .max(1000)
    .refine(
      (query) => !query.match(/DROP|DELETE|TRUNCATE/i),
      "Destructive operations not allowed",
    ),
});
```

### Permission Checking

```typescript
execute: async (args, context) => {
  // Check permissions before execution
  if (!hasPermission(context.user, "database.write")) {
    return { error: "Insufficient permissions" };
  }

  return performDatabaseOperation(args);
};
```

### Rate Limiting

```typescript
const userLimits = new Map();

execute: async (args, context) => {
  const userId = context.user?.id || "anonymous";
  const userCalls = userLimits.get(userId) || 0;

  if (userCalls >= 100) {
    return { error: "Rate limit exceeded" };
  }

  userLimits.set(userId, userCalls + 1);

  // Reset counters periodically
  setTimeout(() => userLimits.delete(userId), 3600000);

  return performOperation(args);
};
```

## 🎉 Complete Example

Here's a complete example combining multiple concepts:

```typescript
import { NeuroLink } from "@juspay/neurolink";
import { z } from "zod";

const neurolink = new NeuroLink();

// Define a comprehensive customer service tool set
neurolink.registerTools({
  searchCustomer: {
    description: "Search for customer by various criteria",
    parameters: z.object({
      query: z.string(),
      searchBy: z.enum(["email", "name", "phone", "orderId"]),
      limit: z.number().min(1).max(50).default(10),
    }),
    execute: async ({ query, searchBy, limit }) => {
      const db = getDatabase();
      const results = await db.customers.search({
        [searchBy]: query,
        limit,
      });

      return {
        found: results.length,
        customers: results.map((c) => ({
          id: c.id,
          name: c.name,
          email: c.email,
          totalOrders: c.orderCount,
          memberSince: c.createdAt,
        })),
      };
    },
  },

  getOrderHistory: {
    description: "Get order history for a customer",
    parameters: z.object({
      customerId: z.string().uuid(),
      status: z
        .enum(["all", "pending", "completed", "cancelled"])
        .default("all"),
      limit: z.number().default(10),
    }),
    execute: async ({ customerId, status, limit }) => {
      const orders = await fetchOrders(customerId, { status, limit });

      return {
        customerId,
        orderCount: orders.length,
        orders: orders.map((o) => ({
          orderId: o.id,
          date: o.createdAt,
          status: o.status,
          total: o.total,
          items: o.items.length,
        })),
      };
    },
  },

  processRefund: {
    description: "Process refund for an order",
    parameters: z.object({
      orderId: z.string().uuid(),
      amount: z.number().positive(),
      reason: z.string().min(10),
      notify: z.boolean().default(true),
    }),
    execute: async ({ orderId, amount, reason, notify }) => {
      // Validate order exists and is refundable
      const order = await getOrder(orderId);
      if (!order) {
        return { success: false, error: "Order not found" };
      }

      if (order.status !== "completed") {
        return {
          success: false,
          error: "Only completed orders can be refunded",
        };
      }

      if (amount > order.total) {
        return { success: false, error: "Refund amount exceeds order total" };
      }

      // Process refund
      const refund = await processPaymentRefund({
        orderId,
        amount,
        reason,
      });

      // Send notification
      if (notify) {
        await sendRefundNotification(order.customerId, refund);
      }

      return {
        success: true,
        refundId: refund.id,
        amount: refund.amount,
        status: "processed",
      };
    },
  },
});

// Now you can use natural language to access these tools
const result = await neurolink.generate({
  input: {
    text: "Find all orders for customer john@example.com and process a $50 refund for their most recent completed order due to damaged item",
  },
  provider: "openai",
});

// The AI will:
// 1. Call searchCustomer({ query: "john@example.com", searchBy: "email" })
// 2. Call getOrderHistory({ customerId: <found_id>, status: "completed" })
// 3. Call processRefund({ orderId: <most_recent>, amount: 50, reason: "damaged item" })
```

## 📚 Additional Resources

- [API Reference - NeuroLink Class](./API-REFERENCE.md#neurolink-class-api)
- [MCP Integration Guide](./MCP-INTEGRATION.md)
- [Provider Tool Support](../README.md#provider-tool-support-status)
- [Test Examples](../test/mcp/tool-integration/)

---

**Start building powerful AI applications with custom tools today! 🚀**
