ALTER TABLE "tarefas" DROP CONSTRAINT "tarefas_responsavel_pessoa_id_pessoas_id_fk";
--> statement-breakpoint
ALTER TABLE "tarefas" DROP COLUMN "responsavel_pessoa_id";--> statement-breakpoint
ALTER TABLE "tarefas" DROP COLUMN "checklist";