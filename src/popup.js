let currentDraft = null;
let currentExport = null;

const elements = {
  statusLabel: document.querySelector("#statusLabel"),
  stepCount: document.querySelector("#stepCount"),
  titleInput: document.querySelector("#titleInput"),
  appInput: document.querySelector("#appInput"),
  envInput: document.querySelector("#envInput"),
  startButton: document.querySelector("#startButton"),
  stopButton: document.querySelector("#stopButton"),
  resetButton: document.querySelector("#resetButton"),
  assertionKind: document.querySelector("#assertionKind"),
  expectedInput: document.querySelector("#expectedInput"),
  pickAssertionButton: document.querySelector("#pickAssertionButton"),
  addPageAssertionButton: document.querySelector("#addPageAssertionButton"),
  stepsList: document.querySelector("#stepsList"),
  assertionsList: document.querySelector("#assertionsList"),
  copyButton: document.querySelector("#copyButton"),
  downloadButton: document.querySelector("#downloadButton")
};

function send(message) {
  return chrome.runtime.sendMessage(message);
}

async function activeTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab;
}

function stepLabel(step) {
  const action = step.action;
  if (action.kind === "fill") return `Saisie: ${action.label || action.selector.primary}`;
  if (action.kind === "select") return `Sélection: ${action.label || action.selector.primary}`;
  if (action.kind === "check") return `${action.checked ? "Coche" : "Décoche"}: ${action.label || action.selector.primary}`;
  return `Clic: ${action.label || action.selector.primary}`;
}

function assertionLabel(assertion) {
  if (assertion.kind === "url") return `URL: ${assertion.expected}`;
  if (assertion.kind === "title") return `Titre: ${assertion.expected}`;
  return `${assertion.kind}: ${assertion.expected || assertion.observed?.text || assertion.selector?.primary}`;
}

function renderList(list, items, labeler, collection) {
  list.innerHTML = "";

  if (!items.length) {
    const empty = document.createElement("li");
    empty.innerHTML = `<div class="item-meta">Aucun élément pour le moment.</div>`;
    list.append(empty);
    return;
  }

  items.forEach((item) => {
    const li = document.createElement("li");
    const title = document.createElement("div");
    title.className = "item-title";

    const label = document.createElement("span");
    label.textContent = labeler(item);

    const remove = document.createElement("button");
    remove.className = "remove";
    remove.type = "button";
    remove.textContent = "Retirer";
    remove.addEventListener("click", async () => {
      await send({ type: "POPUP_REMOVE_ITEM", payload: { collection, id: item.id } });
      await refresh();
    });

    const meta = document.createElement("div");
    meta.className = "item-meta";
    meta.textContent = item.action?.selector?.primary || item.selector?.primary || item.page?.url || "";

    title.append(label, remove);
    li.append(title, meta);
    list.append(li);
  });
}

function render(state) {
  currentDraft = state.draft;
  currentExport = state.exportPreview;

  elements.titleInput.value = currentDraft.scenario.title || "";
  elements.appInput.value = currentDraft.scenario.app.name || "";
  elements.envInput.value = currentDraft.scenario.app.environment || "";

  const steps = currentDraft.scenario.steps;
  const assertions = currentDraft.scenario.assertions;
  elements.statusLabel.textContent = currentDraft.status === "recording" ? "Enregistrement en cours" : "En pause";
  elements.stepCount.textContent = `${steps.length} étape${steps.length > 1 ? "s" : ""}`;
  elements.startButton.disabled = currentDraft.status === "recording";
  elements.stopButton.disabled = currentDraft.status !== "recording";

  renderList(elements.stepsList, steps, stepLabel, "steps");
  renderList(elements.assertionsList, assertions, assertionLabel, "assertions");
}

async function refresh() {
  const response = await send({ type: "POPUP_GET_STATE" });
  if (response?.ok) {
    render(response);
  }
}

async function saveMetadata() {
  await send({
    type: "POPUP_SAVE_METADATA",
    payload: {
      title: elements.titleInput.value.trim() || "Nouveau scénario métier",
      app: {
        name: elements.appInput.value.trim(),
        environment: elements.envInput.value.trim()
      }
    }
  });
}

function pageAssertionPayload(kind, tab) {
  const expected = elements.expectedInput.value.trim();
  return {
    kind,
    expected: expected || (kind === "url" ? tab.url : tab.title),
    page: {
      url: tab.url,
      title: tab.title
    },
    selector: null,
    observed: kind === "url" ? { url: tab.url } : { title: tab.title },
    qaNote: "Assertion ajoutée depuis le popup"
  };
}

function downloadJson(exportData) {
  const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  const safeTitle = (exportData.scenario.title || "scenario").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  anchor.href = url;
  anchor.download = `${safeTitle || "scenario"}-playwright-export.json`;
  anchor.click();
  URL.revokeObjectURL(url);
}

elements.startButton.addEventListener("click", async () => {
  await saveMetadata();
  const tab = await activeTab();
  await send({ type: "POPUP_START_RECORDING", tabId: tab.id });
  await refresh();
});

elements.stopButton.addEventListener("click", async () => {
  const tab = await activeTab();
  await send({ type: "POPUP_STOP_RECORDING", tabId: tab.id });
  await refresh();
});

elements.resetButton.addEventListener("click", async () => {
  const tab = await activeTab();
  await send({ type: "POPUP_RESET_DRAFT", tabId: tab.id });
  await refresh();
});

[elements.titleInput, elements.appInput, elements.envInput].forEach((input) => {
  input.addEventListener("change", saveMetadata);
});

elements.addPageAssertionButton.addEventListener("click", async () => {
  const tab = await activeTab();
  const kind = elements.assertionKind.value;
  await send({ type: "POPUP_ADD_ASSERTION", payload: pageAssertionPayload(kind, tab) });
  elements.expectedInput.value = "";
  await refresh();
});

elements.pickAssertionButton.addEventListener("click", async () => {
  const tab = await activeTab();
  const kind = elements.assertionKind.value;
  elements.statusLabel.textContent = "Cliquez l'élément attendu dans la page";
  await send({
    type: "POPUP_PICK_ASSERTION_TARGET",
    tabId: tab.id,
    assertionKind: kind,
    expected: elements.expectedInput.value.trim()
  });
  elements.expectedInput.value = "";
  window.close();
});

elements.copyButton.addEventListener("click", async () => {
  const response = await send({ type: "POPUP_EXPORT" });
  if (response?.ok) {
    await navigator.clipboard.writeText(JSON.stringify(response.export, null, 2));
    currentExport = response.export;
    elements.statusLabel.textContent = "JSON copié";
  }
});

elements.downloadButton.addEventListener("click", async () => {
  await saveMetadata();
  const response = await send({ type: "POPUP_EXPORT" });
  if (response?.ok) {
    currentExport = response.export;
    downloadJson(currentExport);
  }
});

refresh();
