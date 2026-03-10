# /// script
# requires-python = ">=3.12"
# dependencies = ["httpx", "python-dotenv", "tqdm"]
# ///

import base64
import httpx
import json
import os
import time
from dotenv import load_dotenv
from pathlib import Path
from typing import Any, Dict
from tqdm import tqdm


def gemini(model: str, prompt: str) -> bytes:
    """Generate PNG bytes using the Gemini API."""
    api_key = os.environ["GEMINI_API_KEY"]
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"
    prompt = f"{prompt}\n\nOutput requirement: Return only an image. Do not return text."
    payload: Dict[str, Any] = {
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {"responseModalities": ["IMAGE"]},
    }
    headers = {"x-goog-api-key": api_key, "Content-Type": "application/json"}
    for attempt in range(3):
        r = httpx.post(url, headers=headers, json=payload, timeout=None)
        if r.status_code != 200:
            raise RuntimeError(f"Gemini API error: {r.status_code} {r.text}")
        data = r.json()
        candidate = data.get("candidates", [{}])[0]
        parts = candidate.get("content", {}).get("parts", [])
        for part in parts:
            inline = part.get("inlineData") or part.get("inline_data")
            if inline and "data" in inline:
                return base64.b64decode(inline["data"])

        if candidate.get("finishReason") == "NO_IMAGE" and attempt < 2:
            time.sleep(1.5)
            continue
        raise RuntimeError(f"Missing image data in .candidates[0].content.parts: {data}")


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
        full_cfg = json.load(f)

    models = [
        ("nano-banana-2", lambda p: gemini("gemini-3.1-flash-image-preview", p)),
        ("nano-banana", lambda p: gemini("gemini-2.5-flash-image", p)),
        ("gpt-image-1.5", lambda p: openai("gpt-image-1.5", p)),
        ("gpt-image-1", lambda p: openai("gpt-image-1", p)),
    ]

    image_root = Path("images")
    image_root.mkdir(exist_ok=True)

    for cfg in full_cfg.values():
        for image in cfg["images"]:
            for model_name, generator in models:
                pbar = tqdm(cfg["styles"], desc=f"{model_name} - {image['id']}")
                model_quota_exceeded = False
                for style in pbar:
                    out = image_root / f"{image['id']}.{style['id']}.{model_name}.png"
                    pbar.set_postfix_str(style["id"])
                    if out.exists():
                        continue
                    if model_quota_exceeded:
                        tqdm.write(f"  SKIP (quota) {out.name}")
                        continue
                    prompt = f"{image['prompt']}\nStyle: {style['prompt']}"
                    try:
                        png_bytes = generator(prompt)
                        out.write_bytes(png_bytes)
                    except RuntimeError as e:
                        msg = str(e)
                        if "429" in msg or "quota" in msg.lower() or "RESOURCE_EXHAUSTED" in msg:
                            tqdm.write(f"  QUOTA exceeded for {model_name}, skipping remaining.")
                            model_quota_exceeded = True
                        elif any(w in msg.lower() for w in ("safety", "policy", "prohibited", "copyright", "content_filter", "content filter")):
                            tqdm.write(f"  BLOCKED (policy) {out.name}: {msg[:200]}")
                        else:
                            tqdm.write(f"  ERROR {out.name}: {msg[:200]}")


if __name__ == "__main__":
    load_dotenv()
    main()
