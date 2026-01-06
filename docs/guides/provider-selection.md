# Provider Selection Wizard

**Last Updated:** January 1, 2026
**NeuroLink Version:** 8.29.0

Interactive guide to help you select the perfect AI provider for your specific needs. This wizard considers your requirements, constraints, and priorities to recommend the optimal provider configuration.

---

## Quick Start: 5-Question Provider Selector

Answer these 5 questions to get an instant recommendation:

### Question 1: What's your primary constraint?

**A) Budget** → Google AI Studio (FREE tier)
**B) Privacy** → Ollama (100% local)
**C) Quality** → OpenAI or Anthropic
**D) Compliance** → Azure OpenAI or Bedrock

### Question 2: Do you need extended thinking?

**Yes** → Anthropic (best) or Google AI Studio (free)
**No** → Continue to Question 3

### Question 3: Do you need PDF processing?

**Yes** → Anthropic or Google AI Studio or Vertex
**No** → Continue to Question 4

### Question 4: What's your existing cloud platform?

**AWS** → Amazon Bedrock
**Azure** → Azure OpenAI
**GCP** → Google Vertex
**None/Other** → Continue to Question 5

### Question 5: What's your experience level?

**Beginner** → Google AI Studio (easiest setup)
**Intermediate** → OpenAI or Anthropic
**Advanced** → Any provider (use decision tree below)

---

## Detailed Provider Decision Tree

### Step 1: Define Your Primary Goal

```
What's the MOST important factor for your project?

🎯 Cost Optimization → Go to Section A
🔒 Privacy & Security → Go to Section B
⚡ Performance & Quality → Go to Section C
📄 Document Processing → Go to Section D
🤖 Advanced Reasoning → Go to Section E
🏢 Enterprise Features → Go to Section F
🧪 Experimentation → Go to Section G
```

---

## Section A: Cost Optimization

### Scenario A1: Zero Budget (Completely Free)

**Best Choice: Google AI Studio**

- FREE tier: 1M tokens/day
- Professional quality (Gemini 2.5 Flash)
- Extended thinking support
- PDF processing included

**Setup:**

```bash
GOOGLE_AI_API_KEY=your_api_key
GOOGLE_AI_MODEL=gemini-2.5-flash
```

```typescript
const result = await neurolink.generate({
  provider: "google-ai",
  prompt: "Your task",
});
```

**Alternative: Ollama**

- Completely FREE (local execution)
- No API key needed
- Privacy-first
- Requires local GPU

---

### Scenario A2: Limited Budget ($50-$200/month)

**Best Choice: Mistral**

- Competitive pricing ($0.20/$0.60 per 1M tokens for Small)
- Good quality
- GDPR compliant

**Cost Example:**

- 10M input tokens/month: $2.00
- 10M output tokens/month: $6.00
- **Total: $8/month**

**Setup:**

```bash
MISTRAL_API_KEY=your_api_key
MISTRAL_MODEL=mistral-small-2506
```

**Alternative: Google Vertex**

- Gemini 2.5 Flash: $0.35/$1.05 per 1M tokens
- Extended thinking
- PDF support

---

### Scenario A3: Cost Optimization with Multiple Models

**Best Choice: OpenRouter**

- Access to FREE models (Gemini 2.0 Flash, Llama 3.3 70B)
- Pay only when you need premium models
- Cost tracking built-in

**Setup:**

```bash
OPENROUTER_API_KEY=your_api_key
```

```typescript
// Use free model for simple tasks
const simpleResult = await neurolink.generate({
  provider: "openrouter",
  model: "google/gemini-2.0-flash-exp:free",
  prompt: "Simple task",
});

// Use premium model for complex tasks
const complexResult = await neurolink.generate({
  provider: "openrouter",
  model: "anthropic/claude-3-5-sonnet",
  prompt: "Complex analysis",
});
```

---

## Section B: Privacy & Security

### Scenario B1: Maximum Privacy (No Cloud)

