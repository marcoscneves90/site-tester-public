import type {
  Site,
  Run,
  RunWithRaw,
  Overview,
  TimelinePoint,
  WorstSite,
  RunResources,
  AppConfig,
  CompareResult,
  RunScreenshots,
  WaterfallData,
  SeoScore,
  SeoTechnicalData,
  SiteSeoScore,
  PageAudit,
  InfraData,
} from "./types";

const BASE = "/api";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const headers: Record<string, string> = {
    ...((init?.headers as Record<string, string>) ?? {}),
  };
  if (init?.body != null) {
    headers["Content-Type"] = "application/json";
  }

  const res = await fetch(BASE + path, { ...init, headers });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`API ${res.status}: ${body}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export const api = {
  listSites: () => request<Site[]>("/sites"),
  createSite: (url: string, name?: string) =>
    request<Site>("/sites", {
      method: "POST",
      body: JSON.stringify({ url, name }),
    }),
  deleteSite: (id: number) =>
    request<void>(`/sites/${id}`, { method: "DELETE" }),
  runSite: (id: number, device: "desktop" | "mobile" | "ambos" = "desktop") =>
    request<{ runIds: number[]; devices: string[]; status: string }>(
      `/sites/${id}/run`,
      {
        method: "POST",
        body: JSON.stringify({ device }),
      }
    ),
  listRuns: (siteId: number) => request<Run[]>(`/sites/${siteId}/runs`),
  getRun: (id: number) => request<RunWithRaw>(`/runs/${id}?raw=1`),
  getRunResources: (id: number) => request<RunResources>(`/runs/${id}/resources`),
  getRunScreenshots: (id: number) => request<RunScreenshots>(`/runs/${id}/screenshots`),
  getRunWaterfall: (id: number) => request<WaterfallData>(`/runs/${id}/waterfall`),
  getRunSeoScore: (id: number) => request<SeoScore>(`/runs/${id}/seo-score`), 
  getRunSeoTechnical: (id: number) => request<SeoTechnicalData>(`/runs/${id}/seo-technical`),
  getRunInfra: (id: number) => request<InfraData>(`/runs/${id}/infra`),
  getAllSeoScores: () => request<SiteSeoScore[]>("/sites/seo-scores"),
  getOverview: () => request<Overview>("/stats/overview"),
  getTimeline: (days = 30, siteId?: number) => {
    const params = new URLSearchParams({ days: String(days) });
    if (siteId != null) params.set("siteId", String(siteId));
    return request<TimelinePoint[]>(`/stats/timeline?${params.toString()}`);
  },
  getWorst: () => request<WorstSite[]>("/stats/worst"),
  getConfig: () => request<AppConfig>("/config"),
  compareRuns: (a: number, b: number) =>
    request<CompareResult>(`/runs/compare?a=${a}&b=${b}`),
  deleteRun: (id: number) => request<void>(`/runs/${id}`, { method: "DELETE" }),
  listRunPages: (runId: number) =>
    request<PageAudit[]>(`/runs/${runId}/pages`),
  getPage: (pageId: number) => request<PageAudit>(`/pages/${pageId}`),
};
