# Advanced Examples

Complex integration patterns, enterprise workflows, and sophisticated use cases for NeuroLink.

## 🏗️ Enterprise Architecture

### Multi-Provider Load Balancing

```typescript
import { NeuroLink, Provider } from "@juspay/neurolink";

class LoadBalancedNeuroLink {
  private instances: Map<Provider, NeuroLink>;
  private usage: Map<Provider, number>;
  private limits: Map<Provider, number>;

  constructor() {
    this.instances = new Map([
      ["openai", new NeuroLink({ defaultProvider: "openai" })],
      ["google-ai", new NeuroLink({ defaultProvider: "google-ai" })],
      ["anthropic", new NeuroLink({ defaultProvider: "anthropic" })],
    ]);

    this.usage = new Map([
      ["openai", 0],
      ["google-ai", 0],
      ["anthropic", 0],
    ]);

    // Daily rate limits
    this.limits = new Map([
      ["openai", 1000],
      ["google-ai", 2000],
      ["anthropic", 500],
    ]);
  }

  async generate(
    prompt: string,
    priority: "cost" | "speed" | "quality" = "speed",
  ) {
    const provider = this.selectOptimalProvider(priority);

    try {
      const result = await this.instances.get(provider)!.generate({
        input: { text: prompt },
      });

      this.usage.set(provider, this.usage.get(provider)! + 1);
      return { ...result, selectedProvider: provider };
    } catch (error) {
      console.warn(`Provider ${provider} failed, trying fallback...`);
      return this.generateWithFallback(prompt, provider);
    }
  }

  private selectOptimalProvider(priority: string): Provider {
    const available = Array.from(this.instances.keys()).filter(
      (provider) => this.usage.get(provider)! < this.limits.get(provider)!,
    );

    if (available.length === 0) {
      throw new Error("All providers have reached their limits");
    }

    switch (priority) {
      case "cost":
        return available.sort((a, b) => this.getCost(a) - this.getCost(b))[0];
      case "speed":
        return available.sort((a, b) => this.getSpeed(a) - this.getSpeed(b))[0];
      case "quality":
        return available.sort(
          (a, b) => this.getQuality(b) - this.getQuality(a),
        )[0];
      default:
        return available[0];
    }
  }

  private async generateWithFallback(prompt: string, failedProvider: Provider) {
    const remaining = Array.from(this.instances.keys()).filter(
      (p) => p !== failedProvider,
    );

    for (const provider of remaining) {
      try {
        const result = await this.instances.get(provider)!.generate({
          input: { text: prompt },
        });

        this.usage.set(provider, this.usage.get(provider)! + 1);
        return { ...result, selectedProvider: provider, fallback: true };
      } catch (error) {
        console.warn(`Fallback provider ${provider} also failed`);
      }
    }

    throw new Error("All providers failed");
  }

  private getCost(provider: Provider): number {
    const costs = { "google-ai": 1, openai: 2, anthropic: 3 };
    return costs[provider] || 999;
  }

  private getSpeed(provider: Provider): number {
    const speeds = { "google-ai": 1, openai: 2, anthropic: 3 };
    return speeds[provider] || 999;
  }

  private getQuality(provider: Provider): number {
    const quality = { anthropic: 10, openai: 9, "google-ai": 8 };
    return quality[provider] || 1;
  }

  getUsageStats() {
    return {
      usage: Object.fromEntries(this.usage),
      limits: Object.fromEntries(this.limits),
      remaining: Object.fromEntries(
        Array.from(this.limits.entries()).map(([provider, limit]) => [
          provider,
          limit - this.usage.get(provider)!,
        ]),
      ),
    };
  }
}

// Usage
const balancer = new LoadBalancedNeuroLink();

const result = await balancer.generate(
  "Write a technical analysis",
  "quality", // Prioritize quality
);

console.log(`Used provider: ${result.selectedProvider}`);
console.log("Usage stats:", balancer.getUsageStats());
```

### Caching and Performance Optimization

