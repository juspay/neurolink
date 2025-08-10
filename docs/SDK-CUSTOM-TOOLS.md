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

## ⚠️ Common Mistakes

### ❌ Using `schema` instead of `parameters`

```typescript
// WRONG - will throw validation error
neurolink.registerTool("badTool", {
  description: "This will fail",
  schema: {
    // ❌ Should be 'parameters'
    type: "object",
    properties: { value: { type: "string" } },
  },
  execute: async (args) => args,
});
```

### ❌ Using plain JSON schema as `parameters`

```typescript
// WRONG - will throw validation error
neurolink.registerTool("badTool", {
  description: "This will also fail",
  parameters: {
    // ❌ Should be Zod schema
    type: "object",
    properties: { value: { type: "string" } },
  },
  execute: async (args) => args,
});
```

### ✅ Correct Zod Schema Format

```typescript
// CORRECT - works perfectly
import { z } from "zod";

neurolink.registerTool("goodTool", {
  description: "This works correctly",
  parameters: z.object({
    // ✅ Zod schema
    value: z.string(),
  }),
  execute: async (args) => args,
});
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

## 🚀 Lighthouse Tool Integration (NEW!)

NeuroLink now supports direct integration with Lighthouse's 60+ production-ready e-commerce and payment analytics tools through a simple import approach.

### Quick Lighthouse Integration

```typescript
import { NeuroLink } from "@juspay/neurolink";
import { juspayAnalyticsServer } from "lighthouse/src/lib/mcp/servers/juspay/analytics-server";

const neurolink = new NeuroLink();

// Register Lighthouse server with context mapping
neurolink.registerLighthouseServer(juspayAnalyticsServer, {
  contextMapping: {
    shopId: "context.shopId",
    merchantId: "context.merchantId",
  },
});

