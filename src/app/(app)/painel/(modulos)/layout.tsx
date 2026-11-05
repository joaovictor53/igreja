import { Suspense } from "react";
import Link from "next/link";
import { and, count, eq, isNull } from "drizzle-orm";
import { BellIcon } from "lucide-react";
import { db } from "@/db";
import { notificacoes } from "@/db/schema";
import { requireParoquia } from "@/server/auth/session";
import { AppSidebar } from "@/components/app-sidebar";
import { AtivarPush } from "@/components/ativar-push";
import { ThemeToggle } from "@/components/theme-toggle";
import { buttonVariants } from "@/components/ui/button";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";

async function Shell({ children }: { children: React.ReactNode }) {
  const { paroquia, papel, user } = await requireParoquia();
  const [{ naoLidas }] = await db
    .select({ naoLidas: count() })
    .from(notificacoes)
    .where(and(eq(notificacoes.usuarioId, user.id), isNull(notificacoes.lidaEm)));
  return (
    <SidebarProvider>
      <AppSidebar papel={papel} paroquia={paroquia.nome} usuario={user.name} />
      <SidebarInset>
        <header className="flex h-12 items-center gap-2 border-b px-3 print:hidden">
          <SidebarTrigger aria-label="Alternar menu" />
          <div className="ml-auto flex items-center gap-2">
            <AtivarPush />
            <ThemeToggle />
            <Link
              href="/painel/notificacoes"
              className={buttonVariants({ variant: "ghost", size: "sm" })}
              aria-label={naoLidas ? `Notificações, ${naoLidas} não lidas` : "Notificações"}
            >
              <BellIcon />
              {naoLidas > 0 && (
                <span className="rounded-full bg-destructive px-1.5 text-xs text-white dark:text-black" data-testid="nao-lidas">
                  {naoLidas}
                </span>
              )}
            </Link>
          </div>
        </header>
        {children}
      </SidebarInset>
    </SidebarProvider>
  );
}

export default function Layout({ children }: LayoutProps<"/painel">) {
  return (
    <Suspense fallback={<p className="p-4 sm:p-6">Carregando…</p>}>
      <Shell>{children}</Shell>
    </Suspense>
  );
}
