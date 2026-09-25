# LLM Art Style

LLMs create photos, comics, etc. as easily as unusual illustrations. [I prompted](https://chatgpt.com/share/68b99672-c6ec-800c-a22d-38404933bd8d):

> Suggest unusual illustration styles not popular yet visually striking.

[LLM Art Style](https://sanand0.github.io/llmartstyle/) shows less popular art styles (with prompts) that you can have your model create.

## Generation

`config.json` defines the images, styles, and models. Generated files use:

```text
<image-id>.<style-id>.<model-id>
```

The configured models are:

- [`gpt-image-2`](https://developers.openai.com/api/docs/models/gpt-image-2)
- [`gpt-image-2.5-flare`](https://developers.openai.com/api/docs/models/gpt-image-2.5-flare), at medium quality
- [`gemini-3.1-flash-image-preview`](https://ai.google.dev/gemini-api/docs/image-generation), stored as `nano-banana-2`

Run:

```bash
just build
```

This runs `uv run generate_images.py` and creates only missing PNG masters:

```text
images/<name>.png
```

PNG masters are ignored by Git and retained locally as the source-of-truth images.

## WebP deployment

Run:

```bash
just deploy
```

This runs `upload.sh` for every configured PNG master and creates two WebP forms:

| Purpose | Where created/stored | Encoding | Used by |
| --- | --- | --- | --- |
| Thumbnail | `images/<name>.webp` | 25% dimensions, lossless WebP | GitHub Pages grid and hover preview |
| Full-size | temporary file during deploy, then GitHub Release | Original dimensions, WebP quality 95, `-sharp_yuv` | Click/zoom modal |

### Thumbnails

Thumbnail WebPs are generated approximately as:

```bash
cwebp -lossless -m 6 -mt -resize <25%-width> <25%-height> input.png -o images/<name>.webp
```

They are tracked by Git. `script.js` loads them directly from GitHub Pages:

```text
images/<image-id>.<style-id>.<model-id>.webp
```

`just deploy` creates or refreshes them but does not commit them. Commit and push changed `images/*.webp` files to publish them on GitHub Pages.
Before reusing a thumbnail, deployment verifies that its pixel dimensions are exactly one-quarter of its PNG master; a wrongly sized WebP is regenerated even if it is newer than the PNG.

### Full-size images

A full-resolution WebP is generated only when its Release asset is missing:

```bash
cwebp -q 95 -m 6 -mt -sharp_yuv input.png -o <temporary>/<name>.webp
```

It is uploaded with `gh release upload` and the temporary local file is deleted when deployment exits. There is no persistent full-size WebP cache.

Each category has its own GitHub Release/tag:

```text
art  comic  map  pop  text  text2
```

For example, the `map` modal loads:

```text
https://github.com/sanand0/llmartstyle/releases/download/map/world.babylonian-tablet.gpt-image-2.webp
```

Release assets are WebP-only. PNGs are never uploaded to Releases.

Deployment is incremental: existing thumbnail WebPs are reused when newer than their PNG master, and existing Release WebPs are skipped by filename. If an upload times out or partially succeeds, rerun `just deploy`; already-uploaded assets are skipped.

You can deploy selected categories directly:

```bash
./upload.sh pop art
```

Or run the complete pipeline:

```bash
just build deploy
```

That means:

1. Generate missing local PNG masters.
2. Generate/update Git-tracked thumbnail WebPs.
3. Generate full-size WebPs only for missing Release assets.
4. Upload those full-size WebPs and discard the temporary copies.

After generating new images, publish the thumbnails/config/site changes normally:

```bash
git add config.json generate_images.py images/*.webp
git commit -m "Update generated images"
git push
```

## License

[MIT](LICENSE)
