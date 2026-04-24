-- CreateTable
CREATE TABLE "store_packs" (
    "id" TEXT NOT NULL,
    "store_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "sale_price" DOUBLE PRECISION,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "store_packs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "store_pack_items" (
    "id" TEXT NOT NULL,
    "pack_id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,

    CONSTRAINT "store_pack_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "store_packs_store_id_idx" ON "store_packs"("store_id");

-- CreateIndex
CREATE INDEX "store_pack_items_product_id_idx" ON "store_pack_items"("product_id");

-- CreateUniqueIndex
CREATE UNIQUE INDEX "store_pack_items_pack_id_product_id_key" ON "store_pack_items"("pack_id", "product_id");

-- AddForeignKey
ALTER TABLE "store_packs" ADD CONSTRAINT "store_packs_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "stores"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "store_pack_items" ADD CONSTRAINT "store_pack_items_pack_id_fkey" FOREIGN KEY ("pack_id") REFERENCES "store_packs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "store_pack_items" ADD CONSTRAINT "store_pack_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;
