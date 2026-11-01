const DEFAULT_AREA = { x: 0, y: 0, width: 800, height: 600 };

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type !== "capture-maptool-area") {
    return false;
  }

  captureAndSave(sender, message)
    .then(() => sendResponse({ ok: true }))
    .catch((error) => {
      console.error("MapTool screenshot failed:", error);
      sendResponse({ ok: false, error: error.message });
    });

  return true;
});

async function captureAndSave(sender, message) {
  if (!sender.tab?.windowId || !message.viewportWidth) {
    throw new Error("The active webpage or viewport size is unavailable.");
  }

  const { area = DEFAULT_AREA } = await chrome.storage.local.get("area");
  const imageUrl = await chrome.tabs.captureVisibleTab(sender.tab.windowId, {
    format: "png"
  });
  const image = await createImageBitmap(await (await fetch(imageUrl)).blob());
  const scale = image.width / message.viewportWidth;
  const left = Math.round(area.x * scale);
  const top = Math.round(area.y * scale);
  const width = Math.round(area.width * scale);
  const height = Math.round(area.height * scale);

  if (
    width <= 0 ||
    height <= 0 ||
    left < 0 ||
    top < 0 ||
    left + width > image.width ||
    top + height > image.height
  ) {
    image.close();
    throw new Error("The configured area must fit inside the visible webpage.");
  }

  const canvas = new OffscreenCanvas(width, height);
  const context = canvas.getContext("2d");
  if (!context) {
    image.close();
    throw new Error("Could not create an image canvas.");
  }
  context.drawImage(image, left, top, width, height, 0, 0, width, height);
  image.close();

  const blob = await canvas.convertToBlob({ type: "image/png" });
  const dataUrl = await blobToDataUrl(blob);
  const timestamp = new Date().toISOString().replaceAll(":", "-").replace(/\.\d{3}Z$/, "Z");
  await chrome.downloads.download({
    url: dataUrl,
    filename: `Maptool/screenshot-${timestamp}.png`,
    conflictAction: "uniquify",
    saveAs: false
  });
}

async function blobToDataUrl(blob) {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  let binary = "";
  const chunkSize = 0x8000;
  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + chunkSize));
  }
  return `data:${blob.type};base64,${btoa(binary)}`;
}
