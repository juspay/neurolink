# NeuroLink Dependency Upgrade Report

**Date:** 2026-02-27
**Version:** 9.12.1
**Branch:** fix/security-fixes

---

## 1. Executive Summary

**25 packages** were analyzed across 4 categories (AI SDK, AWS SDK, Core Libraries, Dev Dependencies). **All 25 packages have available upgrades.**

### Overall Risk Assessment: LOW-MEDIUM

The vast majority of upgrades are low-risk patch and minor version bumps. Only **2 packages** carry elevated risk:

- **TypeScript 5.0.0 -> 5.9.3** (HIGH risk) -- 10 minor versions spanning 2.5 years with cumulative stricter type checks
- **tslib 2.4.1 -> 2.8.1** (MEDIUM risk) -- large jump with decorator hook order change and new exports structure

### Key Highlights

| Category               | Details                                                                                                                                                     |
| ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Security Fixes**     | 1 direct fix (download size limits in `@ai-sdk/provider-utils`), 1 dev dependency fix (Fastify CVE-2026-25224), 2 already-patched CVEs in baseline versions |
| **Critical Bug Fixes** | Azure streaming tool calls fixed (`@ai-sdk/openai` 3.0.36), duplicate tool part creation fixed (`ai` 6.0.101)                                               |
| **New Features**       | Anthropic code execution tool, Gemini 3.1 image model, gpt-5.3-codex phase parameter, Google server-side MCP, GenAI telemetry conventions                   |
| **Breaking Changes**   | Zero breaking changes in production dependencies; TypeScript 5.9 will surface new type errors                                                               |

---

## 2. Upgrade Priority Matrix

| #   | Package                               | Current  | Latest  | Risk   | Priority     | Category    |
| --- | ------------------------------------- | -------- | ------- | ------ | ------------ | ----------- |
| 1   | `@ai-sdk/openai`                      | 3.0.34   | 3.0.36  | Low    | **Critical** | Bug Fix     |
| 2   | `@ai-sdk/azure`                       | 3.0.35   | 3.0.37  | Low    | **Critical** | Bug Fix     |
| 3   | `@ai-sdk/mistral`                     | 3.0.12   | 3.0.20  | Low    | **Critical** | Security    |
| 4   | `fastify`                             | 5.7.2    | 5.7.4   | Low    | **High**     | Security    |
| 5   | `ai`                                  | 6.0.101  | 6.0.103 | Low    | **High**     | Bug Fix     |
| 6   | `@ai-sdk/anthropic`                   | 3.0.47   | 3.0.48  | Low    | **High**     | Feature     |
| 7   | `@ai-sdk/google`                      | 3.0.31   | 3.0.33  | Low    | **High**     | Feature     |
| 8   | `@ai-sdk/google-vertex`               | 4.0.63   | 4.0.66  | Low    | **High**     | Feature     |
| 9   | `@google/genai`                       | 1.42.0   | 1.43.0  | Low    | **High**     | Feature     |
| 10  | `undici`                              | >=7.18.2 | 7.22.0  | Low    | **Medium**   | Maintenance |
| 11  | `@opentelemetry/semantic-conventions` | 1.39.0   | 1.40.0  | Low    | **Medium**   | Feature     |
| 12  | `hono`                                | 4.12.2   | 4.12.3  | Low    | **Medium**   | Maintenance |
| 13  | `nanoid`                              | 5.1.5    | 5.1.6   | Low    | **Low**      | Maintenance |
| 14  | `@aws-sdk/client-bedrock`             | 3.998.0  | 3.999.0 | Low    | **Low**      | Maintenance |
| 15  | `@aws-sdk/client-bedrock-runtime`     | 3.998.0  | 3.999.0 | Low    | **Low**      | Maintenance |
| 16  | `@aws-sdk/client-sagemaker`           | 3.998.0  | 3.999.0 | Low    | **Low**      | Maintenance |
| 17  | `@aws-sdk/client-sagemaker-runtime`   | 3.998.0  | 3.999.0 | Low    | **Low**      | Maintenance |
| 18  | `@semantic-release/npm`               | 13.1.2   | 13.1.4  | Low    | **Low**      | Maintenance |
| 19  | `@sveltejs/kit`                       | 2.53.2   | 2.53.3  | Low    | **Low**      | Maintenance |
| 20  | `@types/node`                         | 25.3.1   | 25.3.2  | Low    | **Low**      | Maintenance |
| 21  | `svelte-check`                        | 4.4.3    | 4.4.4   | Low    | **Low**      | Maintenance |
| 22  | `@ai-sdk/provider`                    | 3.0.8    | 3.0.8   | None   | **None**     | Up to date  |
| 23  | `tslib`                               | 2.4.1    | 2.8.1   | Medium | **Medium**   | Maintenance |
| 24  | `typescript`                          | 5.0.0    | 5.9.3   | High   | **Medium**   | Maintenance |
| 25  | `@langfuse/otel`                      | 4.6.1    | latest  | Low    | **Low**      | Maintenance |

