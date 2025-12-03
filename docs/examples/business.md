# Business Applications

Enterprise-focused examples demonstrating NeuroLink's value in business environments, ROI optimization, and organizational workflows.

## 💼 Executive Decision Support

### Strategic Planning Assistant

**Scenario**: C-level executives need AI-powered insights for strategic decisions.

```typescript
import { NeuroLink } from "@juspay/neurolink";

class StrategyAssistant {
  private neurolink: NeuroLink;

  constructor() {
    this.neurolink = new NeuroLink({
      analytics: { enabled: true },
    });
  }

  async analyzeMarketOpportunity(opportunity: any, companyContext: any) {
    const prompt = `Analyze this market opportunity for strategic decision-making:
                   
                   Opportunity: ${JSON.stringify(opportunity, null, 2)}
                   Company context: ${JSON.stringify(companyContext, null, 2)}
                   
                   Provide:
                   1. Market size and growth potential
                   2. Competitive landscape analysis
                   3. Required investment and resources
                   4. Risk assessment and mitigation strategies
                   5. ROI projections and timeline
                   6. Go/no-go recommendation with rationale`;

    return await this.neurolink.generate({
      input: { text: prompt },
      provider: "anthropic",
      temperature: 0.4,
      maxTokens: 1500,
      context: {
        role: "strategic_analysis",
        department: "executive",
        priority: "high",
      },
    });
  }

  async generateBoardPresentation(quarterlyData: any, initiatives: any[]) {
    const prompt = `Create a board presentation summary based on:
                   
                   Quarterly performance: ${JSON.stringify(quarterlyData, null, 2)}
                   Key initiatives: ${JSON.stringify(initiatives, null, 2)}
                   
                   Include:
                   - Executive summary (3 key points)
                   - Financial highlights
                   - Strategic progress
                   - Challenges and solutions
                   - Next quarter priorities
                   
                   Format for C-level audience.`;

    return await this.neurolink.generate({
      input: { text: prompt },
      provider: "openai",
      temperature: 0.5,
      context: {
        audience: "board_of_directors",
        format: "executive_summary",
      },
    });
  }

  async competitorAnalysis(competitors: string[], marketSegment: string) {
    const prompt = `Conduct comprehensive competitor analysis:
                   
                   Competitors: ${competitors.join(", ")}
                   Market segment: ${marketSegment}
                   
                   For each competitor analyze:
                   - Market position and share
                   - Key strengths and weaknesses
                   - Pricing strategy
                   - Recent moves and partnerships
                   - Threats and opportunities they present
                   
                   Conclude with strategic recommendations.`;

    return await this.neurolink.generate({
      input: { text: prompt },
      provider: "google-ai",
      temperature: 0.6,
      maxTokens: 2000,
    });
  }
}

// Usage
const strategy = new StrategyAssistant();

// Analyze new market entry
const marketAnalysis = await strategy.analyzeMarketOpportunity(
  {
    market: "AI-powered customer service",
    geography: "European Union",
    targetSegment: "SMB",
    entryStrategy: "acquisition",
  },
  {
    currentRevenue: "$50M",
    employees: 200,
    marketPresence: ["North America"],
    coreCompetencies: ["AI/ML", "SaaS platforms"],
  },
);

// Generate quarterly board presentation
const boardDeck = await strategy.generateBoardPresentation(
  {
    revenue: "$12.5M",
    growth: "23%",
    customers: 1850,
    churn: "2.1%",
  },
  [
    { name: "Product V2 Launch", status: "on-track", impact: "high" },
    { name: "EU Expansion", status: "delayed", impact: "medium" },
  ],
);

console.log("Strategic Analysis:", marketAnalysis.content);
console.log("Board Presentation:", boardDeck.content);
```

### CLI for Executive Workflows