// AI can now answer e-commerce questions using real production data
const result = await neurolink.generate({
  input: { text: "What were our payment success rates last month?" },
  // AI automatically discovers and uses juspay_get-success-rate-by-time tool
});
```

### Available Lighthouse Tools (60+ Tools)

- **Payment Analytics**: Success rates, transaction trends, failure analysis
- **E-commerce Analytics**: Conversion rates, order stats, shop performance
- **Platform Integration**: Shopify, WooCommerce, Magento APIs
- **Customer Tools**: Segmentation, lifetime value, behavior analysis
- **Inventory Tools**: Stock management, recommendations
- **Marketing Tools**: Campaign effectiveness, attribution

**📄 Complete Integration Guide**: [docs/LIGHTHOUSE-UNIFIED-INTEGRATION.md](./LIGHTHOUSE-UNIFIED-INTEGRATION.md)

## 🌐 MCP Server Integration

Beyond simple tool registration, NeuroLink SDK supports adding complete MCP (Model Context Protocol) servers for more complex tool ecosystems.

### Adding In-Memory MCP Servers

```typescript
// Add a complete MCP server with multiple related tools
await neurolink.addInMemoryMCPServer("hr-management", {
  server: {
    title: "HR Management Server",
    description: "Comprehensive HR tools for employee management",
    tools: {
      createEmployee: {
        description: "Create a new employee record with full details",
        execute: async (params: {
          name: string;
          department: string;
          role: string;
          salary: number;
          startDate: string;
        }) => {
          return {
            success: true,
            data: {
              employeeId: `EMP-${Date.now()}`,
              name: params.name,
              department: params.department,
              role: params.role,
              salary: params.salary,
              startDate: params.startDate,
              status: "active",
              createdAt: new Date().toISOString(),
            },
          };
        },
      },

      calculateSalary: {
        description: "Calculate total salary including bonuses and deductions",
        execute: async (params: {
          baseSalary: number;
          bonuses: number;
          deductions: number;
          taxRate: number;
        }) => {
          const grossSalary =
            params.baseSalary + params.bonuses - params.deductions;
          const netSalary = grossSalary * (1 - params.taxRate);

          return {
            success: true,
            data: {
              baseSalary: params.baseSalary,
              bonuses: params.bonuses,
              deductions: params.deductions,
              grossSalary,
              taxAmount: grossSalary * params.taxRate,
              netSalary,
              calculatedAt: new Date().toISOString(),
            },
          };
        },
      },

      getEmployeeStats: {
        description: "Get comprehensive employee statistics and analytics",
        execute: async (params: { department?: string; role?: string }) => {
          // Simulated analytics data
          return {
            success: true,
            data: {
              totalEmployees: 150,
              byDepartment: {
                engineering: 60,
                sales: 35,
                marketing: 25,
                hr: 15,
                finance: 15,
              },
              averageSalary: 75000,
              averageTenure: "2.5 years",
              openPositions: 8,
              lastUpdated: new Date().toISOString(),
            },
          };
        },
      },
    },
  },
  category: "hr-management",
  metadata: {
    version: "1.0.0",
    author: "Your Company",
    description: "Complete HR management solution",
  },
});
```

### Advanced MCP Server Examples

#### 1. Data Analytics Server

```typescript
await neurolink.addInMemoryMCPServer("analytics-server", {
  server: {
    title: "Data Analytics Server",
    description: "Advanced data processing and analytics tools",
    tools: {
      analyzeDataset: {
        description: "Perform statistical analysis on datasets",
        execute: async (params: {
          data: number[];
          analysisType: "descriptive" | "correlation" | "regression";
        }) => {
          const { data, analysisType } = params;

          switch (analysisType) {
            case "descriptive":
              const sum = data.reduce((a, b) => a + b, 0);
              const mean = sum / data.length;
              const sortedData = [...data].sort((a, b) => a - b);
              const median = sortedData[Math.floor(data.length / 2)];
              const variance =
                data.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) /
                data.length;
              const stdDev = Math.sqrt(variance);

              return {
                success: true,
                data: {
                  count: data.length,
                  sum,
                  mean,
                  median,
                  min: Math.min(...data),
                  max: Math.max(...data),
                  variance,
                  standardDeviation: stdDev,
                  range: Math.max(...data) - Math.min(...data),
                },
              };

            case "correlation":
              // Simplified correlation analysis
              return {
                success: true,
                data: {
                  correlationMatrix: "Generated correlation matrix",
                  strongCorrelations: [],
                  analysisNote: "Correlation analysis completed",
                },
              };

            default:
              return { success: false, error: "Unknown analysis type" };
          }
        },
      },

      generateReport: {
        description: "Generate comprehensive data reports with visualizations",
        execute: async (params: {
          title: string;
          data: any[];
          reportType: "summary" | "detailed" | "executive";
        }) => {
          return {
            success: true,
            data: {
              reportId: `RPT-${Date.now()}`,
              title: params.title,
              type: params.reportType,
              dataPoints: params.data.length,
              sections: [
                "Executive Summary",
                "Key Metrics",
                "Detailed Analysis",
                "Recommendations",
              ],
              generatedAt: new Date().toISOString(),
              status: "completed",
            },
          };
        },
      },
    },
  },
});
```

#### 2. Workflow Automation Server

```typescript
await neurolink.addInMemoryMCPServer("workflow-server", {
  server: {
    title: "Workflow Automation Server",
    description: "Tools for creating and managing automated workflows",
    tools: {
      createWorkflow: {
        description: "Create a new automated workflow with multiple steps",
        execute: async (params: {
          name: string;
          steps: Array<{
            name: string;
            type: string;
            config: any;
          }>;
          triggers: string[];
        }) => {
          return {
            success: true,
            data: {
              workflowId: `WF-${Date.now()}`,
              name: params.name,
              steps: params.steps,
              triggers: params.triggers,
              status: "created",
              nextExecution: null,
              createdAt: new Date().toISOString(),
            },
          };
        },
      },

      executeWorkflow: {
        description: "Execute a workflow with specific input data",
        execute: async (params: {
          workflowId: string;
          inputData: any;
          executionMode: "test" | "production";
        }) => {
          return {
            success: true,
            data: {
              executionId: `EXE-${Date.now()}`,
              workflowId: params.workflowId,
              mode: params.executionMode,
              status: "running",
              progress: 0,
              startedAt: new Date().toISOString(),
              estimatedCompletion: new Date(Date.now() + 300000).toISOString(), // 5 minutes
            },
          };
        },
      },

      getWorkflowStatus: {
        description: "Get current status and progress of workflow execution",
        execute: async (params: { workflowId: string }) => {
          return {
            success: true,
            data: {
              workflowId: params.workflowId,
              status: "in-progress",
              currentStep: "Data Processing",
              stepsCompleted: 3,
              totalSteps: 8,
              progress: 37.5,
              timeElapsed: "2m 15s",
              estimatedTimeRemaining: "3m 45s",
              lastUpdated: new Date().toISOString(),
            },
          };
        },
      },
    },
  },
});
```

#### 3. Content Generation Server

```typescript
await neurolink.addInMemoryMCPServer("content-server", {
  server: {
    title: "Content Generation Server",
    description: "Advanced content creation and management tools",
    tools: {
      generateSampleText: {
        description: "Generate sample text content for testing and development",
        execute: async (params: {
          topic: string;
          length: "short" | "medium" | "long";
          style: "formal" | "casual" | "technical";
        }) => {
          const samples = {
            short: `A brief overview of ${params.topic}. This content covers essential information in a ${params.style} style.`,
            medium: `This is a comprehensive introduction to ${params.topic}. Written in a ${params.style} style, it covers fundamental concepts, practical applications, and key considerations for understanding ${params.topic} in various contexts.`,
            long: `This extensive exploration of ${params.topic} provides detailed analysis written in a ${params.style} style. The content examines multiple perspectives, methodologies, and real-world applications related to ${params.topic}. By thoroughly investigating various aspects and implications, readers gain comprehensive understanding of ${params.topic} and its significance across different fields and industries.`,
          };

          return {
            success: true,
            data: {
              text: samples[params.length],
              topic: params.topic,
              length: params.length,
              style: params.style,
              wordCount: samples[params.length].split(" ").length,
              characterCount: samples[params.length].length,
              generatedAt: new Date().toISOString(),
            },
          };
        },
      },

      analyzeContent: {
        description: "Analyze text content for various metrics and insights",
        execute: async (params: {
          text: string;
          analysisTypes: Array<
            "sentiment" | "readability" | "keywords" | "topics"
          >;
        }) => {
          const results: any = {};

          params.analysisTypes.forEach((type) => {
            switch (type) {
              case "sentiment":
                const positiveWords = ["good", "great", "excellent", "amazing"];
                const negativeWords = ["bad", "terrible", "awful", "poor"];
                const words = params.text.toLowerCase().split(" ");
                const positive = words.filter((w) =>
                  positiveWords.includes(w),
                ).length;
                const negative = words.filter((w) =>
                  negativeWords.includes(w),
                ).length;

                results.sentiment = {
                  score: positive - negative,
                  sentiment:
                    positive > negative
                      ? "positive"
                      : negative > positive
                        ? "negative"
                        : "neutral",
                  confidence: Math.min(
                    (Math.abs(positive - negative) / words.length) * 10,
                    1,
                  ),
                };
                break;

              case "readability":
                const sentences = params.text.split(/[.!?]+/).length;
                const wordCount = params.text.split(" ").length;
                const avgWordsPerSentence = wordCount / sentences;

                results.readability = {
                  wordCount,
                  sentenceCount: sentences,
                  avgWordsPerSentence,
                  readabilityLevel:
                    avgWordsPerSentence < 15
                      ? "easy"
                      : avgWordsPerSentence < 25
                        ? "moderate"
                        : "difficult",
                };
                break;

              case "keywords":
                const wordFreq: Record<string, number> = {};
                const meaningfulWords = params.text
                  .toLowerCase()
                  .replace(/[^\w\s]/g, "")
                  .split(" ")
                  .filter((w) => w.length > 3);

                meaningfulWords.forEach((word) => {
                  wordFreq[word] = (wordFreq[word] || 0) + 1;
                });

                results.keywords = Object.entries(wordFreq)
                  .sort(([, a], [, b]) => b - a)
                  .slice(0, 10)
                  .map(([word, freq]) => ({ word, frequency: freq }));
                break;
            }
          });

          return {
            success: true,
            data: {
              textLength: params.text.length,
              analysisTypes: params.analysisTypes,
              results,
              analyzedAt: new Date().toISOString(),
            },
          };
        },
      },
    },
  },
});
```

### Mixed Tool Ecosystem Example

```typescript
import { NeuroLink } from "@juspay/neurolink";
import { createTool } from "@juspay/neurolink";
import { z } from "zod";

