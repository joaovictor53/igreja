ALTER TABLE "certidoes" ADD COLUMN "tipo_registro" text NOT NULL;--> statement-breakpoint
ALTER TABLE "certidoes" ADD COLUMN "nome_registrado" text NOT NULL;--> statement-breakpoint
ALTER TABLE "certidoes" ADD COLUMN "paragrafos" jsonb NOT NULL;