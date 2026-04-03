#!/usr/bin/env bash
set -euo pipefail

repo="sanand0/llmartstyle"
all_models_json='["nano-banana-2","nano-banana","gpt-image-1.5","gpt-image-1"]'

if (($#)); then
  categories=("$@")
else
  mapfile -t categories < <(jaq -r 'keys[]' config.json)
fi

for category in "${categories[@]}"; do
  if ! jaq -e --arg category "$category" '.[$category]' config.json >/dev/null; then
    echo "Unknown category: $category" >&2
    exit 1
  fi
done

for category in "${categories[@]}"; do
  release="$category"
  title="$category"
  assets="$(mktemp)"

  if ! gh release view "$release" --repo "$repo" >/dev/null 2>&1; then
    gh release create "$release" --repo "$repo" --title "$title" --notes "AI-generated images for $category"
  fi

  gh release view "$release" --repo "$repo" --json assets --jq '.assets[].name' | sort -u >"$assets"

  mapfile -t files < <(
    jaq -r --arg category "$category" --argjson all_models "$all_models_json" '
      .[$category] as $cfg
      | ($cfg.models // $all_models) as $models
      | $cfg.images[] as $image
      | $cfg.styles[] as $style
      | $models[] as $model
      | "images/\($image.id).\($style.id).\($model).png"
    ' config.json
  )

  to_upload=()
  for f in "${files[@]}"; do
    [ -f "$f" ] || continue
    b="$(basename "$f")"
    if ! grep -Fxq "$b" "$assets"; then
      to_upload+=("$f")
    fi
  done

  echo "Uploading ${#to_upload[@]} files to release '$release'"
  if ((${#to_upload[@]})); then
    gh release upload "$release" --repo "$repo" "${to_upload[@]}"
  else
    echo "Nothing new to upload."
  fi

  rm -f "$assets"
done
