let currentDraft = null;
let currentExport = null;
let currentCodePreview = "";

const elements = {
  statusLabel: document.querySelector("#statusLabel"),
  stepCount: document.querySelector("#stepCount"),
  assertionCount: document.querySelector("#assertionCount"),
  confidenceSummary: document.querySelector("#confidenceSummary"),
  recordPill: document.querySelector("#recordPill"),
  themeToggle: document.querySelector("#themeToggle"),
  titleInput: document.querySelector("#titleInput"),
  envInput: document.querySelector("#envInput"),
  startButton: document.querySelector("#startButton"),
  stopButton: document.querySelector("#stopButton"),
  resetButton: document.querySelector("#resetButton"),
  assertionKind: document.querySelector("#assertionKind"),
  expectedInput: document.querySelector("#expectedInput"),
  pickAssertionButton: document.querySelector("#pickAssertionButton"),
  addPageAssertionButton: document.querySelector("#addPageAssertionButton"),
  assertionKindButtons: document.querySelectorAll("[data-assertion-kind]"),
  stepsList: document.querySelector("#stepsList"),
  codePreview: document.querySelector("#codePreview"),
  codeGutter: document.querySelector("#codeGutter"),
  copyButton: document.querySelector("#copyButton"),
  copyCodeButton: document.querySelector("#copyCodeButton"),
  downloadButton: document.querySelector("#downloadButton")
};

const THEME_KEY = "scenarioCapture.theme";

function send(message) {
  return chrome.runtime.sendMessage(message);
}

async function activeTab() {
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  return tabs[0];
}

function applyTheme(theme) {
  const nextTheme = theme === "dark" ? "dark" : "light";
  document.documentElement.dataset.theme = nextTheme;
  if (elements.themeToggle) {
    elements.themeToggle.textContent = nextTheme === "dark" ? "Clair" : "Sombre";
  }
}

function initTheme() {
  let stored = null;
  try {
    stored = localStorage.getItem(THEME_KEY);
  } catch (_error) {
    stored = null;
  }
  applyTheme(stored || "dark");
}

function escapeString(value) {
  return JSON.stringify(value || "");
}

function defaultActionLabel(action) {
  if (action.kind === "fill") return "Renseigner " + (action.label || action.selector.primary);
  if (action.kind === "select") return "Choisir " + (action.label || action.selector.primary);
  if (action.kind === "check") return (action.checked ? "Cocher " : "D\u00e9cocher ") + (action.label || action.selector.primary);
  return "Cliquer sur " + (action.label || action.selector.primary);
}

function actionLabel(step) {
  return step.businessLabel || step.actorIntent || defaultActionLabel(step.action);
}

function assertionLabel(assertion) {
  if (assertion.businessLabel) return assertion.businessLabel;
  if (assertion.kind === "url") return "URL attendue: " + assertion.expected;
  if (assertion.kind === "title") return "Titre attendu: " + assertion.expected;
  if (assertion.kind === "visible") return "\u00c9l\u00e9ment visible";
  if (assertion.kind === "value") return "Valeur attendue: " + assertion.expected;
  return "Texte attendu: " + (assertion.expected || assertion.observed?.text || assertion.selector?.primary || "");
}

function confidenceLabel(value) {
  if (value === "high") return "S\u00e9lecteur fiable";
  if (value === "medium") return "\u00c0 relire";
  return "\u00c0 stabiliser";
}

function orderedJourney(scenario) {
  if (scenario.journey?.some((entry) => entry.type === "action" || entry.assertion || entry.name)) {
    return scenario.journey.map((entry) => ({
      type: entry.type === "action" ? "step" : "assertion",
      collection: entry.type === "action" ? "steps" : "assertions",
      item: entry
    }));
  }

  const steps = new Map((scenario.steps || []).map((step) => [step.id, step]));
  const assertions = new Map((scenario.assertions || []).map((assertion) => [assertion.id, assertion]));
  const journey = scenario.journey?.length
    ? scenario.journey
    : [
        ...(scenario.steps || []).map((step) => ({ type: "step", id: step.id })),
        ...(scenario.assertions || []).map((assertion) => ({ type: "assertion", id: assertion.id }))
      ];

  return journey
    .map((entry) => {
      if (entry.item) {
        const type = entry.ref || (entry.type === "action" ? "step" : entry.type);
        return { type, collection: type === "step" ? "steps" : "assertions", item: entry.item };
      }
      const item = entry.type === "step" ? steps.get(entry.id) : assertions.get(entry.id);
      return item ? { type: entry.type, collection: entry.type === "step" ? "steps" : "assertions", item } : null;
    })
    .filter(Boolean);
}

