-- Adiciona coluna device na tabela runs (desktop | mobile)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'runs' AND column_name = 'device'
  ) THEN
    ALTER TABLE runs ADD COLUMN device TEXT DEFAULT 'desktop';
  END IF;
END$$;

-- Backfill: runs antigas assumem desktop
UPDATE runs SET device = 'desktop' WHERE device IS NULL;

-- Índice pra acelerar comparação mobile vs desktop
CREATE INDEX IF NOT EXISTS idx_runs_site_device ON runs(site_id, device);
