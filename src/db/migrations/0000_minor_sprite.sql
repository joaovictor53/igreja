CREATE TABLE "agendas" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text,
	"paroquia_id" uuid NOT NULL,
	"nome" text NOT NULL,
	"visibilidade" text DEFAULT 'publica' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "celebracoes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text,
	"paroquia_id" uuid NOT NULL,
	"horario_id" uuid,
	"comunidade_id" uuid NOT NULL,
	"inicio" timestamp with time zone NOT NULL,
	"tipo" text DEFAULT 'missa' NOT NULL,
	"status" text DEFAULT 'agendada' NOT NULL,
	"celebrante" text,
	"limite_intencoes" integer
);
--> statement-breakpoint
CREATE TABLE "comunidades" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text,
	"paroquia_id" uuid NOT NULL,
	"nome" text NOT NULL,
	"endereco" text,
	"responsavel_pessoa_id" uuid
);
--> statement-breakpoint
CREATE TABLE "eventos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text,
	"paroquia_id" uuid NOT NULL,
	"agenda_id" uuid NOT NULL,
	"titulo" text NOT NULL,
	"local" text,
	"inicio" timestamp with time zone NOT NULL,
	"fim" timestamp with time zone,
	"rrule" text,
	"celebracao_id" uuid
);
--> statement-breakpoint
CREATE TABLE "familias" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text,
	"paroquia_id" uuid NOT NULL,
	"nome" text NOT NULL,
	"endereco" text
);
--> statement-breakpoint
CREATE TABLE "horarios_recorrentes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text,
	"paroquia_id" uuid NOT NULL,
	"comunidade_id" uuid NOT NULL,
	"rrule" text NOT NULL,
	"tipo" text DEFAULT 'missa' NOT NULL,
	"duracao_min" integer DEFAULT 60 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "intencoes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text,
	"paroquia_id" uuid NOT NULL,
	"celebracao_id" uuid NOT NULL,
	"tipo" text NOT NULL,
	"texto" text NOT NULL,
	"solicitante_nome" text,
	"solicitante_contato" text
);
--> statement-breakpoint
CREATE TABLE "membros_paroquia" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text,
	"paroquia_id" uuid NOT NULL,
	"usuario_id" text NOT NULL,
	"papel" text NOT NULL,
	"pessoa_id" uuid
);
--> statement-breakpoint
CREATE TABLE "paroquias" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text,
	"slug" text NOT NULL,
	"nome" text NOT NULL,
	"cnpj" text,
	"jurisdicao_tipo" text,
	"jurisdicao_nome" text,
	"fuso" text DEFAULT 'America/Manaus' NOT NULL,
	"config" jsonb DEFAULT '{}'::jsonb NOT NULL,
	CONSTRAINT "paroquias_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "pastorais" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text,
	"paroquia_id" uuid NOT NULL,
	"nome" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pastoral_membros" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text,
	"paroquia_id" uuid NOT NULL,
	"pastoral_id" uuid NOT NULL,
	"pessoa_id" uuid NOT NULL,
	"coordenador" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pessoas" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text,
	"paroquia_id" uuid NOT NULL,
	"nome" text NOT NULL,
	"nome_busca" text NOT NULL,
	"nascimento" date,
	"sexo" text,
	"telefone" text,
	"email" text,
	"comunidade_id" uuid,
	"familia_id" uuid
);
--> statement-breakpoint
CREATE TABLE "account" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp,
	"refresh_token_expires_at" timestamp,
	"scope" text,
	"password" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" text PRIMARY KEY NOT NULL,
	"expires_at" timestamp NOT NULL,
	"token" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"user_id" text NOT NULL,
	CONSTRAINT "session_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "verification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "agendas" ADD CONSTRAINT "agendas_paroquia_id_paroquias_id_fk" FOREIGN KEY ("paroquia_id") REFERENCES "public"."paroquias"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "celebracoes" ADD CONSTRAINT "celebracoes_paroquia_id_paroquias_id_fk" FOREIGN KEY ("paroquia_id") REFERENCES "public"."paroquias"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "celebracoes" ADD CONSTRAINT "celebracoes_horario_id_horarios_recorrentes_id_fk" FOREIGN KEY ("horario_id") REFERENCES "public"."horarios_recorrentes"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "celebracoes" ADD CONSTRAINT "celebracoes_comunidade_id_comunidades_id_fk" FOREIGN KEY ("comunidade_id") REFERENCES "public"."comunidades"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comunidades" ADD CONSTRAINT "comunidades_paroquia_id_paroquias_id_fk" FOREIGN KEY ("paroquia_id") REFERENCES "public"."paroquias"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "eventos" ADD CONSTRAINT "eventos_paroquia_id_paroquias_id_fk" FOREIGN KEY ("paroquia_id") REFERENCES "public"."paroquias"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "eventos" ADD CONSTRAINT "eventos_agenda_id_agendas_id_fk" FOREIGN KEY ("agenda_id") REFERENCES "public"."agendas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "eventos" ADD CONSTRAINT "eventos_celebracao_id_celebracoes_id_fk" FOREIGN KEY ("celebracao_id") REFERENCES "public"."celebracoes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "familias" ADD CONSTRAINT "familias_paroquia_id_paroquias_id_fk" FOREIGN KEY ("paroquia_id") REFERENCES "public"."paroquias"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "horarios_recorrentes" ADD CONSTRAINT "horarios_recorrentes_paroquia_id_paroquias_id_fk" FOREIGN KEY ("paroquia_id") REFERENCES "public"."paroquias"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "horarios_recorrentes" ADD CONSTRAINT "horarios_recorrentes_comunidade_id_comunidades_id_fk" FOREIGN KEY ("comunidade_id") REFERENCES "public"."comunidades"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "intencoes" ADD CONSTRAINT "intencoes_paroquia_id_paroquias_id_fk" FOREIGN KEY ("paroquia_id") REFERENCES "public"."paroquias"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "intencoes" ADD CONSTRAINT "intencoes_celebracao_id_celebracoes_id_fk" FOREIGN KEY ("celebracao_id") REFERENCES "public"."celebracoes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "membros_paroquia" ADD CONSTRAINT "membros_paroquia_paroquia_id_paroquias_id_fk" FOREIGN KEY ("paroquia_id") REFERENCES "public"."paroquias"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "membros_paroquia" ADD CONSTRAINT "membros_paroquia_pessoa_id_pessoas_id_fk" FOREIGN KEY ("pessoa_id") REFERENCES "public"."pessoas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pastorais" ADD CONSTRAINT "pastorais_paroquia_id_paroquias_id_fk" FOREIGN KEY ("paroquia_id") REFERENCES "public"."paroquias"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pastoral_membros" ADD CONSTRAINT "pastoral_membros_paroquia_id_paroquias_id_fk" FOREIGN KEY ("paroquia_id") REFERENCES "public"."paroquias"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pastoral_membros" ADD CONSTRAINT "pastoral_membros_pastoral_id_pastorais_id_fk" FOREIGN KEY ("pastoral_id") REFERENCES "public"."pastorais"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pastoral_membros" ADD CONSTRAINT "pastoral_membros_pessoa_id_pessoas_id_fk" FOREIGN KEY ("pessoa_id") REFERENCES "public"."pessoas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pessoas" ADD CONSTRAINT "pessoas_paroquia_id_paroquias_id_fk" FOREIGN KEY ("paroquia_id") REFERENCES "public"."paroquias"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pessoas" ADD CONSTRAINT "pessoas_comunidade_id_comunidades_id_fk" FOREIGN KEY ("comunidade_id") REFERENCES "public"."comunidades"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pessoas" ADD CONSTRAINT "pessoas_familia_id_familias_id_fk" FOREIGN KEY ("familia_id") REFERENCES "public"."familias"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "celebracoes_paroquia_inicio_idx" ON "celebracoes" USING btree ("paroquia_id","inicio");--> statement-breakpoint
CREATE UNIQUE INDEX "membros_paroquia_uniq" ON "membros_paroquia" USING btree ("paroquia_id","usuario_id");--> statement-breakpoint
CREATE INDEX "pessoas_paroquia_nome_idx" ON "pessoas" USING btree ("paroquia_id","nome_busca");--> statement-breakpoint
CREATE INDEX "account_userId_idx" ON "account" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "session_userId_idx" ON "session" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "verification_identifier_idx" ON "verification" USING btree ("identifier");