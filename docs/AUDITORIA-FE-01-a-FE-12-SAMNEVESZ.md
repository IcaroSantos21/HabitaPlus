# HabitaPlus — auditoria FE-01 a FE-12

**Responsável analisado:** `samnevesz`
**Repositório:** https://github.com/IcaroSantos21/HabitaPlus
**Escopo do código:** ZIP recebido nesta conversa, correspondente ao commit `a8301419145a588ba4bef9c30ac99277704813bd` (`feat: conexão SSL com o Postgres para o deploy no Neon (#106)`).
**Data da consulta ao GitHub:** 10/11/2026.

> Esta auditoria compara os critérios das Issues com o código presente no ZIP. O status “Closed” do GitHub não é, isoladamente, uma prova de que todos os critérios foram cumpridos. As correções listadas neste documento estão incluídas no pacote desta entrega quando indicadas como “corrigido neste pacote”.

## 1. Resultado das Issues atribuídas

A atividade do GitHub mostra `samnevesz` como responsável pelas Issues FE-01 até FE-12. No momento da consulta, FE-01 a FE-09 e FE-11/FE-12 estavam encerradas; FE-10 (#52) permanecia aberta.

| Issue | Descrição | Status no GitHub | Resultado da revisão do ZIP |
|---|---|---|---|
| [FE-01 #43](https://github.com/IcaroSantos21/HabitaPlus/issues/43) | Setup React, Vite, Tailwind e estrutura | Closed | Estrutura e configuração presentes. Sem correção necessária neste pacote. |
| [FE-02 #44](https://github.com/IcaroSantos21/HabitaPlus/issues/44) | Biblioteca de componentes reutilizáveis | Closed | Componentes existem; o catálogo `ComponentsCatalog.jsx` não tinha rota em `App.jsx`. **Rota `/dev/components` adicionada neste pacote.** |
| [FE-03 #45](https://github.com/IcaroSantos21/HabitaPlus/issues/45) | Axios, serviços, mocks, autenticação e rotas protegidas | Closed | Cliente Axios, serviços e MSW presentes. Havia páginas gerenciais acessíveis por URL sem checagem explícita de perfil. **Guard `RequireRole` e restrições de perfil adicionados neste pacote.** |
| [FE-04 #46](https://github.com/IcaroSantos21/HabitaPlus/issues/46) | Login e cadastro | Closed | Login e cadastro de morador existem na mesma tela, alternados pelo botão “Cadastre-se”. Documentação corrigida para não afirmar que existe uma rota `/cadastro` independente. |
| [FE-05 #47](https://github.com/IcaroSantos21/HabitaPlus/issues/47) | Dashboards de síndico e morador | Closed | Dashboard do morador enviava `limit` para cobranças e comunicados, mas a API atual espera `pagina`/`limite`; comunicados também usavam `/v1/announcements`, rota inexistente no controller atual. **Serviços, chamadas e mock de comunicados corrigidos neste pacote.** |
| [FE-06 #48](https://github.com/IcaroSantos21/HabitaPlus/issues/48) | Unidades, moradores e locações | Closed | Páginas, serviços e componentes correspondentes estão presentes. Não alterados neste pacote para reduzir risco em uma funcionalidade já encerrada. |
| [FE-07 #49](https://github.com/IcaroSantos21/HabitaPlus/issues/49) | Chamados e manutenção | Closed | Página, serviços, histórico e mock de chamados estão presentes. O fluxo de criação pelo chatbot foi completado no mock neste pacote. |
| [FE-08 #50](https://github.com/IcaroSantos21/HabitaPlus/issues/50) | Financeiro e Stripe | Closed | Página de cobranças e retorno de pagamento estão presentes. Não alterados neste pacote. O link de pagamento do mock do chatbot é explicitamente fictício. |
| [FE-09 #51](https://github.com/IcaroSantos21/HabitaPlus/issues/51) | Marketplace | Closed | Marketplace, recomendações e mensagens estão presentes no snapshot. Não alterados neste pacote. |
| [FE-10 #52](https://github.com/IcaroSantos21/HabitaPlus/issues/52) | Chat do assistente | **Open** | O widget original não oferecia chips, renderização dos dados estruturados e ficava montado dentro do layout autenticado. **Implementação complementada neste pacote.** |
| [FE-11 #53](https://github.com/IcaroSantos21/HabitaPlus/issues/53) | Notificações e alertas | Closed | Sino, contador, página e serviços de notificações estão presentes. Não alterados neste pacote. |
| [FE-12 #54](https://github.com/IcaroSantos21/HabitaPlus/issues/54) | Responsividade, estados e acabamento | Closed | Havia largura limitada e sidebar com altura fixa na estrutura autenticada. **Grade fluida, sidebar de altura natural e limites responsivos do chatbot ajustados neste pacote.** |

## 2. O que foi corrigido

### FE-10 — Chatbot

- O widget é montado fora do conteúdo das rotas autenticadas, preservando seu estado ao navegar entre módulos.
- Botão flutuante para abrir e fechar o chat.
- Histórico da conversa durante a sessão atual da interface.
- Campo de mensagem e indicador animado “digitando”.
- Chips com as três sugestões pedidas na Issue: “Ver apartamentos disponíveis”, “Abrir chamado” e “Segunda via do boleto”.
- Renderização de `data.unidades`, `data.paymentUrl`, `data.chamadoId`, `data.chamados`, `data.cobrancas` e `data.regras` quando esses dados são retornados pelo backend.
- Link externo de pagamento validado para aceitar somente `http`/`https`.
- Mensagens amigáveis para sessão expirada, indisponibilidade e falhas inesperadas.
- Mock por intenção para apartamentos, boleto e acompanhamento de chamados.
- O mock agora mantém o contexto de abertura de chamado: pergunta o local, depois o equipamento e registra um chamado demonstrativo.
- Também havia uma falha na integração real BE-15: o schema NLU não entrega a entidade `local`, embora o serviço NestJS dependesse dela; respostas curtas como “garagem” poderiam ser classificadas como fora de escopo e encerrar a conversa. O serviço de chatbot agora extrai local/equipamento do texto quando necessário e encaminha respostas curtas para o contexto pendente; foi incluído teste unitário para o fluxo completo.
- O link de pagamento do mock aponta para `example.com` e informa que é apenas demonstração; não processa pagamento real.

### Integrações e permissões relacionadas

- `announcementsService` usa `/announcements`, compatível com o prefixo global `/api` do backend.
- Dashboard do morador usa `chargesService.listMine({ pagina: 1, limite: 10 })` e comunicados com `{ pagina: 1, limite: 5 }`.
- MSW recebe chamadas de `/api/announcements` e usa os mesmos nomes de paginação.
- Rotas de `/units`, `/rentals` e `/transactions` exigem perfil síndico ou administrador; `/morador`, `/sindico` e `/admin` exigem os respectivos perfis.
- A rota `/dev/components` agora abre o catálogo que já existia no código.
- README esclarece que o cadastro é uma alternância dentro de `/login`, e não uma rota separada.

### Responsividade e espaços

- O layout autenticado passa a usar uma grade fluida com área de conteúdo `minmax(0, 1fr)` e largura máxima maior (`screen-2xl`).
- A sidebar deixa de reservar uma altura fixa equivalente à janela inteira; em telas grandes, fica sticky e rola internamente quando necessário.
- Áreas de conteúdo podem encolher sem forçar largura horizontal (`min-w-0`).
- Chatbot usa `dvh` e largura baseada no viewport, de modo que o painel se ajusta quando o zoom reduz a área útil do navegador.

O ajuste reduz as causas estruturais de desalinhamento e espaços laterais excessivos. Não é possível garantir que cada tela fique perfeita em todo zoom/resolução sem executar o sistema em navegador e comparar com capturas reais das telas usadas na apresentação.

## 3. Verificações executadas nesta entrega

- Sintaxe dos arquivos JS/JSX e dos dois arquivos TypeScript do backend alterados foi verificada com o parser TypeScript: sem erros de parsing.
- Imports relativos dos arquivos alterados foram verificados: nenhum destino local ausente.
- `node --check` passou para `handlers.js` e `announcementsService.js`.
- **Não foi possível executar `npm ci`, `npm run lint` ou `npm run build` neste ambiente.** A instalação de dependências excedeu o tempo disponível e deixou apenas uma pasta `node_modules` parcial. Essa pasta não foi incluída no ZIP.
- Foi adicionado teste unitário NestJS para o fluxo conversacional de abertura de chamado, mas a suíte Jest não foi executada neste ambiente.
- Não foi executado teste visual em navegador, teste integrado contra backend real ou teste de pagamento.

Portanto, há verificações estáticas aprovadas, mas a validação final de build e de execução precisa ser feita no computador de desenvolvimento com Node.js 24 e as dependências instaladas.

## 4. Itens encontrados fora do escopo da FE-10

Estes itens foram observados na transcrição técnica do ZIP e devem ser tratados em Issues/PRs próprios. Não foram incluídos neste pacote para evitar misturar alterações de backend/infraestrutura à entrega do chatbot:

1. `ml-service/.venv/` e `ml-service/.venv-backup/` aparecem versionados no snapshot; a primeira pasta contém milhares de dependências instaladas para Windows. A regra `.gitignore` não remove arquivos já rastreados. A limpeza exige um commit separado com `git rm --cached` e regras de ignore.
2. `docker-compose.yml` referencia `backend/.env`, enquanto o guia principal orienta copiar o `.env.example` da raiz; é preciso unificar a convenção de variáveis e encaminhar Stripe/`DB_SSL` ao container.
3. `DB_SSL=true` no exemplo da raiz pode não funcionar com o PostgreSQL local do Compose sem TLS; o valor deve variar por ambiente.
4. `forecastsService.js` e `nluService.js` ainda fazem referência a contratos `/v1` que não correspondem a rotas públicas atuais do backend, e não têm uso encontrado nas páginas atuais.
5. `docs/api-contracts.md` contém contratos antigos e atuais misturados. Recomenda-se consolidá-lo em uma Issue documental.
6. Há divergência de requisito de Node entre documentos/Dockerfiles; o frontend README exige Node 24.

## 5. Próxima validação no Windows

Valide o backend alterado e depois o frontend. Dentro de `backend/`, execute:

```powershell
npm.cmd ci
npm.cmd run lint:check
npm.cmd test -- --runInBand
npm.cmd run build
```

Em seguida, dentro de `frontend/`, execute:

```powershell
npm.cmd ci
npm.cmd run lint
npm.cmd run build
npm.cmd run dev
```

Com `VITE_USE_MOCKS=true`, entre com `morador@habitaplus.com` / `Habita123!` e teste os três chips do chat. Para abertura de chamado pelo mock: clique em “Abrir chamado”, informe `garagem` e depois `elevador`. Confirme que aparece o número do chamado. Teste também em largura de 375 px e 1280 px e em zoom 80%, 100% e 125%.