function itemSelectorLabel(entry) {
  if (entry.type === "step") {
    return entry.item.action?.selector?.primary || entry.item.page?.url || "";
  }
  return entry.item.selector?.primary || entry.item.page?.url || "Contr\u00f4le de page";
}

function itemDefaultLabel(entry) {
  return entry.type === "step" ? actionLabel(entry.item) : assertionLabel(entry.item);
}

function itemKindLabel(entry) {
  return entry.type === "step" ? "Action" : "Contr\u00f4le";
}

function expectedLabel(assertion) {
  if (!assertion.expectedProvided) return "";
  const expected = assertion.expected || "";
  return expected ? "Attendu : " + expected : "";
}

function itemComment(item) {
  return item.businessComment || "";
}

function renderJourneyList(list, entries) {
  list.innerHTML = "";

  if (!entries.length) {
    const empty = document.createElement("li");
    empty.innerHTML = '<div class="item-meta">Aucun \u00e9l\u00e9ment pour le moment.</div>';
    list.append(empty);
    return;
  }

  entries.forEach((entry, index) => {
    const item = entry.item;
    const li = document.createElement("li");
    li.dataset.order = String(index + 1);
    li.classList.toggle("is-assertion", entry.type === "assertion");

    const title = document.createElement("div");
    title.className = "item-title";

    const label = document.createElement("input");
    label.className = "item-name";
    label.type = "text";
    label.value = itemDefaultLabel(entry);
    label.setAttribute("aria-label", "Nom affich\u00e9 dans le parcours");
    label.addEventListener("change", async () => {
      await send({
        type: "POPUP_UPDATE_ITEM_LABEL",
        payload: { collection: entry.collection, id: item.id, label: label.value }
      });
      await refresh();
    });

    const remove = document.createElement("button");
    remove.className = "remove";
    remove.type = "button";
    remove.textContent = "Retirer";
    remove.addEventListener("click", async () => {
      await send({ type: "POPUP_REMOVE_ITEM", payload: { collection, id: item.id } });
      await refresh();
    });

    const kind = document.createElement("span");
    kind.className = "item-kind";
    kind.textContent = itemKindLabel(entry);

    const selector = document.createElement("div");
    selector.className = "item-meta";
    selector.textContent = itemSelectorLabel(entry);

    title.append(label, remove);
    li.append(title, kind, selector);

    if (entry.type === "assertion") {
      const expected = expectedLabel(item);
      if (expected) {
        const expectedNode = document.createElement("div");
        expectedNode.className = "item-expected";
        expectedNode.textContent = expected;
        li.append(expectedNode);
      }
    }

    const comment = document.createElement("textarea");
    comment.className = "item-comment";
    comment.rows = 2;
    comment.placeholder = "Commentaire metier pour les devs/QA";
    comment.value = itemComment(item);
    comment.addEventListener("change", async () => {
      await send({
        type: "POPUP_UPDATE_ITEM_COMMENT",
        payload: { collection: entry.collection, id: item.id, comment: comment.value }
      });
      await refresh();
    });
    li.append(comment);

    if (item.selectorConfidence || item.action?.selector?.strategy) {
      const confidence = document.createElement("span");
      const level = item.selectorConfidence || "medium";
      confidence.className = "confidence " + level;
      confidence.textContent = confidenceLabel(level);
      li.append(confidence);
    }

    list.append(li);
  });
}

function playwrightAction(step) {
  const action = step.action;
  const selector = action.selector || step.selector || {};
  const locator = "page.locator(" + escapeString(selector.primary || "body") + ")";
  if (action.kind === "fill") return "  await " + locator + ".fill(" + escapeString(action.value || "") + ");";
  if (action.kind === "select") return "  await " + locator + ".selectOption(" + escapeString(action.value || "") + ");";
  if (action.kind === "check") return "  await " + locator + (action.checked ? ".check();" : ".uncheck();");
  return "  await " + locator + ".click();";
}

function playwrightAssertion(assertion) {
  const assertionData = assertion.assertion || assertion;
  if (assertionData.kind === "url") return "  await expect(page).toHaveURL(" + escapeString(assertionData.expected || assertion.page?.url || "") + ");";
  if (assertionData.kind === "title") return "  await expect(page).toHaveTitle(" + escapeString(assertionData.expected || assertion.page?.title || "") + ");";

  const selector = assertion.selector?.primary || '[data-testid="a-completer"]';
  const locator = "page.locator(" + escapeString(selector) + ")";
  if (assertionData.kind === "visible") return "  await expect(" + locator + ").toBeVisible();";
  if (assertionData.kind === "value") return "  await expect(" + locator + ").toHaveValue(" + escapeString(assertionData.expected || assertionData.observed?.value || "") + ");";
  return "  await expect(" + locator + ").toContainText(" + escapeString(assertionData.expected || assertionData.observed?.text || "") + ");";
}

