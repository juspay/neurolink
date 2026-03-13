/**
 * NeuroLink Documentation Redirects Configuration
 *
 * Comprehensive redirect rules for:
 * - Legacy MkDocs paths to new Docusaurus /docs/ paths
 * - Section reorganization redirects
 * - Provider documentation redirects
 * - External service redirects (GitHub, NPM, etc.)
 *
 * @see https://docusaurus.io/docs/api/plugins/@docusaurus/plugin-client-redirects
 */

import type { PluginOptions } from "@docusaurus/plugin-client-redirects";

// ============================================================================
// Static Redirect Rules - Organized by Category
// ============================================================================

/**
 * Legacy MkDocs paths that need to redirect to new /docs/ structure
 * These handle old documentation links that may exist in external resources
 */
const legacyMkDocsRedirects: PluginOptions["redirects"] = [
  // Root-level legacy paths
  // Note: /getting-started is handled by createRedirects dynamically
  { from: "/installation", to: "/docs/getting-started/installation" },
  { from: "/quickstart", to: "/docs/getting-started/quick-start" },
  { from: "/quick-start", to: "/docs/getting-started/quick-start" },

  // API/SDK reference paths
  { from: "/api-reference", to: "/docs/sdk/api-reference" },
  { from: "/api", to: "/docs/sdk/api-reference" },
  { from: "/sdk-reference", to: "/docs/sdk" },
  // Note: /sdk is handled by createRedirects dynamically

  // CLI reference paths
  // Note: /cli-reference redirects to /docs/cli (legacy CLI reference page)
  { from: "/cli-reference", to: "/docs/cli" },
  // Note: /cli is handled by createRedirects dynamically
  { from: "/commands", to: "/docs/cli/commands" },
  { from: "/cli-commands", to: "/docs/cli/commands" },
  { from: "/cli-examples", to: "/docs/cli/examples" },
  { from: "/cli-advanced", to: "/docs/cli/advanced" },

  // Provider setup paths (common MkDocs pattern)
  { from: "/providers", to: "/docs/getting-started/provider-setup" },
  { from: "/provider-setup", to: "/docs/getting-started/provider-setup" },
  { from: "/configuration", to: "/docs/getting-started/environment-variables" },
  { from: "/environment", to: "/docs/getting-started/environment-variables" },
  { from: "/env", to: "/docs/getting-started/environment-variables" },
];

/**
 * Section reorganization redirects
 * Handle paths that moved during documentation restructuring
 */
const sectionReorganizationRedirects: PluginOptions["redirects"] = [
  // Multimodal feature redirects
  { from: "/multimodal", to: "/docs/features/multimodal" },
  { from: "/docs/multimodal", to: "/docs/features/multimodal" },
  { from: "/vision", to: "/docs/about/vision" },
  { from: "/docs/vision", to: "/docs/about/vision" },
  { from: "/images", to: "/docs/features/multimodal" },
  { from: "/pdf", to: "/docs/features/pdf-support" },
  { from: "/docs/pdf", to: "/docs/features/pdf-support" },
  { from: "/csv", to: "/docs/features/csv-support" },
  { from: "/docs/csv", to: "/docs/features/csv-support" },
  { from: "/audio", to: "/docs/features/audio-input" },
  { from: "/docs/audio", to: "/docs/features/audio-input" },
  { from: "/tts", to: "/docs/features/tts" },
  { from: "/docs/tts", to: "/docs/features/tts" },
  { from: "/speech", to: "/docs/features/speech-agents" },
  { from: "/docs/speech", to: "/docs/features/speech-agents" },

  // MCP (Model Context Protocol) redirects
  { from: "/mcp", to: "/docs/mcp/overview" },
  { from: "/mcp-tools", to: "/docs/features/mcp-tools-showcase" },
  { from: "/tools", to: "/docs/features/mcp-tools-showcase" },
  { from: "/docs/tools", to: "/docs/features/mcp-tools-showcase" },
  { from: "/mcp-integration", to: "/docs/mcp/integration" },
  { from: "/mcp-http", to: "/docs/mcp/http-transport" },
  { from: "/mcp-testing", to: "/docs/mcp/testing" },
  { from: "/mcp-optimization", to: "/docs/mcp/optimization" },

  // Memory and conversation redirects
  { from: "/memory", to: "/docs/memory/conversation" },
  { from: "/conversation", to: "/docs/features/conversation-history" },
  { from: "/conversation-history", to: "/docs/features/conversation-history" },
  { from: "/redis", to: "/docs/getting-started/redis-quickstart" },
  { from: "/summarization", to: "/docs/memory/summarization" },

  // Streaming redirects
  { from: "/streaming", to: "/docs/features/regional-streaming" },
  { from: "/docs/streaming", to: "/docs/features/regional-streaming" },
  { from: "/regional-streaming", to: "/docs/features/regional-streaming" },

  // Structured output redirects
  { from: "/structured-output", to: "/docs/features/structured-output" },
  { from: "/json-output", to: "/docs/features/structured-output" },
  { from: "/schema", to: "/docs/features/structured-output" },

  // Image/video generation redirects
  { from: "/image-generation", to: "/docs/features/image-generation" },
  { from: "/video-generation", to: "/docs/features/video-generation" },
  { from: "/video", to: "/docs/features/video-generation" },
  { from: "/ppt-generation", to: "/docs/features/ppt-generation" },
  { from: "/ppt", to: "/docs/features/ppt-generation" },
  { from: "/powerpoint", to: "/docs/features/ppt-generation" },

  // Enterprise features redirects
  { from: "/hitl", to: "/docs/features/hitl" },
  { from: "/human-in-the-loop", to: "/docs/features/hitl" },
  { from: "/guardrails", to: "/docs/features/guardrails" },
  { from: "/docs/guardrails", to: "/docs/features/guardrails" },
  { from: "/enterprise", to: "/docs/guides/enterprise/multi-region" },
  { from: "/docs/enterprise", to: "/docs/guides/enterprise/multi-region" },

  // Thinking/reasoning redirects
  { from: "/thinking", to: "/docs/features/thinking-configuration" },
  { from: "/thinking-level", to: "/docs/features/thinking-configuration" },
  { from: "/extended-thinking", to: "/docs/features/thinking-configuration" },

  // Middleware redirects
  { from: "/middleware", to: "/docs/workflows/middleware" },
  { from: "/docs/middleware", to: "/docs/workflows/middleware" },

  // Analytics/observability redirects (redirect to telemetry as main observability page)
  { from: "/analytics", to: "/docs/observability/telemetry" },
  { from: "/docs/analytics", to: "/docs/observability/telemetry" },
  { from: "/docs/reference/analytics", to: "/docs/observability/telemetry" },
  { from: "/observability", to: "/docs/observability/telemetry" },
  { from: "/telemetry", to: "/docs/observability/telemetry" },

  // Evaluation redirects
  { from: "/evaluation", to: "/docs/features/auto-evaluation" },
  { from: "/auto-eval", to: "/docs/features/auto-evaluation" },
];

