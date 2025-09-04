import { html, render } from "https://cdn.jsdelivr.net/npm/lit-html@3/+esm";
import { bootstrapAlert } from "https://cdn.jsdelivr.net/npm/bootstrap-alert@1";

const models = ["nano-banana", "gpt-image-1"]; // column = image, then model
const statusEl = document.getElementById("status");
const gridEl = document.getElementById("grid");

const onCopy = (text) => {
  navigator.clipboard.writeText(text);
  bootstrapAlert({ body: "Prompt copied", color: "success" });
};
const cfg = await fetch("./config.json").then((r) => r.json());

// Provide only the grid template; import libs in index.html
const header = html` <div class="d-flex align-items-stretch border-bottom bg-body-tertiary">
  <div class="p-2 small text-uppercase fw-semibold text-secondary" style="width: 300px">Style</div>
  <div class="flex-grow-1 d-flex flex-row flex-wrap">
    ${cfg.images.map(
      (img) => html`
        <div class="p-2 border-start text-center" style="width: 320px">
          <div class="fw-semibold">${img.name}</div>
          <div class="small text-body-secondary">${img.prompt}</div>
          <div class="row">
            ${models.map((m) => html`<div class="col"><span class="badge text-bg-light border">${m}</span></div>`)}
          </div>
        </div>
      `,
    )}
  </div>
</div>`;

const rows = cfg.styles.map((style) => {
  return html` <div class="d-flex align-items-start border-bottom">
    <div class="p-3" style="width: 300px">
      <div class="fw-semibold">${style.name}</div>
      <div class="small text-body-secondary">${style.prompt}</div>
      <button class="btn btn-sm btn-outline-secondary mt-2" title="Copy prompt" @click=${() => onCopy(style.prompt)}>
        <i class="bi bi-clipboard"></i>
        <span class="ms-1">Copy</span>
      </button>
    </div>
    <div class="flex-grow-1 d-flex flex-row flex-wrap gap-2 p-2">
      ${cfg.images.map((image) =>
        models.map(
          (model) => html`
            <div class="p-1 text-center" style="width: 150px">
              <img
                class="img-fluid rounded border"
                style="max-height: 150px"
                alt="${model} — ${style.name}"
                src="images/${image.id}.${style.id}.${model}.webp"
              />
            </div>
          `,
        ),
      )}
    </div>
  </div>`;
});

render(html`<div class="border rounded overflow-auto">${header}${rows}</div>`, gridEl);
gridEl.style.width = `${cfg.images.length * 320 + 300 + 8}px`;
statusEl.classList.add("d-none");
