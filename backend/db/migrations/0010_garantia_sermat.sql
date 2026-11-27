-- Todas las Sermat tienen 18 meses de garantía; el resto de las marcas, 12 (Mateo, 2026-11-27).
-- Solo pasa a 18 las que tienen el valor por defecto: si el admin cambió alguna, no se toca.
UPDATE "productos" SET "garantia_meses" = 18
WHERE "garantia_meses" = 12
  AND "marca_id" IN (SELECT "id" FROM "marcas" WHERE lower("nombre") = 'sermat');--> statement-breakpoint

-- 12x95 y 12x100 pasan a venir en caja alta y baja, como 12x90 y 12x110 (Mateo, 2026-11-27).
-- Las que ya estaban cargadas sin altura van como las rehace el scraper: 12x95 baja (código BD
-- de Sermat) y 12x100 alta (Herbo). Después se revisan desde el panel.
INSERT INTO "medidas" ("codigo", "orden") VALUES
  ('12x95 baja', 120), ('12x95 alta', 121), ('12x100 baja', 130), ('12x100 alta', 131)
ON CONFLICT ("codigo") DO NOTHING;--> statement-breakpoint
INSERT INTO "vehiculo_medidas" ("vehiculo_id", "medida")
  SELECT "vehiculo_id", CASE "medida" WHEN '12x95' THEN '12x95 baja' ELSE '12x100 alta' END
  FROM "vehiculo_medidas" WHERE "medida" IN ('12x95', '12x100')
ON CONFLICT DO NOTHING;--> statement-breakpoint
DELETE FROM "vehiculo_medidas" WHERE "medida" IN ('12x95', '12x100');--> statement-breakpoint
UPDATE "productos" SET "medida" = '12x95 baja' WHERE "medida" = '12x95';--> statement-breakpoint
UPDATE "productos" SET "medida" = '12x100 alta' WHERE "medida" = '12x100';--> statement-breakpoint
DELETE FROM "medidas" WHERE "codigo" IN ('12x95', '12x100');
