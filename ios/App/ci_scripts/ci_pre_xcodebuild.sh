#!/bin/bash

# Xcode Cloud Pre-Build Script
# This script runs before Xcode build to install CocoaPods dependencies
# Xcode Cloud automatically detects scripts in ci_scripts/ directory

set -e

echo "🔧 [CI] Running pre-build script..."

# Get the directory where this script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
# Navigate to the iOS App directory (parent of ci_scripts)
APP_DIR="$(dirname "$SCRIPT_DIR")"

cd "$APP_DIR"

# Check if Podfile exists
if [ ! -f "Podfile" ]; then
    echo "❌ [CI] Podfile not found in $APP_DIR"
    exit 1
fi

echo "📦 [CI] Installing CocoaPods dependencies in $APP_DIR..."

# Check if CocoaPods is installed
if ! command -v pod &> /dev/null; then
    echo "📦 [CI] CocoaPods not found, installing..."
    gem install cocoapods --user-install
    export PATH="$HOME/.gem/ruby/*/bin:$PATH"
fi

# Verify pod command is available
if ! command -v pod &> /dev/null; then
    echo "❌ [CI] Failed to install CocoaPods"
    exit 1
fi

echo "📦 [CI] Running pod install..."
pod install --repo-update

echo "✅ [CI] CocoaPods dependencies installed successfully"

