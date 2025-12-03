# 📚 Step-by-Step Integration Tutorials

## 🚀 Quick Start (15 minutes)

### Step 1: Installation

```bash
npm install @juspay/neurolink
echo 'GOOGLE_AI_API_KEY="your-key"' > .env
npx @juspay/neurolink generate "Hello world"
```

### Step 2: Enable Analytics

```javascript
const { NeuroLink } = require("@juspay/neurolink");
const neurolink = new NeuroLink();

const result = await neurolink.generate({
  input: { text: "Write a professional email" },
  enableAnalytics: true,
});

console.log("📊 Analytics:", result.analytics);
```

### Step 3: Add Quality Evaluation

```javascript
const result = await neurolink.generate({
  input: { text: "Explain quantum computing" },
  enableEvaluation: true,
});

console.log("⭐ Quality:", result.evaluation);
// Shows: { relevanceScore: 9, accuracyScore: 8, completenessScore: 9, overallScore: 8.7 }
```

## 🌐 Web App Integration

### Express.js API

```javascript
const express = require("express");
const { NeuroLink } = require("@juspay/neurolink");
const app = express();
const neurolink = new NeuroLink();

app.post("/api/generate", async (req, res) => {
  const result = await neurolink.generate({
    input: { text: req.body.prompt },
    enableAnalytics: true,
    enableEvaluation: true,
    context: {
      department: req.body.department,
      user_id: req.headers["user-id"],
    },
  });

  // Quality gate
  if (result.evaluation.overallScore < 7) {
    return res.status(400).json({
      error: "Quality threshold not met",
      quality_score: result.evaluation.overallScore,
    });
  }

  res.json(result);
});
```

## 📊 Cost Optimization

### Automatic Model Selection

```javascript
class CostOptimizer {
  getOptimalConfig(maxCost, qualityTarget) {
    const configs = [
      { provider: "openai", model: "gpt-4", cost: 0.08, quality: 9 },
      { provider: "google-ai", model: "gemini-pro", cost: 0.04, quality: 8 },
      { provider: "google-ai", model: "gemini-flash", cost: 0.01, quality: 7 },
    ];

    return configs
      .filter((c) => c.cost <= maxCost && c.quality >= qualityTarget)
      .sort((a, b) => b.quality - a.quality)[0];
  }
}
```

## 🔄 Batch Processing

```javascript
const fs = require("fs");
const csv = require("csv-parser");

class BatchProcessor {
  async processCSV(inputFile) {
    const items = [];

    await new Promise((resolve) => {
      fs.createReadStream(inputFile)
        .pipe(csv())
        .on("data", (row) => items.push(row))
        .on("end", resolve);
    });

    for (const item of items) {
      const result = await neurolink.generate({
        input: { text: `Create marketing copy for: ${item.name}` },
        enableAnalytics: true,
        enableEvaluation: true,
        context: { product_id: item.id, batch: true },
      });

      console.log(
        `Processed ${item.name}: Quality ${result.evaluation.overallScore}/10`,
      );
    }
  }
}
```

## 📈 Real-Time Monitoring

### Analytics Dashboard

```javascript
// Store analytics in memory (use database in production)
const analyticsStore = { requests: [], stats: {} };

app.post("/api/generate", async (req, res) => {
  const result = await neurolink.generate({
    input: { text: req.body.prompt },
    ...req.body,
    enableAnalytics: true,
    enableEvaluation: true,
  });

  // Store analytics
  analyticsStore.requests.push({
    timestamp: new Date(),
    ...result.analytics,
    quality: result.evaluation,
  });

  res.json(result);
});

// Dashboard endpoint
app.get("/api/dashboard", (req, res) => {
  const last24h = analyticsStore.requests.filter(
    (r) => r.timestamp > new Date(Date.now() - 24 * 60 * 60 * 1000),
  );

  res.json({
    totalRequests: last24h.length,
    totalCost: last24h.reduce((sum, r) => sum + (r.cost || 0), 0),
    avgQuality:
      last24h.reduce((sum, r) => sum + r.quality.overallScore, 0) /
      last24h.length,
  });
});
```

## 🎯 CLI Usage Patterns

### Basic Generation with Analytics

```bash
npx @juspay/neurolink generate "Create product description" \
  --enable-analytics --debug
```

