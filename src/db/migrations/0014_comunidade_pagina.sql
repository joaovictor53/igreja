ALTER TABLE "comunidades" ADD COLUMN "slug" text;--> statement-breakpoint
ALTER TABLE "comunidades" ADD COLUMN "descricao" text;--> statement-breakpoint
ALTER TABLE "comunidades" ADD COLUMN "telefone" text;--> statement-breakpoint
ALTER TABLE "eventos" ADD COLUMN "comunidade_id" uuid;--> statement-breakpoint
ALTER TABLE "eventos" ADD CONSTRAINT "eventos_comunidade_id_comunidades_id_fk" FOREIGN KEY ("comunidade_id") REFERENCES "public"."comunidades"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
-- comunidades que já existem ganham um slug derivado do nome (sem acento); nomes repetidos recebem -2, -3…
WITH base AS (
  SELECT id, paroquia_id, created_at,
    COALESCE(NULLIF(trim(both '-' from regexp_replace(lower(translate("nome", 'áàâãäéèêëíìîïóòôõöúùûüçñÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇÑ', 'aaaaaeeeeiiiiooooouuuucnaaaaaeeeeiiiiooooouuuucn')), '[^a-z0-9]+', '-', 'g')), ''), 'comunidade') AS raiz
  FROM "comunidades"
), numerada AS (
  SELECT id, raiz, row_number() OVER (PARTITION BY paroquia_id, raiz ORDER BY created_at, id) AS n FROM base
)
UPDATE "comunidades" c SET "slug" = CASE WHEN numerada.n = 1 THEN numerada.raiz ELSE numerada.raiz || '-' || numerada.n END
FROM numerada WHERE numerada.id = c.id;--> statement-breakpoint
ALTER TABLE "comunidades" ALTER COLUMN "slug" SET NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "comunidades_paroquia_slug_uniq" ON "comunidades" USING btree ("paroquia_id","slug");
