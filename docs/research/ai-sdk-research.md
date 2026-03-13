# AI SDK Dependency Upgrade Research

**Date:** 2026-02-27
**Researcher:** ai-sdk-researcher (automated)
**Scope:** 7 AI SDK packages from vercel/ai monorepo

---

## Executive Summary

These upgrades are **low risk** overall. The most significant changes are:

1. **Security fix** in `@ai-sdk/provider-utils` 4.0.15: download size limits to prevent memory exhaustion (DoS)
2. **New feature** in `@ai-sdk/openai` 3.0.36: fix for Azure AI Foundry/Mistral streaming tool calls
3. **New feature** in `@ai-sdk/openai` 3.0.35: enhanced reasoning content (Responses API)
4. **New feature** in `@ai-sdk/openai` 3.0.34: `phase` parameter support for gpt-5.3-codex
5. **New feature** in `@ai-sdk/anthropic` 3.0.48: code execution tool support
6. **New feature** in `@ai-sdk/google` 3.0.32-3.0.33: Gemini 3.1 image model support
7. **Bug fix** in `ai` 6.0.101: duplicate tool part creation for non-existent tools

No breaking changes were found in any of these upgrades.

---

## 1. @ai-sdk/anthropic (3.0.47 -> 3.0.48)

### What Changed

| Version | Type    | Description                                                                                                                                                 |
| ------- | ------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 3.0.48  | Feature | Added support for a new **code execution tool** (`2164cdf`)                                                                                                 |
| 3.0.47  | Fix     | Changed `cacheControl` provider option to pass as top-level `cache_control` parameter in Anthropic API request body, enabling automatic caching (`17978c6`) |

### Breaking Changes

None.

### New Features We Can Leverage

- **Code execution tool**: Anthropic's code execution (sandbox) capability is now supported. NeuroLink could expose this as a built-in tool option for Anthropic provider users, similar to how we handle MCP tools.
- **Improved cacheControl**: The `cache_control` parameter is now placed correctly at the top level of the API request, which means prompt caching will work more reliably. NeuroLink's Anthropic provider should benefit automatically.

### Risk Level

**Low** - Patch-level changes with additive features only. The cacheControl change was already in 3.0.47 (current version).

### Security Fixes

None in these versions directly, but the transitive dependency update to `@ai-sdk/provider-utils` carries a security fix (see provider-utils section below).

---

## 2. @ai-sdk/azure (3.0.35 -> 3.0.37)

### What Changed

| Version | Type | Description                                 |
| ------- | ---- | ------------------------------------------- |
| 3.0.37  | Deps | Updated dependency: `@ai-sdk/openai@3.0.36` |
| 3.0.36  | Deps | Updated dependency: `@ai-sdk/openai@3.0.35` |
| 3.0.35  | Deps | Updated dependency: `@ai-sdk/openai@3.0.34` |

### Breaking Changes

None.

### New Features We Can Leverage

All features come transitively from `@ai-sdk/openai` updates (see section 6). Most notably:

- **Streaming tool call fix** (3.0.36 via openai@3.0.36): Azure AI Foundry deployments that omit the `type` field in streaming tool_calls deltas no longer throw `InvalidResponseDataError`. This is a **direct fix for Azure users** of NeuroLink.
- **Reasoning content fallback** (via openai@3.0.35): Multi-turn reasoning works even when item IDs are stripped.
- **Phase parameter** (via openai@3.0.34): Support for gpt-5.3-codex `phase` field.

### Risk Level

**Low** - Pure dependency bumps. The Azure package itself has no code changes.

### Security Fixes

None directly, but inherits the download size limit fix from provider-utils.

---

## 3. @ai-sdk/google (3.0.31 -> 3.0.33)

### What Changed

