-- CreateTable
CREATE TABLE "day_shifts" (
    "id" TEXT NOT NULL,
    "delivery_person_id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "commission" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "total_orders" INTEGER NOT NULL DEFAULT 0,
    "delivered_orders" INTEGER NOT NULL DEFAULT 0,
    "cancelled_orders" INTEGER NOT NULL DEFAULT 0,
    "reported_orders" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "day_shifts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "day_shifts_delivery_person_id_idx" ON "day_shifts"("delivery_person_id");

-- CreateIndex
CREATE INDEX "day_shifts_date_idx" ON "day_shifts"("date");

-- CreateIndex
CREATE UNIQUE INDEX "day_shifts_delivery_person_id_date_key" ON "day_shifts"("delivery_person_id", "date");

-- AddForeignKey
ALTER TABLE "day_shifts" ADD CONSTRAINT "day_shifts_delivery_person_id_fkey" FOREIGN KEY ("delivery_person_id") REFERENCES "delivery_persons"("id") ON DELETE CASCADE ON UPDATE CASCADE;