const neurolink = new NeuroLink();

// 1. Register simple custom tools (extending existing functionality)
neurolink.registerTool(
  "enhancedCalculator",
  createTool({
    description: "Enhanced calculator with scientific and financial functions",
    execute: (params: {
      expression: string;
      mode: "basic" | "scientific" | "financial";
    }) => {
      if (params.mode === "scientific" && params.expression.includes("sqrt")) {
        const num = parseFloat(
          params.expression.replace("sqrt(", "").replace(")", ""),
        );
        return { result: Math.sqrt(num), enhanced: true, mode: params.mode };
      }

      if (
        params.mode === "financial" &&
        params.expression.includes("compound")
      ) {
        // Parse: compound(principal, rate, time)
        const match = params.expression.match(
          /compound\((\d+),\s*([\d.]+),\s*(\d+)\)/,
        );
        if (match) {
          const [, principal, rate, time] = match.map(Number);
          const result = principal * Math.pow(1 + rate / 100, time);
          return {
            result,
            enhanced: true,
            mode: params.mode,
            calculation: "compound_interest",
          };
        }
      }

      // Use a safe, restricted math expression evaluator for security
      const {
        create,
        addDependencies,
        subtractDependencies,
        multiplyDependencies,
        divideDependencies,
        powDependencies,
        sqrtDependencies,
        absDependencies,
      } from "mathjs";

      // Create restricted math environment with only specific functions for security
      const dependencies = {
        addDependencies,
        subtractDependencies,
        multiplyDependencies,
        divideDependencies,
        powDependencies,
        sqrtDependencies,
        absDependencies,
      };

      const math = create(dependencies, {
        matrix: "Array",
        number: "number",
        precision: 64,
      });

      // Additional sanitization for basic mathematical expressions
      const sanitizedExpression = params.expression.replace(
        /[^0-9+\-*/().\s]/g,
        "",
      );
      if (sanitizedExpression !== params.expression) {
        return {
          error: "Expression contains invalid characters",
          enhanced: false,
          mode: params.mode,
        };
      }

      try {
        const result = math.evaluate(sanitizedExpression);
        return { result, enhanced: false, mode: params.mode };
      } catch (error) {
        return {
          error: `Mathematical expression failed: ${error.message || "Invalid expression"}`,
          enhanced: false,
          mode: params.mode,
        };
      }
    },
  }),
);

