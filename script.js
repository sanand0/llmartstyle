import { bootstrapAlert } from "https://cdn.jsdelivr.net/npm/bootstrap-alert@1";
import { html, render } from "https://cdn.jsdelivr.net/npm/lit-html@3/+esm";

const $ = (s, el = document) => el.querySelector(s);
const models = ["nano-banana-2", "nano-banana", "gpt-image-1.5", "gpt-image-1"]; // column = image, then model
const releasePngBase = "https://github.com/sanand0/llmartstyle/releases/download/images/";
const thumbnailSize = 150;
let modalState = null;
let pendingModalSrc = "";
let activeHoverFrame = null;
let hoverPreviewToken = 0;
const modalEl = $("#imageModal");
const modalImg = $("#imageModalImg");
const modalLabel = $("#imageModalLabel");
const hoverPreview = document.createElement("img");
hoverPreview.className = "comparison-hover-preview";
document.body.appendChild(hoverPreview);

const onCopy = (text) => {
  navigator.clipboard.writeText(text);
  bootstrapAlert({ body: "Prompt copied", color: "success" });
};

const categories = await fetch("./config.json").then((r) => r.json());
const categoryIds = Object.keys(categories);

const params = new URLSearchParams(window.location.search);
const paramCategory = params.get("category");
let currentCategoryId = paramCategory && categories[paramCategory] ? paramCategory : categoryIds[0];
const currentCategory = categories[currentCategoryId];

const parseImageIds = (src) => {
  const pathname = new URL(src, location.href).pathname;
  const filename = pathname
    .split("/")
    .pop()
    .replace(/\.(webp|png)$/, "");
  const [imageId, styleId, ...modelParts] = filename.split(".");
  const model = modelParts.join(".");
  return { imageId, styleId, model };
};

const clamp = (value, max) => Math.max(0, Math.min(max, value));

const syncHoverPreviewPosition = () => {
  if (!activeHoverFrame) return;
  const bounds = activeHoverFrame.getBoundingClientRect();
  hoverPreview.style.left = `${bounds.left + bounds.width / 2}px`;
  hoverPreview.style.top = `${bounds.top + bounds.height / 2}px`;
};

const clearHoverPreview = () => {
  if (activeHoverFrame) activeHoverFrame.classList.remove("is-preview-source");
  activeHoverFrame = null;
  hoverPreview.classList.remove("is-active");
  hoverPreview.removeAttribute("src");
};

const showHoverPreview = (frameEl) => {
  hoverPreviewToken += 1;
  const token = hoverPreviewToken;
  const imgEl = $(".comparison-thumb", frameEl);
  if (!imgEl) return;
  if (activeHoverFrame && activeHoverFrame !== frameEl) clearHoverPreview();
  activeHoverFrame = frameEl;
  frameEl.classList.add("is-preview-source");
  hoverPreview.src = imgEl.currentSrc || imgEl.src;
  hoverPreview.alt = imgEl.alt;
  hoverPreview.style.width = `${imgEl.naturalWidth || thumbnailSize}px`;
  hoverPreview.style.height = `${imgEl.naturalHeight || thumbnailSize}px`;
  hoverPreview.style.setProperty("--thumb-preview-scale", `${imgEl.dataset.coverScale || 1}`);
  syncHoverPreviewPosition();
  hoverPreview.classList.remove("is-active");
  requestAnimationFrame(() => {
    if (activeHoverFrame !== frameEl || token !== hoverPreviewToken) return;
    hoverPreview.classList.add("is-active");
  });
};

const hideHoverPreview = (frameEl) => {
  if (activeHoverFrame !== frameEl) return;
  hoverPreviewToken += 1;
  const token = hoverPreviewToken;
  hoverPreview.classList.remove("is-active");
  const done = () => {
    if (activeHoverFrame !== frameEl || token !== hoverPreviewToken) return;
    clearHoverPreview();
  };
  hoverPreview.addEventListener("transitionend", done, { once: true });
  setTimeout(done, 260);
};

const setThumbnailMetrics = (imgEl) => {
  const frameEl = imgEl.closest(".comparison-thumb-frame");
  if (!frameEl) return;
  const frameWidth = frameEl.clientWidth || thumbnailSize;
  const frameHeight = frameEl.clientHeight || thumbnailSize;
  const naturalWidth = imgEl.naturalWidth || frameWidth;
  const naturalHeight = imgEl.naturalHeight || frameHeight;
  const coverScale = Math.max(frameWidth / naturalWidth, frameHeight / naturalHeight);
  imgEl.dataset.coverScale = `${coverScale}`;
  imgEl.style.setProperty("--thumb-natural-w", `${naturalWidth}px`);
  imgEl.style.setProperty("--thumb-natural-h", `${naturalHeight}px`);
  imgEl.style.setProperty("--thumb-cover-scale", `${coverScale}`);
};

const setModalLoading = (loading) => {
  modalImg.style.opacity = loading ? "0.72" : "1";
  modalImg.style.filter = loading ? "grayscale(0.2) blur(1px)" : "none";
};

