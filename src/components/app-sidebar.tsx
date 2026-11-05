"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  CalendarDaysIcon,
  BuildingIcon,
  MapPinIcon,
  CheckSquareIcon,
  DropletsIcon,
  GraduationCapIcon,
  QrCodeIcon,
  UserIcon,
  BellIcon,
  BookOpenIcon,
  ChurchIcon,
  ClipboardCheckIcon,
  HandHeartIcon,
  ClipboardListIcon,
  KeyRoundIcon,
  ShieldCheckIcon,
  HomeIcon,
  LogOutIcon,
  UserCheckIcon,
  UsersIcon,
  type LucideIcon,
} from "lucide-react";
import { authClient } from "@/lib/auth-client";
import type { Permissao } from "@/lib/permissoes";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

type Item = { href: string; label: string; icon: LucideIcon; permissao?: Permissao };
type Modulo = { titulo: string; itens: Item[] };

const MODULOS: Modulo[] = [
  {
    titulo: "Geral",
    itens: [
      { href: "/painel", label: "Início", icon: HomeIcon },
      { href: "/painel/notificacoes", label: "Notificações", icon: BellIcon },
      { href: "/painel/perfil", label: "Meu perfil", icon: UserIcon },
    ],
  },
  {
    titulo: "Liturgia",
    itens: [
      { href: "/painel/liturgia/horarios", label: "Horários", icon: ChurchIcon, permissao: "liturgia:gerir" },
      { href: "/painel/liturgia/celebracoes", label: "Celebrações e intenções", icon: ClipboardListIcon, permissao: "liturgia:gerir" },
    ],
  },
  { titulo: "Agenda", itens: [{ href: "/painel/agenda", label: "Agenda pública", icon: CalendarDaysIcon, permissao: "agenda:gerir" }] },
  {
    titulo: "Escalas",
    itens: [
      { href: "/painel/escalas", label: "Escala do mês", icon: CalendarDaysIcon, permissao: "escalas:gerir" },
      { href: "/painel/escalas/funcoes", label: "Funções", icon: UsersIcon, permissao: "escalas:gerir" },
      { href: "/painel/escalas/minhas", label: "Minhas escalas", icon: UserCheckIcon },
    ],
  },
  {
    titulo: "Pastoral",
    itens: [
      { href: "/painel/inscricoes", label: "Inscrições", icon: ClipboardCheckIcon, permissao: "inscricoes:gerir" },
      { href: "/painel/pedidos", label: "Pedidos pastorais", icon: HandHeartIcon, permissao: "pedidos:gerir" },
      { href: "/painel/sacramentos", label: "Batizados e casamentos", icon: DropletsIcon, permissao: "sacramentos:gerir" },
      { href: "/painel/catequese", label: "Catequese", icon: GraduationCapIcon, permissao: "catequese:ver" },
    ],
  },
  {
    titulo: "Secretaria",
    itens: [
      { href: "/painel/tarefas", label: "Tarefas", icon: CheckSquareIcon, permissao: "tarefas:ver" },
      { href: "/painel/reservas", label: "Reserva de espaços", icon: BuildingIcon, permissao: "reservas:gerir" },
      { href: "/painel/ferramentas", label: "Ferramentas de QR Code", icon: QrCodeIcon, permissao: "ferramentas:usar" },
    ],
  },
  {
    titulo: "Registros",
    itens: [{ href: "/painel/registros", label: "Livros e certidões", icon: BookOpenIcon, permissao: "registros:gerir" }],
  },
  {
    titulo: "Administração",
    itens: [
      { href: "/painel/auditoria", label: "Auditoria", icon: ShieldCheckIcon, permissao: "auditoria:ver" },
      { href: "/painel/papeis", label: "Papéis e acessos", icon: KeyRoundIcon, permissao: "papeis:gerir" },
    ],
  },
  {
    titulo: "Cadastros",
    itens: [
      { href: "/painel/pessoas", label: "Pessoas", icon: UsersIcon, permissao: "pessoas:gerir" },
      { href: "/painel/comunidades", label: "Comunidades", icon: MapPinIcon, permissao: "comunidades:gerir" },
    ],
  },
];

export function AppSidebar({ permissoes, paroquia, usuario }: { permissoes: Permissao[]; paroquia: string; usuario: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const ativo = (href: string) => (href === "/painel" ? pathname === href : pathname === href || pathname.startsWith(href + "/"));
  // O item mais específico vence: /painel/escalas não fica ativo em /painel/escalas/funcoes
  const todos = MODULOS.flatMap((m) => m.itens.map((i) => i.href)).filter(ativo);
  const maisEspecifico = todos.sort((a, b) => b.length - a.length)[0];

  async function sair() {
    await authClient.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <Sidebar>
      <SidebarHeader>
        <div className="px-2 py-1">
          <p className="truncate font-semibold">{paroquia}</p>
          <p className="truncate text-xs text-sidebar-foreground/70">{usuario}</p>
        </div>
      </SidebarHeader>
      <SidebarContent>
        {MODULOS.map((modulo) => {
          const itens = modulo.itens.filter((i) => !i.permissao || permissoes.includes(i.permissao));
          if (!itens.length) return null;
          return (
            <SidebarGroup key={modulo.titulo}>
              <SidebarGroupLabel>{modulo.titulo}</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {itens.map((item) => (
                    <SidebarMenuItem key={item.href}>
                      <SidebarMenuButton render={<Link href={item.href} />} isActive={item.href === maisEspecifico}>
                        <item.icon />
                        <span>{item.label}</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          );
        })}
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton onClick={sair}>
              <LogOutIcon />
              <span>Sair</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
