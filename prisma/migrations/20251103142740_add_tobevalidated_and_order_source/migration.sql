-- AlterEnum
ALTER TYPE "OrderStatus" ADD VALUE 'TOBEVALIDATED';

-- AlterTable
ALTER TABLE "store_orders" ADD COLUMN     "order_source" TEXT;
