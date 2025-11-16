#!/bin/bash

# Xcode Cloud Pre-Build Script
# This script runs before Xcode build to install CocoaPods dependencies
# Xcode Cloud automatically detects scripts in ci_scripts/ directory

set -euo pipefail

echo "🔧 [CI] Running pre-build script..."
echo "🔧 [CI] CI_WORKSPACE: ${CI_WORKSPACE:-not set}"
echo "🔧 [CI] PWD: $(pwd)"

# Use CI_WORKSPACE if available, otherwise use script directory
if [ -n "${CI_WORKSPACE:-}" ]; then
    APP_DIR="$CI_WORKSPACE/ios/App"
else
    # Fallback: Get the directory where this script is located
    SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
    APP_DIR="$(dirname "$SCRIPT_DIR")"
fi

echo "🔧 [CI] Navigating to: $APP_DIR"
cd "$APP_DIR" || {
    echo "❌ [CI] Failed to change directory to $APP_DIR"
    exit 1
}

# Check if Podfile exists
if [ ! -f "Podfile" ]; then
    echo "❌ [CI] Podfile not found in $APP_DIR"
    echo "🔧 [CI] Current directory contents:"
    ls -la
    exit 1
fi

echo "✅ [CI] Podfile found"

# Check if CocoaPods is installed
# Xcode Cloud usually has CocoaPods pre-installed
if ! command -v pod &> /dev/null; then
    echo "📦 [CI] CocoaPods not found in PATH, checking common locations..."
    
    # Try to find pod in common locations
    if [ -f "/usr/local/bin/pod" ]; then
        export PATH="/usr/local/bin:$PATH"
    elif [ -f "/opt/homebrew/bin/pod" ]; then
        export PATH="/opt/homebrew/bin:$PATH"
    else
        echo "📦 [CI] Installing CocoaPods..."
        # Use sudo if needed, but Xcode Cloud usually has it
        gem install cocoapods --no-document || {
            echo "⚠️ [CI] Failed to install CocoaPods via gem, trying with sudo..."
            sudo gem install cocoapods --no-document || {
                echo "❌ [CI] Failed to install CocoaPods"
                exit 1
            }
        }
    fi
fi

# Verify pod command is available
if ! command -v pod &> /dev/null; then
    echo "❌ [CI] pod command still not available after installation attempt"
    echo "🔧 [CI] PATH: $PATH"
    echo "🔧 [CI] which pod: $(which pod 2>&1 || echo 'not found')"
    exit 1
fi

echo "✅ [CI] CocoaPods found: $(pod --version)"

# Run pod install
echo "📦 [CI] Running pod install in $APP_DIR..."
pod install --repo-update || {
    echo "❌ [CI] pod install failed"
    exit 1
}

echo "✅ [CI] CocoaPods dependencies installed successfully"

