import type { ProviderModelManifest } from "../../types/index.js";

// The capability and limit fields below come from that model's AWS Bedrock
// model card (docs.aws.amazon.com/bedrock/latest/userguide/model-card-*.html):
// the Model Details block for contextWindow and maxOutputTokens, and the
// "Features supported using bedrock-runtime endpoint" table for jsonMode (AWS
// calls it "Structured outputs") and functionCalling ("Client-side tool
// calling"). `reasoning` is true only where the card states "Reasoning:
// Supported"; the card omits the line entirely for models that do not.
//
// `pricingPerMTok` is NOT from the model cards — they link out to
// aws.amazon.com/bedrock/pricing rather than carrying rates. Entries here
// either omit it or carry a rate verified separately, so do not assume the
// card backs a pricing figure.
export const bedrockManifest: ProviderModelManifest = {
  defaultContextWindow: 200000,
  models: {
    "amazon.nova-premier-v1:0": {
      aliases: ["nova-premier", "aws-flagship"],
      displayName: "Amazon Nova Premier",
      contextWindow: 1000000,
      maxOutputTokens: 25000,
      // pricingPerMTok omitted: hasPricing() reports no verified rate
      vision: true,
      functionCalling: true,
      reasoning: true,
      jsonMode: false,
    },
    "amazon.nova-pro-v1:0": {
      aliases: ["nova-pro", "aws-balanced"],
      displayName: "Amazon Nova Pro",
      contextWindow: 300000,
      maxOutputTokens: 5000,
      // pricingPerMTok omitted: hasPricing() reports no verified rate
      vision: true,
      functionCalling: true,
      reasoning: false,
      jsonMode: false,
    },
    "amazon.nova-lite-v1:0": {
      aliases: ["nova-lite", "aws-lite", "aws-cheap"],
      displayName: "Amazon Nova Lite",
      contextWindow: 300000,
      maxOutputTokens: 5000,
      // pricingPerMTok omitted: hasPricing() reports no verified rate
      vision: true,
      functionCalling: true,
      reasoning: false,
      jsonMode: false,
    },
    // 20251101, not the 20251124 launch date — AWS issues the ID from the
    // model snapshot date. See the model card's Programmatic Access table.
    "anthropic.claude-opus-4-5-20251101-v1:0": {
      aliases: ["bedrock-claude-4.5-opus", "bedrock-claude-flagship"],
      displayName: "Claude 4.5 Opus (Bedrock)",
      contextWindow: 200000,
      maxOutputTokens: 64000,
      pricingPerMTok: { input: 5, output: 25 },
      vision: true,
      functionCalling: true,
      reasoning: true,
      jsonMode: true,
    },
    "meta.llama4-maverick-17b-instruct-v1:0": {
      aliases: ["bedrock-llama4", "bedrock-llama-maverick"],
      displayName: "Llama 4 Maverick (Bedrock)",
      contextWindow: 1000000,
      maxOutputTokens: 8192,
      // pricingPerMTok omitted: hasPricing() reports no verified rate
      vision: true,
      functionCalling: true,
      reasoning: false,
      jsonMode: false,
    },
  },
};
