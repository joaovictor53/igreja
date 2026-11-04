# Análise de funcionalidades: Paróquia Ativa

Levantamento das funcionalidades que o site **paroquiaativa.com.br** apresenta, para servir de referência ao seu sistema em desenvolvimento.

**De onde vêm as informações:** só do que um visitante vê, ou seja, as páginas públicas, as telas de entrar e recuperar senha, a política de privacidade, a apresentação em PDF e as capturas de tela do sistema que o site exibe. O sistema por dentro (depois do login) não foi acessado. O que aparece só nas imagens está marcado com 🖼️, e o que é dedução minha está marcado como *inferência*.

---

## 1. Visão geral do produto

- **O que é:** um sistema web para a secretaria paroquial, voltado a paróquias e áreas missionárias (inclusive as que têm várias comunidades).
- **Onde funciona:** no navegador, no computador e no celular. Pode ser instalado na tela inicial do celular, funcionando como aplicativo e com avisos (notificações). Não exige servidor na paróquia nem loja de aplicativos.
- **Público:** pároco, secretaria, coordenadores (catequese, ministérios, pastorais) e fiéis, cada um com permissões próprias.
- **Princípio:** os dados pertencem à paróquia e às funções, não a uma pessoa. Quando alguém sai da função, quem chega continua de onde parou.
- **Diferencial comercial:** implantação acompanhada (demonstração, cadastro inicial, treinamento e suporte pelo sistema e pelo WhatsApp).

---

## 2. Estrutura do menu do sistema 🖼️

Visto na barra lateral das capturas de tela:

| Grupo | Itens |
|---|---|
| (topo) | Início · Minha agenda |
| **Secretaria** | Agenda · Intenções de missa · Batizados e casamentos · Pedidos pastorais · Inscrições e formulários · Reserva de espaços · Tarefas |
| **Pessoas e pastoral** | Pessoas e famílias · Catequese (com submenu) · Escalas |
| (outros, vistos numa captura) | Financeiro · Ferramentas de PDF · Meu perfil |

O submenu da Catequese mostra: Turmas · Inscrições a matricular · Celebrações · Rematrícula · Indicadores 🖼️.

Na barra superior há busca, um sino de notificações com contador e o avatar do usuário 🖼️. Abaixo do menu aparecem o nome e o perfil do usuário (ex.: "Administrador (secretaria)") 🖼️.

---

## 3. Módulos e funcionalidades

### 3.1 Início (painel do dia)
- Saudação personalizada ("Boa tarde, Ana!"), a data e uma frase bíblica do dia, com a referência 🖼️.
- Cartões de números: eventos no mês (com variação percentual), intenções de missa, batizados e casamentos marcados e inscrições recebidas (com variação) 🖼️.
- **Agenda de hoje:** horário, título, local e quantidade de intenções por missa, com link "Ver agenda" 🖼️.
- **Tarefas da equipe:** com responsável e prazo, e as atrasadas marcadas como "Atrasada" ou "Hoje" 🖼️.
- **Pedidos para responder:** pedidos pastorais e inscrições com status ("Pendente", "Novas") 🖼️.
- O site resume assim: "o que acontece hoje, o que está atrasado e o que a comunidade pediu".

### 3.2 Intenções de missa
- Registro de cada intenção na **missa certa** (por data, horário e comunidade).
- **Tipos:** Falecidos, Ação de graças, Saúde, Aniversário e Outras intenções 🖼️.
- A tela é agrupada por celebração (ex.: "7h · Matriz · 5 intenções"), com as colunas **Tipo · Intenção (nomes) · Pedido por (nome e telefone) · Ações (editar e excluir)** 🖼️.
- Navegação por dia (anterior, próximo, seletor de data e "Hoje") 🖼️.
- Impressão: botão **"Imprimir"** em cada missa e **"Imprimir o dia"**, que gera a lista para o celebrante.
- Botões "+ Nova intenção" no geral e "+ Intenção" dentro de cada missa 🖼️.

