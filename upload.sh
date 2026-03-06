#!/usr/bin/env bash
set -euo pipefail

release="${1:-images}"
pattern="${2:-images/*.nano-banana-2.png}"

assets="$(mktemp)"
trap 'rm -f "$assets"' EXIT

gh release view "$release" --json assets --jq '.assets[].name' | sort -u >"$assets"

to_upload=()
for f in $pattern; do
  [ -f "$f" ] || continue
  b="$(basename "$f")"
  if ! grep -Fxq "$b" "$assets"; then
    to_upload+=("$f")
  fi
done

echo "Uploading ${#to_upload[@]} files to release '$release'"
if ((${#to_upload[@]})); then
  gh release upload "$release" "${to_upload[@]}"
else
  echo "Nothing new to upload."
fi