### Quality Control

```bash
npx @juspay/neurolink generate "Medical advice content" \
  --enable-evaluation --debug
```

### Full Features

```bash
npx @juspay/neurolink generate "Business proposal" \
  --enable-analytics --enable-evaluation \
  --context '{"dept":"sales","priority":"high"}' \
  --debug
```

## 🏢 Industry Examples

### E-commerce: Product Descriptions

```javascript
const productResult = await neurolink.generate({
  input: { text: `Product: ${product.name}\nFeatures: ${product.features}` },
  enableAnalytics: true,
  enableEvaluation: true,
  context: {
    category: product.category,
    price_tier: product.priceTier,
  },
});

// Cost optimization by category
if (product.category === "basic" && productResult.analytics?.cost > 0.05) {
  // Switch to cheaper model for basic products
}
```

### Healthcare: Patient Education

```javascript
const medicalContent = await neurolink.generate({
  input: { text: "Diabetes management guide for patients" },
  enableEvaluation: true,
  context: {
    content_type: "medical",
    accuracy_required: 95,
  },
});

// Strict medical accuracy requirements
if (medicalContent.evaluation.accuracyScore < 9) {
  await medicalReview(medicalContent);
}
```

### Customer Support

```javascript
const supportResponse = await neurolink.generate({
  input: { text: `Customer issue: ${ticket.description}` },
  enableAnalytics: true,
  enableEvaluation: true,
  context: {
    customer_tier: customer.tier,
    urgency: ticket.priority,
  },
});

// Quality gates based on customer tier
if (
  customer.tier === "enterprise" &&
  supportResponse.evaluation.overallScore < 9
) {
  await escalateToHuman(ticket);
}
```

## 💬 Building a Conversational Agent

NeuroLink can maintain a stateful conversation history, making it easy to build conversational agents and chatbots. By enabling context summarization, NeuroLink will automatically manage the conversation's context, summarizing it when it grows too long.

### Step 1: Enable Context Summarization

To enable this feature, simply call the `enableContextSummarization()` method on your `NeuroLink` instance.

```javascript
const { NeuroLink } = require("@juspay/neurolink");

const neurolink = new NeuroLink();
neurolink.enableContextSummarization();

console.log("Conversational agent ready. I will remember our conversation.");
```

### Step 2: Simulate a Conversation

Now, you can interact with the agent by calling `generate()` multiple times. The agent will remember the context of previous turns.

```javascript
async function haveConversation() {
  const prompts = [
    "My name is Alex.",
    "I live in San Francisco.",
    "What is my name and where do I live?",
  ];

  for (const prompt of prompts) {
    console.log(`\n> User: ${prompt}`);
    const result = await neurolink.generate({
      input: { text: prompt },
    });
    console.log(`> Agent: ${result.content}`);
  }
}

haveConversation();
```

### Expected Output

The agent will correctly recall the information provided in earlier prompts, demonstrating its stateful nature.

```
> User: My name is Alex.
> Agent: It's nice to meet you, Alex.

> User: I live in San Francisco.
> Agent: San Francisco is a beautiful city.

> User: What is my name and where do I live?
> Agent: Your name is Alex and you live in San Francisco.
```

## 📋 Implementation Checklist

### ✅ Basic Setup

- [ ] Install NeuroLink SDK
- [ ] Configure API keys in .env
- [ ] Test basic generation
- [ ] Enable analytics tracking
- [ ] Add evaluation scoring

### ✅ Production Setup

- [ ] Implement quality gates
- [ ] Set up cost monitoring
- [ ] Create analytics dashboard
- [ ] Configure department tracking
- [ ] Set up batch processing

### ✅ Optimization

- [ ] Model selection strategy
- [ ] Cost optimization rules
- [ ] Quality improvement process
- [ ] Performance monitoring
- [ ] ROI measurement

## 🎯 Next Steps

1. **Start Simple**: Basic analytics and evaluation
2. **Add Quality Gates**: Implement quality thresholds
3. **Monitor Costs**: Track spending by department/usage
4. **Optimize**: Use data to improve cost and quality
5. **Scale**: Implement across organization

Each tutorial builds on the previous ones - start with the Quick Start and progress based on your needs.
