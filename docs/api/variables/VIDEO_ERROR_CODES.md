[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / VIDEO_ERROR_CODES

# Variable: VIDEO_ERROR_CODES

> `const` **VIDEO_ERROR_CODES**: `object`

Defined in: [constants/videoErrors.ts:17](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/constants/videoErrors.ts#L17)

## Type Declaration

### GENERATION_FAILED

> `readonly` **GENERATION_FAILED**: `"VIDEO_GENERATION_FAILED"` = `"VIDEO_GENERATION_FAILED"`

Video generation API call failed

### PROVIDER_NOT_CONFIGURED

> `readonly` **PROVIDER_NOT_CONFIGURED**: `"VIDEO_PROVIDER_NOT_CONFIGURED"` = `"VIDEO_PROVIDER_NOT_CONFIGURED"`

Provider (Vertex AI) not properly configured

### PROVIDER_NOT_SUPPORTED

> `readonly` **PROVIDER_NOT_SUPPORTED**: `"VIDEO_PROVIDER_NOT_SUPPORTED"` = `"VIDEO_PROVIDER_NOT_SUPPORTED"`

Provider name not registered with VideoProcessor

### TRANSITION_NOT_SUPPORTED

> `readonly` **TRANSITION_NOT_SUPPORTED**: `"VIDEO_TRANSITION_NOT_SUPPORTED"` = `"VIDEO_TRANSITION_NOT_SUPPORTED"`

Selected provider's handler does not implement generateTransition

### POLL_TIMEOUT

> `readonly` **POLL_TIMEOUT**: `"VIDEO_POLL_TIMEOUT"` = `"VIDEO_POLL_TIMEOUT"`

Polling for video completion timed out

### INVALID_INPUT

> `readonly` **INVALID_INPUT**: `"VIDEO_INVALID_INPUT"` = `"VIDEO_INVALID_INPUT"`

Runtime I/O error during input processing.
Used for: failed URL fetch, failed file read, corrupt/unreadable buffer.
NOT for: missing options or invalid config shapes (use parameterValidation).

### DIRECTOR_SEGMENT_MISMATCH

> `readonly` **DIRECTOR_SEGMENT_MISMATCH**: `"DIRECTOR_SEGMENT_MISMATCH"` = `"DIRECTOR_SEGMENT_MISMATCH"`

Invalid segment structure (missing prompt or image)

### DIRECTOR_SEGMENT_LIMIT_EXCEEDED

> `readonly` **DIRECTOR_SEGMENT_LIMIT_EXCEEDED**: `"DIRECTOR_SEGMENT_LIMIT_EXCEEDED"` = `"DIRECTOR_SEGMENT_LIMIT_EXCEEDED"`

Too many segments requested

### DIRECTOR_INVALID_TRANSITION_DURATION

> `readonly` **DIRECTOR_INVALID_TRANSITION_DURATION**: `"DIRECTOR_INVALID_TRANSITION_DURATION"` = `"DIRECTOR_INVALID_TRANSITION_DURATION"`

Invalid transition duration (must be 4, 6, or 8)

### DIRECTOR_CLIP_FAILED

> `readonly` **DIRECTOR_CLIP_FAILED**: `"DIRECTOR_CLIP_FAILED"` = `"DIRECTOR_CLIP_FAILED"`

A main clip generation call failed (fatal)

### DIRECTOR_FRAME_EXTRACTION_FAILED

> `readonly` **DIRECTOR_FRAME_EXTRACTION_FAILED**: `"DIRECTOR_FRAME_EXTRACTION_FAILED"` = `"DIRECTOR_FRAME_EXTRACTION_FAILED"`

Frame extraction from clip failed

### DIRECTOR_TRANSITION_FAILED

> `readonly` **DIRECTOR_TRANSITION_FAILED**: `"DIRECTOR_TRANSITION_FAILED"` = `"DIRECTOR_TRANSITION_FAILED"`

Transition clip generation failed (non-fatal, falls back to hard cut)

### DIRECTOR_MERGE_FAILED

> `readonly` **DIRECTOR_MERGE_FAILED**: `"DIRECTOR_MERGE_FAILED"` = `"DIRECTOR_MERGE_FAILED"`

Video merge/concatenation failed

### DIRECTOR_PIPELINE_TIMEOUT

> `readonly` **DIRECTOR_PIPELINE_TIMEOUT**: `"DIRECTOR_PIPELINE_TIMEOUT"` = `"DIRECTOR_PIPELINE_TIMEOUT"`

Pipeline timeout (overall)