```bash
#!/bin/bash
# Executive daily briefing automation

DATE=$(date +"%Y-%m-%d")

echo "🏢 Generating Executive Daily Briefing for $DATE"

# Market analysis
npx @juspay/neurolink gen "
Analyze today's key business news and market trends relevant to SaaS companies.
Focus on: AI/ML industry, enterprise software, regulatory changes, competitive moves.
Provide 3-5 key insights with business implications.
" --enable-analytics \
  --context '{"role":"executive","type":"market_briefing","date":"'$DATE'"}' \
  > briefing-market-$DATE.md

# Industry intelligence
npx @juspay/neurolink gen "
Generate strategic intelligence for enterprise AI software company:
1. Emerging technology trends affecting our market
2. New competitors or competitive threats
3. Partnership and acquisition opportunities
4. Regulatory developments
5. Customer behavior shifts

Format as executive summary with action items.
" --provider anthropic \
  --enable-evaluation \
  --evaluation-domain "Business Strategy Consultant" \
  > briefing-intelligence-$DATE.md

# Performance analysis
npx @juspay/neurolink gen "
Based on typical SaaS metrics, create analysis framework for:
- Revenue growth assessment
- Customer acquisition cost optimization
- Churn reduction strategies
- Market expansion opportunities

Include KPIs to track and red flags to monitor.
" --context '{"company_stage":"growth","sector":"b2b_saas"}' \
  > performance-framework-$DATE.md

echo "✅ Executive briefing complete"
echo "📄 Files generated:"
echo "  - briefing-market-$DATE.md"
echo "  - briefing-intelligence-$DATE.md"
echo "  - performance-framework-$DATE.md"
```

## 🏭 Operations & Process Optimization

### Business Process Analysis

```typescript
class ProcessOptimizer {
  private neurolink: NeuroLink;

  constructor() {
    this.neurolink = new NeuroLink();
  }

  async analyzeWorkflow(processData: any, painPoints: string[]) {
    const prompt = `Analyze this business process for optimization opportunities:
                   
                   Current process: ${JSON.stringify(processData, null, 2)}
                   Known pain points: ${painPoints.join(", ")}
                   
                   Provide:
                   1. Process efficiency analysis
                   2. Bottleneck identification
                   3. Automation opportunities
                   4. Resource optimization suggestions
                   5. Implementation roadmap
                   6. Expected ROI and timeline`;

    return await this.neurolink.generate({
      input: { text: prompt },
      provider: "anthropic",
      temperature: 0.4,
      context: {
        analysis_type: "process_optimization",
        focus: "efficiency_roi",
      },
    });
  }

  async generateSOPs(processName: string, steps: any[], compliance: string[]) {
    const prompt = `Create comprehensive Standard Operating Procedures for: ${processName}
                   
                   Process steps: ${JSON.stringify(steps, null, 2)}
                   Compliance requirements: ${compliance.join(", ")}
                   
                   Include:
                   - Step-by-step procedures
                   - Quality checkpoints
                   - Error handling protocols
                   - Escalation procedures
                   - Training requirements
                   - Compliance verification`;

    return await this.neurolink.generate({
      input: { text: prompt },
      provider: "google-ai",
      temperature: 0.3,
      maxTokens: 1500,
    });
  }

  async costBenefitAnalysis(
    currentCosts: any,
    proposedSolution: any,
    timeframe: string,
  ) {
    const prompt = `Conduct detailed cost-benefit analysis:
                   
                   Current costs: ${JSON.stringify(currentCosts, null, 2)}
                   Proposed solution: ${JSON.stringify(proposedSolution, null, 2)}
                   Analysis timeframe: ${timeframe}
                   
                   Calculate:
                   - Implementation costs
                   - Operational savings
                   - Productivity gains
                   - Risk mitigation value
                   - ROI and payback period
                   - Sensitivity analysis`;

    return await this.neurolink.generate({
      input: { text: prompt },
      provider: "openai",
      temperature: 0.3,
      context: {
        analysis_type: "financial",
        output_format: "business_case",
      },
    });
  }
}

// Usage
const optimizer = new ProcessOptimizer();

// Analyze customer onboarding process
const onboardingAnalysis = await optimizer.analyzeWorkflow(
  {
    name: "Customer Onboarding",
    steps: [
      { step: "Lead qualification", duration: "2 days", owner: "Sales" },
      { step: "Contract signing", duration: "5 days", owner: "Legal" },
      { step: "Technical setup", duration: "10 days", owner: "Engineering" },
      { step: "Training delivery", duration: "3 days", owner: "Success" },
    ],
    currentDuration: "20 days",
    customerSatisfaction: "6.5/10",
  },
  [
    "Long lead times",
    "Manual handoffs",
    "Limited visibility",
    "Inconsistent experience",
  ],
);

// Generate SOPs for incident response
const incidentSOPs = await optimizer.generateSOPs(
  "Security Incident Response",
  [
    {
      step: "Detection",
      tools: ["SIEM", "Monitoring"],
      timeframe: "5 minutes",
    },
    {
      step: "Assessment",
      team: ["Security", "Engineering"],
      timeframe: "15 minutes",
    },
    {
      step: "Containment",
      actions: ["Isolate", "Preserve evidence"],
      timeframe: "30 minutes",
    },
    {
      step: "Recovery",
      validation: ["Service restoration", "Security verification"],
    },
  ],
  ["SOX", "GDPR", "ISO 27001"],
);

// Cost-benefit analysis for automation
const automationROI = await optimizer.costBenefitAnalysis(
  {
    manualProcessing: "$50000/month",
    errorRate: "5%",
    processingTime: "4 hours/task",
  },
  {
    automationTool: "$10000/month",
    implementationCost: "$100000",
    expectedErrorRate: "0.5%",
    expectedProcessingTime: "15 minutes/task",
  },
  "24 months",
);
```

