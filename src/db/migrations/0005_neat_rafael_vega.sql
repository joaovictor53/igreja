CREATE TABLE "assento_pessoas" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text,
	"paroquia_id" uuid NOT NULL,
	"assento_id" uuid NOT NULL,
	"papel" text NOT NULL,
	"nome" text NOT NULL,
	"pessoa_id" uuid
);
--> statement-breakpoint
CREATE TABLE "assentos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text,
	"paroquia_id" uuid NOT NULL,
	"livro_id" uuid NOT NULL,
	"folha" text NOT NULL,
	"termo" text NOT NULL,
	"data" date NOT NULL,
	"celebrante" text,
	"observacoes" text,
	"texto_busca" text DEFAULT '' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "averbacoes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text,
	"paroquia_id" uuid NOT NULL,
	"assento_id" uuid NOT NULL,
	"data" date NOT NULL,
	"texto" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "certidoes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text,
	"paroquia_id" uuid NOT NULL,
	"assento_id" uuid NOT NULL,
	"codigo" text NOT NULL,
	"emitida_em" timestamp with time zone DEFAULT now() NOT NULL,
	"emitida_por" text NOT NULL,
	"finalidade" text,
	"revogada_em" timestamp with time zone,
	"motivo_revogacao" text,
	"hash_conteudo" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "livros" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text,
	"paroquia_id" uuid NOT NULL,
	"tipo" text NOT NULL,
	"numero" integer NOT NULL,
	"inicio" date,
	"fim" date
);
--> statement-breakpoint
ALTER TABLE "assento_pessoas" ADD CONSTRAINT "assento_pessoas_paroquia_id_paroquias_id_fk" FOREIGN KEY ("paroquia_id") REFERENCES "public"."paroquias"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assento_pessoas" ADD CONSTRAINT "assento_pessoas_assento_id_assentos_id_fk" FOREIGN KEY ("assento_id") REFERENCES "public"."assentos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assento_pessoas" ADD CONSTRAINT "assento_pessoas_pessoa_id_pessoas_id_fk" FOREIGN KEY ("pessoa_id") REFERENCES "public"."pessoas"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assentos" ADD CONSTRAINT "assentos_paroquia_id_paroquias_id_fk" FOREIGN KEY ("paroquia_id") REFERENCES "public"."paroquias"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assentos" ADD CONSTRAINT "assentos_livro_id_livros_id_fk" FOREIGN KEY ("livro_id") REFERENCES "public"."livros"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "averbacoes" ADD CONSTRAINT "averbacoes_paroquia_id_paroquias_id_fk" FOREIGN KEY ("paroquia_id") REFERENCES "public"."paroquias"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "averbacoes" ADD CONSTRAINT "averbacoes_assento_id_assentos_id_fk" FOREIGN KEY ("assento_id") REFERENCES "public"."assentos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "certidoes" ADD CONSTRAINT "certidoes_paroquia_id_paroquias_id_fk" FOREIGN KEY ("paroquia_id") REFERENCES "public"."paroquias"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "certidoes" ADD CONSTRAINT "certidoes_assento_id_assentos_id_fk" FOREIGN KEY ("assento_id") REFERENCES "public"."assentos"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "livros" ADD CONSTRAINT "livros_paroquia_id_paroquias_id_fk" FOREIGN KEY ("paroquia_id") REFERENCES "public"."paroquias"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "assentos_livro_folha_termo_uniq" ON "assentos" USING btree ("livro_id","folha","termo");--> statement-breakpoint
CREATE INDEX "assentos_paroquia_data_idx" ON "assentos" USING btree ("paroquia_id","data");--> statement-breakpoint
CREATE UNIQUE INDEX "certidoes_codigo_uniq" ON "certidoes" USING btree ("codigo");--> statement-breakpoint
CREATE UNIQUE INDEX "livros_paroquia_tipo_numero_uniq" ON "livros" USING btree ("paroquia_id","tipo","numero");--> statement-breakpoint
CREATE EXTENSION IF NOT EXISTS unaccent;
--> statement-breakpoint
CREATE EXTENSION IF NOT EXISTS pg_trgm;
--> statement-breakpoint
CREATE INDEX "assentos_texto_busca_trgm_idx" ON "assentos" USING gin ("texto_busca" gin_trgm_ops);
