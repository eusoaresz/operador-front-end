"use client";
import { labels, RecordData } from "../lib/catalog";
import { dateTime } from "../lib/api";
const names: Record<string, string> = {
  id: "Identificador",
  nome: "Nome",
  nomeCompleto: "Nome completo",
  titulo: "Título",
  mensagem: "Mensagem",
  status: "Situação",
  statusCadastro: "Cadastro acadêmico",
  perfil: "Perfil",
  email: "E-mail",
  telefone: "Telefone",
  matricula: "Matrícula",
  unidadeEnsino: "Unidade de ensino",
  instituicaoEnsino: "Instituição",
  pontoParada: "Ponto de parada",
  cidade: "Cidade",
  endereco: "Endereço",
  referencia: "Referência",
  criadoEm: "Cadastrado em",
  atualizadoEm: "Atualizado em",
  usuario: "Conta",
  saldo: "Saldo (R$)",
  limiteCredito: "Limite de crédito (R$)",
  carteira: "Carteira",
  motivo: "Motivo",
  dadosAnteriores: "Antes",
  dadosNovos: "Depois",
  realizadaPor: "Responsável",
  categoriaCnh: "Categoria da CNH",
  numeroCnh: "CNH",
  validadeCnh: "Validade da CNH",
  previsaoConclusao: "Previsão de conclusão",
  curso: "Curso",
  cidadeOrigem: "Cidade de origem",
  faltas: "Faltas",
  advertencias: "Advertências",
  justificativa: "Justificativa",
  observacaoAnalise: "Observação da análise",
  analisadoEm: "Analisado em",
  analisadoPor: "Analisado por",
  ativa: "Ativa",
  ativo: "Ativo",
  importante: "Importante",
  publicoPerfil: "Público",
  expiraEm: "Disponível até",
  categoria: "Categoria",
  identificacao: "Identificação",
  placa: "Placa",
  tipo: "Tipo",
  capacidade: "Capacidade",
  dataNascimento: "Nascimento",
  fotoUrl: "Foto",
  paradas: "Paradas",
  ordem: "Ordem",
  data: "Data",
  turno: "Turno",
  valor: "Valor (R$)",
  formaPagamento: "Forma de pagamento",
  estudante: "Estudante",
  registradoEm: "Registrado em",
  contabilizada: "Contabilizada",
  semestre: "Semestre",
  nivel: "Nível",
  liberadaEm: "Liberada em",
  conteudo: "Conteúdo",
  lidaEm: "Lida em",
  nomeOriginal: "Arquivo",
  tipoMime: "Formato",
  tamanhoBytes: "Tamanho em bytes",
};
export function Badge({ value }: { value: any }) {
  const text =
    typeof value === "boolean"
      ? value
        ? "Ativo"
        : "Inativo"
      : labels[value] || value || "Todos";
  const tone =
    value === true ||
    [
      "ATIVA",
      "APROVADO",
      "CONFIRMADA",
      "CONCLUIDA",
      "CONCLUIDO",
      "APROVADA",
    ].includes(value)
      ? "green"
      : value === false ||
          [
            "BLOQUEADA",
            "CANCELADA",
            "CANCELADO",
            "REJEITADO",
            "REJEITADA",
            "INATIVA",
          ].includes(value)
        ? "red"
        : [
              "PENDENTE",
              "AGUARDANDO_ATIVACAO",
              "EM_ESPERA",
              "RASCUNHO",
              "SUSPENSO",
            ].includes(value)
          ? "amber"
          : "blue";
  return <span className={`badge ${tone}`}>{text}</span>;
}
export function Detail({ data }: { data: any }) {
  if (data === null || data === undefined)
    return <span className="muted">Sem informação</span>;
  if (typeof data !== "object")
    return (
      <span>
        {typeof data === "boolean"
          ? data
            ? "Sim"
            : "Não"
          : labels[data] || String(data)}
      </span>
    );
  if (Array.isArray(data))
    return data.length ? (
      <div className="detail-list">
        {data.map((item, i) => (
          <div className="detail-item" key={item?.id || i}>
            <Detail data={item} />
          </div>
        ))}
      </div>
    ) : (
      <p className="muted">Nenhum registro por aqui.</p>
    );
  return (
    <dl className="details">
      {Object.entries(data as RecordData)
        .filter(
          ([k]) =>
            !k.endsWith("Id") &&
            !k.endsWith("Hash") &&
            k !== "id" &&
            k !== "fotoUrl" &&
            k !== "meta" &&
            k !== "chaveIdempotencia",
        )
        .map(([k, v]) => (
          <div
            key={k}
            className={v && typeof v === "object" ? "detail-nested" : ""}
          >
            <dt>
              {names[k] ||
                k
                  .replace(/([A-Z])/g, " $1")
                  .replace(/^./, (c) => c.toUpperCase())}
            </dt>
            <dd>
              {typeof v === "string" && /^\d{4}-\d{2}-\d{2}T/.test(v) ? (
                dateTime(v)
              ) : (
                <Detail data={v} />
              )}
            </dd>
          </div>
        ))}
    </dl>
  );
}
