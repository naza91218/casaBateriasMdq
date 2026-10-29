CREATE TYPE "public"."estado_producto" AS ENUM('a_revisar', 'activo', 'pausado', 'archivado');--> statement-breakpoint
CREATE TYPE "public"."gama" AS ENUM('economica', 'reforzada');--> statement-breakpoint
CREATE TYPE "public"."origen_foto" AS ENUM('marca', 'propia');--> statement-breakpoint
CREATE TABLE "marcas" (
	"id" uuid PRIMARY KEY NOT NULL,
	"nombre" text NOT NULL,
	"slug" text NOT NULL,
	"activa" boolean DEFAULT true NOT NULL,
	CONSTRAINT "marcas_nombre_unique" UNIQUE("nombre"),
	CONSTRAINT "marcas_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "medidas" (
	"codigo" text PRIMARY KEY NOT NULL,
	"orden" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "producto_fotos" (
	"id" uuid PRIMARY KEY NOT NULL,
	"producto_id" uuid NOT NULL,
	"clave" text NOT NULL,
	"orden" integer NOT NULL,
	"origen" "origen_foto" DEFAULT 'propia' NOT NULL,
	CONSTRAINT "producto_fotos_orden_unico" UNIQUE("producto_id","orden")
);
--> statement-breakpoint
CREATE TABLE "productos" (
	"id" uuid PRIMARY KEY NOT NULL,
	"sku" text NOT NULL,
	"slug" text NOT NULL,
	"nombre" text NOT NULL,
	"marca_id" uuid NOT NULL,
	"medida" text NOT NULL,
	"amperaje_ah" integer NOT NULL,
	"cca" integer,
	"gama" "gama" NOT NULL,
	"descripcion" text DEFAULT '' NOT NULL,
	"precio_lista" bigint DEFAULT 0 NOT NULL,
	"stock" integer DEFAULT 0 NOT NULL,
	"estado" "estado_producto" DEFAULT 'a_revisar' NOT NULL,
	"fuente" text DEFAULT 'manual' NOT NULL,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL,
	"actualizado_en" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "productos_sku_unique" UNIQUE("sku"),
	CONSTRAINT "productos_slug_unique" UNIQUE("slug"),
	CONSTRAINT "productos_stock_no_negativo" CHECK ("productos"."stock" >= 0),
	CONSTRAINT "productos_amperaje_positivo" CHECK ("productos"."amperaje_ah" > 0)
);
--> statement-breakpoint
CREATE TABLE "vehiculo_medidas" (
	"vehiculo_id" uuid NOT NULL,
	"medida" text NOT NULL,
	CONSTRAINT "vehiculo_medidas_vehiculo_id_medida_pk" PRIMARY KEY("vehiculo_id","medida")
);
--> statement-breakpoint
CREATE TABLE "vehiculos" (
	"id" uuid PRIMARY KEY NOT NULL,
	"marca" text NOT NULL,
	"marca_slug" text NOT NULL,
	"modelo" text NOT NULL,
	"modelo_slug" text NOT NULL,
	"anio_desde" smallint NOT NULL,
	"anio_hasta" smallint NOT NULL,
	"motor" text,
	"fuente" text DEFAULT 'manual' NOT NULL,
	CONSTRAINT "vehiculos_rango_anios" CHECK ("vehiculos"."anio_hasta" >= "vehiculos"."anio_desde")
);
--> statement-breakpoint
ALTER TABLE "producto_fotos" ADD CONSTRAINT "producto_fotos_producto_id_productos_id_fk" FOREIGN KEY ("producto_id") REFERENCES "public"."productos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "productos" ADD CONSTRAINT "productos_marca_id_marcas_id_fk" FOREIGN KEY ("marca_id") REFERENCES "public"."marcas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "productos" ADD CONSTRAINT "productos_medida_medidas_codigo_fk" FOREIGN KEY ("medida") REFERENCES "public"."medidas"("codigo") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vehiculo_medidas" ADD CONSTRAINT "vehiculo_medidas_vehiculo_id_vehiculos_id_fk" FOREIGN KEY ("vehiculo_id") REFERENCES "public"."vehiculos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vehiculo_medidas" ADD CONSTRAINT "vehiculo_medidas_medida_medidas_codigo_fk" FOREIGN KEY ("medida") REFERENCES "public"."medidas"("codigo") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "productos_estado_medida_idx" ON "productos" USING btree ("estado","medida");--> statement-breakpoint
CREATE INDEX "productos_estado_marca_gama_idx" ON "productos" USING btree ("estado","marca_id","gama");--> statement-breakpoint
CREATE INDEX "vehiculo_medidas_medida_idx" ON "vehiculo_medidas" USING btree ("medida");--> statement-breakpoint
CREATE UNIQUE INDEX "vehiculos_unico" ON "vehiculos" USING btree ("marca_slug","modelo_slug","anio_desde","anio_hasta",coalesce("motor", ''));--> statement-breakpoint
CREATE INDEX "vehiculos_marca_modelo_idx" ON "vehiculos" USING btree ("marca_slug","modelo_slug");