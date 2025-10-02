---
title: Real-World Use Cases
description: 12 production-ready AI use cases with complete implementation examples
keywords: use cases, examples, production, customer support, content generation, RAG
---

# Real-World Use Cases

**Practical examples and production-ready patterns for common AI integration scenarios**

---

## Overview

This guide showcases 12+ real-world use cases demonstrating how to build production-ready AI applications with NeuroLink. Each use case includes complete implementation code, cost optimization strategies, and best practices.

---

## 1. Customer Support Automation

**Scenario**: Automated customer support with multi-provider failover and cost optimization.

### Architecture

```
User Query → Intent Classification → Route to:
  - FAQ Bot (Free Tier: Google AI)
  - Complex Support (GPT-4o)
  - Escalation (Human Agent)
```

### Implementation

```typescript
import { NeuroLink } from "@raisahai/neurolink";

class CustomerSupportBot {
  private ai: NeuroLink;

  constructor() {
    this.ai = new NeuroLink({
      providers: [
        {
          name: "google-ai-free",
          priority: 1,
          config: {
            apiKey: process.env.GOOGLE_AI_KEY,
            model: "gemini-2.0-flash",
          },
          quotas: { daily: 1500 },
        },
        {
          name: "openai",
          priority: 2,
          config: {
            apiKey: process.env.OPENAI_API_KEY,
            model: "gpt-4o-mini",
          },
        },
      ],
      failoverConfig: { enabled: true, fallbackOnQuota: true },
    });
  }

  async classifyIntent(query: string): Promise<"faq" | "complex" | "escalate"> {
    const result = await this.ai.generate({
      input: {
        text: `Classify customer support intent:
Query: "${query}"

Return only one word: faq, complex, or escalate`,
      },
      provider: "google-ai-free",
    });

    const intent = result.content.toLowerCase().trim();
    return ["faq", "complex", "escalate"].includes(intent)
      ? (intent as any)
      : "complex";
  }

  async handleFAQ(query: string): Promise<string> {
    const result = await this.ai.generate({
      input: {
        text: `Answer this FAQ question concisely:
${query}

Use our knowledge base:
- Returns: 30-day return policy
- Shipping: 3-5 business days
- Payment: Credit card, PayPal accepted`,
      },
      provider: "google-ai-free",
      model: "gemini-2.0-flash",
    });

    return result.content;
  }

  async handleComplexQuery(
    query: string,
    conversationHistory: string[],
  ): Promise<string> {
    const result = await this.ai.generate({
      input: {
        text: `You are a helpful customer support agent.

Conversation history:
${conversationHistory.join("\n")}

Customer: ${query}

Provide a detailed, helpful response.`,
      },
      provider: "openai",
      model: "gpt-4o",
    });

    return result.content;
  }

  async processQuery(
    query: string,
    conversationHistory: string[] = [],
  ): Promise<{
    response: string;
    intent: string;
    escalated: boolean;
  }> {
    const intent = await this.classifyIntent(query);

    if (intent === "escalate") {
      return {
        response:
          "I've escalated your request to a human agent. They'll be with you shortly.",
        intent,
        escalated: true,
      };
    }

    const response =
      intent === "faq"
        ? await this.handleFAQ(query)
        : await this.handleComplexQuery(query, conversationHistory);

    return { response, intent, escalated: false };
  }
}

const supportBot = new CustomerSupportBot();

const result = await supportBot.processQuery("What is your return policy?");
```

**Cost Analysis**:

- FAQ queries (80%): Free tier (Google AI)
- Complex queries (18%): $0.15 per 1M input tokens (GPT-4o-mini)
- Escalations (2%): Human agent
- **Total savings**: 90% vs. using GPT-4o for all queries

---

## 2. Content Generation Pipeline

**Scenario**: Multi-stage content generation with drafting, editing, and SEO optimization.

### Implementation