```typescript
import { LRUCache } from "lru-cache";
import crypto from "crypto";

class CachedNeuroLink {
  private neurolink: NeuroLink;
  private cache: LRUCache<string, any>;
  private analytics: Map<string, any>;

  constructor() {
    this.neurolink = new NeuroLink();
    this.cache = new LRUCache({
      max: 1000,
      ttl: 1000 * 60 * 60, // 1 hour TTL
      sizeCalculation: (value) => JSON.stringify(value).length,
    });
    this.analytics = new Map();
  }

  async generate(params: any, options: { useCache?: boolean } = {}) {
    const cacheKey = this.createCacheKey(params);
    const startTime = Date.now();

    // Check cache first
    if (options.useCache !== false) {
      const cached = this.cache.get(cacheKey);
      if (cached) {
        this.recordAnalytics(cacheKey, "cache_hit", Date.now() - startTime);
        return { ...cached, fromCache: true };
      }
    }

    // Generate new response
    try {
      const result = await this.neurolink.generate(params);
      const duration = Date.now() - startTime;

      // Cache the result
      if (options.useCache !== false) {
        this.cache.set(cacheKey, result);
      }

      this.recordAnalytics(cacheKey, "api_call", duration);
      return { ...result, fromCache: false };
    } catch (error) {
      this.recordAnalytics(cacheKey, "error", Date.now() - startTime);
      throw error;
    }
  }

  private createCacheKey(params: any): string {
    const normalized = {
      text: params.input?.text,
      provider: params.provider,
      temperature: params.temperature,
      maxTokens: params.maxTokens,
    };

    return crypto
      .createHash("sha256")
      .update(JSON.stringify(normalized))
      .digest("hex");
  }

  private recordAnalytics(key: string, type: string, duration: number) {
    if (!this.analytics.has(key)) {
      this.analytics.set(key, []);
    }

    this.analytics.get(key).push({
      type,
      duration,
      timestamp: new Date().toISOString(),
    });
  }

  getCacheStats() {
    return {
      size: this.cache.size,
      hits: Array.from(this.analytics.values())
        .flat()
        .filter((event) => event.type === "cache_hit").length,
      misses: Array.from(this.analytics.values())
        .flat()
        .filter((event) => event.type === "api_call").length,
      errors: Array.from(this.analytics.values())
        .flat()
        .filter((event) => event.type === "error").length,
    };
  }

  clearCache() {
    this.cache.clear();
    this.analytics.clear();
  }
}

// Usage
const cachedNeuroLink = new CachedNeuroLink();

// First call - will hit API
const result1 = await cachedNeuroLink.generate({
  input: { text: "Explain caching" },
});

// Second identical call - will hit cache
const result2 = await cachedNeuroLink.generate({
  input: { text: "Explain caching" },
});

console.log("Cache stats:", cachedNeuroLink.getCacheStats());
```

## 🔄 Workflow Automation

### Document Processing Pipeline

```typescript
class DocumentProcessor {
  private neurolink: NeuroLink;

  constructor() {
    this.neurolink = new NeuroLink();
  }

  async processDocument(document: string, workflow: string[]) {
    const results = { originalDocument: document, steps: [] };
    let currentContent = document;

    for (const [index, step] of workflow.entries()) {
      console.log(`Processing step ${index + 1}: ${step}`);

      try {
        const result = await this.executeStep(currentContent, step);

        results.steps.push({
          step,
          input: currentContent,
          output: result.content,
          provider: result.provider,
          usage: result.usage,
        });

        currentContent = result.content;
      } catch (error) {
        results.steps.push({
          step,
          error: error.message,
        });
        break;
      }
    }

    return results;
  }

  private async executeStep(content: string, instruction: string) {
    return await this.neurolink.generate({
      input: {
        text: `${instruction}\n\nContent to process:\n${content}`,
      },
      provider: "anthropic", // Claude is good for document processing
      temperature: 0.3,
    });
  }
}

// Usage - Document improvement workflow
const processor = new DocumentProcessor();

const workflow = [
  "Fix any grammar and spelling errors",
  "Improve clarity and readability",
  "Add section headings where appropriate",
  "Create a table of contents",
  "Add a conclusion summary",
];

const result = await processor.processDocument(rawDocument, workflow);

console.log(
  "Final processed document:",
  result.steps[result.steps.length - 1].output,
);
```

