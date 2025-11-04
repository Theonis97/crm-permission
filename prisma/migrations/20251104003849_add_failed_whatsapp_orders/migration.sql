-- CreateTable
CREATE TABLE "failed_whatsapp_orders" (
    "id" TEXT NOT NULL,
    "rawMessage" TEXT NOT NULL,
    "sender_id" TEXT,
    "sender_phone" TEXT,
    "timestamp" TIMESTAMP(3),
    "customer_name" TEXT,
    "customer_phone" TEXT,
    "delivery_address" TEXT,
    "total_amount" DOUBLE PRECISION,
    "requested_products" JSONB NOT NULL,
    "error_type" TEXT NOT NULL,
    "error_details" TEXT NOT NULL,
    "missing_products" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "resolved_at" TIMESTAMP(3),
    "resolved_by" TEXT,
    "resolved_order_id" TEXT,
    "resolution_notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "failed_whatsapp_orders_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "failed_whatsapp_orders_status_idx" ON "failed_whatsapp_orders"("status");

-- CreateIndex
CREATE INDEX "failed_whatsapp_orders_customer_phone_idx" ON "failed_whatsapp_orders"("customer_phone");

-- CreateIndex
CREATE INDEX "failed_whatsapp_orders_created_at_idx" ON "failed_whatsapp_orders"("created_at");

-- AddForeignKey
ALTER TABLE "failed_whatsapp_orders" ADD CONSTRAINT "failed_whatsapp_orders_resolved_by_fkey" FOREIGN KEY ("resolved_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
