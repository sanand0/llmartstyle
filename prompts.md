# Prompts

## Add comic styles

<!--
config.json updated based on https://claude.ai/chat/f17b4370-ad70-4265-bef1-02cfc03481a3 | https://claude.ai/share/646de8ff-2bc0-416b-bd6b-a9863e043f23
-->

Run `uv run generate_images.py` and generate the comics (which are pending). In the process, the image generation models may complain, e.g. saying that the image generation is prohibited, perhaps for copyright reasons. In that case, modify the prompt / name in config.json so as the achieve the same effect but without triggering copyright issues.

---

Some of these are TOO stereotypical. For example, the Amar Chitra Katha images ALL have multiple hands - but that's crazy, most Amar Chitra Katha comics are about normal people with two hands! Look for similar stereotypes and remove that. Don't change ALL the prompts -- only change those prompts where there is CLEAR stereotyping that won't generalize to the majority of comics.

---

Delete the images for these and re-run the generation.

## Lazy loading of images (GitHub Copilot, gpt-5.4 medium)

In index.html / script.js, make sure all thumbnails (.comparison-thumb) are lazy-loaded.
