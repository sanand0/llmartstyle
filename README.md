# LLM Art Style

LLMs create photos, comics, etc. as easily as unusual illustrations. [I prompted](https://chatgpt.com/share/68b99672-c6ec-800c-a22d-38404933bd8d):

> Suggest unusual illustration styles not popular yet visually striking.

[LLM Art Style](https://sanand0.github.io/llmartstyle/) shows less popular art styles (with prompts) that you can have your model create.

## Generation

`config.json` has the matrix of images and prompts. It is an object with keys:

- `images`: an array of image objects to draw, each with:
  - `name`: display name of the image
  - `id`: unique ID for the filename
  - `prompt`: for the LLM to generate
- `.styles`: an array of style objects to apply, each with:
  - `name`: display name of the style
  - `id`: unique ID for the filename
  - `prompt`: for the LLM to generate

We currently generate images using:

- [`gemini-3.1-flash-image-preview`](https://ai.google.dev/gemini-api/docs/image-generation) via Gemini API (nano-banana-2)
- [`gpt-image-1`](https://platform.openai.com/docs/models/gpt-image-1) via OpenAI
- [`gemini-2.5-flash-image`](https://ai.google.dev/gemini-api/docs/image-generation) via Gemini API (nano-banana)

To generate images, run:

```bash
export OPENAI_API_KEY=...
export GEMINI_API_KEY=...
uv run generate_images.py

# Convert images/*.png to images/*.webp at 25% size and maximum lossless compresion
for f in images/*.png; do
  [ -f "${f%.png}.webp" ] && continue
  cwebp -lossless -m 6 -resize $(magick identify -format "%[fx:w*0.25]" "$f") $(magick identify -format "%[fx:h*0.25]" "$f") "$f" -o "${f%.png}.webp"
done
```

This creates `images/<image-id>.<style-id>.<model-id>.webp` for each image x style x model combination.

This is rendered by [`index.html`](index.html) and [`script.js`](script.js) as a static web site.

## Deploy

The images are on GitHub releases at <https://github.com/sanand0/llmartstyle/releases/tag/images> created via:

```bash
gh release create images --title "Images" --notes "AI-generated images"
```

To upload all, run:

```bash
gh release upload images images/*.png
```

To upload only new `nano-banana-2` PNG files (skip assets already in the release), run:

```bash
./upload.sh
```

You can also pass a different release name and glob:

```bash
./upload.sh <release> <glob-pattern>
```

## License

[MIT](LICENSE)
