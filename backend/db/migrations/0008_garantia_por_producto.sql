ALTER TABLE "productos" ADD COLUMN "garantia_meses" integer DEFAULT 12 NOT NULL;--> statement-breakpoint
ALTER TABLE "productos" ADD CONSTRAINT "productos_garantia_valida" CHECK ("productos"."garantia_meses" between 1 and 60);--> statement-breakpoint
-- Las Sermat de 12x45 a 12x75 tienen 18 meses de garantía; el resto queda en 12 (reunión 2026-11-17).
UPDATE "productos" SET "garantia_meses" = 18
WHERE "marca_id" IN (SELECT "id" FROM "marcas" WHERE lower("nombre") = 'sermat')
  AND substring("medida" from '^12x([0-9]+)')::int BETWEEN 45 AND 75;