### Multi-Stage Content Creation

```typescript
class ContentCreationPipeline {
  private neurolink: NeuroLink;

  constructor() {
    this.neurolink = new NeuroLink();
  }

  async createArticle(
    topic: string,
    audience: string,
    length: "short" | "medium" | "long",
  ) {
    const stages = [
      { name: "research", provider: "google-ai" },
      { name: "outline", provider: "anthropic" },
      { name: "draft", provider: "openai" },
      { name: "review", provider: "anthropic" },
      { name: "finalize", provider: "openai" },
    ];

    const context = { topic, audience, length };
    let content = "";
    const stageResults = [];

    for (const stage of stages) {
      const result = await this.executeStage(stage, content, context);
      stageResults.push(result);
      content = result.content;
    }

    return {
      finalContent: content,
      stages: stageResults,
      metadata: {
        topic,
        audience,
        length,
        createdAt: new Date().toISOString(),
        wordCount: content.split(" ").length,
      },
    };
  }

  private async executeStage(
    stage: any,
    previousContent: string,
    context: any,
  ) {
    const prompts = {
      research: `Research key points about "${context.topic}" for ${context.audience}. 
                 Provide 5-7 main points with brief explanations.`,

      outline: `Create a detailed outline for a ${context.length} article about "${context.topic}" 
                for ${context.audience}. Base it on this research: ${previousContent}`,

      draft: `Write a ${context.length} article based on this outline: ${previousContent}. 
              Target audience: ${context.audience}. Make it engaging and informative.`,

      review: `Review and improve this article: ${previousContent}. 
               Check for clarity, flow, and engagement. Suggest improvements.`,

      finalize: `Apply these improvements to create the final version: ${previousContent}`,
    };

    const result = await this.neurolink.generate({
      input: { text: prompts[stage.name] },
      provider: stage.provider,
      temperature: stage.name === "draft" ? 0.8 : 0.5,
    });

    return {
      stage: stage.name,
      provider: stage.provider,
      content: result.content,
      usage: result.usage,
    };
  }
}

// Usage
const pipeline = new ContentCreationPipeline();

const article = await pipeline.createArticle(
  "AI automation in healthcare",
  "healthcare professionals",
  "long",
);

console.log("Final article:", article.finalContent);
console.log("Creation metadata:", article.metadata);
```

## 🤖 AI Agent Framework

### Specialized AI Agents