### 3.3 Agenda
- Várias agendas: **da paróquia**, **da equipe** e **do pároco**, cada uma com uma cor 🖼️.
- Permissões: cada pessoa vê os compromissos conforme as suas permissões. **A agenda do padre só aparece para quem ele autorizar.**
- **Agenda pública:** os eventos públicos aparecem na página da paróquia, e o fiel pode **assiná-los no celular** (*inferência: um link de calendário para o celular, como ICS ou webcal*).
- Visão **Mês** e **Lista**, navegação por mês e "Hoje" 🖼️.
- Ações: "Imprimir" (com opções), "Minha agenda", "Agendas" (gerenciar) e "+ Novo evento" 🖼️.
- Filtro "Toque numa agenda para ver só ela" 🖼️.
- Destaques no calendário: datas especiais, como "Nossa Senhora Aparecida", e "Folga semanal" 🖼️.
- "Minha agenda" no menu: a agenda pessoal do usuário.

### 3.4 Escalas
- Ministérios e voluntários: leitores, ministros da Eucaristia, acólitos e coroinhas, música e acolhida.
- Cada ministério tem pessoas e **postos** (ex.: Leitores: 1ª leitura, Salmo, 2ª leitura; Música: Voz, Violão, Teclado; Acolhida: Porta principal, Porta lateral) 🖼️.
- Cadastro de um "Novo ministério" com Nome, Postos da escala (um por linha) e Observações 🖼️.
- **A escala do mês é montada a partir dos horários de missa.**
- **No celular ("Minhas escalas"):** cada voluntário vê os seus próximos compromissos (data, posto, missa e comunidade) e tem o botão **"Não posso nesse dia"**, que pede a troca 🖼️.
- **Lembrete na véspera** por notificação.
- O coordenador acompanha tudo ("Coordenar escalas") 🖼️.

### 3.5 Inscrições e pedidos (formulários)
- A secretaria cria formulários **a partir de modelos prontos**: catequese, crisma, retiro, "quero ajudar numa pastoral" e outros.
- Divulgação por **link ou QR Code**.
- As respostas chegam a uma **caixa de entrada, com aviso** (notificação).
- Cada formulário mostra o status (recebendo ou pausado), a quantidade de respostas e o período 🖼️.
- **Pedidos pastorais** vindos da página da paróquia: unção dos enfermos, bênção e conversa com o padre. **Os urgentes ficam destacados.**

### 3.6 Livros e certidões
- **Os livros físicos continuam sendo o registro oficial**; o sistema guarda o **índice digital**.
- Livros: batismo, primeira eucaristia, crisma, casamento e óbito.
- Dados do índice: **livro, folha e número do registro (termo)**.
- **Busca** pelo nome, pelo pai ou pela mãe.
- **Certidão** emitida pelo sistema **com QR Code**, para quem recebe conferir se ela é válida.

### 3.7 Catequese, pessoas e famílias
- **Catequese:** etapas, turmas por ano (ano catequético), catequistas e matrículas de crianças, jovens e adultos, além de **rematrícula**.
- A tela de turmas mostra os totais: turmas, catequizandos, com documento pendente, catequistas e inscrições a matricular 🖼️.
- Colunas da lista de turmas: turma/etapa, comunidade, encontros (dia e horário), catequistas, catequizandos (ocupados/vagas), frequência (%) e situação ("Em andamento") 🖼️.
- Ações: Filtrar, Rematrícula, Matricular e "+ Nova turma" 🖼️.
- Submenus: Celebrações e Indicadores 🖼️.
- **Pessoas e famílias:** cadastro por comunidade, ligado à família, com os **sacramentos já recebidos** e o **consentimento LGPD**.

### 3.8 Batizados e casamentos
- **Datas disponíveis** para agendar.
- **Curso de preparação.**
- **Checklist de documentos** de cada pedido.

### 3.9 Página da paróquia (site público)
- Apresentação, comunidades, horários de missa, notícias, **liturgia do dia** e **santo do dia**.
- **QR Code** para colocar na porta da igreja.
- Recebe inscrições e pedidos pastorais e mostra a agenda pública.

### 3.10 Reserva de espaços
- Salão e salas com **pedido de reserva**.
- **Aviso de conflito de horário.**

### 3.11 Tarefas da equipe
- Cada tarefa tem **responsável, prazo e checklist**.
- **O que atrasa aparece no Início.**

