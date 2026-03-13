# Core Libraries Upgrade Research

Research date: 2026-02-27

---

## 1. undici (7.18.2 -> 7.22.0)

**Risk Level: LOW** (no breaking changes in minor/patch versions; security fix already in baseline)

### Security Fixes (already in 7.18.2 baseline)

- **CVE-2026-22036** (CVSS 3.7, Low): Unbounded decompression chain in HTTP responses via `Content-Encoding`. A malicious server could insert thousands of compression steps leading to high CPU usage and excessive memory allocation. Fixed in 7.18.2 by limiting the Content-Encoding chain to 5 levels. **NeuroLink already has this fix** since the current minimum is `>=7.18.2`.

### Releases Between 7.18.2 and 7.22.0

**v7.19.0** (Jan 21, 2025):

- Fixed FormData body handling in RetryAgent
- Exposed HTTP/2 flow-control options (new feature)
- Implemented origin normalization in MockAgent
- Fixed WebSocket basic authentication
- Added `origins` option for cache whitelist filtering
- Fixed WebSocketStream open error handling

**v7.19.1** (Jan 24, 2025):

- Fixed fetch 401 loop issue (bug where fetch would endlessly retry on 401)

**v7.19.2** (Jan 27, 2025):

- Returned 401 response instead of network error (important for error handling)
- Decoded HTTP headers as latin1 instead of utf8 (spec compliance)
- Fixed flaky H2 stream end handling on macOS

**v7.20.0** (Feb 1, 2025):

- Preserved fetch stack traces (better debugging)
- Exposed `statusText` in request() ResponseData
- Fixed MockAgent delayed response handling with AbortSignal
- Fixed `onParserTimeout` undefined access

**v7.21.0** (Feb 6, 2025):

- Added `pingInterval` feature for PING frame dispatching (keep-alive)
- Fixed clientTtl cleanup race condition in Agent
- Fixed error stream handling (error instead of cancel)
- Fixed undefined `__filename` handling in bundled environments
- Set finalizer only for fetch responses (memory optimization)

**v7.22.0** (Feb 13, 2025):

- Fixed URL credential handling per WHATWG standard
- Enhanced proxy agent to strip leading dots and asterisks
- Routed WebSocket upgrades through `onRequestUpgrade` callback
- Prevented deduplication of non-safe HTTP methods by default
- Added async cache store support for revalidation

### Breaking Changes

None in 7.19.0 - 7.22.0. All are additive features and bug fixes within the v7 semver range.

### NeuroLink Usage

- `src/lib/proxy/proxyFetch.ts` - ProxyAgent, fetch (dynamic imports)
- `src/lib/proxy/awsProxyIntegration.ts` - ProxyAgent, fetch (dynamic imports)
- `src/lib/utils/messageBuilder.ts` - `getGlobalDispatcher`, `interceptors`, `request`
- `src/lib/utils/fileDetector.ts` - `getGlobalDispatcher`, `interceptors`, `request`
- `src/lib/providers/googleVertex.ts` - referenced in comments for keep-alive

### Impact Assessment

- The 401 loop fix (7.19.1) and proper 401 response (7.19.2) are valuable for proxy/fetch reliability.
- Proxy agent enhancements (7.22.0) directly benefit `proxyFetch.ts` and `awsProxyIntegration.ts`.
- HTTP/2 flow-control options (7.19.0) could benefit Vertex AI streaming connections.
- Stack trace preservation (7.20.0) improves debugging of fetch failures.
- `__filename` bundling fix (7.21.0) helps bundled deployments.
- **No code changes needed** - all improvements are backward-compatible.

### Recommendation

**Upgrade recommended.** Many quality-of-life fixes directly relevant to NeuroLink's proxy and fetch usage. No risk of breakage.

---

## 2. @google/genai (1.42.0 -> 1.43.0)

**Risk Level: LOW** (minor feature additions, one breaking change only affects experimental Interactions API)

### Changes in 1.43.0 (Released Feb 26, 2026)

**New Features:**

- Added `gemini-3.1-pro-preview` to list of models in Interactions
- Added Image Grounding support to GoogleSearch tool
- Enabled server-side MCP and disabled all other AFC (Alternative Function Calling) when server-side MCP is configured
- Support for more image sizes and resolutions