/**
 * Provider-specific documentation redirects
 * Map old provider paths to new consolidated provider documentation
 *
 * Actual provider files:
 * - aws-bedrock.md, azure-openai.md, google-ai.md, google-vertex.md
 * - huggingface.md, litellm.md, mistral.md, ollama.md
 * - openai-compatible.md, openrouter.md, sagemaker.md
 */
const providerRedirects: PluginOptions["redirects"] = [
  // Google AI providers
  {
    from: "/docs/providers/google",
    to: "/docs/getting-started/providers/google-ai",
  },
  {
    from: "/docs/providers/google-ai",
    to: "/docs/getting-started/providers/google-ai",
  },
  {
    from: "/docs/providers/google-ai-studio",
    to: "/docs/getting-started/providers/google-ai",
  },
  {
    from: "/docs/providers/gemini",
    to: "/docs/getting-started/providers/google-ai",
  },
  {
    from: "/docs/providers/vertex",
    to: "/docs/getting-started/providers/google-vertex",
  },
  {
    from: "/docs/providers/vertex-ai",
    to: "/docs/getting-started/providers/google-vertex",
  },

  // Azure OpenAI
  {
    from: "/docs/providers/azure",
    to: "/docs/getting-started/providers/azure-openai",
  },

  // AWS providers
  {
    from: "/docs/providers/bedrock",
    to: "/docs/getting-started/providers/aws-bedrock",
  },
  {
    from: "/docs/providers/aws-bedrock",
    to: "/docs/getting-started/providers/aws-bedrock",
  },
  {
    from: "/docs/providers/amazon-bedrock",
    to: "/docs/getting-started/providers/aws-bedrock",
  },
  {
    from: "/docs/providers/sagemaker",
    to: "/docs/getting-started/providers/sagemaker",
  },
  {
    from: "/docs/providers/aws-sagemaker",
    to: "/docs/getting-started/providers/sagemaker",
  },
  {
    from: "/docs/providers/amazon-sagemaker",
    to: "/docs/getting-started/providers/sagemaker",
  },

  // Other providers
  {
    from: "/docs/providers/mistral",
    to: "/docs/getting-started/providers/mistral",
  },
  {
    from: "/docs/providers/ollama",
    to: "/docs/getting-started/providers/ollama",
  },
  {
    from: "/docs/providers/huggingface",
    to: "/docs/getting-started/providers/huggingface",
  },
  {
    from: "/docs/providers/hugging-face",
    to: "/docs/getting-started/providers/huggingface",
  },
  {
    from: "/docs/providers/litellm",
    to: "/docs/getting-started/providers/litellm",
  },
  {
    from: "/docs/providers/openrouter",
    to: "/docs/getting-started/providers/openrouter",
  },
  {
    from: "/docs/providers/openai-compatible",
    to: "/docs/getting-started/providers/openai-compatible",
  },

  // Legacy provider paths without /docs prefix -> provider index page
  { from: "/openai", to: "/docs/getting-started/providers" },
  { from: "/anthropic", to: "/docs/getting-started/providers" },
  { from: "/claude", to: "/docs/getting-started/providers" },
  { from: "/gemini", to: "/docs/getting-started/providers/google-ai" },
  { from: "/google-ai", to: "/docs/getting-started/providers/google-ai" },
  { from: "/vertex", to: "/docs/getting-started/providers/google-vertex" },
  { from: "/azure", to: "/docs/getting-started/providers/azure-openai" },
  { from: "/bedrock", to: "/docs/getting-started/providers/aws-bedrock" },
  { from: "/sagemaker", to: "/docs/getting-started/providers/sagemaker" },
  { from: "/mistral", to: "/docs/getting-started/providers/mistral" },
  { from: "/ollama", to: "/docs/getting-started/providers/ollama" },
  { from: "/huggingface", to: "/docs/getting-started/providers/huggingface" },
  { from: "/litellm", to: "/docs/getting-started/providers/litellm" },
  { from: "/openrouter", to: "/docs/getting-started/providers/openrouter" },

  // Provider comparison/reference redirects
  {
    from: "/provider-comparison",
    to: "/docs/reference/provider-comparison",
  },
  {
    from: "/docs/provider-comparison",
    to: "/docs/reference/provider-comparison",
  },
  {
    from: "/provider-capabilities",
    to: "/docs/reference/provider-capabilities-audit",
  },
];

