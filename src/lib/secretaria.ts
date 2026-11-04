// Sem dependências de servidor: usado também por telas e testes.

export type ItemChecklist = { texto: string; feito: boolean };

export const DOCUMENTOS_SACRAMENTO = {
  batizado: [
    "Certidão de nascimento da criança",
    "Documento com foto dos pais",
    "Documento com foto dos padrinhos",
    "Certificado de batismo ou crisma dos padrinhos",
  ],
  casamento: [
    "Certidão de batismo atualizada dos noivos",
    "Certidão de nascimento ou casamento civil",
    "Documento com foto dos noivos",
    "Documento com foto das testemunhas",
  ],
} as const;

export function checklistInicial(tipo: keyof typeof DOCUMENTOS_SACRAMENTO): ItemChecklist[] {
  return DOCUMENTOS_SACRAMENTO[tipo].map((texto) => ({ texto, feito: false }));
}

export function linhasParaChecklist(texto: string): ItemChecklist[] {
  return texto
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .map((t) => ({ texto: t, feito: false }));
}

/** Dois intervalos [inicio, fim) se sobrepõem quando cada um começa antes de o outro acabar. */
export function haConflito(a: { inicio: Date; fim: Date }, b: { inicio: Date; fim: Date }) {
  return a.inicio < b.fim && b.inicio < a.fim;
}

export function tarefaAtrasada(prazo: string | null, concluida: boolean, hoje: string) {
  return !concluida && !!prazo && prazo < hoje;
}

/** Data AAAA-MM-DD no fuso informado. */
export function hojeNoFuso(tz: string, d = new Date()) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: tz }).format(d);
}

const VERSICULOS = [
  ["O Senhor é o meu pastor; nada me faltará.", "Sl 23,1"],
  ["Tudo posso naquele que me fortalece.", "Fl 4,13"],
  ["Deus é amor.", "1Jo 4,8"],
  ["Não tenhas medo, pois eu estou contigo.", "Is 41,10"],
  ["Pedi, e vos será dado; buscai, e achareis.", "Mt 7,7"],
  ["Eu sou o caminho, a verdade e a vida.", "Jo 14,6"],
  ["Amai-vos uns aos outros como eu vos amei.", "Jo 13,34"],
  ["Vinde a mim, todos os que estais cansados, e eu vos aliviarei.", "Mt 11,28"],
  ["A fé é a garantia do que se espera.", "Hb 11,1"],
  ["Alegrai-vos sempre no Senhor.", "Fl 4,4"],
  ["O Senhor é a minha luz e a minha salvação.", "Sl 27,1"],
  ["Orai sem cessar.", "1Ts 5,17"],
  ["Tudo coopera para o bem daqueles que amam a Deus.", "Rm 8,28"],
  ["Sede misericordiosos como o vosso Pai é misericordioso.", "Lc 6,36"],
  ["A paz vos deixo, a minha paz vos dou.", "Jo 14,27"],
] as const;

/** Versículo fixo para cada dia: o mesmo o dia todo, mudando à meia-noite. */
export function versiculoDoDia(hoje: string) {
  const [y, m, d] = hoje.split("-").map(Number);
  const dia = Math.floor(Date.UTC(y, m - 1, d) / 86_400_000);
  const [texto, ref] = VERSICULOS[dia % VERSICULOS.length];
  return { texto, ref };
}