```typescript
class ContentGenerationPipeline {
  private ai: NeuroLink;

  constructor() {
    this.ai = new NeuroLink({
      providers: [
        { name: "openai", config: { apiKey: process.env.OPENAI_API_KEY } },
        {
          name: "anthropic",
          config: { apiKey: process.env.ANTHROPIC_API_KEY },
        },
      ],
      loadBalancing: "round-robin",
    });
  }

  async generateDraft(topic: string, keywords: string[]): Promise<string> {
    const result = await this.ai.generate({
      input: {
        text: `Write a 500-word blog post about: ${topic}

Include these keywords naturally: ${keywords.join(", ")}

Structure: Introduction, 3 main points, conclusion`,
      },
      provider: "openai",
      model: "gpt-4o-mini",
    });

    return result.content;
  }

  async improveDraft(draft: string): Promise<string> {
    const result = await this.ai.generate({
      input: {
        text: `Improve this draft for clarity, engagement, and readability:

${draft}

Make it more engaging while keeping the same length.`,
      },
      provider: "anthropic",
      model: "claude-3-5-sonnet-20241022",
    });

    return result.content;
  }

  async optimizeSEO(
    content: string,
    keywords: string[],
  ): Promise<{
    content: string;
    seoScore: number;
    suggestions: string[];
  }> {
    const result = await this.ai.generate({
      input: {
        text: `Analyze SEO for this content:

${content}

Target keywords: ${keywords.join(", ")}

Return JSON:
{
  "optimizedContent": "...",
  "seoScore": 0-100,
  "suggestions": ["..."]
}`,
      },
      provider: "openai",
      model: "gpt-4o",
    });

    return JSON.parse(result.content);
  }

  async generateMetadata(content: string): Promise<{
    title: string;
    description: string;
    tags: string[];
  }> {
    const result = await this.ai.generate({
      input: {
        text: `Generate SEO metadata for this article:

${content.substring(0, 1000)}...

Return JSON:
{
  "title": "60 chars max",
  "description": "160 chars max",
  "tags": ["tag1", "tag2", "tag3"]
}`,
      },
      provider: "openai",
      model: "gpt-4o-mini",
    });

    return JSON.parse(result.content);
  }

  async generateComplete(
    topic: string,
    keywords: string[],
  ): Promise<{
    content: string;
    metadata: any;
    seoScore: number;
  }> {
    const draft = await this.generateDraft(topic, keywords);
    const improved = await this.improveDraft(draft);
    const seoResult = await this.optimizeSEO(improved, keywords);
    const metadata = await this.generateMetadata(seoResult.content);

    return {
      content: seoResult.content,
      metadata,
      seoScore: seoResult.seoScore,
    };
  }
}

const pipeline = new ContentGenerationPipeline();

const article = await pipeline.generateComplete(
  "AI-powered customer support automation",
  ["AI", "automation", "customer support", "chatbot"],
);
```

---

## 3. Code Review Automation

**Scenario**: Automated code review with security, performance, and style checks.

### Implementation

```typescript
import { NeuroLink } from "@raisahai/neurolink";
import { Octokit } from "@octokit/rest";

class CodeReviewBot {
  private ai: NeuroLink;
  private github: Octokit;

  constructor() {
    this.ai = new NeuroLink({
      providers: [
        {
          name: "anthropic",
          config: {
            apiKey: process.env.ANTHROPIC_API_KEY,
            model: "claude-3-5-sonnet-20241022",
          },
        },
      ],
    });

    this.github = new Octokit({ auth: process.env.GITHUB_TOKEN });
  }

  async reviewCode(
    code: string,
    language: string,
  ): Promise<{
    security: string[];
    performance: string[];
    style: string[];
    bugs: string[];
    score: number;
  }> {
    const result = await this.ai.generate({
      input: {
        text: `Review this ${language} code:

\`\`\`${language}
${code}
\`\`\`

Analyze for:
1. Security vulnerabilities
2. Performance issues
3. Code style violations
4. Potential bugs

Return JSON:
{
  "security": ["issue1", "issue2"],
  "performance": ["issue1"],
  "style": ["issue1"],
  "bugs": ["issue1"],
  "score": 0-100
}`,
      },
      provider: "anthropic",
    });

    return JSON.parse(result.content);
  }

  async reviewPullRequest(
    owner: string,
    repo: string,
    prNumber: number,
  ): Promise<void> {
    const { data: pr } = await this.github.pulls.get({
      owner,
      repo,
      pull_number: prNumber,
    });

    const { data: files } = await this.github.pulls.listFiles({
      owner,
      repo,
      pull_number: prNumber,
    });

    const reviews = await Promise.all(
      files.map(async (file) => {
        if (!file.patch) return null;

        const language = file.filename.split(".").pop();
        const review = await this.reviewCode(file.patch, language);

        return {
          filename: file.filename,
          review,
        };
      }),
    );

    const comments = reviews
      .filter((r) => r !== null)
      .flatMap((r) => {
        const issues = [
          ...r.review.security.map((s) => `🔒 Security: ${s}`),
          ...r.review.performance.map((p) => `⚡ Performance: ${p}`),
          ...r.review.bugs.map((b) => `🐛 Bug: ${b}`),
        ];

        return issues.map((issue) => ({
          path: r.filename,
          body: issue,
          position: 1,
        }));
      });

    if (comments.length > 0) {
      await this.github.pulls.createReview({
        owner,
        repo,
        pull_number: prNumber,
        event: "COMMENT",
        comments,
      });
    }
  }
}

const reviewBot = new CodeReviewBot();
await reviewBot.reviewPullRequest("myorg", "myrepo", 123);
```

---

## 4. Document Analysis & Summarization

**Scenario**: Extract insights from large documents (PDFs, contracts, reports).

### Implementation

```typescript
import { NeuroLink } from "@raisahai/neurolink";
import pdf from "pdf-parse";
import fs from "fs/promises";

class DocumentAnalyzer {
  private ai: NeuroLink;

  constructor() {
    this.ai = new NeuroLink({
      providers: [
        {
          name: "anthropic",
          config: {
            apiKey: process.env.ANTHROPIC_API_KEY,
            model: "claude-3-5-sonnet-20241022",
          },
        },
      ],
    });
  }

  async extractTextFromPDF(pdfPath: string): Promise<string> {
    const dataBuffer = await fs.readFile(pdfPath);
    const data = await pdf(dataBuffer);
    return data.text;
  }

  async summarizeDocument(
    text: string,
    length: "short" | "medium" | "long" = "medium",
  ): Promise<string> {
    const lengthMap = {
      short: "3 sentences",
      medium: "1 paragraph",
      long: "3 paragraphs",
    };

    const result = await this.ai.generate({
      input: {
        text: `Summarize this document in ${lengthMap[length]}:

${text.substring(0, 100000)}`,
      },
      provider: "anthropic",
    });

    return result.content;
  }

  async extractKeyPoints(text: string): Promise<string[]> {
    const result = await this.ai.generate({
      input: {
        text: `Extract 5-10 key points from this document:

${text.substring(0, 100000)}

Return as JSON array: ["point1", "point2", ...]`,
      },
      provider: "anthropic",
    });

    return JSON.parse(result.content);
  }

  async analyzeSentiment(text: string): Promise<{
    sentiment: "positive" | "neutral" | "negative";
    score: number;
    reasoning: string;
  }> {
    const result = await this.ai.generate({
      input: {
        text: `Analyze sentiment of this document:

${text.substring(0, 50000)}

Return JSON:
{
  "sentiment": "positive|neutral|negative",
  "score": 0-100,
  "reasoning": "..."
}`,
      },
      provider: "anthropic",
    });

    return JSON.parse(result.content);
  }

  async extractEntities(text: string): Promise<{
    people: string[];
    organizations: string[];
    locations: string[];
    dates: string[];
  }> {
    const result = await this.ai.generate({
      input: {
        text: `Extract named entities from this document:

${text.substring(0, 50000)}

Return JSON:
{
  "people": ["name1", "name2"],
  "organizations": ["org1", "org2"],
  "locations": ["loc1", "loc2"],
  "dates": ["date1", "date2"]
}`,
      },
      provider: "anthropic",
    });

    return JSON.parse(result.content);
  }