---

## 3. Security Fixes

### Direct Security Fix: Download Size Limits (provider-utils 4.0.15)

| Field                | Value                                                                                                                                                                                                     |
| -------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Severity**         | Medium (DoS prevention)                                                                                                                                                                                   |
| **Package**          | `@ai-sdk/provider-utils` 4.0.15 (transitive, pulled in via `@ai-sdk/mistral` 3.0.20)                                                                                                                      |
| **Description**      | `download()` and `downloadBlob()` now enforce a **default 2 GiB size limit** on user-provided URLs. Downloads exceeding the limit abort with `DownloadError`. `abortSignal` properly passed to `fetch()`. |
| **Are we affected?** | **Yes.** NeuroLink passes user-provided URLs to `generateText()`/`streamText()` (e.g., image URLs). Without this fix, a malicious URL could cause memory exhaustion (DoS).                                |
| **Fix**              | Upgrade `@ai-sdk/mistral` to 3.0.20. All other AI SDK packages will transitively receive this fix.                                                                                                        |

### Dev Dependency Security Fix: Fastify CVE-2026-25224

| Field                | Value                                                                                                                 |
| -------------------- | --------------------------------------------------------------------------------------------------------------------- |
| **CVE**              | CVE-2026-25224 (GHSA-mrq3-vjjr-p77c)                                                                                  |
| **Severity**         | Not yet scored                                                                                                        |
| **Package**          | `fastify` 5.7.3+                                                                                                      |
| **Description**      | Security fix related to `Reply.send()` string serialization.                                                          |
| **Are we affected?** | Fastify is a devDependency used as a server adapter (`src/lib/server/`). Low production risk, but important to patch. |
| **Fix**              | Upgrade `fastify` to 5.7.4.                                                                                           |

### Already Patched (in current baseline versions)

| CVE            | Severity        | Package | Description                                                                            | Status                                                                                         |
| -------------- | --------------- | ------- | -------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| CVE-2025-48985 | Low             | AI SDK  | Input validation bypass allowing URL-to-data substitution in multimodal prompts        | Fixed in versions prior to our baseline (6.0.101+). **Not a concern.**                         |
| CVE-2026-22036 | Low (CVSS 3.7)  | undici  | Unbounded decompression chain in HTTP `Content-Encoding` causing CPU/memory exhaustion | Fixed in 7.18.2 (our current minimum). **Not a concern.**                                      |
| CVE-2026-27700 | High (CVSS 8.2) | hono    | Authentication bypass by IP spoofing in AWS Lambda ALB `conninfo`                      | Fixed in 4.12.2 (our current version). **NeuroLink does not use the affected Lambda adapter.** |

---

## 4. Per-Package Detailed Analysis

### AI SDK Packages (7 packages)

#### 4.1 `@ai-sdk/openai` (3.0.34 -> 3.0.36)

| Field                          | Details                                                                                                                                                                                                                                                                                                                |
| ------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **What changed**               | v3.0.36: Fixed streaming tool call handling for Azure AI Foundry/Mistral (null/undefined `type` fields now treated as `"function"`). v3.0.35: Enhanced reasoning content fallback for Responses API (uses `encrypted_content` when `itemId` absent). v3.0.34: Added `phase` parameter support for gpt-5.3-codex model. |
| **Breaking changes**           | None                                                                                                                                                                                                                                                                                                                   |
| **New features for NeuroLink** | The streaming fix (3.0.36) resolves existing failures for Azure-deployed Mistral models. The `phase` parameter (3.0.34) is required for correct gpt-5.3-codex behavior -- dropping it causes performance degradation. Consider exposing `phase` in NeuroLink response objects.                                         |
| **Codebase impact**            | `src/lib/providers/openAI.ts`, `src/lib/providers/huggingFace.ts`, `src/lib/providers/litellm.ts`, `src/lib/providers/openaiCompatible.ts` -- all use `createOpenAI` factory. No code changes required.                                                                                                                |
| **Risk level**                 | Low                                                                                                                                                                                                                                                                                                                    |
| **Recommendation**             | Upgrade immediately. Fixes active bugs.                                                                                                                                                                                                                                                                                |

#### 4.2 `@ai-sdk/azure` (3.0.35 -> 3.0.37)