## 💰 Financial Planning & Analysis

### Financial Decision Support

```bash
# Budget analysis and planning
npx @juspay/neurolink gen "
Analyze our Q4 budget performance and create Q1 planning recommendations:

Q4 Performance:
- Revenue: $2.8M (target: $3M)
- OpEx: $2.1M (budget: $2M)
- Customer Acquisition Cost: $450
- Gross margin: 78%

Create Q1 budget recommendations focusing on:
1. Revenue optimization strategies
2. Cost structure improvements
3. Investment priorities
4. Risk mitigation measures
" --provider anthropic \
  --enable-analytics \
  --context '{"department":"finance","type":"budget_planning"}' \
  > q1-budget-analysis.md

# Investment proposal evaluation
npx @juspay/neurolink gen "
Evaluate this investment proposal:
- New AI development team: $500K annual cost
- Expected output: 2x faster feature development
- Market opportunity: $10M TAM expansion
- Timeline: 18 month payback projected

Analyze from CFO perspective:
- Financial viability
- Risk assessment
- Alternative approaches
- Investment committee recommendation
" --enable-evaluation \
  --evaluation-domain "Chief Financial Officer" \
  > investment-proposal-analysis.md

# Cash flow forecasting
npx @juspay/neurolink gen "
Create 12-month cash flow forecast model framework for SaaS business:

Include considerations for:
- Subscription revenue recognition
- Seasonal variations
- Customer churn impact
- Growth investment timing
- Working capital requirements

Provide Excel-ready formulas and scenarios (conservative, base, optimistic).
" --max-tokens 1500 \
  > cashflow-model-framework.md
```

## 📈 Sales & Revenue Optimization

### Sales Intelligence

