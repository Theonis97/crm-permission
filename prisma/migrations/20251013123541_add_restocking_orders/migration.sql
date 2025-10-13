-- CreateEnum
CREATE TYPE "RestockingOrderStatus" AS ENUM ('PENDING', 'APPROVED', 'PREPARING', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'REJECTED');

-- CreateTable
CREATE TABLE "restocking_orders" (
    "id" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "store_id" TEXT NOT NULL,
    "status" "RestockingOrderStatus" NOT NULL DEFAULT 'PENDING',
    "priority" "OrderPriority" NOT NULL DEFAULT 'NORMAL',
    "total_quantity" INTEGER NOT NULL DEFAULT 0,
    "total_cost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "notes" TEXT,
    "requested_by" TEXT NOT NULL,
    "approved_by" TEXT,
    "approved_at" TIMESTAMP(3),
    "delivered_at" TIMESTAMP(3),
    "rejection_reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "restocking_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "restocking_order_items" (
    "id" TEXT NOT NULL,
    "restocking_order_id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sku" TEXT,
    "requested_quantity" INTEGER NOT NULL,
    "approved_quantity" INTEGER,
    "unit_cost" DOUBLE PRECISION NOT NULL,
    "total" DOUBLE PRECISION NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "restocking_order_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "restocking_orders_number_key" ON "restocking_orders"("number");

-- CreateIndex
CREATE INDEX "restocking_orders_store_id_idx" ON "restocking_orders"("store_id");

-- CreateIndex
CREATE INDEX "restocking_orders_status_idx" ON "restocking_orders"("status");

-- AddForeignKey
ALTER TABLE "restocking_orders" ADD CONSTRAINT "restocking_orders_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "stores"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "restocking_orders" ADD CONSTRAINT "restocking_orders_requested_by_fkey" FOREIGN KEY ("requested_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "restocking_orders" ADD CONSTRAINT "restocking_orders_approved_by_fkey" FOREIGN KEY ("approved_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "restocking_order_items" ADD CONSTRAINT "restocking_order_items_restocking_order_id_fkey" FOREIGN KEY ("restocking_order_id") REFERENCES "restocking_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "restocking_order_items" ADD CONSTRAINT "restocking_order_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
