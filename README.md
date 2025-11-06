# Escopo inicial — Escala Ministerial (Front-end Web)

Este repositório contém a aplicação front-end web para a Escala Ministerial — uma interface em Express + EJS + Bulma que consome uma API (backend) para gerenciar ministérios, pessoas e eventos.

Objetivo
--------
A ferramenta ajuda a organizar escalas ministeriais da igreja, evitando que a mesma pessoa seja escalada em mais de um evento no mesmo dia.

Principais funcionalidades
- Página Home com calendário mensal, listagem de ministérios e pessoas (membros e líderes).
- Login de líderes (fluxo com token JWT e sincronização de sessão com o servidor front-end).
- Calendário que destaca dias com eventos e permite navegação entre meses (limitado até Dez/2026 por padrão no front).

Pré-requisitos
--------------
- Node.js (versão LTS recomendada)
- npm
- Uma API backend compatível (padrão do projeto espera um serviço em `http://localhost:3000` ou configurado via `API_URL`).

Estrutura do projeto (resumo)
----------------------------
- `src/` - código fonte do front-end (Express + EJS)
  - `index.js` - ponto de entrada do servidor front-end
  - `routes/` - rotas do servidor (páginas e proxy para API)
  - `views/` - templates EJS (páginas e partials)
  - `public/` - assets públicos (JS, CSS, imagens)
  - `services/` - helpers para comunicação com a API
  - `middleware/` - middlewares (ex.: autenticação local)
- `resources/` - arquivos de suporte (ex.: `swagger.json` do backend, se houver)
- `package.json` - dependências e scripts

Modo de uso local (front-end)
-----------------------------
1. Instale dependências:

```powershell
npm install
```

2. Inicie o servidor front-end (porta 4000 por padrão):

```powershell
npm start
```

3. Acesse a aplicação em `http://localhost:4000`.

Integração com o backend
------------------------
- Por padrão o front-end usa um proxy em `/api` que encaminha chamadas para a variável `API_URL` configurada no backend (ver `src/routes/apiProxy.js`).
- O backend esperado neste projeto é um serviço REST que fornece endpoints para `/auth/login`, `/ministries`, `/people`, `/events`.
- Se o backend estiver em `http://localhost:3000`, a configuração padrão costuma funcionar sem alterações.

Credenciais seed (ambiente de desenvolvimento)
----------------------------------------------
- Usuário: `leader1`
- Senha: `password`

Observações importantes
-----------------------
- A persistência atual no backend (quando usado o servidor de referência) é em memória — reiniciar o backend zera os dados. Para produção, providencie um banco de dados persistente.
- O front faz validações básicas e renderização de listas no cliente; lógica de regras (ex.: impedir pessoa em mais de um evento no mesmo dia) deve ser sempre validada no backend.
- O projeto inclui um arquivo `resources/swagger.json` com a especificação OpenAPI (caso exista o backend). Consulte-o para ver formatos de payload esperados.

Testes e planos
---------------
- Casos de teste podem ser mantidos em uma planilha externa e/ou `docs/TestPlan.md` (se presente). Verifique `docs/` para materiais de teste.

Bugs e Issues
-------------
- Use a aba Issues do GitHub para registrar bugs, melhorias e tarefas.
