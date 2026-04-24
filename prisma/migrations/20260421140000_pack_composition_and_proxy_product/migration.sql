-- Empreinte de composition pour fusionner les packs identiques (même magasin).
ALTER TABLE "store_packs" ADD COLUMN IF NOT EXISTS "composition_hash" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "store_packs_store_id_composition_hash_key"
ON "store_packs" ("store_id", "composition_hash")
WHERE "composition_hash" IS NOT NULL;

-- Produit « proxy » 1:1 avec le pack : visible à la caisse (store_products), vente = décrément stock comme un produit.
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "linked_store_pack_id" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "products_linked_store_pack_id_key" ON "products" ("linked_store_pack_id");

ALTER TABLE "products" DROP CONSTRAINT IF EXISTS "products_linked_store_pack_id_fkey";

ALTER TABLE "products" ADD CONSTRAINT "products_linked_store_pack_id_fkey"
  FOREIGN KEY ("linked_store_pack_id") REFERENCES "store_packs" ("id") ON DELETE CASCADE ON UPDATE CASCADE;
