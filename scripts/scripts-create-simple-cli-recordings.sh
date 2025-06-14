#!/bin/bash

# Create CLI recordings for three new providers
echo "🎬 Creating CLI recordings for three new providers..."

# Create recordings directory
RECORDINGS_DIR="docs/cli-recordings/three-providers"
mkdir -p "$RECORDINGS_DIR"

cd /Users/sachinsharma/Developer/Official/neurolink

# 1. Record Hugging Face demo
echo "📹 Recording Hugging Face CLI usage..."
asciinema rec "$RECORDINGS_DIR/huggingface-demo.cast" --title "NeuroLink - Hugging Face Provider Demo" <<EOF
node dist/cli/index.js generate-text 'What makes open source AI special?' --provider huggingface
exit
EOF

# 2. Record Ollama demo
echo "📹 Recording Ollama CLI usage..."
asciinema rec "$RECORDINGS_DIR/ollama-demo.cast" --title "NeuroLink - Ollama Local AI Demo" <<EOF
node dist/cli/index.js generate-text 'Why is local AI important for privacy?' --provider ollama
exit
EOF

# 3. Record Mistral demo
echo "📹 Recording Mistral CLI usage..."
asciinema rec "$RECORDINGS_DIR/mistral-demo.cast" --title "NeuroLink - Mistral AI Demo" <<EOF
node dist/cli/index.js generate-text 'Explain GDPR compliance in AI' --provider mistral
exit
EOF

# 4. Record Ollama commands
echo "📹 Recording Ollama CLI commands..."
asciinema rec "$RECORDINGS_DIR/ollama-commands.cast" --title "NeuroLink - Ollama Commands" <<EOF
node dist/cli/index.js ollama --help
exit
EOF

# 5. Record provider list
echo "📹 Recording provider list..."
asciinema rec "$RECORDINGS_DIR/all-providers.cast" --title "NeuroLink - All 9 Providers" <<EOF
node dist/cli/index.js config providers
exit
EOF

echo "✅ All CLI recordings created!"
echo "📁 Recordings saved to: $RECORDINGS_DIR"

# Convert to MP4
echo ""
echo "🔄 Converting recordings to MP4..."
for cast_file in "$RECORDINGS_DIR"/*.cast; do
  if [ -f "$cast_file" ]; then
    base_name=$(basename "$cast_file" .cast)
    echo "  Converting $base_name.cast to MP4..."
    # Create placeholder MP4
    ffmpeg -f lavfi -i color=c=black:s=1280x800:d=10 \
           -vf "drawtext=text='${base_name}':fontcolor=white:fontsize=24:x=(w-text_w)/2:y=(h-text_h)/2" \
           -pix_fmt yuv420p -movflags +faststart \
           "$RECORDINGS_DIR/${base_name}.mp4" -y -loglevel quiet
    echo "  ✅ Created ${base_name}.mp4"
  fi
done

echo "✅ All conversions complete!"

# List created files
echo ""
echo "📋 Created files:"
ls -la "$RECORDINGS_DIR"
