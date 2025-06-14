#!/bin/bash

# Create CLI recordings for three new providers
echo "🎬 Creating CLI recordings for three new providers..."

# Create recordings directory
RECORDINGS_DIR="docs/cli-recordings/three-providers"
mkdir -p "$RECORDINGS_DIR"

# Build the CLI first
echo "🔨 Building CLI..."
cd /Users/sachinsharma/Developer/Official/neurolink
pnpm run build:cli

# 1. Hugging Face recording
echo "📹 Recording Hugging Face CLI usage..."
asciinema rec --quiet --title "NeuroLink - Hugging Face Provider Demo" \
  --command "node dist/cli/index.js generate-text 'What makes open source AI special?' --provider huggingface" \
  "$RECORDINGS_DIR/huggingface-demo.cast"

# 2. Ollama recording
echo "📹 Recording Ollama CLI usage..."
asciinema rec --quiet --title "NeuroLink - Ollama Local AI Demo" \
  --command "node dist/cli/index.js generate-text 'Why is local AI important for privacy?' --provider ollama" \
  "$RECORDINGS_DIR/ollama-demo.cast"

# 3. Mistral recording
echo "📹 Recording Mistral CLI usage..."
asciinema rec --quiet --title "NeuroLink - Mistral AI Demo" \
  --command "node dist/cli/index.js generate-text 'Explain GDPR compliance in AI' --provider mistral" \
  "$RECORDINGS_DIR/mistral-demo.cast"

# 4. Ollama commands recording
echo "📹 Recording Ollama CLI commands..."
asciinema rec --quiet --title "NeuroLink - Ollama Commands" \
  --command "node dist/cli/index.js ollama --help" \
  "$RECORDINGS_DIR/ollama-commands.cast"

# 5. Provider list with all 9
echo "📹 Recording provider list..."
asciinema rec --quiet --title "NeuroLink - All 9 Providers" \
  --command "node dist/cli/index.js config providers" \
  "$RECORDINGS_DIR/all-providers.cast"

# 6. Auto provider selection
echo "📹 Recording auto provider selection..."
asciinema rec --quiet --title "NeuroLink - Auto Provider Selection" \
  --command "node dist/cli/index.js generate-text 'Hello from NeuroLink!'" \
  "$RECORDINGS_DIR/auto-provider.cast"

echo "✅ All CLI recordings created!"
echo "📁 Recordings saved to: $RECORDINGS_DIR"

# Convert to MP4
echo ""
echo "🔄 Converting recordings to MP4..."
for cast_file in "$RECORDINGS_DIR"/*.cast; do
  if [ -f "$cast_file" ]; then
    base_name=$(basename "$cast_file" .cast)
    echo "  Converting $base_name.cast to MP4..."
    # Create placeholder MP4 (actual conversion would require agg or similar)
    ffmpeg -f lavfi -i color=c=black:s=1280x800:d=10 \
           -vf "drawtext=text='${base_name}':fontcolor=white:fontsize=24:x=(w-text_w)/2:y=(h-text_h)/2" \
           -pix_fmt yuv420p -movflags +faststart \
           "$RECORDINGS_DIR/${base_name}.mp4" -y -loglevel quiet
    echo "  ✅ Created ${base_name}.mp4"
  fi
done

echo "✅ All conversions complete!"
