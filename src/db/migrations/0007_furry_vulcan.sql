CREATE TABLE "auditoria" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"paroquia_id" uuid NOT NULL,
	"usuario_id" text NOT NULL,
	"tabela" text NOT NULL,
	"registro_id" uuid NOT NULL,
	"acao" text NOT NULL,
	"antes" jsonb,
	"depois" jsonb,
	"em" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "auditoria" ADD CONSTRAINT "auditoria_paroquia_id_paroquias_id_fk" FOREIGN KEY ("paroquia_id") REFERENCES "public"."paroquias"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "auditoria_paroquia_em_idx" ON "auditoria" USING btree ("paroquia_id","em");--> statement-breakpoint
CREATE INDEX "auditoria_registro_idx" ON "auditoria" USING btree ("tabela","registro_id");--> statement-breakpoint
CREATE FUNCTION "auditoria_somente_insercao"() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'A trilha de auditoria é somente de inserção (% bloqueado)', TG_OP;
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint
CREATE TRIGGER "auditoria_imutavel"
BEFORE UPDATE OR DELETE ON "auditoria"
FOR EACH ROW EXECUTE FUNCTION "auditoria_somente_insercao"();
--> statement-breakpoint
CREATE TRIGGER "auditoria_sem_truncate"
BEFORE TRUNCATE ON "auditoria"
FOR EACH STATEMENT EXECUTE FUNCTION "auditoria_somente_insercao"();
