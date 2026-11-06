CREATE TABLE "comunidade_fotos" (
	"comunidade_id" uuid PRIMARY KEY NOT NULL,
	"tipo" text NOT NULL,
	"dados" "bytea" NOT NULL
);
--> statement-breakpoint
ALTER TABLE "comunidades" ADD COLUMN "whatsapp" text;--> statement-breakpoint
ALTER TABLE "comunidades" ADD COLUMN "mapa_url" text;--> statement-breakpoint
ALTER TABLE "comunidades" ADD COLUMN "foto_em" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "comunidade_fotos" ADD CONSTRAINT "comunidade_fotos_comunidade_id_comunidades_id_fk" FOREIGN KEY ("comunidade_id") REFERENCES "public"."comunidades"("id") ON DELETE cascade ON UPDATE no action;