/**
 * Examples and tutorials redirects
 */
const examplesRedirects: PluginOptions["redirects"] = [
  // Examples section
  { from: "/examples", to: "/docs/examples" },
  { from: "/cookbook", to: "/docs/cookbook" },
  { from: "/recipes", to: "/docs/cookbook" },

  // Tutorials
  { from: "/tutorials", to: "/docs/tutorials" },
  { from: "/tutorial", to: "/docs/tutorials" },
  { from: "/rag", to: "/docs/tutorials/rag" },
  { from: "/rag-tutorial", to: "/docs/tutorials/rag" },
  { from: "/chat-app", to: "/docs/tutorials/chat-app" },
  { from: "/chat-tutorial", to: "/docs/tutorials/chat-app" },

  // Guides
  { from: "/guides", to: "/docs/guides" },
  { from: "/how-to", to: "/docs/guides" },
];

/**
 * Reference and troubleshooting redirects
 */
const referenceRedirects: PluginOptions["redirects"] = [
  // Reference documentation
  { from: "/reference", to: "/docs/reference" },
  { from: "/faq", to: "/docs/reference/faq" },
  { from: "/docs/faq", to: "/docs/reference/faq" },
  { from: "/troubleshooting", to: "/docs/reference/troubleshooting" },
  { from: "/docs/troubleshooting", to: "/docs/reference/troubleshooting" },
  { from: "/errors", to: "/docs/reference/error-codes" },
  { from: "/error-codes", to: "/docs/reference/error-codes" },

  // Development documentation
  { from: "/development", to: "/docs/development" },
  { from: "/architecture", to: "/docs/development/architecture" },
  { from: "/docs/architecture", to: "/docs/development/architecture" },
  { from: "/testing", to: "/docs/development/testing" },
  { from: "/docs/testing", to: "/docs/development/testing" },
  { from: "/contributing", to: "/docs/community/contributing" },
  { from: "/docs/contributing", to: "/docs/community/contributing" },

  // Advanced documentation
  { from: "/advanced", to: "/docs/advanced" },
  { from: "/factory-patterns", to: "/docs/advanced/factory-patterns" },

  // Community/changelog
  { from: "/changelog", to: "/docs/community/changelog" },
  { from: "/docs/changelog", to: "/docs/community/changelog" },
  { from: "/releases", to: "/docs/community/changelog" },
  { from: "/release-notes", to: "/docs/community/changelog" },
];

/**
 * SDK integration and framework redirects
 */
const integrationRedirects: PluginOptions["redirects"] = [
  // Framework integrations
  { from: "/nestjs", to: "/docs/sdk/nestjs-integration" },
  { from: "/nest", to: "/docs/sdk/nestjs-integration" },
  { from: "/framework-integration", to: "/docs/sdk/framework-integration" },
  { from: "/frameworks", to: "/docs/sdk/framework-integration" },

  // Custom tools
  { from: "/custom-tools", to: "/docs/sdk/custom-tools" },
  { from: "/tools-guide", to: "/docs/sdk/custom-tools-guide" },
  { from: "/tool-development", to: "/docs/sdk/custom-tools-guide" },

  // Office documents
  { from: "/office", to: "/docs/features/office-documents" },
  { from: "/office-documents", to: "/docs/features/office-documents" },
  { from: "/docx", to: "/docs/features/office-documents" },
  { from: "/excel", to: "/docs/features/office-documents" },
  { from: "/pptx", to: "/docs/features/office-documents" },
];

