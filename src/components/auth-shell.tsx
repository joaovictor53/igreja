import { ChurchIcon } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";

/** Moldura das telas de acesso: painel azul no computador, só o formulário no celular. */
export function AuthShell({ titulo, subtitulo, children }: { titulo: string; subtitulo: string; children: React.ReactNode }) {
  return (
    <main className="grid min-h-screen lg:grid-cols-[1.1fr_1fr]">
      <aside className="relative hidden flex-col justify-between overflow-hidden bg-[#11264a] p-12 text-white lg:flex">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-32 -bottom-32 size-[28rem] rounded-full bg-[#1f9e7a]/25 blur-3xl"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-24 -left-24 size-80 rounded-full bg-[#1f6feb]/20 blur-3xl"
        />
        <div className="relative flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded-xl bg-white/10 ring-1 ring-white/20">
            <ChurchIcon className="size-5" />
          </span>
          <span className="text-lg font-semibold tracking-tight">Sistema Paroquial</span>
        </div>
        <div className="relative max-w-md">
          <h2 className="font-serif text-4xl leading-tight">A secretaria da paróquia, organizada num só lugar.</h2>
          <p className="mt-4 text-white/70">
            Intenções de missa, agenda, escalas, inscrições, catequese e certidões, com cada pessoa vendo só o que precisa.
          </p>
        </div>
        <p className="relative font-serif text-sm text-white/60 italic">“Deus é amor.” — 1Jo 4,8</p>
      </aside>

      <section className="relative flex items-center justify-center bg-muted/40 p-6">
        <ThemeToggle className="absolute top-4 right-4" />
        <div className="w-full max-w-sm">
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <span className="grid size-10 place-items-center rounded-xl bg-[#11264a] text-white">
              <ChurchIcon className="size-5" />
            </span>
            <span className="text-lg font-semibold tracking-tight">Sistema Paroquial</span>
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">{titulo}</h1>
          <p className="mt-1 mb-6 text-sm text-muted-foreground">{subtitulo}</p>
          <div className="rounded-2xl border bg-card p-6 shadow-sm">{children}</div>
        </div>
      </section>
    </main>
  );
}