| Version | Type    | Description                                                                                                        |
| ------- | ------- | ------------------------------------------------------------------------------------------------------------------ |
| 3.0.33  | Feature | Added support for new Google image model **aspect ratios and sizes** (`1ece97a`)                                   |
| 3.0.32  | Feature | Added compatibility for **`gemini-3.1-flash-image-preview`** model (`45f0a7f`)                                     |
| 3.0.31  | Types   | Expanded `GoogleGenerativeAIModelId` and `GoogleGenerativeAIVideoModelId` type definitions for better autocomplete |

### Breaking Changes

None.

### New Features We Can Leverage

- **Gemini 3.1 Flash Image Preview model**: NeuroLink's Google AI Studio provider can now use the `gemini-3.1-flash-image-preview` model for image generation tasks. Consider adding this to model definitions.
- **Image aspect ratios/sizes**: Users can specify more granular image output dimensions. NeuroLink's image generation API should pass through these options.
- **Better type definitions**: Improved autocomplete for model IDs. No action needed - automatic benefit.

### Risk Level

**Low** - Additive features only, no behavior changes to existing functionality.

### Security Fixes

None.

---

## 4. @ai-sdk/google-vertex (4.0.63 -> 4.0.66)

### What Changed

| Version | Type           | Description                                                                                   |
| ------- | -------------- | --------------------------------------------------------------------------------------------- |
| 4.0.66  | Deps           | Updated `@ai-sdk/anthropic@3.0.48`                                                            |
| 4.0.65  | Deps           | Updated `@ai-sdk/google@3.0.33`                                                               |
| 4.0.64  | Feature + Deps | Added support for **`gemini-3.1-flash-image-preview`** model; updated `@ai-sdk/google@3.0.32` |
| 4.0.63  | Deps           | Updated `@ai-sdk/anthropic@3.0.47`                                                            |

### Breaking Changes

None.

### New Features We Can Leverage

- **Gemini 3.1 Flash Image Preview on Vertex**: Same model support as @ai-sdk/google but through Google Vertex AI. NeuroLink's Google Vertex provider gets this automatically.
- **Anthropic on Vertex**: Gets code execution tool support via the anthropic dependency bump.

### Risk Level

**Low** - Primarily dependency updates. One additive model feature.

### Security Fixes

None directly.

---

## 5. @ai-sdk/mistral (3.0.12 -> 3.0.20)

### What Changed

This is the largest version jump (8 versions), but almost entirely dependency and documentation updates.

| Version | Type         | Description                                                       |
| ------- | ------------ | ----------------------------------------------------------------- |
| 3.0.20  | Deps         | Updated `@ai-sdk/provider-utils@4.0.15`                           |
| 3.0.19  | Deps         | Updated `@ai-sdk/provider@3.0.8`, `@ai-sdk/provider-utils@4.0.14` |
| 3.0.18  | Deps         | Updated `@ai-sdk/provider@3.0.7`, `@ai-sdk/provider-utils@4.0.13` |
| 3.0.17  | Deps         | Updated `@ai-sdk/provider-utils@4.0.12`                           |
| 3.0.16  | Deps         | Updated `@ai-sdk/provider-utils@4.0.11`, `@ai-sdk/provider@3.0.6` |
| 3.0.15  | Docs         | Added skill information to README files                           |
| 3.0.14  | Docs         | Fixed incorrect and outdated provider docs                        |
| 3.0.13  | Deps         | Updated `@ai-sdk/provider-utils@4.0.10`                           |
| 3.0.12  | Housekeeping | Excluded tests from npm package; dependency updates               |

### Breaking Changes

None.

### New Features We Can Leverage (via transitive dependencies)

- **Download size limits** (provider-utils@4.0.15): Security fix - prevents memory exhaustion from oversized downloads.
- **Video model resolution** (provider@3.0.8): Default global provider video model resolution.
- **Experimental video support** (provider@3.0.7): Experimental `generateVideo` support added to provider interface.
- **Better error messages** (provider@3.0.6, provider-utils@4.0.11): Type validation errors now include field paths and entity identifiers.
- **Bun compatibility** (provider-utils@4.0.10): Bun fetch errors are now recognized as retryable.
- **Type export fix** (provider-utils@4.0.12): Only exports types from standard-schema package.

