#!/bin/bash

# This script updates GitHub repository settings for NeuroLink
# Part of Phase 2.3: GitHub Repository Finalization

# Repository details
REPO="juspay/NeuroLink"
DESCRIPTION="A TypeScript AI toolkit with multi-provider support for OpenAI, Amazon Bedrock, and Google Vertex AI with automatic fallback"
HOMEPAGE="https://www.npmjs.com/package/@juspay/neurolink"
TOPICS="ai,openai,bedrock,google-vertex-ai,anthropic,claude,typescript,svelte,streaming,fallback,ai-toolkit"

# Update repository settings (description, homepage)
echo "Updating repository description and homepage..."
curl -X PATCH \
  -H "Accept: application/vnd.github+json" \
  -H "Authorization: Bearer $GITHUB_TOKEN" \
  https://api.github.com/repos/$REPO \
  -d "{\"description\":\"$DESCRIPTION\",\"homepage\":\"$HOMEPAGE\",\"has_discussions\":true}"

# Update repository topics
echo "Updating repository topics..."
curl -X PUT \
  -H "Accept: application/vnd.github+json" \
  -H "Authorization: Bearer $GITHUB_TOKEN" \
  https://api.github.com/repos/$REPO/topics \
  -d "{\"names\":$(echo $TOPICS | sed 's/,/","/g' | sed 's/^/["/g' | sed 's/$/"]/')}"

echo "Repository settings updated successfully!"
echo "NOTE: You need to set the GITHUB_TOKEN environment variable with a token that has repo permissions to run this script."