**Best Choice: Ollama**

- 100% local execution
- No data sent to any server
- Works offline
- HIPAA/GDPR compliant by design

**Setup:**

```bash
# Install Ollama
curl -fsSL https://ollama.com/install.sh | sh

# Pull model
ollama pull llama3.1:8b

# Optional configuration
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=llama3.1:8b
```

**Recommended Models:**

- `llama3.1:8b` - Fast, general purpose
- `llama3.1:70b` - Higher quality (needs more RAM)
- `gemma3:9b` - Google's lightweight model

**Hardware Requirements:**

- Minimum: 8GB RAM, CPU only (slower)
- Recommended: 16GB+ RAM, NVIDIA GPU
- Optimal: 32GB+ RAM, RTX 3090/4090

---

### Scenario B2: Cloud with GDPR Compliance

**Best Choice: Mistral**

- European data centers
- GDPR compliant
- No training on user data
- Open-source models available

**Compliance Features:**

- Data stored in EU
- GDPR data processing agreement
- Right to deletion
- Data portability

---

### Scenario B3: Enterprise Security (HIPAA + SOC2)

**Best Choices:**

**Option 1: Azure OpenAI**

- Microsoft enterprise security
- HIPAA BAA available
- SOC2 certified
- Enterprise SLAs

**Option 2: Amazon Bedrock**

- AWS security features
- HIPAA BAA available
- SOC2 certified
- Audit logging

**Option 3: Google Vertex**

- GCP security
- HIPAA BAA available
- SOC2 certified
- Data residency controls

---

## Section C: Performance & Quality

### Scenario C1: Highest Quality (No Compromises)

**Best Choice: Anthropic Claude 4.5 Sonnet**

- Best reasoning capabilities
- Extended thinking
- 200K context window
- Native PDF support

**Setup:**

```bash
ANTHROPIC_API_KEY=your_api_key
ANTHROPIC_MODEL=claude-sonnet-4-5-20250929
```

```typescript
const result = await neurolink.generate({
  provider: "anthropic",
  model: "claude-sonnet-4-5-20250929",
  prompt: "Complex reasoning task",
  thinkingLevel: "high",
});
```

**When to Use:**

- Critical customer-facing features
- Complex analysis requiring deep reasoning
- Document-heavy workflows (PDF support)
- Agentic workflows with multi-step tool use

---

### Scenario C2: Best Vision Quality

**Best Choice: Anthropic**

- 20 images per request (highest)
- Excellent vision understanding
- Combined with text reasoning
- PDF processing included

**Code Example:**

```typescript
const result = await neurolink.generate({
  provider: "anthropic",
  input: {
    text: "Analyze these medical images",
    images: ["/path/to/scan1.jpg", "/path/to/scan2.jpg", "/path/to/scan3.jpg"],
  },
});
```

**Alternative: OpenAI GPT-4o**

- Industry-leading vision
- 10 images per request
- Fast inference
- Good for general vision tasks

---

### Scenario C3: Fastest Response Time

**Best Choice: Ollama (Local)**

- 50-200ms time to first token
- No network latency
- Streaming immediately available

**Alternative: Google AI Studio**

- 300-700ms TTFT
- FREE tier
- Professional quality

---

## Section D: Document Processing

### Scenario D1: PDF-Heavy Workflows

**Best Choice: Anthropic**

- Native PDF understanding
- No preprocessing required
- Extracts text, tables, structure
- Visual analysis of PDF pages

**Setup:**

```typescript
const result = await neurolink.generate({
  provider: "anthropic",
  input: {
    text: "Analyze this contract",
    pdfFiles: ["/path/to/contract.pdf"],
  },
  thinkingLevel: "high",
});
```

**Alternative: Google AI Studio**

- PDF support (Gemini models)
- FREE tier
- Extended thinking
- Good for budget-conscious teams

---

### Scenario D2: Mixed Documents (PDF + Images + Text)

**Best Choice: Anthropic**

