# UniBus · Painel do operador

Painel local em Next.js 16, React 19 e TypeScript para o UniBus-back-end. Interface em português, responsiva, inspirada nas telas do estudante fornecidas em `viagem.zip`: azul-marinho, azul vivo, cartões claros e comunicação universitária.

## Iniciar

Requer Node.js 24 e o back-end com seu banco já configurado. Não crie outro operador: use a conta ativa que já existe.

Em um terminal na pasta **UniBus-back-end**:

```powershell
npm run dev
```

Em outro terminal, nesta pasta **operador-front-end**:

```powershell
npm ci
npm run dev
```

Acesse **http://localhost:3001**. O back-end usa **http://localhost:3000**. Se necessário, copie `.env.example` para `.env.local` e ajuste `BACKEND_URL`. Reinicie o Next.js após mudar essa variável. Para build de produção, configure a variável antes de `npm run build`, pois os rewrites são gerados na compilação.

Não há publicação nem credenciais embutidas. O Next.js encaminha `/api/v1/*` ao Express usando rewrite; o navegador chama a mesma origem e o JWT segue no cabeçalho Bearer. Não é preciso abrir CORS no Express para usar o painel.

## Funcionalidades

- Login, recuperação, redefinição, mostrar senha, sessão por aba e logout com revogação no back-end.
- Início com atalhos, viagens programadas e mural.
- Operadores e contas: cadastro de operador, consulta e correção de dados pessoais, ativação/bloqueio/inativação com motivo. A lista também permite filtrar estudantes e motoristas para administrar o acesso.
- Estudantes: cadastro completo (conta, matrícula, unidade, conclusão, curso e cidade), consulta, edição acadêmica, correção pessoal, aprovação, rejeição, suspensão, reativação, encerramento e reabertura.
- Motoristas: cadastro completo e ativo, complemento de conta MOTORISTA existente, edição da CNH e gestão de status pela conta.
- Fotos: envio JPEG/PNG ou remoção com motivo, na consulta individual dos perfis.
- Instituições, unidades, pontos, cidades, veículos e rotas: cadastro, edição, ativação/desativação e histórico. Na unidade, os pontos vinculados a outras unidades ficam fora da seleção. O itinerário usa uma lista visual com adicionar, remover e mover paradas.
- Escalas semanais: cadastro, consulta, edição, desativação, dia, turno, recursos e horários com possibilidade de retorno no dia seguinte.
- Viagens: planejamento de ida/volta, revisão de rascunho, alocação de recursos normais/extras, publicação, cancelamento completo ou por trecho, execução e conclusão.
- Operação: passageiros, fila, inclusão excepcional, confirmação administrativa, embarque pela lista ou pelo conteúdo do QR, alteração de horários, convocação de van, comunicação de indisponibilidade e processamento manual de prazos.
- Troca de rota publicada: manutenção das paradas compatíveis ou resolução individual com realocação/cancelamento de participações, enviada como uma operação conjunta.
- Disciplina: faltas, advertências, análise de justificativa e liberação por semestre. Semestres podem ser cadastrados no painel.
- Carteiras e recargas: saldos, extratos completos, registro de dinheiro, aprovação/rejeição e estorno. Chaves de idempotência são preservadas nas tentativas do mesmo formulário.
- Notificações internas com paginação e marcação de leitura; edição do próprio nome/telefone.

As listas usam a paginação real da API. A busca textual indicada como “nesta página” filtra somente os registros carregados; os filtros de perfil, situação e data consultam o servidor. Seletores de vínculos percorrem todas as páginas, exceto semestres, cuja API retorna até 100 registros sem paginação.

## Regras preservadas

O banco e a API são a fonte de verdade. O painel não simula sucesso quando a API recusa uma operação. Validações por campo e conflitos aparecem em português, sem renderizar avisos como HTML.

- Operadores novos aguardam ativação. Estudantes novos já têm cadastro acadêmico aprovado, mas a conta também precisa ser ativada em **Operadores e contas**. O próprio status do operador não pode ser alterado.
- Motoristas usam CNH D/E, conforme a regra atual de transporte do back-end.
- Rotas exigem ao menos três pontos, começando por Prefeitura e Praça em Pedro Osório. A volta usa ordem inversa.
- Alterações administrativas exigem motivo quando previsto pela API. Desativação preserva os históricos; não foi criada exclusão física de cadastros.
- Horários são tratados no fuso America/Sao_Paulo, independentemente do fuso do navegador.
- A escala organiza a semana. O planejamento da viagem continua explícito em **Viagens e operação**; cadastrar uma escala não dispara viagens automaticamente nem modifica as existentes.
- Publicação/início exigem recursos válidos e semestre configurado; a API verifica conflitos, fila, capacidade, saldo e habilitação.
- JWT expira em uma hora. Não há refresh token. O token fica em memória e `sessionStorage` da aba; ao expirar, a interface retorna ao login. O logout só é confirmado depois da revogação pelo servidor.
- Recuperação depende do SMTP configurado no back-end; o Mailtrap atual captura mensagens em sandbox.
- O embarque aceita o conteúdo do QR ou o passageiro da lista. Não há leitura por câmera nesta entrega.

## Verificação

```powershell
npm test
npm run typecheck
npm run build
```

Os testes do cliente cobrem paginação, contratos de erro, cabeçalho de autenticação, logout 204, expiração e conversão de horários. O back-end tem testes próprios, incluindo os novos testes HTTP de escalas. Os testes automatizados não usam sua conta nem seu banco real.

Para QA visual opcional, `node tests/mock-server.mjs` inicia uma API fictícia em memória na porta 3100. Em **outro terminal temporário**, execute `$env:BACKEND_URL='http://127.0.0.1:3100'` e `npm run dev`. Use qualquer senha fictícia com `operador@teste.local`. Esse servidor é apenas um apoio de teste parcial, não é um modo de operação do produto. Ao terminar, encerre os dois processos e abra um terminal novo para iniciar o painel com o back-end real.

Nenhum schema, migração, seed ou dado real foi alterado para criar o painel. A integração com PostgreSQL e o operador existente deve ser conferida no ambiente local ao fazer login.
