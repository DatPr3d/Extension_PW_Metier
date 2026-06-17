function createRecorderEngine(options = {}) {
  const contentScriptFile = options.contentScriptFile || "src/content-recorder.js";

  async function sendTabMessage(tabId, message) {
    if (!tabId) {
      return { ok: false, error: "Aucun onglet actif disponible" };
    }

    try {
      return await chrome.tabs.sendMessage(tabId, message);
    } catch (_error) {
      try {
        await chrome.scripting.executeScript({
          target: { tabId },
          files: [contentScriptFile]
        });
        return await chrome.tabs.sendMessage(tabId, message);
      } catch (error) {
        return {
          ok: false,
          error: error?.message || "Impossible d'injecter le recorder sur cette page"
        };
      }
    }
  }

  return {
    name: "dom-content-recorder",

    async start(tabId) {
      return sendTabMessage(tabId, { type: "RECORDER_SET_ACTIVE", active: true });
    },

    async stop(tabId) {
      return sendTabMessage(tabId, { type: "RECORDER_SET_ACTIVE", active: false });
    },

    async reset(tabId) {
      return sendTabMessage(tabId, { type: "RECORDER_SET_ACTIVE", active: false });
    },

    async pickAssertionTarget(tabId, assertionKind, expected) {
      return sendTabMessage(tabId, {
        type: "RECORDER_PICK_ASSERTION_TARGET",
        assertionKind,
        expected
      });
    },

    async captureVisibleTab(windowId) {
      if (!windowId || !chrome.tabs?.captureVisibleTab) return null;
      try {
        return await chrome.tabs.captureVisibleTab(windowId, { format: "png" });
      } catch (_error) {
        return null;
      }
    }
  };
}