- Handles all formats natively
- Up to 20 images + PDFs
- Unified analysis

**Code Example:**

```typescript
const result = await neurolink.generate({
  provider: "anthropic",
  input: {
    text: "Compare these documents",
    images: ["/path/to/diagram1.png", "/path/to/chart.jpg"],
    pdfFiles: ["/path/to/report.pdf", "/path/to/analysis.pdf"],
  },
});
```

---

## Section E: Advanced Reasoning

### Scenario E1: Extended Thinking Required

**Best Choice: Anthropic**

- Native extended thinking (best)
- Transparent reasoning process
- Configurable thinking levels
- Deep analysis capabilities

**Setup:**

```typescript
const result = await neurolink.generate({
  provider: "anthropic",
  model: "claude-sonnet-4-5-20250929",
  prompt: "Solve this complex problem: ...",
  thinkingLevel: "high", // minimal | low | medium | high
});
```

**Cost Impact:**

- Extended thinking increases token usage
- High level: 2-3x more tokens
- Medium level: 1.5-2x more tokens
- Worth it for complex tasks

**Alternative: Google AI Studio**

- Gemini 2.5+, Gemini 3 thinking
- FREE tier available
- Good for budget teams

---

### Scenario E2: Multi-Step Tool Use (Agentic Workflows)

**Best Choice: Anthropic**

- Advanced tool use
- Parallel tool execution
- Tool result caching
- Best for agentic patterns

**Code Example:**

```typescript
const neurolink = new NeuroLink({
  provider: "anthropic",
  model: "claude-sonnet-4-5-20250929",
});

// Register tools
neurolink.registerTool({
  name: "search_database",
  description: "Search customer database",
  parameters: z.object({
    query: z.string(),
  }),
  execute: async ({ query }) => {
    // Implementation
    return results;
  },
});

neurolink.registerTool({
  name: "send_email",
  description: "Send email to customer",
  parameters: z.object({
    to: z.string(),
    subject: z.string(),
    body: z.string(),
  }),
  execute: async ({ to, subject, body }) => {
    // Implementation
    return { sent: true };
  },
});

// Claude will automatically use tools in sequence
const result = await neurolink.generate({
  prompt: "Find customer John Doe and send him a follow-up email",
  maxSteps: 10, // Allow multi-step tool use
});
```

---

## Section F: Enterprise Features

### Scenario F1: AWS-Based Enterprise

**Best Choice: Amazon Bedrock**

- Seamless AWS integration
- IAM-based authentication
- VPC endpoints available
- CloudWatch logging
- Multiple model providers

**Setup:**

```bash
AWS_ACCESS_KEY_ID=your_key
AWS_SECRET_ACCESS_KEY=your_secret
AWS_REGION=us-east-1
BEDROCK_MODEL=anthropic.claude-3-sonnet-20240229-v1:0
```

**Benefits:**

- Use existing AWS account
- Consolidated billing
- Infrastructure as Code (Terraform/CDK)
- Compliance certifications

---

### Scenario F2: Azure-Based Enterprise

**Best Choice: Azure OpenAI**

- Microsoft ecosystem integration
- Azure AD authentication
- Virtual network integration
- Enterprise support

**Setup:**

```bash
AZURE_OPENAI_API_KEY=your_key
AZURE_OPENAI_ENDPOINT=https://your-resource.openai.azure.com
AZURE_OPENAI_DEPLOYMENT=gpt-4o
AZURE_API_VERSION=2024-05-01-preview
```

**Benefits:**

- Same models as OpenAI
- Microsoft SLAs
- Azure compliance
- Integrated monitoring

---

### Scenario F3: GCP-Based Enterprise

**Best Choice: Google Vertex AI**

- Dual provider (Gemini + Claude)
- GCP integration
- Service account authentication
- Stackdriver logging

**Setup:**

```bash
GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json
VERTEX_PROJECT_ID=your-project
VERTEX_LOCATION=us-central1
VERTEX_MODEL=gemini-2.5-flash
```

