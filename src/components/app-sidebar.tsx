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
  ShieldCheckIcon,
  HomeIcon,
  LogOutIcon,
  UserCheckIcon,
  UsersIcon,
  type LucideIcon,
} from "lucide-react";
import { authClient } from "@/lib/auth-client";
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

type Papel = "admin" | "paroco" | "secretaria" | "coordenador" | "catequista" | "membro";
type Item = { href: string; label: string; icon: LucideIcon; papeis?: Papel[] };
type Modulo = { titulo: string; itens: Item[] };

const SECRETARIA: Papel[] = ["admin", "paroco", "secretaria"];
const GESTAO: Papel[] = ["admin", "paroco"];

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
      { href: "/painel/liturgia/horarios", label: "Horários", icon: ChurchIcon, papeis: SECRETARIA },
      { href: "/painel/liturgia/celebracoes", label: "Celebrações e intenções", icon: ClipboardListIcon, papeis: SECRETARIA },
    ],
  },
  { titulo: "Agenda", itens: [{ href: "/painel/agenda", label: "Agenda pública", icon: CalendarDaysIcon, papeis: SECRETARIA }] },
  {
    titulo: "Escalas",
    itens: [
      { href: "/painel/escalas", label: "Escala do mês", icon: CalendarDaysIcon, papeis: SECRETARIA },
      { href: "/painel/escalas/funcoes", label: "Funções", icon: UsersIcon, papeis: SECRETARIA },
      { href: "/painel/escalas/minhas", label: "Minhas escalas", icon: UserCheckIcon },
    ],
  },
  {
    titulo: "Pastoral",
    itens: [
      { href: "/painel/inscricoes", label: "Inscrições", icon: ClipboardCheckIcon, papeis: SECRETARIA },
      { href: "/painel/pedidos", label: "Pedidos pastorais", icon: HandHeartIcon, papeis: SECRETARIA },
      { href: "/painel/sacramentos", label: "Batizados e casamentos", icon: DropletsIcon, papeis: SECRETARIA },
      { href: "/painel/catequese", label: "Catequese", icon: GraduationCapIcon, papeis: [...SECRETARIA, "catequista"] },
    ],
  },
  {
    titulo: "Secretaria",
    itens: [
      { href: "/painel/tarefas", label: "Tarefas", icon: CheckSquareIcon, papeis: SECRETARIA },
      { href: "/painel/reservas", label: "Reserva de espaços", icon: BuildingIcon, papeis: SECRETARIA },
      { href: "/painel/ferramentas", label: "Ferramentas de QR Code", icon: QrCodeIcon, papeis: SECRETARIA },
    ],
  },
  {
    titulo: "Registros",
    itens: [{ href: "/painel/registros", label: "Livros e certidões", icon: BookOpenIcon, papeis: SECRETARIA }],
  },
  {
    titulo: "Administração",
    itens: [{ href: "/painel/auditoria", label: "Auditoria", icon: ShieldCheckIcon, papeis: GESTAO }],
  },
  {
    titulo: "Cadastros",
    itens: [
      { href: "/painel/pessoas", label: "Pessoas", icon: UsersIcon, papeis: SECRETARIA },
      { href: "/painel/comunidades", label: "Comunidades", icon: MapPinIcon, papeis: SECRETARIA },
    ],
  },
];

export function AppSidebar({ papel, paroquia, usuario }: { papel: Papel; paroquia: string; usuario: string }) {
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
          const itens = modulo.itens.filter((i) => !i.papeis || i.papeis.includes(papel));
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