```typescript
abstract class AIAgent {
  protected neurolink: NeuroLink;
  protected specialization: string;
  protected temperature: number;
  protected preferredProvider: string;

  constructor(specialization: string, config: any = {}) {
    this.neurolink = new NeuroLink();
    this.specialization = specialization;
    this.temperature = config.temperature || 0.7;
    this.preferredProvider = config.provider || "auto";
  }

  abstract getSystemPrompt(): string;

  async process(input: string, context: any = {}): Promise<any> {
    const systemPrompt = this.getSystemPrompt();
    const fullPrompt = `${systemPrompt}\n\nTask: ${input}`;

    const result = await this.neurolink.generate({
      input: { text: fullPrompt },
      provider: this.preferredProvider,
      temperature: this.temperature,
      context: { agent: this.specialization, ...context },
    });

    return this.postProcess(result);
  }

  protected postProcess(result: any): any {
    return result;
  }
}

class CodeReviewAgent extends AIAgent {
  constructor() {
    super("code_reviewer", {
      temperature: 0.3,
      provider: "anthropic",
    });
  }

  getSystemPrompt(): string {
    return `You are a senior software engineer conducting code reviews. 
            Analyze code for:
            - Security vulnerabilities
            - Performance issues  
            - Best practices violations
            - Maintainability concerns
            
            Provide specific, actionable feedback with examples.`;
  }

  protected postProcess(result: any): any {
    // Parse structured feedback
    const feedback = result.content;

    return {
      ...result,
      issues: this.extractIssues(feedback),
      suggestions: this.extractSuggestions(feedback),
      severity: this.assessSeverity(feedback),
    };
  }

  private extractIssues(feedback: string): string[] {
    // Extract issues using regex or LLM parsing
    return feedback.match(/Issue: (.+)/g) || [];
  }

  private extractSuggestions(feedback: string): string[] {
    return feedback.match(/Suggestion: (.+)/g) || [];
  }

  private assessSeverity(feedback: string): "low" | "medium" | "high" {
    if (feedback.includes("security") || feedback.includes("vulnerability")) {
      return "high";
    }
    if (feedback.includes("performance") || feedback.includes("bug")) {
      return "medium";
    }
    return "low";
  }
}

class BusinessAnalystAgent extends AIAgent {
  constructor() {
    super("business_analyst", {
      temperature: 0.5,
      provider: "openai",
    });
  }

  getSystemPrompt(): string {
    return `You are a senior business analyst. Analyze business requirements and provide:
            - Stakeholder analysis
            - Risk assessment
            - Success metrics
            - Implementation recommendations
            
            Be data-driven and consider business impact.`;
  }

  async analyzeRequirement(requirement: string, businessContext: any) {
    return await this.process(requirement, {
      department: businessContext.department,
      budget: businessContext.budget,
      timeline: businessContext.timeline,
    });
  }
}

// Agent Manager
class AgentManager {
  private agents: Map<string, AIAgent>;

  constructor() {
    this.agents = new Map([
      ["code_review", new CodeReviewAgent()],
      ["business_analysis", new BusinessAnalystAgent()],
    ]);
  }

  async processTask(agentType: string, task: string, context: any = {}) {
    const agent = this.agents.get(agentType);
    if (!agent) {
      throw new Error(`Unknown agent type: ${agentType}`);
    }

    return await agent.process(task, context);
  }

  addAgent(name: string, agent: AIAgent) {
    this.agents.set(name, agent);
  }
}

// Usage
const manager = new AgentManager();

// Code review
const codeReview = await manager.processTask(
  "code_review",
  `
  function processPayment(amount, cardNumber) {
    // Store card number in localStorage
    localStorage.setItem('card', cardNumber);
    
    // Process payment
    return fetch('/api/payment', {
      method: 'POST',
      body: JSON.stringify({ amount, cardNumber })
    });
  }
`,
);

console.log("Code review results:", codeReview);

// Business analysis
const bizAnalysis = await manager.processTask(
  "business_analysis",
  "Implement real-time analytics dashboard for customer behavior tracking",
  {
    department: "product",
    budget: 50000,
    timeline: "3 months",
  },
);

console.log("Business analysis:", bizAnalysis.content);
```

## 📊 Advanced Analytics Integration

### Custom Analytics Collection

