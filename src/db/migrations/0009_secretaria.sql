CREATE TABLE "agendamentos_sacramento" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text,
	"paroquia_id" uuid NOT NULL,
	"data_id" uuid NOT NULL,
	"envolvidos" text NOT NULL,
	"contato" text NOT NULL,
	"curso_concluido" boolean DEFAULT false NOT NULL,
	"documentos" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"status" text DEFAULT 'solicitado' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "datas_sacramento" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text,
	"paroquia_id" uuid NOT NULL,
	"tipo" text NOT NULL,
	"inicio" timestamp with time zone NOT NULL,
	"comunidade_id" uuid,
	"vagas" integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "espacos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text,
	"paroquia_id" uuid NOT NULL,
	"nome" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "etapas_catequese" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text,
	"paroquia_id" uuid NOT NULL,
	"nome" text NOT NULL,
	"ordem" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "matriculas_catequese" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text,
	"paroquia_id" uuid NOT NULL,
	"turma_id" uuid NOT NULL,
	"pessoa_id" uuid NOT NULL,
	"status" text DEFAULT 'ativa' NOT NULL,
	"documento_pendente" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reservas" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text,
	"paroquia_id" uuid NOT NULL,
	"espaco_id" uuid NOT NULL,
	"titulo" text NOT NULL,
	"solicitante" text NOT NULL,
	"inicio" timestamp with time zone NOT NULL,
	"fim" timestamp with time zone NOT NULL,
	"status" text DEFAULT 'pendente' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tarefas" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text,
	"paroquia_id" uuid NOT NULL,
	"titulo" text NOT NULL,
	"responsavel_pessoa_id" uuid,
	"prazo" date,
	"checklist" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"concluida_em" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "turma_catequistas" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text,
	"paroquia_id" uuid NOT NULL,
	"turma_id" uuid NOT NULL,
	"pessoa_id" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "turmas_catequese" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text,
	"paroquia_id" uuid NOT NULL,
	"etapa_id" uuid NOT NULL,
	"comunidade_id" uuid,
	"ano" integer NOT NULL,
	"nome" text NOT NULL,
	"dia_semana" integer NOT NULL,
	"hora" text NOT NULL,
	"vagas" integer DEFAULT 25 NOT NULL
);
--> statement-breakpoint
ALTER TABLE "agendamentos_sacramento" ADD CONSTRAINT "agendamentos_sacramento_paroquia_id_paroquias_id_fk" FOREIGN KEY ("paroquia_id") REFERENCES "public"."paroquias"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agendamentos_sacramento" ADD CONSTRAINT "agendamentos_sacramento_data_id_datas_sacramento_id_fk" FOREIGN KEY ("data_id") REFERENCES "public"."datas_sacramento"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "datas_sacramento" ADD CONSTRAINT "datas_sacramento_paroquia_id_paroquias_id_fk" FOREIGN KEY ("paroquia_id") REFERENCES "public"."paroquias"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "datas_sacramento" ADD CONSTRAINT "datas_sacramento_comunidade_id_comunidades_id_fk" FOREIGN KEY ("comunidade_id") REFERENCES "public"."comunidades"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "espacos" ADD CONSTRAINT "espacos_paroquia_id_paroquias_id_fk" FOREIGN KEY ("paroquia_id") REFERENCES "public"."paroquias"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "etapas_catequese" ADD CONSTRAINT "etapas_catequese_paroquia_id_paroquias_id_fk" FOREIGN KEY ("paroquia_id") REFERENCES "public"."paroquias"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "matriculas_catequese" ADD CONSTRAINT "matriculas_catequese_paroquia_id_paroquias_id_fk" FOREIGN KEY ("paroquia_id") REFERENCES "public"."paroquias"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "matriculas_catequese" ADD CONSTRAINT "matriculas_catequese_turma_id_turmas_catequese_id_fk" FOREIGN KEY ("turma_id") REFERENCES "public"."turmas_catequese"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "matriculas_catequese" ADD CONSTRAINT "matriculas_catequese_pessoa_id_pessoas_id_fk" FOREIGN KEY ("pessoa_id") REFERENCES "public"."pessoas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reservas" ADD CONSTRAINT "reservas_paroquia_id_paroquias_id_fk" FOREIGN KEY ("paroquia_id") REFERENCES "public"."paroquias"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reservas" ADD CONSTRAINT "reservas_espaco_id_espacos_id_fk" FOREIGN KEY ("espaco_id") REFERENCES "public"."espacos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tarefas" ADD CONSTRAINT "tarefas_paroquia_id_paroquias_id_fk" FOREIGN KEY ("paroquia_id") REFERENCES "public"."paroquias"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tarefas" ADD CONSTRAINT "tarefas_responsavel_pessoa_id_pessoas_id_fk" FOREIGN KEY ("responsavel_pessoa_id") REFERENCES "public"."pessoas"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "turma_catequistas" ADD CONSTRAINT "turma_catequistas_paroquia_id_paroquias_id_fk" FOREIGN KEY ("paroquia_id") REFERENCES "public"."paroquias"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "turma_catequistas" ADD CONSTRAINT "turma_catequistas_turma_id_turmas_catequese_id_fk" FOREIGN KEY ("turma_id") REFERENCES "public"."turmas_catequese"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "turma_catequistas" ADD CONSTRAINT "turma_catequistas_pessoa_id_pessoas_id_fk" FOREIGN KEY ("pessoa_id") REFERENCES "public"."pessoas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "turmas_catequese" ADD CONSTRAINT "turmas_catequese_paroquia_id_paroquias_id_fk" FOREIGN KEY ("paroquia_id") REFERENCES "public"."paroquias"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "turmas_catequese" ADD CONSTRAINT "turmas_catequese_etapa_id_etapas_catequese_id_fk" FOREIGN KEY ("etapa_id") REFERENCES "public"."etapas_catequese"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "turmas_catequese" ADD CONSTRAINT "turmas_catequese_comunidade_id_comunidades_id_fk" FOREIGN KEY ("comunidade_id") REFERENCES "public"."comunidades"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "agendamentos_sacramento_data_idx" ON "agendamentos_sacramento" USING btree ("data_id");--> statement-breakpoint
CREATE INDEX "datas_sacramento_paroquia_inicio_idx" ON "datas_sacramento" USING btree ("paroquia_id","inicio");--> statement-breakpoint
CREATE INDEX "matriculas_catequese_turma_idx" ON "matriculas_catequese" USING btree ("turma_id");--> statement-breakpoint
CREATE INDEX "reservas_espaco_inicio_idx" ON "reservas" USING btree ("espaco_id","inicio");--> statement-breakpoint
CREATE INDEX "tarefas_paroquia_prazo_idx" ON "tarefas" USING btree ("paroquia_id","prazo");--> statement-breakpoint
CREATE INDEX "turmas_catequese_paroquia_ano_idx" ON "turmas_catequese" USING btree ("paroquia_id","ano");