| Field                          | Details                                                                                                    |
| ------------------------------ | ---------------------------------------------------------------------------------------------------------- |
| **What changed**               | Three dependency-only bumps pulling in `@ai-sdk/openai` 3.0.34-3.0.36. No Azure-specific code changes.     |
| **Breaking changes**           | None                                                                                                       |
| **New features for NeuroLink** | Inherits all `@ai-sdk/openai` improvements (streaming tool call fix, reasoning fallback, phase parameter). |
| **Codebase impact**            | `src/lib/providers/azureOpenai.ts` -- uses `createAzure` factory. No code changes required.                |
| **Risk level**                 | Low                                                                                                        |
| **Recommendation**             | Upgrade alongside `@ai-sdk/openai`.                                                                        |

#### 4.3 `@ai-sdk/anthropic` (3.0.47 -> 3.0.48)

| Field                          | Details                                                                                                                                                                       |
| ------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **What changed**               | v3.0.48: Added code execution tool support (Anthropic sandbox). v3.0.47 (already current): Improved `cacheControl` placement for prompt caching.                              |
| **Breaking changes**           | None                                                                                                                                                                          |
| **New features for NeuroLink** | Code execution tool could be exposed as a built-in tool option for Anthropic users, similar to MCP tool handling. Prompt caching now works more reliably (automatic benefit). |
| **Codebase impact**            | `src/lib/providers/anthropic.ts`, `src/lib/providers/anthropicBaseProvider.ts` -- both use `createAnthropic` factory. No code changes required.                               |
| **Risk level**                 | Low                                                                                                                                                                           |
| **Recommendation**             | Upgrade. Consider adding code execution tool integration.                                                                                                                     |

#### 4.4 `@ai-sdk/google` (3.0.31 -> 3.0.33)

| Field                          | Details                                                                                                                                                       |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **What changed**               | v3.0.33: Added image model aspect ratios/sizes. v3.0.32: Added `gemini-3.1-flash-image-preview` model support. v3.0.31: Expanded model ID type definitions.   |
| **Breaking changes**           | None                                                                                                                                                          |
| **New features for NeuroLink** | Gemini 3.1 Flash Image Preview model for image generation. More granular image output dimensions. Consider adding the model to NeuroLink's model definitions. |
| **Codebase impact**            | `src/lib/providers/googleAiStudio.ts` -- uses `createGoogleGenerativeAI` factory. No code changes required.                                                   |
| **Risk level**                 | Low                                                                                                                                                           |
| **Recommendation**             | Upgrade. Add `gemini-3.1-flash-image-preview` to model definitions.                                                                                           |

#### 4.5 `@ai-sdk/google-vertex` (4.0.63 -> 4.0.66)

| Field                          | Details                                                                                                                                                                 |
| ------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **What changed**               | Four dependency-only bumps pulling in updated `@ai-sdk/google` and `@ai-sdk/anthropic`. v4.0.64 added `gemini-3.1-flash-image-preview` model support for Vertex.        |
| **Breaking changes**           | None                                                                                                                                                                    |
| **New features for NeuroLink** | Same Gemini 3.1 image model support through Vertex AI. Anthropic code execution tool via Vertex.                                                                        |
| **Codebase impact**            | `src/lib/providers/googleVertex.ts` -- uses `createVertex` and `createVertexAnthropic` factories, including the `/anthropic` sub-path import. No code changes required. |
| **Risk level**                 | Low                                                                                                                                                                     |
| **Recommendation**             | Upgrade alongside other AI SDK packages.                                                                                                                                |

#### 4.6 `@ai-sdk/mistral` (3.0.12 -> 3.0.20)

| Field                          | Details                                                                                                                                                                                                                                                            |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **What changed**               | 8 version bumps, almost entirely dependency updates. Carries the security fix via `@ai-sdk/provider-utils` 4.0.15 (download size limits). Also includes Bun compatibility, better error messages, and video model resolution support from transitive dependencies. |
| **Breaking changes**           | None                                                                                                                                                                                                                                                               |
| **New features for NeuroLink** | Download size limit enforcement (2 GiB default) prevents memory exhaustion DoS. Bun fetch errors now retryable. Better type validation error messages.                                                                                                             |
| **Codebase impact**            | `src/lib/providers/mistral.ts` -- uses `createMistral` factory. `src/lib/factories/providerRegistry.ts` -- type-only import. No code changes required.                                                                                                             |
| **Risk level**                 | Low                                                                                                                                                                                                                                                                |
| **Recommendation**             | Upgrade immediately for security fix.                                                                                                                                                                                                                              |

#### 4.7 `ai` (6.0.101 -> 6.0.103)

| Field                          | Details                                                                                                                                                                                           |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **What changed**               | v6.0.101: Fixed duplicate tool part creation when models invoke non-existent tools. v6.0.102-103: Gateway dependency bumps.                                                                       |
| **Breaking changes**           | None                                                                                                                                                                                              |
| **New features for NeuroLink** | The duplicate tool part fix improves reliability of the tool execution pipeline, especially with less capable models that may hallucinate tool names.                                             |
| **Codebase impact**            | Used across 30+ files (`GenerationHandler.ts`, `ToolsManager.ts`, all provider implementations, middleware, message builders, type definitions). No code changes required -- these are bug fixes. |
| **Risk level**                 | Low                                                                                                                                                                                               |
| **Recommendation**             | Upgrade. Improves tool execution reliability.                                                                                                                                                     |

