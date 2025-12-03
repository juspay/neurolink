#!/bin/bash

# Convert All .cast Files to GIF
# Converts every asciinema recording to GIF format for universal compatibility

set -e

echo "🎬 Converting All .cast Files to GIF Format"
echo "=========================================="

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

# Function to print colored output
log_info() { echo -e "\033[0;34mℹ️  $1\033[0m"; }
log_success() { echo -e "\033[0;32m✅ $1\033[0m"; }
log_warning() { echo -e "\033[1;33m⚠️  $1\033[0m"; }
log_error() { echo -e "\033[0;31m❌ $1\033[0m"; }

# Check if agg is installed
if ! command -v agg &> /dev/null; then
    log_error "agg tool not found. Installing..."
    cargo install --git https://github.com/asciinema/agg
fi

log_info "Finding all .cast files in project..."

# Find all .cast files
CAST_FILES=($(find "$PROJECT_ROOT" -name "*.cast" -type f))

log_info "Found ${#CAST_FILES[@]} .cast files to convert"

# Convert each .cast file to .gif
convert_count=0
skip_count=0

for cast_file in "${CAST_FILES[@]}"; do
    # Get directory and filename without extension
    dir_path=$(dirname "$cast_file")
    filename=$(basename "$cast_file" .cast)
    gif_file="$dir_path/$filename.gif"

    # Check if GIF already exists
    if [ -f "$gif_file" ]; then
        log_warning "GIF already exists: $filename.gif - Skipping"
        skip_count=$((skip_count + 1))
        continue
    fi

    log_info "Converting: $filename.cast → $filename.gif"

    # Convert using agg with standard settings
    if agg "$cast_file" "$gif_file" --speed 1.5 --font-size 14 --line-height 1.2; then
        log_success "Converted: $filename.gif"
        convert_count=$((convert_count + 1))
    else
        log_error "Failed to convert: $filename.cast"
    fi
done

echo ""
log_success "🎉 Conversion Complete!"
log_info "Converted: $convert_count files"
log_info "Skipped: $skip_count files (already existed)"
log_info "Total: ${#CAST_FILES[@]} files processed"

echo ""
log_info "All GIF files are now available for use!"

# List all created GIF files
echo ""
log_info "Created GIF files:"
find "$PROJECT_ROOT" -name "*.gif" -path "*/cli-recordings/*" | sort
