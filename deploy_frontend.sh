#!/bin/bash
# deploy_frontend.sh

# Exit on error
set -e

# Get the script's directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
FRONTEND_DIR="$SCRIPT_DIR/frontend"

echo "🚀 Starting Frontend Deployment..."

# 1. Navigate to frontend directory
if [ -d "$FRONTEND_DIR" ]; then
    cd "$FRONTEND_DIR"
else
    echo "❌ Error: Frontend directory not found at $FRONTEND_DIR"
    exit 1
fi

# 2. Build the project
echo "📦 Building frontend..."
if npm run build; then
    echo "✅ Build complete."
else
    echo "❌ Build failed!"
    exit 1
fi

# 3. Deploy via SCP
echo "📤 Transferring dist to remote server..."
# Using the command from your error message
if scp -r dist root@69.164.247.115:/var/www/bat-trigger-photobooth/frontend/; then
    echo "✅ Transfer complete."
else
    echo "❌ Transfer failed! Check your connection or SSH keys."
    exit 1
fi

echo "🎉 Deployment successful!"
