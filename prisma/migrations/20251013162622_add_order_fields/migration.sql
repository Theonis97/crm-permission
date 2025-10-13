/*
  Warnings:

  - You are about to drop the column `discount` on the `order_items` table. All the data in the column will be lost.
  - You are about to drop the column `quantity` on the `order_items` table. All the data in the column will be lost.
  - You are about to drop the column `tax_rate` on the `order_items` table. All the data in the column will be lost.
  - You are about to drop the column `unit_price` on the `order_items` table. All the data in the column will be lost.
  - You are about to drop the column `variant_attributes` on the `order_items` table. All the data in the column will be lost.
  - You are about to drop the column `variant_id` on the `order_items` table. All the data in the column will be lost.
  - You are about to drop the column `variant_name` on the `order_items` table. All the data in the column will be lost.
  - You are about to drop the column `cancel_reason` on the `orders` table. All the data in the column will be lost.
  - You are about to drop the column `contact_id` on the `orders` table. All the data in the column will be lost.
  - You are about to drop the column `created_by_id` on the `orders` table. All the data in the column will be lost.
  - You are about to drop the column `customer_email` on the `orders` table. All the data in the column will be lost.
  - You are about to drop the column `customer_name` on the `orders` table. All the data in the column will be lost.
  - You are about to drop the column `customer_phone` on the `orders` table. All the data in the column will be lost.
  - You are about to drop the column `delivery_address` on the `orders` table. All the data in the column will be lost.
  - You are about to drop the column `delivery_fee` on the `orders` table. All the data in the column will be lost.
  - You are about to drop the column `delivery_latitude` on the `orders` table. All the data in the column will be lost.
  - You are about to drop the column `delivery_longitude` on the `orders` table. All the data in the column will be lost.
  - You are about to drop the column `delivery_person_id` on the `orders` table. All the data in the column will be lost.
  - You are about to drop the column `delivery_zone_id` on the `orders` table. All the data in the column will be lost.
  - You are about to drop the column `estimated_delivery` on the `orders` table. All the data in the column will be lost.
  - You are about to drop the column `paid_at` on the `orders` table. All the data in the column will be lost.
  - You are about to drop the column `payment_method` on the `orders` table. All the data in the column will be lost.
  - You are about to drop the column `payment_status` on the `orders` table. All the data in the column will be lost.
  - You are about to drop the column `subtotal` on the `orders` table. All the data in the column will be lost.
  - You are about to drop the column `total` on the `orders` table. All the data in the column will be lost.
  - You are about to drop the column `total_discount` on the `orders` table. All the data in the column will be lost.
  - You are about to drop the column `total_tax` on the `orders` table. All the data in the column will be lost.
  - The `status` column on the `orders` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to drop the column `order_id` on the `whatsapp_messages` table. All the data in the column will be lost.
  - You are about to drop the `restocking_order_items` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `restocking_orders` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `requested_quantity` to the `order_items` table without a default value. This is not possible if the table is not empty.
  - Added the required column `unit_cost` to the `order_items` table without a default value. This is not possible if the table is not empty.
  - Added the required column `requested_by` to the `orders` table without a default value. This is not possible if the table is not empty.

*/
-- CreateTable for store_orders first (to migrate existing order data)
CREATE TABLE "store_orders" (
    "id" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "store_id" TEXT NOT NULL,
    "contact_id" TEXT,
    "customer_name" TEXT NOT NULL,
    "customer_phone" TEXT NOT NULL,
    "customer_email" TEXT,
    "delivery_address" TEXT,
    "delivery_latitude" DOUBLE PRECISION,
    "delivery_longitude" DOUBLE PRECISION,
    "status" "OrderStatus" NOT NULL DEFAULT 'PENDING',
    "priority" "OrderPriority" NOT NULL DEFAULT 'NORMAL',
    "subtotal" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "total_discount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "total_tax" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "delivery_fee" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "total" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "payment_method" "PaymentMethod" NOT NULL DEFAULT 'CASH',
    "payment_status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "paid_at" TIMESTAMP(3),
    "delivery_person_id" TEXT,
    "delivery_zone_id" TEXT,
    "estimated_delivery" TIMESTAMP(3),
    "delivered_at" TIMESTAMP(3),
    "notes" TEXT,
    "cancel_reason" TEXT,
    "created_by_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "store_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable for store_order_items
CREATE TABLE "store_order_items" (
    "id" TEXT NOT NULL,
    "store_order_id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "variant_id" TEXT,
    "name" TEXT NOT NULL,
    "sku" TEXT,
    "variant_name" TEXT,
    "variant_attributes" JSONB,
    "quantity" INTEGER NOT NULL,
    "unit_price" DOUBLE PRECISION NOT NULL,
    "discount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "tax_rate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "total" DOUBLE PRECISION NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "store_order_items_pkey" PRIMARY KEY ("id")
);

-- Migrate existing orders data to store_orders
INSERT INTO "store_orders" (
    id, number, store_id, contact_id, customer_name, customer_phone, customer_email,
    delivery_address, delivery_latitude, delivery_longitude, status, priority,
    subtotal, total_discount, total_tax, delivery_fee, total, payment_method,
    payment_status, paid_at, delivery_person_id, delivery_zone_id, estimated_delivery,
    delivered_at, notes, cancel_reason, created_by_id, created_at, updated_at
)
SELECT 
    id, number, store_id, contact_id, customer_name, customer_phone, customer_email,
    delivery_address, delivery_latitude, delivery_longitude, status, priority,
    subtotal, total_discount, total_tax, delivery_fee, total, payment_method,
    payment_status, paid_at, delivery_person_id, delivery_zone_id, estimated_delivery,
    delivered_at, notes, cancel_reason, created_by_id, created_at, updated_at
FROM "orders";

-- Migrate existing order_items data to store_order_items
INSERT INTO "store_order_items" (
    id, store_order_id, product_id, variant_id, name, sku, variant_name,
    variant_attributes, quantity, unit_price, discount, tax_rate, total, created_at
)
SELECT 
    id, order_id, product_id, variant_id, name, sku, variant_name,
    variant_attributes, quantity, unit_price, discount, tax_rate, total, created_at
FROM "order_items";

-- Update whatsapp_messages references
ALTER TABLE "whatsapp_messages" RENAME COLUMN "order_id" TO "store_order_id";

-- Now drop old foreign keys
ALTER TABLE "order_items" DROP CONSTRAINT IF EXISTS "order_items_order_id_fkey";
ALTER TABLE "order_items" DROP CONSTRAINT IF EXISTS "order_items_variant_id_fkey";
ALTER TABLE "orders" DROP CONSTRAINT IF EXISTS "orders_contact_id_fkey";
ALTER TABLE "orders" DROP CONSTRAINT IF EXISTS "orders_created_by_id_fkey";
ALTER TABLE "orders" DROP CONSTRAINT IF EXISTS "orders_delivery_person_id_fkey";
ALTER TABLE "orders" DROP CONSTRAINT IF EXISTS "orders_delivery_zone_id_fkey";
ALTER TABLE "whatsapp_messages" DROP CONSTRAINT IF EXISTS "whatsapp_messages_order_id_fkey";

-- Drop restocking tables if they exist
DROP TABLE IF EXISTS "restocking_order_items";
DROP TABLE IF EXISTS "restocking_orders";

-- Clear existing orders and order_items tables
DELETE FROM "order_items";
DELETE FROM "orders";

-- Now modify order_items structure
ALTER TABLE "order_items" 
DROP COLUMN IF EXISTS "discount",
DROP COLUMN IF EXISTS "quantity",
DROP COLUMN IF EXISTS "tax_rate",
DROP COLUMN IF EXISTS "unit_price",
DROP COLUMN IF EXISTS "variant_attributes",
DROP COLUMN IF EXISTS "variant_id",
DROP COLUMN IF EXISTS "variant_name",
ADD COLUMN "approved_quantity" INTEGER,
ADD COLUMN "requested_quantity" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "unit_cost" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- Modify orders structure
ALTER TABLE "orders" 
DROP COLUMN IF EXISTS "cancel_reason",
DROP COLUMN IF EXISTS "contact_id",
DROP COLUMN IF EXISTS "created_by_id",
DROP COLUMN IF EXISTS "customer_email",
DROP COLUMN IF EXISTS "customer_name",
DROP COLUMN IF EXISTS "customer_phone",
DROP COLUMN IF EXISTS "delivery_address",
DROP COLUMN IF EXISTS "delivery_fee",
DROP COLUMN IF EXISTS "delivery_latitude",
DROP COLUMN IF EXISTS "delivery_longitude",
DROP COLUMN IF EXISTS "delivery_person_id",
DROP COLUMN IF EXISTS "delivery_zone_id",
DROP COLUMN IF EXISTS "estimated_delivery",
DROP COLUMN IF EXISTS "paid_at",
DROP COLUMN IF EXISTS "payment_method",
DROP COLUMN IF EXISTS "payment_status",
DROP COLUMN IF EXISTS "subtotal",
DROP COLUMN IF EXISTS "total",
DROP COLUMN IF EXISTS "total_discount",
DROP COLUMN IF EXISTS "total_tax",
ADD COLUMN "approved_at" TIMESTAMP(3),
ADD COLUMN "approved_by" TEXT,
ADD COLUMN "rejection_reason" TEXT,
ADD COLUMN "requested_by" TEXT,
ADD COLUMN "total_cost" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN "total_quantity" INTEGER NOT NULL DEFAULT 0,
DROP COLUMN IF EXISTS "status",
ADD COLUMN "status" "RestockingOrderStatus" NOT NULL DEFAULT 'PENDING';

-- Make requested_by NOT NULL after adding default
UPDATE "orders" SET "requested_by" = (SELECT id FROM "users" LIMIT 1) WHERE "requested_by" IS NULL;
ALTER TABLE "orders" ALTER COLUMN "requested_by" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "store_orders_number_key" ON "store_orders"("number");

-- CreateIndex
CREATE INDEX "orders_store_id_idx" ON "orders"("store_id");

-- CreateIndex
CREATE INDEX "orders_status_idx" ON "orders"("status");

-- AddForeignKey
ALTER TABLE "store_orders" ADD CONSTRAINT "store_orders_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "stores"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "store_orders" ADD CONSTRAINT "store_orders_contact_id_fkey" FOREIGN KEY ("contact_id") REFERENCES "contacts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "store_orders" ADD CONSTRAINT "store_orders_delivery_person_id_fkey" FOREIGN KEY ("delivery_person_id") REFERENCES "delivery_persons"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "store_orders" ADD CONSTRAINT "store_orders_delivery_zone_id_fkey" FOREIGN KEY ("delivery_zone_id") REFERENCES "delivery_zones"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "store_orders" ADD CONSTRAINT "store_orders_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "store_order_items" ADD CONSTRAINT "store_order_items_store_order_id_fkey" FOREIGN KEY ("store_order_id") REFERENCES "store_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "store_order_items" ADD CONSTRAINT "store_order_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "store_order_items" ADD CONSTRAINT "store_order_items_variant_id_fkey" FOREIGN KEY ("variant_id") REFERENCES "product_variants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "whatsapp_messages" ADD CONSTRAINT "whatsapp_messages_store_order_id_fkey" FOREIGN KEY ("store_order_id") REFERENCES "store_orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_requested_by_fkey" FOREIGN KEY ("requested_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_approved_by_fkey" FOREIGN KEY ("approved_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
