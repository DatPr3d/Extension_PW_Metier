function slugify(value, fallback = "scenario") {
  const slug = String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return slug || fallback;
}

function escapeSpecString(value) {
  return JSON.stringify(value || "");
}

function orderedExportJourney(scenario) {
  if (Array.isArray(scenario?.journey) && scenario.journey.some((entry) => entry.type === "action" || entry.assertion || entry.name)) {
    return scenario.journey.map((entry) => ({
      type: entry.type === "action" ? "step" : "assertion",
      item: entry
    }));
  }

  if (Array.isArray(scenario?.journey) && scenario.journey.length && scenario.journey[0]?.item) {
    return scenario.journey.map((entry) => ({
      type: entry.ref === "step" || entry.type === "action" ? "step" : "assertion",
      item: entry.item
    }));
  }

  const steps = new Map((scenario?.steps || []).map((step) => [step.id, step]));
  const assertions = new Map((scenario?.assertions || []).map((assertion) => [assertion.id, assertion]));
  const journey = scenario?.journey?.length
    ? scenario.journey
    : [
        ...(scenario?.steps || []).map((step) => ({ type: "step", id: step.id })),
        ...(scenario?.assertions || []).map((assertion) => ({ type: "assertion", id: assertion.id }))
      ];

  return journey
    .map((entry) => {
      const item = entry.type === "step" ? steps.get(entry.id) : assertions.get(entry.id);
      return item ? { type: entry.type, item } : null;
    })
    .filter(Boolean);
}

function playwrightActionLine(step) {
  const action = step.action || {};
  const selector = action.selector || step.selector || {};
  const locator = `page.locator(${escapeSpecString(selector.primary || "body")})`;
  if (action.kind === "fill") return `  await ${locator}.fill(${escapeSpecString(action.value || "")});`;
  if (action.kind === "select") return `  await ${locator}.selectOption(${escapeSpecString(action.value || "")});`;
  if (action.kind === "check") return `  await ${locator}.${action.checked ? "check" : "uncheck"}();`;
  return `  await ${locator}.click();`;
}

function playwrightAssertionLine(assertion) {
  const assertionData = assertion.assertion || assertion;
  if (assertionData.kind === "url") return `  await expect(page).toHaveURL(${escapeSpecString(assertionData.expected || assertion.page?.url || "")});`;
  if (assertionData.kind === "title") return `  await expect(page).toHaveTitle(${escapeSpecString(assertionData.expected || assertion.page?.title || "")});`;

  const locator = `page.locator(${escapeSpecString(assertion.selector?.primary || "body")})`;
  if (assertionData.kind === "visible") return `  await expect(${locator}).toBeVisible();`;
  if (assertionData.kind === "value") return `  await expect(${locator}).toHaveValue(${escapeSpecString(assertionData.expected || assertionData.observed?.value || "")});`;
  return `  await expect(${locator}).toContainText(${escapeSpecString(assertionData.expected || assertionData.observed?.text || "")});`;
}

function buildDraftSpec(exportData) {
  const scenario = exportData?.scenario || {};
  const journey = orderedExportJourney(scenario);
  const lines = [
    "import { test, expect } from '@playwright/test';",
    "",
    `test(${escapeSpecString(scenario.title || "Scenario metier")}, async ({ page }) => {`
  ];
  const firstUrl = journey.find((entry) => entry.item?.page?.url)?.item.page.url;
  if (firstUrl) lines.push(`  await page.goto(${escapeSpecString(firstUrl)});`);

  journey.forEach((entry) => {
    if (entry.item?.comment || entry.item?.businessComment) {
      lines.push(`  // Metier: ${(entry.item.comment || entry.item.businessComment).replace(/\r?\n/g, " ")}`);
    }
    lines.push(entry.type === "step" ? playwrightActionLine(entry.item) : playwrightAssertionLine(entry.item));
  });
  lines.push("});");
  lines.push("");
  return lines.join("\n");
}

function locatorSuggestion(item, selector, type) {
  const source = item.name || item.target || item.assertion?.expected || item.selector?.primary || item.id;
  const tag = type === "assertion" ? "assertion" : "element";
  return `data-testid="${slugify(`${tag}-${source}`, "element-cible")}"`;
}

function locatorQualityReason(selector, confidence) {
  if (!selector) return "Aucun selecteur disponible.";
  if (confidence === "high") return "Selecteur stable base sur un attribut de test ou un label accessible.";
  if (selector.strategy === "cssPath" || selector.primary?.includes(":nth-of-type")) return "Chemin CSS structurel fragile si le DOM change.";
  if (selector.strategy === "placeholder") return "Placeholder utilisable, a verifier si le texte peut changer.";
  if (selector.strategy === "roleText") return "Texte visible utilisable, sensible aux changements de wording.";
  return "Selecteur a relire par dev/QA.";
}

function collectLocatorEntries(exportData) {
  const scenario = exportData?.scenario || {};
  return (scenario.journey || []).filter((entry) => entry.selector).map((entry) => ({
    id: entry.id,
    type: entry.type,
    order: entry.order,
    name: entry.name,
    selector: entry.selector,
    confidence: entry.selector?.confidence || "medium",
    suggestion: locatorSuggestion(entry, entry.selector, entry.type)
  })).map((entry) => ({
    ...entry,
    needsDeveloperReview: entry.confidence !== "high",
    reason: locatorQualityReason(entry.selector, entry.confidence)
  }));
}