---

### AWS SDK Packages (4 packages)

#### 4.8-4.11 AWS SDK Packages (3.998.0 -> 3.999.0)

All four AWS SDK packages (`@aws-sdk/client-bedrock`, `@aws-sdk/client-bedrock-runtime`, `@aws-sdk/client-sagemaker`, `@aws-sdk/client-sagemaker-runtime`) received **version-bump-only** updates. No new features, no bug fixes, no breaking changes in any of the Bedrock or SageMaker client packages.

| Package                             | Codebase Impact                                                                                            | Risk |
| ----------------------------------- | ---------------------------------------------------------------------------------------------------------- | ---- |
| `@aws-sdk/client-bedrock`           | `src/lib/providers/amazonBedrock.ts` -- `BedrockClient`, `ListFoundationModelsCommand`                     | Low  |
| `@aws-sdk/client-bedrock-runtime`   | `src/lib/providers/amazonBedrock.ts` -- `BedrockRuntimeClient`, `ConverseCommand`, `ConverseStreamCommand` | Low  |
| `@aws-sdk/client-sagemaker`         | `src/cli/factories/sagemakerCommandFactory.ts` -- `SageMakerClient`, `ListEndpointsCommand`                | Low  |
| `@aws-sdk/client-sagemaker-runtime` | `src/lib/providers/sagemaker/client.ts` -- `SageMakerRuntimeClient`, `InvokeEndpointCommand`               | Low  |

**SDK-wide change:** `util-user-agent-node` now populates TypeScript version in user-agent headers (non-breaking telemetry improvement).

**Recommendation:** Upgrade all 4 together. No code changes required.

---

### Google & Core Libraries (5 packages)

#### 4.12 `@google/genai` (1.42.0 -> 1.43.0)

| Field                          | Details                                                                                                                                                                                                                                                      |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **What changed**               | Added `gemini-3.1-pro-preview` model. Added Image Grounding for GoogleSearch tool. Enabled server-side MCP support. More image sizes/resolutions. Breaking: `interactions` media mime type changed from string to enum (experimental Interactions API only). |
| **Breaking changes**           | Interactions API mime type enum change -- **does NOT affect NeuroLink** (we use standard generate/stream APIs, not experimental Interactions).                                                                                                               |
| **New features for NeuroLink** | **Server-side MCP support** is directly relevant -- could enable passing MCP server configs to the Google API rather than handling tool calls client-side. Gemini 3.1 Pro Preview model. Image Grounding for GoogleSearch.                                   |
| **Codebase impact**            | `src/lib/providers/googleAiStudio.ts`, `src/lib/providers/googleVertex.ts`, `src/lib/adapters/video/videoAnalyzer.ts` -- all use dynamic imports. No code changes required.                                                                                  |
| **Risk level**                 | Low                                                                                                                                                                                                                                                          |
| **Recommendation**             | Upgrade. Explore server-side MCP integration opportunities.                                                                                                                                                                                                  |

#### 4.13 `undici` (>=7.18.2 -> 7.22.0)

| Field                          | Details                                                                                                                                                                                                                                                                                                   |
| ------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **What changed**               | 4 minor + 2 patch releases. Key changes: fixed 401 loop in fetch (7.19.1), proper 401 response handling (7.19.2), HTTP/2 flow-control options (7.19.0), preserved fetch stack traces (7.20.0), `pingInterval` keep-alive (7.21.0), proxy agent enhancements (7.22.0), `__filename` bundling fix (7.21.0). |
| **Breaking changes**           | None within v7.x.                                                                                                                                                                                                                                                                                         |
| **New features for NeuroLink** | 401 loop fix and proxy agent enhancements directly benefit `proxyFetch.ts` and `awsProxyIntegration.ts`. HTTP/2 flow-control could benefit Vertex AI streaming. Stack trace preservation improves debugging.                                                                                              |
| **Codebase impact**            | `src/lib/utils/messageBuilder.ts`, `src/lib/utils/fileDetector.ts` -- `getGlobalDispatcher`, `interceptors`, `request`. `src/lib/proxy/proxyFetch.ts` -- `ProxyAgent`. No code changes required.                                                                                                          |
| **Risk level**                 | Low                                                                                                                                                                                                                                                                                                       |
| **Recommendation**             | Upgrade. Many quality-of-life fixes for proxy/fetch infrastructure.                                                                                                                                                                                                                                       |

