const DEFAULT_AREA = { x: 0, y: 0, width: 800, height: 600 };
const form = document.querySelector("#area-form");
const status = document.querySelector("#status");
const selectAreaButton = document.querySelector("#select-area");

chrome.storage.local.get("area").then(({ area = DEFAULT_AREA }) => {
  showArea(area);
}).catch((error) => {
  status.textContent = `Could not load settings: ${error.message}`;
});

selectAreaButton.addEventListener("click", async () => {
  selectAreaButton.disabled = true;
  status.textContent = "Starting area selection…";
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) {
      throw new Error("No active webpage is available.");
    }
    await chrome.tabs.sendMessage(tab.id, { type: "start-area-selection" });
    status.textContent = "Drag on the webpage to select an area. Press Esc to cancel.";
  } catch (error) {
    status.textContent =
      `Could not start selection. Open a regular webpage and try again. ${error.message}`;
  } finally {
    selectAreaButton.disabled = false;
  }
});

form.addEventListener("submit", (event) => {
  event.preventDefault();
  const area = Object.fromEntries(
    ["x", "y", "width", "height"].map((key) => [
      key,
      Number(form.elements.namedItem(key).value)
    ])
  );
  chrome.storage.local.set({ area }).then(() => {
    status.textContent = "Screenshot area saved.";
    showArea(area);
  }).catch((error) => {
    status.textContent = `Could not save settings: ${error.message}`;
  });
});

function showArea(area) {
  for (const [key, value] of Object.entries(area)) {
    form.elements.namedItem(key).value = value;
  }
}