### 3.12 Avisos no celular (notificações)
- Lembretes de escala, novas inscrições e novos pedidos, direto na tela do celular.
- A política de privacidade explica que o aparelho guarda um "endereço técnico do serviço de notificação do navegador" (*inferência: notificações do navegador, usando o recurso de aplicativo instalável*).

### 3.13 Ferramentas de PDF e QR Code
- **PDF:** preencher, assinar, juntar e organizar páginas, sem instalar nada.
- **QR Code:** de link, WhatsApp, Wi-Fi e Pix, com **cartaz pronto para imprimir**.

### 3.14 Dízimo e financeiro (módulo opcional)
- Cadastro de dizimistas e contribuições.
- Contas, lançamentos e **fechamento do mês**.
- **Prestação de contas e repasse.**
- É opcional: quem já tem sistema financeiro fica só com a secretaria.

### 3.15 Suporte de TI (serviço)
- Chamados abertos pelo próprio sistema.
- Acesso remoto aos computadores da paróquia.
- Primeira resposta em até 8 horas úteis, equipamentos sem limite e só atendimento remoto.

---

## 4. Acesso, contas e segurança

### Tela de entrar
- E-mail e senha (obrigatórios), botão **mostrar senha**, **"Manter conectado"** (até 30 dias, segundo a privacidade) e link **"Esqueci minha senha"**.
- **Contas por convite:** "Recebeu um convite? Use o botão do e-mail para criar a sua senha". Não há cadastro aberto.
- Painel lateral (no computador): saudação conforme a hora, data, **Santo do dia** e **Evangelho do dia**, com a fonte da liturgia citada (Vatican News).
- No celular: o logo, a data e o santo do dia no topo.

### Recuperar senha
- O usuário informa o e-mail e recebe um link para criar uma nova senha.

### Instalação como aplicativo
- Aviso "Instale o Paróquia Ativa: acesso rápido pela tela inicial, em tela cheia", com o botão Instalar e o X para fechar.
- Janela própria "Instalar no iPhone ou iPad", com o passo a passo para o Safari, e janela "Confirmar ação" (vistas na estrutura da página).

### Permissões
- Acesso por e-mail e senha para cada pessoa da equipe.
- **Permissões por função, ajustáveis pela paróquia.**
- Coordenadores não têm acesso ao que não é da sua área.
- **Várias comunidades e áreas missionárias** numa mesma paróquia.

### Segurança e privacidade (LGPD)
- **Papéis da LGPD:** a paróquia ou organização é a **controladora** dos dados da comunidade e publica a própria política; o sistema é o **operador**.
- **Dados de quem usa o sistema:** nome, e-mail, telefone (opcional), perfil de acesso e preferências (tema e avisos).
- **Registro de ações (auditoria):** quem, quando e de qual endereço de rede, guardado por **24 meses**.
- **Aparelhos com avisos:** o endereço técnico de notificação é apagado quando a pessoa desliga os avisos, sai daquele aparelho ou tem o acesso desativado.
- **Cookies:** só os necessários (sessão, "lembrar-me" por até 30 dias e proteção dos formulários). Nenhum cookie de propaganda ou rastreamento.
- **Direitos do titular:** confirmação, cópia, correção e exclusão dos dados de acesso. Os dados da comunidade são atendidos pela secretaria de cada organização.
- **Medidas:** senhas guardadas de forma irreversível, conexão criptografada, limite de tentativas de acesso, cada perfil vê só o que precisa e cópias de segurança por até 7 dias.
- Consentimento LGPD nos cadastros de pessoas e famílias.

---

## 5. Site comercial (página inicial)

Seções, na ordem:
1. Topo com a chamada principal, os botões "Agendar uma demonstração" (WhatsApp) e "Ver a apresentação", e as telas do sistema no computador e no celular.
2. **O que muda no dia a dia:** cinco comparações de "antes → depois".
3. **O que a Paróquia Ativa faz:** os seis módulos principais com telas, mais "E ainda" (seis recursos) e o destaque do financeiro opcional.
4. **Cada pessoa com o que precisa:** os perfis Pároco, Secretaria, Coordenadores e Fiéis.
5. **Na secretaria ou onde você estiver:** tecnologia e segurança (quatro itens).
6. **Implantação:** quatro passos.
7. **Planos** (tabela abaixo).
8. **Perguntas frequentes** (seis perguntas, que abrem e fecham).
9. **Contato:** formulário mais WhatsApp e e-mail.
10. Rodapé: Apresentação · Privacidade · Entrar no sistema.

