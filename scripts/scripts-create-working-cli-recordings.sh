#!/bin/bash

# Create proper CLI recordings for three new providers
echo "🎬 Creating working CLI recordings for three new providers..."

# Create recordings directory
RECORDINGS_DIR="docs/cli-recordings/three-providers"
mkdir -p "$RECORDINGS_DIR"

cd /Users/sachinsharma/Developer/Official/neurolink

# Build the CLI first
echo "🔨 Building CLI..."
npm run build

# Load environment variables
export $(grep -v '^#' .env | xargs) 2>/dev/null || true

echo "📹 Starting CLI recordings with proper timing..."

# Function to create a recording with timeout
create_recording() {
    local filename="$1"
    local title="$2"
    local command="$3"

    echo "  Recording: $filename"

    # Use expect to handle interactive recording properly
    expect << EOF
set timeout 60
spawn asciinema rec "$RECORDINGS_DIR/$filename" --title "$title"
expect "$ "
send "$command\r"
expect {
    "✅" {
        sleep 2
        send "exit\r"
        expect eof
    }
    "❌" {
        sleep 2
        send "exit\r"
        expect eof
    }
    timeout {
        send "\003"
        sleep 1
        send "exit\r"
        expect eof
    }
}
EOF
}

# 1. Record Hugging Face demo
create_recording "huggingface-demo.cast" "NeuroLink - Hugging Face Provider Demo" \
    "node dist/cli/index.js generate-text 'What makes open source AI special?' --provider huggingface"

# 2. Record Ollama demo (if available)
create_recording "ollama-demo.cast" "NeuroLink - Ollama Local AI Demo" \
    "node dist/cli/index.js generate-text 'Why is local AI important for privacy?' --provider ollama"

# 3. Record Mistral demo
create_recording "mistral-demo.cast" "NeuroLink - Mistral AI Demo" \
    "node dist/cli/index.js generate-text 'Explain GDPR compliance in AI' --provider mistral"

# 4. Record all providers list
create_recording "all-providers.cast" "NeuroLink - All 9 Providers" \
    "node dist/cli/index.js config providers"

# 5. Record provider status
create_recording "provider-status.cast" "NeuroLink - Provider Status" \
    "node dist/cli/index.js status"

echo "✅ All CLI recordings created!"

# Convert to MP4 with better quality
echo ""
echo "🔄 Converting recordings to MP4..."
for cast_file in "$RECORDINGS_DIR"/*.cast; do
  if [ -f "$cast_file" ]; then
    base_name=$(basename "$cast_file" .cast)
    echo "  Converting $base_name.cast to MP4..."

    # Use agg for high-quality conversion (if available)
    if command -v agg &> /dev/null; then
        agg --renderer=resvg "$cast_file" "$RECORDINGS_DIR/${base_name}.mp4"
        echo "  ✅ Created ${base_name}.mp4 (high quality)"
    else
        # Fallback to placeholder
        ffmpeg -f lavfi -i color=c=black:s=1280x800:d=10 \
               -vf "drawtext=text='${base_name} CLI Demo':fontcolor=white:fontsize=24:x=(w-text_w)/2:y=(h-text_h)/2" \
               -pix_fmt yuv420p -movflags +faststart \
               "$RECORDINGS_DIR/${base_name}.mp4" -y -loglevel quiet
        echo "  ✅ Created ${base_name}.mp4 (placeholder)"
    fi
  fi
done

echo "✅ All conversions complete!"

# List created files
echo ""
echo "📋 Created files:"
ls -la "$RECORDINGS_DIR"

echo ""
echo "🎯 Next steps:"
echo "1. Review recordings: asciinema play docs/cli-recordings/three-providers/<filename>.cast"
echo "2. Upload to asciinema.org if needed"
echo "3. Embed in documentation"
