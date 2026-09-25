#!/usr/bin/env bash
set -euo pipefail

repo="sanand0/llmartstyle"
batch_size="${UPLOAD_BATCH_SIZE:-10}"

for cmd in cwebp gh jaq identify timeout; do
  command -v "$cmd" >/dev/null || {
    echo "Missing required command: $cmd" >&2
    exit 1
  }
done

if (($#)); then
  categories=("$@")
else
  mapfile -t categories < <(jaq -r 'keys[]' config.json)
fi

for category in "${categories[@]}"; do
  jaq -e --arg category "$category" '.[$category]' config.json >/dev/null || {
    echo "Unknown category: $category" >&2
    exit 1
  }
done

tmpdir="$(mktemp -d)"
trap 'rm -rf "$tmpdir"' EXIT

for category in "${categories[@]}"; do
  if ! gh release view "$category" --repo "$repo" >/dev/null 2>&1; then
    gh release create "$category" --repo "$repo" \
      --title "$category" --notes "AI-generated images for $category"
  fi

  remote_assets="$tmpdir/$category-assets.txt"
  gh release view "$category" --repo "$repo" --json assets \
    --jq '.assets[].name' >"$remote_assets"

  to_upload=()

  while IFS= read -r src; do
    [[ -f "$src" ]] || continue

    stem="$(basename "${src%.png}")"
    thumb="images/$stem.webp"

    if [[ ! -f "$thumb" || "$src" -nt "$thumb" ]]; then
      read -r width height < <(identify -format '%w %h\n' "$src")
      tmp="$thumb.tmp.$$"
      cwebp -quiet -lossless -m 6 -mt \
        -resize "$(((width + 3) / 4))" "$(((height + 3) / 4))" \
        "$src" -o "$tmp"
      mv "$tmp" "$thumb"
    fi

    name="$stem.webp"
    grep -Fxq "$name" "$remote_assets" && continue

    full="$tmpdir/$category/$name"
    mkdir -p "$(dirname "$full")"
    cwebp -quiet -q 95 -m 6 -mt -sharp_yuv "$src" -o "$full"
    to_upload+=("$full")
  done < <(
    jaq -r --arg category "$category" '
      .[$category] as $cfg
      | $cfg.images[] as $image
      | $cfg.styles[] as $style
      | $cfg.models[] as $model
      | "images/\($image.id).\($style.id).\($model).png"
    ' config.json
  )

  echo "$category: uploading ${#to_upload[@]} new full-size WebPs"

  for ((i = 0; i < ${#to_upload[@]}; i += batch_size)); do
    batch=("${to_upload[@]:i:batch_size}")
    if ! timeout 90s gh release upload "$category" --repo "$repo" "${batch[@]}"; then
      echo "Upload failed or timed out. Re-run 'just deploy'; existing assets will be skipped." >&2
      exit 1
    fi
  done
done
