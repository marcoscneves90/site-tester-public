-- Tabela de auditorias por página (crawl)
CREATE TABLE IF NOT EXISTS page_audits (
  id              SERIAL PRIMARY KEY,
  run_id          INT NOT NULL REFERENCES runs(id) ON DELETE CASCADE,
  url             TEXT NOT NULL,
  final_url       TEXT,

  -- Status HTTP
  status_code     INT,
  response_ms     INT,
  error           TEXT,

  -- Meta tags
  title           TEXT,
  description     TEXT,
  canonical       TEXT,
  robots          TEXT,
  h1_count        INT DEFAULT 0,
  h2_count        INT DEFAULT 0,
  h3_count        INT DEFAULT 0,

  -- Open Graph / Twitter
  og_title        TEXT,
  og_description  TEXT,
  og_image        TEXT,
  twitter_card    TEXT,

  -- Structured data
  json_ld_count   INT DEFAULT 0,
  json_ld_types   TEXT[],

  -- Conteúdo
  word_count      INT,
  image_count     INT,
  images_without_alt INT,
  internal_links  INT,
  external_links  INT,

  -- Análise
  issues          JSONB,           -- array de problemas detectados
  raw_html_size   INT,

  created_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_page_audits_run ON page_audits(run_id);
CREATE INDEX IF NOT EXISTS idx_page_audits_status ON page_audits(status_code);
CREATE INDEX IF NOT EXISTS idx_page_audits_url ON page_audits(url);
