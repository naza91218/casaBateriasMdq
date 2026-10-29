-- Extensión para mails sin distinguir mayúsculas (usuarios_panel.email).
CREATE EXTENSION IF NOT EXISTS citext;--> statement-breakpoint
CREATE TYPE "public"."canal_outbox" AS ENUM('mail', 'revalidacion');--> statement-breakpoint
CREATE TYPE "public"."destinatario_outbox" AS ENUM('comprador', 'admin', 'sistema');--> statement-breakpoint
CREATE TYPE "public"."estado_outbox" AS ENUM('pendiente', 'enviado', 'fallido');--> statement-breakpoint
CREATE TABLE "configuracion" (
	"id" smallint PRIMARY KEY DEFAULT 1 NOT NULL,
	"descuento_pct" numeric(5, 2) DEFAULT '10' NOT NULL,
	"banco_titular" text DEFAULT '' NOT NULL,
	"banco_cbu" text DEFAULT '' NOT NULL,
	"banco_alias" text DEFAULT '' NOT NULL,
	"banco_cuit" text DEFAULT '' NOT NULL,
	"whatsapp" text DEFAULT '' NOT NULL,
	"horarios" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"comercio_razon_social" text DEFAULT '' NOT NULL,
	"comercio_cuit" text DEFAULT '' NOT NULL,
	"comercio_domicilio" text DEFAULT '' NOT NULL,
	"comercio_telefono" text DEFAULT '' NOT NULL,
	"comercio_lat" numeric(9, 6),
	"comercio_lng" numeric(9, 6),
	"google_resenas_url" text DEFAULT '' NOT NULL,
	"horas_venc_transferencia" integer DEFAULT 48 NOT NULL,
	"minutos_venc_mercadopago" integer DEFAULT 30 NOT NULL,
	"actualizado_en" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "configuracion_fila_unica" CHECK ("configuracion"."id" = 1),
	CONSTRAINT "configuracion_descuento_rango" CHECK ("configuracion"."descuento_pct" between 0 and 50)
);
--> statement-breakpoint
CREATE TABLE "zonas_colocacion" (
	"id" uuid PRIMARY KEY NOT NULL,
	"nombre" text NOT NULL,
	"costo_extra" bigint DEFAULT 0 NOT NULL,
	"activa" boolean DEFAULT true NOT NULL,
	CONSTRAINT "zonas_colocacion_nombre_unique" UNIQUE("nombre")
);
--> statement-breakpoint
CREATE TABLE "enlaces_ingreso" (
	"token_hash" text PRIMARY KEY NOT NULL,
	"usuario_id" uuid NOT NULL,
	"vence_en" timestamp with time zone NOT NULL,
	"usado_en" timestamp with time zone,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sesiones" (
	"id_hash" text PRIMARY KEY NOT NULL,
	"usuario_id" uuid NOT NULL,
	"vence_en" timestamp with time zone NOT NULL,
	"revocada_en" timestamp with time zone,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "usuarios_panel" (
	"id" uuid PRIMARY KEY NOT NULL,
	"email" "citext" NOT NULL,
	"rol" text DEFAULT 'admin' NOT NULL,
	"activo" boolean DEFAULT true NOT NULL,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "usuarios_panel_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "outbox_mensajes" (
	"id" uuid PRIMARY KEY NOT NULL,
	"clave" text NOT NULL,
	"canal" "canal_outbox" NOT NULL,
	"evento" text NOT NULL,
	"pedido_id" uuid,
	"destinatario" "destinatario_outbox" NOT NULL,
	"datos" jsonb NOT NULL,
	"estado" "estado_outbox" DEFAULT 'pendiente' NOT NULL,
	"intentos" integer DEFAULT 0 NOT NULL,
	"proximo_intento_en" timestamp with time zone DEFAULT now() NOT NULL,
	"ultimo_error" text,
	"enviado_en" timestamp with time zone,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "outbox_mensajes_clave_unique" UNIQUE("clave")
);
--> statement-breakpoint
ALTER TABLE "enlaces_ingreso" ADD CONSTRAINT "enlaces_ingreso_usuario_id_usuarios_panel_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios_panel"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sesiones" ADD CONSTRAINT "sesiones_usuario_id_usuarios_panel_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios_panel"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "outbox_pendientes_idx" ON "outbox_mensajes" USING btree ("estado","proximo_intento_en");