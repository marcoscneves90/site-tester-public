export interface Site {
  id: number;
  url: string;
  name: string | null;
  active: boolean;
  created_at: string;
}

export interface Run {
  id: number;
  site_id: number;
  status: "queued" | "running" | "done" | "failed";
  started_at: string | null;
  finished_at: string | null;
  device: "desktop" | "mobile";
  error: string | null;
  performance: number | null;
  accessibility: number | null;
  best_practices: number | null;
  seo: number | null;
  seo_score: number | null;
  seo_subscores: any | null;
  lcp_ms: number | null;
  fcp_ms: number | null;
  cls: string | null;
  tbt_ms: number | null;
  ttfb_ms: number | null;
  speed_index_ms: number | null;
}

export interface LighthouseAudit {
  id: string;
  title: string;
  description?: string;
  score: number | null;
  scoreDisplayMode?: string;
  displayValue?: string;
  numericValue?: number;
}

export interface LighthouseAuditRef {
  id: string;
  weight?: number;
  group?: string;
}

export interface LighthouseCategory {
  id: string;
  title: string;
  score: number | null;
  auditRefs?: LighthouseAuditRef[];
}

export interface LighthouseRaw {
  lighthouseVersion?: string;
  fetchTime?: string;
  audits?: Record<string, LighthouseAudit>;
  categories?: Record<string, LighthouseCategory>;
}

export interface RunWithRaw extends Run {
  raw_report: LighthouseRaw | null;
}

export interface Overview {
  totalSites: number;
  totalRuns: number;
  runsToday: number;
  runsWeek: number;
  avgPerformance: number | null;
  avgAccessibility: number | null;
  avgSeo: number | null;
  lastRunAt: string | null;
}

export interface TimelinePoint {
  siteId: number;
  siteName: string;
  siteUrl: string;
  day: string;
  performance: number;
  lcp: number | null;
  runs: number;
}

export interface WorstSite {
  id: number;
  name: string | null;
  url: string;
  performance: number | null;
  lcp_ms: number | null;
  finished_at: string | null;
}


export interface ResourceSummaryItem {
  type: string;
  label: string;
  count: number;
  bytes: number;
}

export interface ResourceRequest {
  url: string;
  fileName: string;
  domain: string;
  type: string;
  thirdParty: boolean;
  transferBytes: number;
  resourceBytes: number;
  durationMs: number | null;
  statusCode: number | null;
  mimeType: string | null;
}

export interface RunResources {
  summary: ResourceSummaryItem[];
  topRequests: ResourceRequest[];
  totalBytes: number;
  totalRequests: number;
  thirdPartyCount: number;
}

export interface AppConfig {
  userName: string | null;
  publicUrl: string | null;
}


export interface RunSummary {
  id: number;
  finished_at: string | null;
  performance: number | null;
  accessibility: number | null;
  best_practices: number | null;
  seo: number | null;
  lcp_ms: number | null;
  fcp_ms: number | null;
  cls: string | null;
  tbt_ms: number | null;
  ttfb_ms: number | null;
  speed_index_ms: number | null;
}

export interface CompareDeltas {
  performance: number | null;
  accessibility: number | null;
  best_practices: number | null;
  seo: number | null;
  lcp_ms: number | null;
  fcp_ms: number | null;
  cls: number | null;
  tbt_ms: number | null;
  ttfb_ms: number | null;
  speed_index_ms: number | null;
}

export interface ComparedResource {
  url: string;
  fileName: string;
  domain: string;
  type: string;
  thirdParty: boolean;
  transferBytes: number;
  durationMs: number | null;
  previousBytes?: number;
  deltaBytes?: number;
  deltaPct?: number;
}

export interface ComparedOpportunity {
  id: string;
  title: string;
  displayValue: string | null;
  score: number | null;
  description: string;
}

export interface CompareResult {
  a: RunSummary;
  b: RunSummary;
  deltas: CompareDeltas;
  resourcesDiff: {
    added: ComparedResource[];
    removed: ComparedResource[];
    grown: ComparedResource[];
    totals: {
      addedBytes: number;
      removedBytes: number;
      grownBytes: number;
      addedCount: number;
      removedCount: number;
      grownCount: number;
    };
  };
  opportunitiesDiff: {
    new: ComparedOpportunity[];
    resolved: ComparedOpportunity[];
  };
}