**Benefits:**

- Use both Gemini and Claude
- GCP billing
- Regional deployments
- Vertex AI pipelines

---

## Section G: Experimentation

### Scenario G1: Testing Multiple Models

**Best Choice: LiteLLM**

- Unified proxy for 100+ models
- Cost tracking
- A/B testing support
- Load balancing

**Setup:**

```bash
# Start LiteLLM proxy
litellm --config config.yaml

# Configure NeuroLink
LITELLM_BASE_URL=http://localhost:4000
LITELLM_API_KEY=sk-anything
```

**Config Example:**

```yaml
model_list:
  - model_name: gpt-4
    litellm_params:
      model: openai/gpt-4o
      api_key: sk-openai-key

  - model_name: claude
    litellm_params:
      model: anthropic/claude-3-5-sonnet
      api_key: sk-ant-key

  - model_name: gemini
    litellm_params:
      model: vertex_ai/gemini-2.5-flash
      vertex_project: my-project
```

**Usage:**

```typescript
// Test different models easily
const models = [
  "openai/gpt-4o",
  "anthropic/claude-3-5-sonnet",
  "google/gemini-2.5-flash",
];

for (const model of models) {
  const result = await neurolink.generate({
    provider: "litellm",
    model,
    prompt: "Same test prompt",
  });
  console.log(`${model}: ${result.content}`);
}
```

---

### Scenario G2: Research & Open Source Models

**Best Choice: HuggingFace**

- 100,000+ models
- Cutting-edge research models
- Community support
- Free tier available

**Setup:**

```bash
HUGGINGFACE_API_KEY=hf_your_key
HUGGINGFACE_MODEL=meta-llama/Llama-3.1-8B-Instruct
```

**Recommended Research Models:**

- `meta-llama/Llama-3.1-70B-Instruct` - Meta's flagship
- `mistralai/Mistral-7B-Instruct-v0.3` - Mistral open model
- `nvidia/Llama-3.1-Nemotron-Ultra-253B-v1` - NVIDIA enhanced

---

## Real-World Use Case Examples

### Use Case 1: Startup MVP (Budget: $0-100/month)

**Recommendation: Google AI Studio**

**Why:**

- FREE tier (1M tokens/day)
- Professional quality
- Extended thinking
- PDF support
- Easy setup

**Configuration:**

```bash
GOOGLE_AI_API_KEY=your_key
GOOGLE_AI_MODEL=gemini-2.5-flash
```

**Expected Costs:**

- Development: $0/month (free tier)
- Production (low traffic): $0-$50/month
- Scaling strategy: Move to Vertex AI when you outgrow free tier

---

### Use Case 2: Healthcare Application (HIPAA Required)

**Recommendation: Azure OpenAI**

**Why:**

- HIPAA BAA available
- Enterprise security
- Microsoft compliance
- Audit logging

**Setup Checklist:**

1. ✅ Sign Azure HIPAA BAA
2. ✅ Configure Virtual Network
3. ✅ Enable audit logging
4. ✅ Set up Azure AD authentication
5. ✅ Configure data residency

**Configuration:**

```bash
AZURE_OPENAI_API_KEY=your_key
AZURE_OPENAI_ENDPOINT=https://your-resource.openai.azure.com
AZURE_OPENAI_DEPLOYMENT=gpt-4o
```

---

### Use Case 3: Legal Document Analysis

**Recommendation: Anthropic Claude 4.5 Sonnet**

**Why:**

- Extended thinking (deep analysis)
- Native PDF support
- 200K context window (handle long documents)
- Best reasoning quality

**Configuration:**

```typescript
const neurolink = new NeuroLink({
  provider: "anthropic",
  model: "claude-sonnet-4-5-20250929",
});

const analysis = await neurolink.generate({
  input: {
    text: "Analyze this contract for risks and obligations",
    pdfFiles: ["/path/to/contract.pdf"],
  },
  thinkingLevel: "high",
  maxTokens: 150000, // Use large context
});
```

