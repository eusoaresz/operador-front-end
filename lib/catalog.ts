export type RecordData = Record<string, any>;
export type Option = { value: string; label: string };
export type Field = {
  name: string;
  label: string;
  type?: string;
  required?: boolean;
  options?: Option[];
  source?: string;
  hint?: string;
  min?: number;
  max?: number;
  pattern?: string;
};
export type Resource = {
  key: string;
  title: string;
  singular: string;
  path: string;
  description: string;
  fields: Field[];
  columns: [string, string][];
  status?: string;
  history?: boolean;
};
export const options = (...values: string[]): Option[] =>
  values.map((value) => ({ value, label: labels[value] || value }));
export const labels: Record<string, string> = {
  ATIVA: "Ativa",
  INATIVA: "Inativa",
  BLOQUEADA: "Bloqueada",
  AGUARDANDO_ATIVACAO: "Aguardando ativação",
  OPERADOR: "Operador",
  ESTUDANTE: "Estudante",
  MOTORISTA: "Motorista",
  FACULDADE: "Faculdade",
  TECNICA: "Técnica",
  PREPARATORIA: "Preparatória",
  ONIBUS: "Ônibus",
  VAN: "Van",
  MANHA: "Manhã",
  TARDE: "Tarde",
  NOITE: "Noite",
  SEGUNDA: "Segunda-feira",
  TERCA: "Terça-feira",
  QUARTA: "Quarta-feira",
  QUINTA: "Quinta-feira",
  SEXTA: "Sexta-feira",
  APROVADO: "Aprovado",
  PENDENTE: "Pendente",
  REJEITADO: "Rejeitado",
  SUSPENSO: "Suspenso",
  ENCERRADO: "Encerrado",
  RASCUNHO: "Rascunho",
  PROGRAMADA: "Programada",
  EM_ANDAMENTO: "Em andamento",
  CONCLUIDA: "Concluída",
  CANCELADA: "Cancelada",
  ABERTO: "Aberto",
  FECHADO: "Fechado",
  CONCLUIDO: "Concluído",
  CANCELADO: "Cancelado",
  IDA: "Ida",
  VOLTA: "Volta",
  GERAL: "Geral",
  VIAGENS: "Viagens",
  APROVADA: "Aprovada",
  REJEITADA: "Rejeitada",
  EM_ESPERA: "Em espera",
  CONFIRMADA: "Confirmada",
};
export const field = (
  name: string,
  label: string,
  type = "text",
  extra: Partial<Field> = {},
): Field => ({ name, label, type, required: true, ...extra });
export const reason = field("motivo", "Motivo da alteração", "textarea", {
  hint: "Conte o que mudou. Essa informação fica no histórico.",
  min: 3,
  max: 1000,
});
export const identity = [
  field("nome", "Nome completo"),
  field("cpf", "CPF", "text", {
    hint: "Informe um CPF válido, com ou sem pontuação.",
  }),
  field("email", "E-mail", "email"),
  field("telefone", "Telefone", "tel", { hint: "Inclua o DDD." }),
  field("senha", "Senha inicial", "password", {
    min: 8,
    hint: "8 caracteres ou mais, com maiúscula, minúscula, número e símbolo.",
  }),
  field("dataNascimento", "Data de nascimento", "date", { required: false }),
];
const cnh = [
  field("numeroCnh", "Número da CNH", "text", {
    pattern: "[0-9]{11}",
    hint: "11 dígitos.",
  }),
  field("categoriaCnh", "Categoria", "select", { options: options("D", "E") }),
  field("validadeCnh", "Validade da CNH", "date"),
];
export const resources: Resource[] = [
  {
    key: "usuarios",
    title: "Operadores e contas",
    singular: "operador",
    path: "usuarios",
    description: "Quem cuida do UniBus, com o acesso certo para cada pessoa.",
    fields: identity,
    columns: [
      ["nome", "Nome"],
      ["perfil", "Perfil"],
      ["status", "Conta"],
    ],
    status: "status",
  },
  {
    key: "estudantes",
    title: "Estudantes",
    singular: "estudante",
    path: "estudantes",
    description:
      "Do primeiro cadastro ao último semestre: acompanhe cada estudante.",
    fields: [
      ...identity,
      field("matricula", "Matrícula"),
      field("unidadeEnsinoId", "Unidade de ensino", "select", {
        source: "unidades-ensino",
      }),
      field("previsaoConclusao", "Previsão de conclusão", "date"),
      field("curso", "Curso", "text", { required: false }),
      field("cidadeOrigemId", "Cidade de origem", "select", {
        source: "cidades",
        required: false,
      }),
    ],
    columns: [
      ["nomeCompleto", "Estudante"],
      ["matricula", "Matrícula"],
      ["unidadeEnsino.nome", "Unidade"],
      ["statusCadastro", "Cadastro"],
    ],
  },
  {
    key: "motoristas",
    title: "Motoristas",
    singular: "motorista",
    path: "motoristas",
    description: "As pessoas que levam a comunidade universitária mais longe.",
    fields: [...identity, ...cnh],
    columns: [
      ["usuario.nome", "Motorista"],
      ["categoriaCnh", "Categoria"],
      ["validadeCnh", "Validade da CNH"],
      ["usuario.status", "Conta"],
    ],
    status: "usuario",
  },
  {
    key: "instituicoes",
    title: "Instituições",
    singular: "instituição",
    path: "instituicoes",
    description: "As instituições que fazem parte do nosso caminho.",
    fields: [
      field("nome", "Nome da instituição"),
      field("tipo", "Tipo", "select", {
        options: options("FACULDADE", "TECNICA", "PREPARATORIA"),
      }),
    ],
    columns: [
      ["nome", "Instituição"],
      ["tipo", "Tipo"],
      ["ativa", "Situação"],
    ],
    status: "ativa",
    history: true,
  },
  {
    key: "unidades",
    title: "Unidades de ensino",
    singular: "unidade",
    path: "unidades-ensino",
    description: "Conecte cada campus à instituição e ao ponto de parada.",
    fields: [
      field("nome", "Nome da unidade"),
      field("instituicaoEnsinoId", "Instituição", "select", {
        source: "instituicoes",
      }),
      field("pontoParadaId", "Ponto de parada", "select", {
        source: "pontos-parada",
      }),
      field("endereco", "Endereço", "text", { required: false }),
    ],
    columns: [
      ["nome", "Unidade"],
      ["instituicaoEnsinoId", "Instituição"],
      ["pontoParadaId", "Ponto"],
      ["ativa", "Situação"],
    ],
    status: "ativa",
    history: true,
  },
  {
    key: "pontos",
    title: "Pontos de parada",
    singular: "ponto",
    path: "pontos-parada",
    description: "Um ponto de encontro para começar e terminar bem a viagem.",
    fields: [
      field("nome", "Nome do ponto"),
      field("cidade", "Cidade"),
      field("endereco", "Endereço", "text", { required: false }),
      field("referencia", "Referência", "text", { required: false }),
    ],
    columns: [
      ["nome", "Ponto"],
      ["cidade", "Cidade"],
      ["ativo", "Situação"],
    ],
    status: "ativo",
    history: true,
  },
  {
    key: "rotas",
    title: "Rotas",
    singular: "rota",
    path: "rotas",
    description:
      "Organize as paradas na ordem certa. A volta segue o caminho inverso.",
    fields: [
      field("nome", "Nome da rota"),
      field("descricao", "Descrição", "textarea", { required: false }),
      field("pontoIds", "Paradas da ida", "ordered", {
        source: "pontos-parada",
        hint: "Comece por Prefeitura e Praça, em Pedro Osório, e adicione ao menos um destino.",
      }),
    ],
    columns: [
      ["nome", "Rota"],
      ["descricao", "Descrição"],
      ["ativa", "Situação"],
    ],
    status: "ativa",
    history: true,
  },
  {
    key: "veiculos",
    title: "Veículos",
    singular: "veículo",
    path: "veiculos",
    description:
      "Frota organizada, lugares disponíveis e viagens bem planejadas.",
    fields: [
      field("identificacao", "Identificação"),
      field("placa", "Placa", "text", {
        hint: "ABC1234 ou ABC1D23. O hífen é opcional.",
      }),
      field("tipo", "Tipo", "select", { options: options("ONIBUS", "VAN") }),
      field("capacidade", "Capacidade de passageiros", "number", { min: 1 }),
    ],
    columns: [
      ["identificacao", "Veículo"],
      ["placa", "Placa"],
      ["tipo", "Tipo"],
      ["capacidade", "Lugares"],
      ["ativo", "Situação"],
    ],
    status: "ativo",
    history: true,
  },
  {
    key: "cidades",
    title: "Cidades",
    singular: "cidade",
    path: "cidades",
    description: "As cidades de origem da nossa comunidade.",
    fields: [field("nome", "Nome da cidade")],
    columns: [
      ["nome", "Cidade"],
      ["ativa", "Situação"],
    ],
    status: "ativa",
    history: true,
  },
  {
    key: "escalas",
    title: "Escalas semanais",
    singular: "escala",
    path: "escalas",
    description: "De segunda a sexta, deixe a semana da equipe organizada.",
    fields: [
      field("diaSemana", "Dia da semana", "select", {
        options: options("SEGUNDA", "TERCA", "QUARTA", "QUINTA", "SEXTA"),
      }),
      field("turno", "Turno", "select", {
        options: options("MANHA", "TARDE", "NOITE"),
      }),
      field("rotaId", "Rota", "select", { source: "rotas" }),
      field("motoristaId", "Motorista", "select", { source: "motoristas" }),
      field("veiculoId", "Veículo", "select", { source: "veiculos" }),
      field("saidaIdaMinuto", "Saída da ida", "timeMinutes", {
        required: false,
      }),
      field("saidaVoltaMinuto", "Saída da volta", "timeMinutes", {
        required: false,
      }),
      field("saidaVoltaDiaOffset", "Dia da volta", "select", {
        options: [
          { value: "0", label: "Mesmo dia" },
          { value: "1", label: "Dia seguinte" },
        ],
      }),
      field("chegadaPedroMinuto", "Chegada a Pedro Osório", "timeMinutes", {
        required: false,
      }),
      field("chegadaPedroDiaOffset", "Dia da chegada", "select", {
        options: [
          { value: "0", label: "Mesmo dia" },
          { value: "1", label: "Dia seguinte" },
        ],
      }),
    ],
    columns: [
      ["diaSemana", "Dia"],
      ["turno", "Turno"],
      ["rota.nome", "Rota"],
      ["motorista.usuario.nome", "Motorista"],
      ["veiculo.identificacao", "Veículo"],
      ["ativa", "Situação"],
    ],
    status: "escala",
  },
  {
    key: "avisos",
    title: "Avisos",
    singular: "aviso",
    path: "avisos/gestao",
    description: "Uma comunicação próxima faz toda a diferença na rotina.",
    fields: [
      field("titulo", "Título"),
      field("mensagem", "Mensagem", "textarea"),
      field("categoria", "Categoria", "select", {
        options: options("GERAL", "VIAGENS"),
      }),
      field("publicoPerfil", "Público", "select", {
        required: false,
        options: options("ESTUDANTE", "MOTORISTA", "OPERADOR"),
        hint: "Deixe em branco para todos.",
      }),
      field("importante", "Destacar como importante", "checkbox", {
        required: false,
      }),
      field("expiraEm", "Disponível até", "datetime-local", {
        required: false,
      }),
    ],
    columns: [
      ["titulo", "Aviso"],
      ["categoria", "Categoria"],
      ["publicoPerfil", "Público"],
      ["ativo", "Situação"],
    ],
    status: "ativo",
  },
  {
    key: "semestres",
    title: "Semestres letivos",
    singular: "semestre",
    path: "operacao/semestres",
    description:
      "O calendário que orienta a operação e o acompanhamento de faltas.",
    fields: [
      field("nome", "Nome do semestre"),
      field("inicio", "Início", "datetime-local"),
      field("fim", "Fim (exclusivo)", "datetime-local", {
        hint: "Para incluir 30/06, use 01/07 às 00:00.",
      }),
    ],
    columns: [
      ["nome", "Semestre"],
      ["inicio", "Início"],
      ["fim", "Fim"],
    ],
  },
];
export const get = (item: RecordData, path: string): any =>
  path.split(".").reduce((v, k) => v?.[k], item);
export const titleOf = (item: RecordData) =>
  item.nomeCompleto ||
  item.usuario?.nome ||
  item.nome ||
  item.identificacao ||
  item.titulo ||
  item.nomeRota ||
  "Registro";
