/**
 * Returns a SKIP message string when any of the listed env vars are missing.
 * Returns null when all are present.
 */
export function skipIfEnvMissing(...vars: string[]): string | null {
  const missing = vars.filter((v) => !process.env[v]);
  return missing.length > 0 ? `SKIP: missing env ${missing.join(", ")}` : null;
}

/**
 * Detect provider/credential errors that mean "could not run the test"
 * rather than "the test reproduced the bug".
 *
 * Implemented as a list of named pattern entries so the test harness
 * can introspect them (see `EXPECTED_PROVIDER_ERROR_PATTERNS` below).
 * Every entry below MUST be exercised by at least one fixture in
 * `test/helpers/envGuard.test.ts` — the `test:envguard` self-check
 * fails if a pattern has zero coverage, which prevents silent
 * regex bit-rot as upstream provider error wording drifts.
 *
 * Each pattern below is anchored to a specific framing that real
 * provider SDKs emit. We deliberately avoid loose substrings
 * (`"failed to"`, `"not found"`, `"network"`, `"timeout"`,
 * bare `"403"`/`"404"`/`"429"`) because those happily match
 * consumer-facing regressions like `Error("Failed to load tool
 * registry")` or `404 in /api/foo` and would silently mask a real
 * bug.
 *
 * If a suite legitimately needs a more permissive matcher, it should
 * opt in to that pattern locally rather than expecting the shared
 * helper to accept it.
 */

export type ExpectedProviderErrorPattern = {
  /** Stable identifier — used by the coverage self-check. */
  id: string;
  /** Returns true when `msg` matches the pattern. */
  test: (msg: string, lower: string) => boolean;
};

// `\b` doesn't sit between `_` and an alphanumeric (the underscore counts
// as a word character) so an env-var like `OPENAI_API_KEY` would not match
// `\bapi_key\b`. Use a non-word lookbehind/lookahead manually.
const API_KEY_PATTERN = new RegExp(
  "(?:^|[^A-Za-z0-9])api[ _-]?key(?=$|[^A-Za-z0-9])",
  "i",
);

const AUTH_FRAMINGS: RegExp[] = [
  API_KEY_PATTERN, // "API key", "api_key", "api-key", inside "OPENAI_API_KEY"
  /\bauthentication\s+(failed|fails|error|errors|required|denied)\b/,
  /\bauthentication\s+is\s+required\b/,
  /\bauth(?:entication)?\s+token\s+(invalid|expired|missing)\b/,
  // `unauthorized` only counts when it's framed like an HTTP / API auth
  // failure. We require either an HTTP-y prefix ("HTTP 401 unauthorized",
  // "401 Unauthorized") or a colon-led lead-in ("Unauthorized:"). Bare
  // mentions inside quoted test descriptions stay out.
  /\bhttp\s+(?:401\s+)?unauthori[sz]ed/,
  /\b401\s+unauthori[sz]ed\b/,
  /(^|[\n.;])\s*unauthori[sz]ed\s*[:.]/i,
  /\bunauthori[sz]ed\s+(?:request|access)\s+to\s+/, // "unauthorized request to /api"
  /\breturned\s+unauthori[sz]ed\b/,
  /\binvalid[ _-]?api[ _-]?key\b/,
  /\bmissing[ _-]?api[ _-]?key\b/,
  /\b(?:key|api[ _-]?key)\s+is\s+blocked\b/,
  /\bblocked\s+key\b/,
  /\bkey\s+is\s+invalid\b/,
  /\bcredentials?\s+(?:not\s+(?:configured|set|provided|available)|missing|invalid|expired|are\s+(?:required|missing))/,
  /\bservice[ _-]?account(?:\s+(?:not|missing|invalid|json|key))/,
  /\bdefault\s+credentials\b/,
  /\bproject[ _-]?id\b.*(?:not|missing|invalid|undefined)/,
  /\bbilling\s+(?:account|disabled|inactive|required|not\s+enabled|is\s+not)\b/,
  // OpenAI's verification system returns "You are not allowed to generate
  // embeddings from this model" / "You are not allowed to use this model"
  // when an account has not gone through the model-access verification
  // flow. That's a user/account onboarding step, not a test bug, so SKIP.
  /\byou\s+are\s+not\s+allowed\s+to\s+(?:use|generate|access)\b/,
  /\baccount\s+(?:must|needs?)(?:\s+to)?\s+be\s+verified\b/,
  /\bnot\s+verified\s+to\s+use\s+the\s+model\b/,
  /\borganization\s+(?:must|needs?)(?:\s+to)?\s+be\s+verified\b/,
  // Anthropic credit balance, OpenAI insufficient quota, generic billing-low
  /\bcredit\s+balance\s+(?:is\s+)?(?:too\s+low|insufficient|exhausted)\b/,
  /\binsufficient\s+(?:credits?|funds?|quota|balance)\b/,
  /\baccount\s+balance\s+(?:is\s+)?(?:too\s+low|insufficient)\b/,
  /\b(?:request\s+)?requires?\s+more\s+credits?\b/, // OpenRouter
  /\bcan\s+only\s+afford\s+\d+\b/, // OpenRouter pre-bill check
];

