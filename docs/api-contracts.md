# Padrões obrigatórios
  #  Item	                               Padrão definido
    Formato -                                   JSON
    Autenticação -                          Token Bearer
    Paginação -                           ?page=1&limit=20
    Resposta paginada -              { "data": [...], "meta": {...} }
    Datas -                        SO 8601, preferencialmente com fuso horário - Ex: 2026-12-31
    Valores monetários  -         Número em reais com duas casas decimais - Ex: R$32,50
    Erros -                            Objeto JSON padronizado
    Status HTTP -          200, 201, 204, 400, 401, 403, 404, 409, 422 e 500, conforme a situação

# Exemplo de respota paginada

    {
    "data": [
        {
        "id": "unid_001",
        "numero": "101",
        "bloco": "A"
        }
    ],
    "meta": {
        "page": 1,
        "limit": 20,
        "total": 45,
        "totalPages": 3
    }
    }

# Exemplo de resposta com erro

    {
    "error": {
        "code": "VALIDATION_ERROR",
        "message": "Os dados informados são inválidos.",
        "details": [
        {
            "field": "email",
            "message": "Informe um e-mail válido."
        }
        ],
        "requestId": "req_abc123"
    }
    }

Cobrir: auth, unidades, locação, chamados, transações, cobranças, anúncios, mensagens, notificações, chatbot, previsões, recomendações

# Autenticação e usuários
 #  Método      Rota	             Acesso	           Finalidade
    POST	/api/v1/auth/login	     Público	     Entrar no sistema
    POST	/api/v1/auth/registro  Administrador	   Criar conta
    GET	    /api/v1/auth/eu	        Autenticado	    Consultar usuário logado
    POST	/api/v1/auth/atualizar	Autenticado	      Renovar token
    POST	/api/v1/auth/logout  	Autenticado	      Encerrar sessão

# Exemplo de Sucesso de Resposta (200 OK)

    {
  "data": {
    "accessToken": "token_de_exemplo",
    "tokenType": "Bearer",
    "expiresIn": 3600,
    "user": {
      "id": "usr_001",
      "name": "João Silva",
      "email": "morador@email.com",
      "role": "RESIDENT"
    }
  }
}

# Unidades e locação
  # Método	     Rota	               Acesso 	                                     Finalidade
    GET	    /api/v1/und	            Administrador	                          Listar unidades permitidas
    GET  	/api/v1/und/{id}	    Usuário autorizado à unidade	              Consultar unidade
    POST	/api/v1/und	            Administrador	                              Cadastrar unidade
    PATCH	/api/v1/und/{id}	    Administrador	                              Atualizar unidade
    GET	    /api/v1/contrato	    Administrador morador conforme vínculo	  Listar contratos de locação
    POST	/api/v1/contrato	    Administrador                                 Cadastrar locação
    GET	    /api/v1/contrato/{id}	Administrador                                 Consultar locação
    PATCH	/api/v1/contrato/{id}	Responsável autorizado	                      Atualizar locação

# Exemplo de criação de locação
    {
  "undId": "unid_001",
  "moradorId": "usr_002",
  "inicio": "2026-11-01",
  "fim": "2027-10-31",
  "valorAluguel": 1800.00
}

# Chamados e suporte

   # Método      	  Rota	                 Acesso                                                 Finalidade
    GET	     /api/v1/tickets	            Morador vê os próprios; suporte vê os autorizados	Listar chamados
    POST	 /api/v1/tickets	            Morador, funcionário autorizado	                    Abrir chamado
    GET	     /api/v1/tickets/{id}	        Solicitante e equipe autorizada	                    Consultar chamado
    PATCH	 /api/v1/tickets/{id}	        Suporte ou responsável autorizado	                Alterar status e dados permitidos
    POST	 /api/v1/tickets/{id}/mensagem	Participantes autorizados	                        Adicionar mensagem

# Exemplo de abertura de chamado

    {
  "undId": "und_001",
  "nome": "Vazamento no banheiro",
  "descricao": "Há um vazamento próximo ao registro.",
  "categoria": "MANUTENÇÃO",
  "prioridade": "ALTA"
}

# Exemplo de sucesso na criação do chamado (201 CREATED)

    {
  "data": {
    "id": "tic_001",
    "undId": "und_001",
    "nome": "Vazamento no banheiro",
    "status": "ABERTO",
    "prioridade": "ALTA",
    "criação": "2026-10-13T16:30:00Z"
  }
}

# Transações e cobranças

  # Método          Rota                                       Acesso                               Finalidade

    GET	        /api/v1/transacoes	               Administração e usuários autorizados     	Listar transações
    GET	        /api/v1/transacoes/{id}	           Conforme propriedade ou permissão            Consultar transação
    GET	        /api/v1/cobrancas	               Administração e moradores conforme unidade	Listar cobranças
    POS         /api/v1/cobrancas	               Administrador ou financeiro	                Criar cobrança
    GET	        /api/v1/cobrancas/{id}       	   Administração e responsável pela cobrança	Consultar cobrança
    POST      	/api/v1/cobrancas/{id}/pagamentos  Pagador autorizado ou integração confiável	Iniciar ou registrar pagamento

