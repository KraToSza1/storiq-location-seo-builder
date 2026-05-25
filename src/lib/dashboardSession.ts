import type { ProjectQueueFilter } from "./projectQueue";

const DASHBOARD_SESSION_KEY = "storiq-dashboard-session-v1";

const QUEUE_FILTERS: ProjectQueueFilter[] = ["all", "in_progress", "export_ready", "needs_review", "approved"];

export interface DashboardSession {
  queueFilter: ProjectQueueFilter;
  lastProjectId: string | null;
  lastWorkspaceTab: string | null;
  updatedAt: string | null;
}

const defaultSession = (): DashboardSession => ({
  queueFilter: "all",
  lastProjectId: null,
  lastWorkspaceTab: null,
  updatedAt: null,
});

const normalizeQueueFilter = (value: unknown): ProjectQueueFilter =>
  typeof value === "string" && QUEUE_FILTERS.includes(value as ProjectQueueFilter)
    ? (value as ProjectQueueFilter)
    : "all";

const normalizeWorkspaceTab = (value: unknown): string | null => {
  if (typeof value !== "string") {
    return null;
  }
  return value === "Draft Copy" ? "Content Output" : value;
};

export const loadDashboardSession = (): DashboardSession => {
  try {
    const raw = localStorage.getItem(DASHBOARD_SESSION_KEY);
    if (!raw) {
      return defaultSession();
    }

    const stored = JSON.parse(raw) as Partial<DashboardSession>;
    return {
      queueFilter: normalizeQueueFilter(stored.queueFilter),
      lastProjectId: typeof stored.lastProjectId === "string" ? stored.lastProjectId : null,
      lastWorkspaceTab: normalizeWorkspaceTab(stored.lastWorkspaceTab),
      updatedAt: typeof stored.updatedAt === "string" ? stored.updatedAt : null,
    };
  } catch {
    return defaultSession();
  }
};

export const saveDashboardSession = (patch: Partial<DashboardSession>): DashboardSession => {
  const current = loadDashboardSession();
  const next: DashboardSession = {
    ...current,
    ...patch,
    queueFilter: patch.queueFilter ? normalizeQueueFilter(patch.queueFilter) : current.queueFilter,
    updatedAt: patch.updatedAt ?? new Date().toISOString(),
  };

  localStorage.setItem(DASHBOARD_SESSION_KEY, JSON.stringify(next));
  return next;
};

export const clearDashboardLastProject = (): void => {
  saveDashboardSession({ lastProjectId: null, lastWorkspaceTab: null });
};
