#!/bin/bash

# NeuroLink CLI Examples
#
# This script demonstrates common CLI usage patterns
# Run: bash examples/cli-examples.sh

echo "🖥️  NeuroLink CLI Examples (v1.7.1)"
echo "================================="

# Check if NeuroLink is available
if ! command -v npx &> /dev/null; then
    echo "❌ npx not found. Please install Node.js"
    exit 1
fi

echo ""
echo "1. 📊 System Status"
echo "-------------------"
npx @juspay/neurolink status

echo ""
echo "2. ✅ Built-in Tools Test (v1.7.1)"
echo "----------------------------------"
echo "Testing time tool..."
npx @juspay/neurolink generate "What time is it?" --debug

echo ""
echo "3. 🔍 Tool Discovery"
echo "-------------------"
echo "Discovering available tools..."
npx @juspay/neurolink generate "What tools do you have access to?" --debug

echo ""
echo "4. 🛠️  MCP External Server Discovery"
echo "------------------------------------"
echo "Discovering external MCP servers..."
npx @juspay/neurolink mcp discover --format table

echo ""
echo "5. 🤖 Basic Text Generation"
echo "---------------------------"
echo "Generating a haiku..."
npx @juspay/neurolink generate "Write a haiku about coding"

echo ""
echo "6. 🌊 Streaming Example"
echo "----------------------"
echo "Streaming response..."
npx @juspay/neurolink stream "Tell me a short story about robots"

echo ""
echo "7. 🔧 Multi-tool Integration"
echo "---------------------------"
echo "Testing combined tool usage..."
npx @juspay/neurolink generate "Can you tell me the current time and also explain what you can help me with?" --debug

echo ""
echo "8. 🚀 LiteLLM Proxy Examples (100+ Models)"
echo "-----------------------------------------"
echo "Note: Requires LiteLLM proxy server running on localhost:4000"
echo "Setup: pip install litellm && litellm --port 4000"
echo ""
echo "Testing OpenAI via LiteLLM..."
npx @juspay/neurolink generate "Explain quantum computing" --provider litellm --model "openai/gpt-4o-mini"

echo ""
echo "Testing Claude via LiteLLM..."
npx @juspay/neurolink generate "Write a technical summary" --provider litellm --model "anthropic/claude-3-5-sonnet"

echo ""
echo "Testing Google Gemini via LiteLLM..."
npx @juspay/neurolink generate "Create a code snippet" --provider litellm --model "google/gemini-2.0-flash"

echo ""
echo "13. 🚀 Amazon SageMaker Custom Models"
echo "------------------------------------"
echo "Testing SageMaker endpoint status..."
npx @juspay/neurolink sagemaker status

echo ""
echo "Testing custom model inference..."
npx @juspay/neurolink generate "Analyze this business data for insights" --provider sagemaker

echo ""
echo "SageMaker endpoint benchmark..."
npx @juspay/neurolink sagemaker benchmark

echo ""
echo "✅ CLI Examples Complete!"
echo ""
echo "💡 Tips:"
echo "- Use --debug for detailed output"
echo "- Use --provider to specify a provider"
echo "- Set GOOGLE_AI_API_KEY for free tier access"
echo "- Use --provider litellm for 100+ models via proxy"
echo "- Set LITELLM_BASE_URL=http://localhost:4000 for LiteLLM"
echo "- Use --provider sagemaker for custom deployed models"
echo "- Set AWS credentials and SAGEMAKER_DEFAULT_ENDPOINT for SageMaker"
echo "- Built-in tools work in v1.7.1!"
echo "- External server discovery working!"
