#!/usr/bin/env bash
# Local documentation development server
# If you get a "Permission denied" error, run: chmod +x serve.sh
set -euo pipefail

# Check for active Python virtual environment
if [ -z "${VIRTUAL_ENV:-}" ]; then
    echo "Error: No Python virtual environment detected."
    echo "Please activate a virtual environment before running this script."
    echo "For example:"
    echo "  python3 -m venv .venv"
    echo "  source .venv/bin/activate"
    exit 1
fi

echo "Starting NeuroLink documentation server..."

# Check if Python is available
if ! command -v python3 &> /dev/null; then
    echo "Error: Python 3 is not installed or not in PATH"
    echo "Please install Python 3 before running this script"
    exit 1
fi

# Check if pip is available
if ! command -v pip &> /dev/null; then
    echo "Error: pip is not installed or not in PATH"
    echo "Please install pip before running this script"
    exit 1
fi

# Check if requirements.txt exists
if [ ! -f "requirements.txt" ]; then
    echo "Error: requirements.txt not found in current directory"
    echo "Please run this script from the documentation root directory"
    exit 1
fi

echo "Installing/updating dependencies..."

# Check for development mode override
if [ "${DEV_MODE:-0}" = "1" ]; then
    echo "WARNING: Development mode enabled. Installing dependencies without hash verification."
    echo "This is insecure and should only be used for local development."
    pip install -r requirements.txt
else
    # Check if any hashes are present
    if grep -q -- '--hash=' requirements.txt; then
        # Count non-comment, non-empty requirement lines
        total_requirements=$(grep -E '^[^#[:space:]]' requirements.txt | wc -l)
        # Count lines with --hash=
        hashed_requirements=$(grep -E '^[^#[:space:]].*--hash=' requirements.txt | wc -l)
        if [ "$total_requirements" -ne "$hashed_requirements" ]; then
            echo "Error: requirements.txt contains hashes, but not all dependencies have hashes."
            echo "Please ensure every requirement line includes a --hash= value."
            exit 1
        fi
        echo "Detected hashes in requirements.txt. Installing with hash verification..."
        pip install --require-hashes -r requirements.txt
    else
        echo "Error: requirements.txt does not contain hashes."
        echo "Installing dependencies without hash verification may introduce security vulnerabilities."
        echo "Please add hashes to requirements.txt (e.g., using 'pip-compile --generate-hashes') before running this script."
        if [ "${REQUIRE_HASHES:-0}" = "1" ]; then
            echo "Error: REQUIRE_HASHES is set, but requirements.txt does not contain hashes. Aborting installation."
        fi
        exit 1
    fi
fi

echo "Starting MkDocs development server..."
echo "Documentation will be available at http://127.0.0.1:8000"
echo "Press Ctrl+C to stop the server"
mkdocs serve
