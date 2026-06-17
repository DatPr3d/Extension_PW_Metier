(() => {
  const RECORDER_VERSION = "2026-06-17-tooltip-singleton";
  if (window.__scenarioCaptureRecorderLoaded === RECORDER_VERSION) return;
  if (typeof window.__scenarioCaptureRecorderCleanup === "function") {
    window.__scenarioCaptureRecorderCleanup();
  }
  window.__scenarioCaptureRecorderLoaded = RECORDER_VERSION;

  let active = false;
  let assertionPickMode = null;
  let hoveredPickTarget = null;
  let lastHoveredSelector = null;
  const inputTimers = new WeakMap();

  document.querySelectorAll("#scenario-capture-picker-style, #scenario-capture-selector-tooltip").forEach((node) => node.remove());

  const pickerStyle = document.createElement("style");
  pickerStyle.id = "scenario-capture-picker-style";
  pickerStyle.textContent = `
    html[data-scenario-capture-recording="true"][data-scenario-capture-picking="true"],
    html[data-scenario-capture-recording="true"][data-scenario-capture-picking="true"] * {
      cursor: crosshair !important;
    }
    [data-scenario-capture-hovered="high"] {
      outline: 3px solid #12b886 !important;
      outline-offset: 3px !important;
      box-shadow: 0 0 0 6px rgba(18, 184, 134, .18) !important;
    }
    [data-scenario-capture-hovered="medium"] {
      outline: 3px solid #f59f00 !important;
      outline-offset: 3px !important;
      box-shadow: 0 0 0 6px rgba(245, 159, 0, .18) !important;
    }
    [data-scenario-capture-hovered="low"] {
      outline: 3px solid #ff6b6b !important;
      outline-offset: 3px !important;
      box-shadow: 0 0 0 6px rgba(255, 107, 107, .18) !important;
    }
    #scenario-capture-selector-tooltip {
      position: fixed !important;
      z-index: 2147483647 !important;
      max-width: min(520px, calc(100vw - 24px)) !important;
      padding: 7px 9px !important;
      border-radius: 7px !important;
      border: 1px solid rgba(255,255,255,.18) !important;
      color: #f8fafc !important;
      background: rgba(15, 23, 42, .96) !important;
      box-shadow: 0 10px 28px rgba(0,0,0,.28) !important;
      font: 600 12px/1.35 ui-monospace, SFMono-Regular, Menlo, Consolas, monospace !important;
      pointer-events: none !important;
      white-space: nowrap !important;
      overflow: hidden !important;
      text-overflow: ellipsis !important;
    }
    #scenario-capture-selector-tooltip[data-confidence="high"] {
      border-color: #12b886 !important;
    }
    #scenario-capture-selector-tooltip[data-confidence="medium"] {
      border-color: #f59f00 !important;
    }
    #scenario-capture-selector-tooltip[data-confidence="low"] {
      border-color: #ff6b6b !important;
    }
  `;
  document.documentElement.append(pickerStyle);

  const selectorTooltip = document.createElement("div");
  selectorTooltip.id = "scenario-capture-selector-tooltip";
  selectorTooltip.hidden = true;
  document.documentElement.append(selectorTooltip);

  function textOf(element) {
    if (!element) return "";
    return (element.innerText || element.textContent || element.value || "")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 160);
  }

  function cssEscape(value) {
    if (window.CSS?.escape) return window.CSS.escape(value);
    return String(value).replace(/[^a-zA-Z0-9_-]/g, "\\$&");
  }

  function attrSelector(name, value) {
    return "[" + name + "=\"" + String(value).replace(/"/g, "\\\"") + "\"]";
  }

  function roleOf(element) {
    if (!element?.tagName) return null;
    if (element.getAttribute("role")) return element.getAttribute("role");
    const tagName = element.tagName.toLowerCase();
    if (tagName === "button") return "button";
    if (tagName === "a") return "link";
    if (tagName === "input" || tagName === "textarea") return "textbox";
    if (tagName === "select") return "combobox";
    return null;
  }

  function selectorFor(element) {
    if (!element?.tagName) {
      return { primary: "body", strategy: "fallback", alternatives: [] };
    }

    const candidates = [];
    const tagName = element.tagName.toLowerCase();
    const testAttribute = ["data-testid", "data-test", "data-cy"].find((attribute) => element.getAttribute(attribute));
    const testId = testAttribute ? element.getAttribute(testAttribute) : "";
    const label = element.getAttribute("aria-label");
    const placeholder = element.getAttribute("placeholder");
    const isFormControl = ["input", "textarea", "select"].includes(tagName);
    const text = isFormControl ? "" : textOf(element);
    const role = roleOf(element);

    if (testId) candidates.push({ kind: "testId", value: "[" + testAttribute + "=\"" + testId + "\"]", confidence: "high" });
    if (label) candidates.push({ kind: "ariaLabel", value: attrSelector("aria-label", label), confidence: "high" });
    if (element.id) candidates.push({ kind: "id", value: "#" + cssEscape(element.id), confidence: "medium" });
    if (element.name) candidates.push({ kind: "name", value: tagName + attrSelector("name", element.name), confidence: "medium" });
    if (placeholder) candidates.push({ kind: "placeholder", value: tagName + attrSelector("placeholder", placeholder), confidence: "medium" });
    if (role && text) candidates.push({ kind: "roleText", value: tagName + ":has-text(\"" + text.replace(/"/g, "\\\"") + "\")", confidence: "medium" });

    candidates.push({ kind: "cssPath", value: cssPathFor(element), confidence: "low" });
    const primary = candidates[0];
    return {
      primary: primary.value,
      strategy: primary.kind,
      alternatives: candidates.slice(1).map((candidate) => candidate.value)
    };
  }

  function cssPathFor(element) {
    if (!element?.tagName) return "body";

    const segments = [];
    let node = element;
    while (node && node.nodeType === Node.ELEMENT_NODE && node !== document.body) {
      const tag = node.tagName.toLowerCase();
      const parent = node.parentElement;
      if (!parent) break;
      const siblings = Array.from(parent.children || []).filter((sibling) => sibling.tagName === node.tagName);
      const index = siblings.indexOf(node) + 1;
      segments.unshift(siblings.length > 1 ? tag + ":nth-of-type(" + index + ")" : tag);
      node = parent;
    }
    return segments.length ? segments.join(" > ") : element.tagName.toLowerCase();
  }

  function selectorConfidence(selector) {
    if (selector.strategy === "testId" || selector.strategy === "ariaLabel") return "high";
    if (selector.strategy === "id" || selector.strategy === "name" || selector.strategy === "placeholder" || selector.strategy === "roleText") return "medium";
    return "low";
  }

  function isSensitiveInput(element) {
    if (!element?.getAttribute) return false;
    const type = (element.getAttribute("type") || "").toLowerCase();
    const name = ((element.getAttribute("name") || "") + " " + (element.getAttribute("id") || "")).toLowerCase();
    return type === "password" || /password|token|secret|otp|mfa|code/.test(name);
  }

  function payloadFor(element, kind, extra = {}) {
    const selector = selectorFor(element);
    return {
      url: location.href,
      title: document.title,
      selectorConfidence: selectorConfidence(selector),
      action: {
        kind,
        selector,
        label: textOf(element),
        tagName: element.tagName.toLowerCase(),
        ...extra
      }
    };
  }

  function sendStep(payload) {
    chrome.runtime.sendMessage({ type: "RECORDER_STEP_CAPTURED", payload }).catch(() => {});
  }

  function pickableElement(target) {
    if (!(target instanceof Element)) {
      return document.body;
    }

    return target.closest("button,a,input,textarea,select,label,[role],h1,h2,h3,p,span,div,svg,path") || target;
  }

  function clearHoveredPickTarget() {
    if (hoveredPickTarget) hoveredPickTarget.removeAttribute("data-scenario-capture-hovered");
    hoveredPickTarget = null;
    lastHoveredSelector = null;
    selectorTooltip.hidden = true;
  }

  function isInspecting() {
    return active;
  }

  function moveTooltip(event) {
    const tooltipWidth = Math.min(selectorTooltip.offsetWidth || 360, 520);
    const tooltipHeight = selectorTooltip.offsetHeight || 34;
    const rect = hoveredPickTarget?.getBoundingClientRect();
    let left = event.clientX + 14;
    let top = event.clientY + 18;

    if (rect) {
      left = rect.left;
      top = rect.bottom + 8;
      if (top + tooltipHeight > window.innerHeight - 8) {
        top = rect.top - tooltipHeight - 8;
      }
    }

    selectorTooltip.style.left = Math.max(8, Math.min(left, window.innerWidth - tooltipWidth - 8)) + "px";
    selectorTooltip.style.top = Math.max(8, Math.min(top, window.innerHeight - tooltipHeight - 8)) + "px";
  }

  function updateHoveredTarget(event) {
    if (!isInspecting()) {
      clearHoveredPickTarget();
      return;
    }

    const element = pickableElement(event.target);
    if (!element || element === document.documentElement || element === document.body) {
      clearHoveredPickTarget();
      return;
    }

    if (element !== hoveredPickTarget) {
      if (hoveredPickTarget) hoveredPickTarget.removeAttribute("data-scenario-capture-hovered");
      hoveredPickTarget = element;
      const selector = selectorFor(element);
      const confidence = selectorConfidence(selector);
      lastHoveredSelector = selector;
      hoveredPickTarget.setAttribute("data-scenario-capture-hovered", confidence);
      selectorTooltip.dataset.confidence = confidence;
      selectorTooltip.textContent = selector.primary;
      selectorTooltip.hidden = false;
    }

    moveTooltip(event);
  }

  function handleClick(event) {
    if (assertionPickMode) {
      event.preventDefault();
      event.stopPropagation();
      const element = pickableElement(event.target);
      const picked = {
        kind: assertionPickMode.kind,
        expected: assertionPickMode.expected,
        selector: selectorFor(element),
        observed: {
          text: textOf(element),
          value: isSensitiveInput(element) ? "" : element.value || "",
          checked: Boolean(element.checked)
        },
        page: { url: location.href, title: document.title }
      };
      assertionPickMode = null;
      document.documentElement.dataset.scenarioCapturePicking = "false";
      clearHoveredPickTarget();
      chrome.runtime.sendMessage({ type: "RECORDER_ASSERTION_CAPTURED", payload: picked }).catch(() => {});
      return;
    }

    if (!active) return;
    const element = event.target.closest("button,a,input[type='button'],input[type='submit'],[role='button'],[role='link']") || event.target;
    sendStep(payloadFor(element, "click"));
  }

  function handleInput(event) {
    if (!active) return;
    const element = event.target;
    if (!(element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement)) return;
    if (["checkbox", "radio"].includes(element.type)) return;
    const value = isSensitiveInput(element) ? "<redacted>" : element.value;
    window.clearTimeout(inputTimers.get(element));
    inputTimers.set(element, window.setTimeout(() => sendStep(payloadFor(element, "fill", { value })), 500));
  }

  function handleChange(event) {
    if (!active) return;
    const element = event.target;
    if (element instanceof HTMLSelectElement) {
      sendStep(payloadFor(element, "select", { value: element.value }));
      return;
    }
    if (element instanceof HTMLInputElement && ["checkbox", "radio"].includes(element.type)) {
      sendStep(payloadFor(element, "check", { checked: element.checked, value: element.value }));
    }
  }

  function pickAssertionTarget(assertionKind, expected) {
    assertionPickMode = { kind: assertionKind, expected };
    document.documentElement.dataset.scenarioCapturePicking = "true";
  }

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message.type === "RECORDER_SET_ACTIVE") {
      active = Boolean(message.active);
      document.documentElement.dataset.scenarioCaptureRecording = String(active);
      if (!active && !assertionPickMode) clearHoveredPickTarget();
      sendResponse({ ok: true, active });
      return true;
    }
    if (message.type === "RECORDER_PICK_ASSERTION_TARGET") {
      pickAssertionTarget(message.assertionKind, message.expected);
      sendResponse({ ok: true });
      return true;
    }
    return false;
  });

  document.addEventListener("click", handleClick, true);
  document.addEventListener("input", handleInput, true);
  document.addEventListener("change", handleChange, true);
  document.addEventListener("mouseover", updateHoveredTarget, true);
  document.addEventListener("mousemove", updateHoveredTarget, true);

  window.__scenarioCaptureRecorderCleanup = () => {
    clearHoveredPickTarget();
    document.documentElement.dataset.scenarioCaptureRecording = "false";
    document.documentElement.dataset.scenarioCapturePicking = "false";
    document.removeEventListener("click", handleClick, true);
    document.removeEventListener("input", handleInput, true);
    document.removeEventListener("change", handleChange, true);
    document.removeEventListener("mouseover", updateHoveredTarget, true);
    document.removeEventListener("mousemove", updateHoveredTarget, true);
    pickerStyle.remove();
    selectorTooltip.remove();
  };
})();
