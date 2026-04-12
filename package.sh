#!/bin/bash
set -e
UUID=$(basename "$(pwd)")

echo "Packing extension for release..."
gnome-extensions pack --force \
  --extra-source=LICENSE \
  --extra-source=README.md \
  --extra-source=gnome-foot.svg \
  --out-dir=.

echo "Package ready: $(pwd)/${UUID}.shell-extension.zip"