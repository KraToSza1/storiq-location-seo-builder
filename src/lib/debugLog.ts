/** Browser devtools logging — filter console with `[StorIQ]`. Enable in production: localStorage.setItem('storiq-debug','1') */
const PREFIX = "[StorIQ]";

export const isStorIqDebugEnabled = (): boolean => {
  if (import.meta.env.DEV) {
    return true;
  }
  try {
    return localStorage.getItem("storiq-debug") === "1";
  } catch {
    return false;
  }
};

export const debugLog = (scope: string, message: string, data?: unknown): void => {
  if (!isStorIqDebugEnabled()) {
    return;
  }
  if (data === undefined) {
    console.log(`${PREFIX} ${scope}:`, message);
  } else {
    console.log(`${PREFIX} ${scope}:`, message, data);
  }
};

export const debugWarn = (scope: string, message: string, data?: unknown): void => {
  if (!isStorIqDebugEnabled()) {
    return;
  }
  if (data === undefined) {
    console.warn(`${PREFIX} ${scope}:`, message);
  } else {
    console.warn(`${PREFIX} ${scope}:`, message, data);
  }
};

export const debugError = (scope: string, message: string, data?: unknown): void => {
  if (!isStorIqDebugEnabled()) {
    return;
  }
  if (data === undefined) {
    console.error(`${PREFIX} ${scope}:`, message);
  } else {
    console.error(`${PREFIX} ${scope}:`, message, data);
  }
};

export const debugTable = (scope: string, rows: Record<string, unknown>[]): void => {
  if (!isStorIqDebugEnabled() || rows.length === 0) {
    return;
  }
  console.log(`${PREFIX} ${scope} (table)`);
  console.table(rows);
};

export const logStorIqDebugBanner = (): void => {
  if (!isStorIqDebugEnabled()) {
    console.info(`${PREFIX} Debug logging OFF. Dev: auto-on. Production: localStorage.setItem("storiq-debug","1") then refresh.`);
    return;
  }
  console.groupCollapsed(`${PREFIX} Debug logging ON — full app trace`);
  console.info("Filter DevTools console by: StorIQ");
  console.info("Scopes: UI:input | UI:paste | UI:copy | UI:button | FLOW# | prepareProject | validationGate | exportChecks");
  console.info("Production: localStorage.setItem('storiq-debug','1'); location.reload();");
  console.groupEnd();
};