**Breaking Change (experimental only):**

- Changed `interactions` media mime type from string to enum. This only affects the experimental Interactions API, not the core generate/stream APIs.

### NeuroLink Usage

- `src/lib/providers/googleNativeGemini3.ts` - Main Gemini 3 provider
- `src/lib/providers/googleVertex.ts` - Vertex AI provider
- `src/lib/providers/googleAiStudio.ts` - Google AI Studio provider
- `src/lib/utils/schemaConversion.ts` - Schema conversion utilities
- `src/lib/adapters/video/videoAnalyzer.ts` - Video analysis

### Impact Assessment

- **Server-side MCP support** is directly relevant since NeuroLink has extensive MCP integration. This could enable passing MCP server configs directly to the Google API rather than handling tool calls client-side.
- **Image Grounding** for GoogleSearch tool adds capabilities for multimodal search.
- **Gemini 3.1 Pro Preview** model can be exposed in NeuroLink's model list.
- **Breaking change does NOT affect NeuroLink** - the Interactions API (experimental) is not used in the codebase; NeuroLink uses the standard generate/stream APIs.

### Recommendation

**Upgrade recommended.** Server-side MCP support is a valuable new capability. No breaking changes affect NeuroLink's usage patterns.

---

## 3. @opentelemetry/semantic-conventions (1.39.0 -> 1.40.0)

**Risk Level: LOW** (NeuroLink only uses two stable attributes that are unchanged)

### Changes in 1.40.0

**Stable Changes:**

- Added `ATTR_SERVICE_INSTANCE_ID` (service.instance.id) - NEW
- Added `ATTR_SERVICE_NAMESPACE` (service.namespace) - NEW

**Unstable/Incubating Changes (157 additions, 40 deprecations):**

- New GenAI attributes: `gen_ai.agent.version`, cache token attributes (`gen_ai.usage.cache_read.input_tokens`, `gen_ai.usage.cache_creation.input_tokens`), enhanced tool call support
- New Kubernetes service attributes (17 new k8s.service.\* attributes)
- New cloud provider attributes: Akamai Cloud, Hetzner, Vultr, GCP Agent Engine
- New Oracle database-specific attributes
- New OpenAI API type attribute
- MCP protocol support attributes
- `pprof` scope attributes
- New domain-specific exception events (db, rpc, http)

**Deprecations (unstable only):**

- `ATTR_ERROR_MESSAGE` deprecated in favor of domain-specific error message attributes
- `METRIC_SYSTEM_MEMORY_SHARED` renamed to `system.memory.linux.shared`
- Several RPC message-related metrics removed without replacement
- Removed `network.protocol.name`, `network.protocol.version`, `network.transport` from RPC spans

### NeuroLink Usage

NeuroLink uses ONLY two attributes from this package:

- `ATTR_SERVICE_NAME` - in `src/lib/telemetry/telemetryService.ts` and `src/lib/services/server/ai/observability/instrumentation.ts`
- `ATTR_SERVICE_VERSION` - in both files above

Both are **stable** attributes that are unchanged in 1.40.0.

### Impact Assessment

- **Zero impact on existing code** - the two attributes used by NeuroLink (`ATTR_SERVICE_NAME`, `ATTR_SERVICE_VERSION`) are stable and unmodified.
- **Future opportunity:** The new GenAI semantic convention attributes (`gen_ai.agent.version`, cache tokens, tool call support, MCP protocol) are directly relevant to NeuroLink's telemetry and could be adopted for richer observability.
- **No code changes needed** for the upgrade itself.

### Recommendation

**Upgrade recommended.** Zero risk, and the new GenAI/MCP semantic conventions provide future opportunities for enhanced telemetry.

---

## 4. hono (4.12.2 -> 4.12.3)

**Risk Level: LOW** (patch release with only bug fixes)

### Security Fix in 4.12.2 (already in baseline)

- **CVE-2026-27700** (CVSS 8.2, HIGH): Authentication bypass by IP spoofing in AWS Lambda ALB `conninfo`. The `getConnInfo()` function incorrectly selected the first value from `X-Forwarded-For` header, but ALB appends the real IP at the end. An attacker could spoof the first IP to bypass IP-based restrictions.
  - **NeuroLink is NOT affected:** The codebase does not use hono's AWS Lambda adapter, `getConnInfo()`, or `ipRestriction` middleware. The Hono adapter (`src/lib/server/adapters/honoAdapter.ts`) uses standard Hono features: cors, HTTPException, logger, secureHeaders, streamSSE, and timeout.

