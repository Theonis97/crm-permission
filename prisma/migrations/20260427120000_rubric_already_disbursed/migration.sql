-- Indemnités déjà versées hors paie : affichées sur le bulletin, exclues du net à payer
ALTER TABLE "payroll_rubrics" ADD COLUMN "is_already_disbursed" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "payroll_rubric_lines" ADD COLUMN "is_already_disbursed" BOOLEAN NOT NULL DEFAULT false;
