# NeuroLink Multimodal Image Support Implementation Approach

## Executive Summary

This document outlines the comprehensive approach for implementing multimodal image support in NeuroLink, focusing on **URL and local image analysis**. The implementation leverages the proven working architecture that ensures 100% backward compatibility while providing powerful image processing capabilities through both CLI and SDK interfaces.

**Status: ✅ PRODUCTION-READY IMPLEMENTATION**

---

## Table of Contents

1. [Problem Statement & Solution](#problem-statement--solution)
2. [Architecture Overview](#architecture-overview)
3. [Implementation Strategy](#implementation-strategy)
4. [URL Image Processing](#url-image-processing)
5. [Local Image Processing](#local-image-processing)
6. [CLI Usage Examples](#cli-usage-examples)
7. [SDK Integration Examples](#sdk-integration-examples)
8. [Technical Implementation Details](#technical-implementation-details)
9. [Performance & Best Practices](#performance--best-practices)
10. [Troubleshooting & Debugging](#troubleshooting--debugging)

---

## Problem Statement & Solution

### Core Challenge

The primary challenge was achieving **Vercel AI SDK compatibility** while providing seamless multimodal image support for both URL and local image processing. NeuroLink uses the Vercel AI SDK under the hood, which has specific schema requirements for multimodal content.

### Solution Architecture

The solution implements a **three-layer compatibility system**:

1. **Input Layer**: Flexible input handling for URLs, file paths, Buffers, and base64 strings
2. **Processing Layer**: Smart format conversion and validation 
3. **Output Layer**: Vercel AI SDK compatible message format with required `mimeType` field

```typescript
// ✅ WORKING SOLUTION: Vercel AI SDK Compatible Format
{
  type: "image",
  image: Buffer | string,
  mimeType: "image/jpeg" // CRITICAL: This field ensures SDK compatibility
}
```

---

## Architecture Overview

### Data Flow Diagram

```
User Input → Image Processor → Message Builder → Vercel AI SDK → Provider API
    ↓             ↓              ↓              ↓              ↓
URLs/Files    Format         SDK Format     Provider        Image
+ Text        Conversion     + mimeType     API Call        Analysis
```

### Key Components

1. **Image Processor**: Handles URL downloading, file reading, and format detection
2. **Message Builder**: Creates Vercel AI SDK compatible messages
3. **Provider Adapter**: Routes to appropriate AI provider (Vertex AI, OpenAI, etc.)
4. **CLI Interface**: Command-line multimodal processing
5. **SDK Interface**: Programmatic multimodal integration

---

## Implementation Strategy

### Phase 1: Core Multimodal Support

**Objective**: Enable basic image processing with text prompts

**Key Files Modified**:
- `src/lib/utils/messageBuilder.ts` - Vercel AI SDK format compliance
- `src/lib/adapters/providerImageAdapter.ts` - Vision model capabilities
- `src/lib/neurolink.ts` - Input preservation through pipeline

**Success Criteria**:
- ✅ Images processed alongside text prompts
- ✅ Zero breaking changes to existing functionality
- ✅ Vercel AI SDK schema compliance

### Phase 2: URL & Local File Support

**Objective**: Comprehensive image input handling

**Implementation Areas**:
- URL image downloading with proper error handling
- Local file processing with validation
- Format detection and conversion
- Memory-efficient Buffer handling

### Phase 3: CLI Integration

**Objective**: Command-line multimodal capabilities

**Features**:
- `--image` flag for single/multiple images
- URL and local file path support
- Real-time processing feedback
- Debug output for troubleshooting

---

## URL Image Processing

### Implementation Overview

URL image processing automatically downloads images from web URLs and converts them to the appropriate format for AI analysis.

### Supported URL Formats

```typescript
// ✅ Supported URL patterns
const supportedUrls = [
  "https://example.com/image.jpg",
  "http://example.com/photo.png", 
  "https://cdn.example.com/assets/image.webp",
  "https://imgur.com/abc123.gif"
];
```

### CLI Usage - URL Images

#### Single URL Image

```bash
# Basic URL image analysis
pnpm cli generate "What do you see in this image?" \
  --image "https://example.com/image.jpg" \
  --provider vertex \
  --model claude-sonnet-4@20250514

# With analytics and evaluation
pnpm cli generate "Describe this image in detail" \
  --image "https://picsum.photos/800/600" \
  --provider vertex \
  --model claude-sonnet-4@20250514 \
  --enable-analytics \
  --enable-evaluation \
  --debug
```

#### Multiple URL Images

```bash
# Compare multiple images from URLs
pnpm cli generate "Compare these images and highlight differences" \
  --image "https://example.com/before.jpg" \
  --image "https://example.com/after.jpg" \
  --provider vertex \
  --model claude-sonnet-4@20250514 \
  --enable-analytics

# Analyze multiple product images
pnpm cli generate "Which product looks more appealing and why?" \
  --image "https://shop.example.com/product1.jpg" \
  --image "https://shop.example.com/product2.jpg" \
  --image "https://shop.example.com/product3.jpg" \
  --provider vertex \
  --model claude-sonnet-4@20250514
```

### SDK Usage - URL Images

#### Basic URL Image Processing

```typescript
import { neurolink } from './src/lib/neurolink.js';

// Single URL image analysis
const result = await neurolink.generate({
  input: {
    text: "What architectural style is shown in this building?",
    images: ["https://example.com/architecture.jpg"]
  },
  provider: "vertex",
  model: "claude-sonnet-4@20250514",
  enableAnalytics: true
});

console.log("Analysis:", result.content);
console.log("Token usage:", result.analytics?.tokens);
```

#### Advanced URL Image Processing

```typescript
// Multiple URL images with comprehensive analysis
const result = await neurolink.generate({
  input: {
    text: "Analyze these website screenshots and provide UX recommendations",
    images: [
      "https://example.com/homepage-desktop.png",
      "https://example.com/homepage-mobile.png",
      "https://example.com/checkout-page.png"
    ]
  },
  provider: "vertex",
  model: "claude-sonnet-4@20250514",
  enableAnalytics: true,
  enableEvaluation: true,
  evaluationDomain: "web-design",
  context: {
    analysisType: "ux-review",
    targetAudience: "e-commerce"
  }
});

console.log("UX Analysis:", result.content);
console.log("Quality Score:", result.evaluation?.overall);
console.log("Cost:", `$${result.analytics?.cost || 0}`);
```

#### URL Image Processing with Error Handling

```typescript
// Robust URL image processing with error handling
async function analyzeWebImages(urls: string[], prompt: string) {
  try {
    const result = await neurolink.generate({
      input: {
        text: prompt,
        images: urls
      },
      provider: "vertex",
      model: "claude-sonnet-4@20250514",
      enableAnalytics: true
    });
    
    return {
      success: true,
      analysis: result.content,
      metrics: {
        tokens: result.analytics?.tokens,
        responseTime: result.analytics?.responseTime,
        cost: result.analytics?.cost
      }
    };
  } catch (error) {
    if (error.message.includes('network')) {
      return { success: false, error: 'Network error downloading images' };
    } else if (error.message.includes('format')) {
      return { success: false, error: 'Unsupported image format' };
    } else {
      return { success: false, error: 'Image processing failed' };
    }
  }
}

// Usage
const result = await analyzeWebImages([
  "https://example.com/chart1.png",
  "https://example.com/chart2.png"
], "Compare these data visualizations and explain the trends");

if (result.success) {
  console.log("Analysis:", result.analysis);
  console.log("Metrics:", result.metrics);
} else {
  console.error("Error:", result.error);
}
```

---

## Local Image Processing

### Implementation Overview

Local image processing handles files from the filesystem, supporting various formats and providing efficient Buffer-based processing.

### Supported File Formats

```typescript
// ✅ Supported image formats
const supportedFormats = [
  ".jpg", ".jpeg",  // JPEG images
  ".png",           // PNG images  
  ".gif",           // GIF images
  ".webp",          // WebP images
  ".bmp",           // Bitmap images
  ".tiff", ".tif"   // TIFF images
];
```

### CLI Usage - Local Images

#### Single Local Image

```bash
# Basic local image analysis
pnpm cli generate "What do you see in this image?" \
  --image "./test-image.jpg" \
  --provider vertex \
  --model claude-sonnet-4@20250514

# Document analysis from local file
pnpm cli generate "Extract all text from this document" \
  --image "./document-scan.png" \
  --provider vertex \
  --model claude-sonnet-4@20250514 \
  --enable-analytics \
  --debug

# Photo analysis with detailed description
pnpm cli generate "Describe this photo in detail, including emotions and setting" \
  --image "./family-photo.jpg" \
  --provider vertex \
  --model claude-sonnet-4@20250514 \
  --enable-evaluation
```

#### Multiple Local Images

```bash
# Compare local images
pnpm cli generate "Compare these product photos and recommend which to use for marketing" \
  --image "./product-photo-1.jpg" \
  --image "./product-photo-2.jpg" \
  --image "./product-photo-3.jpg" \
  --provider vertex \
  --model claude-sonnet-4@20250514 \
  --enable-analytics

# Analyze medical images (example)
pnpm cli generate "Analyze these X-ray images for any visible abnormalities" \
  --image "./xray-front.jpg" \
  --image "./xray-side.jpg" \
  --provider vertex \
  --model claude-sonnet-4@20250514 \
  --context '{"domain":"medical","analysisType":"diagnostic"}'
```

#### Mixed Local and URL Images

```bash
# Combine local files with URL images
pnpm cli generate "Compare my local photo with these reference images online" \
  --image "./my-artwork.jpg" \
  --image "https://museum.com/famous-painting.jpg" \
  --image "https://gallery.com/similar-style.jpg" \
  --provider vertex \
  --model claude-sonnet-4@20250514 \
  --enable-analytics \
  --enable-evaluation
```

### SDK Usage - Local Images

#### Basic Local Image Processing

```typescript
import fs from 'fs';
import { neurolink } from './src/lib/neurolink.js';

// Single local image analysis
const imageBuffer = fs.readFileSync('./product-photo.jpg');

const result = await neurolink.generate({
  input: {
    text: "Analyze this product photo for e-commerce listing quality",
    images: [imageBuffer]
  },
  provider: "vertex",
  model: "claude-sonnet-4@20250514",
  enableAnalytics: true
});

console.log("Analysis:", result.content);
console.log("Processing time:", result.analytics?.responseTime);
```

#### Advanced Local Image Processing

```typescript
// Multiple local images with comprehensive analysis
async function analyzeLocalImages(imagePaths: string[], prompt: string) {
  const imageBuffers: Buffer[] = [];
  
  // Load all images
  for (const imagePath of imagePaths) {
    try {
      const buffer = fs.readFileSync(imagePath);
      imageBuffers.push(buffer);
      console.log(`✅ Loaded: ${imagePath} (${buffer.length} bytes)`);
    } catch (error) {
      console.error(`❌ Error loading ${imagePath}:`, error);
      throw new Error(`Failed to load image: ${imagePath}`);
    }
  }
  
  // Process with NeuroLink
  const result = await neurolink.generate({
    input: {
      text: prompt,
      images: imageBuffers
    },
    provider: "vertex",
    model: "claude-sonnet-4@20250514",
    enableAnalytics: true,
    enableEvaluation: true,
    context: {
      imageCount: imageBuffers.length,
      analysisType: "multi-image-comparison"
    }
  });
  
  return {
    analysis: result.content,
    images_processed: imageBuffers.length,
    tokens_used: result.analytics?.tokens,
    quality_score: result.evaluation?.overall,
    processing_time: result.analytics?.responseTime
  };
}

// Usage example
const result = await analyzeLocalImages([
  './before-renovation.jpg',
  './after-renovation.jpg'
], "Compare these before and after renovation photos. What improvements were made?");

console.log("Renovation Analysis:", result.analysis);
console.log("Quality Score:", result.quality_score);
console.log("Images Processed:", result.images_processed);
```

#### Document Analysis Example

```typescript
// Advanced document analysis with local images
async function analyzeDocument(documentImagePath: string) {
  const documentBuffer = fs.readFileSync(documentImagePath);
  
  const result = await neurolink.generate({
    input: {
      text: `Please analyze this document and:
      1. Extract all text content
      2. Identify the document type
      3. Summarize key information
      4. Note any signatures or stamps
      5. Assess document quality`,
      images: [documentBuffer]
    },
    provider: "vertex",
    model: "claude-sonnet-4@20250514",
    enableAnalytics: true,
    enableEvaluation: true,
    evaluationDomain: "document-analysis",
    context: {
      documentType: "unknown",
      extractionLevel: "comprehensive"
    }
  });
  
  return {
    extracted_content: result.content,
    confidence_score: result.evaluation?.accuracy,
    processing_cost: result.analytics?.cost,
    token_usage: result.analytics?.tokens
  };
}

// Usage
const docAnalysis = await analyzeDocument('./contract-scan.pdf');
console.log("Document Content:", docAnalysis.extracted_content);
console.log("Confidence:", docAnalysis.confidence_score);
```

---

## CLI Usage Examples

### Basic Commands

```bash
# Simple image description
pnpm cli generate "Describe this image" --image image.jpg --provider vertex --model claude-sonnet-4@20250514

# Image analysis with analytics
pnpm cli generate "What's in this photo?" --image photo.png --provider vertex --model claude-sonnet-4@20250514 --enable-analytics

# Image processing with evaluation
pnpm cli generate "Analyze this artwork" --image artwork.jpg --provider vertex --model claude-sonnet-4@20250514 --enable-evaluation
```

### Advanced Use Cases

#### Document Processing

```bash
# Extract text from documents
pnpm cli generate "Extract all text from this document and format it clearly" \
  --image "./invoice.pdf" \
  --provider vertex \
  --model claude-sonnet-4@20250514 \
  --context '{"documentType":"invoice","extractionMode":"structured"}' \
  --enable-analytics

# Analyze form fields
pnpm cli generate "Identify all form fields and their values in this document" \
  --image "./application-form.png" \
  --provider vertex \
  --model claude-sonnet-4@20250514
```

#### E-commerce Analysis

```bash
# Product photo quality assessment
pnpm cli generate "Rate this product photo for e-commerce use (1-10) and suggest improvements" \
  --image "./product-main.jpg" \
  --provider vertex \
  --model claude-sonnet-4@20250514 \
  --enable-evaluation

# Compare product variations
pnpm cli generate "Compare these product color variations and recommend the best for online sales" \
  --image "./product-red.jpg" \
  --image "./product-blue.jpg" \
  --image "./product-green.jpg" \
  --provider vertex \
  --model claude-sonnet-4@20250514 \
  --enable-analytics
```

#### Content Creation

```bash
# Generate social media captions
pnpm cli generate "Create engaging Instagram captions for this photo with relevant hashtags" \
  --image "./lifestyle-photo.jpg" \
  --provider vertex \
  --model claude-sonnet-4@20250514 \
  --context '{"platform":"instagram","tone":"casual","audience":"millennials"}'

# Logo analysis and feedback
pnpm cli generate "Analyze this logo design and provide professional feedback on typography, colors, and brand impact" \
  --image "./logo-design.png" \
  --provider vertex \
  --model claude-sonnet-4@20250514 \
  --enable-evaluation
```

### Debug Mode

```bash
# Enable comprehensive debugging
pnpm cli generate "Debug this image processing" \
  --image "./test-image.jpg" \
  --provider vertex \
  --model claude-sonnet-4@20250514 \
  --debug \
  --enable-analytics \
  --enable-evaluation

# Expected debug output:
# ✅ Loaded image: test-image.jpg (1063892 bytes)
# 🖼️ [MULTIMODAL-DETECTION] Final multimodal detection: true
# 🖼️ [CONVERT_TO_VERCEL_FORMAT] textLength: 53, imageCount: 1
# 🖼️ [ADD_IMAGE_TO_CONTENT] mimeType: image/jpeg
# ✅ SUCCESS: Image is being recognized by the LLM!
```

---

## SDK Integration Examples

### Basic Integration

```typescript
import { neurolink } from './src/lib/neurolink.js';
import fs from 'fs';

// Initialize NeuroLink (optional configuration)
const nlConfig = {
  conversationMemory: {
    enabled: true,
    maxSessions: 100,
    maxTurnsPerSession: 50
  }
};

// Basic image analysis
async function analyzeImage(imagePath: string, question: string) {
  const imageBuffer = fs.readFileSync(imagePath);
  
  const result = await neurolink.generate({
    input: {
      text: question,
      images: [imageBuffer]
    },
    provider: "vertex",
    model: "claude-sonnet-4@20250514"
  });
  
  return result.content;
}

// Usage
const analysis = await analyzeImage('./photo.jpg', 'What is the main subject of this image?');
console.log(analysis);
```

### Advanced SDK Patterns

#### Batch Image Processing

```typescript
// Process multiple images in batch
async function batchImageAnalysis(imageConfigs: Array<{path: string, prompt: string}>) {
  const results = [];
  
  for (const config of imageConfigs) {
    try {
      const imageBuffer = fs.readFileSync(config.path);
      
      const result = await neurolink.generate({
        input: {
          text: config.prompt,
          images: [imageBuffer]
        },
        provider: "vertex",
        model: "claude-sonnet-4@20250514",
        enableAnalytics: true
      });
      
      results.push({
        image: config.path,
        prompt: config.prompt,
        analysis: result.content,
        tokens: result.analytics?.tokens,
        success: true
      });
      
    } catch (error) {
      results.push({
        image: config.path,
        prompt: config.prompt,
        error: error.message,
        success: false
      });
    }
  }
  
  return results;
}

// Usage
const batchConfigs = [
  { path: './image1.jpg', prompt: 'Describe the main elements' },
  { path: './image2.png', prompt: 'What colors dominate this image?' },
  { path: './image3.gif', prompt: 'What activity is shown here?' }
];

const batchResults = await batchImageAnalysis(batchConfigs);
console.log('Batch processing complete:', batchResults);
```

#### Streaming with Images

```typescript
// Stream multimodal content for real-time processing
async function streamImageAnalysis(imagePath: string, prompt: string) {
  const imageBuffer = fs.readFileSync(imagePath);
  
  const streamResult = await neurolink.stream({
    input: {
      text: prompt,
      images: [imageBuffer]
    },
    provider: "vertex",
    model: "claude-sonnet-4@20250514",
    enableAnalytics: true
  });
  
  console.log('Streaming analysis...');
  for await (const chunk of streamResult.stream) {
    process.stdout.write(chunk.content);
  }
  
  console.log('\nAnalysis complete!');
  console.log('Tokens used:', streamResult.analytics?.tokens);
}

// Usage
await streamImageAnalysis('./complex-image.jpg', 'Provide a detailed analysis of this image');
```

#### Error Handling Patterns

```typescript
// Comprehensive error handling for image processing
async function robustImageAnalysis(input: {
  text: string;
  images: (string | Buffer)[];
}, options: {
  provider?: string;
  model?: string;
  maxRetries?: number;
}) {
  const maxRetries = options.maxRetries || 3;
  let lastError: Error;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const result = await neurolink.generate({
        input,
        provider: options.provider || "vertex",
        model: options.model || "claude-sonnet-4@20250514",
        enableAnalytics: true,
        enableEvaluation: true
      });
      
      // Validate result quality
      if (result.evaluation && result.evaluation.overall < 6) {
        console.warn(`Low quality result (${result.evaluation.overall}/10) on attempt ${attempt}`);
        if (attempt < maxRetries) continue;
      }
      
      return {
        success: true,
        content: result.content,
        quality: result.evaluation?.overall,
        tokens: result.analytics?.tokens,
        attempt
      };
      
    } catch (error) {
      lastError = error as Error;
      console.error(`Attempt ${attempt} failed:`, error.message);
      
      // Don't retry on certain errors
      if (error.message.includes('invalid image format') || 
          error.message.includes('image too large')) {
        break;
      }
      
      // Wait before retry
      if (attempt < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
      }
    }
  }
  
  return {
    success: false,
    error: lastError.message,
    attempts: maxRetries
  };
}

// Usage with error handling
const result = await robustImageAnalysis({
  text: "Analyze this complex technical diagram",
  images: [fs.readFileSync('./technical-diagram.png')]
}, {
  provider: "vertex",
  model: "claude-sonnet-4@20250514",
  maxRetries: 3
});

if (result.success) {
  console.log('Analysis:', result.content);
  console.log('Quality score:', result.quality);
} else {
  console.error('Analysis failed:', result.error);
}
```

---

## Technical Implementation Details

### Message Format Compliance

The key to success is ensuring Vercel AI SDK compatibility:

```typescript
// ✅ CORRECT FORMAT - What NeuroLink implements
const correctMessage = {
  type: "image",
  image: Buffer | string,
  mimeType: "image/jpeg" // CRITICAL: Required by Vercel AI SDK
};

// ❌ INCORRECT FORMAT - What causes failures
const incorrectMessage = {
  type: "image",
  image: Buffer | string
  // Missing mimeType field causes Zod validation errors
};
```

### Image Processing Pipeline

```typescript
// Complete pipeline implementation
class ImageProcessor {
  // 1. Input validation and format detection
  static processInput(input: string | Buffer): ProcessedImage {
    // Handle URLs, file paths, Buffers, base64 strings
  }
  
  // 2. Provider-specific formatting
  static formatForProvider(image: ProcessedImage, provider: string): any {
    // Create provider-specific message format
  }
  
  // 3. Vercel AI SDK integration
  static createVercelMessage(content: any[]): VercelMessage {
    // Ensure mimeType field is present
  }
}
```

### Vision Model Capabilities

```typescript
// Enhanced model detection for versioned names
const VISION_CAPABILITIES = {
  'vertex': [
    // Gemini models
    'gemini-2.5-pro', 'gemini-2.5-flash',
    // Claude models with versioning support
    'claude-sonnet-4@', 'claude-opus-3@', 'claude-haiku-3@',
    'claude-3-5-sonnet@', 'claude-3-opus@', 'claude-3-sonnet@'
  ]
} as const;

// Smart model validation
function supportsVision(provider: string, model: string): boolean {
  const supportedModels = VISION_CAPABILITIES[provider];
  return supportedModels?.some(pattern => 
    model.toLowerCase().includes(pattern.toLowerCase())
  ) || false;
}
```

### Memory Management

```typescript
// Efficient image handling for large files
class ImageMemoryManager {
  static validateImageSize(data: Buffer | string, maxSize = 10 * 1024 * 1024): boolean {
    const size = typeof data === 'string' 
      ? Buffer.byteLength(data, 'base64') 
      : data.length;
    return size <= maxSize;
  }
  
  static optimizeImageBuffer(buffer: Buffer): Buffer {
    // Implement compression if needed
    return buffer;
  }
}
```

---

## Performance & Best Practices

### Image Size Optimization

```typescript
// Recommended image constraints
const imageConstraints = {
  maxFileSize: 10 * 1024 * 1024, // 10MB
  maxDimensions: { width: 4096, height: 4096 },
  preferredFormats: ['image/jpeg', 'image/png', 'image/webp'],
  compression: {
    jpeg: { quality: 85 },
    png: { compressionLevel: 6 }
  }
};
```

### Batch Processing Guidelines

```bash
# Optimal batch sizes for different use cases
# Small images (< 1MB): 5-10 images per batch
# Medium images (1-5MB): 3-5 images per batch  
# Large images (> 5MB): 1-2 images per batch

# Example optimized batch processing
pnpm cli generate "Analyze these product photos" \
  --image "./product1.jpg" \
  --image "./product2.jpg" \
  --image "./product3.jpg" \
  --provider vertex \
  --model claude-sonnet-4@20250514 \
  --enable-analytics
```

### Cost Optimization

```typescript
// Monitor and optimize costs
async function costOptimizedAnalysis(images: Buffer[], prompt: string) {
  const result = await neurolink.generate({
    input: { text: prompt, images },
    provider: "vertex",
    model: "claude-sonnet-4@20250514", // Cost-effective model
    enableAnalytics: true,
    maxTokens: 1000, // Limit response length
    temperature: 0.1 // Reduce randomness for consistent results
  });
  
  console.log(`Cost: $${result.analytics?.cost || 0}`);
  console.log(`Tokens: ${result.analytics?.tokens?.total || 0}`);
  
  return result;
}
```

### Performance Monitoring

```typescript
// Track performance metrics
interface PerformanceMetrics {
  imageProcessingTime: number;
  apiResponseTime: number;
  totalTokens: number;
  costPerImage: number;
  qualityScore: number;
}

async function monitoredImageAnalysis(imagePath: string, prompt: string): Promise<PerformanceMetrics> {
  const startTime = Date.now();
  const imageBuffer = fs.readFileSync(imagePath);
  const imageProcessingTime = Date.now() - startTime;
  
  const apiStartTime = Date.now();
  const result = await neurolink.generate({
    input: { text: prompt, images: [imageBuffer] },
    provider: "vertex",
    model: "claude-sonnet-4@20250514",
    enableAnalytics: true,
    enableEvaluation: true
  });
  const apiResponseTime = Date.now() - apiStartTime;
  
  return {
    imageProcessingTime,
    apiResponseTime,
    totalTokens: result.analytics?.tokens?.total || 0,
    costPerImage: result.analytics?.cost || 0,
    qualityScore: result.evaluation?.overall || 0
  };
}
```

---

## Troubleshooting & Debugging

### Common Issues and Solutions

#### 1. Vercel AI SDK Schema Errors

**Problem**: `ZodError: Required field 'mimeType' missing`

**Solution**: Ensure mimeType field is included in image messages

```typescript
// ✅ Correct implementation
const imageMessage = {
  type: "image",
  image: imageBuffer,
  mimeType: ImageProcessor.detectImageType(imageBuffer) // Required field
};
```

#### 2. Vision Model Not Recognized

**Problem**: `Provider vertex with model claude-sonnet-4@20250514 does not support vision processing`

**Solution**: Update vision capabilities to include versioned models

```typescript
// Add versioned model patterns
'claude-sonnet-4@', 'claude-opus-3@', 'claude-haiku-3@'
```

#### 3. Image Loading Failures

**Problem**: CLI reports `❌ Image file not found` or `❌ Error loading image`

**Solution**: Verify file paths and permissions

```bash
# Check file existence
ls -la ./test-image.jpg

# Check file permissions
chmod 644 ./test-image.jpg

# Use absolute paths if needed
pnpm cli generate "Describe image" --image "/full/path/to/image.jpg"
```

#### 4. Network Timeout Issues

**Problem**: CLI hangs on "🤖 Generating text..." for extended periods

**Solution**: Network connectivity to Google OAuth2

```bash
# Test connectivity
curl -I https://oauth2.googleapis.com/token

# Use Application Default Credentials
gcloud auth application-default login

# Set timeout environment variable
export GOOGLE_AUTH_TIMEOUT=30000