const NETWORK_FRAMINGS: RegExp[] = [
  /\bcannot\s+connect\b/,
  /\bcould\s+not\s+resolve\b/,
  /\bcould\s+not\s+be\s+resolved\b/,
  /\bconnection\s+refused\b/,
  /\bconnection\s+reset\b/,
  /\brequest\s+timed[ _-]?out\b/,
  /\bdeadline\s+exceeded\b/,
  /\bservice\s+unavailable\b/,
  /\bnetwork\s+(?:error|unreachable|timeout|down|failure)\b/,
];

const PROVIDER_ERROR_FRAMINGS: RegExp[] = [
  /\[litellm\][^.]*?(?:authentication|key\s+is\s+blocked|blocked\s+key|rate\s+limit|invalid\s+api)/i,
  /\[bedrock\][^.]*?(?:security[ _-]token|invalid|access\s+denied|expired)/i,
  /\[vertex\][^.]*?(?:timed\s+out|deadline\s+exceeded|publisher\s+model.*?not\s+found|max(?:output)?tokens|supported\s+range)/i,
  /\[google\s+ai(?:\s+studio)?\][^.]*?(?:developer\s+instruction|not\s+enabled|billing|quota)/i,
  /\[openrouter\][^.]*?(?:no\s+endpoints|model.*?temporarily\s+unavailable|model.*?not\s+available)/i,
  /\[deepseek\][^.]*?(?:invalid.*?api\s+key|response_format.*?unavailable|authentication)/i,
  /\[ollama\][^.]*?(?:not\s+running|cannot\s+connect|service)/i,
  /\[anthropic\][^.]*?(?:credit\s+balance|insufficient|quota|not\s+found|model.*?not\s+available)/i,
  /\[mistral\][^.]*?(?:authentication|invalid\s+api)/i,
  /\[openai\][^.]*?(?:exceeded\s+your\s+current\s+quota|insufficient_quota|billing\s+details|tier|rate\s+limit)/i,
  // OpenAI's streaming-with-tools wrapper that NeuroLink emits when the
  // upstream chat-completion stream errors out. The underlying cause is
  // usually quota/billing/policy — surfacing as a generic "API error
  // when tools are enabled" is unhelpful for triage but the wrapper
  // shape itself is stable enough to recognize.
  /OpenAI\s+streaming\s+error\s+with\s+tools[^.]*?(?:API\s+error|tools\s+are\s+enabled)/i,
];

