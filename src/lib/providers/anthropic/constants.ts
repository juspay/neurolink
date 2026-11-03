// The Messages API version NeuroLink speaks. The SDK picks its own default per
// release (1.x moved to 2026-10-21), so a version bump must not move the wire
// version with it: the client sets this one explicitly.
export const ANTHROPIC_API_VERSION = "2023-06-01";

// Vertex pins the Anthropic API version in the request body, not in a header.
// The Vertex SDK copies its default into the body when none is set, so this is
// handed over explicitly for the same reason.
export const VERTEX_ANTHROPIC_VERSION = "vertex-2023-10-16";

export const ANTHROPIC_BETA_HEADERS = {
  "anthropic-beta": [
    "claude-code-20250219",
    "fine-grained-tool-streaming-2025-05-14",
  ].join(","),
};