```typescript
class SalesIntelligence {
  private neurolink: NeuroLink;

  constructor() {
    this.neurolink = new NeuroLink();
  }

  async analyzeSalesPerformance(
    salesData: any[],
    territory: string,
    period: string,
  ) {
    const prompt = `Analyze sales performance for ${territory} in ${period}:
                   
                   Sales data: ${JSON.stringify(salesData, null, 2)}
                   
                   Provide analysis of:
                   1. Performance vs targets and trends
                   2. Top performing segments/products
                   3. Underperforming areas requiring attention
                   4. Seasonal or cyclical patterns
                   5. Competitive win/loss insights
                   6. Pipeline health assessment
                   7. Actionable recommendations for improvement`;

    return await this.neurolink.generate({
      input: { text: prompt },
      provider: "google-ai",
      temperature: 0.4,
      context: {
        department: "sales",
        analysis_type: "performance_review",
        territory: territory,
      },
    });
  }

  async generateSalesPlaybook(
    industry: string,
    buyerPersonas: any[],
    salesCycle: any,
  ) {
    const prompt = `Create a comprehensive sales playbook for ${industry}:
                   
                   Buyer personas: ${JSON.stringify(buyerPersonas, null, 2)}
                   Sales cycle: ${JSON.stringify(salesCycle, null, 2)}
                   
                   Include:
                   - Discovery question frameworks
                   - Objection handling scripts
                   - Value proposition messaging
                   - Competitive battle cards
                   - Closing techniques
                   - Follow-up sequences
                   - Success metrics and KPIs`;

    return await this.neurolink.generate({
      input: { text: prompt },
      provider: "anthropic",
      temperature: 0.6,
      maxTokens: 2000,
    });
  }

  async optimizePricing(
    marketData: any,
    competitorPricing: any[],
    valueDrivers: string[],
  ) {
    const prompt = `Develop pricing optimization strategy:
                   
                   Market data: ${JSON.stringify(marketData, null, 2)}
                   Competitor pricing: ${JSON.stringify(competitorPricing, null, 2)}
                   Value drivers: ${valueDrivers.join(", ")}
                   
                   Recommend:
                   1. Optimal pricing structure and tiers
                   2. Value-based pricing justification
                   3. Competitive positioning strategy
                   4. Price sensitivity analysis
                   5. A/B testing framework
                   6. Implementation timeline and change management`;

    return await this.neurolink.generate({
      input: { text: prompt },
      provider: "openai",
      temperature: 0.5,
      context: {
        analysis_type: "pricing_strategy",
        focus: "revenue_optimization",
      },
    });
  }
}

// Usage
const salesIntel = new SalesIntelligence();

// Analyze quarterly sales performance
const performanceAnalysis = await salesIntel.analyzeSalesPerformance(
  [
    { rep: "John", target: 100000, actual: 120000, deals: 12 },
    { rep: "Sarah", target: 100000, actual: 85000, deals: 8 },
    { rep: "Mike", target: 100000, actual: 110000, deals: 15 },
  ],
  "North America",
  "Q4 2024",
);

// Generate industry-specific sales playbook
const playbook = await salesIntel.generateSalesPlaybook(
  "Financial Services",
  [
    { role: "CFO", painPoints: ["Cost control", "Compliance"], budget: "High" },
    {
      role: "IT Director",
      painPoints: ["Security", "Integration"],
      influence: "High",
    },
  ],
  {
    averageLength: "6 months",
    keyStages: [
      "Discovery",
      "Technical Evaluation",
      "Business Case",
      "Legal Review",
    ],
  },
);

// Optimize pricing strategy
const pricingStrategy = await salesIntel.optimizePricing(
  {
    marketSize: "$5B",
    growth: "15%",
    averageDealSize: "$50K",
  },
  [
    { competitor: "CompetitorA", startingPrice: "$10K", enterprise: "$50K" },
    { competitor: "CompetitorB", startingPrice: "$15K", enterprise: "$75K" },
  ],
  [
    "ROI improvement",
    "Time savings",
    "Risk reduction",
    "Compliance automation",
  ],
);
```

## 🎯 Marketing & Customer Success

### Marketing Intelligence

```bash
# Campaign performance analysis
npx @juspay/neurolink gen "
Analyze our Q4 marketing campaign performance:

Campaign Results:
- Email marketing: 4.2% CTR, 18% open rate, $15 CPA
- Paid search: 3.8% CTR, $22 CPA, 1.2M impressions
- Content marketing: 125K blog views, 850 leads
- Social media: 15K engagement, 320 qualified leads
- Events: 3 conferences, 180 leads, $45K spend

Provide:
1. Performance assessment vs industry benchmarks
2. Channel effectiveness and ROI analysis
3. Attribution modeling insights
4. Optimization recommendations for Q1
5. Budget reallocation suggestions
" --enable-analytics \
  --context '{"department":"marketing","type":"campaign_analysis"}' \
  > marketing-performance-q4.md

# Customer segmentation strategy
npx @juspay/neurolink gen "
Develop customer segmentation strategy for B2B SaaS:

Current customer base:
- 2,500 total customers
- Industries: Tech (40%), Financial (25%), Healthcare (20%), Other (15%)
- Company sizes: SMB (<500 employees, 60%), Mid-market (500-5000, 30%), Enterprise (>5000, 10%)
- Usage patterns: Power users (25%), Regular users (50%), Light users (25%)

Create segmentation framework for:
- Targeted messaging and positioning
- Product development priorities
- Customer success strategies
- Upselling and expansion opportunities
" --provider anthropic \
  --enable-evaluation \
  --evaluation-domain "VP of Marketing" \
  > customer-segmentation-strategy.md

# Content marketing strategy
npx @juspay/neurolink gen "
Create comprehensive content marketing strategy:

Target audience: IT decision makers at mid-market companies
Key topics: AI adoption, digital transformation, security, compliance
Content goals: Brand awareness, lead generation, thought leadership

Develop:
1. Content pillar framework
2. Editorial calendar structure
3. Content distribution strategy
4. Performance measurement framework
5. Resource requirements and budget
6. 90-day implementation plan
" --temperature 0.7 \
  --max-tokens 1500 \
  > content-marketing-strategy.md
```

