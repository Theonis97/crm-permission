/*
  Warnings:

  - A unique constraint covering the columns `[phone]` on the table `delivery_persons` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[email]` on the table `delivery_persons` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `password` to the `delivery_persons` table without a default value. This is not possible if the table is not empty.
  - Made the column `email` on table `delivery_persons` required. This step will fail if there are existing NULL values in that column.

*/

-- Étape 1: Mettre à jour les emails NULL avec un email par défaut basé sur l'ID
UPDATE "delivery_persons" 
SET "email" = CONCAT('livreur-', "id", '@temp.com')
WHERE "email" IS NULL;

-- Étape 2: Ajouter le champ password avec une valeur par défaut temporaire
-- Hash bcrypt de "password"
ALTER TABLE "delivery_persons" 
ADD COLUMN "password" TEXT DEFAULT '$2b$10$UMDs6h9vT82XQhwRKeVsau5FFuiWwsfyyvYS4KwH2HOPS9PNecuuK';

-- Étape 3: Mettre le mot de passe par défaut "password" (hashé) pour tous les enregistrements existants
UPDATE "delivery_persons" 
SET "password" = '$2b$10$UMDs6h9vT82XQhwRKeVsau5FFuiWwsfyyvYS4KwH2HOPS9PNecuuK'
WHERE "password" IS NULL;

-- Étape 4: Rendre le champ password obligatoire (NOT NULL)
ALTER TABLE "delivery_persons" 
ALTER COLUMN "password" SET NOT NULL,
ALTER COLUMN "password" DROP DEFAULT;

-- Étape 5: Rendre le champ email obligatoire
ALTER TABLE "delivery_persons" 
ALTER COLUMN "email" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "delivery_persons_phone_key" ON "delivery_persons"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "delivery_persons_email_key" ON "delivery_persons"("email");
