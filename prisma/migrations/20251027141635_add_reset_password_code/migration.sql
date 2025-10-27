-- AlterTable
ALTER TABLE "delivery_persons" ADD COLUMN     "reset_password_code" TEXT,
ADD COLUMN     "reset_password_code_expiry" TIMESTAMP(3);
