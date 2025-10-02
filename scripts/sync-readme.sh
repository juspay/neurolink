#!/bin/bash
# Sync README.md to docs/index.md with link path adjustments

# Copy README to docs/index.md
cp README.md docs/index.md

# Fix links for MkDocs context (strip docs/ prefix in all forms)
sed -i '' \
  -e 's|](docs/|](|g' \
  -e 's|](./docs/|](|g' \
  docs/index.md

echo "✅ Synced README.md to docs/index.md with adjusted links"
