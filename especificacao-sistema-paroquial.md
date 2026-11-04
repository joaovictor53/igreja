# Sistema de Gestão Paroquial — Especificação de Desenvolvimento

> Documento de referência para construir um SaaS de secretaria paroquial (escopo inspirado no Paróquia Ativa).
> Status: **rascunho v0.1** — premissas marcadas com ⚠️ precisam ser validadas.

---

## 1. Visão geral

**O que é:** um sistema web multi-paróquia (SaaS) que organiza a rotina da secretaria paroquial e dá à comunidade um canal único de informação e pedidos.

**Problema que resolve:**

| Hoje | Com o sistema |
|---|---|
| Intenções anotadas em caderno no balcão | Intenções registradas por missa, lista impressa para o celebrante |
| Escala em planilha + grupo de WhatsApp | Escala no celular, lembrete na véspera, troca com aprovação |
| Telefone tocando para saber horário | Página pública com horários, agenda e QR Code |
| Busca manual em livros de registro | Índice digital pesquisável, certidão com QR Code validável |
| Fichas de catequese em papel | Turmas e matrículas ligadas ao cadastro da família |

**Usuários:** pároco, secretaria, coordenadores de pastoral, catequistas, voluntários escalados e fiéis.

### 1.1 Não-objetivos (fora do escopo do MVP)

- **Módulo financeiro / dízimo / contabilidade** — integrar ou coexistir, não substituir.
- **Substituir o livro de registro oficial** — o sistema é índice e emissor de certidão; o livro físico continua sendo o documento canônico.
- **App nativo** — PWA atende computador e celular sem instalação.
- **Doações online / gateway de pagamento.**

---

## 2. Premissas ⚠️

1. Cada paróquia é um *tenant*. Uma paróquia pode ter várias **comunidades** (capelas, áreas missionárias).
2. Escala inicial: até ~100 paróquias, cada uma com até ~5.000 pessoas cadastradas e ~300 usuários ativos.
3. Equipe da secretaria com baixa familiaridade com tecnologia → UX simples, poucos cliques, impressão como cidadã de primeira classe.
4. Conexão instável em parte das comunidades (interior do Amazonas) → páginas leves, PWA com cache de leitura.
5. Notificações por **e-mail + Web Push** no MVP; WhatsApp como fase posterior (custo da API oficial).
6. Operação em português (pt-BR), fuso `America/Manaus` configurável por paróquia.

---

## 3. Perfis e permissões

Controle de acesso por **papel dentro da paróquia** (um usuário pode ter papéis diferentes em paróquias diferentes).

| Papel | Acesso |
|---|---|
| **Admin da paróquia** (pároco ou secretário-chefe) | Tudo da paróquia, configurações, usuários |
| **Pároco** | Agenda privada, pedidos pastorais, intenções, livros, aprovações |
| **Secretaria** | Intenções, agenda, livros, certidões, inscrições, cadastros, reservas |
| **Coordenador** | Escalas e membros da sua pastoral/ministério, formulários da pastoral |
| **Catequista** | Suas turmas, chamada, contato das famílias da turma |
| **Membro escalado** | Ver a própria escala, pedir/aceitar troca |
| **Fiel (público)** | Página da paróquia, agenda pública, formulários, pedidos |
| **Super admin (plataforma)** | Gestão de tenants, suporte (acesso auditado) |

Regras:
- Permissões checadas **no servidor** em toda action/rota (nunca só na UI).
- Coordenador vê apenas os dados da(s) pastoral(is) que coordena.
- Agenda do pároco: visível só para quem ele autorizar explicitamente.

---

## 4. Módulos e requisitos funcionais

### 4.1 Cadastros base

- **Paróquia:** nome, CNPJ, diocese/arquidiocese/prelazia, endereço (ViaCEP), contatos, logo, fuso.
- **Comunidades:** nome, endereço, responsável.
- **Pessoas:** nome, data de nascimento, contatos, comunidade, sacramentos recebidos (data/local).
- **Famílias:** agrupamento de pessoas com responsáveis.
- **Pastorais/ministérios:** nome, coordenadores, membros.

### 4.2 Horários e celebrações

- **Horário recorrente** (ex.: domingo 7h, Comunidade X) → gera **celebrações** (ocorrências concretas) para os próximos N meses.
- Celebração avulsa (festa, missa de 7º dia).
- Cancelar/alterar uma ocorrência sem afetar a recorrência.

### 4.3 Intenções de missa