function buildLocatorReport(exportData) {
  const locators = collectLocatorEntries(exportData);
  return {
    schema: "internal.playwright-locator-brief",
    locators: locators.map((entry) => ({
      id: entry.id,
      type: entry.type,
      order: entry.order,
      name: entry.name,
      primary: entry.selector?.primary || "",
      strategy: entry.selector?.strategy || "missing",
      confidence: entry.confidence,
      alternatives: entry.selector?.alternatives || [],
      issue: entry.needsDeveloperReview ? entry.reason : "",
      suggestedDataTestId: entry.needsDeveloperReview ? entry.suggestion : ""
    }))
  };
}

function buildSensitiveDataReport(exportData) {
  const redacted = (exportData?.scenario?.journey || []).filter((entry) => entry.type === "action" && entry.action?.value === "<redacted>");
  return {
    schema: "internal.playwright-sensitive-data-brief",
    redactedInputs: redacted.map((entry) => ({
      id: entry.id,
      order: entry.order,
      name: entry.name,
      selector: entry.selector?.primary || "",
      replacementHint: "Utiliser une fixture ou une variable de test, ne pas remettre la valeur reelle."
    }))
  };
}

function dataUrlToBytes(dataUrl) {
  const base64 = String(dataUrl || "").split(",")[1] || "";
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

function stringToBytes(value) {
  return new TextEncoder().encode(String(value));
}

function crc32(bytes) {
  let crc = -1;
  for (let index = 0; index < bytes.length; index += 1) {
    crc ^= bytes[index];
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
    }
  }
  return (crc ^ -1) >>> 0;
}

function writeUint16(output, value) {
  output.push(value & 0xff, (value >>> 8) & 0xff);
}

function writeUint32(output, value) {
  output.push(value & 0xff, (value >>> 8) & 0xff, (value >>> 16) & 0xff, (value >>> 24) & 0xff);
}

function pushBytes(output, bytes) {
  for (let index = 0; index < bytes.length; index += 1) {
    output.push(bytes[index]);
  }
}

function dosDateTime(date = new Date()) {
  return {
    time: (date.getHours() << 11) | (date.getMinutes() << 5) | Math.floor(date.getSeconds() / 2),
    date: ((date.getFullYear() - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate()
  };
}

function createZip(files) {
  const output = [];
  const central = [];
  const now = dosDateTime();
  let offset = 0;

  files.forEach((file) => {
    const nameBytes = stringToBytes(file.name);
    const bytes = file.bytes instanceof Uint8Array ? file.bytes : stringToBytes(file.content || "");
    const checksum = crc32(bytes);
    const local = [];

    writeUint32(local, 0x04034b50);
    writeUint16(local, 20);
    writeUint16(local, 0);
    writeUint16(local, 0);
    writeUint16(local, now.time);
    writeUint16(local, now.date);
    writeUint32(local, checksum);
    writeUint32(local, bytes.length);
    writeUint32(local, bytes.length);
    writeUint16(local, nameBytes.length);
    writeUint16(local, 0);
    pushBytes(local, nameBytes);
    pushBytes(local, bytes);
    pushBytes(output, local);

    const header = [];
    writeUint32(header, 0x02014b50);
    writeUint16(header, 20);
    writeUint16(header, 20);
    writeUint16(header, 0);
    writeUint16(header, 0);
    writeUint16(header, now.time);
    writeUint16(header, now.date);
    writeUint32(header, checksum);
    writeUint32(header, bytes.length);
    writeUint32(header, bytes.length);
    writeUint16(header, nameBytes.length);
    writeUint16(header, 0);
    writeUint16(header, 0);
    writeUint16(header, 0);
    writeUint16(header, 0);
    writeUint32(header, 0);
    writeUint32(header, offset);
    pushBytes(header, nameBytes);
    central.push(...header);

    offset += local.length;
  });

  const centralOffset = output.length;
  pushBytes(output, central);
  writeUint32(output, 0x06054b50);
  writeUint16(output, 0);
  writeUint16(output, 0);
  writeUint16(output, files.length);
  writeUint16(output, files.length);
  writeUint32(output, central.length);
  writeUint32(output, centralOffset);
  writeUint16(output, 0);

  return new Uint8Array(output);
}

function bytesToBase64(bytes) {
  let binary = "";
  const chunkSize = 0x8000;
  for (let index = 0; index < bytes.length; index += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(index, index + chunkSize));
  }
  return btoa(binary);
}

function buildExportPackage(draft, exportData) {
  const screenshots = draft.captures || [];
  const locatorReport = buildLocatorReport(exportData);
  const sensitiveDataReport = buildSensitiveDataReport(exportData);
  const draftSpec = buildDraftSpec(exportData);

  const files = [
    { name: "scenario.json", content: JSON.stringify(exportData, null, 2) },
    { name: "draft.spec.ts", content: draftSpec },
    { name: "reports/locator-report.json", content: JSON.stringify(locatorReport, null, 2) },
    { name: "reports/sensitive-data-report.json", content: JSON.stringify(sensitiveDataReport, null, 2) }
  ];

  screenshots.forEach((capture) => {
    if (capture.dataUrl) {
      files.push({
        name: capture.path || `screenshots/${capture.id || slugify(capture.itemId, "capture")}.png`,
        bytes: dataUrlToBytes(capture.dataUrl)
      });
    }
  });

  const zipBytes = createZip(files);
  const filename = `recording-${slugify(exportData.scenario?.title || "scenario")}-${new Date().toISOString().slice(0, 10)}.zip`;

  return {
    filename,
    mimeType: "application/zip",
    base64: bytesToBase64(zipBytes),
    locatorReport,
    sensitiveDataReport,
    draftSpec
  };
}
