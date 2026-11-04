import { createHash, randomBytes } from "node:crypto";
import { NOMES_TIPO, type PapelAssento, type TipoRegistro } from "./registros-constantes";

export { NOMES_PAPEL, NOMES_TIPO, type PapelAssento, type TipoRegistro } from "./registros-constantes";

export type PessoaAssento = { papel: PapelAssento; nome: string };
export type DadosCertidao = {
  tipo: TipoRegistro;
  livro: number;
  folha: string;
  termo: string;
  data: string; // AAAA-MM-DD
  celebrante?: string | null;
  pessoas: PessoaAssento[];
  averbacoes: { data: string; texto: string }[];
  paroquia: string;
};

/** Minúsculas e sem acento: usado para busca. */
export const normalizar = (s: string) => s.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase().trim();

export const dataExtenso = (iso: string) =>
  new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC", day: "numeric", month: "long", year: "numeric" }).format(new Date(iso + "T00:00:00Z"));

const lista = (nomes: string[]) =>
  nomes.length <= 1 ? (nomes[0] ?? "") : `${nomes.slice(0, -1).join(", ")} e ${nomes[nomes.length - 1]}`;

/** Nome que identifica o registro (pessoa registrada; no casamento, os dois cônjuges). */
export function nomePrincipal(pessoas: PessoaAssento[], tipo: TipoRegistro): string {
  const principal = pessoas.find((p) => p.papel === "principal")?.nome ?? "";
  if (tipo !== "casamento") return principal;
  const conjuge = pessoas.find((p) => p.papel === "conjuge")?.nome;
  return conjuge ? `${principal} e ${conjuge}` : principal;
}

/** Texto da certidão, por parágrafo. É o conteúdo que o hash protege. */
export function textoCertidao(d: DadosCertidao): string[] {
  const por = (papel: PapelAssento) => d.pessoas.filter((p) => p.papel === papel).map((p) => p.nome);
  const principal = nomePrincipal(d.pessoas, d.tipo);
  const filiacao = [...por("pai"), ...por("mae")];
  const padrinhos = [...por("padrinho"), ...por("madrinha")];
  const quando = dataExtenso(d.data);
  const celebrante = d.celebrante ? `, sendo celebrante ${d.celebrante}` : "";
  const filhoDe = filiacao.length ? `, filho(a) de ${lista(filiacao)},` : "";

  let fato: string;
  switch (d.tipo) {
    case "batismo":
      fato = `foi batizado(a) em ${quando}${celebrante}`;
      break;
    case "eucaristia":
      fato = `recebeu a Primeira Eucaristia em ${quando}${celebrante}`;
      break;
    case "crisma":
      fato = `recebeu o sacramento da Crisma em ${quando}${celebrante}`;
      break;
    case "casamento":
      fato = `contraíram matrimônio em ${quando}${celebrante}`;
      break;
    case "obito":
      fato = `faleceu em ${quando}${celebrante}`;
      break;
  }
  const localizacao = `Livro ${d.livro}, folha ${d.folha}, termo ${d.termo}`;
  const paragrafos = [
    `Certifico que, conforme consta no ${localizacao} de registros de ${NOMES_TIPO[d.tipo].toLowerCase()} desta paróquia, ${principal}${d.tipo === "casamento" ? "" : filhoDe} ${fato}.`,
  ];
  if (d.tipo === "casamento" && filiacao.length) paragrafos.push(`Filiação dos nubentes: ${lista(filiacao)}.`);
  if (padrinhos.length) paragrafos.push(`${d.tipo === "casamento" ? "Testemunhas" : "Padrinhos"}: ${lista(padrinhos)}.`);
  const testemunhas = por("testemunha");
  if (testemunhas.length) paragrafos.push(`Testemunhas: ${lista(testemunhas)}.`);
  for (const a of d.averbacoes) paragrafos.push(`Averbação em ${dataExtenso(a.data)}: ${a.texto}`);
  return paragrafos;
}

const ALFABETO = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"; // sem I, L, O, 0, 1 (evita confusão)

/** Código de validação no formato XXXX-XXXX-XXXX (~59 bits de aleatoriedade). */
export function gerarCodigo(): string {
  const bytes = randomBytes(12);
  const chars = Array.from(bytes, (b) => ALFABETO[b % ALFABETO.length]);
  return [chars.slice(0, 4), chars.slice(4, 8), chars.slice(8, 12)].map((g) => g.join("")).join("-");
}

export const codigoValido = (c: string) => /^[A-HJKMNP-Z2-9]{4}-[A-HJKMNP-Z2-9]{4}-[A-HJKMNP-Z2-9]{4}$/.test(c);

export function hashCertidao(paragrafos: string[], codigo: string, emitidaEm: Date): string {
  return createHash("sha256").update([...paragrafos, codigo, emitidaEm.toISOString()].join("\n")).digest("hex");
}
