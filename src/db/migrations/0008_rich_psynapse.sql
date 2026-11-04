CREATE TABLE "notificacoes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text,
	"paroquia_id" uuid NOT NULL,
	"usuario_id" text NOT NULL,
	"titulo" text NOT NULL,
	"corpo" text NOT NULL,
	"url" text,
	"lida_em" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "push_subscriptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"usuario_id" text NOT NULL,
	"endpoint" text NOT NULL,
	"p256dh" text NOT NULL,
	"auth" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "push_subscriptions_endpoint_unique" UNIQUE("endpoint")
);
--> statement-breakpoint
CREATE TABLE "trocas" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text,
	"paroquia_id" uuid NOT NULL,
	"escala_item_id" uuid NOT NULL,
	"solicitante_pessoa_id" uuid NOT NULL,
	"substituto_pessoa_id" uuid,
	"status" text DEFAULT 'aberta' NOT NULL,
	"concluida_em" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "notificacoes" ADD CONSTRAINT "notificacoes_paroquia_id_paroquias_id_fk" FOREIGN KEY ("paroquia_id") REFERENCES "public"."paroquias"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trocas" ADD CONSTRAINT "trocas_paroquia_id_paroquias_id_fk" FOREIGN KEY ("paroquia_id") REFERENCES "public"."paroquias"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trocas" ADD CONSTRAINT "trocas_escala_item_id_escala_itens_id_fk" FOREIGN KEY ("escala_item_id") REFERENCES "public"."escala_itens"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trocas" ADD CONSTRAINT "trocas_solicitante_pessoa_id_pessoas_id_fk" FOREIGN KEY ("solicitante_pessoa_id") REFERENCES "public"."pessoas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trocas" ADD CONSTRAINT "trocas_substituto_pessoa_id_pessoas_id_fk" FOREIGN KEY ("substituto_pessoa_id") REFERENCES "public"."pessoas"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "notificacoes_usuario_idx" ON "notificacoes" USING btree ("usuario_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "trocas_item_aberta_uniq" ON "trocas" USING btree ("escala_item_id") WHERE status = 'aberta';--> statement-breakpoint
CREATE INDEX "trocas_paroquia_status_idx" ON "trocas" USING btree ("paroquia_id","status");