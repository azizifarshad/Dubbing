#!/usr/bin/env bash
# ==============================================================================
# Dubbing Vidans - Cross-Platform Unix/Linux/macOS Launcher
# ==============================================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "=== Dubbing Vidans Cross-Platform Launcher ==="

# Check Node.js
if ! command -v node >/dev/null 2>&1; then
  echo "Error: Node.js (v18+) is required to run Dubbing Vidans."
  echo "Please install Node.js from https://nodejs.org/"
  exit 1
fi

# Check Python 3
if ! command -v python3 >/dev/null 2>&1; then
  echo "Warning: Python 3 not found. Local speech-to-text and video branding will require Python 3."
fi

# Check FFmpeg
if ! command -v ffmpeg >/dev/null 2>&1; then
  echo "Warning: FFmpeg not found in PATH. Audio extraction and muxing requires ffmpeg."
fi

export PORT="${PORT:-3000}"
export NODE_ENV="production"

echo "Starting server on port $PORT..."
if [ -f "server.cjs" ]; then
  node server.cjs &
  SERVER_PID=$!
else
  npx tsx server.ts &
  SERVER_PID=$!
fi

# Wait for server to bind port
sleep 2

URL="http://localhost:$PORT"
echo "Opening browser at $URL..."

if command -v xdg-open >/dev/null 2>&1; then
  xdg-open "$URL" >/dev/null 2>&1 &
elif command -v open >/dev/null 2>&1; then
  open "$URL" >/dev/null 2>&1 &
fi

wait $SERVER_PID
