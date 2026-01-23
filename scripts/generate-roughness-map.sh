#!/bin/bash
# Bash script to generate roughness map texture

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
JS_SCRIPT="$SCRIPT_DIR/generate-roughness-map.js"

echo "HootCAD - Roughness Map Generator"
echo ""

# Check if Node.js is available
if ! command -v node &> /dev/null; then
    echo "ERROR: Node.js is not installed or not in PATH"
    echo "Please install Node.js from https://nodejs.org/"
    exit 1
fi

NODE_VERSION=$(node --version)
echo "Using Node.js version: $NODE_VERSION"
echo ""

# Run the generator script
cd "$PROJECT_ROOT"
node "$JS_SCRIPT"

if [ $? -eq 0 ]; then
    echo ""
    echo "Success! The roughness map is ready to use."
else
    echo ""
    echo "ERROR: Script execution failed"
    exit 1
fi