#### 4.14 `@opentelemetry/semantic-conventions` (1.39.0 -> 1.40.0)

| Field                          | Details                                                                                                                                                                                                                   |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **What changed**               | 2 new stable attributes (`ATTR_SERVICE_INSTANCE_ID`, `ATTR_SERVICE_NAMESPACE`). 157 new unstable attributes including GenAI cache tokens, tool call support, MCP protocol, and OpenAI API type. 40 unstable deprecations. |
| **Breaking changes**           | None affecting NeuroLink. We only use `ATTR_SERVICE_NAME` and `ATTR_SERVICE_VERSION` (stable, unchanged).                                                                                                                 |
| **New features for NeuroLink** | New GenAI semantic convention attributes (`gen_ai.agent.version`, cache token attributes, MCP protocol support) are directly relevant to NeuroLink's telemetry and could enable richer observability.                     |
| **Codebase impact**            | `src/lib/telemetry/telemetryService.ts`, `src/lib/services/server/ai/observability/instrumentation.ts` -- only `ATTR_SERVICE_NAME` and `ATTR_SERVICE_VERSION`. No code changes required.                                  |
| **Risk level**                 | Low                                                                                                                                                                                                                       |
| **Recommendation**             | Upgrade. Consider adopting GenAI/MCP telemetry attributes in a follow-up.                                                                                                                                                 |

#### 4.15 `hono` (4.12.2 -> 4.12.3)

| Field                          | Details                                                                                                                                                                                                                |
| ------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **What changed**               | Bug fixes: form data type diff, safer JWT timestamp handling (`Math.floor` instead of bitwise OR), `JwtVariables` compatibility, removed DOM type dependencies, corrected middleware types, **fixed JWT memory leak**. |
| **Breaking changes**           | None                                                                                                                                                                                                                   |
| **New features for NeuroLink** | Memory leak fix in JWT operations. Removal of DOM type dependencies improves Node.js-only TypeScript compatibility.                                                                                                    |
| **Codebase impact**            | `src/lib/server/adapters/honoAdapter.ts` -- `Hono`, `cors`, `HTTPException`, `logger`, `secureHeaders`, `streamSSE`, `timeout`. No code changes required.                                                              |
| **Risk level**                 | Low                                                                                                                                                                                                                    |
| **Recommendation**             | Upgrade.                                                                                                                                                                                                               |

#### 4.16 `nanoid` (5.1.5 -> 5.1.6)

| Field                          | Details                                                                                                                                                 |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **What changed**               | Fixed infinite loop when passing `0` as size to `customAlphabet()`.                                                                                     |
| **Breaking changes**           | None                                                                                                                                                    |
| **New features for NeuroLink** | None directly. NeuroLink always calls `nanoid()` without arguments (default 21-char IDs), never `customAlphabet`.                                       |
| **Codebase impact**            | `src/lib/core/modules/StreamHandler.ts`, `src/lib/core/modules/TelemetryHandler.ts`, `src/lib/session/globalSessionState.ts`. No code changes required. |
| **Risk level**                 | Low                                                                                                                                                     |
| **Recommendation**             | Upgrade. Trivial zero-risk patch.                                                                                                                       |

---

### Dev Dependencies (8 packages)

#### 4.17 `@semantic-release/npm` (13.1.2 -> 13.1.4)

| Field                | Details                                                             |
| -------------------- | ------------------------------------------------------------------- |
| **What changed**     | Internal `@actions/core` updated from v1 to v3 across two releases. |
| **Breaking changes** | None                                                                |
| **Risk level**       | Low                                                                 |
| **Recommendation**   | Upgrade. No API changes.                                            |

#### 4.18 `@sveltejs/kit` (2.53.2 -> 2.53.3)

| Field                | Details                                                              |
| -------------------- | -------------------------------------------------------------------- |
| **What changed**     | Fix to prevent overlapping file metadata in remote functions `form`. |
| **Breaking changes** | None                                                                 |
| **Risk level**       | Low                                                                  |
| **Recommendation**   | Upgrade. Patch-level bug fix.                                        |

#### 4.19 `@types/node` (25.3.1 -> 25.3.2)

| Field                | Details                                                        |
| -------------------- | -------------------------------------------------------------- |
| **What changed**     | Incremental type definition refinements for Node.js 25.x APIs. |
| **Breaking changes** | None                                                           |
| **Risk level**       | Low                                                            |
| **Recommendation**   | Upgrade. Type-only, no runtime impact.                         |

#### 4.20 `fastify` (5.7.2 -> 5.7.4)

