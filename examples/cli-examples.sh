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
npx @juspay/neurolink generate-text "What time is it?" --debug

echo ""
echo "3. 🔍 Tool Discovery"
echo "-------------------"
echo "Discovering available tools..."
npx @juspay/neurolink generate-text "What tools do you have access to?" --debug

echo ""
echo "4. 🛠️  MCP External Server Discovery"
echo "------------------------------------"
echo "Discovering external MCP servers..."
npx @juspay/neurolink mcp discover --format table

echo ""
echo "5. 🤖 Basic Text Generation"
echo "---------------------------"
echo "Generating a haiku..."
npx @juspay/neurolink generate-text "Write a haiku about coding"

echo ""
echo "6. 🌊 Streaming Example"
echo "----------------------"
echo "Streaming response..."
npx @juspay/neurolink stream "Tell me a short story about robots"

echo ""
echo "7. 🔧 Multi-tool Integration"
echo "---------------------------"
echo "Testing combined tool usage..."
npx @juspay/neurolink generate-text "Can you tell me the current time and also explain what you can help me with?" --debug

echo ""
echo "✅ CLI Examples Complete!"
echo ""
echo "💡 Tips:"
echo "- Use --debug for detailed output"
echo "- Use --provider to specify a provider"
echo "- Set GOOGLE_AI_API_KEY for free tier access"
echo "- Built-in tools work in v1.7.1!"
echo "- External server discovery working!"
