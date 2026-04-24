-- Permet de supprimer un store_pack (et le produit proxy lié) sans erreur FK.
-- Les ventes POS créent des stock_movements et des store_order_items sur ce produit.

-- 1) Mouvements de stock : suppression en cascade avec le produit
ALTER TABLE "stock_movements" DROP CONSTRAINT IF EXISTS "stock_movements_product_id_fkey";
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_product_id_fkey"
  FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- 2) Lignes commande magasin : conserver la ligne (snapshots nom/SKU), lien produit perdu si produit supprimé
ALTER TABLE "store_order_items" DROP CONSTRAINT IF EXISTS "store_order_items_product_id_fkey";
ALTER TABLE "store_order_items" ALTER COLUMN "product_id" DROP NOT NULL;
ALTER TABLE "store_order_items" ADD CONSTRAINT "store_order_items_product_id_fkey"
  FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- 3) SAV : échange peut pointer vers le proxy pack
ALTER TABLE "product_return_items" DROP CONSTRAINT IF EXISTS "product_return_items_exchange_product_id_fkey";
ALTER TABLE "product_return_items" ADD CONSTRAINT "product_return_items_exchange_product_id_fkey"
  FOREIGN KEY ("exchange_product_id") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- 4) SAV : produit retourné (référence technique) — éviter blocage si produit proxy supprimé
ALTER TABLE "product_return_items" DROP CONSTRAINT IF EXISTS "product_return_items_product_id_fkey";
ALTER TABLE "product_return_items" ALTER COLUMN "product_id" DROP NOT NULL;
ALTER TABLE "product_return_items" ADD CONSTRAINT "product_return_items_product_id_fkey"
  FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE;