```typescript
class AdvancedAnalytics {
  private neurolink: NeuroLink;
  private metrics: Map<string, any[]>;
  private webhookUrl?: string;

  constructor(webhookUrl?: string) {
    this.neurolink = new NeuroLink({
      analytics: { enabled: true },
    });
    this.metrics = new Map();
    this.webhookUrl = webhookUrl;
  }

  async generateWithAnalytics(
    prompt: string,
    metadata: any = {},
    customMetrics: string[] = [],
  ) {
    const startTime = Date.now();
    const sessionId = this.generateSessionId();

    try {
      const result = await this.neurolink.generate({
        input: { text: prompt },
        context: {
          sessionId,
          metadata,
          customMetrics,
        },
      });

      const duration = Date.now() - startTime;

      // Collect detailed metrics
      const analytics = {
        sessionId,
        timestamp: new Date().toISOString(),
        prompt: prompt.substring(0, 100), // Truncated for privacy
        provider: result.provider,
        duration,
        tokenUsage: result.usage,
        success: true,
        metadata,
        customMetrics: await this.collectCustomMetrics(result, customMetrics),
      };

      await this.recordMetrics(analytics);

      return { ...result, analytics };
    } catch (error) {
      const analytics = {
        sessionId,
        timestamp: new Date().toISOString(),
        duration: Date.now() - startTime,
        success: false,
        error: error.message,
        metadata,
      };

      await this.recordMetrics(analytics);
      throw error;
    }
  }

  private async collectCustomMetrics(result: any, metrics: string[]) {
    const customData: any = {};

    for (const metric of metrics) {
      switch (metric) {
        case "sentiment":
          customData.sentiment = await this.analyzeSentiment(result.content);
          break;
        case "readability":
          customData.readability = this.calculateReadability(result.content);
          break;
        case "keyword_density":
          customData.keywords = this.extractKeywords(result.content);
          break;
      }
    }

    return customData;
  }

  private async analyzeSentiment(text: string): Promise<any> {
    const result = await this.neurolink.generate({
      input: {
        text: `Analyze the sentiment of this text (positive/negative/neutral): ${text}`,
      },
      temperature: 0.1,
      maxTokens: 50,
    });

    return { sentiment: result.content.toLowerCase().trim() };
  }

  private calculateReadability(text: string): any {
    const sentences = text.split(/[.!?]+/).length;
    const words = text.split(/\s+/).length;
    const avgWordsPerSentence = words / sentences;

    return {
      wordCount: words,
      sentenceCount: sentences,
      avgWordsPerSentence: Math.round(avgWordsPerSentence * 100) / 100,
      readabilityScore: this.getReadabilityScore(avgWordsPerSentence),
    };
  }

  private getReadabilityScore(avgWords: number): string {
    if (avgWords < 15) return "easy";
    if (avgWords < 25) return "medium";
    return "hard";
  }

  private extractKeywords(text: string): string[] {
    // Simple keyword extraction (in practice, use NLP library)
    return (
      text
        .toLowerCase()
        .match(/\b\w{4,}\b/g)
        ?.filter((word, index, array) => array.indexOf(word) === index)
        ?.slice(0, 10) || []
    );
  }

  private async recordMetrics(analytics: any) {
    // Store locally
    const key = analytics.sessionId || "general";
    if (!this.metrics.has(key)) {
      this.metrics.set(key, []);
    }
    this.metrics.get(key)!.push(analytics);

    // Send to webhook if configured
    if (this.webhookUrl) {
      try {
        await fetch(this.webhookUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(analytics),
        });
      } catch (error) {
        console.warn("Failed to send analytics to webhook:", error);
      }
    }
  }

  generateReport(timeRange: { start: Date; end: Date }) {
    const allMetrics = Array.from(this.metrics.values()).flat();
    const filtered = allMetrics.filter((m) => {
      const timestamp = new Date(m.timestamp);
      return timestamp >= timeRange.start && timestamp <= timeRange.end;
    });

    const successRate =
      filtered.filter((m) => m.success).length / filtered.length;
    const avgDuration =
      filtered.reduce((sum, m) => sum + m.duration, 0) / filtered.length;
    const providerUsage = this.groupBy(filtered, "provider");

    return {
      totalRequests: filtered.length,
      successRate: Math.round(successRate * 100),
      avgDuration: Math.round(avgDuration),
      providerBreakdown: providerUsage,
      timeRange,
    };
  }

  private groupBy(array: any[], key: string) {
    return array.reduce((groups, item) => {
      const group = item[key] || "unknown";
      groups[group] = (groups[group] || 0) + 1;
      return groups;
    }, {});
  }

  private generateSessionId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }
}

// Usage
const analytics = new AdvancedAnalytics(
  "https://analytics.company.com/webhook",
);

const result = await analytics.generateWithAnalytics(
  "Write a product description for our new AI tool",
  {
    department: "marketing",
    campaign: "Q4_launch",
    user_id: "user123",
  },
  ["sentiment", "readability", "keyword_density"],
);

console.log("Response:", result.content);
console.log("Analytics:", result.analytics);

// Generate report
const report = analytics.generateReport({
  start: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
  end: new Date(),
});

console.log("Analytics report:", report);
```

This advanced examples documentation provides sophisticated patterns for enterprise usage, workflow automation, AI agent frameworks, and comprehensive analytics integration. These examples demonstrate how NeuroLink can be extended for complex, production-ready applications.

## 📚 Related Documentation

- [Basic Usage](basic-usage.md) - Simple examples to get started
- [Business Examples](business.md) - Business-focused use cases
- [CLI Advanced Usage](../cli/advanced.md) - Command-line patterns
- [SDK Reference](../sdk/api-reference.md) - Complete API documentation
