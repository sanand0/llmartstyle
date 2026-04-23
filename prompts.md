# Prompts

## Add gpt-image-2, 23 Apr 2026

<!--
cd ~/code/llmartstyle
dev.sh
codex --yolo --model gpt-5.4 --config model_reasoning_effort=xhigh
--->

OpenAI has released a GPT image 2, which is a new image model. It works exactly the same way as GPT image 1.5. Update the config integrations and code minimally as required to add a column for this model as well.

Test the code for a small sample and make sure everything is okay. If it works then run it for the entire batch. Stop if you're stuck anywhere and take my help.

---

Reorder (wherever relevant) to make gpt-image-2 the first model instead of the last.

Upload the images to the server.

---

Add and commit all files (including prompts.md which I edited) and push.

## Add map styles, 02 Apr 2026

<!--
config.json updated based on https://chatgpt.com/c/69ce3bfd-c964-839c-9d3b-25a434cc986c | https://claude.ai/chat/4146dc23-94c5-4042-8abf-2c89f7601f18

codex --yolo --model gpt-5.4 --config model_reasoning_effort=medium
-->

I've added a `map` section to config.json. Run `uv run generate_images.py` to generate the new map images. Make whatever additional changes are required for the Map section to be visible.

---

Is it done? It seems to be stuck...

---

Check the timestamps. The last image generated seems a long time ago.

Also, drop the PNG fallback. We'll never commit PNGs. Make sure that there are MINIMAL changes to script.js, if any are needed at all.

---

Restart the generator. Check in periodically and let me know its progress.

---

Modify config.json so that for each style (pop, art, map, ...) we can pick which models to generate with.

For the others, use all existing models. For map, limit to nano-banana-2 and gpt-image-1.5 only.

Test and verify.

Also, we GitHub Releases only allows 1K images per release. So split the GitHub releases into one release per style (pop, art, map, ...) and upload the images into those (use sub-agents to run this in the background). Modify all code and docs to reflect this. Keep in mind that for each style, we should only upload the files generated for the models applicable to that style, e.g. for "map", we only want to upload the nano-banana-2 and gpt-image-1.5 images, not others.

<!-- codex resume 019d4e15-4e4d-75a0-b18b-d04c7604d6a5 -->

## Add comic styles, 10 Mar 2026 (GitHub Copilot, claude-sonnet-4.6 high)

<!--
config.json updated based on https://claude.ai/chat/f17b4370-ad70-4265-bef1-02cfc03481a3 | https://claude.ai/share/646de8ff-2bc0-416b-bd6b-a9863e043f23
-->

Run `uv run generate_images.py` and generate the comics (which are pending). In the process, the image generation models may complain, e.g. saying that the image generation is prohibited, perhaps for copyright reasons. In that case, modify the prompt / name in config.json so as the achieve the same effect but without triggering copyright issues.

---

Some of these are TOO stereotypical. For example, the Amar Chitra Katha images ALL have multiple hands - but that's crazy, most Amar Chitra Katha comics are about normal people with two hands! Look for similar stereotypes and remove that. Don't change ALL the prompts -- only change those prompts where there is CLEAR stereotyping that won't generalize to the majority of comics.

---

Delete the images for these and re-run the generation.

## Lazy loading of images, 10 Mar 2026 (GitHub Copilot, gpt-5.4 medium)

In index.html / script.js, make sure all thumbnails (.comparison-thumb) are lazy-loaded.
