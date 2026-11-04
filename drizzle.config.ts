import { defineConfig } from "drizzle-kit";

// O drizzle-kit não lê o .env.local sozinho. Variáveis já definidas (Railway, terminal) têm prioridade.
try {
  process.loadEnvFile(".env.local");
} catch {}

export default defineConfig({
  schema: "./src/db/schema/index.ts",
  out: "./src/db/migrations",
  dialect: "postgresql",
  dbCredentials: { url: process.env.DATABASE_URL! },
});
