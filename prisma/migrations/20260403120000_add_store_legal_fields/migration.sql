-- Informations juridiques sur les magasins (RCCM, NIF, CNSS, etc.)
ALTER TABLE "stores" ADD COLUMN "forme_juridique" TEXT;
ALTER TABLE "stores" ADD COLUMN "rccm" TEXT;
ALTER TABLE "stores" ADD COLUMN "nif" TEXT;
ALTER TABLE "stores" ADD COLUMN "cnss_employeur" TEXT;
ALTER TABLE "stores" ADD COLUMN "cnss_patronale" TEXT;
ALTER TABLE "stores" ADD COLUMN "siege_social" TEXT;
ALTER TABLE "stores" ADD COLUMN "date_creation" TIMESTAMP(3);
