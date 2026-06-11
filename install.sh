#!/usr/bin/env bash
set -euo pipefail

REPO="ihxnnxs/aix"
INSTALL_DIR="$HOME/.aix/bin"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

os=$(uname -s | tr '[:upper:]' '[:lower:]')
arch=$(uname -m)

case "$arch" in
  aarch64|arm64) arch="arm64" ;;
  x86_64|amd64) arch="x64" ;;
  *) echo -e "${RED}Unsupported architecture: $arch${NC}"; exit 1 ;;
esac

case "$os" in
  linux|darwin) ;;
  mingw*|msys*|cygwin*) os="windows" ;;
  *) echo -e "${RED}Unsupported OS: $os${NC}"; exit 1 ;;
esac

filename="aix-${os}-${arch}"

if [[ "$os" == "windows" ]]; then
  filename="${filename}.zip"
else
  filename="${filename}.tar.gz"
fi

sha256_file() {
  if command -v sha256sum >/dev/null 2>&1; then
    sha256sum "$1" | awk '{print $1}'
  elif command -v shasum >/dev/null 2>&1; then
    shasum -a 256 "$1" | awk '{print $1}'
  else
    return 1
  fi
}

lowercase() {
  printf '%s' "$1" | tr 'A-F' 'a-f'
}

requested_version=${VERSION:-}

if [ -z "$requested_version" ]; then
  url="https://github.com/${REPO}/releases/latest/download/${filename}"
  version=$(curl -sI "https://github.com/${REPO}/releases/latest" | grep -i "^location:" | sed 's/.*tag\///' | tr -d '\r\n')
else
  url="https://github.com/${REPO}/releases/download/v${requested_version}/${filename}"
  version="v${requested_version}"
fi

echo -e "${CYAN}░█▀█░▀█▀░█░█░${NC}"
echo -e "${CYAN}░█▀█░░█░░▄▀▄░${NC}"
echo -e "${CYAN}░▀░▀░▀▀▀░▀░▀░${NC}"
echo ""
echo -e "${GREEN}Installing aix ${YELLOW}${version}${GREEN} (${os}/${arch})...${NC}"

mkdir -p "$INSTALL_DIR"
tmpdir=$(mktemp -d)
trap 'rm -rf "$tmpdir"' EXIT

curl -#fSL "$url" -o "$tmpdir/$filename"

checksum_url="${url}.sha256"
checksum_file="$tmpdir/$filename.sha256"
if curl -fsSL "$checksum_url" -o "$checksum_file"; then
  expected_checksum=$(sed -nE 's/.*([a-fA-F0-9]{64}).*/\1/p' "$checksum_file" | sed -n '1p')
  if [ -z "$expected_checksum" ]; then
    echo -e "${RED}Invalid checksum file: ${checksum_url}${NC}"
    exit 1
  fi
  if ! actual_checksum=$(sha256_file "$tmpdir/$filename"); then
    echo -e "${RED}Cannot verify checksum: sha256sum or shasum is required${NC}"
    exit 1
  fi
  if [ "$(lowercase "$actual_checksum")" != "$(lowercase "$expected_checksum")" ]; then
    echo -e "${RED}Checksum verification failed for ${filename}${NC}"
    exit 1
  fi
  echo -e "${GREEN}Checksum verified.${NC}"
else
  echo -e "${YELLOW}Checksum file unavailable, continuing without verification.${NC}"
fi

if [[ "$os" == "windows" ]]; then
  unzip -q "$tmpdir/$filename" -d "$tmpdir"
  mv "$tmpdir/aix.exe" "$INSTALL_DIR/"
else
  tar xzf "$tmpdir/$filename" -C "$tmpdir"
  mv "$tmpdir/aix" "$INSTALL_DIR/"
  chmod +x "$INSTALL_DIR/aix"
fi

if [[ ":$PATH:" == *":$INSTALL_DIR:"* ]]; then
  echo -e "${GREEN}aix installed successfully!${NC}"
  exit 0
fi

XDG_CONFIG_HOME=${XDG_CONFIG_HOME:-$HOME/.config}
current_shell=$(basename "${SHELL:-bash}")
path_export="export PATH=\"$INSTALL_DIR:\$PATH\""

case $current_shell in
  fish)
    config_files="$HOME/.config/fish/config.fish $XDG_CONFIG_HOME/fish/config.fish"
    path_export="fish_add_path $INSTALL_DIR"
    ;;
  zsh)
    config_files="$HOME/.zshrc $HOME/.zshenv"
    ;;
  bash)
    config_files="$HOME/.bashrc $HOME/.bash_profile $HOME/.profile"
    ;;
  *)
    config_files="$HOME/.profile"
    ;;
esac

config_file=""
for file in $config_files; do
  if [[ -f "$file" ]]; then
    config_file="$file"
    break
  fi
done

if [[ -n "$config_file" ]] && [[ -w "$config_file" ]]; then
  echo "" >> "$config_file"
  echo "# aix" >> "$config_file"
  echo "$path_export" >> "$config_file"
  echo -e "${GREEN}aix installed successfully!${NC}"
  echo -e "${GREEN}Added to PATH in ${YELLOW}${config_file}${NC}"
  echo -e "${YELLOW}Restart your shell or run:${NC} source $config_file"
else
  echo -e "${GREEN}aix installed to ${YELLOW}${INSTALL_DIR}/aix${NC}"
  echo -e "${YELLOW}Add to PATH manually:${NC} $path_export"
fi

if [ -n "${GITHUB_ACTIONS-}" ] && [ "${GITHUB_ACTIONS}" == "true" ]; then
  echo "$INSTALL_DIR" >> "$GITHUB_PATH"
fi
