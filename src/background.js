importScripts("recorder-engine.js", "export-service.js");

const STORAGE_KEY = "scenarioCapture.draft";
const recorderEngine = createRecorderEngine({ contentScriptFile: "src/content-recorder.js" });

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
    assertions: [],
    journey: []
  },
  captures: []
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
  const steps = draft?.scenario?.steps || [];
  const assertions = draft?.scenario?.assertions || [];
  const storedJourney = Array.isArray(draft?.scenario?.journey) ? draft.scenario.journey : [];
  const journey = storedJourney.length
    ? storedJourney.filter((item) => ["step", "assertion"].includes(item?.type) && item.id)
    : [
        ...steps.map((step) => ({ type: "step", id: step.id })),
        ...assertions.map((assertion) => ({ type: "assertion", id: assertion.id }))
      ];

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
      steps,
      assertions,
      preconditions: draft?.scenario?.preconditions || [],
      journey
    },
    captures: draft?.captures || []
  };
}

function nextId(prefix, collection) {
  const max = collection.reduce((currentMax, item) => {
    const match = String(item.id || "").match(/-(\d+)$/);
    return match ? Math.max(currentMax, Number(match[1])) : currentMax;
  }, 0);
  return `${prefix}-${String(max + 1).padStart(3, "0")}`;
}

function orderedJourney(scenario) {
  const steps = new Map((scenario.steps || []).map((step) => [step.id, step]));
  const assertions = new Map((scenario.assertions || []).map((assertion) => [assertion.id, assertion]));

  return (scenario.journey || [])
    .map((entry, index) => {
      const item = entry.type === "step" ? steps.get(entry.id) : assertions.get(entry.id);
      return item ? { type: entry.type, order: index + 1, item } : null;
    })
    .filter(Boolean);
}

function sameSelector(left, right) {
  const stableLeft = left?.alternatives?.find((selector) => selector.includes(">") || selector.includes(":nth-of-type")) || left?.primary;
  const stableRight = right?.alternatives?.find((selector) => selector.includes(">") || selector.includes(":nth-of-type")) || right?.primary;
  return Boolean(stableLeft && stableRight && stableLeft === stableRight);
}

