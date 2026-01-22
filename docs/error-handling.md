# Error Handling

This document covers error handling strategies in NeuroLink.

## Error Types

### Provider Errors

- Connection failures
- Rate limiting
- Authentication issues

### Configuration Errors

- Invalid settings
- Missing environment variables
- Malformed configuration files

### Runtime Errors

- Tool execution failures
- Memory allocation issues
- Timeout errors

### Video Generation Errors

Video generation via Veo 3.1 on Vertex AI may encounter specific error conditions:

- **VIDEO_GENERATION_FAILED** - Video generation process failed
- **PROVIDER_NOT_CONFIGURED** - Vertex AI credentials not configured
- **VIDEO_POLL_TIMEOUT** - Video generation timed out (exceeds 3 minutes)
- **VIDEO_INVALID_INPUT** - Invalid image format or parameters
- **VIDEO_QUOTA_EXCEEDED** - Vertex AI quota or rate limit exceeded
- **VIDEO_REGION_UNAVAILABLE** - Veo 3.1 not available in specified region

## Error Recovery

### Automatic Retry

NeuroLink includes automatic retry mechanisms for transient failures.

### Fallback Providers

Configure fallback providers to handle primary provider failures.

### Graceful Degradation

System continues to operate with reduced functionality when errors occur.

### Video Generation Error Handling

**Example: Handling video generation errors**

```typescript
import { NeuroLink } from "@juspay/neurolink";
import { readFile, writeFile } from "fs/promises";

const neurolink = new NeuroLink();

try {
  const result = await neurolink.generate({
    input: {
      text: "Product showcase video",
      images: [await readFile("./product.jpg")],
    },
    provider: "vertex",
    model: "veo-3.1",
    output: {
      mode: "video",
      video: {
        resolution: "1080p",
        length: 8,
        aspectRatio: "16:9",
      },
    },
    timeout: 180, // 3 minutes for video generation
  });

  if (result.video) {
    await writeFile("output.mp4", result.video.data);
  }
} catch (error) {
  // Use your logger for production: logger.error('Video generation failed', { code: error.code, error })
  if (error.code === "PROVIDER_NOT_CONFIGURED") {
    console.error(
      "Vertex AI credentials not configured. Set GOOGLE_APPLICATION_CREDENTIALS.",
    );
  } else if (error.code === "VIDEO_POLL_TIMEOUT") {
    console.error(
      "Video generation timed out. Try again or reduce video length.",
    );
  } else if (error.code === "VIDEO_INVALID_INPUT") {
    console.error(
      "Invalid image format. Ensure PNG, JPEG, or WebP under 20MB.",
    );
  } else if (error.code === "VIDEO_QUOTA_EXCEEDED") {
    console.error("Vertex AI quota exceeded. Check your billing and quotas.");
  } else {
    console.error("Video generation failed:", error.message);
  }
}
```

**CLI Error Handling:**

```bash
# Video generation with error handling
npx @juspay/neurolink generate "Product video" \
  --image ./product.jpg \
  --outputMode video \
  --videoOutput ./output.mp4 \
  --timeout 180

# Check exit code for automation
if [ $? -ne 0 ]; then
  echo "Video generation failed"
  exit 1
fi
```

## Monitoring and Logging

### Error Logging

All errors are logged with appropriate severity levels.

### Metrics Collection

Error rates and patterns are tracked for analysis.

### Alerting

Configure alerts for critical error conditions.

## Best Practices

1. Always configure fallback providers
2. Set appropriate timeout values
3. Monitor error rates and patterns
4. Test error scenarios in development
5. Implement proper error boundaries

For more detailed information, see the [Troubleshooting Guide](./reference/troubleshooting.md).
