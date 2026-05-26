import { debugLog, isStorIqDebugEnabled } from "./debugLog";

let flowCounter = 0;

/** Journey marker — filter console with `FLOW` or `[StorIQ]`. */
export const debugFlow = (phase: string, message: string, data?: Record<string, unknown>): void => {
  flowCounter += 1;
  debugLog(`FLOW#${flowCounter}:${phase}`, message, data);
};

const MAX_PREVIEW = 240;

export const summarizeForLog = (value: unknown): unknown => {
  if (value === null || value === undefined) return value;
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (trimmed.length <= MAX_PREVIEW) return trimmed;
    return `${trimmed.slice(0, MAX_PREVIEW)}… (${trimmed.length} chars)`;
  }
  if (Array.isArray(value)) {
    return { count: value.length, preview: value.slice(0, 5).map((item) => summarizeForLog(item)) };
  }
  if (typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>).slice(0, 12);
    return Object.fromEntries(entries.map(([k, v]) => [k, summarizeForLog(v)]));
  }
  return value;
};

const fieldLabelFromElement = (element: HTMLElement): string | undefined => {
  const label = element.closest("label");
  const storiqLabel = label?.querySelector(".storiq-label");
  if (storiqLabel?.textContent) return storiqLabel.textContent.replace(/\*/g, "").trim();
  return (
    element.getAttribute("aria-label") ||
    element.getAttribute("name") ||
    element.getAttribute("id") ||
    undefined
  );
};

const controlLabelFromElement = (element: HTMLElement): string => {
  const explicit = element.getAttribute("aria-label") || element.getAttribute("title");
  if (explicit) return explicit;
  const text = element.textContent?.replace(/\s+/g, " ").trim();
  if (text) return text.slice(0, 80);
  const nav = element.closest(".storiq-nav-link");
  if (nav?.textContent) return nav.textContent.replace(/\s+/g, " ").trim().slice(0, 80);
  return element.tagName.toLowerCase();
};

export const logInputChange = (field: string, value: unknown, meta?: Record<string, unknown>): void => {
  debugLog("UI:input", field, { value: summarizeForLog(value), ...meta });
};

export const logPaste = (field: string, pasted: string, meta?: Record<string, unknown>): void => {
  debugLog("UI:paste", field, { pasted: summarizeForLog(pasted), length: pasted.length, ...meta });
};

export const logCopy = (label: string, value: string, meta?: Record<string, unknown>): void => {
  debugLog("UI:copy", label, { copied: summarizeForLog(value), length: value.length, ...meta });
};

export const logButtonClick = (label: string, meta?: Record<string, unknown>): void => {
  debugLog("UI:button", label, meta);
};

export const logSelectChange = (field: string, value: string, meta?: Record<string, unknown>): void => {
  debugLog("UI:select", field, { value, ...meta });
};

export const logCheckboxToggle = (field: string, checked: boolean, meta?: Record<string, unknown>): void => {
  debugLog("UI:checkbox", field, { checked, ...meta });
};

export const logNavigate = (path: string, meta?: Record<string, unknown>): void => {
  debugFlow("navigate", path, meta);
};

export const logStorageWrite = (key: string, meta?: Record<string, unknown>): void => {
  debugLog("storage", `write ${key}`, meta);
};

let globalListenersInstalled = false;

export const installGlobalDebugListeners = (): void => {
  if (globalListenersInstalled || !isStorIqDebugEnabled()) {
    return;
  }
  globalListenersInstalled = true;

  document.addEventListener(
    "click",
    (event) => {
      const target = event.target as HTMLElement | null;
      if (!target) return;
      const button = target.closest("button, a.storiq-nav-link, a.storiq-btn, [role='button']");
      if (!button || button.tagName === "INPUT") return;
      if ((button as HTMLButtonElement).disabled) return;
      logButtonClick(controlLabelFromElement(button as HTMLElement), {
        tag: button.tagName,
        className: button.className.split(" ").slice(0, 4).join(" ") || undefined,
      });
    },
    true,
  );

  document.addEventListener(
    "paste",
    (event) => {
      const target = event.target as HTMLElement | null;
      if (!target?.matches("input, textarea, [contenteditable='true']")) return;
      const text = event.clipboardData?.getData("text/plain") ?? "";
      if (!text) return;
      logPaste(fieldLabelFromElement(target) ?? target.tagName, text);
    },
    true,
  );

  document.addEventListener(
    "copy",
    () => {
      const selection = document.getSelection()?.toString() ?? "";
      if (selection.trim()) {
        logCopy("selection", selection);
      }
    },
    true,
  );

  document.addEventListener(
    "change",
    (event) => {
      const target = event.target as HTMLElement | null;
      if (!target) return;
      if (target.matches("select")) {
        logSelectChange(fieldLabelFromElement(target) ?? "select", (target as HTMLSelectElement).value);
        return;
      }
      if (target.matches('input[type="checkbox"]')) {
        logCheckboxToggle(fieldLabelFromElement(target) ?? "checkbox", (target as HTMLInputElement).checked);
        return;
      }
      if (target.matches('input[type="radio"]')) {
        logSelectChange(fieldLabelFromElement(target) ?? "radio", (target as HTMLInputElement).value);
        return;
      }
      if (target.matches('input[type="file"]')) {
        const files = (target as HTMLInputElement).files;
        debugLog("UI:file", fieldLabelFromElement(target) ?? "file", {
          count: files?.length ?? 0,
          names: files ? Array.from(files).map((f) => f.name) : [],
        });
      }
    },
    true,
  );

  debugLog("debugUi", "global listeners installed", {
    capture: "click, paste, copy, change (select/checkbox/file)",
  });
};
