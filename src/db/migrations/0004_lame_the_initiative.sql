CREATE TABLE "formularios" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text,
	"paroquia_id" uuid NOT NULL,
	"titulo" text NOT NULL,
	"descricao" text,
	"campos" jsonb NOT NULL,
	"abre_em" timestamp with time zone,
	"fecha_em" timestamp with time zone,
	"limite" integer,
	"ativo" boolean DEFAULT true NOT NULL,
	"modelo_origem" text
);
--> statement-breakpoint
CREATE TABLE "pedidos_pastorais" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text,
	"paroquia_id" uuid NOT NULL,
	"tipo" text NOT NULL,
	"urgente" boolean DEFAULT false NOT NULL,
	"solicitante_nome" text NOT NULL,
	"contato" text NOT NULL,
	"endereco" text,
	"descricao" text,
	"atribuido_a" text,
	"status" text DEFAULT 'novo' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "respostas" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text,
	"paroquia_id" uuid NOT NULL,
	"formulario_id" uuid NOT NULL,
	"dados" jsonb NOT NULL,
	"status" text DEFAULT 'nova' NOT NULL,
	"pessoa_id" uuid
);
--> statement-breakpoint
ALTER TABLE "formularios" ADD CONSTRAINT "formularios_paroquia_id_paroquias_id_fk" FOREIGN KEY ("paroquia_id") REFERENCES "public"."paroquias"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pedidos_pastorais" ADD CONSTRAINT "pedidos_pastorais_paroquia_id_paroquias_id_fk" FOREIGN KEY ("paroquia_id") REFERENCES "public"."paroquias"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "respostas" ADD CONSTRAINT "respostas_paroquia_id_paroquias_id_fk" FOREIGN KEY ("paroquia_id") REFERENCES "public"."paroquias"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "respostas" ADD CONSTRAINT "respostas_formulario_id_formularios_id_fk" FOREIGN KEY ("formulario_id") REFERENCES "public"."formularios"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "respostas" ADD CONSTRAINT "respostas_pessoa_id_pessoas_id_fk" FOREIGN KEY ("pessoa_id") REFERENCES "public"."pessoas"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "respostas_formulario_idx" ON "respostas" USING btree ("formulario_id","created_at");