- Registrar intenção: celebração, tipo (falecido, ação de graças, saúde, aniversário, outras), texto, solicitante, contato.
- Busca por nome e por período.
- **Lista de intenções por celebração** em formato de impressão (A4 e A5), agrupada por tipo.
- Limite opcional de intenções por celebração (aviso ao atingir).
- Mover intenção para outra celebração (com registro no histórico).

### 4.4 Agenda

- Várias agendas por paróquia: **Pública**, **Pároco**, **Secretaria**, por pastoral.
- Eventos: título, local/espaço, início/fim, recorrência (RRULE), visibilidade.
- Celebrações aparecem automaticamente na agenda pública.
- **Feed iCal** (`.ics`) da agenda pública para o fiel assinar no celular.
- Agenda do pároco: compartilhamento por usuário.

### 4.5 Escalas

- **Funções:** leitor, salmista, ministro da Eucaristia, acólito, música, acolhida (configuráveis).
- **Modelo de escala:** quais funções e quantas vagas por tipo de celebração.
- **Geração do mês:** a partir das celebrações + disponibilidade declarada dos membros, com distribuição equilibrada (ver §7.2). O coordenador revisa antes de publicar.
- Membro vê "minhas escalas" no celular.
- **Lembrete** na véspera (push/e-mail).
- **Troca:** membro pede troca → outros da mesma função são notificados → quem aceita assume → coordenador é avisado (aprovação opcional por pastoral).
- Escala impressa por celebração e por mês.

### 4.6 Inscrições (formulários)

- Construtor de formulário simples a partir de **modelos** (catequese, crisma, retiro, voluntariado).
- Tipos de campo: texto, texto longo, data, telefone, e-mail, escolha única/múltipla, CEP, aceite (consentimento).
- Link público + **QR Code** gerado.
- Período de abertura/encerramento e limite de vagas.
- **Caixa de entrada** de respostas com status (nova, em análise, aceita, recusada) e notificação.
- Converter resposta em cadastro de pessoa/matrícula.
- Exportar CSV.

### 4.7 Pedidos pastorais

- Formulário público para: **unção dos enfermos**, bênção (casa, empresa), conversa com o padre, confissão agendada.
- Campo de **urgência** → pedidos urgentes destacados e notificados imediatamente ao pároco.
- Atribuir pedido a padre/diácono, status e histórico.

### 4.8 Livros de registro e certidões

- **Livros:** tipo (batismo, 1ª eucaristia, crisma, casamento, óbito), número, período.
- **Assentos:** livro, folha, termo, data, celebrante, pessoas envolvidas (batizando, pais, padrinhos, cônjuges…), observações e **averbações** (anotações marginais, ex.: casamento posterior).
- Busca por nome, nome do pai, nome da mãe, data — com tolerância a acentos e grafias (`unaccent` + `pg_trgm`).
- **Emissão de certidão em PDF** a partir de modelo da paróquia, com:
  - código único + **QR Code** apontando para `/validar/{codigo}`;
  - página pública de validação mostrando apenas dados mínimos (tipo, data de emissão, nome, paróquia, válida/revogada).
- Revogar certidão emitida com erro.
- Digitação em lote (tela otimizada para transcrever livros antigos).

### 4.9 Catequese

- **Etapas** (ex.: Pré-eucaristia, Eucaristia, Perseverança, Crisma, Catecumenato de adultos).
- **Turmas** por ano/etapa/comunidade, com catequistas.
- **Matrículas** de crianças, jovens e adultos, ligadas à família.
- Chamada/frequência por encontro.
- Ao concluir a etapa sacramental, registrar o sacramento na pessoa (e sugerir assento no livro).
- **Consentimento LGPD** do responsável obrigatório para menores (ver §6).

### 4.10 Batizados e casamentos (processos)

- Datas disponíveis configuradas pela paróquia.
- Pedido → **checklist de documentos** (certidões, curso de preparação, documentos dos padrinhos etc.) → agendamento → realização → assento no livro.
- Turmas de curso de preparação (pais/padrinhos, noivos) com presença.

### 4.11 Página pública da paróquia

- Rota `/{slug-da-paroquia}` com: apresentação, comunidades, horários de missa e confissão, agenda pública, notícias, formulários abertos, contato.
- **Liturgia e santo do dia** ⚠️ (ver §8 — verificar fonte e licença do conteúdo).
- QR Code para imprimir e colar na porta da igreja.
- SEO básico: meta tags, Open Graph, JSON-LD `Church`.

### 4.12 Reserva de espaços

- Espaços: salão, salas, com capacidade.
- Pedido de reserva → aprovação da secretaria.
- **Detecção de conflito** de horário (inclusive com eventos da agenda).

