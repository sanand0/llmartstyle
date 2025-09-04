# /// script
# requires-python = ">=3.12"
# dependencies = ["httpx", "tqdm"]
# ///

import base64
import httpx
import json
import os
from pathlib import Path
from typing import Any, Dict
from tqdm import tqdm


def openrouter(model: str, prompt: str) -> bytes:
    """Generate PNG bytes using OpenRouter (Gemini image preview)."""
    api_key = os.environ["OPENROUTER_API_KEY"]
    url = "https://openrouter.ai/api/v1/chat/completions"
    payload: Dict[str, Any] = {
        "model": model,
        "messages": [{"role": "user", "content": prompt}],
        "modalities": ["image", "text"],
    }
    headers = {"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"}
    r = httpx.post(url, headers=headers, json=payload, timeout=None)
    if r.status_code != 200:
        raise RuntimeError(f"OpenRouter API error: {r.status_code} {r.text}")
    data = r.json()
    try:
        data_uri: str = data["choices"][0]["message"]["images"][0]["image_url"]["url"]
    except (IndexError, KeyError):
        raise RuntimeError(f"Missing .choices[0].message.images[0].image_url.url: {data}")
    return base64.b64decode(data_uri.split(",", 1)[1])


def openai(model: str, prompt: str) -> bytes:
    """Generate PNG bytes using OpenAI gpt-image-1."""
    api_key = os.environ["OPENAI_API_KEY"]
    url = "https://api.openai.com/v1/images/generations"
    payload: Dict[str, Any] = {"model": model, "prompt": prompt, "size": "1024x1024"}
    headers = {"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"}
    r = httpx.post(url, headers=headers, json=payload, timeout=None)
    if r.status_code != 200:
        raise RuntimeError(f"OpenAI API error: {r.status_code} {r.text}")
    data = r.json()
    if "data" not in data or not data["data"]:
        raise RuntimeError(f"Missing .data[0].b64_json: {data}")
    b64_png: str = data["data"][0]["b64_json"]
    return base64.b64decode(b64_png)


def main() -> None:
    """Generate images for each style with both models."""
    with open("config.json", "r", encoding="utf-8") as f:
        cfg = json.load(f)

    models = [
        ("nano-banana", lambda p: openrouter("google/gemini-2.5-flash-image-preview", p)),
        ("gpt-image-1", lambda p: openai("gpt-image-1", p)),
    ]

    image_root = Path("images")
    image_root.mkdir(exist_ok=True)

    for image in cfg["images"]:
        for model_name, generator in models:
            pbar = tqdm(cfg["styles"], desc=f"{model_name} - {image['id']}")
            for style in pbar:
                out = image_root / f"{image['id']}.{style['id']}.{model_name}.png"
                if out.exists():
                    continue
                pbar.set_postfix_str(style["id"])
                prompt = f"{image['prompt']}\nStyle: {style['prompt']}"
                png_bytes = generator(prompt)
                out.write_bytes(png_bytes)


if __name__ == "__main__":
    main()
