-- AlterTable
ALTER TABLE "order_items" ALTER COLUMN "requested_quantity" DROP DEFAULT,
ALTER COLUMN "unit_cost" DROP DEFAULT;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;
