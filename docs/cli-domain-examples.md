# Domain Configuration Examples for NeuroLink CLI

This document provides comprehensive examples of using domain-specific features with the NeuroLink CLI, showcasing the Phase 1 Factory Infrastructure capabilities.

## Table of Contents

- [Basic Domain Usage](#basic-domain-usage)
- [Healthcare Domain Examples](#healthcare-domain-examples)
- [Analytics Domain Examples](#analytics-domain-examples)
- [Finance Domain Examples](#finance-domain-examples)
- [E-commerce Domain Examples](#e-commerce-domain-examples)
- [Context Integration Examples](#context-integration-examples)
- [Evaluation and Analytics](#evaluation-and-analytics)
- [Provider-Specific Examples](#provider-specific-examples)
- [Streaming with Domains](#streaming-with-domains)
- [Configuration Management](#configuration-management)
- [Advanced Use Cases](#advanced-use-cases)

## Basic Domain Usage

### Simple Domain Generation

```bash
# Basic healthcare domain usage
neurolink generate "Analyze patient symptoms: fever, headache, fatigue" \
  --evaluationDomain healthcare \
  --enable-evaluation \
  --format json

# Basic analytics domain usage
neurolink generate "Calculate quarterly revenue growth trends" \
  --evaluationDomain analytics \
  --enable-evaluation \
  --enable-analytics \
  --format json
```

### Domain-Specific Streaming

```bash
# Stream with finance domain evaluation
neurolink stream "Assess investment portfolio risk for retirement planning" \
  --evaluationDomain finance \
  --enable-evaluation

# Stream with ecommerce domain evaluation
neurolink stream "Optimize conversion funnel for online retail store" \
  --evaluationDomain ecommerce \
  --enable-evaluation
```

## Healthcare Domain Examples

### Medical Diagnosis Support

```bash
# Comprehensive symptom analysis
neurolink generate "Patient presents with: chest pain (8/10), shortness of breath, elevated heart rate (110 BPM), diaphoresis. History: hypertension, diabetes. Age 65. Provide differential diagnosis and recommended tests." \
  --evaluationDomain healthcare \
  --enable-evaluation \
  --enable-analytics \
  --provider google-ai \
  --max-tokens 800 \
  --format json
```

### Treatment Planning

```bash
# Treatment recommendation with context
neurolink generate "Develop treatment plan for Type 2 diabetes patient" \
  --context '{"patientAge":55,"comorbidities":["hypertension","obesity"],"allergies":["penicillin"],"currentMedications":["metformin","lisinopril"]}' \
  --evaluationDomain healthcare \
  --enable-evaluation \
  --format json
```

### Medical Research Analysis

```bash
# Clinical trial data analysis
neurolink stream "Analyze clinical trial results for new cardiovascular drug" \
  --context '{"studyType":"randomized-controlled","sampleSize":2000,"primaryEndpoint":"MACE reduction","duration":"24-months"}' \
  --evaluationDomain healthcare \
  --enable-evaluation \
  --enable-analytics \
  --provider anthropic
```

## Analytics Domain Examples

### Business Intelligence

```bash
# Quarterly business analysis
neurolink generate "Analyze Q3 performance metrics and identify growth opportunities" \
  --context '{"revenue":"$2.5M","growth":"15%","customerAcquisition":450,"churnRate":"3.2%","marketSegment":"B2B-SaaS"}' \
  --evaluationDomain analytics \
  --enable-evaluation \
  --enable-analytics \
  --format json \
  --max-tokens 1000
```

### Data Science Insights

```bash
# Machine learning model performance analysis
neurolink generate "Evaluate ML model performance and recommend optimizations" \
  --context '{"modelType":"gradient-boosting","accuracy":0.87,"precision":0.83,"recall":0.91,"f1Score":0.87,"trainingData":"50k-samples","features":42}' \
  --evaluationDomain analytics \
  --enable-evaluation \
  --provider openai \
  --format json
```

### Predictive Analytics

```bash
# Sales forecasting with streaming
neurolink stream "Generate sales forecast for next quarter based on historical trends" \
  --context '{"historicalData":"3-years","seasonality":"high","marketTrends":"positive","competitiveAnalysis":"included"}' \
  --evaluationDomain analytics \
  --enable-evaluation \
  --enable-analytics
```

## Finance Domain Examples

### Investment Analysis

```bash
# Portfolio risk assessment
neurolink generate "Assess risk profile of diversified investment portfolio" \
  --context '{"assetAllocation":{"stocks":0.60,"bonds":0.30,"alternatives":0.10},"totalValue":"$500k","timeHorizon":"10-years","riskTolerance":"moderate"}' \
  --evaluationDomain finance \
  --enable-evaluation \
  --enable-analytics \
  --format json
```

### Financial Planning

```bash
# Retirement planning analysis
neurolink generate "Create comprehensive retirement savings strategy" \
  --context '{"currentAge":35,"retirementAge":65,"currentSavings":"$75k","annualIncome":"$120k","savingsRate":"15%","expectedReturns":"7%"}' \
  --evaluationDomain finance \
  --enable-evaluation \
  --provider vertex \
  --max-tokens 1200
```

### Market Analysis

```bash
# Economic trend analysis with streaming
neurolink stream "Analyze current market conditions and economic indicators" \
  --context '{"inflationRate":"3.2%","unemploymentRate":"3.8%","fedFundsRate":"5.25%","gdpGrowth":"2.1%","marketVolatility":"elevated"}' \
  --evaluationDomain finance \
  --enable-evaluation
```

## E-commerce Domain Examples

### Conversion Optimization

```bash
# E-commerce funnel analysis
neurolink generate "Optimize checkout process to reduce cart abandonment" \
  --context '{"cartAbandonmentRate":"68%","checkoutSteps":4,"averageLoadTime":"3.2s","mobileUsers":"75%","paymentOptions":["card","paypal","apple-pay"]}' \
  --evaluationDomain ecommerce \
  --enable-evaluation \
  --enable-analytics \
  --format json
```

### Customer Experience

```bash
# Product recommendation strategy
neurolink generate "Develop personalized product recommendation engine" \
  --context '{"userBase":"50k-active","purchaseHistory":"available","browsingData":"tracked","categoryCount":25,"averageOrderValue":"$85"}' \
  --evaluationDomain ecommerce \
  --enable-evaluation \
  --provider google-ai
```

### Marketing Campaign Analysis

```bash
# Campaign performance optimization
neurolink stream "Analyze digital marketing campaign performance and ROI" \
  --context '{"channels":["social","email","ppc","seo"],"budget":"$50k","duration":"3-months","conversions":1250,"cac":"$40","ltv":"$300"}' \
  --evaluationDomain ecommerce \
  --enable-evaluation \
  --enable-analytics
```

## Context Integration Examples

### Complex Organizational Context

```bash
# Enterprise analytics with comprehensive context
neurolink generate "Analyze operational efficiency across multiple departments" \
  --context '{
    "organization": {
      "id": "acme-corp-2024",
      "industry": "technology",
      "size": "mid-market",
      "locations": ["us-east", "eu-west", "apac-south"]
    },
    "departments": {
      "engineering": {"headcount": 120, "budget": "$8M", "kpis": ["velocity", "quality", "innovation"]},
      "sales": {"headcount": 45, "budget": "$2M", "kpis": ["revenue", "pipeline", "conversion"]},
      "marketing": {"headcount": 25, "budget": "$1.5M", "kpis": ["leads", "brand", "engagement"]}
    },
    "timeframe": "Q3-2024",
    "objectives": ["growth", "efficiency", "scalability"]
  }' \
  --evaluationDomain analytics \
  --enable-evaluation \
  --enable-analytics \
  --format json \
  --max-tokens 1500
```

### Multi-Domain Context

```bash
# Healthcare analytics with regulatory context
neurolink generate "Analyze patient outcomes while ensuring HIPAA compliance" \
  --context '{
    "healthcare": {
      "facilityType": "hospital",
      "specialties": ["cardiology", "oncology", "emergency"],
      "patientVolume": "daily-500"
    },
    "compliance": {
      "frameworks": ["HIPAA", "SOX", "FDA"],
      "auditStatus": "current",
      "dataClassification": "sensitive"
    },
    "analytics": {
      "metricsTracked": ["readmission-rates", "patient-satisfaction", "treatment-outcomes"],
      "reportingFrequency": "monthly",
      "stakeholders": ["medical-staff", "administration", "regulators"]
    }
  }' \
  --evaluationDomain healthcare \
  --enable-evaluation \
  --enable-analytics \
  --provider anthropic
```

## Evaluation and Analytics

### Comprehensive Evaluation Setup

```bash
# Full evaluation with custom domain
neurolink generate "Develop AI strategy for enterprise transformation" \
  --evaluationDomain analytics \
  --enable-evaluation \
  --enable-analytics \
  --context '{"industry":"manufacturing","aiMaturity":"beginner","budget":"$2M","timeline":"18-months"}' \
  --provider google-ai \
  --format json \
  --max-tokens 2000
```

### Analytics-Only Mode

```bash
# Analytics without evaluation
neurolink generate "Create quarterly performance report" \
  --enable-analytics \
  --context '{"quarter":"Q3","metrics":["revenue","growth","efficiency"],"stakeholders":["executives","board","investors"]}' \
  --format json
```

### Evaluation-Only Mode

```bash
# Evaluation without analytics
neurolink generate "Review software architecture decisions" \
  --evaluationDomain analytics \
  --enable-evaluation \
  --context '{"architecture":"microservices","scale":"enterprise","complexity":"high"}'
```

## Provider-Specific Examples

### OpenAI with Healthcare Domain

```bash
neurolink generate "Analyze drug interaction risks for polypharmacy patient" \
  --provider openai \
  --model gpt-4 \
  --evaluationDomain healthcare \
  --enable-evaluation \
  --context '{"medications":["warfarin","amiodarone","simvastatin"],"age":78,"kidneyFunction":"moderate-impairment"}' \
  --format json
```

### Anthropic with Finance Domain

```bash
neurolink generate "Assess cryptocurrency investment strategy risks" \
  --provider anthropic \
  --model claude-3-5-sonnet-20241022 \
  --evaluationDomain finance \
  --enable-evaluation \
  --enable-analytics \
  --context '{"portfolio":"traditional","riskTolerance":"low","cryptoAllocation":"5%","timeHorizon":"long-term"}' \
  --format json
```

### Google AI with Analytics Domain

```bash
neurolink stream "Optimize supply chain logistics using AI predictions" \
  --provider google-ai \
  --model gemini-2.5-pro \
  --evaluationDomain analytics \
  --enable-evaluation \
  --context '{"supplyChain":"global","products":"electronics","demandVolatility":"high","inventoryTurnover":"quarterly"}'
```

## Streaming with Domains

### Interactive Healthcare Consultation

```bash
# Stream medical case analysis
neurolink stream "Walk through differential diagnosis process for complex case" \
  --evaluationDomain healthcare \
  --enable-evaluation \
  --context '{"setting":"emergency-room","urgency":"high","resources":"full-diagnostic"}' \
  --provider anthropic
```

### Real-time Financial Analysis

```bash
# Stream market analysis
neurolink stream "Provide real-time analysis of market volatility impact" \
  --evaluationDomain finance \
  --enable-evaluation \
  --enable-analytics \
  --context '{"marketConditions":"volatile","portfolio":"balanced","clientRisk":"moderate"}'
```

### Live Business Intelligence

```bash
# Stream business insights
neurolink stream "Generate actionable insights from real-time business metrics" \
  --evaluationDomain analytics \
  --enable-evaluation \
  --enable-analytics \
  --context '{"dataSource":"live-dashboard","updateFrequency":"real-time","stakeholder":"c-suite"}'
```

## Configuration Management

### Setting Domain Defaults

```bash
# Configure default domain settings
neurolink config init
# Follow prompts to set:
# - Default Evaluation Domain: analytics
# - Enable Analytics by Default: yes
# - Enable Evaluation by Default: yes
```

### Domain-Specific Configuration

```bash
# Show current domain configuration
neurolink config show

# Export configuration with domain settings
neurolink config export --format json > neurolink-domain-config.json

# Validate domain configuration
neurolink config validate
```

### Custom Domain Setup

```bash
# Initialize with custom domain preferences
neurolink config init
# Select healthcare as default domain
# Configure evaluation criteria: accuracy, safety, compliance, clarity
# Enable diagnostic accuracy tracking
# Enable treatment outcomes tracking
```

## Advanced Use Cases

### Multi-Step Analysis Pipeline

```bash
# Step 1: Initial analysis
neurolink generate "Conduct preliminary market research analysis" \
  --evaluationDomain analytics \
  --enable-evaluation \
  --context '{"market":"fintech","stage":"preliminary","scope":"competitive-landscape"}' \
  --output step1-analysis.json \
  --format json

# Step 2: Deep dive based on initial findings
neurolink generate "Deep dive into identified market opportunities" \
  --evaluationDomain analytics \
  --enable-evaluation \
  --enable-analytics \
  --context '{"previousAnalysis":"step1-analysis.json","focus":"opportunity-sizing","methodology":"bottom-up"}' \
  --format json
```

### Cross-Domain Analysis

```bash
# Healthcare + Analytics combined analysis
neurolink generate "Analyze healthcare cost optimization using data analytics" \
  --evaluationDomain healthcare \
  --enable-evaluation \
  --enable-analytics \
  --context '{
    "healthcare": {"costs":"rising","quality":"maintained","patient-satisfaction":"high"},
    "analytics": {"dataAvailable":["claims","outcomes","satisfaction"],"methodology":"predictive-modeling"}
  }' \
  --format json \
  --max-tokens 2000
```

### Compliance-Aware Generation

```bash
# Finance with regulatory compliance
neurolink generate "Develop investment strategy complying with fiduciary standards" \
  --evaluationDomain finance \
  --enable-evaluation \
  --context '{
    "regulatory": {"framework":"DOL-fiduciary","state":"california","clientType":"retirement-plan"},
    "investment": {"universe":"mutual-funds","fees":"low-cost","diversification":"required"}
  }' \
  --format json
```

### Performance-Optimized Commands

```bash
# High-performance analytics processing
neurolink generate "Process large dataset for business insights" \
  --evaluationDomain analytics \
  --enable-analytics \
  --provider vertex \
  --max-tokens 1000 \
  --timeout 180 \
  --context '{"dataSize":"100GB","processing":"distributed","latency":"low","accuracy":"high"}' \
  --format json
```

## Best Practices

### 1. Domain Selection Guidelines

- **Healthcare**: Medical analysis, diagnosis support, treatment planning, regulatory compliance
- **Analytics**: Data analysis, business intelligence, predictive modeling, performance metrics
- **Finance**: Investment analysis, risk assessment, financial planning, market analysis
- **E-commerce**: Conversion optimization, customer experience, marketing campaigns, sales analytics

### 2. Context Structure Best Practices

```bash
# Well-structured context example
neurolink generate "Your analysis request" \
  --context '{
    "domain_specific": {
      "key_metrics": ["metric1", "metric2"],
      "constraints": ["constraint1", "constraint2"]
    },
    "organizational": {
      "size": "enterprise",
      "industry": "technology"
    },
    "temporal": {
      "timeframe": "Q3-2024",
      "urgency": "high"
    }
  }' \
  --evaluationDomain analytics \
  --enable-evaluation
```

### 3. Output Format Selection

- Use `--format json` for structured analysis and integration
- Use `--format text` for human-readable reports
- Use `--format table` for comparative data presentation

### 4. Performance Optimization

- Use `--max-tokens` to control response length
- Enable `--enable-analytics` for detailed performance metrics
- Use appropriate providers for specific domains
- Structure context data efficiently

### 5. Evaluation Best Practices

- Always enable evaluation for critical domain applications
- Use domain-specific evaluation criteria
- Monitor evaluation scores for quality assurance
- Combine evaluation with analytics for comprehensive insights

## Troubleshooting

### Common Issues and Solutions

1. **Unknown domain error**

   ```bash
   # Ensure domain name is supported
   neurolink generate "test" --evaluationDomain healthcare  # ✓ Correct
   neurolink generate "test" --evaluationDomain medical     # ✗ Incorrect
   ```

2. **Context parsing errors**

   ```bash
   # Use proper JSON formatting
   neurolink generate "test" --context '{"key":"value"}'     # ✓ Correct
   neurolink generate "test" --context '{key:value}'        # ✗ Incorrect
   ```

3. **Performance issues**

   ```bash
   # Optimize token limits and context size
   neurolink generate "test" --max-tokens 500 --context '{"minimal":"data"}'
   ```

4. **Provider compatibility**
   ```bash
   # Test with different providers if needed
   neurolink generate "test" --provider google-ai --evaluationDomain healthcare
   neurolink generate "test" --provider anthropic --evaluationDomain finance
   ```

## Additional Resources

- [CLI Reference](cli/commands.md)
- [Configuration Guide](reference/configuration.md)
- [Performance Optimization](performance-optimization-guide.md)
- [API Documentation](sdk/api-reference.md)

For more examples and advanced usage patterns, visit the [NeuroLink Examples Repository](https://github.com/juspay/neurolink-examples).
