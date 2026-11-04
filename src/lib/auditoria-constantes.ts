// Sem dependências de servidor: usado também pela tela de auditoria.

export const TABELAS_AUDITADAS = {
  pessoas: "Pessoas",
  livros: "Livros",
  assentos: "Assentos",
  averbacoes: "Averbações",
  certidoes: "Certidões",
  respostas: "Respostas de inscrição",
  convites: "Convites",
  membros_paroquia: "Vínculo de contas",
} as const;
export type TabelaAuditada = keyof typeof TABELAS_AUDITADAS;

export const ACOES_AUDITADAS = {
  criar: "Criou",
  alterar: "Alterou",
  excluir: "Excluiu",
  emitir: "Emitiu",
  revogar: "Revogou",
  baixar: "Baixou",
  exportar: "Exportou",
  vincular: "Vinculou",
} as const;
export type AcaoAuditada = keyof typeof ACOES_AUDITADAS;
