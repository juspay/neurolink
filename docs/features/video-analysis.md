# Video Analysis

Comprehensive video analysis for NeuroLink, powered by Gemini 2.0 Flash. This feature goes beyond basic visual description—it provides a deep logical audit of video sequences to understand "why" and "how" events occur.

## Key Capabilities

- **Logical Analysis**: Dissect any video to extract the underlying intent, cause-and-effect, and logical progression.
- **Action-Reaction Chain**: A step-by-step audit of user or system actions and their immediate visual results.
- **Evidence-Based Reporting**: Detailed reasoning backed by structured visual indicators (colors, labels, text) in JSON format.
- **Strategic Verdicts**: High-level assessments of whether a workflow succeeded or failed logically.

---

## How It Works

1. **Frame Extraction**: The system uses `ffmpeg` to extract high-quality keyframes from the video at calculated intervals.
2. **Analysis Pipeline**: These frames are sent to Gemini 2.0 Flash with a specialized system instruction focused on critical logic auditing.
3. **Unified Results**: The resulting report is added directly to your standard generation output.

---

## Usage

### CLI Usage

Analyze any video file with a natural language prompt.

```bash
# Basic video analysis
neurolink generate "Analyze the login workflow in this video" \
  --file ./recordings/screen-capture.mp4 \
  --provider vertex \
  --model gemini-2.0-flash
```

### SDK Usage

Integrate video analysis into your TypeScript/JavaScript projects.

```typescript
import { NeuroLink } from "@juspay/neurolink";

const neurolink = new NeuroLink();

const result = await neurolink.generate({
  input: {
    text: "Dissect the logical progression of this activity",
    files: ["./examples/tutorial.mp4"],
  },
  provider: "vertex",
  model: "gemini-2.0-flash",
});

console.log(result.content);
```

#### Advanced SDK Examples

**Custom Model Configuration**
Fine-tune the analysis by adjusting token limits and temperature.

```typescript
const result = await neurolink.generate({
  input: {
    text: "Perform a detailed audit of the checkout workflow",
    files: ["payment-flow.mov"],
  },
  model: "gemini-2.0-flash",
  maxTokens: 3000,
  temperature: 0.2, // Lower temperature for more consistent logic auditing
  provider: "vertex",
});
```

**Disabling Tool Interference**
By default, the model might try to use available tools. For pure video analysis, you can disable them.

```typescript
const result = await neurolink.generate({
  input: {
    text: "Analyze the video timeline",
    files: ["video.mp4"],
  },
  disableTools: true,
});
```

---

## Examples

### 1. UI/UX Bug Analysis

Identify why a user is unable to complete a form or where the interface is misleading.

**Prompt**: "Find why the user is getting stuck at the payment step. Look for validation errors or hidden UI elements."

### 2. Silent Failure Detection

Detect cases where an action is taken but the system provides no feedback (no loaders, no success messages).

**Prompt**: "Audit the 'Submit' button click. Is there a visual 'bond' between the click and the next state? Report any lag or missing loading indicators."

### 3. Workflow Validation

Verify if a complex multi-step process follows the intended business logic.

**Prompt**: "Trace the logical progression from 'Item Selection' to 'Checkout'. Does every state change correspond to a user action?"

### 4. Comparison Analysis

Compare two recordings to find discrepancies in behavior.

**Prompt**: "Compare these two clips. The first one is the expected behavior and the second one has a bug. Identify the exact frame or timestamp where the logic deviates."

---

## Command Gallery

Quick CLI recipes for common tasks:

```bash
# Debugging with full technical detail
neurolink generate "Audit this video" --file bug.mp4 --debug

# Using a specifically tuned model
neurolink generate "Analyze logic" --file demo.mov --model gemini-2.0-flash

# Forcing a specific provider
neurolink generate "Extract patterns" --file test.mp4 --provider vertex
```

---

## The Analysis Report

The output is structured into four major sections designed to give you a complete understanding of the video:

1. **Strategic Overview & Intent**: Defines the core activity, expected logic, and provides a primary verdict.
2. **The Action-Reaction Chain**: A granular, step-by-step audit of attempts, results, and technical inferences.
3. **Critical Findings**: Categorized milestones or anomalies with root cause analysis and visual evidence in JSON.
4. **Final Assessment**: A conclusive summary of the logical flow based on the observed evidence.

---

## Best Practices

- **Frame Depth**: Short videos (under 10s) get high-density frame coverage (1 per second), while long ones are intelligently sampled.
- **Prompt Precision**: While the model is a "Critical Logic Auditor," you can guide it with specific questions about the activity.
- **Format**: The analysis is returned as text in `result.content`, making it easy to store, display, or pipe to other tools.