| Field                | Details                                                                                                                                |
| -------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| **What changed**     | v5.7.3: Security fix for CVE-2026-25224 (GHSA-mrq3-vjjr-p77c) related to `Reply.send()` string serialization. v5.7.4: Follow-up patch. |
| **Breaking changes** | None                                                                                                                                   |
| **Codebase impact**  | Dev dependency used in `src/lib/server/` adapter layer.                                                                                |
| **Risk level**       | Low                                                                                                                                    |
| **Recommendation**   | Upgrade. Security patch.                                                                                                               |

#### 4.21 `svelte-check` (4.4.3 -> 4.4.4)

| Field                | Details                                                                                                                                      |
| -------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| **What changed**     | More robust `lang="ts"` detection, filename passed to `warningFilter`, Svelte file resolution under path alias in `--incremental/tsgo` mode. |
| **Breaking changes** | None                                                                                                                                         |
| **Risk level**       | Low                                                                                                                                          |
| **Recommendation**   | Upgrade. Path alias resolution improvement benefits NeuroLink's `$lib` aliases.                                                              |

#### 4.22 `tslib` (2.4.1 -> 2.8.1)

| Field                | Details                                                                                                                                                                                                                                                                                           |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **What changed**     | Major feature additions over 10 releases: `using`/`await using` helpers (2.6.0), `rewriteRelativeImportExtensions` helper (2.8.0), decorator init hook order reversed (2.5.1), improved `exports` field for `node16`/`bundler` resolution (2.5.1), non-enumerable keys in `__importStar` (2.8.1). |
| **Breaking changes** | Decorator `init` hook order reversed in 2.5.1 (matches spec). `exports` field restructured in 2.5.1.                                                                                                                                                                                              |
| **Codebase impact**  | Dev dependency only. `importHelpers` is NOT enabled in tsconfig, so tslib may not actually be used at runtime. No direct imports found in `src/`.                                                                                                                                                 |
| **Risk level**       | Medium (due to version jump size), but effectively **Low** since it appears unused at runtime.                                                                                                                                                                                                    |
| **Recommendation**   | Upgrade. Run full test suite after.                                                                                                                                                                                                                                                               |

#### 4.23 `typescript` (5.0.0 -> 5.9.3)

| Field                | Details                                                                                                                                                                                                                                                                                                                    |
| -------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **What changed**     | 10 minor versions spanning June 2023 to August 2025. Adds `using`/`await using` (5.2), `NoInfer<T>` (5.4), inferred type predicates (5.5), disallowed nullish/truthy checks (5.6), `--rewriteRelativeImportExtensions` (5.7), `--erasableSyntaxOnly` (5.8), `import defer` (5.9), and cumulative performance improvements. |
| **Breaking changes** | **Multiple.** Always-truthy/nullish checks now error (5.6). Stricter generic constraint null checks (5.9). Uninitialized variable checks (5.7). Conditional return type checks (5.8). `BuiltinIterator` renamed to `IteratorObject` (5.6). Numerous `lib.d.ts` changes. ArrayBuffer no longer supertype of Buffer (5.9).   |
| **Codebase impact**  | All `.ts` files potentially. TypeScript strict mode is already enabled. `skipLibCheck: true` mitigates `.d.ts` issues. Run `pnpm run check` after upgrade to identify all new errors.                                                                                                                                      |
| **Risk level**       | **High**                                                                                                                                                                                                                                                                                                                   |
| **Recommendation**   | Dedicate a separate effort. See Phase 4 in Recommended Upgrade Plan.                                                                                                                                                                                                                                                       |

#### 4.24 `@langfuse/otel` (4.6.1 -> latest)

| Field                | Details                                                                                                  |
| -------------------- | -------------------------------------------------------------------------------------------------------- |
| **What changed**     | Ongoing improvements to the Langfuse OpenTelemetry span processor.                                       |
| **Breaking changes** | None expected within minor versions.                                                                     |
| **Codebase impact**  | `src/lib/services/server/ai/observability/instrumentation.ts` -- `LangfuseSpanProcessor`. Single import. |
| **Risk level**       | Low                                                                                                      |
| **Recommendation**   | Upgrade alongside OpenTelemetry packages.                                                                |

#### 4.25 `@ai-sdk/provider` (3.0.8 -- already current)

| Field               | Details                                                                              |
| ------------------- | ------------------------------------------------------------------------------------ |
| **What changed**    | N/A -- already at latest.                                                            |
| **Codebase impact** | `src/lib/types/evaluationTypes.ts` -- `LanguageModelV3CallOptions` type-only import. |
| **Risk level**      | None                                                                                 |
| **Recommendation**  | No action needed.                                                                    |

---

## 5. New Features & Opportunities

Sorted by estimated business value to NeuroLink:

### High Value