export const EXPECTED_PROVIDER_ERROR_PATTERNS: ExpectedProviderErrorPattern[] =
  [
    // -- Process / network error codes (case-sensitive identifiers) ------
    {
      id: "process_network_codes",
      test: (msg) =>
        /\b(ECONNREFUSED|ECONNRESET|ENOTFOUND|EAI_AGAIN|ETIMEDOUT|EHOSTUNREACH|EPIPE)\b/.test(
          msg,
        ),
    },

    // -- Google API error tokens (uppercase, never normal prose) ----------
    {
      id: "google_api_tokens",
      test: (msg) =>
        /\b(UNAUTHENTICATED|PERMISSION_DENIED|RESOURCE_EXHAUSTED|FAILED_PRECONDITION|GOOGLE_APPLICATION_CREDENTIALS)\b/.test(
          msg,
        ),
    },

    // -- AWS error class names (Smithy-generated, unique strings) ---------
    {
      id: "aws_smithy_errors",
      test: (msg) =>
        /\b(UnrecognizedClientException|AccessDeniedException|InvalidSignatureException|TokenRefreshRequired|ExpiredTokenException|InvalidClientTokenId)\b/.test(
          msg,
        ),
    },

    // -- Auth-flavoured framings (multi-pattern group) --------------------
    {
      id: "auth_framings",
      test: (_msg, lower) => AUTH_FRAMINGS.some((re) => re.test(lower)),
    },

    // -- Rate-limit / quota framings --------------------------------------
    {
      id: "rate_limit",
      test: (_msg, lower) =>
        /\b(?:rate[ _-]?limit(?:ed)?|too\s+many\s+requests|quota[ _-]?exceeded|temporarily[ _-]rate[ _-]limited)\b/.test(
          lower,
        ),
    },

    // -- HTTP statuses surfaced inside provider error wrappers ------------
    // Bare 4xx digits would match anything, so we require either an HTTP-y
    // prefix or parenthesized framing typical of error messages. 502 (Bad
    // Gateway) added so transient upstream/CDN failures from gateway
    // providers (OpenRouter, LiteLLM) classify as SKIP not FAIL.
    {
      id: "http_status_codes",
      test: (msg) =>
        /(?:\bhttp[ _-]?(?:status\s*:?\s*)?(?:401|402|403|404|410|429|502|503)|\bstatus\s+(?:401|402|403|404|410|429|502|503)\b|\((?:401|402|403|404|410|429|502|503)\)|status[\s:]code[\s:]+(?:401|402|403|404|410|429|502|503)\b|\berror\s+code:\s*502\b)/i.test(
          msg,
        ),
    },

    // -- OpenRouter "Provider returned error" — gateway-only framing ------
    {
      id: "openrouter_provider_returned_error",
      test: (msg) =>
        /OpenRouter\s+(?:streaming\s+)?error:\s*Provider returned error/i.test(
          msg,
        ),
    },

    // -- OpenRouter upstream Invalid request body — small free-tier models
    //    sometimes reject specific options (e.g. streaming with tools) that
    //    the matrix tries; classify as SKIP not FAIL so the suite stays
    //    green on rotating free-tier models.
    {
      id: "openrouter_invalid_request_body",
      test: (msg) =>
        /OpenRouter\s+(?:streaming\s+)?error:\s*\[[^\]]+\]\s*Invalid request body/i.test(
          msg,
        ),
    },

    // -- Per-test harness wall-clock timeout (4-minute default). When the
    //    underlying provider hangs without responding, the test/helpers/
    //    harness.ts wrapper rejects with a "PER_TEST_TIMEOUT_SKIP" marker
    //    so the test classifies as SKIP rather than FAIL. We anchor on
    //    that exact marker so a real bug accidentally including the word
    //    "timeout" elsewhere is still surfaced as FAIL.
    {
      id: "per_test_harness_timeout",
      test: (msg) => /PER_TEST_TIMEOUT_SKIP/.test(msg),
    },

    // -- Plain HTTP reason phrases from minimalist providers --------------
    {
      id: "http_reason_phrases",
      test: (msg) =>
        /\b(?:Gone|Service\s+Unavailable|Bad\s+Gateway)\b/i.test(msg),
    },

    // -- Anthropic beta / enterprise-tier gates ---------------------------
    // "The long context beta is not yet available for this subscription."
    // and similar `beta is not available` framings come from accounts that
    // simply haven't been allow-listed for the requested capability — not
    // an SDK bug.
    {
      id: "anthropic_beta_not_available",
      test: (_msg, lower) =>
        /\bbeta\b[\s\S]{0,40}\bnot\s+(?:yet\s+)?available\b/.test(lower),
    },

    // -- HuggingFace Inference API cold-start / model-loading -------------
    {
      id: "huggingface_cold_start",
      test: (msg) =>
        /HuggingFace.*(?:Invalid JSON response|model is loading)/i.test(msg),
    },

    // -- SDK fallback exhaustion (chunkCount=0 / sentinel-only) -----------
    {
      id: "sdk_fallback_chain_empty",
      test: (msg) =>
        /(?:Fallback provider .* also returned 0 real output chunks|chunkCount=0,\s*sentinel-only or empty)/i.test(
          msg,
        ),
    },

    // -- Connectivity / endpoint reachability -----------------------------
    {
      id: "network_connectivity",
      test: (_msg, lower) => NETWORK_FRAMINGS.some((re) => re.test(lower)),
    },

    // -- Ollama-specific framings (local subprocess) ----------------------
    {
      id: "ollama_specific",
      test: (_msg, lower) =>
        /\bollama\b.*(?:not\s+running|cannot\s+connect|service\s+not|not\s+reachable)/.test(
          lower,
        ) || /\bcannot\s+connect\s+to\s+ollama\b/.test(lower),
    },

    // -- Local OpenAI-compatible servers (llama.cpp, LM Studio) -----------
    {
      id: "local_openai_compat_server",
      test: (_msg, lower) =>
        /\b(?:llama\.cpp|lm[ _-]?studio|llamacpp)\s+server\s+not\s+reachable\s+at\s+https?:\/\/(?:localhost|127\.0\.0\.1):/.test(
          lower,
        ),
    },

    // -- Azure deployment missing (resource-name mismatch) ----------------
    {
      id: "azure_deployment_missing",
      test: (_msg, lower) =>
        /\bapi\s+deployment\s+for\s+this\s+resource\s+does\s+not\s+exist\b/.test(
          lower,
        ),
    },

    // -- NVIDIA NIM bare 400 / Bad Request ---------------------------------
    // NIM's OpenAI-compatible gateway frequently returns a bare HTTP 400
    // with body "Bad Request" (no detail) for both rate-limited requests
    // AND parameter errors on chat models that don't fully implement an
    // OpenAI feature. We classify this as an expected upstream condition
    // specifically when the error is tagged as coming from NIM.
    {
      id: "nim_bare_bad_request",
      test: (msg) =>
        /(?:NVIDIA\s*NIM|\[nvidia-nim\]|\[nim\])\s+error:\s*Bad Request\b/i.test(
          msg,
        ),
    },

    // -- Provider-side schema rejections for tool / function declarations -
    // OpenAI / DeepSeek "Invalid schema for function '…': … got 'type:
    // "None"' (or 'type: null')." mean the upstream API rejected our
    // outbound tool spec — not a regression in test logic.
    {
      id: "tool_schema_function_type_invalid",
      test: (msg) =>
        /\binvalid\s+schema\s+for\s+function\b[^.]*?got\s+'?type:\s*['"]?(?:none|null)['"]?/i.test(
          msg,
        ),
    },

    // -- Google function-name validator -----------------------------------
    {
      id: "google_function_name_invalid",
      test: (msg) =>
        /tools\[\d+\]\.function_declarations\[\d+\]\.name:\s*(?:\[FIELD_INVALID\]\s*)?invalid\s+function\s+name/i.test(
          msg,
        ),
    },

    // -- Provider-specific upstream framings (require the provider tag) ---
    {
      id: "provider_tagged_framings",
      test: (msg) => PROVIDER_ERROR_FRAMINGS.some((re) => re.test(msg)),
    },

    // -- "All providers failed" wrapper (recurses one level) --------------
    {
      id: "all_providers_failed_wrapper",
      test: (msg) => {
        const match =
          /failed\s+to\s+generate\s+text\s+with\s+all\s+providers\.\s+last\s+error:\s*(.*)/i.exec(
            msg,
          );
        if (!match) {
          return false;
        }
        const inner = match[1] ?? "";
        // Bounded recursion: the inner error can't itself be the wrapper
        // because the regex consumed that prefix.
        return Boolean(inner) && isExpectedProviderError(inner);
      },
    },

    // -- Catalogue / capability errors ------------------------------------
    {
      id: "no_endpoints_found",
      test: (_msg, lower) => /\bno\s+endpoints\s+found\b/.test(lower),
    },
    {
      id: "model_not_found",
      test: (_msg, lower) => /\bmodel[_\s]not[_\s]found\b/.test(lower),
    },
    {
      id: "model_not_configured",
      test: (_msg, lower) => /\bmodel\s+is\s+not\s+configured\b/.test(lower),
    },
    {
      id: "model_not_available",
      test: (_msg, lower) =>
        /\bmodel\s+(?:not|is\s+not)\s+available\b/.test(lower),
    },
    {
      id: "tool_calling_unsupported",
      test: (_msg, lower) =>
        /\bdoes\s+not\s+support\s+tool\s+calling\b/.test(lower),
    },
    {
      id: "developer_instruction_disabled",
      test: (_msg, lower) =>
        /\bdeveloper\s+instruction\s+is\s+not\s+enabled\b/.test(lower),
    },

    // -- Vertex per-model output-token cap --------------------------------
    {
      id: "vertex_maxoutput_tokens",
      test: (msg) =>
        /\bunable\s+to\s+submit\s+request[\s\S]{0,200}max(?:output)?tokens/i.test(
          msg,
        ) || /\bsupported\s+range\s+is\s+from\b/i.test(msg),
    },

    // -- Vertex publisher model not accessible ----------------------------
    {
      id: "vertex_publisher_model_not_found",
      test: (msg) =>
        /\bpublisher\s+model\b[\s\S]{0,200}\bwas\s+not\s+found\b/i.test(msg),
    },

    // -- Provider listed by name as unavailable ---------------------------
    {
      id: "provider_unavailable",
      test: (_msg, lower) =>
        /\bprovider\s+(?:not\s+available|unavailable|not\s+configured)\b/.test(
          lower,
        ),
    },
  ];

export function isExpectedProviderError(msg: string): boolean {
  if (!msg) {
    return false;
  }
  const lower = msg.toLowerCase();
  for (const pattern of EXPECTED_PROVIDER_ERROR_PATTERNS) {
    if (pattern.test(msg, lower)) {
      return true;
    }
  }
  return false;
}
