CREATE TYPE "public"."estado_pedido" AS ENUM('pendiente_pago', 'a_pagar_en_local', 'pagado', 'en_camino', 'listo_para_retirar', 'entregado', 'cancelado');--> statement-breakpoint
CREATE TYPE "public"."medio_pago" AS ENUM('mercadopago', 'transferencia', 'efectivo');--> statement-breakpoint
CREATE TYPE "public"."tipo_entrega" AS ENUM('colocacion', 'retiro');--> statement-breakpoint
CREATE TYPE "public"."tipo_alerta" AS ENUM('monto_distinto', 'pago_sobre_cancelado');--> statement-breakpoint
CREATE TYPE "public"."estado_consulta_canje" AS ENUM('pendiente', 'atendida');--> statement-breakpoint
CREATE SEQUENCE "public"."pedidos_numero_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1001 CACHE 1;--> statement-breakpoint
CREATE TABLE "pedido_eventos" (
	"id" uuid PRIMARY KEY NOT NULL,
	"pedido_id" uuid NOT NULL,
	"de" "estado_pedido",
	"a" "estado_pedido" NOT NULL,
	"actor" text NOT NULL,
	"motivo" text DEFAULT '' NOT NULL,
	"rechazado" boolean DEFAULT false NOT NULL,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pedido_items" (
	"id" uuid PRIMARY KEY NOT NULL,
	"pedido_id" uuid NOT NULL,
	"producto_id" uuid NOT NULL,
	"nombre_producto" text NOT NULL,
	"cantidad" integer NOT NULL,
	"precio_unitario" bigint NOT NULL,
	CONSTRAINT "pedido_items_cantidad_positiva" CHECK ("pedido_items"."cantidad" > 0)
);
--> statement-breakpoint
CREATE TABLE "pedidos" (
	"id" uuid PRIMARY KEY NOT NULL,
	"numero" integer DEFAULT nextval('pedidos_numero_seq') NOT NULL,
	"estado" "estado_pedido" NOT NULL,
	"entrega" "tipo_entrega" NOT NULL,
	"zona_id" uuid,
	"medio_pago" "medio_pago" NOT NULL,
	"subtotal" bigint NOT NULL,
	"descuento" bigint NOT NULL,
	"costo_zona" bigint NOT NULL,
	"total" bigint NOT NULL,
	"descuento_pct_aplicado" numeric(5, 2) NOT NULL,
	"vence_en" timestamp with time zone,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL,
	"actualizado_en" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "pedidos_numero_unique" UNIQUE("numero"),
	CONSTRAINT "pedidos_zona_si_colocacion" CHECK ("pedidos"."entrega" <> 'colocacion' or "pedidos"."zona_id" is not null),
	CONSTRAINT "pedidos_efectivo_solo_retiro" CHECK ("pedidos"."medio_pago" <> 'efectivo' or "pedidos"."entrega" = 'retiro')
);
--> statement-breakpoint
CREATE TABLE "pedido_compradores" (
	"pedido_id" uuid PRIMARY KEY NOT NULL,
	"nombre" text NOT NULL,
	"dni_cifrado" "bytea" NOT NULL,
	"dni_clave_version" smallint NOT NULL,
	"telefono" text NOT NULL,
	"email" text NOT NULL,
	"calle" text,
	"numero" text,
	"referencias" text,
	"anonimizado_en" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "alertas" (
	"id" uuid PRIMARY KEY NOT NULL,
	"pedido_id" uuid NOT NULL,
	"tipo" "tipo_alerta" NOT NULL,
	"detalle" jsonb NOT NULL,
	"resuelta_en" timestamp with time zone,
	"resuelta_por" uuid,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pagos" (
	"id" uuid PRIMARY KEY NOT NULL,
	"pedido_id" uuid NOT NULL,
	"medio" "medio_pago" NOT NULL,
	"id_externo" text,
	"estado" text NOT NULL,
	"monto" bigint NOT NULL,
	"confirmado_por" uuid,
	"payload" jsonb,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "consultas_canje" (
	"id" uuid PRIMARY KEY NOT NULL,
	"nombre" text NOT NULL,
	"telefono" text NOT NULL,
	"bateria_usada" text,
	"auto" text DEFAULT '' NOT NULL,
	"localidad" text NOT NULL,
	"producto_id" uuid,
	"estado" "estado_consulta_canje" DEFAULT 'pendiente' NOT NULL,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "pedido_eventos" ADD CONSTRAINT "pedido_eventos_pedido_id_pedidos_id_fk" FOREIGN KEY ("pedido_id") REFERENCES "public"."pedidos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pedido_items" ADD CONSTRAINT "pedido_items_pedido_id_pedidos_id_fk" FOREIGN KEY ("pedido_id") REFERENCES "public"."pedidos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pedido_items" ADD CONSTRAINT "pedido_items_producto_id_productos_id_fk" FOREIGN KEY ("producto_id") REFERENCES "public"."productos"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pedidos" ADD CONSTRAINT "pedidos_zona_id_zonas_colocacion_id_fk" FOREIGN KEY ("zona_id") REFERENCES "public"."zonas_colocacion"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pedido_compradores" ADD CONSTRAINT "pedido_compradores_pedido_id_pedidos_id_fk" FOREIGN KEY ("pedido_id") REFERENCES "public"."pedidos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "alertas" ADD CONSTRAINT "alertas_pedido_id_pedidos_id_fk" FOREIGN KEY ("pedido_id") REFERENCES "public"."pedidos"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "alertas" ADD CONSTRAINT "alertas_resuelta_por_usuarios_panel_id_fk" FOREIGN KEY ("resuelta_por") REFERENCES "public"."usuarios_panel"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pagos" ADD CONSTRAINT "pagos_pedido_id_pedidos_id_fk" FOREIGN KEY ("pedido_id") REFERENCES "public"."pedidos"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pagos" ADD CONSTRAINT "pagos_confirmado_por_usuarios_panel_id_fk" FOREIGN KEY ("confirmado_por") REFERENCES "public"."usuarios_panel"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "consultas_canje" ADD CONSTRAINT "consultas_canje_producto_id_productos_id_fk" FOREIGN KEY ("producto_id") REFERENCES "public"."productos"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "pedido_eventos_pedido_idx" ON "pedido_eventos" USING btree ("pedido_id");--> statement-breakpoint
CREATE INDEX "pedido_items_pedido_idx" ON "pedido_items" USING btree ("pedido_id");--> statement-breakpoint
CREATE INDEX "pedidos_estado_vence_idx" ON "pedidos" USING btree ("estado","vence_en");--> statement-breakpoint
CREATE INDEX "pedidos_estado_creado_idx" ON "pedidos" USING btree ("estado","creado_en" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "alertas_abiertas_idx" ON "alertas" USING btree ("resuelta_en");--> statement-breakpoint
CREATE UNIQUE INDEX "pagos_medio_externo_unico" ON "pagos" USING btree ("medio","id_externo") WHERE "pagos"."id_externo" is not null;--> statement-breakpoint
CREATE INDEX "pagos_pedido_idx" ON "pagos" USING btree ("pedido_id");--> statement-breakpoint
CREATE INDEX "consultas_canje_estado_idx" ON "consultas_canje" USING btree ("estado","creado_en" DESC NULLS LAST);