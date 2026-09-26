#!/usr/bin/env bash
# Build an offline runtime bundle: official Node plus one npm tarball (the
# Neurolink build, or a reference harness such as Claude Code) installed
# globally, packed as $BUNDLE_DIR/ (default neurolink-node) for /opt.
# Trials then install without NodeSource or the npm registry, whose downloads
# stalled past the setup timeout on a slow link.
# Usage: [BUNDLE_DIR=name] build_bundle.sh <package.tgz> <out.tar.gz> <build-image> [node-version] [arch]
# Build in the task image with the oldest glibc so the bundle runs on all of them.
set -euo pipefail

TGZ=$(cd "$(dirname "$1")" && pwd)/$(basename "$1")
OUT=$2
IMAGE=$3
NODE_VERSION=${4:-22.23.2}
ARCH=${5:-arm64}
BUNDLE_DIR=${BUNDLE_DIR:-neurolink-node}
WORK=$(mktemp -d)
trap 'rm -rf "$WORK"' EXIT

NODE_TAR=node-v$NODE_VERSION-linux-$ARCH.tar.gz
sha256() {
  if command -v sha256sum > /dev/null; then sha256sum "$@"; else shasum -a 256 "$@"; fi
}
CACHE=${BUNDLE_CACHE:-$HOME/.cache/neurolink-tua}
mkdir -p "$CACHE"
if [ ! -f "$CACHE/$NODE_TAR" ]; then
  # Resume a partial download on a slow link rather than starting over.
  until curl -fL -C - --max-time 1800 -o "$CACHE/$NODE_TAR.part" "https://nodejs.org/dist/v$NODE_VERSION/$NODE_TAR"; do
    sleep 5
  done
  mv "$CACHE/$NODE_TAR.part" "$CACHE/$NODE_TAR"
fi
curl -fsS --retry 3 --max-time 60 -o "$WORK/SHASUMS256.txt" "https://nodejs.org/dist/v$NODE_VERSION/SHASUMS256.txt"
(cd "$CACHE" && grep " $NODE_TAR\$" "$WORK/SHASUMS256.txt" | sha256 -c -)

cp "$CACHE/$NODE_TAR" "$WORK/node.tar.gz"
cp "$TGZ" "$WORK/neurolink.tgz"
# A persistent npm cache per architecture: rebuilding for another Neurolink
# build then fetches only what changed.
mkdir -p "$CACHE/npm-$ARCH"
podman run --rm --user root --network host -v "$WORK:/work:Z" \
  -v "$CACHE/npm-$ARCH:/root/.npm:Z" -e "BUNDLE_DIR=$BUNDLE_DIR" --entrypoint bash "$IMAGE" -c '
  set -euo pipefail
  root=/opt/$BUNDLE_DIR
  mkdir -p "$root"
  tar -xzf /work/node.tar.gz -C "$root" --strip-components=1
  export PATH=$root/bin:$PATH
  npm install -g /work/neurolink.tgz --no-audit --no-fund
  echo "export PATH=$root/bin:\$PATH" > "$root/env.sh"
  { node --version; npm --version; npm ls -g --depth=0; } > "$root/BUNDLE_VERSIONS"
  tar -czf /work/bundle.tar.gz -C /opt "$BUNDLE_DIR"
'
mv "$WORK/bundle.tar.gz" "$OUT"
{
  echo "node=$NODE_VERSION arch=$ARCH image=$IMAGE dir=$BUNDLE_DIR"
  echo "neurolink_tgz_sha256=$(sha256 "$TGZ" | cut -d' ' -f1)"
  echo "bundle_sha256=$(sha256 "$OUT" | cut -d' ' -f1)"
} > "$OUT.txt"
cat "$OUT.txt"