| Feature                                  | Package                  | Version | Description                                                                                                                                    |
| ---------------------------------------- | ------------------------ | ------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| **Azure streaming tool call fix**        | `@ai-sdk/openai`         | 3.0.36  | Fixes `InvalidResponseDataError` for Azure AI Foundry/Mistral deployments during streaming tool calls. Resolves existing user-facing failures. |
| **Download size limit (DoS prevention)** | `@ai-sdk/provider-utils` | 4.0.15  | 2 GiB default size limit prevents memory exhaustion from malicious URLs. Security hardening for production.                                    |
| **gpt-5.3-codex phase parameter**        | `@ai-sdk/openai`         | 3.0.34  | Required for correct gpt-5.3-codex behavior. Dropping phase causes performance degradation.                                                    |
| **Google server-side MCP**               | `@google/genai`          | 1.43.0  | Pass MCP server configs directly to Google API instead of client-side tool handling. Aligns with NeuroLink's MCP architecture.                 |
| **Anthropic code execution tool**        | `@ai-sdk/anthropic`      | 3.0.48  | Sandbox code execution. Can be exposed as a built-in tool option for Anthropic users.                                                          |

### Medium Value

| Feature                              | Package                               | Version         | Description                                                                                     |
| ------------------------------------ | ------------------------------------- | --------------- | ----------------------------------------------------------------------------------------------- |
| **Gemini 3.1 models**                | `@ai-sdk/google`, `@google/genai`     | 3.0.32+, 1.43.0 | `gemini-3.1-flash-image-preview` and `gemini-3.1-pro-preview` models. Add to model definitions. |
| **Image Grounding for GoogleSearch** | `@google/genai`                       | 1.43.0          | Multimodal search capabilities via GoogleSearch tool.                                           |
| **GenAI telemetry conventions**      | `@opentelemetry/semantic-conventions` | 1.40.0          | Cache token attributes, MCP protocol attributes, tool call support for richer observability.    |
| **Proxy/fetch improvements**         | `undici`                              | 7.19-7.22       | 401 loop fix, proxy agent enhancements, HTTP/2 flow-control, stack trace preservation.          |

### Lower Value (Future)

| Feature                        | Package            | Version | Description                                                                |
| ------------------------------ | ------------------ | ------- | -------------------------------------------------------------------------- |
| **Inferred type predicates**   | `typescript`       | 5.5+    | `.filter()` calls now properly narrow types. Catches bugs.                 |
| **`NoInfer<T>`**               | `typescript`       | 5.4+    | Useful in factory/registry generics.                                       |
| **`using`/`await using`**      | `typescript`       | 5.2+    | Explicit resource management for MCP connections, Redis, etc.              |
| **`import defer`**             | `typescript`       | 5.9     | Deferred module evaluation aligns with NeuroLink's dynamic import pattern. |
| **Experimental video support** | `@ai-sdk/provider` | 3.0.7+  | `generateVideo` support in provider interface (experimental).              |

---

## 6. Recommended Upgrade Plan

### Phase 1: Zero-Risk Patches (Do Immediately)

**Estimated effort:** 30 minutes
**Strategy:** Batch update, run tests once

| Package                 | From    | To      | Reason                           |
| ----------------------- | ------- | ------- | -------------------------------- |
| `@ai-sdk/openai`        | 3.0.34  | 3.0.36  | Fixes Azure streaming failures   |
| `@ai-sdk/azure`         | 3.0.35  | 3.0.37  | Dependency alignment             |
| `@ai-sdk/anthropic`     | 3.0.47  | 3.0.48  | Code execution tool              |
| `@ai-sdk/google`        | 3.0.31  | 3.0.33  | Image model support              |
| `@ai-sdk/google-vertex` | 4.0.63  | 4.0.66  | Dependency alignment             |
| `@ai-sdk/mistral`       | 3.0.12  | 3.0.20  | **Security fix**                 |
| `ai`                    | 6.0.101 | 6.0.103 | Bug fix for duplicate tool parts |
| `nanoid`                | 5.1.5   | 5.1.6   | Trivial patch                    |
| `hono`                  | 4.12.2  | 4.12.3  | Memory leak fix                  |

**Verification:**

```bash
pnpm install
pnpm test
pnpm run test:providers
```

### Phase 2: Low-Risk Upgrades (Batch Together)

**Estimated effort:** 1 hour
**Strategy:** Batch update by group, run targeted tests

**Group A -- AWS SDK (upgrade together):**

| Package                             | From    | To      |
| ----------------------------------- | ------- | ------- |
| `@aws-sdk/client-bedrock`           | 3.998.0 | 3.999.0 |
| `@aws-sdk/client-bedrock-runtime`   | 3.998.0 | 3.999.0 |
| `@aws-sdk/client-sagemaker`         | 3.998.0 | 3.999.0 |
| `@aws-sdk/client-sagemaker-runtime` | 3.998.0 | 3.999.0 |

**Group B -- Core libs & Google:**

