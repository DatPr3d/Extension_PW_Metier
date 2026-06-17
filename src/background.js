const STORAGE_KEY = "scenarioCapture.draft";

const DEFAULT_DRAFT = {
  version: "1.0",
  status: "idle",
  recordingStartedAt: null,
  scenario: {
    title: "Nouveau scénario métier",
    description: "",
    tags: [],
    app: {
      name: "",
      environment: "",
      baseUrl: ""
    },
    preconditions: [],
    steps: [],
    assertions: []
  }
};

async function readDraft() {
  const data = await chrome.storage.local.get(STORAGE_KEY);
  return data[STORAGE_KEY] || structuredClone(DEFAULT_DRAFT);
}

async function writeDraft(draft) {
  await chrome.storage.local.set({ [STORAGE_KEY]: draft });
  return draft;
}

function normalizeDraft(draft) {
  return {
    ...structuredClone(DEFAULT_DRAFT),
    ...draft,
    scenario: {
      ...structuredClone(DEFAULT_DRAFT.scenario),
      ...(draft?.scenario || {}),
      app: {
        ...structuredClone(DEFAULT_DRAFT.scenario.app),
        ...(draft?.scenario?.app || {})
      },
      steps: draft?.scenario?.steps || [],
      assertions: draft?.scenario?.assertions || [],
      preconditions: draft?.scenario?.preconditions || []
    }
  };
}

function nextId(prefix, collection) {
  return `${prefix}-${String(collection.length + 1).padStart(3, "0")}`;
}

function toPlaywrightHint(action) {
  if (action.kind === "click") {
    return `await page.locator(${JSON.stringify(action.selector.primary)}).click();`;
  }

  if (action.kind === "fill") {
    return `await page.locator(${JSON.stringify(action.selector.primary)}).fill(${JSON.stringify(action.value || "")});`;
  }

  if (action.kind === "select") {
    return `await page.locator(${JSON.stringify(action.selector.primary)}).selectOption(${JSON.stringify(action.value || "")});`;
  }

  if (action.kind === "check") {
    return `await page.locator(${JSON.stringify(action.selector.primary)}).${action.checked ? "check" : "uncheck"}();`;
  }

  return "";
}

function buildExport(draft) {
  const normalized = normalizeDraft(draft);
  const now = new Date().toISOString();

  return {
    schema: "internal.playwright-scenario-capture",
    schemaVersion: "1.0",
    exportedAt: now,
    source: {
      tool: "Scenario Capture MVP",
      toolVersion: chrome.runtime.getManifest().version,
      validationOwner: "dev-qa"
    },
    scenario: {
      ...normalized.scenario,
      steps: normalized.scenario.steps.map((step, index) => ({
        ...step,
        order: index + 1,
        playwrightHint: toPlaywrightHint(step.action)
      })),
      assertions: normalized.scenario.assertions.map((assertion, index) => ({
        ...assertion,
        order: index + 1
      }))
    }
  };
}

async function sendTabMessage(tabId, message) {
  try {
    return await chrome.tabs.sendMessage(tabId, message);
  } catch (_error) {
    await chrome.scripting.executeScript({
      target: { tabId },
      files: ["src/content-recorder.js"]
    });
    return chrome.tabs.sendMessage(tabId, message);
  }
}

chrome.runtime.onInstalled.addListener(async () => {
  const current = await readDraft();
  await writeDraft(normalizeDraft(current));
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  (async () => {
    const draft = normalizeDraft(await readDraft());

    if (message.type === "RECORDER_STEP_CAPTURED") {
      if (draft.status !== "recording") {
        sendResponse({ ok: true, ignored: true });
        return;
      }

      const step = {
        id: nextId("step", draft.scenario.steps),
        capturedAt: new Date().toISOString(),
        page: {
          url: message.payload.url,
          title: message.payload.title
        },
        actorIntent: "",
        action: message.payload.action,
        selectorConfidence: message.payload.selectorConfidence,
        notes: ""
      };

      draft.scenario.steps.push(step);
      await writeDraft(draft);
      sendResponse({ ok: true, step });
      return;
    }

    if (message.type === "RECORDER_ASSERTION_CAPTURED") {
      const observed = message.payload.observed || {};
      const assertion = {
        id: nextId("assertion", draft.scenario.assertions),
        capturedAt: new Date().toISOString(),
        kind: message.payload.kind,
        expected: message.payload.expected || observed.text || observed.value || "",
        page: message.payload.page,
        selector: message.payload.selector,
        observed,
        qaNote: "Assertion ciblée dans la page"
      };
      draft.scenario.assertions.push(assertion);
      await writeDraft(draft);
      sendResponse({ ok: true, assertion, draft });
      return;
    }

    if (message.type === "POPUP_GET_STATE") {
      sendResponse({ ok: true, draft, exportPreview: buildExport(draft) });
      return;
    }

    if (message.type === "POPUP_SAVE_METADATA") {
      draft.scenario = {
        ...draft.scenario,
        ...message.payload,
        app: {
          ...draft.scenario.app,
          ...(message.payload.app || {})
        }
      };
      await writeDraft(draft);
      sendResponse({ ok: true, draft });
      return;
    }

    if (message.type === "POPUP_START_RECORDING") {
      draft.status = "recording";
      draft.recordingStartedAt = draft.recordingStartedAt || new Date().toISOString();
      await writeDraft(draft);
      if (message.tabId) {
        await sendTabMessage(message.tabId, { type: "RECORDER_SET_ACTIVE", active: true });
      }
      sendResponse({ ok: true, draft });
      return;
    }

    if (message.type === "POPUP_STOP_RECORDING") {
      draft.status = "paused";
      await writeDraft(draft);
      if (message.tabId) {
        await sendTabMessage(message.tabId, { type: "RECORDER_SET_ACTIVE", active: false });
      }
      sendResponse({ ok: true, draft });
      return;
    }

    if (message.type === "POPUP_RESET_DRAFT") {
      const fresh = structuredClone(DEFAULT_DRAFT);
      await writeDraft(fresh);
      if (message.tabId) {
        await sendTabMessage(message.tabId, { type: "RECORDER_SET_ACTIVE", active: false });
      }
      sendResponse({ ok: true, draft: fresh });
      return;
    }

    if (message.type === "POPUP_ADD_ASSERTION") {
      const assertion = {
        id: nextId("assertion", draft.scenario.assertions),
        capturedAt: new Date().toISOString(),
        ...message.payload
      };
      draft.scenario.assertions.push(assertion);
      await writeDraft(draft);
      sendResponse({ ok: true, assertion, draft });
      return;
    }

    if (message.type === "POPUP_REMOVE_ITEM") {
      const { collection, id } = message.payload;
      if (collection === "steps") {
        draft.scenario.steps = draft.scenario.steps.filter((step) => step.id !== id);
      }
      if (collection === "assertions") {
        draft.scenario.assertions = draft.scenario.assertions.filter((assertion) => assertion.id !== id);
      }
      await writeDraft(draft);
      sendResponse({ ok: true, draft });
      return;
    }

    if (message.type === "POPUP_EXPORT") {
      sendResponse({ ok: true, export: buildExport(draft) });
      return;
    }

    if (message.type === "POPUP_PICK_ASSERTION_TARGET" && message.tabId) {
      await sendTabMessage(message.tabId, {
        type: "RECORDER_PICK_ASSERTION_TARGET",
        assertionKind: message.assertionKind,
        expected: message.expected
      });
      sendResponse({ ok: true });
      return;
    }

    sendResponse({ ok: false, error: "Message non supporté" });
  })();

  return true;
});