### Changes in 4.12.3 (Released Feb 26, 2026)

**Bug Fixes:**

- Fixed type diff bug in form data parsing (validator)
- Replaced bitwise OR with `Math.floor` for safer JWT timestamp handling
- Fixed `JwtVariables` compatibility with `ContextVariableMap`
- Removed DOM type dependencies from `ClientResponse` and request methods
- Corrected middleware type definitions
- **Fixed memory leak** caused by mutating options object in JWT operations

### NeuroLink Usage

- `src/lib/server/adapters/honoAdapter.ts` - Main server adapter using Hono, cors, HTTPException, logger, secureHeaders, streamSSE, timeout
- `src/cli/commands/serve.ts` and `src/cli/commands/server.ts` - CLI serve commands
- `src/lib/server/types.ts` - Type definitions
- `src/lib/server/factory/serverAdapterFactory.ts` - Server factory

### Impact Assessment

- The memory leak fix in JWT operations is beneficial if any downstream middleware uses JWT verification.
- Removal of DOM type dependencies improves TypeScript compatibility in Node.js-only environments.
- Type corrections improve DX for Hono middleware consumers.
- **No code changes needed.**

### Recommendation

**Upgrade recommended.** Bug fixes including a memory leak fix and improved type safety. Zero risk.

---

## 5. nanoid (5.1.5 -> 5.1.6)

**Risk Level: LOW** (patch release with a single bug fix)

### Changes in 5.1.6

**Bug Fix:**

- Fixed infinite loop when passing `0` as size to `customAlphabet()`. Previously, `customAlphabet(alphabet)(0)` would hang indefinitely.

### NeuroLink Usage

- `src/lib/core/modules/StreamHandler.ts` - `nanoid()` for stream request IDs
- `src/lib/core/modules/TelemetryHandler.ts` - `nanoid()` for session IDs
- `src/lib/session/globalSessionState.ts` - `nanoid()` for global session IDs

### Impact Assessment

- NeuroLink always calls `nanoid()` without arguments (default 21-character IDs), never with `customAlphabet`. The fixed bug cannot affect NeuroLink.
- Still a good practice to upgrade to get the fix.
- **No code changes needed.**

### Recommendation

**Upgrade recommended.** Trivial, zero-risk patch.

---

## Summary Table

| Package                             | From   | To     | Risk | Breaking Changes                  | Security                              | Action                              |
| ----------------------------------- | ------ | ------ | ---- | --------------------------------- | ------------------------------------- | ----------------------------------- |
| undici                              | 7.18.2 | 7.22.0 | LOW  | None                              | CVE-2026-22036 (already fixed)        | Upgrade - proxy/fetch improvements  |
| @google/genai                       | 1.42.0 | 1.43.0 | LOW  | Interactions API enum (N/A to us) | None                                  | Upgrade - server MCP support        |
| @opentelemetry/semantic-conventions | 1.39.0 | 1.40.0 | LOW  | None (stable attrs unchanged)     | None                                  | Upgrade - GenAI semconv opportunity |
| hono                                | 4.12.2 | 4.12.3 | LOW  | None                              | CVE-2026-27700 (in 4.12.2, N/A to us) | Upgrade - memory leak fix           |
| nanoid                              | 5.1.5  | 5.1.6  | LOW  | None                              | None                                  | Upgrade - trivial patch             |

### Overall Assessment

All five packages are safe to upgrade with no required code changes. The most impactful upgrades are:

1. **undici 7.22.0** - Numerous bug fixes directly relevant to NeuroLink's proxy and fetch infrastructure (401 handling, proxy agent improvements, stack trace preservation, HTTP/2 flow-control).
2. **@google/genai 1.43.0** - Server-side MCP support is a significant new capability that aligns with NeuroLink's MCP architecture.
3. **@opentelemetry/semantic-conventions 1.40.0** - Opens the door for GenAI-specific telemetry attributes.
4. **hono 4.12.3** and **nanoid 5.1.6** - Low-impact quality patches.
