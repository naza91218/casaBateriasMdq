CREATE TYPE "public"."tipo_importacion" AS ENUM('productos', 'compatibilidades');--> statement-breakpoint
CREATE TABLE "importaciones" (
	"id" uuid PRIMARY KEY NOT NULL,
	"tipo" "tipo_importacion" NOT NULL,
	"archivo" text NOT NULL,
	"filas_total" integer NOT NULL,
	"filas_ok" integer NOT NULL,
	"filas_error" integer NOT NULL,
	"creados" integer DEFAULT 0 NOT NULL,
	"actualizados" integer DEFAULT 0 NOT NULL,
	"errores" jsonb NOT NULL,
	"usuario_id" uuid,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "importaciones" ADD CONSTRAINT "importaciones_usuario_id_usuarios_panel_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios_panel"("id") ON DELETE no action ON UPDATE no action;