ALTER TABLE "convites" ADD COLUMN "revogado_em" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "convites" ADD COLUMN "papel_inicial" text DEFAULT 'membro' NOT NULL;