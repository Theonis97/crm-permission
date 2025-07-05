-- DropIndex
DROP INDEX "product_categories_name_key";

-- AlterTable
ALTER TABLE "product_categories" ADD COLUMN     "parent_id" TEXT;

-- AlterTable
ALTER TABLE "tasks" ADD COLUMN     "startDate" TIMESTAMP(3);

-- AddForeignKey
ALTER TABLE "product_categories" ADD CONSTRAINT "product_categories_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "product_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;