### 4.13 Tarefas da equipe

- Tarefa com responsável, prazo, checklist, comentários.
- Visão "minhas tarefas" e quadro por status.

### 4.14 Transversais

- **Auditoria:** quem criou/alterou/excluiu registros sensíveis (livros, certidões, pessoas).
- **Notificações:** central in-app + push + e-mail, com preferências por usuário.
- **Importação** de planilhas (pessoas, assentos) com pré-visualização e validação.
- **Exportação** completa dos dados da paróquia (a paróquia é dona dos dados).

---

## 5. Requisitos não-funcionais

| Área | Requisito |
|---|---|
| Performance | Páginas públicas < 100 KB de HTML/CSS; TTFB < 500 ms; listas paginadas no servidor |
| Disponibilidade | 99,5% mensal; backup diário com retenção de 30 dias; teste de restauração mensal |
| Mobile | PWA instalável, layout mobile-first para escalas, agenda e pedidos |
| Acessibilidade | WCAG 2.1 AA nas telas públicas; fonte grande e alto contraste opcionais |
| Impressão | CSS de impressão dedicado para listas e escalas |
| Segurança | CSP restritiva, HSTS, rate limit em formulários públicos, honeypot, 2FA opcional para admins |
| Observabilidade | Logs estruturados, rastreamento de erros, métricas de jobs |

---

## 6. LGPD — atenção especial

Dados de **convicção religiosa são dados pessoais sensíveis** (LGPD, art. 5º, II), e o sistema trata dados de **menores** (art. 14). Isso exige:

- **Base legal** documentada por finalidade (ex.: art. 11, II, "d" — exercício regular de direitos; consentimento específico onde couber).
- **Consentimento do responsável legal** para catequizandos menores, registrado com data, versão do termo e quem consentiu.
- **Minimização:** página de validação de certidão e listas públicas expõem o mínimo necessário.
- **Contrato de operador** (plataforma) × **controlador** (paróquia/mitra) e política de privacidade.
- Direitos do titular: acesso, correção, exportação; exclusão quando não houver obrigação de guarda (assentos sacramentais têm regime próprio — **validar com a cúria** ⚠️).
- Criptografia em trânsito e em repouso; acesso de suporte auditado.
- Registro de operações de tratamento (ROPA) simples por módulo.

---

## 7. Arquitetura

### 7.1 Stack

| Camada | Escolha |
|---|---|
| Framework | **Next.js (App Router)** com Server Components e Server Actions |
| Banco | **PostgreSQL** (extensões `unaccent`, `pg_trgm`, `citext`) |
| ORM | **Drizzle ORM** + drizzle-kit (migrations) |
| Autenticação | **better-auth** (e-mail/senha, magic link, plugin de organizations para papéis por paróquia) |
| UI | Tailwind CSS + componentes acessíveis (shadcn/ui ou equivalente) |
| Validação | Zod (compartilhado entre formulário e servidor) |
| PDF | `@react-pdf/renderer` para certidões e listas |
| QR Code | `qrcode` (geração server-side em SVG) |
| Jobs / agendamentos | Worker separado com fila em Postgres (`pg-boss`) para lembretes, geração de ocorrências e e-mails |
| E-mail | Provedor transacional (Resend, SES ou similar) |
| Push | Web Push (VAPID) via service worker |
| Arquivos | Storage S3-compatível (Cloudflare R2) para logos, anexos de checklist |
| Deploy | **Railway** (app + worker + Postgres) |
| Erros | Sentry ou equivalente |

### 7.2 Componentes

```
┌─────────────┐     ┌──────────────────────────────┐     ┌────────────┐
│  Navegador  │────▶│  Next.js (web)               │────▶│ PostgreSQL │
│  / PWA      │◀────│  - páginas públicas (SSR)    │◀────│  + RLS     │
└─────────────┘     │  - painel (RSC + actions)    │     └─────┬──────┘
                    │  - /api/ics, /validar/:code  │           │
                    └──────────────┬───────────────┘           │
                                   │ enfileira jobs            │
                              ┌────▼─────┐                     │
                              │  Worker  │─────────────────────┘
                              │ pg-boss  │──▶ E-mail / Web Push
                              └──────────┘
```

### 7.3 Multi-tenancy

- Toda tabela de domínio tem `paroquia_id`.
- Camada de acesso a dados recebe o tenant do contexto da sessão (nunca do cliente).
- **Row Level Security** no Postgres como defesa em profundidade: `SET app.paroquia_id` por transação + policies.
- Slug público por paróquia (`/{slug}`) e, futuramente, domínio próprio.

