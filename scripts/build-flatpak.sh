#!/bin/bash

# Script to build Flatpak package from AppImage
# This should be run after the AppImage is built

set -e

echo "Building Flatpak package for foozol..."

# Check if flatpak-builder is installed
if ! command -v flatpak-builder &> /dev/null; then
    echo "Error: flatpak-builder is not installed"
    echo "Please install it with: sudo apt install flatpak-builder"
    exit 1
fi

# Check if AppImage exists
APPIMAGE=$(ls dist-electron/foozol-*-x64.AppImage 2>/dev/null | head -n1)
if [ -z "$APPIMAGE" ]; then
    echo "Error: No AppImage found in dist-electron/"
    echo "Please build the AppImage first with: pnpm run build:linux"
    exit 1
fi

echo "Found AppImage: $APPIMAGE"

# Install required runtime and SDK if not present
echo "Installing Flatpak runtime and SDK..."
flatpak install -y flathub org.freedesktop.Platform//23.08 org.freedesktop.Sdk//23.08 org.electronjs.Electron2.BaseApp//23.08 || true

# Update the manifest with the actual AppImage path
sed -i "s|path: dist-electron/foozol-\*.AppImage|path: $APPIMAGE|" com.dcouple.foozol.yml

# Build the Flatpak
echo "Building Flatpak..."
flatpak-builder --force-clean --repo=repo build-dir com.dcouple.foozol.yml

# Create a single-file bundle
echo "Creating Flatpak bundle..."
flatpak build-bundle repo foozol.flatpak com.dcouple.foozol

# Restore the manifest
git checkout com.dcouple.foozol.yml

echo "Flatpak bundle created: foozol.flatpak"
echo ""
echo "To install locally:"
echo "  flatpak install foozol.flatpak"
echo ""
echo "To run:"
echo "  flatpak run com.dcouple.foozol"