function canMergeFillStep(existingStep, nextStep) {
  return Boolean(
    existingStep?.action?.kind === "fill" &&
      nextStep?.action?.kind === "fill" &&
      existingStep.page?.url === nextStep.page?.url &&
      sameSelector(existingStep.action.selector, nextStep.action.selector)
  );
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

function exportSelector(selector, confidence) {
  if (!selector) return null;
  return {
    primary: selector.primary || "",
    strategy: selector.strategy || "unknown",
    alternatives: selector.alternatives || [],
    confidence: confidence || (selector.strategy === "testId" || selector.strategy === "ariaLabel" ? "high" : "medium")
  };
}

function actionName(step) {
  return step.businessLabel || step.actorIntent || step.action?.label || step.action?.selector?.primary || step.id;
}

function assertionName(assertion) {
  return assertion.businessLabel || assertion.qaNote || assertion.expected || assertion.selector?.primary || assertion.id;
}

function exportActionEntry(step, order) {
  const action = step.action || {};
  const entry = {
    id: step.id,
    order,
    type: "action",
    name: actionName(step),
    comment: step.businessComment || "",
    page: step.page || null,
    target: action.label || "",
    action: {
      kind: action.kind || "click"
    },
    selector: exportSelector(action.selector, step.selectorConfidence)
  };

  if (["fill", "select"].includes(action.kind)) entry.action.value = action.value || "";
  if (action.kind === "check") entry.action.checked = Boolean(action.checked);
  if (step.screenshot?.path) entry.screenshot = step.screenshot.path;

  return entry;
}

function exportAssertionEntry(assertion, order) {
  const entry = {
    id: assertion.id,
    order,
    type: "assertion",
    name: assertionName(assertion),
    comment: assertion.businessComment || "",
    page: assertion.page || null,
    assertion: {
      kind: assertion.kind,
      expected: assertion.expected || "",
      expectedProvided: Boolean(assertion.expectedProvided),
      observed: assertion.observed || {}
    },
    selector: exportSelector(assertion.selector)
  };

  if (assertion.screenshot?.path) entry.screenshot = assertion.screenshot.path;

  return entry;
}

function buildExport(draft) {
  const normalized = normalizeDraft(draft);
  const journey = orderedJourney(normalized.scenario);
  const exportedJourney = journey.map((entry) => (
    entry.type === "step"
      ? exportActionEntry(entry.item, entry.order)
      : exportAssertionEntry(entry.item, entry.order)
  ));

  return {
    schema: "internal.playwright-test-brief",
    schemaVersion: "1.1",
    scenario: {
      title: normalized.scenario.title,
      environment: normalized.scenario.app?.environment || "",
      baseUrl: normalized.scenario.app?.baseUrl || "",
      startUrl: exportedJourney.find((entry) => entry.page?.url)?.page.url || "",
      targetFramework: "playwright",
      language: "typescript",
      journey: exportedJourney
    }
  };
}

async function captureWindowFromMessage(sender, message) {
  if (sender?.tab?.windowId) return sender.tab.windowId;
  if (message?.windowId) return message.windowId;
  if (message?.tabId) {
    try {
      const tab = await chrome.tabs.get(message.tabId);
      return tab?.windowId || null;
    } catch (_error) {
      return null;
    }
  }
  return null;
}

async function attachCapture(draft, sender, message, itemType, item) {
  const windowId = await captureWindowFromMessage(sender, message);
  const dataUrl = await recorderEngine.captureVisibleTab(windowId);
  if (!dataUrl) return;

  const order = draft.scenario.journey.length || 1;
  const id = `${itemType}-${item.id}-after`;
  const path = `screenshots/${String(order).padStart(3, "0")}-${itemType}-${item.id}.png`;
  const capture = {
    id,
    itemType,
    itemId: item.id,
    capturedAt: new Date().toISOString(),
    path,
    dataUrl
  };
  const existingIndex = draft.captures.findIndex((candidate) => candidate.itemType === itemType && candidate.itemId === item.id);
  if (existingIndex >= 0) {
    draft.captures[existingIndex] = capture;
  } else {
    draft.captures.push(capture);
  }
  item.screenshot = { path, capturedAt: capture.capturedAt };
}

async function openRecorderSurface(tab) {
  if (chrome.sidePanel?.open) {
    await chrome.sidePanel.open({ windowId: tab.windowId });
    return;
  }

  await chrome.windows.create({
    url: chrome.runtime.getURL("src/popup.html"),
    type: "popup",
    width: 460,
    height: 760
  });
}

chrome.runtime.onInstalled.addListener(async () => {
  const current = await readDraft();
  await writeDraft(normalizeDraft(current));

  try {
    if (chrome.sidePanel?.setOptions) {
      await chrome.sidePanel.setOptions({
        path: "src/popup.html",
        enabled: true
      });
    }
  } catch (error) {
    console.warn("Configuration du panneau latéral indisponible", error);
  }
});

chrome.action.onClicked.addListener((tab) => {
  openRecorderSurface(tab).catch((error) => {
    console.error("Impossible d'ouvrir Scenario Capture", error);
  });
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

      const lastJourneyEntry = draft.scenario.journey.at(-1);
      const lastStep = lastJourneyEntry?.type === "step"
        ? draft.scenario.steps.find((candidate) => candidate.id === lastJourneyEntry.id)
        : null;

      if (canMergeFillStep(lastStep, step)) {
        lastStep.updatedAt = step.capturedAt;
        lastStep.page = step.page;
        lastStep.action = step.action;
        lastStep.selectorConfidence = step.selectorConfidence;
        await attachCapture(draft, sender, message, "step", lastStep);
        await writeDraft(draft);
        sendResponse({ ok: true, step: lastStep, merged: true });
        return;
      }

      draft.scenario.steps.push(step);
      draft.scenario.journey.push({ type: "step", id: step.id });
      await attachCapture(draft, sender, message, "step", step);
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
        expectedProvided: Boolean(message.payload.expected),
        expected: message.payload.expected || observed.text || observed.value || "",
        page: message.payload.page,
        selector: message.payload.selector,
        observed,
        qaNote: "Assertion ciblée dans la page"
      };
      draft.scenario.assertions.push(assertion);
      draft.scenario.journey.push({ type: "assertion", id: assertion.id });
      await attachCapture(draft, sender, message, "assertion", assertion);
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
        await recorderEngine.start(message.tabId);
      }
      sendResponse({ ok: true, draft });
      return;
    }

    if (message.type === "POPUP_STOP_RECORDING") {
      draft.status = "paused";
      await writeDraft(draft);
      if (message.tabId) {
        await recorderEngine.stop(message.tabId);
      }
      sendResponse({ ok: true, draft });
      return;
    }

    if (message.type === "POPUP_RESET_DRAFT") {
      const fresh = structuredClone(DEFAULT_DRAFT);
      await writeDraft(fresh);
      if (message.tabId) {
        await recorderEngine.reset(message.tabId);
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
      draft.scenario.journey.push({ type: "assertion", id: assertion.id });
      await attachCapture(draft, sender, message, "assertion", assertion);
      await writeDraft(draft);
      sendResponse({ ok: true, assertion, draft });
      return;
    }

    if (message.type === "POPUP_UPDATE_ITEM_LABEL") {
      const { collection, id, label } = message.payload;
      const items = collection === "steps" ? draft.scenario.steps : draft.scenario.assertions;
      const item = items.find((candidate) => candidate.id === id);
      if (item) {
        item.businessLabel = String(label || "").trim();
      }
      await writeDraft(draft);
      sendResponse({ ok: true, draft });
      return;
    }

    if (message.type === "POPUP_UPDATE_ITEM_COMMENT") {
      const { collection, id, comment } = message.payload;
      const items = collection === "steps" ? draft.scenario.steps : draft.scenario.assertions;
      const item = items.find((candidate) => candidate.id === id);
      if (item) {
        item.businessComment = String(comment || "").trim();
      }
      await writeDraft(draft);
      sendResponse({ ok: true, draft });
      return;
    }

    if (message.type === "POPUP_REMOVE_ITEM") {
      const { collection, id } = message.payload;
      if (collection === "steps") {
        draft.scenario.steps = draft.scenario.steps.filter((step) => step.id !== id);
        draft.scenario.journey = draft.scenario.journey.filter((entry) => !(entry.type === "step" && entry.id === id));
      }
      if (collection === "assertions") {
        draft.scenario.assertions = draft.scenario.assertions.filter((assertion) => assertion.id !== id);
        draft.scenario.journey = draft.scenario.journey.filter((entry) => !(entry.type === "assertion" && entry.id === id));
      }
      await writeDraft(draft);
      sendResponse({ ok: true, draft });
      return;
    }

    if (message.type === "POPUP_EXPORT") {
      sendResponse({ ok: true, export: buildExport(draft) });
      return;
    }

    if (message.type === "POPUP_EXPORT_ZIP") {
      const packageDraft = normalizeDraft(draft);
      if (!packageDraft.captures.length) {
        const dataUrl = await recorderEngine.captureVisibleTab(message.windowId);
        if (dataUrl) {
          packageDraft.captures.push({
            id: "export-current",
            itemType: "export",
            itemId: "current-page",
            capturedAt: new Date().toISOString(),
            path: "screenshots/export-current.png",
            dataUrl
          });
        }
      }
      const exportData = buildExport(packageDraft);
      const zip = buildExportPackage(packageDraft, exportData);
      sendResponse({ ok: true, export: exportData, zip });
      return;
    }

    if (message.type === "POPUP_PICK_ASSERTION_TARGET" && message.tabId) {
      await recorderEngine.pickAssertionTarget(message.tabId, message.assertionKind, message.expected);
      sendResponse({ ok: true });
      return;
    }

    sendResponse({ ok: false, error: "Message non supporté" });
  })().catch((error) => {
    sendResponse({ ok: false, error: error?.message || "Erreur interne du recorder" });
  });

  return true;
});
