// Somente QA local: dados fictícios em memória, sem banco, SMTP ou serviços externos.
import { createServer } from "node:http";
const uuid = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const op = {
  id: uuid(1),
  nome: "Marina Universidade",
  email: "operador@teste.local",
  telefone: "53999990000",
  perfil: "OPERADOR",
  status: "ATIVA",
};
const institution = {
  id: uuid(2),
  nome: "Universidade da Comunidade",
  tipo: "FACULDADE",
  ativa: true,
};
const points = [
  {
    id: uuid(3),
    nome: "Prefeitura",
    cidade: "Pedro Osório",
    ativo: true,
    unidadeEnsino: null,
  },
  {
    id: uuid(4),
    nome: "Praça",
    cidade: "Pedro Osório",
    ativo: true,
    unidadeEnsino: null,
  },
  {
    id: uuid(5),
    nome: "Campus universitário",
    cidade: "Pelotas",
    ativo: true,
    unidadeEnsino: { id: uuid(6) },
  },
];
const unit = {
  id: uuid(6),
  nome: "Campus Pelotas",
  ativa: true,
  instituicaoEnsinoId: institution.id,
  pontoParadaId: points[2].id,
  instituicaoEnsino: institution,
  pontoParada: points[2],
};
const student = {
  id: uuid(7),
  nomeCompleto: "Ana Estudante",
  matricula: "2026001",
  statusCadastro: "APROVADO",
  previsaoConclusao: "2028-12-01",
  usuario: {
    id: uuid(8),
    nome: "Ana Estudante",
    email: "ana@teste.local",
    telefone: "53999990001",
    status: "ATIVA",
  },
  unidadeEnsino: unit,
  curso: "Administração",
};
const driver = {
  id: uuid(9),
  usuarioId: uuid(10),
  usuario: {
    id: uuid(10),
    nome: "João Motorista",
    email: "joao@teste.local",
    telefone: "53999990002",
    status: "ATIVA",
  },
  numeroCnh: "12345678901",
  categoriaCnh: "D",
  validadeCnh: "2029-01-01",
};
const vehicle = {
  id: uuid(11),
  identificacao: "Ônibus da comunidade",
  placa: "ABC1D23",
  tipo: "ONIBUS",
  capacidade: 42,
  ativo: true,
};
const route = {
  id: uuid(12),
  nome: "Pedro Osório → Pelotas",
  descricao: "Caminho para a universidade",
  ativa: true,
  paradas: points.map((p, i) => ({
    ordem: i + 1,
    pontoParadaId: p.id,
    pontoParada: p,
  })),
};
const segment = (id, sentido, hour) => ({
  id: uuid(id),
  sentido,
  status: "ABERTO",
  saidaPrevistaEm: `2026-11-05T${hour}:00:00-03:00`,
  chegadaPrevistaEm: `2026-11-05T${Number(hour) + 1}:00:00-03:00`,
  capacidade: 42,
  tarifa: "2.00",
  motoristaId: driver.id,
  veiculoId: vehicle.id,
  paradas: (sentido === "IDA" ? points : [...points].reverse()).map((p, i) => ({
    ...p,
    pontoParadaId: p.id,
    id: uuid(id * 10 + i),
    ordem: i + 1,
  })),
});
const trip = {
  id: uuid(13),
  data: "2026-11-05",
  turno: "NOITE",
  rotaId: route.id,
  nomeRota: route.nome,
  status: "PROGRAMADA",
  trechos: [segment(14, "IDA", "17"), segment(15, "VOLTA", "22")],
};
const lists = {
  usuarios: [op],
  estudantes: [student],
  motoristas: [driver],
  instituicoes: [institution],
  "unidades-ensino": [unit],
  "pontos-parada": points,
  rotas: [route],
  veiculos: [vehicle],
  cidades: [{ id: uuid(16), nome: "Pedro Osório", ativa: true }],
  escalas: [],
  viagens: [trip],
  avisos: [
    {
      id: uuid(17),
      titulo: "Bom semestre, comunidade!",
      mensagem: "Estamos juntos em mais um caminho até a universidade.",
      categoria: "GERAL",
      publicoPerfil: null,
      ativo: true,
      importante: true,
    },
  ],
  notificacoes: [],
};
const server = createServer(async (req, res) => {
  let body = {};
  try {
    let text = "";
    for await (const chunk of req) text += chunk;
    if (text) body = JSON.parse(text);
  } catch {}
  const url = new URL(req.url, "http://localhost");
  const parts = url.pathname.replace(/^\/api\/v1\//, "").split("/");
  const send = (value, status = 200) => {
    res.writeHead(status, { "content-type": "application/json" });
    res.end(status === 204 ? undefined : JSON.stringify(value));
  };
  if (parts[0] === "auth") {
    if (parts[1] === "login")
      return send({ token: "fixture-token-apenas-local" });
    return send(null, 204);
  }
  if (!req.headers.authorization)
    return send({ erro: "Token não informado" }, 401);
  if (parts.join("/") === "usuarios/me") return send(op);
  if (parts.join("/") === "operacao/semestres")
    return send([
      {
        id: uuid(18),
        nome: "2026/2",
        inicio: "2026-07-01T00:00:00-03:00",
        fim: "2027-01-01T00:00:00-03:00",
      },
    ]);
  if (parts[0] === "operacao") return send([]);
  if (parts[0] === "operador")
    return send({ dados: [], meta: { temProxima: false } });
  let collection = lists[parts[0]] || [];
  if (parts[1] === "gestao") parts.splice(1, 1);
  if (req.method === "GET" && parts[1])
    return send(
      collection.find((x) => x.id === parts[1]) || {
        erro: "Registro não encontrado",
      },
      collection.some((x) => x.id === parts[1]) ? 200 : 404,
    );
  if (req.method === "GET")
    return send({
      dados: collection,
      meta: { pagina: 1, limite: 20, temProxima: false },
    });
  if (req.method === "POST") {
    const item = {
      id: uuid(100 + collection.length),
      ...body,
      ativa: true,
      ativo: true,
    };
    collection.push(item);
    return send(item, 201);
  }
  if (req.method === "PATCH") {
    const item = collection.find((x) => x.id === parts[1]);
    if (item) {
      Object.assign(item, body);
      return send(item);
    }
    return send({ erro: "Registro não encontrado" }, 404);
  }
  return send({ erro: "Rota de teste não implementada" }, 404);
});
server.listen(3100, "127.0.0.1", () =>
  console.log("API fictícia de QA: http://127.0.0.1:3100 (sem banco)"),
);