  async analyzeComplete(pdfPath: string): Promise<{
    summary: string;
    keyPoints: string[];
    sentiment: any;
    entities: any;
  }> {
    const text = await this.extractTextFromPDF(pdfPath);

    const [summary, keyPoints, sentiment, entities] = await Promise.all([
      this.summarizeDocument(text),
      this.extractKeyPoints(text),
      this.analyzeSentiment(text),
      this.extractEntities(text),
    ]);

    return { summary, keyPoints, sentiment, entities };
  }
}

const analyzer = new DocumentAnalyzer();
const analysis = await analyzer.analyzeComplete("./contract.pdf");
```

---

## 5. Multi-Language Translation Service

**Scenario**: High-quality translation with context awareness and cost optimization.

### Implementation

```typescript
class TranslationService {
  private ai: NeuroLink;

  constructor() {
    this.ai = new NeuroLink({
      providers: [
        {
          name: "openai",
          priority: 1,
          config: {
            apiKey: process.env.OPENAI_API_KEY,
            model: "gpt-4o-mini",
          },
        },
        {
          name: "anthropic",
          priority: 2,
          config: {
            apiKey: process.env.ANTHROPIC_API_KEY,
            model: "claude-3-5-haiku-20241022",
          },
        },
      ],
      loadBalancing: "least-busy",
    });
  }

  async translate(
    text: string,
    from: string,
    to: string,
    context?: string,
  ): Promise<{ translation: string; confidence: number }> {
    const contextText = context ? `\n\nContext: ${context}` : "";

    const result = await this.ai.generate({
      input: {
        text: `Translate from ${from} to ${to}:

"${text}"${contextText}

Return JSON:
{
  "translation": "...",
  "confidence": 0-100
}`,
      },
      provider: "openai",
    });

    return JSON.parse(result.content);
  }

  async translateBatch(
    texts: string[],
    from: string,
    to: string,
  ): Promise<string[]> {
    const results = await Promise.all(
      texts.map((text) => this.translate(text, from, to)),
    );

    return results.map((r) => r.translation);
  }

  async detectLanguage(text: string): Promise<string> {
    const result = await this.ai.generate({
      input: {
        text: `Detect the language of this text:

"${text}"

Return only the ISO 639-1 language code (e.g., "en", "es", "fr")`,
      },
      provider: "openai",
    });

    return result.content.trim().toLowerCase();
  }

  async translateWithFallback(
    text: string,
    targetLanguages: string[],
  ): Promise<Record<string, string>> {
    const sourceLang = await this.detectLanguage(text);

    const translations = await Promise.all(
      targetLanguages.map(async (lang) => {
        const result = await this.translate(text, sourceLang, lang);
        return [lang, result.translation];
      }),
    );

    return Object.fromEntries(translations);
  }
}

const translator = new TranslationService();

const result = await translator.translate(
  "Hello, how are you?",
  "en",
  "es",
  "casual greeting between friends",
);

const multiLang = await translator.translateWithFallback(
  "Welcome to our platform",
  ["es", "fr", "de", "ja", "zh"],
);
```

---

## 6. Data Extraction from Unstructured Text

**Scenario**: Extract structured data from emails, invoices, resumes, etc.

### Implementation

```typescript
interface Invoice {
  invoiceNumber: string;
  date: string;
  vendor: string;
  total: number;
  items: Array<{
    description: string;
    quantity: number;
    price: number;
  }>;
}

class DataExtractor {
  private ai: NeuroLink;

  constructor() {
    this.ai = new NeuroLink({
      providers: [
        {
          name: "openai",
          config: {
            apiKey: process.env.OPENAI_API_KEY,
            model: "gpt-4o",
          },
        },
      ],
    });
  }

  async extractInvoice(text: string): Promise<Invoice> {
    const result = await this.ai.generate({
      input: {
        text: `Extract invoice data from this text:

${text}

Return JSON matching this schema:
{
  "invoiceNumber": "...",
  "date": "YYYY-MM-DD",
  "vendor": "...",
  "total": 0.00,
  "items": [
    {
      "description": "...",
      "quantity": 1,
      "price": 0.00
    }
  ]
}`,
      },
      provider: "openai",
    });

    return JSON.parse(result.content);
  }