### Risk Level

**Low** - No Mistral-specific code changes. All changes are in shared dependencies.

### Security Fixes

**Yes** - Transitive via `@ai-sdk/provider-utils@4.0.15`:

- Download size limit enforcement (default 2 GiB max) to prevent memory exhaustion DoS
- `abortSignal` now properly passed to `fetch()` across all download call sites

---

## 6. @ai-sdk/openai (3.0.34 -> 3.0.36)

### What Changed

| Version | Type        | Description                                                                                                                                                                                                                                                                                                     |
| ------- | ----------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 3.0.36  | Bug Fix     | Fixed streaming tool call handling to accept **null/undefined type fields**. Azure AI Foundry and Mistral deployments on Azure omit the `type` field in streaming `tool_calls` deltas, which previously caused `InvalidResponseDataError`. Parser now treats missing `type` as `"function"` instead of failing. |
| 3.0.35  | Enhancement | Enhanced reasoning content part handling in the Responses API. When `providerOptions.openai.itemId` is absent on reasoning content parts, the converter now uses `encrypted_content` as a fallback instead of skipping the part. Made `id` field optional on `OpenAIResponsesReasoning` type.                   |
| 3.0.34  | Feature     | Added support for the **`phase` parameter** on Responses API message items. Models like `gpt-5.3-codex` return `phase` fields (`'commentary'` or `'final_answer'`) on assistant message output items. Values preserved in `providerMetadata.openai.phase` on text parts.                                        |

### Breaking Changes

None.

### New Features We Can Leverage

- **Streaming tool call fix (3.0.36)**: This is a **critical fix for NeuroLink's Azure provider**. Users deploying Mistral models on Azure AI Foundry will no longer get `InvalidResponseDataError` during streaming tool calls. This was likely causing failures for NeuroLink users.
- **Reasoning content fallback (3.0.35)**: Multi-turn conversations with reasoning models work better. NeuroLink's OpenAI provider benefits automatically when using the Responses API.
- **Phase parameter (3.0.34)**: Support for `gpt-5.3-codex` model's `phase` field. NeuroLink could expose `phase` metadata in its response objects. **Important**: correctly preserving phase on assistant items is _required_ for gpt-5.3-codex - dropping it causes significant performance degradation.

### Risk Level

**Low** - All changes are backward-compatible. The streaming fix (3.0.36) actually resolves existing failures.

### Security Fixes

None directly.

---

## 7. ai (6.0.101 -> 6.0.103)

### What Changed

| Version | Type    | Description                                                                              |
| ------- | ------- | ---------------------------------------------------------------------------------------- |
| 6.0.103 | Deps    | Updated `@ai-sdk/gateway@3.0.57`                                                         |
| 6.0.102 | Deps    | Updated `@ai-sdk/gateway@3.0.56`                                                         |
| 6.0.101 | Bug Fix | Fixed **duplicate tool part creation** when models invoke non-existent tools (`5230482`) |

### Breaking Changes

None.

### New Features We Can Leverage

- **Duplicate tool part fix (6.0.101)**: When a model hallucinates a tool name that doesn't exist, the SDK no longer creates duplicate tool parts. This improves reliability of NeuroLink's tool execution pipeline, especially with less capable models that may hallucinate tool names.

### Risk Level

**Low** - Bug fix and dependency bumps only.

### Security Fixes

None directly, but the gateway dependency updates may carry transitive fixes.

---

## Transitive Dependency Changes (Important)

### @ai-sdk/provider-utils (4.0.9 -> 4.0.15)

This is the most significant transitive dependency and carries a **security fix**:

| Version | Type         | Description                                                                                                                                                                                                                                           |
| ------- | ------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 4.0.15  | **SECURITY** | `download()` and `downloadBlob()` now enforce a **default 2 GiB size limit** on user-provided URLs. Downloads exceeding the limit abort with `DownloadError`. `abortSignal` properly passed to `fetch()`. New `createDownload({ maxBytes })` factory. |
| 4.0.14  | Deps         | Updated `@ai-sdk/provider@3.0.8`                                                                                                                                                                                                                      |
| 4.0.13  | Deps         | Updated `@ai-sdk/provider@3.0.7`                                                                                                                                                                                                                      |
| 4.0.12  | Fix          | Export only types from standard-schema package (removes import conflicts)                                                                                                                                                                             |
| 4.0.11  | Enhancement  | Type validation error messages include field paths and entity identifiers                                                                                                                                                                             |
| 4.0.10  | Fix          | Recognize Bun fetch errors as retryable                                                                                                                                                                                                               |
| 4.0.9   | Housekeeping | Excluded tests from npm package                                                                                                                                                                                                                       |

### @ai-sdk/provider (3.0.5 -> 3.0.8)

| Version | Type         | Description                                                               |
| ------- | ------------ | ------------------------------------------------------------------------- |
| 3.0.8   | Feature      | Default global provider video model resolution                            |
| 3.0.7   | Feature      | Experimental generate video support                                       |
| 3.0.6   | Fix          | Type validation error messages include field paths and entity identifiers |
| 3.0.5   | Housekeeping | Excluded tests from npm package                                           |

---

## Known Security Advisories

### CVE-2025-48985: Input Validation Bypass (AI SDK)

- **Severity:** Low
- **Affected versions:** AI SDK < 5.0.52 and 6.0.0-beta.\*
- **Description:** Improper URL-to-data mapping allows attackers to substitute arbitrary downloaded bytes for different supported URLs within the same prompt. Filtering operations cause index misalignment between downloaded files and their intended URLs.
- **Status:** Fixed in versions we are already past (we are on 6.0.101+). **Not a concern for this upgrade.**
- **Affected functions:** `generateText()`, `streamText()`, and most methods accepting images/files as input.

### Download Size Limit (provider-utils 4.0.15)

- **Severity:** Medium (DoS prevention)
- **Description:** Prior to 4.0.15, `download()` and `downloadBlob()` had no size limit, allowing potential memory exhaustion when processing user-provided URLs.
- **Status:** Fixed in `@ai-sdk/provider-utils@4.0.15`, which is pulled in by `@ai-sdk/mistral@3.0.20` and will be transitively pulled in by all provider packages.
- **Impact on NeuroLink:** If NeuroLink passes user-provided URLs to `generateText()`/`streamText()` (e.g., image URLs), this fix prevents a potential DoS vector.

---

## Upgrade Recommendations

### Priority Order

1. **@ai-sdk/openai 3.0.36** + **@ai-sdk/azure 3.0.37** - Fixes Azure streaming tool call failures
2. **@ai-sdk/mistral 3.0.20** - Brings in the security fix for download size limits
3. **ai 6.0.103** - Bug fix for duplicate tool parts
4. **@ai-sdk/anthropic 3.0.48** - Code execution tool support
5. **@ai-sdk/google 3.0.33** - New image model support
6. **@ai-sdk/google-vertex 4.0.66** - Dependency alignment

### Overall Risk Assessment: LOW

All 7 packages are **safe to upgrade simultaneously**:

- Zero breaking changes
- All semver-compliant patch updates
- One security-relevant fix (download size limits)
- One important bug fix (Azure streaming tool calls)
- Several additive features (code execution, image models, phase parameter)

### Action Items for NeuroLink

1. After upgrading, verify Azure provider streaming with tool calls works correctly
2. Consider exposing Anthropic code execution tool in NeuroLink's tool system
3. Consider adding `gemini-3.1-flash-image-preview` to model definitions
4. Consider preserving `phase` metadata from gpt-5.3-codex responses
5. Ensure NeuroLink passes through the download size limit options if users need to customize the 2 GiB default
