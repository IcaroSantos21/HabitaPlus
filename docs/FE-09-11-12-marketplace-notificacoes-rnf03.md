# FE-09 / FE-11 / FE-12 — contratos e validação

Base de código analisada: `main`, commit `1dc43c9080bec01b261956555a5e29fad1361c02` (snapshot fornecido em 09/11/2026).

## FE-09 — Marketplace

### Fluxos

- Feed: busca textual, categoria (`MOVEIS`, `ELETRONICOS`, `UTENSILIOS`, `ESPORTE`, `OUTROS`), preço mínimo/máximo, status (`DISPONIVEL`/`VENDIDO`) e paginação do backend (`page`, `limit`).
- Meus anúncios: chama `GET /listings/mine`.
- Criar: `POST /listings` com `titulo`, `descricao`, `categoria`, `preco` e `imagemUrl` opcional.
- Editar/remover: `PATCH /listings/:id` e `DELETE /listings/:id`; ações de proprietário são renderizadas somente quando `vendedor.id` coincide com o usuário autenticado.
- Marcar vendido: `PATCH /listings/:id/status` com `{ status: "VENDIDO" }`; a badge muda otimisticamente e volta a buscar dados se a API falhar.
- Detalhe: chama `POST /listings/:id/view` antes de `GET /listings/:id`.
- Conversa: `GET /listings/:id/messages` e `POST /listings/:id/messages`. Para vendedor, a query/body inclui `usuarioId`/`destinatarioId` do comprador. Para comprador, a API identifica o vendedor.
- Polling da conversa: 10 segundos enquanto o detalhe/conversa estiver aberto.
- Inbox: `GET /messages/inbox`; abrir uma conversa retorna ao detalhe do anúncio e seleciona o comprador correspondente.
- Recomendação: `GET /residents/me/recommendations`; a seção só aparece para morador quando há itens. Falha/vazio não interrompe o feed.

## FE-11 — Notificações

- Contador do sino: `GET /notifications/unread-count` a cada 30 segundos.
- Dropdown: `GET /notifications?pagina=1&limite=5`.
- Página: `GET /notifications?pagina=N&limite=15`; filtro de não lidas usa `apenasNaoLidas=true`.
- Ações: `PATCH /notifications/:id/read` e `PATCH /notifications/read-all`.
- Navegação: `ANUNCIO` e `MENSAGEM` abrem marketplace; `COBRANCA` abre cobranças; `ALERTA` abre chamados.

## FE-12 — responsividade, estados e acessibilidade

Melhorias entregues neste pacote:

- Layout autenticado e páginas novas usam `min-w-0`, largura fluida e grids que colapsam em uma coluna no celular.
- Overflow horizontal fica contido: `Table` tem largura mínima com wrapper `overflow-x-auto`; tabelas das telas de cobranças, transações e locações já tinham wrapper equivalente no código-base.
- Modal respeita a altura da viewport e permite rolagem do conteúdo em dispositivos baixos.
- `index.css` define largura mínima de 320px, evita overflow horizontal da página e estabelece foco visível.
- Formulários novos usam campos rotulados, labels acessíveis e estados de erro.
- Marketplace, inbox e notificações contemplam carregando, vazio e erro; recomendações seguem o critério de simplesmente ocultar a seção em caso de erro/vazio.

### Checklist manual obrigatório antes do PR

Verificar o navegador com viewport **375 × 812** e **1280 × 800**:

- [ ] `/marketplace`: filtros empilham no celular; cards não ultrapassam a largura; paginação quebra linhas sem rolagem lateral da página.
- [ ] Marketplace: criar/editar anúncio; dono vê editar/remover; outro usuário não vê ações de dono.
- [ ] Marketplace: marcar vendido muda a badge imediatamente; abrir detalhe registra visualização.
- [ ] Conversa: mensagens chegam e a conversa atualiza após aproximadamente 10 segundos.
- [ ] `/messages`: inbox vazio, carregando, erro e conversas; card ocupa largura disponível no celular.
- [ ] `/notifications`: lista, filtro não lidas, marcar uma e marcar todas; texto longo quebra linha.
- [ ] Sino: contador muda após polling (até 30 segundos); dropdown cabe em 375px e não fica cortado.
- [ ] `/units`, `/rentals`, `/tickets`, `/charges`, `/transactions`, dashboards e `/login`: conferir menu mobile, modais, estados e foco.
- [ ] Tabelas: em 375px, a rolagem horizontal fica dentro do contêiner da tabela, nunca no body.
- [ ] Em 1280px, sidebar e conteúdo permanecem alinhados e sem colunas excessivamente estreitas.

Observação: o ambiente de preparação não conseguiu instalar as dependências npm devido à indisponibilidade de acesso ao registry. Os arquivos alterados passaram por parsing/transpilação sintática e verificação de imports relativos; lint/build completos devem ser confirmados localmente antes de criar o PR.