  async extractResume(text: string): Promise<{
    name: string;
    email: string;
    phone: string;
    skills: string[];
    experience: Array<{
      company: string;
      title: string;
      startDate: string;
      endDate: string;
      description: string;
    }>;
    education: Array<{
      school: string;
      degree: string;
      year: string;
    }>;
  }> {
    const result = await this.ai.generate({
      input: {
        text: `Extract resume data from this text:

${text}

Return JSON with: name, email, phone, skills[], experience[], education[]`,
      },
      provider: "openai",
    });

    return JSON.parse(result.content);
  }

  async extractEmail(emailText: string): Promise<{
    subject: string;
    sender: string;
    recipients: string[];
    date: string;
    summary: string;
    actionItems: string[];
    sentiment: "positive" | "neutral" | "negative";
  }> {
    const result = await this.ai.generate({
      input: {
        text: `Extract structured data from this email:

${emailText}

Return JSON with: subject, sender, recipients[], date, summary, actionItems[], sentiment`,
      },
      provider: "openai",
    });

    return JSON.parse(result.content);
  }
}

const extractor = new DataExtractor();

const invoiceData = await extractor.extractInvoice(`
Invoice #INV-2025-001
Date: January 15, 2025
Vendor: Acme Corp

Items:
1. Widget A - Qty: 5 @ $10.00 = $50.00
2. Widget B - Qty: 3 @ $15.00 = $45.00

Total: $95.00
`);
```

---

## 7. Chatbot with Memory & Context

**Scenario**: Conversational AI with conversation history and context management.

### Implementation

```typescript
interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

class ConversationalChatbot {
  private ai: NeuroLink;
  private conversations: Map<string, Message[]> = new Map();

  constructor() {
    this.ai = new NeuroLink({
      providers: [
        {
          name: "anthropic",
          config: {
            apiKey: process.env.ANTHROPIC_API_KEY,
            model: "claude-3-5-sonnet-20241022",
          },
        },
      ],
    });
  }

  async chat(userId: string, message: string): Promise<string> {
    if (!this.conversations.has(userId)) {
      this.conversations.set(userId, []);
    }

    const history = this.conversations.get(userId)!;

    history.push({
      role: "user",
      content: message,
      timestamp: new Date(),
    });

    const conversationContext = history
      .slice(-10)
      .map((m) => `${m.role}: ${m.content}`)
      .join("\n");

    const result = await this.ai.generate({
      input: {
        text: `You are a helpful AI assistant. Continue this conversation:

${conversationContext}

Respond as the assistant, considering the full conversation context.`,
      },
      provider: "anthropic",
    });

    history.push({
      role: "assistant",
      content: result.content,
      timestamp: new Date(),
    });

    if (history.length > 50) {
      this.conversations.set(userId, history.slice(-50));
    }

    return result.content;
  }

  async summarizeConversation(userId: string): Promise<string> {
    const history = this.conversations.get(userId);
    if (!history || history.length === 0) {
      return "No conversation history";
    }

    const conversationText = history
      .map((m) => `${m.role}: ${m.content}`)
      .join("\n");

    const result = await this.ai.generate({
      input: {
        text: `Summarize this conversation in 2-3 sentences:

${conversationText}`,
      },
      provider: "anthropic",
    });

    return result.content;
  }

  clearConversation(userId: string): void {
    this.conversations.delete(userId);
  }
}

const chatbot = new ConversationalChatbot();

const response1 = await chatbot.chat(
  "user-123",
  "What is the capital of France?",
);
const response2 = await chatbot.chat("user-123", "What is its population?");
const summary = await chatbot.summarizeConversation("user-123");
```

---

## 8. RAG (Retrieval-Augmented Generation)

**Scenario**: AI with access to custom knowledge base.

### Implementation

```typescript
import { NeuroLink } from "@raisahai/neurolink";
import Anthropic from "@anthropic-ai/sdk";

class RAGSystem {
  private ai: NeuroLink;
  private mcpClient: Anthropic;