/**
 * Demos and visual content redirects
 */
const demoRedirects: PluginOptions["redirects"] = [
  { from: "/demos", to: "/docs/demos" },
  { from: "/demo", to: "/docs/demos" },
  { from: "/videos", to: "/docs/demos/videos" },
  { from: "/screenshots", to: "/docs/demos/screenshots" },
  // Note: /visual-demos is handled by createRedirects dynamically
];

/**
 * Workflow redirects
 */
const workflowRedirects: PluginOptions["redirects"] = [
  { from: "/orchestration", to: "/docs/workflows/orchestration" },
  { from: "/ai-orchestration", to: "/docs/workflows/ai-orchestration" },
  { from: "/error-handling", to: "/docs/workflows/error-handling" },
  { from: "/custom-middleware", to: "/docs/workflows/custom-middleware" },
];

/**
 * Deployment redirects
 */
const deploymentRedirects: PluginOptions["redirects"] = [
  { from: "/deployment", to: "/docs/deployment/configuration" },
  { from: "/performance", to: "/docs/deployment/performance" },
  { from: "/enterprise-proxy", to: "/docs/deployment/enterprise-proxy" },
];

// ============================================================================
// Combine All Static Redirects
// ============================================================================

export const staticRedirects: PluginOptions["redirects"] = [
  ...legacyMkDocsRedirects,
  ...sectionReorganizationRedirects,
  ...providerRedirects,
  ...examplesRedirects,
  ...referenceRedirects,
  ...integrationRedirects,
  ...demoRedirects,
  ...workflowRedirects,
  ...deploymentRedirects,
];

// ============================================================================
// Dynamic Redirect Function
// ============================================================================

export function createRedirects(existingPath: string): string[] | undefined {
  // Only process paths that start with /docs/
  if (!existingPath.startsWith("/docs/")) {
    return undefined;
  }

  // Skip certain paths that shouldn't have dynamic redirects
  // to avoid conflicts with static redirects or duplicate warnings
  const skipPatterns = [
    "/docs/getting-started", // handled by static redirects
    "/docs/getting-started/providers",
    "/docs/reference",
    "/docs/community",
    "/docs/development",
    "/docs/advanced",
    "/docs/features",
    "/docs/mcp",
    "/docs/memory",
    "/docs/observability",
    "/docs/deployment",
    "/docs/workflows",
    "/docs/cookbook",
    "/docs/tutorials",
    "/docs/examples",
    "/docs/demos",
    "/docs/guides",
    "/docs/sdk",
    "/docs/cli",
    "/docs/cli-reference", // handled by static redirect
    "/docs/visual-demos", // top-level pages may have static redirects
  ];

  // Check if this path starts with any skip pattern
  const shouldSkip = skipPatterns.some(
    (pattern) =>
      existingPath === pattern || existingPath.startsWith(pattern + "/"),
  );

  if (shouldSkip) {
    return undefined;
  }

  const redirects: string[] = [];

  // Remove /docs prefix to get the equivalent non-docs path
  const pathWithoutDocs = existingPath.replace(/^\/docs/, "");

  // Skip if the path without /docs would be empty or just "/"
  if (pathWithoutDocs && pathWithoutDocs !== "/") {
    // Add the non-docs version as a redirect source
    redirects.push(pathWithoutDocs);
  }

  // Handle hyphen/underscore variations for top-level paths only
  if (
    pathWithoutDocs &&
    pathWithoutDocs.includes("-") &&
    pathWithoutDocs.split("/").length <= 2
  ) {
    const underscoreVersion = pathWithoutDocs.replace(/-/g, "_");
    if (underscoreVersion !== pathWithoutDocs) {
      redirects.push(underscoreVersion);
    }
  }

  // Filter out any empty strings or duplicates
  const uniqueRedirects = [...new Set(redirects.filter(Boolean))];

  return uniqueRedirects.length > 0 ? uniqueRedirects : undefined;
}

// ============================================================================
// Plugin Configuration Export
// ============================================================================

/**
 * Complete redirects plugin configuration
 * Import this in docusaurus.config.ts
 */
export const redirectsPluginConfig: [
  string,
  Pick<PluginOptions, "redirects" | "createRedirects">,
] = [
  "@docusaurus/plugin-client-redirects",
  {
    redirects: staticRedirects,
    createRedirects,
  },
];

export default redirectsPluginConfig;
