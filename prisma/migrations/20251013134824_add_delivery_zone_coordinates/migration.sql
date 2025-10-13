/*
  Warnings:

  - You are about to drop the column `latitude` on the `delivery_zones` table. All the data in the column will be lost.
  - You are about to drop the column `longitude` on the `delivery_zones` table. All the data in the column will be lost.
  - Added the required column `coordinates` to the `delivery_zones` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "delivery_zones" DROP COLUMN "latitude",
DROP COLUMN "longitude",
ADD COLUMN     "center_latitude" DOUBLE PRECISION,
ADD COLUMN     "center_longitude" DOUBLE PRECISION,
ADD COLUMN     "coordinates" JSONB NOT NULL,
ADD COLUMN     "delivery_person_id" TEXT,
ADD COLUMN     "estimated_time" INTEGER;

-- AddForeignKey
ALTER TABLE "delivery_zones" ADD CONSTRAINT "delivery_zones_delivery_person_id_fkey" FOREIGN KEY ("delivery_person_id") REFERENCES "delivery_persons"("id") ON DELETE SET NULL ON UPDATE CASCADE;
