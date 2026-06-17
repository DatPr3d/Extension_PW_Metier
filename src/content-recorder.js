(() => {
  if (window.__scenarioCaptureRecorderLoaded) {
    return;
  }

  window.__scenarioCaptureRecorderLoaded = true;

  let active = false;
  let assertionPickMode = null;
  const inputTimers = new WeakMap();

  function textOf(element) {
    return (element.innerText || element.textContent || element.value || "")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 160);
  }

  function cssEscape(value) {
    if (window.CSS?.escape) {
      return window.CSS.escape(value);
    }
    return String(value).replace(/[^a-zA-Z0-9_-]/g, "\\$&");
  }

  function attrSelector(name, value) {
    return `[${name}="${String(value).replace(/"/g, '\\"')}"]`;
  }

  function roleOf(element) {
    if (element.getAttribute("role")) {
      return element.getAttribute("role");
    }
    const tagName = element.tagName.toLowerCase();
    if (tagName === "button") return "button";
    if (tagName === "a") return "link";
    if (tagName === "input" || tagName === "textarea") return "textbox";
    if (tagName === "select") return "combobox";
    return null;
  }

  function selectorFor(element) {
    const candidates = [];
    const testAttribute = ["data-testid", "data-test", "data-cy"].find((attribute) => element.getAttribute(attribute));
    const testId = testAttribute ? element.getAttribute(testAttribute) : "";
    const label = element.getAttribute("aria-label");
    const text = textOf(element);
    const role = roleOf(element);

    if (testId) {
      candidates.push({ kind: "testId", value: `[${testAttribute}="${testId}"]`, confidence: "high" });
    }
    if (label) {
      candidates.push({ kind: "ariaLabel", value: attrSelector("aria-label", label), confidence: "high" });
    }
    if (element.id) {
      candidates.push({ kind: "id", value: `#${cssEscape(element.id)}`, confidence: "medium" });
    }
    if (element.name) {
      candidates.push({ kind: "name", value: `${element.tagName.toLowerCase()}${attrSelector("name", element.name)}`, confidence: "medium" });
    }
    if (role && text) {
      candidates.push({ kind: "roleText", value: `${element.tagName.toLowerCase()}:has-text("${text.replace(/"/g, '\\"')}")`, confidence: "medium" });
    }

    candidates.push({ kind: "cssPath", value: cssPathFor(element), confidence: "low" });

    const primary = candidates[0];
    return {
      primary: primary.value,
      strategy: primary.kind,
      alternatives: candidates.slice(1).map((candidate) => candidate.value)
    };
  }

  function cssPathFor(element) {
    const segments = [];
    let node = element;

    while (node && node.nodeType === Node.ELEMENT_NODE && node !== document.body) {
      const tag = node.tagName.toLowerCase();
      const parent = node.parentElement;
      if (!parent) break;

      const siblings = Array.from(parent.children).filter((sibling) => sibling.tagName === node.tagName);
      const index = siblings.indexOf(node) + 1;
      segments.unshift(siblings.length > 1 ? `${tag}:nth-of-type(${index})` : tag);
      node = parent;
    }

    return segments.length ? segments.join(" > ") : element.tagName.toLowerCase();
  }

  function selectorConfidence(selector) {
    if (selector.strategy === "testId" || selector.strategy === "ariaLabel") return "high";
    if (selector.strategy === "id" || selector.strategy === "name" || selector.strategy === "roleText") return "medium";
    return "low";
  }

  function isSensitiveInput(element) {
    const type = (element.getAttribute("type") || "").toLowerCase();
    const name = `${element.getAttribute("name") || ""} ${element.getAttribute("id") || ""}`.toLowerCase();
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

  function handleClick(event) {
    if (assertionPickMode) {
      event.preventDefault();
      event.stopPropagation();
      const element = event.target.closest("button,a,input,textarea,select,label,[role],h1,h2,h3,p,span,div") || event.target;
      const picked = {
        kind: assertionPickMode.kind,
        expected: assertionPickMode.expected,
        selector: selectorFor(element),
        observed: {
          text: textOf(element),
          value: isSensitiveInput(element) ? "" : element.value || "",
          checked: Boolean(element.checked)
        },
        page: {
          url: location.href,
          title: document.title
        },
      };
      assertionPickMode = null;
      document.documentElement.dataset.scenarioCapturePicking = "false";
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
    inputTimers.set(element, window.setTimeout(() => {
      sendStep(payloadFor(element, "fill", { value }));
    }, 500));
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
})();
