-- Adiciona coluna favicon_url na tabela sites (idempotente)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'sites' AND column_name = 'favicon_url'
  ) THEN
    ALTER TABLE sites ADD COLUMN favicon_url TEXT;
  END IF;
END$$;
