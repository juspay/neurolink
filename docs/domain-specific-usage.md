# Domain-Specific AI Usage Guide

Simple guide for using domain expertise with NeuroLink SDK and CLI.

## ✅ **Recommended Approach: Simple Domain Input**

Instead of complex configuration, simply pass domain parameters directly to your AI requests.

---

## 🧩 **SDK Usage (Recommended)**

### **Basic Domain Usage**

```typescript
import { NeuroLink } from "@juspay/neurolink";

const sdk = new NeuroLink();

// Healthcare domain
const healthcareResult = await sdk.generate({
  input: { text: "Analyze patient symptoms: fever, cough, fatigue" },
  provider: "openai",
  evaluationDomain: "healthcare", // ✅ Simple domain input
  enableEvaluation: true,
  enableAnalytics: true,
});

// Analytics domain
const analyticsResult = await sdk.generate({
  input: { text: "Analyze quarterly sales data: Q1: $100k, Q2: $150k" },
  provider: "openai",
  evaluationDomain: "analytics", // ✅ Simple domain input
  enableEvaluation: true,
  enableAnalytics: true,
});
```

### **Streaming with Domain Support**

```typescript
const stream = await sdk.stream({
  input: { text: "Provide financial risk assessment for portfolio" },
  provider: "openai",
  evaluationDomain: "finance", // ✅ Simple domain input
  enableEvaluation: true,
  enableAnalytics: true,
});

for await (const chunk of stream.stream) {
  console.log(chunk.content);
}

// Access domain-specific evaluation
if (stream.evaluation) {
  console.log("Domain:", stream.evaluation.evaluationDomain);
  console.log("Quality Score:", stream.evaluation.score);
}
```

---

## 🖥️ **CLI Usage (Simple Flags)**

### **Generate with Domain**

```bash
# Healthcare domain
pnpm cli generate "Analyze patient symptoms: fever, cough, fatigue" \
  --provider openai \
  --evaluationDomain healthcare \
  --enableEvaluation \
  --enableAnalytics

# Analytics domain
pnpm cli generate "Analyze quarterly sales data" \
  --provider openai \
  --evaluationDomain analytics \
  --enableEvaluation \
  --enableAnalytics

# Finance domain
pnpm cli generate "Assess portfolio risk for diversified investments" \
  --provider openai \
  --evaluationDomain finance \
  --enableEvaluation \
  --enableAnalytics
```

### **Streaming with Domain**

```bash
# E-commerce domain streaming
pnpm cli stream "Optimize conversion funnel for e-commerce site" \
  --provider openai \
  --evaluationDomain ecommerce \
  --enableEvaluation \
  --enableAnalytics \
  --maxTokens 300
```

### **Check Available CLI Options**

```bash
# See all domain-related options
pnpm cli generate --help | grep -i evaluation
pnpm cli stream --help | grep -i evaluation
```

---

## 🎯 **Available Domains**

| Domain       | Use Case                        | Example Input                                                 |
| ------------ | ------------------------------- | ------------------------------------------------------------- |
| `healthcare` | Medical analysis, diagnostics   | "Analyze patient symptoms and suggest differential diagnosis" |
| `analytics`  | Data analysis, metrics          | "Analyze user behavior data and identify trends"              |
| `finance`    | Investment, risk assessment     | "Evaluate portfolio risk and diversification strategy"        |
| `ecommerce`  | Retail, conversion optimization | "Optimize product page for better conversion rates"           |

---

## 📊 **Response Structure**

When using domain evaluation, you'll get enhanced responses:

```typescript
{
  content: "AI response content...",
  evaluation: {
    evaluationDomain: "healthcare",
    score: 0.85,
    criteria: ["accuracy", "safety", "compliance"],
    feedback: "Response demonstrates good medical accuracy..."
  },
  analytics: {
    domainRelevance: 0.92,
    complexityScore: 0.78,
    // ... additional analytics
  },
  usage: { /* token usage */ },
  provider: "openai",
  model: "gpt-4"
}
```

---

## 🚀 **Best Practices**

### **1. Choose Appropriate Domains**

- Use `healthcare` for medical/clinical content
- Use `analytics` for data analysis and metrics
- Use `finance` for financial analysis and risk assessment
- Use `ecommerce` for retail and conversion optimization

### **2. Enable Both Evaluation and Analytics**

```typescript
// ✅ Recommended: Enable both for full domain benefits
{
  evaluationDomain: "healthcare",
  enableEvaluation: true,   // Domain-specific quality evaluation
  enableAnalytics: true     // Enhanced analytics tracking
}
```

### **3. Use with Appropriate Providers**

```typescript
// ✅ Recommended providers for domain work
const providers = ["openai", "anthropic", "google-ai"];
```

### **4. Handle Domain Results**

```typescript
const result = await sdk.generate({
  input: { text: "Medical analysis request" },
  evaluationDomain: "healthcare",
  enableEvaluation: true,
});

// ✅ Always check if evaluation exists
if (result.evaluation) {
  console.log(`Domain: ${result.evaluation.evaluationDomain}`);
  console.log(`Quality Score: ${result.evaluation.score}`);
}

// ✅ Use analytics for insights
if (result.analytics) {
  console.log(`Domain Relevance: ${result.analytics.domainRelevance}`);
}
```

---

## ❌ **What Was Removed**

The complex interactive domain configuration system was removed because:

- **Over-engineered**: 240+ lines of configuration code for minimal benefit
- **Poor UX**: Users had to answer dozens of configuration questions
- **Unused**: Complex configurations weren't meaningfully used in practice
- **Redundant**: Simple domain parameters work better

### **Old Complex Approach (Removed)**

```typescript
// ❌ OLD: Complex configuration (removed)
await configManager.setupDomains();
// Would prompt for:
// - Healthcare evaluation criteria (6 options)
// - Analytics tracking preferences (3 options)
// - Finance risk metrics (3 options)
// - E-commerce conversion settings (3 options)
```

### **New Simple Approach (Current)**

```typescript
// ✅ NEW: Simple domain input
const result = await sdk.generate({
  input: { text: "Healthcare analysis" },
  evaluationDomain: "healthcare", // One simple parameter
  enableEvaluation: true,
});
```

---

## 🔧 **Migration Guide**

If you were using the old domain configuration:

1. **Remove old config**: `pnpm cli config reset` (optional)
2. **Use simple parameters**: Add `evaluationDomain` to your requests
3. **Enable features**: Use `enableEvaluation` and `enableAnalytics` flags

**Before:**

```bash
# Old: Complex setup required
pnpm cli config init  # Would prompt for domain setup
```

**After:**

```bash
# New: Direct usage
pnpm cli generate "Medical analysis" --evaluationDomain healthcare --enableEvaluation
```

---

This simplified approach gives you all the domain-specific AI benefits without configuration complexity.
