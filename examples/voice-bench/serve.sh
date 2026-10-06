#!/bin/sh
# Serves public/ on http://localhost:8765 (any static server works; the page is plain HTML/JS).
here="$(cd "$(dirname "$0")" && pwd)"

# Whistle runs in the browser from the same three files NeuroLink ships in
# models/whistle (pinned Hugging Face revisions, verified by the SDK). Copy any
# that are missing so the demo needs no download; the copies stay gitignored.
for f in needle.js needle.wasm whistle.cact; do
  if [ ! -f "$here/public/whistle/$f" ] && [ -f "$here/../../models/whistle/$f" ]; then
    cp "$here/../../models/whistle/$f" "$here/public/whistle/$f"
  fi
done

cd "$here/public" && exec python3 -m http.server "${PORT:-8765}" --bind 127.0.0.1