  constructor() {
    this.ai = new NeuroLink({
      providers: [
        {
          name: "anthropic",
          config: { apiKey: process.env.ANTHROPIC_API_KEY },
        },
      ],
      mcpServers: [
        {
          name: "docs",
          command: "npx",
          args: ["-y", "@modelcontextprotocol/server-filesystem", "./docs"],
        },
      ],
    });

    this.mcpClient = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }

  async queryWithContext(query: string): Promise<string> {
    const response = await this.mcpClient.messages.create({
      model: "claude-3-5-sonnet-20241022",
      max_tokens: 1024,
      messages: [
        {
          role: "user",
          content: `Using the documentation files available through MCP tools, answer this question:

${query}

Search the docs first, then provide a comprehensive answer with references.`,
        },
      ],
      tools: [
        {
          name: "read_file",
          description: "Read documentation files",
          input_schema: {
            type: "object",
            properties: {
              path: { type: "string" },
            },
            required: ["path"],
          },
        },
        {
          name: "search_files",
          description: "Search documentation",
          input_schema: {
            type: "object",
            properties: {
              query: { type: "string" },
            },
            required: ["query"],
          },
        },
      ],
    });

    return response.content[0].type === "text" ? response.content[0].text : "";
  }
}

const rag = new RAGSystem();
const answer = await rag.queryWithContext(
  "How do I configure multi-provider failover?",
);
```

---

## 9. Email Automation & Analysis

**Scenario**: Automated email responses and analysis.

### Implementation

```typescript
import { NeuroLink } from "@raisahai/neurolink";
import nodemailer from "nodemailer";

class EmailAutomation {
  private ai: NeuroLink;
  private transporter: nodemailer.Transporter;

  constructor() {
    this.ai = new NeuroLink({
      providers: [
        {
          name: "openai",
          config: {
            apiKey: process.env.OPENAI_API_KEY,
            model: "gpt-4o-mini",
          },
        },
      ],
    });

    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: 587,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }

  async classifyEmail(
    subject: string,
    body: string,
  ): Promise<{
    category: "urgent" | "support" | "sales" | "spam" | "general";
    priority: "high" | "medium" | "low";
    sentiment: "positive" | "neutral" | "negative";
  }> {
    const result = await this.ai.generate({
      input: {
        text: `Classify this email:

Subject: ${subject}
Body: ${body}

Return JSON:
{
  "category": "urgent|support|sales|spam|general",
  "priority": "high|medium|low",
  "sentiment": "positive|neutral|negative"
}`,
      },
      provider: "openai",
    });

    return JSON.parse(result.content);
  }

  async generateResponse(
    subject: string,
    body: string,
    context: string,
  ): Promise<string> {
    const result = await this.ai.generate({
      input: {
        text: `Generate a professional email response:

Original Email:
Subject: ${subject}
Body: ${body}

Context: ${context}

Write a helpful, professional response.`,
      },
      provider: "openai",
    });

    return result.content;
  }

  async autoRespond(email: {
    from: string;
    subject: string;
    body: string;
  }): Promise<void> {
    const classification = await this.classifyEmail(email.subject, email.body);

    if (classification.category === "spam") {
      return;
    }

    const response = await this.generateResponse(
      email.subject,
      email.body,
      `This is a ${classification.category} email with ${classification.priority} priority`,
    );

    await this.transporter.sendMail({
      from: process.env.FROM_EMAIL,
      to: email.from,
      subject: `Re: ${email.subject}`,
      text: response,
    });
  }
}

const emailBot = new EmailAutomation();

await emailBot.autoRespond({
  from: "customer@example.com",
  subject: "Product inquiry",
  body: "I would like to know more about your pricing plans.",
});
```

---

## 10. Report Generation

**Scenario**: Automated business report generation from data.

### Implementation

```typescript
class ReportGenerator {
  private ai: NeuroLink;

  constructor() {
    this.ai = new NeuroLink({
      providers: [
        {
          name: "openai",
          config: {
            apiKey: process.env.OPENAI_API_KEY,
            model: "gpt-4o",
          },
        },
      ],
    });
  }