### 7.4 Algoritmo de geração de escala (MVP)

1. Para cada celebração do mês, obter vagas por função (modelo de escala).
2. Candidatos = membros da função, disponíveis naquele dia/horário/comunidade, sem bloqueio de datas.
3. Ordenar candidatos por: menos escalações no mês → maior tempo desde a última → desempate aleatório com seed fixa (reprodutível).
4. Respeitar restrições: máx. N vezes por mês, não repetir no mesmo dia, preferência de comunidade.
5. Vagas não preenchidas ficam marcadas para o coordenador completar manualmente.
6. Rascunho → revisão → **publicar** (só então notifica).

### 7.5 Estrutura de pastas sugerida

```
src/
  app/
    (public)/[slug]/            # página pública da paróquia
    (public)/validar/[codigo]/  # validação de certidão
    (public)/f/[formId]/        # formulários públicos
    (app)/painel/               # área logada
      intencoes/ agenda/ escalas/ inscricoes/ pedidos/
      livros/ certidoes/ catequese/ processos/ espacos/ tarefas/
      configuracoes/
    api/ics/[agendaId]/route.ts
  db/
    schema/                     # um arquivo por módulo (Drizzle)
    migrations/
    rls.sql
  server/
    auth/                       # better-auth + checagem de papéis
    modules/<modulo>/           # actions, queries, regras de negócio
  jobs/                         # handlers do worker (pg-boss)
  pdf/                          # templates de certidão e listas
  lib/                          # zod, datas, qr, notificações
worker/index.ts
```

---

## 8. Integrações externas

| Integração | Uso | Observação |
|---|---|---|
| ViaCEP | Autopreencher endereço | Gratuita; tratar indisponibilidade |
| Liturgia diária / santo do dia | Página pública | ⚠️ Textos litúrgicos têm direitos autorais (tradução oficial). Verificar licença ou usar apenas link/resumo |
| Calendário litúrgico | Cor, tempo e solenidades na agenda | Pode ser calculado localmente (Páscoa e datas móveis) |
| WhatsApp Business API | Lembretes (fase 3) | Custo por conversa; exige templates aprovados |

---

## 9. Modelo de dados (resumo)

Todas as tabelas de domínio têm `id (uuid)`, `paroquia_id`, `created_at`, `updated_at`, `created_by`.

**Organização e acesso**
- `paroquias` (slug, nome, cnpj, jurisdicao_tipo, jurisdicao_nome, fuso, config jsonb)
- `comunidades` (nome, endereco, responsavel_pessoa_id)
- `usuarios`, `sessoes` (better-auth)
- `membros_paroquia` (usuario_id, papel, pessoa_id)
- `pastorais`, `pastoral_membros` (pessoa_id, pastoral_id, coordenador bool)

**Pessoas**
- `pessoas` (nome, nome_busca, nascimento, sexo, telefone, email, comunidade_id, familia_id)
- `familias` (nome, endereco)
- `sacramentos_pessoa` (pessoa_id, tipo, data, local, assento_id null)
- `consentimentos` (pessoa_id, responsavel_pessoa_id, finalidade, versao_termo, aceito_em, revogado_em)

**Celebrações e intenções**
- `horarios_recorrentes` (comunidade_id, rrule, tipo, duracao)
- `celebracoes` (horario_id null, comunidade_id, inicio, tipo, status, celebrante)
- `intencoes` (celebracao_id, tipo, texto, solicitante_nome, solicitante_contato)

**Agenda**
- `agendas` (nome, visibilidade: publica | privada | restrita)
- `agenda_acessos` (agenda_id, usuario_id, permissao)
- `eventos` (agenda_id, titulo, inicio, fim, rrule, espaco_id, celebracao_id null)

**Escalas**
- `funcoes_escala` (nome, pastoral_id)
- `modelos_escala` (tipo_celebracao, funcao_id, vagas)
- `disponibilidades` (pessoa_id, dia_semana, horario, comunidade_id) + `bloqueios` (pessoa_id, de, ate)
- `escalas` (mes, pastoral_id, status: rascunho | publicada)
- `escala_itens` (escala_id, celebracao_id, funcao_id, pessoa_id, confirmado)
- `trocas` (escala_item_id, solicitante_id, substituto_id, status)

