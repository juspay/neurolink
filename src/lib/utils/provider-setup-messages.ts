/**
 * Enhanced Provider Setup Messages
 * Provides detailed setup instructions for AI providers
 */

/**
 * Generate enhanced error message with setup instructions
 */
export function getProviderSetupMessage(
  provider: string,
  missingVars: string[],
): string {
  const providerSetup = {
    openai: {
      guide: "Get your API key from https://platform.openai.com/api-keys",
      envVars: [
        'OPENAI_API_KEY="sk-proj-your-openai-api-key"',
        "# Optional:",
        'OPENAI_MODEL="gpt-4o"',
        'OPENAI_BASE_URL="https://api.openai.com"',
      ],
    },
    anthropic: {
      guide: "Get your API key from https://console.anthropic.com/",
      envVars: [
        'ANTHROPIC_API_KEY="sk-ant-api03-your-anthropic-key"',
        "# Optional:",
        'ANTHROPIC_MODEL="claude-3-5-sonnet-20241022"',
      ],
    },
    "google-ai": {
      guide: "Get your API key from https://aistudio.google.com/app/apikey",
      envVars: [
        'GOOGLE_AI_API_KEY="AIza-your-google-ai-api-key"',
        "# Optional:",
        'GOOGLE_AI_MODEL="gemini-2.5-pro"',
      ],
    },
    vertex: {
      guide: "Set up Google Cloud project and download service account JSON",
      envVars: [
        'GOOGLE_APPLICATION_CREDENTIALS="/path/to/service-account.json"',
        'GOOGLE_VERTEX_PROJECT="your-gcp-project-id"',
        'GOOGLE_VERTEX_LOCATION="us-central1"',
        "# Optional:",
        'VERTEX_MODEL="gemini-2.5-pro"',
      ],
    },
    bedrock: {
      guide:
        "Set up AWS credentials and request model access in Bedrock console",
      envVars: [
        'AWS_ACCESS_KEY_ID="AKIA..."',
        'AWS_SECRET_ACCESS_KEY="your-aws-secret-key"',
        'AWS_REGION="us-east-1"',
        "# Use full inference profile ARN for Anthropic models:",
        'BEDROCK_MODEL="arn:aws:bedrock:us-east-1:123456789:inference-profile/us.anthropic.claude-3-5-sonnet-20241022-v2:0"',
        "# Or simple name for Amazon models:",
        '# BEDROCK_MODEL="amazon.titan-text-express-v1"',
      ],
    },
    azure: {
      guide: "Set up Azure OpenAI resource and create deployment",
      envVars: [
        'AZURE_OPENAI_API_KEY="your-azure-openai-key"',
        'AZURE_OPENAI_ENDPOINT="https://your-resource.openai.azure.com/"',
        'AZURE_OPENAI_DEPLOYMENT_ID="your-deployment-name"',
        "# Optional:",
        'AZURE_MODEL="gpt-4o"',
        'AZURE_API_VERSION="2024-02-15-preview"',
      ],
    },
    huggingface: {
      guide: "Get your API token from https://huggingface.co/settings/tokens",
      envVars: [
        'HUGGINGFACE_API_KEY="hf_your_huggingface_token"',
        "# Optional:",
        'HUGGINGFACE_MODEL="microsoft/DialoGPT-medium"',
        'HUGGINGFACE_ENDPOINT="https://api-inference.huggingface.co"',
      ],
    },
    mistral: {
      guide: "Get your API key from https://mistral.ai/platform",
      envVars: [
        'MISTRAL_API_KEY="your_mistral_api_key"',
        "# Optional:",
        'MISTRAL_MODEL="mistral-small"',
        'MISTRAL_ENDPOINT="https://api.mistral.ai"',
      ],
    },
    ollama: {
      guide: "Install Ollama and pull models locally",
      envVars: [
        "# Ollama runs locally - no API key needed",
        'OLLAMA_BASE_URL="http://localhost:11434"',
        'OLLAMA_MODEL="llama2"',
        "",
        "# First install and start Ollama:",
        "# macOS: brew install ollama",
        "# Linux: curl -fsSL https://ollama.ai/install.sh | sh",
        "# Then pull a model: ollama pull llama2",
      ],
    },
  };

  const setup = providerSetup[provider as keyof typeof providerSetup];
  if (!setup) {
    return `❌ ${provider.toUpperCase()} Provider Configuration Error\nMissing variables: ${missingVars.join(", ")}\nCheck provider documentation for setup instructions.`;
  }

  return `
❌ ${provider.toUpperCase()} Provider Configuration Error

Missing required environment variables: ${missingVars.join(", ")}

🔧 Step 1: Get Credentials
${setup.guide}

💡 Step 2: Add to your .env file (or export in CLI):
${setup.envVars.join("\n")}

🚀 Step 3: Test the setup:
npx neurolink generate "Hello" --provider ${provider}

📖 Full setup guide: https://docs.neurolink.ai/providers/${provider}
`;
}
