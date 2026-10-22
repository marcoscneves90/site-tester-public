CREATE TABLE IF NOT EXISTS sites (
  id          SERIAL PRIMARY KEY,
  url         TEXT NOT NULL,
  name        TEXT,
  active      BOOLEAN DEFAULT true,
  created_at  TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS runs (
  id              SERIAL PRIMARY KEY,
  site_id         INT REFERENCES sites(id) ON DELETE CASCADE,
  status          TEXT NOT NULL DEFAULT 'queued',
  started_at      TIMESTAMPTZ,
  finished_at     TIMESTAMPTZ,
  error           TEXT,

  performance     INT,
  accessibility   INT,
  best_practices  INT,
  seo             INT,
  lcp_ms          INT,
  fcp_ms          INT,
  cls             NUMERIC(6,4),
  tbt_ms          INT,
  ttfb_ms         INT,
  speed_index_ms  INT,

  raw_report      JSONB
);

CREATE INDEX IF NOT EXISTS idx_runs_site_started ON runs(site_id, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_runs_status ON runs(status);