### Customer Success Optimization

```typescript
class CustomerSuccessIntelligence {
  private neurolink: NeuroLink;

  constructor() {
    this.neurolink = new NeuroLink();
  }

  async analyzeChurnRisk(customerData: any[], usageMetrics: any[]) {
    const prompt = `Analyze customer churn risk and provide retention strategies:
                   
                   Customer data: ${JSON.stringify(customerData.slice(0, 5), null, 2)}
                   Usage metrics: ${JSON.stringify(usageMetrics.slice(0, 5), null, 2)}
                   
                   Identify:
                   1. High-risk churn indicators and patterns
                   2. Customer segments most at risk
                   3. Early warning signals to monitor
                   4. Proactive intervention strategies
                   5. Success metrics for retention programs
                   6. Resource allocation recommendations`;

    return await this.neurolink.generate({
      input: { text: prompt },
      provider: "anthropic",
      temperature: 0.4,
      context: {
        department: "customer_success",
        analysis_type: "churn_prevention",
      },
    });
  }

  async generateExpansionStrategy(accountData: any, productCatalog: any[]) {
    const prompt = `Develop account expansion strategy:
                   
                   Account data: ${JSON.stringify(accountData, null, 2)}
                   Available products: ${JSON.stringify(productCatalog, null, 2)}
                   
                   Recommend:
                   1. Expansion opportunities and prioritization
                   2. Cross-sell and upsell scenarios
                   3. Value proposition for each opportunity
                   4. Implementation timeline and approach
                   5. Success probability assessment
                   6. Revenue impact projections`;

    return await this.neurolink.generate({
      input: { text: prompt },
      provider: "google-ai",
      temperature: 0.5,
      context: {
        focus: "revenue_expansion",
        account_tier: accountData.tier,
      },
    });
  }

  async optimizeOnboarding(currentProcess: any, customerFeedback: string[]) {
    const prompt = `Optimize customer onboarding process:
                   
                   Current process: ${JSON.stringify(currentProcess, null, 2)}
                   Customer feedback: ${customerFeedback.join("\n")}
                   
                   Provide recommendations for:
                   1. Onboarding flow optimization
                   2. Milestone and checkpoint improvements
                   3. Self-service vs assisted touch points
                   4. Success criteria and measurement
                   5. Automation opportunities
                   6. Resource requirements`;

    return await this.neurolink.generate({
      input: { text: prompt },
      provider: "openai",
      temperature: 0.5,
      maxTokens: 1200,
    });
  }
}

// Usage
const csIntel = new CustomerSuccessIntelligence();

// Analyze churn risk across customer base
const churnAnalysis = await csIntel.analyzeChurnRisk(
  [
    { id: "cust1", tier: "enterprise", tenure: 24, health: "yellow" },
    { id: "cust2", tier: "mid-market", tenure: 6, health: "red" },
  ],
  [
    { customer: "cust1", logins: 45, features: 8, support_tickets: 2 },
    { customer: "cust2", logins: 12, features: 3, support_tickets: 8 },
  ],
);

// Generate expansion opportunities
const expansionStrategy = await csIntel.generateExpansionStrategy(
  {
    companySize: 1500,
    currentARR: 120000,
    products: ["Core Platform"],
    industry: "Financial Services",
  },
  [
    { name: "Advanced Analytics", price: 50000, fit: "high" },
    { name: "Compliance Module", price: 30000, fit: "high" },
    { name: "API Access", price: 20000, fit: "medium" },
  ],
);
```

## 🏆 Performance Management

### Executive KPI Dashboard