  async generateSalesReport(data: {
    period: string;
    totalRevenue: number;
    totalOrders: number;
    topProducts: Array<{ name: string; sales: number }>;
    regions: Array<{ name: string; revenue: number }>;
  }): Promise<string> {
    const result = await this.ai.generate({
      input: {
        text: `Generate a professional sales report for ${data.period}:

Metrics:
- Total Revenue: $${data.totalRevenue.toLocaleString()}
- Total Orders: ${data.totalOrders}
- Average Order Value: $${(data.totalRevenue / data.totalOrders).toFixed(2)}

Top Products:
${data.topProducts.map((p) => `- ${p.name}: $${p.sales.toLocaleString()}`).join("\n")}

Revenue by Region:
${data.regions.map((r) => `- ${r.name}: $${r.revenue.toLocaleString()}`).join("\n")}

Include:
1. Executive Summary
2. Key Metrics
3. Trends & Insights
4. Recommendations
5. Next Steps

Format as markdown.`,
      },
      provider: "openai",
    });

    return result.content;
  }

  async generateFinancialSummary(
    transactions: Array<{
      date: string;
      amount: number;
      category: string;
    }>,
  ): Promise<string> {
    const totalIncome = transactions
      .filter((t) => t.amount > 0)
      .reduce((sum, t) => sum + t.amount, 0);

    const totalExpenses = transactions
      .filter((t) => t.amount < 0)
      .reduce((sum, t) => sum + Math.abs(t.amount), 0);

    const categoryBreakdown = transactions.reduce(
      (acc, t) => {
        acc[t.category] = (acc[t.category] || 0) + t.amount;
        return acc;
      },
      {} as Record<string, number>,
    );

    const result = await this.ai.generate({
      input: {
        text: `Generate financial summary:

Total Income: $${totalIncome.toLocaleString()}
Total Expenses: $${totalExpenses.toLocaleString()}
Net: $${(totalIncome - totalExpenses).toLocaleString()}

By Category:
${Object.entries(categoryBreakdown)
  .map(([cat, amt]) => `- ${cat}: $${amt.toLocaleString()}`)
  .join("\n")}

Provide:
1. Financial Overview
2. Category Analysis
3. Savings Opportunities
4. Budget Recommendations`,
      },
      provider: "openai",
    });

    return result.content;
  }
}

const reportGen = new ReportGenerator();

const salesReport = await reportGen.generateSalesReport({
  period: "Q1 2025",
  totalRevenue: 1250000,
  totalOrders: 3420,
  topProducts: [
    { name: "Product A", sales: 450000 },
    { name: "Product B", sales: 380000 },
  ],
  regions: [
    { name: "North America", revenue: 750000 },
    { name: "Europe", revenue: 500000 },
  ],
});
```

---

## 11. Image Analysis & Description

**Scenario**: Analyze images with vision models.

### Implementation

```typescript
import { NeuroLink } from "@raisahai/neurolink";
import fs from "fs/promises";

class ImageAnalyzer {
  private ai: NeuroLink;

  constructor() {
    this.ai = new NeuroLink({
      providers: [
        {
          name: "openai",
          config: {
            apiKey: process.env.OPENAI_API_KEY,
            model: "gpt-4o",
          },
        },
      ],
    });
  }

  async analyzeImage(
    imagePath: string,
    prompt: string = "Describe this image in detail",
  ): Promise<string> {
    const imageBuffer = await fs.readFile(imagePath);
    const base64Image = imageBuffer.toString("base64");

    const result = await this.ai.generate({
      input: {
        text: prompt,
        images: [
          {
            type: "base64",
            data: base64Image,
          },
        ],
      },
      provider: "openai",
      model: "gpt-4o",
    });

    return result.content;
  }

  async extractText(imagePath: string): Promise<string> {
    return this.analyzeImage(imagePath, "Extract all text from this image");
  }

  async detectObjects(imagePath: string): Promise<string[]> {
    const result = await this.analyzeImage(
      imagePath,
      'List all objects visible in this image. Return as JSON array: ["object1", "object2"]',
    );

    return JSON.parse(result);
  }

