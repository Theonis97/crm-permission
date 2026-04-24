-- Stock de packs déjà assemblés (prêts à la vente), distinct du calcul « combien on peut encore assembler ».
ALTER TABLE "store_packs" ADD COLUMN "assembled_stock" INTEGER NOT NULL DEFAULT 0;