// 2. Add complete MCP servers (new functionality domains)
await neurolink.addInMemoryMCPServer("business-intelligence", {
  server: {
    title: "Business Intelligence Server",
    tools: {
      generateKPIReport: {
        description: "Generate comprehensive KPI reports for business metrics",
        execute: async (params: {
          metrics: string[];
          timeRange: string;
          department?: string;
        }) => {
          return {
            success: true,
            data: {
              reportId: `KPI-${Date.now()}`,
              metrics: params.metrics,
              timeRange: params.timeRange,
              department: params.department || "All",
              kpis: {
                revenue: "$1.2M",
                growth: "+15%",
                customerSatisfaction: "94%",
                efficiency: "87%",
              },
              trends: ["Revenue increasing", "Customer satisfaction stable"],
              recommendations: [
                "Focus on efficiency improvements",
                "Expand successful programs",
              ],
              generatedAt: new Date().toISOString(),
            },
          };
        },
      },

      predictTrends: {
        description: "Predict business trends using historical data",
        execute: async (params: {
          dataPoints: number[];
          predictionPeriod: number;
          algorithm: "linear" | "exponential" | "seasonal";
        }) => {
          // Simplified prediction logic
          const trend =
            params.dataPoints[params.dataPoints.length - 1] >
            params.dataPoints[0]
              ? "upward"
              : "downward";
          const avgGrowth =
            (params.dataPoints[params.dataPoints.length - 1] -
              params.dataPoints[0]) /
            params.dataPoints.length;

          return {
            success: true,
            data: {
              algorithm: params.algorithm,
              trend,
              predictedGrowth: avgGrowth,
              confidence: 0.85,
              predictions: Array.from(
                { length: params.predictionPeriod },
                (_, i) =>
                  params.dataPoints[params.dataPoints.length - 1] +
                  avgGrowth * (i + 1),
              ),
              generatedAt: new Date().toISOString(),
            },
          };
        },
      },
    },
  },
});

