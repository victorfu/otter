#!/bin/sh

# Linux installer for Otter
# Supports Linux x86-64 with RPM / DEB / PKG / Arch (otter-bin)
# Accepts tag in the first argument

# Usage:
# ./installer.sh {tag}

# Available at https://victorfu.github.io/otter/installer.sh
# Via curl -sSf https://victorfu.github.io/otter/installer.sh | sh -s {tag}

set -e

TAG=$1
TAG_WITHOUT_V=$(echo "$TAG" | sed 's/^v//')

echo "tag is $TAG"
if [ -z "$TAG" ]; then
    echo "Error: No tag specified. Usage: ./installer.sh {tag}"
    exit 1
fi

# Detect architecture
ARCH=$(uname -m)
case "$ARCH" in
    x86_64)
        DEB_ARCH="amd64"
        RPM_ARCH="x86_64"
        ;;
    aarch64|arm64)
        DEB_ARCH="arm64"
        RPM_ARCH="aarch64"
        ;;
    *)
        echo "Error: Unsupported architecture: $ARCH"
        exit 1
        ;;
esac

# Determine the package type and download the appropriate file
echo "Downloading Otter version $TAG for $ARCH..."

RPM_URL="https://github.com/victorfu/otter/releases/download/${TAG}/otter-${TAG_WITHOUT_V}-1.${RPM_ARCH}.rpm"
DEB_URL="https://github.com/victorfu/otter/releases/download/${TAG}/otter_${TAG_WITHOUT_V}_${DEB_ARCH}.deb"
echo $RPM_URL
# Create temporary directory for downloading
TEMP_DIR=$(mktemp -d)
cd $TEMP_DIR

# Download the correct package based on the distribution
if [ -f /etc/os-release ]; then
    # Check for the package manager
    if grep -iq "ubuntu\|debian" /etc/os-release; then
        echo "Detected Debian/Ubuntu. Downloading DEB package..."
        wget "$DEB_URL" -O otter.deb
        sudo apt-get install -y ./otter.deb
    elif grep -iq "centos\|fedora\|rhel" /etc/os-release; then
        echo "Detected CentOS/Fedora/RHEL. Downloading RPM package..."
        wget -q "$RPM_URL" -O otter.rpm
        sudo rpm -ivh otter.rpm
    elif grep -iq "arch" /etc/os-release; then
        # otter-bin is in the AUR, not the official repos. Prompts read from the terminal,
        # since stdin is the script itself when piped from curl.
        echo "Detected Arch Linux. Installing otter-bin from the AUR..."
        if command -v paru >/dev/null 2>&1; then
            paru -S --needed otter-bin </dev/tty
        elif command -v yay >/dev/null 2>&1; then
            yay -S --needed otter-bin </dev/tty
        else
            echo "No AUR helper found. Building otter-bin with makepkg..."
            sudo pacman -S --needed --noconfirm git base-devel </dev/tty
            git clone https://aur.archlinux.org/otter-bin.git
            cd otter-bin
            makepkg -si </dev/tty
            cd ..
        fi
    else
        echo "Unsupported Linux distribution."
        exit 1
    fi
else
    echo "Unable to determine the package manager. Please install the package manually."
    exit 1
fi

# Clean up
cd ..
rm -rf $TEMP_DIR

echo "Otter installation complete!"
echo "Run 'otter' to open it!"

