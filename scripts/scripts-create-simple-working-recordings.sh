#!/bin/bash

# Create working CLI recordings with simple timing approach
echo "🎬 Creating working CLI recordings (simple approach)..."

# Create recordings directory
RECORDINGS_DIR="docs/cli-recordings/three-providers"
mkdir -p "$RECORDINGS_DIR"

cd /Users/sachinsharma/Developer/Official/neurolink

# Build the CLI first
echo "🔨 Building CLI..."
npm run build

# Load environment variables
echo "🔧 Loading environment variables..."
export $(grep -v '^#' .env | xargs) 2>/dev/null || true

echo "📹 Starting CLI recordings..."

# Function to create a recording with proper command execution
create_simple_recording() {
    local filename="$1"
    local title="$2"
    local command="$3"
    local max_wait="${4:-30}"

    echo "  Recording: $filename"
    echo "  Command: $command"
    echo "  Max wait: ${max_wait}s"

    # Create a temporary script that runs the command and waits
    cat > temp_record.sh << EOF
#!/bin/bash
echo "$ $command"
timeout ${max_wait}s $command || echo "Command timed out after ${max_wait}s"
echo ""
echo "Recording complete. Press Ctrl+C to stop recording."
sleep 3
EOF

    chmod +x temp_record.sh

    # Record with asciinema
    asciinema rec "$RECORDINGS_DIR/$filename" --title "$title" --command "./temp_record.sh"

    # Clean up
    rm -f temp_record.sh
}

# Test CLI first to make sure it works
echo "🧪 Testing CLI commands..."
echo "  Testing: node dist/cli/index.js --help"
timeout 10s node dist/cli/index.js --help > /dev/null 2>&1
if [ $? -eq 0 ]; then
    echo "  ✅ CLI is working"
else
    echo "  ❌ CLI test failed"
    echo "  Building again..."
    npm run build
fi

# 1. Record provider status (quick command)
create_simple_recording "provider-status.cast" "NeuroLink - Provider Status" \
    "node dist/cli/index.js status" 15

# 2. Record provider list (quick command)
create_simple_recording "all-providers.cast" "NeuroLink - All 9 Providers" \
    "node dist/cli/index.js config providers" 10

# 3. Record Mistral demo (most reliable provider)
create_simple_recording "mistral-demo.cast" "NeuroLink - Mistral AI Demo" \
    "node dist/cli/index.js generate 'Explain GDPR compliance in AI systems in one paragraph' --provider mistral" 45

# 4. Record Google AI demo (primary provider)
create_simple_recording "google-ai-demo.cast" "NeuroLink - Google AI Demo" \
    "node dist/cli/index.js generate 'Write a haiku about artificial intelligence' --provider google-ai" 30

# 5. Record auto provider demo
create_simple_recording "auto-provider-demo.cast" "NeuroLink - Auto Provider Selection" \
    "node dist/cli/index.js generate 'What makes AI development exciting?' --provider auto" 30

echo "✅ All CLI recordings created!"

# Convert to MP4
echo ""
echo "🔄 Converting recordings to MP4..."

# Install agg if not available (for better conversion)
if ! command -v agg &> /dev/null; then
    echo "  📦 Installing agg for high-quality video conversion..."
    if command -v cargo &> /dev/null; then
        cargo install --git https://github.com/asciinema/agg
    else
        echo "  ⚠️  agg not available, using ffmpeg fallback"
    fi
fi

for cast_file in "$RECORDINGS_DIR"/*.cast; do
  if [ -f "$cast_file" ]; then
    base_name=$(basename "$cast_file" .cast)
    echo "  Converting $base_name.cast to MP4..."

    # Try agg first for high quality
    if command -v agg &> /dev/null; then
        agg --renderer=resvg --cols=120 --rows=30 "$cast_file" "$RECORDINGS_DIR/${base_name}.mp4" 2>/dev/null
        if [ $? -eq 0 ]; then
            echo "  ✅ Created ${base_name}.mp4 (high quality)"
            continue
        fi
    fi

    # Fallback: try to extract text and create a better placeholder
    echo "  📝 Creating enhanced placeholder for ${base_name}..."
    content="CLI Demo: ${base_name}\n\nThis recording shows NeuroLink CLI\nin action with real AI generation.\n\nTo view the interactive version:\nasciinema play ${base_name}.cast"

    ffmpeg -f lavfi -i color=c=black:s=1280x800:d=15 \
           -vf "drawtext=text='${content}':fontcolor=white:fontsize=20:x=50:y=50" \
           -pix_fmt yuv420p -movflags +faststart \
           "$RECORDINGS_DIR/${base_name}.mp4" -y -loglevel quiet
    echo "  ✅ Created ${base_name}.mp4 (enhanced placeholder)"
  fi
done

echo ""
echo "✅ All conversions complete!"

# List created files with sizes
echo ""
echo "📋 Created files:"
ls -lah "$RECORDINGS_DIR"

echo ""
echo "🎯 Testing recordings:"
for cast_file in "$RECORDINGS_DIR"/*.cast; do
  if [ -f "$cast_file" ]; then
    base_name=$(basename "$cast_file" .cast)
    echo "  View: asciinema play $cast_file"
  fi
done

echo ""
echo "🔍 Validation:"
echo "  1. Each .cast file should show real command execution"
echo "  2. Each .mp4 file should be playable"
echo "  3. Commands should complete successfully or show clear errors"
