/**
 * Wire formats accepted by `toNativeToolDeclarations` (src/lib/core/nativeToolFormat.ts).
 * `"input_schema"` is Anthropic's native Messages-API tool shape;
 * `"functionDeclarations"` is the @google/genai SDK shape shared by the
 * Gemini-family native providers (Google AI Studio, Vertex+Gemini).
 */
export type NativeToolFormat = "input_schema" | "functionDeclarations";

/** A single tool declaration in Anthropic's native `input_schema` wire format. */
export type NativeAnthropicToolDeclaration = {
  name: string;
  description?: string;
  input_schema: Record<string, unknown>;
  cache_control?: { type: "ephemeral" };
};
