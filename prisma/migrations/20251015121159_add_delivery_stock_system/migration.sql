-- CreateEnum
CREATE TYPE "DeliveryStockMovementType" AS ENUM ('SUPPLY', 'SALE', 'RETURN', 'ADJUSTMENT');

-- CreateTable
CREATE TABLE "delivery_person_stocks" (
    "id" TEXT NOT NULL,
    "delivery_person_id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "variant_id" TEXT,
    "quantity" INTEGER NOT NULL DEFAULT 0,
    "reserved" INTEGER NOT NULL DEFAULT 0,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "delivery_person_stocks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "delivery_stock_movements" (
    "id" TEXT NOT NULL,
    "delivery_person_id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "variant_id" TEXT,
    "type" "DeliveryStockMovementType" NOT NULL,
    "quantity" INTEGER NOT NULL,
    "store_order_id" TEXT,
    "notes" TEXT,
    "created_by_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "delivery_stock_movements_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "delivery_person_stocks_delivery_person_id_idx" ON "delivery_person_stocks"("delivery_person_id");

-- CreateIndex
CREATE INDEX "delivery_person_stocks_product_id_idx" ON "delivery_person_stocks"("product_id");

-- CreateIndex
CREATE UNIQUE INDEX "delivery_person_stocks_delivery_person_id_product_id_varian_key" ON "delivery_person_stocks"("delivery_person_id", "product_id", "variant_id");

-- CreateIndex
CREATE INDEX "delivery_stock_movements_delivery_person_id_idx" ON "delivery_stock_movements"("delivery_person_id");

-- CreateIndex
CREATE INDEX "delivery_stock_movements_product_id_idx" ON "delivery_stock_movements"("product_id");

-- CreateIndex
CREATE INDEX "delivery_stock_movements_type_idx" ON "delivery_stock_movements"("type");

-- CreateIndex
CREATE INDEX "delivery_stock_movements_created_at_idx" ON "delivery_stock_movements"("created_at");

-- AddForeignKey
ALTER TABLE "delivery_person_stocks" ADD CONSTRAINT "delivery_person_stocks_delivery_person_id_fkey" FOREIGN KEY ("delivery_person_id") REFERENCES "delivery_persons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "delivery_person_stocks" ADD CONSTRAINT "delivery_person_stocks_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "delivery_person_stocks" ADD CONSTRAINT "delivery_person_stocks_variant_id_fkey" FOREIGN KEY ("variant_id") REFERENCES "product_variants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "delivery_stock_movements" ADD CONSTRAINT "delivery_stock_movements_delivery_person_id_fkey" FOREIGN KEY ("delivery_person_id") REFERENCES "delivery_persons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "delivery_stock_movements" ADD CONSTRAINT "delivery_stock_movements_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "delivery_stock_movements" ADD CONSTRAINT "delivery_stock_movements_variant_id_fkey" FOREIGN KEY ("variant_id") REFERENCES "product_variants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "delivery_stock_movements" ADD CONSTRAINT "delivery_stock_movements_store_order_id_fkey" FOREIGN KEY ("store_order_id") REFERENCES "store_orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "delivery_stock_movements" ADD CONSTRAINT "delivery_stock_movements_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