```bash
#!/bin/bash
# Automated executive dashboard generation

# Generate weekly executive summary
npx @juspay/neurolink gen "
Create executive dashboard summary for SaaS company:

Key Metrics (Week over Week):
- MRR: $850K (+3.2%)
- New customers: 45 (+12%)
- Churn rate: 2.1% (-0.3%)
- CAC: $420 (-8%)
- NPS: 67 (+2 points)
- Team productivity: 87% (+5%)

Generate executive summary including:
1. Key performance highlights
2. Concerning trends requiring attention
3. Strategic recommendations
4. Resource allocation suggestions
5. Risk mitigation priorities

Format for C-level consumption.
" --provider anthropic \
  --enable-analytics \
  --context '{"audience":"executives","format":"dashboard_summary"}' \
  > executive-summary-$(date +%Y%m%d).md

# Department performance analysis
npx @juspay/neurolink gen "
Analyze cross-departmental performance alignment:

Sales: 108% of target, strong pipeline health
Marketing: 95% lead target, improved conversion rates
Engineering: 92% sprint completion, technical debt concerns
Customer Success: 98% retention target, expansion opportunities
Finance: On budget, cash flow positive

Identify:
- Inter-departmental dependencies and bottlenecks
- Resource reallocation opportunities
- Performance improvement initiatives
- Cross-functional collaboration needs
" --enable-evaluation \
  --evaluation-domain "Chief Operating Officer" \
  > departmental-performance-$(date +%Y%m%d).md

echo "✅ Executive dashboards generated"
```

## 📋 Compliance & Risk Management

### Regulatory Compliance

```typescript
class ComplianceAssistant {
  private neurolink: NeuroLink;

  constructor() {
    this.neurolink = new NeuroLink();
  }

  async assessComplianceGap(
    currentPolicies: any[],
    regulations: string[],
    industry: string,
  ) {
    const prompt = `Conduct compliance gap analysis for ${industry} industry:
                   
                   Current policies: ${JSON.stringify(currentPolicies, null, 2)}
                   Applicable regulations: ${regulations.join(", ")}
                   
                   Identify:
                   1. Compliance gaps and deficiencies
                   2. Risk levels and potential penalties
                   3. Required policy updates and new procedures
                   4. Implementation timeline and priorities
                   5. Training and awareness requirements
                   6. Ongoing monitoring and audit needs`;

    return await this.neurolink.generate({
      input: { text: prompt },
      provider: "anthropic",
      temperature: 0.3,
      context: {
        domain: "compliance",
        industry: industry,
        urgency: "high",
      },
    });
  }

  async generateRiskRegister(
    businessActivities: any[],
    riskCategories: string[],
  ) {
    const prompt = `Create comprehensive risk register:
                   
                   Business activities: ${JSON.stringify(businessActivities, null, 2)}
                   Risk categories: ${riskCategories.join(", ")}
                   
                   For each identified risk provide:
                   1. Risk description and impact assessment
                   2. Probability and severity ratings
                   3. Current controls and mitigation measures
                   4. Residual risk assessment
                   5. Additional controls needed
                   6. Risk ownership and monitoring requirements`;

    return await this.neurolink.generate({
      input: { text: prompt },
      provider: "google-ai",
      temperature: 0.4,
      maxTokens: 1800,
    });
  }
}

// Usage
const compliance = new ComplianceAssistant();

// Assess GDPR compliance
const gdprGap = await compliance.assessComplianceGap(
  [
    { name: "Data Processing Policy", lastUpdated: "2023-01-15" },
    { name: "Privacy Notice", lastUpdated: "2023-06-01" },
    { name: "Incident Response", lastUpdated: "2022-11-30" },
  ],
  ["GDPR", "CCPA", "SOX"],
  "Financial Technology",
);

// Generate operational risk register
const riskRegister = await compliance.generateRiskRegister(
  [
    {
      activity: "Customer data processing",
      volume: "high",
      sensitivity: "high",
    },
    { activity: "Third-party integrations", count: 15, criticality: "medium" },
    {
      activity: "Cloud infrastructure",
      dependency: "high",
      redundancy: "partial",
    },
  ],
  ["Operational", "Cyber Security", "Regulatory", "Financial", "Reputational"],
);
```

These business applications demonstrate how NeuroLink can drive value across all organizational functions, from strategic decision-making to operational optimization, providing measurable ROI and competitive advantages.

## 📚 Related Documentation

- [Use Cases](use-cases.md) - Industry-specific applications
- [Advanced Examples](advanced.md) - Complex integration patterns
- [Analytics Features](../advanced/analytics.md) - Business intelligence capabilities
- [Enterprise Setup](../getting-started/provider-setup.md) - Enterprise configuration
