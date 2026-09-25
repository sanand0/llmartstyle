#!/usr/bin/env bash
set -euo pipefail

repo="sanand0/llmartstyle"
release_webp_dir="${RELEASE_WEBP_DIR:-.release-webp}"
all_models_json='["gpt-image-2","gpt-image-2.5-flare","nano-banana-2","nano-banana","gpt-image-1.5","gpt-image-1"]'
min_age_seconds="${MIN_PNG_AGE_SECONDS:-5}"
delete_release_pngs="${DELETE_RELEASE_PNGS:-1}"

for cmd in cwebp gh jaq magick timeout; do
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
  if ! jaq -e --arg category "$category" '.[$category]' config.json >/dev/null; then
    echo "Unknown category: $category" >&2
    exit 1
  fi
done

mkdir -p "$release_webp_dir"

fetch_assets() {
  local release_id="$1" outfile="$2"
  gh api --paginate --slurp \
    "repos/$repo/releases/$release_id/assets?per_page=100" >"$outfile"
}

asset_exists() {
  local assets_json="$1" name="$2"
  jaq -e --arg name "$name" 'any(.[][]; .name == $name)' "$assets_json" >/dev/null
}

compress_webps() {
  local category="$1" src="$2" stem thumb full width height now mtime tmp
  stem="$(basename "${src%.png}")"
  thumb="images/$stem.webp"
  full="$release_webp_dir/$category/$stem.webp"
  mkdir -p "$(dirname "$full")"

  # A generator may be writing a brand-new PNG. Skip very new files this pass.
  now="$(date +%s)"
  mtime="$(stat -c %Y "$src")"
  if ((now - mtime < min_age_seconds)); then
    echo "Skipping very new PNG this pass: $src" >&2
    return 1
  fi

  if [[ ! -f "$thumb" || "$src" -nt "$thumb" ]]; then
    read -r width height < <(magick identify -format '%w %h' "$src")
    tmp="$thumb.tmp.$$"
    cwebp -quiet -lossless -m 6 -mt \
      -resize "$(((width + 3) / 4))" "$(((height + 3) / 4))" \
      "$src" -o "$tmp"
    mv "$tmp" "$thumb"
  fi

  if [[ ! -f "$full" || "$src" -nt "$full" ]]; then
    tmp="$full.tmp.$$"
    cwebp -quiet -q 95 -m 6 -mt -sharp_yuv "$src" -o "$tmp"
    mv "$tmp" "$full"
  fi

  printf '%s\n' "$full"
}

for category in "${categories[@]}"; do
  release="$category"
  sources="$(mktemp)"
  assets_before="$(mktemp)"

  if ! gh release view "$release" --repo "$repo" >/dev/null 2>&1; then
    gh release create "$release" --repo "$repo" \
      --title "$category" --notes "AI-generated images for $category"
  fi
  release_id="$(gh api "repos/$repo/releases/tags/$release" --jq '.id')"
  fetch_assets "$release_id" "$assets_before"

  # Snapshot configured PNGs that already exist. A concurrently running
  # generator may add more later; the next deploy will pick them up.
  jaq -r --arg category "$category" --argjson all_models "$all_models_json" '
    .[$category] as $cfg
    | ($cfg.models // $all_models) as $models
    | $cfg.images[] as $image
    | $cfg.styles[] as $style
    | $models[] as $model
    | "images/\($image.id).\($style.id).\($model).png"
  ' config.json | while IFS= read -r f; do
    [[ -f "$f" ]] && printf '%s\n' "$f"
  done >"$sources"

  # Migrate legacy release PNGs too, even if they are no longer in config.
  jaq -r '.[][] | .name | select(endswith(".png"))' "$assets_before" |
    while IFS= read -r name; do
      [[ -f "images/$name" ]] && printf '%s\n' "images/$name"
    done >>"$sources"
  sort -u -o "$sources" "$sources"

  to_upload=()
  generated=0
  while IFS= read -r src; do
    if full="$(compress_webps "$category" "$src")"; then
      generated=$((generated + 1))
      name="$(basename "$full")"
      if ! asset_exists "$assets_before" "$name"; then
        to_upload+=("$full")
      fi
    fi
  done <"$sources"

  echo "$category: prepared $generated WebP pairs; uploading ${#to_upload[@]} new full-size WebPs"
  if ((${#to_upload[@]})); then
    batch_size="${UPLOAD_BATCH_SIZE:-10}"
    for ((i = 0; i < ${#to_upload[@]}; i += batch_size)); do
      batch=("${to_upload[@]:i:batch_size}")
      if timeout 90s gh release upload "$release" --repo "$repo" "${batch[@]}"; then
        continue
      fi

      # A failed batch can have partially succeeded. Refresh the remote list
      # and retry only assets that are still missing.
      retry_assets="$(mktemp)"
      fetch_assets "$release_id" "$retry_assets"
      for full in "${batch[@]}"; do
        name="$(basename "$full")"
        asset_exists "$retry_assets" "$name" && continue
        uploaded=0
        for attempt in 1 2 3; do
          if timeout 45s gh release upload "$release" --repo "$repo" "$full"; then
            uploaded=1
            break
          fi
          sleep "$attempt"
          fetch_assets "$release_id" "$retry_assets"
          if asset_exists "$retry_assets" "$name"; then
            uploaded=1
            break
          fi
        done
        if ((uploaded == 0)); then
          echo "Failed to upload after retries: $full" >&2
          rm -f "$retry_assets"
          exit 1
        fi
      done
      rm -f "$retry_assets"
    done
  fi

  assets_after="$(mktemp)"
  fetch_assets "$release_id" "$assets_after"

  delete_ids=()
  while IFS=$'\t' read -r name id; do
    replacement="${name%.png}.webp"
    if asset_exists "$assets_after" "$replacement"; then
      delete_ids+=("$id")
    fi
  done < <(jaq -r '.[][] | select(.name | endswith(".png")) | [.name, (.id|tostring)] | @tsv' "$assets_after")

  if [[ "$delete_release_pngs" == "1" ]]; then
    echo "$category: deleting ${#delete_ids[@]} PNG release assets with verified WebP replacements"
    if ((${#delete_ids[@]})); then
      delete_jobs="${DELETE_JOBS:-8}"
      export repo
      delete_one() {
        local id="$1" err
        err="$(mktemp)"
        if gh api --method DELETE "repos/$repo/releases/assets/$id" >/dev/null 2>"$err"; then
          rm -f "$err"
          return 0
        fi
        if grep -q 'Not Found (HTTP 404)' "$err"; then
          rm -f "$err"
          return 0
        fi
        cat "$err" >&2
        rm -f "$err"
        return 1
      }
      export -f delete_one
      printf '%s\0' "${delete_ids[@]}" |
        xargs -0 -n 1 -P "$delete_jobs" bash -c 'delete_one "$1"' _
    fi
  else
    echo "$category: keeping PNG release assets for this pass"
  fi

  rm -f "$assets_before" "$assets_after" "$sources"
done
