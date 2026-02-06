#!/bin/bash

# PDF.js Worker Synchronization Script
# This script syncs the PDF.js worker file from node_modules to public directory
# Ensures version match between pdfjs-dist package and worker file

set -e

echo "🔄 Syncing PDF.js worker file..."

# Get the installed pdfjs-dist version
PDFJS_VERSION=$(node -p "require('./package.json').dependencies['pdfjs-dist']" | tr -d '^~')

# Source and destination paths
SOURCE="node_modules/pdfjs-dist/build/pdf.worker.min.mjs"
DEST="public/pdf.worker.min.mjs"

# Check if source file exists
if [ ! -f "$SOURCE" ]; then
    echo ""
    echo "❌ Error: PDF.js worker file not found in node_modules"
    echo ""
    echo "This usually means pdfjs-dist is not installed."
    echo "Run: npm install"
    echo ""
    exit 1
fi

# Copy worker file
cp "$SOURCE" "$DEST"

# Get file size for verification
SIZE=$(stat -f%z "$DEST" 2>/dev/null || stat -c%s "$DEST" 2>/dev/null)

echo "✅ PDF.js worker synced successfully!"
echo "📦 Version: $PDFJS_VERSION"
echo "📄 File: $DEST"
echo "📊 Size: $SIZE bytes"
echo ""
echo "This ensures the worker version matches pdfjs-dist package version,"
echo "preventing COA upload errors from version mismatches."
echo ""