---

### Use Case 4: Customer Support Chatbot (High Volume)

**Recommendation: OpenRouter with Free Models**

**Why:**

- FREE models for common queries
- Fallback to premium for complex cases
- Cost tracking
- Auto-failover

**Configuration:**

```typescript
async function handleSupportQuery(query: string, complexity: string) {
  if (complexity === "simple") {
    // Use free model
    return await neurolink.generate({
      provider: "openrouter",
      model: "google/gemini-2.0-flash-exp:free",
      prompt: query,
    });
  } else {
    // Use premium model
    return await neurolink.generate({
      provider: "openrouter",
      model: "anthropic/claude-3-5-sonnet",
      prompt: query,
    });
  }
}
```

**Expected Costs:**

- 80% simple queries: $0 (free model)
- 20% complex queries: ~$50/month (premium)
- **Total: $50/month** vs $250/month with all-premium

---

### Use Case 5: Internal Tools (Privacy Sensitive)

**Recommendation: Ollama (Local)**

**Why:**

- 100% private (no cloud)
- No ongoing costs
- Works offline
- Fast response

**Setup:**

```bash
# Install Ollama
curl -fsSL https://ollama.com/install.sh | sh

# Pull model
ollama pull llama3.1:70b

# Configure NeuroLink
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=llama3.1:70b
```

**Deployment Options:**

- **Development:** Run on developer machines
- **Staging:** Shared server with GPU
- **Production:** Kubernetes cluster with GPU nodes

---

## Provider Comparison Decision Matrix

### Budget vs Quality Trade-off

```
High Quality
    │
    │  Anthropic Claude 4.5
    │  OpenAI GPT-4o
    │  ↑
    │  │
    │  │  Azure OpenAI
    │  │  Bedrock (Claude)
    │  │  ↑
    │  │  │
    │  │  │  Mistral Large
    │  │  │  Vertex (Gemini Pro)
    │  │  │  ↑
    │  │  │  │
    │  │  │  │  Google AI (Gemini Flash) ← FREE
    │  │  │  │  OpenRouter (free models) ← FREE
    │  │  │  │  ↑
    │  │  │  │  │
    │  │  │  │  │  Ollama ← FREE + Private
    │  │  │  │  │
    └──┴──┴──┴──┴──┴──────> Cost
   Free      $      $$     $$$
```

### Features vs Complexity

```
Many Features
    │
    │  Amazon Bedrock (multi-provider)
    │  OpenRouter (300+ models)
    │  ↑
    │  │
    │  │  Google Vertex (Gemini + Claude)
    │  │  LiteLLM (100+ models)
    │  │  ↑
    │  │  │
    │  │  │  Anthropic (extended thinking + PDF)
    │  │  │  Google AI Studio (thinking + PDF + free)
    │  │  │  ↑
    │  │  │  │
    │  │  │  │  OpenAI (vision + tools)
    │  │  │  │  Azure OpenAI
    │  │  │  │  ↑
    │  │  │  │  │
    │  │  │  │  │  Mistral
    │  │  │  │  │  Ollama
    │  │  │  │  │
    └──┴──┴──┴──┴──┴──────> Setup Complexity
   Easy   Moderate    Complex
```

---

## Common Migration Paths

### Path 1: Prototype → Production

```
Phase 1 (Prototype): Google AI Studio (FREE)
    ↓
Phase 2 (Beta): Mistral (low cost)
    ↓
Phase 3 (Production): Anthropic (high quality)
```

### Path 2: Cloud → Local

```
Phase 1: Cloud Provider (OpenAI, Anthropic)
    ↓
Phase 2: Test Ollama locally
    ↓
Phase 3: Full migration to Ollama (privacy + cost savings)
```

### Path 3: Single → Multi-Provider