**Formulários e pedidos**
- `formularios` (titulo, campos jsonb, abre_em, fecha_em, limite, modelo_origem)
- `respostas` (formulario_id, dados jsonb, status, pessoa_id null)
- `pedidos_pastorais` (tipo, urgente, descricao, endereco, contato, atribuido_a, status)

**Livros e certidões**
- `livros` (tipo, numero, inicio, fim)
- `assentos` (livro_id, folha, termo, data, celebrante, dados jsonb, texto_busca tsvector)
- `assento_pessoas` (assento_id, pessoa_id null, papel: batizando | pai | mae | padrinho | conjuge…, nome)
- `averbacoes` (assento_id, data, texto)
- `certidoes` (assento_id, codigo unique, emitida_em, emitida_por, finalidade, revogada_em, hash_pdf)

**Catequese e processos**
- `etapas_catequese`, `turmas` (etapa_id, ano, comunidade_id), `turma_catequistas`
- `matriculas` (turma_id, pessoa_id, status), `encontros`, `presencas`
- `processos_sacramentais` (tipo: batismo | casamento, data_prevista, status) + `checklist_itens`

**Outros**
- `espacos`, `reservas` (espaco_id, inicio, fim, status) — constraint de exclusão com `tstzrange` para impedir sobreposição
- `tarefas`, `tarefa_checklist`, `comentarios`
- `noticias` (titulo, corpo, publicada_em)
- `notificacoes`, `push_subscriptions`
- `auditoria` (tabela, registro_id, acao, antes jsonb, depois jsonb, usuario_id, em)

---

## 10. Roadmap

### Fase 1 — MVP (≈ 8–10 semanas)
- Auth, paróquias, comunidades, usuários e papéis
- Pessoas e famílias
- Horários → celebrações
- **Intenções** com impressão
- **Agenda** pública + iCal
- **Página pública** da paróquia com QR Code
- **Escalas** (geração, publicação, lembrete por e-mail)

### Fase 2
- Trocas de escala + Web Push
- Formulários de inscrição e pedidos pastorais
- **Livros, assentos e certidões** com QR de validação
- Importação de planilhas
- Auditoria completa

### Fase 3
- Catequese (turmas, matrículas, frequência, consentimentos)
- Processos de batizado e casamento com checklist
- Reserva de espaços e tarefas
- Notícias, liturgia do dia
- Lembretes por WhatsApp

### Fase 4
- Painel da diocese (visão agregada, opcional e consentida)
- Domínio próprio por paróquia
- Relatórios (sacramentos por ano, participação em escalas)

---

## 11. Estratégia de testes

- **Unitários** (Vitest): regras de negócio — geração de escala, conflitos de reserva, permissões.
- **Integração**: queries Drizzle contra Postgres real (container), incluindo testes de **RLS** (usuário de uma paróquia não enxerga a outra).
- **E2E** (Playwright): fluxos críticos — registrar intenção e imprimir; publicar escala; trocar escala; emitir e validar certidão.
- **Carga leve** nas páginas públicas e no endpoint de validação.

---

## 12. Registro de decisões

| # | Decisão | Alternativas | Motivo |
|---|---|---|---|
| D1 | Monolito Next.js + worker separado | Microsserviços; NestJS + SPA | Equipe pequena, stack já dominada, menos infraestrutura |
| D2 | Multi-tenant com `paroquia_id` + RLS | Schema por tenant; banco por tenant | Simples de migrar e operar; RLS evita vazamento entre paróquias |
| D3 | PWA em vez de app nativo | React Native / Flutter | Sem loja, sem instalação, atualização instantânea |
| D4 | Fila em Postgres (pg-boss) | Redis + BullMQ; cron do provedor | Um serviço a menos; volume baixo de jobs |
| D5 | Certidão validada por código + página pública | Assinatura digital ICP-Brasil | Suficiente para conferência; ICP pode vir depois se exigido |
| D6 | Livro físico continua oficial | Registro 100% digital | Exigência canônica; reduz resistência da adoção |
| D7 | Sem módulo financeiro | Financeiro integrado | Foco; paróquias já usam outras soluções |

---

## 13. Questões em aberto

1. A cúria/arquidiocese exige modelo padronizado de certidão? Há regras de quem pode emitir?
2. Política de guarda e exclusão de dados sacramentais diante da LGPD.
3. Modelo de cobrança: por paróquia, por porte, ou convênio com a diocese?
4. Fonte licenciada para liturgia diária.
5. Paróquias precisam funcionar **offline** para digitação (comunidades sem internet)?
6. WhatsApp é requisito para adoção já no MVP?
7. Haverá visão diocesana? Se sim, quais dados podem ser agregados?
