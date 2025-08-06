#!/bin/bash

# Required parameters:
# @raycast.schemaVersion 1
# @raycast.title pngpaste
# @raycast.mode silent

# Optional parameters:
# @raycast.icon 📝

# Documentation:
# @raycast.description get binary png from clipboard (by shottr) and then throw it into a tmp file and then output a filelink

# ----- CONFIG -----
DIR="${1:-$HOME/tmp/screenshots}" # first arg or /tmp
PREFIX="shottr-$(date +%s)"                  # unique-ish
# ------------------

mkdir -p "$DIR"
FILE="$(mktemp "$DIR/$PREFIX-XXXXXX.png")"

# Dump PNG bytes from NSPasteboard to FILE
if pngpaste "$FILE" 2>/dev/null; then
  printf '%s' "$FILE" | pbcopy # put the *path* back in clipboard
  echo "Copied path: $FILE"    # Raycast HUD
else
  osascript -e 'display notification "Clipboard does not contain an image" \
                with title "Clip ➜ Path failed"'
  exit 1
fi
