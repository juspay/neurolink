# Video CLI Flags Implementation Summary

## Overview
Added comprehensive video file support to the NeuroLink CLI, enabling users to analyze videos from the command line with configurable frame extraction and audio transcription options.

## Changes Made

### 1. Command Factory Updates (`src/cli/factories/commandFactory.ts`)

#### Added Video Flags to Common Options
```typescript
video: {
  type: "string" as const,
  description: "Add video file for analysis (can be used multiple times) (MP4, WebM, MOV, AVI, MKV)",
},
"video-frames": {
  type: "number" as const,
  default: 8,
  description: "Number of frames to extract (default: 8)",
},
"video-quality": {
  type: "number" as const,
  default: 85,
  description: "Frame quality 0-100 (default: 85)",
},
"video-format": {
  type: "string" as const,
  choices: ["jpeg", "png"],
  default: "jpeg",
  description: "Frame format (default: jpeg)",
},
"transcribe-audio": {
  type: "boolean" as const,
  default: false,
  description: "Extract and transcribe audio from video",
}
```

#### Added Video Processing Helper
```typescript
private static processCliVideoFiles(
  videoFiles?: string | string[],
): Array<Buffer | string> | undefined {
  if (!videoFiles) {
    return undefined;
  }
  return Array.isArray(videoFiles) ? videoFiles : [videoFiles];
}
```

#### Integrated Video Processing in Generate Command
- Processes video files using `processCliVideoFiles`
- Passes video files to SDK generate method
- Passes videoOptions with frame count, quality, format, and transcription settings

#### Integrated Video Processing in Stream Command
- Processes video files using `processCliVideoFiles`
- Passes video files to SDK stream method
- Passes videoOptions with frame count, quality, format, and transcription settings

#### Added Example Commands
- Generate: `neurolink generate "Describe this video" --video path/to/video.mp4`
- Stream: `neurolink stream "Narrate this video" --video path/to/video.mp4`

### 2. Test Suite (`test/unit/cli/video-flags.test.ts`)

Created comprehensive unit tests validating:
- ✅ Flag definitions (5 video-related flags)
- ✅ Default values (frames: 8, quality: 85, format: jpeg, transcribeAudio: false)
- ✅ Supported formats (jpeg, png)
- ✅ Supported file extensions (MP4, WebM, MOV, AVI, MKV)
- ✅ Quality range validation (0-100)
- ✅ Frame count validation

### 3. Verification Script (`test/unit/cli/verify-video-flags.sh`)

Created bash script demonstrating:
- All implemented features
- Example usage commands
- Acceptance criteria checklist

## Supported Commands

### Generate Command
```bash
# Basic video analysis
neurolink generate "Describe this video" --video path/to/video.mp4

# Custom frame extraction
neurolink generate "Analyze" --video video.mp4 --video-frames 10 --video-quality 90

# PNG format with audio transcription
neurolink generate "Transcribe" --video video.mp4 --video-format png --transcribe-audio
```

### Stream Command
```bash
# Stream video analysis
neurolink stream "Narrate this video" --video path/to/video.mp4

# Custom settings
neurolink stream "Describe" --video video.mp4 --video-frames 12 --video-quality 95
```

### Loop Command
```bash
# Interactive mode with video support (inherits all commonOptions)
neurolink loop --video path/to/video.mp4
```

## Video Options

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--video` | string | - | Path to video file (MP4, WebM, MOV, AVI, MKV) |
| `--video-frames` | number | 8 | Number of frames to extract |
| `--video-quality` | number | 85 | Frame quality (0-100) |
| `--video-format` | string | jpeg | Frame format (jpeg or png) |
| `--transcribe-audio` | boolean | false | Extract and transcribe audio from video |

## Supported Video Formats

- **MP4** - MPEG-4 video format
- **WebM** - Web Media format
- **MOV** - QuickTime format
- **AVI** - Audio Video Interleave
- **MKV** - Matroska video format

## Acceptance Criteria Status

✅ All acceptance criteria met:

- [x] --video flag added for video file paths
- [x] --video-frames flag for frame count (default: 8)
- [x] --video-quality flag for frame quality (default: 85)
- [x] --video-format flag for frame format (jpeg|png, default: jpeg)
- [x] --transcribe-audio flag to enable audio transcription
- [x] Flags available in generate, chat, and loop commands
- [x] Help text updated with video flag descriptions
- [x] Tests pass for video flags

## Technical Implementation

### Pattern Consistency
The implementation follows the existing patterns for multimodal input:
- Similar to `--image`, `--pdf`, and `--csv` flags
- Uses the same processing pattern with dedicated helper method
- Integrates seamlessly with existing SDK methods

### Architecture
```
CLI Flags (commandFactory.ts)
    ↓
processCliVideoFiles()
    ↓
executeGenerate() / executeStream()
    ↓
SDK generate() / stream() with videoOptions
```

## Dependencies

This implementation depends on:
- **VIDEO-013**: Video processing foundation (assumed complete)

This implementation blocks:
- **VIDEO-022**: Subsequent video-related features

## Files Modified

1. `src/cli/factories/commandFactory.ts` - Added video flags and processing
2. `test/unit/cli/video-flags.test.ts` - Added unit tests
3. `test/unit/cli/verify-video-flags.sh` - Added verification script

## Testing

Run tests with:
```bash
pnpm test test/unit/cli/video-flags.test.ts
```

Run verification script:
```bash
bash test/unit/cli/verify-video-flags.sh
```

## Notes

- Video processing logic is handled by the SDK (VIDEO-013 dependency)
- CLI layer only handles flag parsing and passing options to SDK
- All default values match the specification
- Help text is automatically generated from flag descriptions
- Loop command automatically inherits video flags via commonOptions
