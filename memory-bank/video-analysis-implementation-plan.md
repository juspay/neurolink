# NeuroLink Video Analysis - Intent-Based Design

**Automatic Video Analysis with AI Intent Parsing**

---

## Table of Contents

1. [Problem Statement & Solution](#problem-statement--solution)
2. [Architecture Overview](#architecture-overview)
3. [Core Components](#core-components)
4. [SDK Integration](#sdk-integration)
5. [CLI Integration](#cli-integration)
6. [Output Model](#output-model)
7. [Configuration](#configuration)
8. [Error Handling](#error-handling)
9. [Extensibility Roadmap](#extensibility-roadmap)

---

## Problem Statement & Solution

### The Challenge

Modern applications need to extract insights from video content - transcripts, visible text, objects, faces, and scene changes. However, traditional approaches require:
- Complex API configurations with explicit feature selection
- Multiple API calls for different analysis types
- Manual intent interpretation from user requests
- Provider-specific implementation patterns

### Our Solution

Video Analysis is **fully automatic** - no configuration needed. When a user provides a video file, NeuroLink:

1. **Detects** video input exists
2. **Parses** user's text with Gemini to understand what analysis they want
3. **Executes** Google Cloud Video Intelligence API with detected features
4. **Returns** AI-generated response + raw analysis data

### Key Benefits

- **Zero Configuration**: No explicit feature flags or mode selection
- **AI-Powered Intent**: Gemini Flash parses natural language to understand what users want
- **Intelligent Defaults**: Falls back to sensible defaults (speech + labels) when intent is unclear
- **Automatic Routing**: BaseProvider detects video input and handles everything seamlessly
- **Provider Agnostic**: Built on Google Cloud Video Intelligence with extensibility for other providers

---

## Architecture Overview

### System Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│  User Input                                                 │
│  text: "Transcribe the speech and find all objects"         │
│  files: ["video.mp4"]                                       │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│  BaseProvider.generate()                                    │
│  • Detects video files in input                             │
│  • Routes to handleVideoAnalysis()                          │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│  VideoIntentParser (Gemini Flash)                           │
│  • Uses default system prompt                               │
│  • Parses user text → Extract features                      │
│  • Returns: { features: ["speech", "objects"] }             │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
                   Features found?
                    /           \
                YES/             \NO
                  ↓               ↓
         Use detected      Use defaults:
         features          ["speech", "labels"]
                  \             /
                   \           /
                    ↓         ↓
┌─────────────────────────────────────────────────────────────┐
│  GoogleVideoAnalysisHandler                                 │
│  • Calls Video Intelligence API with features               │
│  • Polls long-running operation                             │
│  • Returns: VideoAnalysisResult                             │
└────────────────────────┬────────────────────────────────────┘
                         │
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│  GeneratedResult                                            │
│  content: "Here's what I found in the video..."             │
│  videoAnalysis: VideoAnalysisResult                         │
└─────────────────────────────────────────────────────────────┘
```

---

## Core Components

### 1. Supported Video Analysis Features

**Available analysis capabilities:**

1. **Speech Transcription** (`speech`)
   - Audio → text conversion
   - Word-level timestamps
   - Confidence scores
   - Multi-language support

2. **Text Detection / OCR** (`ocr`)
   - Read text visible in video frames
   - Signs, captions, documents
   - Bounding box coordinates
   - Temporal positioning

3. **Label Detection** (`labels`)
   - Visual labels and categories
   - Object identification
   - Scene understanding
   - Confidence-based filtering

4. **Object Tracking** (`objects`)
   - Track specific objects over time
   - Frame-by-frame bounding boxes
   - Temporal object persistence
   - Movement patterns

5. **Shot Detection** (`shots`)
   - Scene and shot boundary detection
   - Identify when scenes change
   - Temporal segmentation
   - Video structure analysis

6. **Explicit Content Detection** (`explicit`)
   - Content moderation
   - Likelihood ratings
   - Temporal segments
   - Safety filtering

7. **Face Detection** (`faces`)
   - Face detection and tracking
   - Attribute detection (glasses, headwear)
   - Multi-face tracking
   - Frame-level positions

**Note:** Google Cloud Video Intelligence also supports `PERSON_DETECTION` and `LOGO_RECOGNITION` features which can be added in future iterations.

### 2. Feature Mapping to Google Cloud API

| NeuroLink Feature | Google Video Intelligence Feature |
|------------------|-----------------------------------|
| `speech`         | `SPEECH_TRANSCRIPTION`            |
| `ocr`            | `TEXT_DETECTION`                  |
| `labels`         | `LABEL_DETECTION`                 |
| `objects`        | `OBJECT_TRACKING`                 |
| `shots`          | `SHOT_CHANGE_DETECTION`           |
| `explicit`       | `EXPLICIT_CONTENT_DETECTION`      |
| `faces`          | `FACE_DETECTION`                  |

### 3. Intent Parsing System

#### Default System Prompt

```typescript
const VIDEO_INTENT_SYSTEM_PROMPT = `You are a video analysis intent parser. Analyze the user's request and determine which video analysis features are needed.

Available features:
- speech: Speech-to-text transcription
- ocr: Text detection in video frames (read signs, captions, documents)
- labels: Visual labels and object detection (identify what's in the video)
- objects: Detailed object tracking (track specific objects over time)
- shots: Scene and shot boundary detection (find when scenes change)
- explicit: Explicit content moderation
- faces: Face detection and tracking

Respond ONLY with a JSON object in this exact format:
{
  "features": ["feature1", "feature2"],
  "language": "en-US"  // optional, only if user specifies language
}

Examples:

User: "Transcribe all the speech from this meeting"
Response: {"features": ["speech"]}

User: "Find all text visible in the video and detect faces"
Response: {"features": ["ocr", "faces"]}

User: "What objects appear and when do scenes change?"
Response: {"features": ["objects", "shots"]}

User: "Analyze this video"
Response: {"features": []}  // Return empty array if unclear - defaults will be used

User: "Transcribe this Spanish video"
Response: {"features": ["speech"], "language": "es-ES"}

Now analyze this user request:`;
```

#### Intent Parser Implementation

```typescript
/**
 * Parse user intent to extract video analysis features
 * 
 * @param userText - User's natural language request
 * @returns Parsed features or null if parsing fails
 */
async function parseVideoIntent(
  userText: string | undefined
): Promise<{ features: string[]; language?: string } | null> {
  // Handle edge case: no text provided
  if (!userText || userText.trim() === '') {
    logger.warn("No text provided for video analysis, using default features: speech, labels");
    return { features: ['speech', 'labels'] };
  }

  try {
    // Use Gemini Flash for fast, cheap intent parsing
    const response = await generateText({
      model: "gemini-2.0-flash-exp",
      prompt: userText,
      systemPrompt: VIDEO_INTENT_SYSTEM_PROMPT,
      temperature: 0.1, // Low temperature for consistent parsing
      maxTokens: 100,
    });

    // Parse JSON response
    const parsed = JSON.parse(response.content);
    
    // Validate features
    const validFeatures = ["speech", "ocr", "labels", "objects", "shots", "explicit", "faces"];
    const features = parsed.features?.filter((f: string) => 
      validFeatures.includes(f)
    ) || [];

    return {
      features,
      language: parsed.language,
    };
  } catch (error) {
    logger.warn("Failed to parse video intent, using defaults", { error });
    return null; // Will trigger default features
  }
}
```

### 4. Default Features Strategy

```typescript
/**
 * Default features when intent is unclear
 * 
 * Chosen based on most common use cases:
 * - speech: Most videos have audio/speech
 * - labels: General visual understanding
 */
const DEFAULT_VIDEO_FEATURES = ["speech", "labels"];

/**
 * Get features for video analysis
 * 
 * Priority:
 * 1. Parsed from user intent (if detected)
 * 2. Default features (if parsing fails or unclear)
 */
function getVideoFeatures(
  parsedIntent: { features: string[] } | null
): string[] {
  if (parsedIntent && parsedIntent.features.length > 0) {
    return parsedIntent.features;
  }
  
  logger.info("Using default video features", {
    defaults: DEFAULT_VIDEO_FEATURES,
    reason: parsedIntent ? "No features detected in text" : "Intent parsing failed"
  });
  
  return DEFAULT_VIDEO_FEATURES;
}
```

### VideoAnalysisResult (in `src/lib/types` directory)

```typescript
/**
 * Video Analysis result
 * Returned automatically when video files are provided
 */
export type VideoAnalysisResult = {
  /** Analysis metadata */
  metadata: {
    duration: number;
    provider: "google";
    processingTime: number;
    operationId?: string;
    featuresUsed: string[]; // Which features were executed
    intentParsed: boolean;  // Whether features came from intent or defaults
  };

  /** Speech transcription (if "speech" feature used) */
  speech?: {
    transcript: string;
    confidence: number;
    language: string;
    words?: Array<{
      word: string;
      startTime: number;
      endTime: number;
      confidence: number;
    }>;
  };

  /** Text detection / OCR (if "ocr" feature used) */
  ocr?: Array<{
    text: string;
    startTime: number;
    endTime: number;
    boundingBox?: Array<{ x: number; y: number }>;
    confidence: number;
  }>;

  /** Label detection (if "labels" feature used) */
  labels?: Array<{
    label: string;
    confidence: number;
    startTime?: number;
    endTime?: number;
    category?: string;
  }>;

  /** Object tracking (if "objects" feature used) */
  objects?: Array<{
    object: string;
    confidence: number;
    frames: Array<{
      time: number;
      boundingBox: Array<{ x: number; y: number }>;
    }>;
  }>;

  /** Shot detection (if "shots" feature used) */
  shots?: Array<{
    startTime: number;
    endTime: number;
  }>;

  /** Explicit content detection (if "explicit" feature used) */
  explicit?: Array<{
    likelihood: "VERY_UNLIKELY" | "UNLIKELY" | "POSSIBLE" | "LIKELY" | "VERY_LIKELY";
    startTime: number;
    endTime: number;
  }>;

  /** Face detection (if "faces" feature used) */
  faces?: Array<{
    trackId: number;
    frames: Array<{
      time: number;
      boundingBox: Array<{ x: number; y: number }>;
      attributes?: {
        headwear?: boolean;
        glasses?: boolean;
      };
    }>;
  }>;
};
```

### GenerateResult Extension

```typescript
// In generateTypes.ts, add to GenerateResult

export type GenerateResult = {
  // ... existing fields
  content: string;
  audio?: TTSResult;
  video?: VideoGenerationResult;
  ppt?: PPTGenerationResult;
  
  /**
   * Video Analysis result
   * 
   * Automatically populated when video files are provided in input.
   * Contains analysis data from Google Cloud Video Intelligence API.
   * 
   * @example
   * ```typescript
   * const result = await neurolink.generate({
   *   input: {
   *     text: "Transcribe this video",
   *     files: ["meeting.mp4"]
   *   }
   * });
   * 
   * console.log(result.videoAnalysis?.speech?.transcript);
   * ```
   */
  videoAnalysis?: VideoAnalysisResult;
};
```

### 6. Implementation Files

#### File 1: `src/lib/adapters/video/videoIntentParser.ts` (NEW)

```typescript
/**
 * Video Intent Parser
 * 
 * Parses user's natural language text to extract video analysis intent
 * Uses Gemini Flash for fast, cheap inference
 */

import { generateText } from "ai";
import { logger } from "../../utils/logger.js";

const VIDEO_INTENT_SYSTEM_PROMPT = `You are a video analysis intent parser...`;
// [Full prompt shown above]

export interface VideoIntent {
  features: string[];
  language?: string;
}

export const DEFAULT_VIDEO_FEATURES = ["speech", "labels"];

/**
 * Parse video analysis intent from user text
 */
export async function parseVideoIntent(
  userText: string,
  geminiModel: any // Gemini Flash model instance
): Promise<VideoIntent | null> {
  // [Implementation shown above]
}

/**
 * Get features for video analysis
 */
export function getVideoFeatures(
  parsedIntent: VideoIntent | null
): string[] {
  // [Implementation shown above]
}
```

#### File 2: `src/lib/adapters/video/googleVideoAnalysisHandler.ts` (NEW)

```typescript
/**
 * Google Cloud Video Analysis Handler
 * 
 * Core handler for video analysis via Google Cloud Video Intelligence API
 * Follows vertexVideoHandler.ts pattern
 */

import { ErrorCategory, ErrorSeverity } from "../../constants/enums.js";
import type { VideoAnalysisResult } from "../../types/multimodal.js";
import { NeuroLinkError } from "../../utils/errorHandling.js";
import { logger } from "../../utils/logger.js";

// Error codes
export const VIDEO_ANALYSIS_ERROR_CODES = {
  ANALYSIS_FAILED: "VIDEO_ANALYSIS_ANALYSIS_FAILED",
  PROVIDER_NOT_CONFIGURED: "VIDEO_ANALYSIS_PROVIDER_NOT_CONFIGURED",
  POLL_TIMEOUT: "VIDEO_ANALYSIS_POLL_TIMEOUT",
  INVALID_INPUT: "VIDEO_ANALYSIS_INVALID_INPUT",
  GCS_UPLOAD_FAILED: "VIDEO_ANALYSIS_GCS_UPLOAD_FAILED",
} as const;

export class VideoAnalysisError extends NeuroLinkError {
  constructor(options: {
    code: string;
    message: string;
    category?: ErrorCategory;
    severity?: ErrorSeverity;
    retriable?: boolean;
    context?: Record<string, unknown>;
    originalError?: Error;
  }) {
    super({
      code: options.code,
      message: options.message,
      category: options.category ?? ErrorCategory.EXECUTION,
      severity: options.severity ?? ErrorSeverity.HIGH,
      retriable: options.retriable ?? false,
      context: options.context,
      originalError: options.originalError,
    });
    this.name = "VideoAnalysisError";
  }
}

/**
 * Check if Video Analysis is configured
 */
export function isVideoAnalysisConfigured(): boolean {
  return !!(
    process.env.GOOGLE_APPLICATION_CREDENTIALS ||
    process.env.GOOGLE_SERVICE_ACCOUNT_KEY ||
    (process.env.GOOGLE_AUTH_CLIENT_EMAIL && process.env.GOOGLE_AUTH_PRIVATE_KEY)
  );
}

/**
 * Analyze video using Google Cloud Video Intelligence API
 * 
 * @param video - Video buffer or GCS URI
 * @param features - Array of features to analyze
 * @param language - Language for speech transcription (optional)
 * @returns VideoAnalysisResult
 */
export async function analyzeVideoWithGoogle(
  video: Buffer | string,
  features: string[],
  language?: string
): Promise<VideoAnalysisResult> {
  const startTime = Date.now();
  
  // Validate configuration
  if (!isVideoAnalysisConfigured()) {
    throw new VideoAnalysisError({
      code: VIDEO_ANALYSIS_ERROR_CODES.PROVIDER_NOT_CONFIGURED,
      message: "Google Cloud credentials not configured for Video Analysis",
      category: ErrorCategory.CONFIGURATION,
      severity: ErrorSeverity.HIGH,
      retriable: false,
    });
  }

  // Get GCP project config
  const config = await getGCPConfig();
  

  // Handle local file vs GCS URI
  let request;
  if (Buffer.isBuffer(video)) {
    // Always send as base64 bytes (inputContent)
    request = buildVideoIntelligenceRequest({
      inputContent: video.toString('base64')
    }, features, language);
  } else {
    // If already a GCS URI, use as-is
    request = buildVideoIntelligenceRequest(video, features, language);
  }

  // Submit analysis request
  const operation = await submitVideoAnalysis(request, config);
  
  // Poll for completion
  const result = await pollVideoAnalysisOperation(operation.name, config);
  
  // Normalize to NeuroLink format
  return normalizeVideoAnalysisResult(result, features, Date.now() - startTime);
}

// Helper functions follow vertexVideoHandler pattern...
```

#### File 3: `src/lib/core/baseProvider.ts` (MODIFY)

Add video intelligence detection and routing:

```typescript
// In generate() method, after TTS handling and before return

async generate(
  optionsOrPrompt: TextGenerationOptions | string,
  analysisSchema?: ValidationSchema,
): Promise<EnhancedGenerateResult | null> {
  // ... existing code ...
  
  // ===== VIDEO ANALYSIS: Automatic analysis when video files provided =====
  if (options.input?.files && options.input.files.length > 0) {
    try {
      // Parse intent from user text
      const userText = options.input?.text || options.prompt || "";
      const intent = await this.parseVideoIntent(userText);
      
      // Get features (from intent or defaults)
      const features = this.getVideoFeatures(intent);
      
      // Analyze video
      const videoBuffer = await this.loadVideoBuffer(options.input.files[0]);
      const videoAnalysis = await this.analyzeVideo(videoBuffer, features, intent?.language);
      
      // Add to enhanced result
      enhancedResult = {
        ...enhancedResult,
        videoAnalysis: videoAnalysis,
      };
      
      logger.info("Video analysis completed", {
        features: videoAnalysis.metadata.featuresUsed,
        intentParsed: videoAnalysis.metadata.intentParsed,
      });
    } catch (error) {
      // Log error but don't fail the entire request
      logger.error("Video analysis failed:", error);
      // enhancedResult remains unchanged (no videoAnalysis field)
    }
  }

  return await this.enhanceResult(enhancedResult, options, startTime);
}

/**
 * Parse video analysis intent from user text
 */
private async parseVideoIntent(userText: string): Promise<VideoIntent | null> {
  const { parseVideoIntent } = await import("../adapters/video/videoIntentParser.js");
  
  // Use Gemini Flash for intent parsing
  const geminiModel = await this.getGeminiFlashModel();
  return await parseVideoIntent(userText, geminiModel);
}

/**
 * Get video features (from intent or defaults)
 */
private getVideoFeatures(intent: VideoIntent | null): string[] {
  const { getVideoFeatures, DEFAULT_VIDEO_FEATURES } = 
    await import("../adapters/video/videoIntentParser.js");
  return getVideoFeatures(intent);
}

/**
 * Analyze video using Google Video Intelligence
 */
private async analyzeVideo(
  video: Buffer,
  features: string[],
  language?: string
): Promise<VideoAnalysisResult> {
  const { analyzeVideoWithGoogle } = 
    await import("../adapters/video/googleVideoAnalysisHandler.js");
  return await analyzeVideoWithGoogle(video, features, language);
}
```

---

## SDK Integration

### Usage Examples

#### Example 1: Speech Transcription

```typescript
import { NeuroLink } from "@juspay/neurolink";

const neurolink = new NeuroLink();

const result = await neurolink.generate({
  input: {
    text: "Transcribe all the speech from this meeting video",
    files: ["./meeting.mp4"]
  }
});

console.log(result.content); // AI-generated summary
console.log(result.videoAnalysis?.speech?.transcript); // Raw transcript
```

#### Example 2: Multiple Features

```typescript
const result = await neurolink.generate({
  input: {
    text: "Find all text visible in the video and detect what objects appear",
    files: ["./presentation.mp4"]
  }
});

console.log(result.videoAnalysis?.ocr); // Text detection results
console.log(result.videoAnalysis?.objects); // Object tracking results
```

#### Example 3: Generic Analysis (Uses Defaults)

```typescript
const result = await neurolink.generate({
  input: {
    text: "What's in this video?",
    files: ["./video.mp4"]
  }
});

// No specific features detected → Uses defaults: [speech, labels]
console.log(result.videoAnalysis?.speech); // Speech transcription
console.log(result.videoAnalysis?.labels); // Visual labels
```

#### Example 4: Language Specification

```typescript
const result = await neurolink.generate({
  input: {
    text: "Transcribe this Spanish video",
    files: ["./spanish-video.mp4"]
  }
});

// Detects: speech + Spanish → uses speech with es-ES language
console.log(result.videoAnalysis?.speech?.language); // "es-ES"
```

#### Example 5: GCS URI Input

```typescript
const result = await neurolink.generate({
  input: {
    text: "Analyze this stored video",
    files: ["gs://my-bucket/archived-video.mp4"]
  }
});

// Works with GCS URIs directly (no upload needed)
```

#### Example 6: Streaming Video Analysis

```typescript
// Stream video analysis results as they become available
const stream = await neurolink.stream({
  input: {
    text: "Analyze this video and tell me what you find",
    files: ["./video.mp4"]
  }
});

for await (const chunk of stream) {
  // AI-generated content streams first
  if (chunk.content) {
    process.stdout.write(chunk.content);
  }
  
  // Video analysis results available at the end
  if (chunk.videoAnalysis) {
    console.log("\n\nVideo Analysis Complete:");
    console.log(chunk.videoAnalysis);
  }
}
```

---

## CLI Integration

### CLI Usage (Automatic)

```bash
# Simple transcription
npx @juspay/neurolink generate \
  "Transcribe all speech from this meeting" \
  --video ./meeting.mp4

# Multiple features  
npx @juspay/neurolink generate \
  "Find all text and detect faces" \
  --video ./presentation.mp4 \
  -o analysis.json

# Generic analysis (uses defaults)
npx @juspay/neurolink generate \
  "What's in this video?" \
  --video ./video.mp4
```

### CLI Arguments (Simplified)

Only need:
- `--video <path>` - Video file path or GCS URI

Everything else is automatic based on the text prompt!

---

## Output Model

### JSON Response Structure

```typescript
{
  metadata: {
    duration: 120.5,              // seconds
    analysisTime: 45.2,           // seconds
    featuresUsed: ["speech", "labels"],
    intentParsed: true,
    language: "en-US"
  },
  speech: {
    transcription: "Hello, this is a video...",
    alternatives: [
      {
        confidence: 0.95,
        transcript: "Hello, this is a video...",
        words: [
          {
            word: "Hello",
            startTime: "0.5s",
            endTime: "0.8s",
            confidence: 0.98
          }
        ]
      }
    ],
    languageCode: "en-US"
  },
  labels: [
    {
      label: "outdoor scene",
      confidence: 0.92,
      segments: [
        {
          segment: {
            startTime: "0.0s",
            endTime: "15.5s"
          },
          confidence: 0.92
        }
      ]
    }
  ],
  objects: [
    {
      name: "car",
      confidence: 0.88,
      frames: [
        {
          timeOffset: "1.2s",
          box: { left: 0.1, top: 0.2, right: 0.5, bottom: 0.6 }
        }
      ]
    }
  ],
  shots: [
    {
      startTime: "0.0s",
      endTime: "5.3s"
    }
  ],
  explicit: {
    frames: [
      {
        timeOffset: "2.5s",
        pornographyLikelihood: "VERY_UNLIKELY"
      }
    ]
  }
}
```

### Text Format (CLI Output)

```
Video Analysis Results
Duration: 2:00.5 | Analysis Time: 45.2s | Features: speech, labels

📝 SPEECH TRANSCRIPTION
Language: en-US
Confidence: 95%

"Hello, this is a video about outdoor adventures. 
We're exploring the mountains today..."

🏷️ LABELS DETECTED
- outdoor scene (92%) [0.0s - 15.5s]
- mountain (87%) [5.2s - 45.0s]
- hiking trail (83%) [10.0s - 30.0s]

🎯 OBJECTS TRACKED
- car (88%) - Detected in 15 frames
- person (92%) - Detected in 45 frames
- backpack (78%) - Detected in 30 frames

🎬 SHOT DETECTION
- Shot 1: 0.0s - 5.3s
- Shot 2: 5.3s - 12.8s
- Shot 3: 12.8s - 25.1s
```

---

## Configuration

### Google Cloud Setup

#### Prerequisites

Enable the Video Intelligence API:

```bash
gcloud services enable videointelligence.googleapis.com
```

#### Authentication Methods

**Method 1: Service Account Key (Recommended for Development)**
```bash
export GOOGLE_APPLICATION_CREDENTIALS="/path/to/service-account-key.json"
```

**Method 2: Application Default Credentials (ADC)**
```bash
gcloud auth application-default login
```

**Method 3: Environment-based (For GCP-hosted environments)**

When running in Google Cloud–managed environments (such as Vertex AI, Google Kubernetes Engine, or Compute Engine), authentication is handled automatically using the runtime's default service account.

#### Required Permissions

The service account needs:
- `roles/videointelligence.user` - To use Video Intelligence API
- `roles/storage.objectCreator` - To upload videos to GCS (for local files)
- `roles/storage.objectViewer` - To read videos from GCS

#### GCS Requirements

- Videos larger than 10MB must be uploaded to Google Cloud Storage
- Bucket must be in the same project or accessible to the service account
- Videos can remain private (no public access required)

### Supported Video Formats

**Formats:**
- MP4 (`.mp4`, `.mpeg4`)
- MOV (`.mov`)
- AVI (`.avi`)

**Codecs:**
- H.264, H.265
- VP8, VP9
- MPEG-4

**Limitations:**
- Maximum file size: ~10MB for inline/base64 content; up to ~5GB for GCS URIs
- Recommended maximum duration: 2 hours (longer videos supported but increase processing time)
- Minimum recommended resolution: 360p or higher for best accuracy
- Note: Higher resolutions and longer videos increase processing time and costs

---

## Error Handling

Video Analysis errors integrate with **NeuroLink's standard error system**.

### Common Error Codes

| Code | Description | Retriable |
|------|-------------|-----------|
| `VIDEO_ANALYSIS_INVALID_INPUT` | Unsupported format or corrupt video | No |
| `VIDEO_ANALYSIS_ANALYSIS_FAILED` | Provider execution failure | Yes |
| `VIDEO_ANALYSIS_POLL_TIMEOUT` | Long-running operation timeout | Yes |
| `VIDEO_ANALYSIS_PROVIDER_NOT_CONFIGURED` | Missing credentials or permissions | No |
| `VIDEO_ANALYSIS_GCS_UPLOAD_FAILED` | Failed to upload video to GCS | Yes |

### Error Categories

- **CONFIGURATION**: Missing credentials, API not enabled
- **VALIDATION**: Invalid video format, unsupported codec
- **EXECUTION**: API failures, timeout issues
- **RESOURCE**: Quota exceeded, bucket access issues

### Error Handling Strategy

```typescript
try {
  const result = await neurolink.generate({
    input: {
      text: "Analyze this video",
      files: ["video.mp4"]
    }
  });
} catch (error) {
  if (error.code === 'VIDEO_ANALYSIS_PROVIDER_NOT_CONFIGURED') {
    console.error("Please set GOOGLE_APPLICATION_CREDENTIALS");
  } else if (error.retriable) {
    // Retry logic for transient failures
    console.error("Transient error, retrying...");
  } else {
    console.error("Permanent error:", error.message);
  }
}
```

---

## Extensibility Roadmap

### Future Enhancements

1. **Additional Providers**
   - AWS Rekognition Video
   - Azure Video Analyzer
   - Custom models via Vertex AI

2. **Advanced Features**
   - Person detection with celebrity recognition
   - Logo detection and brand safety
   - Custom label training
   - Multi-speaker diarization

3. **Performance Optimizations**
   - Parallel feature processing
   - Caching for repeated analysis
   - Progressive result streaming
   - Stream video analysis results as they become available

4. **Developer Experience**
   - Visual result viewer in CLI
   - Video annotation export
   - Timeline visualization
   - Analysis comparison tools

---