  async moderateContent(imagePath: string): Promise<{
    safe: boolean;
    categories: string[];
    confidence: number;
  }> {
    const result = await this.analyzeImage(
      imagePath,
      'Analyze this image for inappropriate content. Return JSON: { "safe": true/false, "categories": ["category1"], "confidence": 0-100 }',
    );

    return JSON.parse(result);
  }
}

const imageAnalyzer = new ImageAnalyzer();

const description = await imageAnalyzer.analyzeImage("./product.jpg");
const text = await imageAnalyzer.extractText("./document-scan.jpg");
const objects = await imageAnalyzer.detectObjects("./scene.jpg");
const moderation = await imageAnalyzer.moderateContent("./user-upload.jpg");
```

---

## 12. SQL Query Generation

**Scenario**: Natural language to SQL query generation.

### Implementation

```typescript
class SQLQueryGenerator {
  private ai: NeuroLink;

  constructor() {
    this.ai = new NeuroLink({
      providers: [
        {
          name: "openai",
          config: {
            apiKey: process.env.OPENAI_API_KEY,
            model: "gpt-4o",
          },
        },
      ],
    });
  }

  async generateSQL(
    question: string,
    schema: string,
  ): Promise<{ query: string; explanation: string }> {
    const result = await this.ai.generate({
      input: {
        text: `Generate SQL query for this question:

Question: ${question}

Database Schema:
${schema}

Return JSON:
{
  "query": "SELECT...",
  "explanation": "This query..."
}`,
      },
      provider: "openai",
    });

    return JSON.parse(result.content);
  }

  async explainQuery(query: string): Promise<string> {
    const result = await this.ai.generate({
      input: {
        text: `Explain this SQL query in simple terms:

${query}`,
      },
      provider: "openai",
    });

    return result.content;
  }

  async optimizeQuery(query: string): Promise<{
    optimizedQuery: string;
    improvements: string[];
  }> {
    const result = await this.ai.generate({
      input: {
        text: `Optimize this SQL query:

${query}

Return JSON:
{
  "optimizedQuery": "SELECT...",
  "improvements": ["improvement1", "improvement2"]
}`,
      },
      provider: "openai",
    });

    return JSON.parse(result.content);
  }
}

const sqlGen = new SQLQueryGenerator();

const schema = `
Tables:
- users (id, name, email, created_at)
- orders (id, user_id, total, created_at)
- products (id, name, price, category)
- order_items (order_id, product_id, quantity)
`;

const result = await sqlGen.generateSQL(
  "Show me total revenue by product category for last month",
  schema,
);
```

---

## Cost Optimization Patterns

### Pattern 1: Free Tier First

```typescript
const ai = new NeuroLink({
  providers: [
    {
      name: "google-ai",
      priority: 1,
      config: { apiKey: process.env.GOOGLE_AI_KEY },
      quotas: { daily: 1500 },
    },
    {
      name: "openai",
      priority: 2,
      config: { apiKey: process.env.OPENAI_API_KEY },
    },
  ],
  failoverConfig: { enabled: true, fallbackOnQuota: true },
});
```

**Savings**: 80-90% cost reduction

### Pattern 2: Model Selection by Complexity

```typescript
async function chooseModel(task: string): Promise<string> {
  const complexity = await classifyComplexity(task);

  return complexity === "simple" ? "gpt-4o-mini" : "gpt-4o";
}
```

**Savings**: 60-70% cost reduction

---

## Related Documentation

- [Provider Setup](../../getting-started/providers/index.md) - Configure AI providers
- [Enterprise Features](../../guides/enterprise/multi-provider-failover.md) - Production patterns
- [MCP Integration](../mcp/server-catalog.md) - Tool integration
- [Framework Integration](../../guides/frameworks/nextjs.md) - Framework-specific guides

---

## Summary

You've learned 12 production-ready use cases:

✅ Customer support automation
✅ Content generation pipelines
✅ Code review automation
✅ Document analysis
✅ Multi-language translation
✅ Data extraction
✅ Conversational chatbots
✅ RAG systems
✅ Email automation
✅ Report generation
✅ Image analysis
✅ SQL query generation

Each pattern includes complete implementation code, cost optimization strategies, and best practices for production deployment.
