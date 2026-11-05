CREATE TABLE "tarefa_atividades" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text,
	"paroquia_id" uuid NOT NULL,
	"tarefa_id" uuid NOT NULL,
	"tipo" text NOT NULL,
	"dados" jsonb
);
--> statement-breakpoint
CREATE TABLE "tarefa_categorias" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text,
	"paroquia_id" uuid NOT NULL,
	"nome" text NOT NULL,
	"ordem" integer DEFAULT 0 NOT NULL,
	"cor" text
);
--> statement-breakpoint
CREATE TABLE "tarefa_checklist_itens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text,
	"paroquia_id" uuid NOT NULL,
	"tarefa_id" uuid NOT NULL,
	"conteudo" text NOT NULL,
	"concluido" boolean DEFAULT false NOT NULL,
	"ordem" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tarefa_comentarios" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text,
	"paroquia_id" uuid NOT NULL,
	"tarefa_id" uuid NOT NULL,
	"texto" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tarefa_responsaveis" (
	"tarefa_id" uuid NOT NULL,
	"pessoa_id" uuid NOT NULL,
	CONSTRAINT "tarefa_responsaveis_tarefa_id_pessoa_id_pk" PRIMARY KEY("tarefa_id","pessoa_id")
);
--> statement-breakpoint
ALTER TABLE "tarefas" ADD COLUMN "descricao" text;--> statement-breakpoint
ALTER TABLE "tarefas" ADD COLUMN "observacao" text;--> statement-breakpoint
ALTER TABLE "tarefas" ADD COLUMN "status" text DEFAULT 'TODO' NOT NULL;--> statement-breakpoint
ALTER TABLE "tarefas" ADD COLUMN "prioridade" text DEFAULT 'MEDIA' NOT NULL;--> statement-breakpoint
ALTER TABLE "tarefas" ADD COLUMN "categoria_id" uuid;--> statement-breakpoint
ALTER TABLE "tarefa_atividades" ADD CONSTRAINT "tarefa_atividades_paroquia_id_paroquias_id_fk" FOREIGN KEY ("paroquia_id") REFERENCES "public"."paroquias"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tarefa_atividades" ADD CONSTRAINT "tarefa_atividades_tarefa_id_tarefas_id_fk" FOREIGN KEY ("tarefa_id") REFERENCES "public"."tarefas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tarefa_categorias" ADD CONSTRAINT "tarefa_categorias_paroquia_id_paroquias_id_fk" FOREIGN KEY ("paroquia_id") REFERENCES "public"."paroquias"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tarefa_checklist_itens" ADD CONSTRAINT "tarefa_checklist_itens_paroquia_id_paroquias_id_fk" FOREIGN KEY ("paroquia_id") REFERENCES "public"."paroquias"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tarefa_checklist_itens" ADD CONSTRAINT "tarefa_checklist_itens_tarefa_id_tarefas_id_fk" FOREIGN KEY ("tarefa_id") REFERENCES "public"."tarefas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tarefa_comentarios" ADD CONSTRAINT "tarefa_comentarios_paroquia_id_paroquias_id_fk" FOREIGN KEY ("paroquia_id") REFERENCES "public"."paroquias"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tarefa_comentarios" ADD CONSTRAINT "tarefa_comentarios_tarefa_id_tarefas_id_fk" FOREIGN KEY ("tarefa_id") REFERENCES "public"."tarefas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tarefa_responsaveis" ADD CONSTRAINT "tarefa_responsaveis_tarefa_id_tarefas_id_fk" FOREIGN KEY ("tarefa_id") REFERENCES "public"."tarefas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tarefa_responsaveis" ADD CONSTRAINT "tarefa_responsaveis_pessoa_id_pessoas_id_fk" FOREIGN KEY ("pessoa_id") REFERENCES "public"."pessoas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "tarefa_atividades_tarefa_idx" ON "tarefa_atividades" USING btree ("tarefa_id","created_at");--> statement-breakpoint
CREATE INDEX "tarefa_categorias_paroquia_idx" ON "tarefa_categorias" USING btree ("paroquia_id","ordem");--> statement-breakpoint
CREATE INDEX "tarefa_checklist_tarefa_idx" ON "tarefa_checklist_itens" USING btree ("tarefa_id","ordem");--> statement-breakpoint
CREATE INDEX "tarefa_comentarios_tarefa_idx" ON "tarefa_comentarios" USING btree ("tarefa_id","created_at");--> statement-breakpoint
CREATE INDEX "tarefa_responsaveis_pessoa_idx" ON "tarefa_responsaveis" USING btree ("pessoa_id");--> statement-breakpoint
ALTER TABLE "tarefas" ADD CONSTRAINT "tarefas_categoria_id_tarefa_categorias_id_fk" FOREIGN KEY ("categoria_id") REFERENCES "public"."tarefa_categorias"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "tarefas_paroquia_categoria_idx" ON "tarefas" USING btree ("paroquia_id","categoria_id");
--> statement-breakpoint
-- Copia os dados do modelo antigo (um responsável, checklist em jsonb) antes de a migração seguinte removê-lo.
INSERT INTO "tarefa_responsaveis" ("tarefa_id", "pessoa_id") SELECT "id", "responsavel_pessoa_id" FROM "tarefas" WHERE "responsavel_pessoa_id" IS NOT NULL;--> statement-breakpoint
INSERT INTO "tarefa_checklist_itens" ("paroquia_id", "tarefa_id", "conteudo", "concluido", "ordem") SELECT t."paroquia_id", t."id", e.item->>'texto', COALESCE((e.item->>'feito')::boolean, false), (e.n - 1)::int FROM "tarefas" t, jsonb_array_elements(t."checklist") WITH ORDINALITY AS e(item, n) WHERE e.item->>'texto' IS NOT NULL;--> statement-breakpoint
UPDATE "tarefas" SET "status" = 'DONE' WHERE "concluida_em" IS NOT NULL;