# Exemplo de cobrança

    {
  "undId": "und_001",
  "descricao": "Taxa condominial - novembro",
  "valor": 650.00,
  "vencimento": "2026-11-10"
}

# Exemplo de resposta 

    {
  "data": {
    "id": "chg_001",
    "unitId": "unid_001",
    "description": "Taxa condominial - novembro",
    "amount": 650.00,
    "status": "PENDING",
    "dueDate": "2026-11-10"
  }
}

# Anúncios, mensagens e notificações

  # Méto              Rota              	         Acesso                           Finalidade
    GET	      /api/v1/announcements         	Moradores e administração	        Listar anúncios
    POST	  /api/v1/announcements	            Síndico e administrador	            Publicar anúncio
    PATCH	  /api/v1/announcements/{id}	    Autor e administrador           	Atualizar anúncio
    GET       /api/v1/mensagens	                Participantes autorizados     	    Listar conversas ou mensagens
    POST	  /api/v1/mensagens	                Usuário autenticado e autorizado	Enviar mensagem
    GET	      /api/v1/notificacoes         	Próprio usuário	                    Listar notificações
    PATCH	  /api/v1/notificacoes/{id}/read	Destinatário	                    Marcar como lida

# Chatbot, previsões e recomendações
  # Método	          Rota	                           Acesso 	                         Finalidade
    POST	/api/v1/chatbot/mensagens	         Usuário autenticado	            Enviar mensagem ao chatbot
    GET	    /api/v1/chatbot/conversas/{id}	  Participante autorizado	            Consultar conversa
    GET	    /api/v1/forecasts/expenses        Administração efinanceiro autorizado	Consultar previsão de gastos
    POST	/api/v1/recomendacoes             Conforme finalidade da recomendação	Solicitar recomendações
    POST	/api/v1/nlu/parse	              Chatbot ou serviço autorizado	        Interpretar intenção e entidades


# Os 3 contratos do ml-service

  # Contrato 1 — POST /predict/expenses

   # Recebe 

      {
      "condominioId": "cond_001",
      "mesDesejado": "2026-11",
      "historico": [
        {
          "mes": "2026-08",
          "categoria": "ENERGY",
          "valor": 4200.00
        },
        {
          "mes": "2026-09",
          "categoria": "ENERGY",
          "valor": 4500.00
        },
        {
          "mes": "2026-10",
          "categoria": "ENERGY",
          "valor": 4700.00
        }
      ],
      "categories": ["ENERGY"]
    }

   # Devolve

    {
      "predictionId": "pred_001",
      "condominioId": "cond_001",
      "mesDesejado": "2026-11",
      "predicaoTotal": 4900.00,
      "moeda": "BRL",
      "predictions": [
        {
          "category": "ENERGY",
          "predictedAmount": 4900.00
        }
      ],
      "versaoModelo": "expenses-v1",
      "geradoEm": "2026-10-13T16:30:00Z"
    }

  # Contrato 2 -POST /recommend

   # Recebe

    {
    "userId": "usr_001",
    "context": {
      "unitId": "unid_001",
      "cargo": "RESIDENT",
      "interesses": ["MAINTENANCE", "ANNOUNCEMENTS"],
      "atividadeRecente": [
        "OPENED_TICKET"
      ]
    },
    "limite": 3
  }

   # Devolve 

    {
    "recommendations": [
      {
        "id": "rec_001",
        "type": "SERVICE",
        "titulo": "Acompanhar chamado de manutenção",
        "descricao": "Consulte o andamento do seu chamado.",
        "targetId": "tic_001",
        "score": 0.92
      },
      {
        "id": "rec_002",
        "type": "ANNOUNCEMENT",
        "titulo": "Comunicados do condomínio",
        "descricao": "Consulte os comunicados recentes.",
        "targetId": "ann_001",
        "score": 0.81
      }
    ],
    "versaoModelo": "recommend-v1"
  }

  # Contrato 3 - POST /nlu/parse

   # Recebe 

    {
    "texto": "Quero saber o valor da taxa do meu apartamento",
    "userId": "usr_001",
    "contexto": {
      "unitId": "unid_001",
      "idioma": "pt-BR"
    }
  }
   # Devolve

    {
    "intencao": "CONSULT_CHARGE",
    "confianca": 0.96,
    "entities": {
      "unitId": "unid_001",
      "period": null
    },
    "precisaAutenticacao": true,
    "acaoSugerida": {
      "type": "CALL_API",
      "operation": "LIST_CHARGES"
    },
    "versaoModelo": "nlu-v1"
  }
