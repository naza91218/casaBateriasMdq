CREATE TABLE "arrepentimientos" (
	"id" uuid PRIMARY KEY NOT NULL,
	"pedido_id" uuid,
	"numero_pedido" integer NOT NULL,
	"nombre" text NOT NULL,
	"email" text NOT NULL,
	"codigo" text NOT NULL,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "arrepentimientos_codigo_unique" UNIQUE("codigo")
);
--> statement-breakpoint
ALTER TABLE "arrepentimientos" ADD CONSTRAINT "arrepentimientos_pedido_id_pedidos_id_fk" FOREIGN KEY ("pedido_id") REFERENCES "public"."pedidos"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "arrepentimientos_pedido_idx" ON "arrepentimientos" USING btree ("pedido_id");--> statement-breakpoint
CREATE INDEX "arrepentimientos_creado_idx" ON "arrepentimientos" USING btree ("creado_en" DESC NULLS LAST);