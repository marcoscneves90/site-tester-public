import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "./api";

export function useSites() {
  return useQuery({ queryKey: ["sites"], queryFn: api.listSites });
}

export function useSiteRuns(siteId: number, opts?: { refetchInterval?: number }) {
  return useQuery({
    queryKey: ["runs", siteId],
    queryFn: () => api.listRuns(siteId),
    refetchInterval: opts?.refetchInterval,
  });
}

export function useRun(runId: number | null) {
  return useQuery({
    queryKey: ["run", runId],
    queryFn: () => api.getRun(runId!),
    enabled: runId != null,
  });
}

export function useOverview() {
  return useQuery({
    queryKey: ["overview"],
    queryFn: api.getOverview,
    refetchInterval: 10_000,
  });
}

export function useTimeline(days = 30, siteId?: number) {
  return useQuery({
    queryKey: ["timeline", days, siteId ?? "all"],
    queryFn: () => api.getTimeline(days, siteId),
    refetchInterval: 30_000,
  });
}

export function useWorst() {
  return useQuery({
    queryKey: ["worst"],
    queryFn: api.getWorst,
    refetchInterval: 30_000,
  });
}

export function useCreateSite() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ url, name }: { url: string; name?: string }) =>
      api.createSite(url, name),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["sites"] });
      qc.invalidateQueries({ queryKey: ["overview"] });
    },
  });
}

export function useDeleteSite() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.deleteSite(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["sites"] });
      qc.invalidateQueries({ queryKey: ["overview"] });
    },
  });
}

export function useRunSite() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.runSite(id),
    onSuccess: (_data, id) => {
      qc.invalidateQueries({ queryKey: ["runs", id] });
      qc.invalidateQueries({ queryKey: ["overview"] });
    },
  });
}

export function useDeleteRun(siteId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (runId: number) => api.deleteRun(runId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["runs", siteId] });
      qc.invalidateQueries({ queryKey: ["overview"] });
    },
  });
}

export function useRunResources(runId: number | null) {
  return useQuery({
    queryKey: ["run-resources", runId],
    queryFn: () => api.getRunResources(runId!),
    enabled: runId != null,
  });
}

export function useConfig() {
  return useQuery({
    queryKey: ["config"],
    queryFn: api.getConfig,
    staleTime: 5 * 60 * 1000, // cache de 5 min — não muda durante a sessão
  });
}

export function useCompareRuns(a: number | null, b: number | null) {
  return useQuery({
    queryKey: ["compare", a, b],
    queryFn: () => api.compareRuns(a!, b!),
    enabled: a != null && b != null && a !== b,
  });
}

export function useRunScreenshots(runId: number | null) {
  return useQuery({
    queryKey: ["run-screenshots", runId],
    queryFn: () => api.getRunScreenshots(runId!),
    enabled: runId != null,
  });
}

export function useRunWaterfall(runId: number | null) {
  return useQuery({
    queryKey: ["run-waterfall", runId],
    queryFn: () => api.getRunWaterfall(runId!),
    enabled: runId != null,
  });
}

export function useRunSeoScore(runId: number | null) {
  return useQuery({
    queryKey: ["run-seo-score", runId],
    queryFn: () => api.getRunSeoScore(runId!),
    enabled: runId != null,
  });
}

export function useRunSeoTechnical(runId: number | null) {
  return useQuery({
    queryKey: ["run-seo-technical", runId],
    queryFn: () => api.getRunSeoTechnical(runId!),
    enabled: runId != null,
  });
}

export function useAllSeoScores() {
  return useQuery({
    queryKey: ["seo-scores"],
    queryFn: api.getAllSeoScores,
    refetchInterval: 10_000,
  });
}

export function useRunPages(runId: number | null) {
  return useQuery({
    queryKey: ["run-pages", runId],
    queryFn: () => api.listRunPages(runId!),
    enabled: runId != null,
  });
}

export function useRunInfra(runId: number | null) {
  return useQuery({
    queryKey: ["run-infra", runId],
    queryFn: () => api.getRunInfra(runId!),
    enabled: runId != null,
  });
}
