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
echo "14. 🔮 DeepSeek (Cost-efficient frontier reasoning)"
echo "---------------------------------------------------"
echo "Note: Requires DEEPSEEK_API_KEY environment variable"
echo "Get one at: https://platform.deepseek.com"
echo ""
echo "General chat with DeepSeek V3..."
npx @juspay/neurolink generate "Explain the difference between TCP and UDP" --provider deepseek --model deepseek-chat

echo ""
echo "Chain-of-thought reasoning with DeepSeek R1..."
npx @juspay/neurolink generate "If a train leaves station A at 60 mph and another leaves station B at 80 mph, when do they meet?" --provider deepseek --model deepseek-reasoner

echo ""
echo "Streaming with DeepSeek..."
npx @juspay/neurolink stream "Write a short poem about open-source software" --provider deepseek

echo ""
echo "15. 🟢 NVIDIA NIM (NVIDIA-hosted Llama and Nemotron models)"
echo "------------------------------------------------------------"
echo "Note: Requires NVIDIA_NIM_API_KEY environment variable"
echo "Get one at: https://build.nvidia.com/settings/api-keys"
echo ""
echo "Inference with Llama 3.3 70B via NVIDIA NIM..."
npx @juspay/neurolink generate "Summarize the key features of Rust as a programming language" --provider nvidia-nim --model meta/llama-3.3-70b-instruct

echo ""
echo "Streaming with NVIDIA NIM..."
npx @juspay/neurolink stream "Write a haiku about GPUs" --provider nvidia-nim

echo ""
echo "16. 🖥️  LM Studio (Local GUI-driven inference)"
echo "----------------------------------------------"
echo "Note: Requires LM Studio app running with a model loaded."
echo "Download LM Studio at: https://lmstudio.ai"
echo "Start the local server inside the app before running these examples."
echo ""
echo "Auto-discover and query the loaded model..."
npx @juspay/neurolink generate "Explain what a transformer architecture is" --provider lm-studio

echo ""
echo "Streaming with LM Studio..."
npx @juspay/neurolink stream "Tell me a joke about machine learning" --provider lm-studio

echo ""
echo "Custom base URL for LM Studio (if running on a different port)..."
echo "  Set LM_STUDIO_BASE_URL=http://localhost:1234/v1 and run:"
echo "  npx @juspay/neurolink generate \"Hello\" --provider lm-studio"

echo ""
echo "17. 🦙 llama.cpp (Local CLI server — maximum efficiency)"
echo "--------------------------------------------------------"
echo "Note: Requires llama-server running with a GGUF model."
echo "Start with: ./llama-server -m your-model.gguf --port 8080 --jinja"
echo "(--jinja flag is required for tool calling support)"
echo ""
echo "Auto-discover and query the loaded GGUF model..."
npx @juspay/neurolink generate "What are the benefits of model quantization?" --provider llamacpp

echo ""
echo "Streaming with llama.cpp..."
npx @juspay/neurolink stream "Describe the GGUF file format in one paragraph" --provider llamacpp

echo ""
echo "Custom base URL for llama-server (if running on a different port)..."
echo "  Set LLAMACPP_BASE_URL=http://localhost:8080/v1 and run:"
echo "  npx @juspay/neurolink generate \"Hello\" --provider llamacpp"

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
echo "- Use --provider deepseek with DEEPSEEK_API_KEY for cost-efficient reasoning"
echo "- Use --provider nvidia-nim with NVIDIA_NIM_API_KEY for NVIDIA-hosted models"
echo "- Use --provider lm-studio for local LM Studio inference (no API key needed)"
echo "- Use --provider llamacpp for local llama-server inference (no API key needed)"
echo "- Built-in tools work in v1.7.1!"
echo "- External server discovery working!"
