let areaSelectionActive = false;
let cancelAreaSelectionHandler;

document.addEventListener(
  "keydown",
  (event) => {
    if (areaSelectionActive) {
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopImmediatePropagation();
        cancelAreaSelection();
      }
      return;
    }

    const target = event.target;
    const isEditable =
      target instanceof HTMLElement &&
      (target.isContentEditable ||
        ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName));

    if (
      event.key.toLowerCase() !== "p" ||
      event.repeat ||
      event.altKey ||
      event.ctrlKey ||
      event.metaKey ||
      event.shiftKey ||
      isEditable
    ) {
      return;
    }

    event.preventDefault();
    chrome.runtime.sendMessage({
      type: "capture-maptool-area",
      viewportWidth: document.documentElement.clientWidth
    }).then((response) => {
      if (!response?.ok) {
        console.error("MapTool screenshot failed:", response?.error ?? "Unknown error.");
      }
    }).catch((error) => {
      console.error("MapTool screenshot failed:", error);
    });
  },
  true
);

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type !== "start-area-selection") {
    return false;
  }

  if (areaSelectionActive) {
    sendResponse({ ok: true });
    return false;
  }

  startAreaSelection();
  sendResponse({ ok: true });
  return false;
});

function startAreaSelection() {
  areaSelectionActive = true;

  const host = document.createElement("div");
  host.style.cssText =
    "all: initial; position: fixed; inset: 0; z-index: 2147483647; pointer-events: auto;";
  const shadow = host.attachShadow({ mode: "closed" });
  shadow.innerHTML = `
    <style>
      #overlay {
        position: fixed;
        inset: 0;
        overflow: hidden;
        background: rgb(0 0 0 / 35%);
        cursor: crosshair;
        font: 14px/1.4 system-ui, sans-serif;
        user-select: none;
        touch-action: none;
      }
      #instructions {
        position: fixed;
        top: 16px;
        left: 50%;
        transform: translateX(-50%);
        padding: 8px 12px;
        border-radius: 6px;
        background: #171717;
        color: white;
        box-shadow: 0 2px 12px rgb(0 0 0 / 35%);
        white-space: nowrap;
      }
      #selection {
        position: fixed;
        display: none;
        box-sizing: border-box;
        border: 2px solid white;
        background: rgb(255 255 255 / 12%);
        box-shadow: 0 0 0 9999px rgb(0 0 0 / 35%);
        pointer-events: none;
      }
    </style>
    <div id="overlay">
      <div id="instructions">Drag to select screenshot area · Esc to cancel</div>
      <div id="selection"></div>
    </div>
  `;
  document.documentElement.append(host);

  const overlay = shadow.querySelector("#overlay");
  const selection = shadow.querySelector("#selection");
  const viewportWidth = document.documentElement.clientWidth;
  const viewportHeight = document.documentElement.clientHeight;
  let startX;
  let startY;
  let pointerId;

  overlay.addEventListener("pointerdown", (event) => {
    if (event.button !== 0 || pointerId !== undefined) {
      return;
    }
    event.preventDefault();
    startX = clamp(event.clientX, viewportWidth);
    startY = clamp(event.clientY, viewportHeight);
    pointerId = event.pointerId;
    overlay.setPointerCapture(pointerId);
    updateSelection(selection, startX, startY, startX, startY);
  });

  overlay.addEventListener("pointermove", (event) => {
    if (event.pointerId === pointerId) {
      updateSelection(
        selection,
        startX,
        startY,
        clamp(event.clientX, viewportWidth),
        clamp(event.clientY, viewportHeight)
      );
    }
  });

  overlay.addEventListener("pointerup", (event) => {
    if (event.pointerId !== pointerId) {
      return;
    }
    const endX = clamp(event.clientX, viewportWidth);
    const endY = clamp(event.clientY, viewportHeight);
    const area = {
      x: Math.round(Math.min(startX, endX)),
      y: Math.round(Math.min(startY, endY)),
      width: Math.round(Math.abs(endX - startX)),
      height: Math.round(Math.abs(endY - startY))
    };

    pointerId = undefined;
    if (area.width < 1 || area.height < 1) {
      shadow.querySelector("#instructions").textContent =
        "Area must be at least 1 × 1 pixel · Drag to try again · Esc to cancel";
      selection.style.display = "none";
      return;
    }

    chrome.storage.local.set({ area }).then(() => {
      shadow.querySelector("#instructions").textContent =
        `Area saved: ${area.width} × ${area.height} px · Open the extension to review`;
      setTimeout(() => {
        areaSelectionActive = false;
        cancelAreaSelectionHandler = undefined;
        host.remove();
      }, 1600);
    }).catch((error) => {
      shadow.querySelector("#instructions").textContent =
        `Could not save area: ${error.message} · Esc to cancel`;
      pointerId = undefined;
    });
  });

  cancelAreaSelectionHandler = () => {
    areaSelectionActive = false;
    cancelAreaSelectionHandler = undefined;
    host.remove();
  };

  function clamp(value, max) {
    return Math.max(0, Math.min(value, max));
  }

  function updateSelection(element, x1, y1, x2, y2) {
    element.style.display = "block";
    element.style.left = `${Math.min(x1, x2)}px`;
    element.style.top = `${Math.min(y1, y2)}px`;
    element.style.width = `${Math.abs(x2 - x1)}px`;
    element.style.height = `${Math.abs(y2 - y1)}px`;
  }
}

function cancelAreaSelection() {
  if (cancelAreaSelectionHandler) {
    cancelAreaSelectionHandler();
  }
}