```
Phase 1: Single provider (e.g., OpenAI)
    ↓
Phase 2: Add LiteLLM proxy
    ↓
Phase 3: Route to optimal provider per task
```

---

## Quick Reference Cards

### Card 1: "I Need Something Fast"

**Fastest Setup (2 minutes):**

1. Google AI Studio - Just need API key
2. OpenAI - Industry standard
3. Mistral - European option

**Get Started:**

```bash
# Google AI Studio
export GOOGLE_AI_API_KEY=your_key
```

```typescript
const result = await neurolink.generate({
  provider: "google-ai",
  prompt: "Your task",
});
```

---

### Card 2: "I Have No Budget"

**Free Options Ranked:**

1. **Google AI Studio** - Best free option
   - 1M tokens/day FREE
   - Professional quality
   - Extended thinking + PDF

2. **Ollama** - Completely free
   - Local execution
   - Privacy-first
   - Requires GPU

3. **OpenRouter** - Free models available
   - Gemini 2.0 Flash
   - Llama 3.3 70B
   - Many others

---

### Card 3: "I Need Maximum Privacy"

**Privacy-First Options:**

1. **Ollama** (Best) - 100% local
2. **Mistral** - GDPR, EU data centers
3. **Self-hosted OpenAI Compatible** - Full control

**Ollama Setup:**

```bash
curl -fsSL https://ollama.com/install.sh | sh
ollama pull llama3.1:8b
```

---

### Card 4: "I Need Extended Thinking"

**Only 3 Providers:**

1. **Anthropic** (Best) - Native extended thinking
2. **Google AI Studio** - Gemini 2.5+, 3 (FREE)
3. **Google Vertex** - Same as AI Studio (paid)

**No other providers support extended thinking**

---

## Final Recommendation Algorithm

Answer YES/NO to each question:

1. **Do you have ZERO budget?**
   - YES → Google AI Studio or Ollama
   - NO → Continue

2. **Do you need HIPAA/enterprise compliance?**
   - YES → Azure OpenAI or Bedrock
   - NO → Continue

3. **Do you need extended thinking?**
   - YES → Anthropic (best) or Google AI Studio (free)
   - NO → Continue

4. **Do you need PDF processing?**
   - YES → Anthropic or Google AI Studio
   - NO → Continue

5. **Are you on AWS/Azure/GCP?**
   - AWS → Bedrock
   - Azure → Azure OpenAI
   - GCP → Vertex
   - None → Continue

6. **Do you need maximum privacy?**
   - YES → Ollama (local)
   - NO → Continue

7. **Do you want the absolute best quality?**
   - YES → OpenAI or Anthropic
   - NO → Mistral or Google AI Studio

---

## Still Unsure? Default Recommendations

### For Most Teams

**Start with Google AI Studio**

- FREE tier
- Easy setup
- Professional quality
- Upgrade path to Vertex

### For Enterprises

**Start with your cloud provider's offering**

- AWS → Bedrock
- Azure → Azure OpenAI
- GCP → Vertex

### For Developers

**Start with NeuroLink + LiteLLM**

- Test multiple providers
- Compare results
- Optimize costs
- Make informed decision

---

## Next Steps

1. **Read:** [Provider Comparison Guide](../reference/provider-comparison.md)
2. **Audit:** [Provider Capabilities](../reference/provider-capabilities-audit.md)
3. **Setup:** Follow provider-specific setup guide
4. **Test:** Run sample requests with your use case
5. **Monitor:** Track costs and performance
6. **Optimize:** Adjust based on real-world usage

---

## Need Help?

**Contact Options:**

- Documentation: [docs/](../index.md)
- GitHub Issues: Report bugs or ask questions
- Community: Join discussions

**Professional Support:**

- Enterprise consulting available
- Custom provider integration
- Performance optimization
- Migration assistance

---

**Remember:** With NeuroLink, you're never locked into a single provider. You can easily switch or use multiple providers simultaneously. Start with the recommendation above, monitor your usage, and adjust as needed.
