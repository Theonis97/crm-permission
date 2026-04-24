-- Stock tampon magasin : produits retournés SAV (hors vente directe)
CREATE TABLE "store_returned_goods_lines" (
    "id" TEXT NOT NULL,
    "store_id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "variant_id" TEXT,
    "quantity" INTEGER NOT NULL,
    "product_condition" "ProductCondition" NOT NULL,
    "product_return_id" TEXT NOT NULL,
    "product_return_item_id" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "store_returned_goods_lines_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "store_returned_goods_lines_product_return_item_id_key" ON "store_returned_goods_lines"("product_return_item_id");

CREATE INDEX "store_returned_goods_lines_store_id_idx" ON "store_returned_goods_lines"("store_id");
CREATE INDEX "store_returned_goods_lines_product_id_idx" ON "store_returned_goods_lines"("product_id");
CREATE INDEX "store_returned_goods_lines_product_return_id_idx" ON "store_returned_goods_lines"("product_return_id");
CREATE INDEX "store_returned_goods_lines_created_at_idx" ON "store_returned_goods_lines"("created_at");

ALTER TABLE "store_returned_goods_lines" ADD CONSTRAINT "store_returned_goods_lines_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "stores"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "store_returned_goods_lines" ADD CONSTRAINT "store_returned_goods_lines_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "store_returned_goods_lines" ADD CONSTRAINT "store_returned_goods_lines_variant_id_fkey" FOREIGN KEY ("variant_id") REFERENCES "product_variants"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "store_returned_goods_lines" ADD CONSTRAINT "store_returned_goods_lines_product_return_id_fkey" FOREIGN KEY ("product_return_id") REFERENCES "product_returns"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "store_returned_goods_lines" ADD CONSTRAINT "store_returned_goods_lines_product_return_item_id_fkey" FOREIGN KEY ("product_return_item_id") REFERENCES "product_return_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;
