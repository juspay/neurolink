export async function loadBedrockControl(): Promise<
  typeof import("@aws-sdk/client-bedrock")
> {
  return await import(/* @vite-ignore */ "@aws-sdk/client-bedrock");
}