const setModalImage = (state) => {
  const image = currentCategory.images[state.imageIndex];
  const style = currentCategory.styles[state.styleIndex];
  const model = models[state.modelIndex];
  const filename = `${image.id}.${style.id}.${model}.png`;
  const src = `${releasePngBase}${filename}`;
  modalLabel.textContent = modalImg.alt = `${model} — ${style.name}`;
  pendingModalSrc = src;
  setModalLoading(true);

  const preloaded = new Image();
  preloaded.onload = () => {
    if (pendingModalSrc !== src) return;
    modalImg.src = src;
    setModalLoading(false);
  };
  preloaded.onerror = () => {
    if (pendingModalSrc !== src) return;
    setModalLoading(false);
  };
  preloaded.src = src;
};

$("#category-links").insertAdjacentHTML(
  "beforeend",
  categoryIds
    .map(
      (id) =>
        `<a href="?category=${encodeURIComponent(id)}" class="btn btn-sm btn-outline-secondary category-select${
          id === currentCategoryId ? " active" : ""
        }">${id}</a>`,
    )
    .join(""),
);

const renderGrid = (cfg) => {
  // Provide only the grid template; import libs in index.html
  const header = html` <div class="d-flex align-items-stretch border-bottom bg-body-tertiary">
    <div class="p-2 small text-uppercase fw-semibold text-secondary" style="width: 300px">Style</div>
    <div class="flex-grow-1 d-flex flex-row flex-wrap">
      ${cfg.images.map(
        (img) => html`
          <div class="p-2 border-start text-center" style="width: ${models.length * (thumbnailSize + 10)}px">
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
              <div class="p-1 text-center" style="width: ${thumbnailSize}px">
                <div
                  class="comparison-thumb-frame rounded border mx-auto"
                  @mouseenter=${(e) => showHoverPreview(e.currentTarget)}
                  @mouseleave=${(e) => hideHoverPreview(e.currentTarget)}
                >
                  <img
                    class="comparison-thumb"
                    alt="${model} — ${style.name}"
                    data-bs-toggle="modal"
                    data-bs-target="#imageModal"
                    role="button"
                    title="View image"
                    loading="lazy"
                    decoding="async"
                    fetchpriority="low"
                    src="images/${image.id}.${style.id}.${model}.webp"
                    @load=${(e) => setThumbnailMetrics(e.currentTarget)}
                  />
                </div>
              </div>
            `,
          ),
        )}
      </div>
    </div>`;
  });

  render(html`<div class="border rounded overflow-auto">${header}${rows}</div>`, $("#grid"));
  document.querySelectorAll(".comparison-thumb").forEach((imgEl) => {
    imgEl.loading = "lazy";
    imgEl.decoding = "async";
    imgEl.fetchPriority = "low";
    if (imgEl.complete) setThumbnailMetrics(imgEl);
  });
  $("#grid").style.width = `${cfg.images.length * models.length * (thumbnailSize + 10) + 300 + 8}px`;
};

renderGrid(categories[currentCategoryId]);
$("#status").classList.add("d-none");
modalImg.style.transition = "opacity 180ms ease, filter 180ms ease";

window.addEventListener("scroll", syncHoverPreviewPosition, true);
window.addEventListener("resize", syncHoverPreviewPosition);

modalEl.addEventListener("show.bs.modal", (e) => {
  if (!e.relatedTarget) return;
  clearHoverPreview();
  const { imageId, styleId, model } = parseImageIds(e.relatedTarget.getAttribute("src"));
  const imageIndex = currentCategory.images.findIndex((image) => image.id === imageId);
  const styleIndex = currentCategory.styles.findIndex((style) => style.id === styleId);
  const modelIndex = models.indexOf(model);
  if (imageIndex < 0 || styleIndex < 0 || modelIndex < 0) return;
  modalState = { imageIndex, styleIndex, modelIndex };
  setModalImage(modalState);
});

document.addEventListener("keydown", (e) => {
  if (!modalState || !modalEl.classList.contains("show")) return;
  const deltaByKey = {
    ArrowLeft: { modelIndex: -1, styleIndex: 0 },
    ArrowRight: { modelIndex: 1, styleIndex: 0 },
    ArrowUp: { modelIndex: 0, styleIndex: -1 },
    ArrowDown: { modelIndex: 0, styleIndex: 1 },
  };
  const delta = deltaByKey[e.key];
  if (!delta) return;
  e.preventDefault();
  const nextModelIndex = clamp(modalState.modelIndex + delta.modelIndex, models.length - 1);
  const nextStyleIndex = clamp(modalState.styleIndex + delta.styleIndex, currentCategory.styles.length - 1);
  if (nextModelIndex === modalState.modelIndex && nextStyleIndex === modalState.styleIndex) return;
  modalState = { ...modalState, modelIndex: nextModelIndex, styleIndex: nextStyleIndex };
  setModalImage(modalState);
});
