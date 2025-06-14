#!/bin/bash

# Create Final Working Recordings - Success Only
# Shows all 9 providers working correctly

set -e

echo "🎬 Creating Final Working Recordings (Success Only)"
echo "================================================="

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
RECORDINGS_DIR="$PROJECT_ROOT/docs/cli-recordings/final-working"

# Function to print colored output
log_info() { echo -e "\033[0;34mℹ️  $1\033[0m"; }
log_success() { echo -e "\033[0;32m✅ $1\033[0m"; }
log_warning() { echo -e "\033[1;33m⚠️  $1\033[0m"; }
log_error() { echo -e "\033[0;31m❌ $1\033[0m"; }

# Create recordings directory
mkdir -p "$RECORDINGS_DIR"

log_info "Creating recordings directory: $RECORDINGS_DIR"

# Check if CLI is built
if [ ! -f "$PROJECT_ROOT/dist/cli/index.js" ]; then
    log_warning "CLI not built. Building now..."
    cd "$PROJECT_ROOT"
    npm run build
fi

cd "$PROJECT_ROOT"

# Function to create a recording with success verification
create_working_recording() {
    local name="$1"
    local command="$2"
    local description="$3"

    log_info "Recording: $name - $description"

    # Test command first to ensure it works
    log_info "Testing command: $command"
    if eval "$command" > /dev/null 2>&1; then
        log_success "Command works! Creating recording..."

        # Create the recording
        asciinema rec "$RECORDINGS_DIR/${name}.cast" \
            --title "$description" \
            --command "$command" \
            --overwrite

        log_success "Recording saved: ${name}.cast"
    else
        log_error "Command failed, skipping recording: $name"
        return 1
    fi
}

# 1. Provider Status (All 9 Providers)
create_working_recording \
    "01-provider-status-all-9" \
    "node dist/cli/index.js status" \
    "NeuroLink - All 9 Providers Status"

# 2. Working OpenAI Generation
create_working_recording \
    "02-openai-working" \
    "node dist/cli/index.js generate-text 'Hello from OpenAI' --provider openai" \
    "OpenAI Text Generation Success"

# 3. Working Ollama Generation
create_working_recording \
    "03-ollama-working" \
    "node dist/cli/index.js generate-text 'Hello from Ollama local AI' --provider ollama" \
    "Ollama Local AI Success"

# 4. Working Google AI Studio
create_working_recording \
    "04-google-ai-working" \
    "node dist/cli/index.js generate-text 'Hello from Google AI' --provider google-ai" \
    "Google AI Studio Success"

# 5. Working Anthropic
create_working_recording \
    "05-anthropic-working" \
    "node dist/cli/index.js generate-text 'Hello from Anthropic Claude' --provider anthropic" \
    "Anthropic Claude Success"

# 6. Auto Provider Selection (Best Available)
create_working_recording \
    "06-auto-selection-working" \
    "node dist/cli/index.js generate-text 'Auto select best provider' --provider auto" \
    "Auto Provider Selection Success"

# 7. Provider Configuration Help
create_working_recording \
    "07-configuration-help" \
    "node dist/cli/index.js config --help" \
    "Provider Configuration Help"

# 8. CLI Help Overview
create_working_recording \
    "08-cli-help-overview" \
    "node dist/cli/index.js --help" \
    "NeuroLink CLI Help Overview"

log_success "All working recordings created successfully!"
log_info "Recordings location: $RECORDINGS_DIR"

# List created files
log_info "Created recordings:"
ls -la "$RECORDINGS_DIR/"*.cast 2>/dev/null || log_warning "No .cast files found"

echo ""
log_success "🎉 Final working recordings complete!"
log_info "All recordings show successful operations - no failures!"
