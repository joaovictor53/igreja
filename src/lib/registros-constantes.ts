// Constantes sem dependências de servidor: podem ser importadas por componentes de cliente.

export const TIPOS_LIVRO = ["batismo", "eucaristia", "crisma", "casamento", "obito"] as const;
export const PAPEIS_ASSENTO = ["principal", "conjuge", "pai", "mae", "padrinho", "madrinha", "testemunha"] as const;

export const NOMES_TIPO = {
  batismo: "Batismo",
  eucaristia: "Primeira Eucaristia",
  crisma: "Crisma",
  casamento: "Casamento",
  obito: "Óbito",
} as const satisfies Record<(typeof TIPOS_LIVRO)[number], string>;

export const NOMES_PAPEL = {
  principal: "Pessoa registrada",
  conjuge: "Cônjuge",
  pai: "Pai",
  mae: "Mãe",
  padrinho: "Padrinho",
  madrinha: "Madrinha",
  testemunha: "Testemunha",
} as const satisfies Record<(typeof PAPEIS_ASSENTO)[number], string>;

export type TipoRegistro = (typeof TIPOS_LIVRO)[number];
export type PapelAssento = (typeof PAPEIS_ASSENTO)[number];
