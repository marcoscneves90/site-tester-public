-- Adiciona colunas de SEO score na tabela runs
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'runs' AND column_name = 'seo_score'
  ) THEN
    ALTER TABLE runs ADD COLUMN seo_score INTEGER;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'runs' AND column_name = 'seo_subscores'
  ) THEN
    ALTER TABLE runs ADD COLUMN seo_subscores JSONB;
  END IF;
END$$;

-- Índice pro endpoint em batch
CREATE INDEX IF NOT EXISTS idx_runs_seo_score ON runs(site_id, seo_score);