export interface ScreenshotFrame {
  data: string;
  timing: number | null;
  width: number | null;
  height: number | null;
}

export interface FinalScreenshot {
  data: string;
  width: number | null;
  height: number | null;
}

export interface RunScreenshots {
  final: FinalScreenshot | null;
  filmstrip: ScreenshotFrame[];
  totalDurationMs: number | null;
}

export interface WaterfallPhase {
  dnsMs: number;
  tcpMs: number;
  sslMs: number;
  ttfbMs: number;
  downloadMs: number;
}

export interface WaterfallResource {
  url: string;
  fileName: string;
  domain: string;
  type: string;
  thirdParty: boolean;
  startMs: number;
  endMs: number;
  durationMs: number;
  transferBytes: number;
  statusCode: number | null;
  phases: WaterfallPhase;
}

export interface WaterfallData {
  totalDurationMs: number;
  resources: WaterfallResource[];
}

export interface SeoCheck {
  name: string;
  ok: boolean;
  detail: string;
}

export interface SeoSubscores {
  technical: number;
  content: number;
  structure: number;
  performance: number;
  accessibility: number;
}

export interface SeoScore {
  overall: number;
  subscores: SeoSubscores;
  details: {
    technical: SeoCheck[];
    content: SeoCheck[];
    structure: SeoCheck[];
  };
}

export interface MetaTag {
  tag: string;
  present: boolean;
  value: string | null;
}

export interface JsonLdBlock {
  index: number;
  valid: boolean;
  types: string[];
  preview: string;
}

export interface SeoTechnicalData {
  summary: {
    openGraphScore: number;
    twitterScore: number;
    canonicalOk: boolean;
    indexable: boolean;
    hreflangCount: number;
    jsonLdCount: number;
    jsonLdValid: number;
    hasOgImage: boolean;
    hasTwitterCard: boolean;
  };
  openGraph: MetaTag[];
  twitterCards: MetaTag[];
  canonical: string | null;
  robots: {
    value: string | null;
    noindex: boolean;
    nofollow: boolean;
  };
  hreflang: { lang: string; url: string }[];
  jsonLd: JsonLdBlock[];
  serpPreview: {
    title: string;
    description: string;
    url: string;
    siteName: string | null;
  };
}


export interface SiteSeoScore {
  siteId: number;
  score: number;
  subscores: {
    technical: number;
    content: number;
    structure: number;
    performance: number;
    accessibility: number;
  } | null;
  finishedAt: string | null;
}

export interface PageIssue {
  code: string;
  severity: "error" | "warning" | "info";
  message: string;
}

export interface PageAudit {
  id: number;
  url: string;
  final_url: string | null;
  status_code: number | null;
  response_ms: number | null;
  error: string | null;
  title: string | null;
  description: string | null;
  canonical: string | null;
  robots: string | null;
  h1_count: number;
  h2_count: number;
  h3_count: number;
  og_title: string | null;
  og_description: string | null;
  og_image: string | null;
  twitter_card: string | null;
  json_ld_count: number;
  json_ld_types: string[] | null;
  word_count: number | null;
  image_count: number | null;
  images_without_alt: number | null;
  internal_links: number | null;
  external_links: number | null;
  issues: PageIssue[] | null;
  raw_html_size: number | null;
  created_at: string;
}


export interface DetectedTech {
  name: string;
  category: string;
  confidence: "high" | "medium" | "low";
  version?: string;
}

export interface CompressionInfo {
  encoding: string;
  status: "brotli" | "gzip" | "deflate" | "none";
  score: number;
  hasBrotli: boolean;
  hasGzip: boolean;
  hasDeflate: boolean;
  recommendation: string;
}

export interface InfraData {
  technologies: DetectedTech[];
  compression: CompressionInfo;
  imageAnalysis: {
    total: number;
    modernFormat: number;
    lazyLoading: number;
    withDimensions: number;
    withAlt: number;
    score: number;
    recommendation: string;
  };
  fontAnalysis: {
    usesGoogleFonts: boolean;
    localFontsCount: number;
    hasFontDisplay: boolean;
    hasFontPreload: boolean;
    hasWoff2: boolean;
    score: number;
    recommendation: string;
  };
  infraScore: number;
  headers: {
    server: string | null;
    poweredBy: string | null;
  };
  finalUrl: string;
}
