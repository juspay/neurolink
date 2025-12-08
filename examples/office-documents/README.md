# 📄 Office Document Processing Examples

This directory contains practical examples demonstrating NeuroLink's office document processing capabilities for DOCX, PPTX, and XLSX files.

## 📋 Prerequisites

### Required Setup

```bash
# Install NeuroLink
npm install @juspay/neurolink

# Set up provider credentials (choose one or more)
export GOOGLE_AI_API_KEY="AIza-your-key"     # Google AI Studio
export OPENAI_API_KEY="sk-your-key"           # OpenAI
export ANTHROPIC_API_KEY="sk-ant-your-key"    # Anthropic Claude
export VERTEX_PROJECT="your-project"          # Google Vertex AI
```

### Supported Providers

Office document processing requires vision-capable providers:

| Provider              | DOCX | PPTX | XLSX |
| --------------------- | ---- | ---- | ---- |
| Google AI Studio      | ✅   | ✅   | ✅   |
| OpenAI (GPT-4 Vision) | ✅   | ✅   | ✅   |
| Anthropic Claude      | ✅   | ✅   | ✅   |
| Google Vertex AI      | ✅   | ✅   | ✅   |
| AWS Bedrock           | ✅   | ✅   | ✅   |

## 📂 Example Files

### Contract Analysis (`contract-analysis.ts`)

Demonstrates DOCX document processing for legal contract analysis:

- Extract key contract terms and clauses
- Identify parties and obligations
- Summarize contract provisions
- Highlight potential risks

```bash
npx tsx examples/office-documents/contract-analysis.ts
```

### Presentation Summary (`presentation-summary.ts`)

Demonstrates PPTX presentation processing:

- Summarize slide content
- Extract key points and takeaways
- Identify themes and structure
- Generate meeting notes

```bash
npx tsx examples/office-documents/presentation-summary.ts
```

### Data Analysis (`data-analysis.ts`)

Demonstrates XLSX spreadsheet processing:

- Analyze spreadsheet data
- Generate statistical summaries
- Identify trends and patterns
- Create data insights

```bash
npx tsx examples/office-documents/data-analysis.ts
```

### Mixed Multimodal (`mixed-multimodal.ts`)

Demonstrates combined office document workflows:

- Analyze multiple document types together
- Cross-reference information across files
- Generate comprehensive reports
- Compare data from different sources

```bash
npx tsx examples/office-documents/mixed-multimodal.ts
```

## 🚀 Quick Start

### SDK Usage

```typescript
import { NeuroLink } from "@juspay/neurolink";

const neurolink = new NeuroLink();

// Analyze a DOCX contract
const contractResult = await neurolink.generate({
  input: {
    text: "Extract the key terms from this contract",
    officeFiles: ["./data/sample-contract.docx"],
  },
  provider: "google-ai",
  maxTokens: 2000,
});

// Summarize a PPTX presentation
const presentationResult = await neurolink.generate({
  input: {
    text: "Summarize the main points of this presentation",
    officeFiles: ["./data/quarterly-report.pptx"],
  },
  provider: "openai",
  model: "gpt-4o",
  maxTokens: 1500,
});

// Analyze an XLSX spreadsheet
const spreadsheetResult = await neurolink.generate({
  input: {
    text: "Analyze the sales trends in this spreadsheet",
    officeFiles: ["./data/sales-data.xlsx"],
  },
  provider: "anthropic",
  maxTokens: 1000,
});
```

### CLI Usage

```bash
# Analyze a DOCX file
npx @juspay/neurolink generate "Extract key terms from this contract" \
  --office examples/office-documents/data/sample-contract.docx \
  --provider google-ai

# Summarize a PPTX file
npx @juspay/neurolink generate "Summarize this presentation" \
  --office examples/office-documents/data/quarterly-report.pptx \
  --provider openai

# Analyze an XLSX file
npx @juspay/neurolink generate "What are the sales trends?" \
  --office examples/office-documents/data/sales-data.xlsx \
  --provider anthropic

# Mixed multimodal analysis
npx @juspay/neurolink generate "Compare the contract terms with the sales data" \
  --office examples/office-documents/data/sample-contract.docx \
  --office examples/office-documents/data/sales-data.xlsx \
  --provider google-ai
```

## 📁 Sample Data Files

The `data/` directory contains sample office documents for testing:

| File                    | Type | Description                     |
| ----------------------- | ---- | ------------------------------- |
| `sample-contract.docx`  | DOCX | Sample service agreement        |
| `quarterly-report.pptx` | PPTX | Quarterly business presentation |
| `sales-data.xlsx`       | XLSX | Sales metrics spreadsheet       |

## 🔧 Tips and Best Practices

### Token Management

Office documents can be large. Use these strategies:

```typescript
// Limit response size for large documents
const result = await neurolink.generate({
  input: {
    text: "Extract only the executive summary",
    officeFiles: ["./large-document.docx"],
  },
  maxTokens: 1000, // Limit response length
});
```

### Streaming for Large Documents

Use streaming for faster initial response:

```typescript
const stream = await neurolink.stream({
  input: {
    text: "Provide a detailed analysis of this spreadsheet",
    officeFiles: ["./financial-report.xlsx"],
  },
  provider: "google-ai",
  maxTokens: 3000,
});

for await (const chunk of stream) {
  process.stdout.write(chunk.content);
}
```

### Error Handling

```typescript
try {
  const result = await neurolink.generate({
    input: {
      text: "Analyze this document",
      officeFiles: ["./contract.docx"],
    },
    provider: "openai",
  });
  console.log(result.content);
} catch (error) {
  if (error.message.includes("not supported")) {
    console.log("This provider does not support office documents");
    console.log("Try: google-ai, openai, anthropic, or vertex");
  } else {
    console.error("Error:", error.message);
  }
}
```

## 📚 Related Examples

- [`../pdf-analysis.ts`](../pdf-analysis.ts) - PDF document processing
- [`../csv-analysis.ts`](../csv-analysis.ts) - CSV data analysis
- [`../basic-usage.js`](../basic-usage.js) - Basic SDK usage

## 🤝 Contributing

To add new examples:

1. Create a new TypeScript file following existing patterns
2. Add sample data files to `data/` directory
3. Update this README with the new example
4. Test with multiple providers

---

**📖 Full Documentation**: [NeuroLink Docs](https://github.com/juspay/neurolink#readme)
