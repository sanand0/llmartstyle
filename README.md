# LLM Art Style

LLMs create photos, comics, etc. as easily as unusual illustrations. [I prompted](https://chatgpt.com/share/68b99672-c6ec-800c-a22d-38404933bd8d):

> Suggest unusual illustration styles not popular yet visually striking.

[LLM Art Style](https://sanand0.github.io/llmartstyle/) shows less popular art styles (with prompts) that you can have your model create.

## Generation

`config.json` is the matrix of images, styles, and models. Each generated image is named:

```text
<image-id>.<style-id>.<model-id>
```

We currently generate images using:

- [`gpt-image-2`](https://developers.openai.com/api/docs/models/gpt-image-2) via OpenAI
- [`gpt-image-2.5-flare`](https://developers.openai.com/api/docs/models/gpt-image-2.5-flare) via OpenAI at medium quality
- [`gemini-3.1-flash-image-preview`](https://ai.google.dev/gemini-api/docs/image-generation) via Gemini API (`nano-banana-2`)
- [`gpt-image-1.5`](https://developers.openai.com/api/docs/models/gpt-image-1.5) via OpenAI
- [`gpt-image-1`](https://developers.openai.com/api/docs/models/gpt-image-1) via OpenAI
- [`gemini-2.5-flash-image`](https://ai.google.dev/gemini-api/docs/image-generation) via Gemini API (`nano-banana`)

Run:

```bash
just build
```

This runs `uv run generate_images.py`, which generates only missing PNG masters under:

```text
images/<image-id>.<style-id>.<model-id>.png
```

These PNGs are the source-of-truth masters. They are ignored by Git (`images/*.png`) and deployment never deletes them.

## WebP files and deployment

Run:

```bash
just deploy
```

This runs `./upload.sh`. For every available PNG master it creates two different WebP files:

| Purpose | Local path | Encoding | Stored on GitHub | Used by |
| --- | --- | --- | --- | --- |
| Thumbnail | `images/<name>.webp` | 25% dimensions, lossless WebP | Git repository / GitHub Pages | Main comparison grid and hover preview |
| Full-size image | `.release-webp/<category>/<name>.webp` | Original dimensions, WebP quality 95, `-sharp_yuv` | GitHub Release for that category | Click/zoom modal |

Here `<name>` is `<image-id>.<style-id>.<model-id>`.

### Thumbnails

`upload.sh` generates thumbnails with the equivalent of:

```bash
cwebp -lossless -m 6 -mt -resize <25%-width> <25%-height> input.png -o images/<name>.webp
```

The thumbnail WebPs live in `images/` and **are tracked by Git**. `script.js` loads them directly from GitHub Pages as:

```text
images/<image-id>.<style-id>.<model-id>.webp
```

`just deploy` creates or refreshes these files, but it does **not** commit or push them. After generating new images, commit and push the new/changed `images/*.webp` files normally for GitHub Pages to serve them.

### Full-size / zoomed images

`upload.sh` also creates a full-resolution cached WebP with the equivalent of:

```bash
cwebp -q 95 -m 6 -mt -sharp_yuv input.png -o .release-webp/<category>/<name>.webp
```

`.release-webp/` is ignored by Git. It is only a local cache so repeated deploys do not need to recompress unchanged PNGs.

The full-size WebPs are uploaded directly by `upload.sh` using `gh release upload`. Each top-level category has its own GitHub Release/tag because GitHub Releases has a 1,000-asset limit per release:

```text
art  comic  map  pop  text  text2
```

For example:

```text
local master:
  images/world.babylonian-tablet.gpt-image-2.webp      # thumbnail
  images/world.babylonian-tablet.gpt-image-2.png       # retained master

local full-size cache:
  .release-webp/map/world.babylonian-tablet.gpt-image-2.webp

GitHub Release asset:
  https://github.com/sanand0/llmartstyle/releases/download/map/world.babylonian-tablet.gpt-image-2.webp
```

The modal in `script.js` constructs that Release URL when an image is opened.

Deployment is incremental: existing thumbnails/cached WebPs are reused when newer than their PNG; only missing Release assets are uploaded. A legacy PNG asset on GitHub Releases is deleted only after its same-named `.webp` replacement has been confirmed there. **Local PNG masters are never deleted.**

You can deploy selected categories directly:

```bash
./upload.sh pop art
```

Or run the complete local pipeline:

```bash
just build deploy
```

That means:

1. Generate any missing PNG masters.
2. Generate/update committed thumbnail WebPs in `images/`.
3. Generate/update ignored full-size WebPs in `.release-webp/`.
4. Upload missing full-size WebPs to the category GitHub Releases.
5. Remove superseded PNG assets from GitHub Releases, but retain every local PNG master.

To publish new thumbnails/config/site changes to GitHub Pages after that, commit and push them, for example:

```bash
git add config.json generate_images.py README.md images/*.webp
git commit -m "Update generated images"
git push
```

## License

[MIT](LICENSE)

<!--

- text2: https://claude.ai/chat/c0fae873-e893-4e18-a161-703dbd451f36

-->