// 3. Use the mixed ecosystem
const comprehensiveResult = await neurolink.generate({
  input: {
    text: `Calculate compound interest for $10000 at 5% for 3 years, then generate a KPI report
           for revenue metrics over the last quarter, and predict trends for the next 6 months
           using the data points [100, 120, 115, 130, 125, 140]`,
  },
  provider: "google-ai",
  maxTokens: 2000,
});

// The AI will automatically:
// 1. Use enhancedCalculator for compound interest: compound(10000, 5, 3)
// 2. Use generateKPIReport for business metrics
// 3. Use predictTrends for forecasting
// 4. Synthesize all results into a comprehensive response

console.log("AI Response:", comprehensiveResult.content);
console.log("Tools Used:", comprehensiveResult.toolsUsed);
```

### Tool Discovery and Management

```typescript
// Get comprehensive view of all available tools
const allTools = await neurolink.getAllAvailableTools();

// Group tools by source
const toolsBySource = allTools.reduce(
  (acc, tool) => {
    const source = tool.serverId || "unknown";
    acc[source] = (acc[source] || 0) + 1;
    return acc;
  },
  {} as Record<string, number>,
);

console.log("Tool ecosystem summary:");
console.log("• Total tools available:", allTools.length);
console.log("• Tools by source:", toolsBySource);

// Get custom tools registered via registerTool()
const customTools = neurolink.getCustomTools();
console.log("• Custom tools registered:", customTools.size);

// Get in-memory MCP servers added via addInMemoryMCPServer()
const mcpServers = neurolink.getInMemoryServers();
console.log("• In-memory MCP servers:", mcpServers.size);

// Execute tools from any source using unified API
const timeResult = await neurolink.executeTool("getCurrentTime");
const calculationResult = await neurolink.executeTool("enhancedCalculator", {
  expression: "compound(5000, 4.5, 2)",
  mode: "financial",
});
const reportResult = await neurolink.executeTool("generateKPIReport", {
  metrics: ["revenue", "growth"],
  timeRange: "Q1-2024",
});

console.log("Tool execution results:");
console.log("• Built-in tool:", timeResult.data.time);
console.log("• Custom tool:", calculationResult.result);
console.log("• MCP server tool:", reportResult.data.reportId);
```

### Best Practices for MCP Integration

#### 1. Organize Tools by Domain

```typescript
// Group related tools into themed MCP servers
await neurolink.addInMemoryMCPServer("user-management", {
  server: {
    title: "User Management Server",
    tools: {
      createUser: {
        /* ... */
      },
      updateUser: {
        /* ... */
      },
      deleteUser: {
        /* ... */
      },
      getUserProfile: {
        /* ... */
      },
    },
  },
});

await neurolink.addInMemoryMCPServer("order-processing", {
  server: {
    title: "Order Processing Server",
    tools: {
      createOrder: {
        /* ... */
      },
      updateOrderStatus: {
        /* ... */
      },
      calculateShipping: {
        /* ... */
      },
      processPayment: {
        /* ... */
      },
    },
  },
});
```

#### 2. Consistent Error Handling

```typescript
execute: async (params) => {
  try {
    const result = await performOperation(params);
    return {
      success: true,
      data: result,
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      code: error.code || "OPERATION_FAILED",
      timestamp: new Date().toISOString(),
    };
  }
};
```

#### 3. Comprehensive Metadata

```typescript
await neurolink.addInMemoryMCPServer("server-id", {
  server: {
    title: "Human-Readable Server Name",
    description: "Detailed description of server purpose",
    tools: {
      /* ... */
    },
  },
  category: "business-logic", // Group similar servers
  metadata: {
    version: "2.1.0",
    author: "Your Team",
    lastUpdated: "2024-01-15",
    documentation: "https://docs.yourcompany.com/mcp-servers",
    supportContact: "support@yourcompany.com",
  },
});
```

## 📚 Additional Resources

- [API Reference - NeuroLink Class](./API-REFERENCE.md#neurolink-class-api)
- [MCP Integration Guide](./MCP-INTEGRATION.md)
- [Provider Tool Support](./index.md#provider-tool-support-status)
- [Test Examples](development/testing.md)
- [MCP SDK Integration Proof Tests](development/testing.md)
- [Real AI-MCP Integration Demo](development/testing.md)

---

**Start building powerful AI applications with custom tools and MCP servers today! 🚀**
