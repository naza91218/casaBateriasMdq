ALTER TABLE "configuracion" ADD COLUMN "dias_venc_efectivo" integer DEFAULT 7 NOT NULL;--> statement-breakpoint
-- Los pedidos en efectivo que ya estaban esperando vencen a los 7 días de creados (clarify 2026-11-02).
-- Los que ya pasaron ese plazo los cancela el worker en su próxima vuelta y devuelve el stock.
UPDATE "pedidos" SET "vence_en" = "creado_en" + interval '7 days' WHERE "estado" = 'a_pagar_en_local' AND "vence_en" IS NULL;