### Planos (mensal, por paróquia ou área missionária)
| Plano | Preço | Inclui | Usuários |
|---|---|---|---|
| Secretaria | R$ 149,00 | Agenda e intenções; batizados e casamentos; inscrições, formulários e reservas; pessoas, famílias, catequese e escalas; livros, certidões e tarefas; página da paróquia e ferramentas de PDF | até 5 |
| Gestão Paroquial | R$ 199,00 | Secretaria + dízimo (dizimistas e contribuições) + financeiro (contas, lançamentos, fechamento) + prestação de contas e repasse | até 5 |
| Completo | R$ 229,00 | Gestão Paroquial + suporte de TI remoto | até 8 |
| Secretaria + Suporte de TI | R$ 179,00 | Sem dízimo e sem financeiro | — |
| Suporte de TI avulso | R$ 99,00 | Só suporte de informática | até 3 |

### Formulário de contato (campos)
Nome* · Paróquia ou área missionária · Cidade · A paróquia pertence a* (Arquidiocese, Diocese, Prelazia ou "Outra / não sei") · Qual? · WhatsApp · E-mail (é preciso informar um dos dois) · Mensagem*. Tem um campo escondido contra robôs, proteção contra envio forjado e o aviso "Usamos estes dados só para responder ao seu contato".

### Perguntas frequentes (respostas vistas)
- Não precisa comprar computador nem servidor: funciona no navegador, e os dados ficam na nuvem.
- O livro de registro continua oficial: o sistema guarda o índice e emite a certidão.
- Os dados são da paróquia, que decide quem vê o quê.
- O financeiro é opcional: dá para manter o sistema financeiro atual.
- *(As respostas sobre "área missionária e várias comunidades" e "equipe com pouca familiaridade" não foram vistas abertas.)*

### Apresentação (`/apresentacao`)
Duas folhas A4 com botão "Baixar em PDF": a primeira com a proposta e os ganhos da secretaria; a segunda com o que o sistema faz (Secretaria, Pessoas e pastoral, Comunidade), o financeiro opcional, a implantação e o contato.

---

## 6. Design (referência visual)

| Uso | Valor |
|---|---|
| Azul-marinho principal | `#11264a` |
| Títulos | `#0b1b36` |
| Texto / secundário | `#1c2433` / `#5b6474` |
| Verde de destaque / verde-claro | `#1f9e7a` / `#38d6ac` |
| Fundo areia | `#f7f5ef` |
| Bordas | `#d4d7dd` |
| Azul das telas de acesso | `#1f6feb` |
| Fontes | Inter (textos) e serifada Iowan Old Style / Palatino (títulos) |
| Cantos | 10 px (botões e campos), 12 px (molduras), 14 px (cartões) |
| Largura do conteúdo | 1160 px (820 px nas perguntas e no contato) |

Responsivo: no tablet e no celular as colunas empilham, o menu do topo some (fica só "Entrar") e os planos passam a um por linha. As telas de acesso mostram o painel azul só no computador.

---

## 7. Sugestões para o seu sistema (*inferências*)

Pontos que o site promete e que costumam exigir atenção técnica:
- **Agenda pública assinável:** gerar um link de calendário (ICS) por agenda pública.
- **Certidão com QR Code:** uma página pública de conferência que valide um código único da certidão.
- **Escala a partir dos horários de missa:** cadastro dos horários fixos de missa por comunidade, para gerar as vagas da escala do mês.
- **Pedido de troca de escala:** fluxo de "não posso" → aviso ao coordenador → substituto.
- **Notificações:** aplicativo instalável com notificações do navegador.
- **Multicomunidade:** quase todos os cadastros (missas, turmas, pessoas, agenda) ligados a uma comunidade.
- **Auditoria de 24 meses e backups de 7 dias**, como promete a política de privacidade.

---

*Observação: a réplica que montei na pasta app tem algumas destas telas funcionando só como demonstração (login de teste, intenções de missa e agenda, com os dados guardados no navegador). Ela não precisa ser usada no seu sistema.*
