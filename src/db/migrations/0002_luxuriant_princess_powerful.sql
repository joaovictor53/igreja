CREATE TABLE "escala_itens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text,
	"paroquia_id" uuid NOT NULL,
	"escala_id" uuid NOT NULL,
	"celebracao_id" uuid NOT NULL,
	"funcao_id" uuid NOT NULL,
	"pessoa_id" uuid,
	"confirmado" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "escalas" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text,
	"paroquia_id" uuid NOT NULL,
	"mes" text NOT NULL,
	"status" text DEFAULT 'rascunho' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "funcao_membros" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text,
	"paroquia_id" uuid NOT NULL,
	"funcao_id" uuid NOT NULL,
	"pessoa_id" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "funcoes_escala" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text,
	"paroquia_id" uuid NOT NULL,
	"nome" text NOT NULL,
	"vagas" integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
ALTER TABLE "escala_itens" ADD CONSTRAINT "escala_itens_paroquia_id_paroquias_id_fk" FOREIGN KEY ("paroquia_id") REFERENCES "public"."paroquias"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "escala_itens" ADD CONSTRAINT "escala_itens_escala_id_escalas_id_fk" FOREIGN KEY ("escala_id") REFERENCES "public"."escalas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "escala_itens" ADD CONSTRAINT "escala_itens_celebracao_id_celebracoes_id_fk" FOREIGN KEY ("celebracao_id") REFERENCES "public"."celebracoes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "escala_itens" ADD CONSTRAINT "escala_itens_funcao_id_funcoes_escala_id_fk" FOREIGN KEY ("funcao_id") REFERENCES "public"."funcoes_escala"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "escala_itens" ADD CONSTRAINT "escala_itens_pessoa_id_pessoas_id_fk" FOREIGN KEY ("pessoa_id") REFERENCES "public"."pessoas"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "escalas" ADD CONSTRAINT "escalas_paroquia_id_paroquias_id_fk" FOREIGN KEY ("paroquia_id") REFERENCES "public"."paroquias"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "funcao_membros" ADD CONSTRAINT "funcao_membros_paroquia_id_paroquias_id_fk" FOREIGN KEY ("paroquia_id") REFERENCES "public"."paroquias"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "funcao_membros" ADD CONSTRAINT "funcao_membros_funcao_id_funcoes_escala_id_fk" FOREIGN KEY ("funcao_id") REFERENCES "public"."funcoes_escala"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "funcao_membros" ADD CONSTRAINT "funcao_membros_pessoa_id_pessoas_id_fk" FOREIGN KEY ("pessoa_id") REFERENCES "public"."pessoas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "funcoes_escala" ADD CONSTRAINT "funcoes_escala_paroquia_id_paroquias_id_fk" FOREIGN KEY ("paroquia_id") REFERENCES "public"."paroquias"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "escalas_paroquia_mes_uniq" ON "escalas" USING btree ("paroquia_id","mes");--> statement-breakpoint
CREATE UNIQUE INDEX "funcao_membros_uniq" ON "funcao_membros" USING btree ("funcao_id","pessoa_id");