-- AlterEnum
ALTER TYPE "OrderStatus" ADD VALUE 'REPORTED';

-- AlterTable
ALTER TABLE "delivery_persons" ADD COLUMN     "reset_password_token" TEXT,
ADD COLUMN     "reset_password_token_expiry" TIMESTAMP(3);
