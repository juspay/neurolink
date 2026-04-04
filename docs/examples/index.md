---
description: Learn NeuroLink through practical examples and step-by-step tutorials for real-world applications.
---

# Examples & Tutorials

Learn NeuroLink through practical examples and step-by-step tutorials for real-world applications.

## 🎯 What You'll Find Here

This section contains practical implementations, use cases, and tutorials to help you integrate NeuroLink into your projects effectively.

- **[Basic Usage](basic-usage.md)** — Fundamental examples for both CLI and SDK usage, covering core functionality and common patterns.
- **[Advanced Examples](advanced.md)** — Complex implementations showcasing advanced features like custom tools, analytics, and streaming.
- **[Use Cases](use-cases.md)** — Real-world scenarios and applications across different industries and project types.
- **[Business Applications](business.md)** — Enterprise-focused examples for production deployments and business automation.

## 🚀 Quick Examples

=== "Simple Text Generation"

    ```bash
    # CLI - Get started immediately
    npx @juspay/neurolink generate "Write a professional email"

    # With specific provider
    npx @juspay/neurolink gen "Explain AI" --provider google-ai
    ```

    ```typescript
    // SDK - Basic integration
    import { NeuroLink } from "@juspay/neurolink";

    const neurolink = new NeuroLink();
    const result = await neurolink.generate({
      input: { text: "Create a product description" },
    });

    console.log(result.content);
    ```

=== "With Analytics"

    ```bash
    # CLI - Track usage and costs
    npx @juspay/neurolink generate "Business proposal" \
      --enable-analytics \
      --enable-evaluation \
      --debug
    ```

    ```typescript
    // SDK - Monitor performance
    const result = await neurolink.generate({
      input: { text: "Market analysis report" },
      enableAnalytics: true,
      enableEvaluation: true,
    });

    console.log(`Cost: $${result.analytics.cost}`);
    console.log(`Quality: ${result.evaluation.overall}/10`);
    ```

=== "Custom Tools"

    ```typescript
    // Register a custom weather tool
    neurolink.registerTool("weather", {
      description: "Get weather for a city",
      parameters: z.object({
        city: z.string(),
        units: z.enum(["C", "F"]).default("C"),
      }),
      execute: async ({ city, units }) => {
        const data = await fetchWeather(city);
        return {
          city,
          temperature: units === "F"
            ? (data.temp * 9/5) + 32
            : data.temp,
          condition: data.condition,
        };
      },
    });

    // Use the tool
    const result = await neurolink.generate({
      input: { text: "What's the weather in Tokyo?" },
    });
    ```

## 🏗️ Framework Integration Examples

=== "Next.js"

    ```typescript
    // app/api/ai/route.ts
    import { NeuroLink } from "@juspay/neurolink";

    export async function POST(request: Request) {
      const { prompt, context } = await request.json();

      const neurolink = new NeuroLink();
      const result = await neurolink.generate({
        input: { text: prompt },
        context,
        enableAnalytics: true,
      });

      return Response.json({
        content: result.content,
        usage: result.analytics,
      });
    }
    ```

=== "SvelteKit"

    ```typescript
    // src/routes/api/stream/+server.ts
    import { createBestAIProvider } from "@juspay/neurolink";

    export const POST: RequestHandler = async ({ request }) => {
      const { message } = await request.json();
      const provider = createBestAIProvider();

      const result = await provider.stream({
        input: { text: message },
        timeout: "2m",
      });

      // Manually create ReadableStream from AsyncIterable
      const readable = new ReadableStream({
        async start(controller) {
          try {
            for await (const chunk of result.stream) {
              if (chunk && typeof chunk === "object" && "content" in chunk) {
                controller.enqueue(new TextEncoder().encode(chunk.content));
              }
            }
            controller.close();
          } catch (error) {
            controller.error(error);
          }
        },
      });

      return new Response(readable, {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
        },
      });
    };
    ```

=== "Express.js"

    ```typescript
    import express from 'express';
    import { NeuroLink } from "@juspay/neurolink";

    const app = express();
    const neurolink = new NeuroLink();

    app.post('/api/generate', async (req, res) => {
      try {
        const result = await neurolink.generate({
          input: { text: req.body.prompt },
          provider: req.body.provider,
          enableAnalytics: true,
        });

        res.json({
          success: true,
          content: result.content,
          analytics: result.analytics,
        });
      } catch (error) {
        res.status(500).json({
          success: false,
          error: error.message,
        });
      }
    });
    ```

## 🎨 Common Use Cases

### Content Creation

```typescript
// Blog post generator with SEO optimization
const generateBlogPost = async (topic: string, keywords: string[]) => {
  const result = await neurolink.generate({
    input: {
      text: `Write a comprehensive blog post about ${topic}. 
             Include these keywords naturally: ${keywords.join(", ")}`,
    },
    maxTokens: 2000,
    temperature: 0.7,
    enableAnalytics: true,
  });

  return {
    content: result.content,
    wordCount: result.content.split(" ").length,
    cost: result.analytics.cost,
  };
};
```

### Code Generation

```typescript
// Code review and suggestions
const reviewCode = async (codeSnippet: string, language: string) => {
  const result = await neurolink.generate({
    input: {
      text: `Review this ${language} code and provide suggestions:
             \`\`\`${language}
             ${codeSnippet}
             \`\`\``,
    },
    enableEvaluation: true,
  });

  return {
    review: result.content,
    confidence: result.evaluation.overall,
  };
};
```

### Data Analysis

```typescript
// Automated report generation
const generateReport = async (data: any[], reportType: string) => {
  const summary = JSON.stringify(data.slice(0, 5)); // Sample data

  const result = await neurolink.generate({
    input: {
      text: `Generate a ${reportType} report based on this data sample: ${summary}`,
    },
    context: {
      reportType,
      dataSize: data.length,
      timestamp: new Date().toISOString(),
    },
    enableAnalytics: true,
  });

  return result;
};
```

## 🔄 Batch Processing

```bash
# CLI batch processing
echo -e "Product description for laptop\nProduct description for phone\nProduct description for tablet" > products.txt
npx @juspay/neurolink batch products.txt --output descriptions.json
```

```typescript
// SDK batch processing
const generateMultiple = async (prompts: string[]) => {
  const results = await Promise.all(
    prompts.map((prompt) =>
      neurolink.generate({
        input: { text: prompt },
        enableAnalytics: true,
      }),
    ),
  );

  const totalCost = results.reduce(
    (sum, result) => sum + (result.analytics?.cost || 0),
    0,
  );

  return { results, totalCost };
};
```

## 🎯 Learning Path

1. **Start with [Basic Usage](basic-usage.md)** - Core functionality
2. **Explore [Use Cases](use-cases.md)** - Find relevant scenarios
3. **Try [Advanced Examples](advanced.md)** - Complex implementations
4. **Study [Business Applications](business.md)** - Production patterns

## 🔗 Related Resources

- **[CLI Guide](../cli/index.md)** - Complete command reference
- **[SDK Reference](../sdk/index.md)** - API documentation
- **[Advanced Features](../advanced/index.md)** - Enterprise capabilities
- **[Visual Demos](../demos/index.md)** - See examples in action
