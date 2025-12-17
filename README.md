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

- [`gpt-image-1`](https://platform.openai.com/docs/models/gpt-image-1) via OpenAI
- [`google/gemini-2.5-flash-image-preview`](https://openrouter.ai/google/gemini-2.5-flash-image-preview) via OpenRouter (nano-banana)

To generate images, run:

```bash
export OPENAI_API_KEY=...
export OPENROUTER_API_KEY=...
uv run generate_images.py

# Convert images/*.png to images/*.webp at 25% size and maximum lossless compresion
for f in images/*.png; do
  [ -f "${f%.png}.webp" ] && continue
  cwebp -lossless -m 6 -resize $(magick identify -format "%[fx:w*0.25]" "$f") $(magick identify -format "%[fx:h*0.25]" "$f") "$f" -o "${f%.png}.webp"
done
```

This creates `images/<image-id>.<style-id>.<model-id>.webp` for each image x style x model combination.

This is rendered by [`index.html`](index.html) and [`script.js`](script.js) as a static web site.

## License

[MIT](LICENSE)