function buildCodePreview(exportData) {
  const scenario = exportData?.scenario || { title: "Sc\u00e9nario m\u00e9tier", steps: [], assertions: [] };
  const journey = orderedJourney(scenario);
  const lines = [
    "import { test, expect } from '@playwright/test';",
    "",
    "test(" + escapeString(scenario.title || "Sc\u00e9nario m\u00e9tier") + ", async ({ page }) => {"
  ];

  const firstUrl = journey.find((entry) => entry.item.page?.url)?.item.page.url;
  if (firstUrl) lines.push("  await page.goto(" + escapeString(firstUrl) + ");");

  journey.forEach((entry) => {
    lines.push(entry.type === "step" ? playwrightAction(entry.item) : playwrightAssertion(entry.item));
  });
  lines.push("});");

  return lines.join("\n");
}

function renderCodeGutter(code) {
  if (!elements.codeGutter) return;
  const lines = code ? code.split("\n").length : 1;
  elements.codeGutter.innerHTML = Array.from({ length: lines }, (_, index) => `<span>${index + 1}</span>`).join("");
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function highlightCode(code) {
  const escaped = escapeHtml(code);
  return escaped
    .replace(/('(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*")/g, '<span class="str">$1</span>')
    .replace(/\b(function|if|return|import|from|const|let|var|async)\b/g, '<span class="kw">$1</span>')
    .replace(/\b(await)\b/g, '<span class="await">$1</span>')
    .replace(/\b(test|expect)\b(?=\s*\()/g, '<span class="fn">$1</span>')
    .replace(/\b(page|locator)\b/g, '<span class="var">$1</span>')
    .replace(/\b(goto|click|fill|selectOption|check|uncheck|toHaveURL|toHaveTitle|toBeVisible|toHaveValue|toContainText|createElement|append|appendChild)\b/g, '<span class="fn">$1</span>')
    .replace(/(\.)([a-zA-Z_$][\w$]*)/g, '<span class="punct">$1</span><span class="prop">$2</span>');
}

function summarizeConfidence(steps) {
  if (!steps.length) return "\u00c0 capter";
  const low = steps.filter((step) => step.selectorConfidence === "low").length;
  const medium = steps.filter((step) => step.selectorConfidence === "medium").length;
  if (low) return low + " \u00e0 stabiliser";
  if (medium) return medium + " \u00e0 relire";
  return "Fiable";
}

function render(state) {
  currentDraft = state.draft;
  currentExport = state.exportPreview;
  currentCodePreview = buildCodePreview(currentExport);

  elements.titleInput.value = currentDraft.scenario.title || "";
  elements.envInput.value = currentDraft.scenario.app.environment || "";

  const steps = currentDraft.scenario.steps;
  const assertions = currentDraft.scenario.assertions;
  const journey = orderedJourney(currentDraft.scenario);
  const recording = currentDraft.status === "recording";

  elements.statusLabel.textContent = recording ? "Capture active" : "Capture en pause";
  elements.recordPill.textContent = recording ? "Enregistrement" : "En pause";
  elements.recordPill.classList.toggle("is-recording", recording);
  elements.stepCount.textContent = String(steps.length);
  elements.assertionCount.textContent = String(assertions.length);
  elements.confidenceSummary.textContent = summarizeConfidence(steps);
  elements.startButton.disabled = recording;
  elements.stopButton.disabled = !recording;
  elements.codePreview.innerHTML = highlightCode(currentCodePreview);
  renderCodeGutter(currentCodePreview);

  renderJourneyList(elements.stepsList, journey);
}

async function refresh() {
  const response = await send({ type: "POPUP_GET_STATE" });
  if (response?.ok) render(response);
}

async function saveMetadata() {
  await send({
    type: "POPUP_SAVE_METADATA",
    payload: {
      title: elements.titleInput.value.trim() || "Nouveau sc\u00e9nario m\u00e9tier",
      app: {
        name: currentDraft?.scenario?.app?.name || "",
        environment: elements.envInput.value.trim()
      }
    }
  });
}

function pageAssertionPayload(kind, tab) {
  const expected = elements.expectedInput.value.trim();
  return {
    kind,
    expectedProvided: Boolean(expected),
    expected: expected || (kind === "url" ? tab.url : tab.title),
    page: { url: tab.url, title: tab.title },
    selector: null,
    observed: kind === "url" ? { url: tab.url } : { title: tab.title },
    qaNote: "Assertion ajout\u00e9e depuis le panneau m\u00e9tier"
  };
}

function base64ToBlob(base64, mimeType) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return new Blob([bytes], { type: mimeType || "application/octet-stream" });
}

function downloadZip(zip) {
  const blob = base64ToBlob(zip.base64, zip.mimeType);
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = zip.filename || "scenario-capture-export.zip";
  anchor.click();
  URL.revokeObjectURL(url);
}

function showTab(tabId) {
  document.querySelectorAll(".tab").forEach((tab) => tab.classList.toggle("is-active", tab.dataset.tab === tabId));
  document.querySelectorAll(".tab-panel").forEach((panel) => panel.classList.toggle("is-active", panel.id === tabId));
}

document.querySelectorAll(".tab").forEach((tab) => {
  tab.addEventListener("click", () => showTab(tab.dataset.tab));
});

elements.assertionKindButtons.forEach((button) => {
  button.addEventListener("click", () => {
    elements.assertionKind.value = button.dataset.assertionKind;
    elements.assertionKindButtons.forEach((candidate) => {
      candidate.classList.toggle("is-active", candidate === button);
    });
  });
});

elements.themeToggle?.addEventListener("click", () => {
  const nextTheme = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
  try {
    localStorage.setItem(THEME_KEY, nextTheme);
  } catch (_error) {
    // Le thème reste appliqué même si le stockage local est indisponible.
  }
  applyTheme(nextTheme);
});

elements.startButton.addEventListener("click", async () => {
  await saveMetadata();
  const tab = await activeTab();
  if (!tab?.id) {
    elements.statusLabel.textContent = "Aucun onglet actif";
    return;
  }
  await send({ type: "POPUP_START_RECORDING", tabId: tab.id });
  await refresh();
});

elements.stopButton.addEventListener("click", async () => {
  const tab = await activeTab();
  if (!tab?.id) {
    elements.statusLabel.textContent = "Aucun onglet actif";
    return;
  }
  await send({ type: "POPUP_STOP_RECORDING", tabId: tab.id });
  await refresh();
});

elements.resetButton.addEventListener("click", async () => {
  const tab = await activeTab();
  await send({ type: "POPUP_RESET_DRAFT", tabId: tab?.id });
  await refresh();
});

[elements.titleInput, elements.envInput].forEach((input) => {
  input.addEventListener("change", saveMetadata);
});

elements.addPageAssertionButton.addEventListener("click", async () => {
  const tab = await activeTab();
  if (!tab?.id) {
    elements.statusLabel.textContent = "Aucun onglet actif";
    return;
  }
  await send({
    type: "POPUP_ADD_ASSERTION",
    tabId: tab.id,
    windowId: tab.windowId,
    payload: pageAssertionPayload(elements.assertionKind.value, tab)
  });
  elements.expectedInput.value = "";
  await refresh();
});

elements.pickAssertionButton.addEventListener("click", async () => {
  const tab = await activeTab();
  if (!tab?.id) {
    elements.statusLabel.textContent = "Aucun onglet actif";
    return;
  }
  elements.statusLabel.textContent = "Ciblage actif dans la page";
  await send({
    type: "POPUP_PICK_ASSERTION_TARGET",
    tabId: tab.id,
    assertionKind: elements.assertionKind.value,
    expected: elements.expectedInput.value.trim()
  });
  elements.expectedInput.value = "";
});

elements.copyButton.addEventListener("click", async () => {
  const response = await send({ type: "POPUP_EXPORT" });
  if (response?.ok) {
    await navigator.clipboard.writeText(JSON.stringify(response.export, null, 2));
    currentExport = response.export;
    elements.statusLabel.textContent = "JSON copi\u00e9";
  }
});

elements.copyCodeButton.addEventListener("click", async () => {
  await navigator.clipboard.writeText(currentCodePreview || "");
  elements.statusLabel.textContent = "Code copi\u00e9";
});

elements.downloadButton.addEventListener("click", async () => {
  await saveMetadata();
  const tab = await activeTab();
  const response = await send({ type: "POPUP_EXPORT_ZIP", tabId: tab?.id, windowId: tab?.windowId });
  if (response?.ok) {
    currentExport = response.export;
    currentCodePreview = buildCodePreview(currentExport);
    downloadZip(response.zip);
    elements.statusLabel.textContent = "ZIP export\u00e9";
  }
});

initTheme();
refresh();

chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === "local" && changes["scenarioCapture.draft"]) refresh();
});
