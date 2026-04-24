-- Réintégration stock retours SAV → stock vendable magasin
ALTER TABLE "store_returned_goods_lines" ADD COLUMN IF NOT EXISTS "reintegrated_at" TIMESTAMP(3);
ALTER TABLE "store_returned_goods_lines" ADD COLUMN IF NOT EXISTS "reintegrated_by_id" TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'store_returned_goods_lines_reintegrated_by_id_fkey'
  ) THEN
    ALTER TABLE "store_returned_goods_lines"
      ADD CONSTRAINT "store_returned_goods_lines_reintegrated_by_id_fkey"
      FOREIGN KEY ("reintegrated_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "store_returned_goods_lines_store_id_reintegrated_at_idx"
  ON "store_returned_goods_lines"("store_id", "reintegrated_at");
