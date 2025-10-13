-- AlterTable
ALTER TABLE "stores" ADD COLUMN     "manager_id" TEXT;

-- AddForeignKey
ALTER TABLE "stores" ADD CONSTRAINT "stores_manager_id_fkey" FOREIGN KEY ("manager_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
