ALTER TABLE "vehiculos" DROP CONSTRAINT "vehiculos_rango_anios";--> statement-breakpoint
DROP INDEX "vehiculos_unico";--> statement-breakpoint
ALTER TABLE "vehiculos" ALTER COLUMN "anio_desde" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "vehiculos" ALTER COLUMN "anio_hasta" DROP NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "vehiculos_unico" ON "vehiculos" USING btree ("marca_slug","modelo_slug",coalesce("anio_desde", 0),coalesce("anio_hasta", 0),coalesce("motor", ''));--> statement-breakpoint
ALTER TABLE "vehiculos" ADD CONSTRAINT "vehiculos_rango_anios" CHECK (("vehiculos"."anio_desde" is null and "vehiculos"."anio_hasta" is null) or ("vehiculos"."anio_desde" is not null and "vehiculos"."anio_hasta" >= "vehiculos"."anio_desde"));