| Package                               | From     | To     |
| ------------------------------------- | -------- | ------ |
| `@google/genai`                       | 1.42.0   | 1.43.0 |
| `undici`                              | >=7.18.2 | 7.22.0 |
| `@opentelemetry/semantic-conventions` | 1.39.0   | 1.40.0 |

**Group C -- Dev dependencies:**

| Package                 | From   | To     |
| ----------------------- | ------ | ------ |
| `@semantic-release/npm` | 13.1.2 | 13.1.4 |
| `@sveltejs/kit`         | 2.53.2 | 2.53.3 |
| `@types/node`           | 25.3.1 | 25.3.2 |
| `fastify`               | 5.7.2  | 5.7.4  |
| `svelte-check`          | 4.4.3  | 4.4.4  |
| `@langfuse/otel`        | 4.6.1  | latest |

**Verification:**

```bash
pnpm install
pnpm test
pnpm run test:providers
pnpm run test:cli
pnpm run test:integration
pnpm run build
```

### Phase 3: Medium-Risk Upgrades (Test Carefully)

**Estimated effort:** 2 hours
**Strategy:** Upgrade one at a time, test after each

| Package | From  | To    | Key Concern                                                                                          |
| ------- | ----- | ----- | ---------------------------------------------------------------------------------------------------- |
| `tslib` | 2.4.1 | 2.8.1 | Decorator hook order, exports field changes. Likely unused at runtime (`importHelpers` not enabled). |

**Verification:**

```bash
pnpm install
pnpm run build:complete
pnpm test
pnpm run check
```

### Phase 4: High-Risk Upgrades (Dedicated Effort)

**Estimated effort:** 1-2 days
**Strategy:** Separate branch, dedicated type error resolution

| Package      | From  | To    | Key Concern                                                                      |
| ------------ | ----- | ----- | -------------------------------------------------------------------------------- |
| `typescript` | 5.0.0 | 5.9.3 | 10 minor versions with cumulative stricter checks. Will surface new type errors. |

**Migration steps:**

1. Create a dedicated branch: `chore/typescript-5.9-upgrade`
2. Update `typescript` to 5.9.3 in `package.json`
3. Run `pnpm install`
4. Run `tsc --noEmit` and catalog all new errors
5. Fix errors in order of severity (type errors first, then new warnings)
6. Pay special attention to:
   - Always-truthy/nullish checks (TS 5.6) -- likely the most common new errors
   - Uninitialized variable checks (TS 5.7)
   - Stricter conditional return types (TS 5.8)
   - Generic constraint null checks (TS 5.9)
   - ArrayBuffer/Buffer relationship changes (TS 5.9)
7. Run full test suite: `pnpm test`
8. Run full type check: `pnpm run check`
9. Run full build: `pnpm run build:complete`
10. Consider using `--noCheck` flag (TS 5.6) as a temporary escape hatch if needed during migration

---

## 7. Risk Mitigation

### Testing Strategy

| Phase   | Test Coverage                                        | Commands                                                                          |
| ------- | ---------------------------------------------------- | --------------------------------------------------------------------------------- |
| Phase 1 | Provider unit tests + full test suite                | `pnpm test && pnpm run test:providers`                                            |
| Phase 2 | Full test suite + CLI + integration + build          | `pnpm test && pnpm run test:cli && pnpm run test:integration && pnpm run build`   |
| Phase 3 | Full test suite + type check + complete build        | `pnpm test && pnpm run check && pnpm run build:complete`                          |
| Phase 4 | Type check (first), then full suite + complete build | `pnpm run check && pnpm test && pnpm run build:complete && pnpm run validate:all` |

### Rollback Plan

Each phase should be committed separately so rollback is straightforward:

1. **Phase 1-3 rollback:** Revert the commit, run `pnpm install`. These are all backward-compatible changes, so reverting is clean.
2. **Phase 4 rollback (TypeScript):** Since TypeScript 5.9 upgrade involves source code changes (fixing new type errors), keep the upgrade on a separate branch. If issues are discovered post-merge, revert both the `package.json` change and the type fix commits.

### Pre-Upgrade Checklist

- [ ] Ensure CI is green on current branch
- [ ] Create a snapshot of current `pnpm-lock.yaml`
- [ ] Run `pnpm run validate:all` before starting
- [ ] After each phase: `pnpm run validate:security`

### Post-Upgrade Validation

- [ ] All tests pass (`pnpm test`)
- [ ] Type checking passes (`pnpm run check`)
- [ ] Build succeeds (`pnpm run build:complete`)
- [ ] Security validation passes (`pnpm run validate:security`)
- [ ] ESLint within warning budget (300 src, 10 test)
- [ ] No new `no-explicit-any` errors in `src/`

---

_Generated by automated dependency research pipeline. Research sources: npm registry, GitHub changelogs, CVE databases, and codebase static analysis._
