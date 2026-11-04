export const TIPOS_CAMPO = {
  texto: "Texto",
  texto_longo: "Texto longo",
  data: "Data",
  telefone: "Telefone",
  email: "E-mail",
  escolha_unica: "Escolha única",
  escolha_multipla: "Escolha múltipla",
  aceite: "Aceite (consentimento)",
} as const;

export type TipoCampo = keyof typeof TIPOS_CAMPO;
export type Campo = { id: string; rotulo: string; tipo: TipoCampo; obrigatorio: boolean; opcoes?: string[] };
export type Dados = Record<string, string | string[] | boolean>;

const MAX_TEXTO = 200;
const MAX_TEXTO_LONGO = 2000;
export const prefixoCampo = "c_";

const aceite = (rotulo: string): Campo => ({ id: "aceite", rotulo, tipo: "aceite", obrigatorio: true });
const LGPD = "Autorizo o uso destes dados pela paróquia para esta finalidade (LGPD).";

export const MODELOS: Record<string, { titulo: string; campos: Campo[] }> = {
  catequese: {
    titulo: "Inscrição na catequese",
    campos: [
      { id: "nome", rotulo: "Nome do catequizando", tipo: "texto", obrigatorio: true },
      { id: "nascimento", rotulo: "Data de nascimento", tipo: "data", obrigatorio: true },
      { id: "responsavel", rotulo: "Nome do responsável", tipo: "texto", obrigatorio: true },
      { id: "telefone", rotulo: "Telefone do responsável", tipo: "telefone", obrigatorio: true },
      { id: "email", rotulo: "E-mail", tipo: "email", obrigatorio: false },
      {
        id: "etapa",
        rotulo: "Etapa",
        tipo: "escolha_unica",
        obrigatorio: true,
        opcoes: ["Pré-eucaristia", "Eucaristia", "Perseverança", "Crisma"],
      },
      aceite(LGPD),
    ],
  },
  crisma: {
    titulo: "Inscrição para a Crisma",
    campos: [
      { id: "nome", rotulo: "Nome completo", tipo: "texto", obrigatorio: true },
      { id: "nascimento", rotulo: "Data de nascimento", tipo: "data", obrigatorio: true },
      { id: "telefone", rotulo: "Telefone", tipo: "telefone", obrigatorio: true },
      { id: "email", rotulo: "E-mail", tipo: "email", obrigatorio: false },
      aceite(LGPD),
    ],
  },
  retiro: {
    titulo: "Inscrição em retiro",
    campos: [
      { id: "nome", rotulo: "Nome completo", tipo: "texto", obrigatorio: true },
      { id: "telefone", rotulo: "Telefone", tipo: "telefone", obrigatorio: true },
      { id: "observacoes", rotulo: "Restrições alimentares ou de saúde", tipo: "texto_longo", obrigatorio: false },
      aceite(LGPD),
    ],
  },
  voluntariado: {
    titulo: "Voluntariado",
    campos: [
      { id: "nome", rotulo: "Nome completo", tipo: "texto", obrigatorio: true },
      { id: "telefone", rotulo: "Telefone", tipo: "telefone", obrigatorio: true },
      { id: "email", rotulo: "E-mail", tipo: "email", obrigatorio: false },
      {
        id: "areas",
        rotulo: "Onde gostaria de ajudar",
        tipo: "escolha_multipla",
        obrigatorio: true,
        opcoes: ["Liturgia", "Acolhida", "Música", "Limpeza e manutenção", "Eventos"],
      },
      aceite(LGPD),
    ],
  },
  em_branco: { titulo: "Novo formulário", campos: [{ id: "nome", rotulo: "Nome completo", tipo: "texto", obrigatorio: true }] },
};

/** Gera um id estável (a-z, 0-9, _) a partir do rótulo, sem colidir com os já usados. */
export function idDoCampo(rotulo: string, usados: string[]): string {
  const base =
    rotulo.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "").slice(0, 30) ||
    "campo";
  let id = base;
  for (let n = 2; usados.includes(id); n++) id = `${base}_${n}`;
  return id;
}

type Resultado = { ok: true; dados: Dados } | { ok: false; erro: string };

/** Valida a resposta de um visitante contra a definição dos campos (nunca confia no cliente). */
export function validarResposta(campos: Campo[], form: FormData): Resultado {
  const dados: Dados = {};
  for (const c of campos) {
    const nome = prefixoCampo + c.id;
    const faltou = { ok: false, erro: `Preencha: ${c.rotulo}` } as const;
    const invalido = { ok: false, erro: `Valor inválido em: ${c.rotulo}` } as const;

    if (c.tipo === "aceite") {
      const marcado = form.get(nome) === "on";
      if (c.obrigatorio && !marcado) return faltou;
      dados[c.id] = marcado;
      continue;
    }
    if (c.tipo === "escolha_multipla") {
      const valores = form.getAll(nome).map(String);
      if (!valores.length) {
        if (c.obrigatorio) return faltou;
        continue;
      }
      if (!valores.every((v) => c.opcoes?.includes(v))) return invalido;
      dados[c.id] = valores;
      continue;
    }

    const valor = String(form.get(nome) ?? "").trim();
    if (!valor) {
      if (c.obrigatorio) return faltou;
      continue;
    }
    switch (c.tipo) {
      case "texto":
        if (valor.length > MAX_TEXTO) return invalido;
        break;
      case "texto_longo":
        if (valor.length > MAX_TEXTO_LONGO) return invalido;
        break;
      case "data":
        if (!/^\d{4}-\d{2}-\d{2}$/.test(valor) || Number.isNaN(Date.parse(valor))) return invalido;
        break;
      case "telefone": {
        const digitos = valor.replace(/\D/g, "");
        if (digitos.length < 10 || digitos.length > 11) return invalido;
        break;
      }
      case "email":
        if (valor.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(valor)) return invalido;
        break;
      case "escolha_unica":
        if (!c.opcoes?.includes(valor)) return invalido;
        break;
    }
    dados[c.id] = valor;
  }
  return { ok: true, dados };
}

/** Célula de CSV segura: escapa aspas e neutraliza fórmulas de planilha (=, +, -, @). */
export function celulaCsv(valor: unknown): string {
  let s = Array.isArray(valor) ? valor.join("; ") : typeof valor === "boolean" ? (valor ? "sim" : "não") : String(valor ?? "");
  if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
  return `"${s.replace(/"/g, '""')}"`;
}
