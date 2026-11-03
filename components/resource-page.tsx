"use client";
import { useCallback, useEffect, useState } from "react";
import {
  Plus,
  Search,
  RefreshCw,
  Pencil,
  Eye,
  History,
  Power,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { all, api, date, dateTime, rows } from "../lib/api";
import {
  Field,
  Resource,
  RecordData,
  field,
  get,
  identity,
  labels,
  options,
  reason,
  titleOf,
} from "../lib/catalog";
import { Editor, Modal } from "./form";
import { Badge, Detail } from "./data-view";
import { Photo } from "./photo";

type Edit = {
  title: string;
  fields: Field[];
  initial?: RecordData;
  path: string;
  method?: string;
  help?: string;
  partial?: boolean;
  map?: (d: RecordData) => RecordData;
};
export function ResourcePage({
  resource: r,
  notify,
}: {
  resource: Resource;
  notify: (s: string) => void;
}) {
  const [data, setData] = useState<RecordData[]>([]),
    [pagina, setPagina] = useState(1),
    [next, setNext] = useState(false),
    [busy, setBusy] = useState(true),
    [error, setError] = useState("");
  const [query, setQuery] = useState(""),
    [status, setStatus] = useState(""),
    [profile, setProfile] = useState("");
  const [edit, setEdit] = useState<Edit | null>(null),
    [detail, setDetail] = useState<{ title: string; data: any } | null>(null),
    [selected, setSelected] = useState<RecordData | null>(null);
  const [photo, setPhoto] = useState<string | null>(null);
  const [lookup, setLookup] = useState<Record<string, string>>({});
  const load = useCallback(async () => {
    setBusy(true);
    setError("");
    try {
      const params = new URLSearchParams({
        pagina: String(pagina),
        limite: "20",
      });
      if (status)
        params.set(
          r.key === "estudantes" ? "statusCadastro" : "status",
          status,
        );
      if (profile) params.set("perfil", profile);
      const response = await api(`${r.path}?${params}`);
      setData(rows(response));
      setNext(!!response?.meta?.temProxima);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }, [r, pagina, status, profile]);
  useEffect(() => {
    void load();
  }, [load]);
  useEffect(() => {
    if (r.key !== "unidades") return;
    let active = true;
    Promise.all([all("instituicoes"), all("pontos-parada")])
      .then((groups) => {
        if (active)
          setLookup(
            Object.fromEntries(groups.flat().map((x) => [x.id, x.nome])),
          );
      })
      .catch((e) => {
        if (active) setError(e.message);
      });
    return () => {
      active = false;
    };
  }, [r.key]);
  const base = r.key === "avisos" ? "avisos" : r.path;
  async function inspect(item: RecordData) {
    setError("");
    try {
      const value =
        r.key === "semestres" ? item : await api(`${r.path}/${item.id}`);
      setSelected(value);
      setDetail({ title: titleOf(value), data: value });
    } catch (e) {
      setError((e as Error).message);
    }
  }
  async function editing(item: RecordData) {
    try {
      const value = await api(`${r.path}/${item.id}`);
      let fields = r.fields,
        path = `${base}/${item.id}`,
        initial = { ...value };
      if (r.key === "usuarios") {
        fields = identity.filter((f) => !["cpf", "senha"].includes(f.name));
        path += `/dados`;
      }
      if (r.key === "estudantes") {
        fields = r.fields.filter((f) =>
          ["matricula", "unidadeEnsinoId", "previsaoConclusao"].includes(
            f.name,
          ),
        );
        initial.unidadeEnsinoId = value.unidadeEnsino.id;
      }
      if (r.key === "motoristas")
        fields = r.fields.filter((f) =>
          ["numeroCnh", "categoriaCnh", "validadeCnh"].includes(f.name),
        );
      if (r.key === "unidades")
        fields = fields.filter((f) => f.name !== "instituicaoEnsinoId");
      if (r.key === "rotas")
        initial.pontoIds = value.paradas.map(
          (p: RecordData) => p.pontoParadaId || p.pontoParada.id,
        );
      if (r.key !== "escalas") fields = [...fields, reason];
      setEdit({
        title: `Editar ${r.singular}`,
        fields,
        initial,
        path,
        method: "PATCH",
        partial: true,
      });
    } catch (e) {
      setError((e as Error).message);
    }
  }
  function changeStatus(item: RecordData) {
    const user = r.status === "status" || r.status === "usuario";
    setEdit({
      title: `Alterar situação · ${titleOf(item)}`,
      fields: [
        user
          ? field("status", "Situação da conta", "select", {
              options: options("ATIVA", "BLOQUEADA", "INATIVA"),
            })
          : field("ativo", "Manter ativo", "checkbox", { required: false }),
        ...(r.status === "escala" ? [] : [reason]),
      ],
      initial: user
        ? { status: r.status === "usuario" ? item.usuario.status : item.status }
        : { ativo: item.ativa ?? item.ativo },
      path: user
        ? `usuarios/${r.status === "usuario" ? item.usuarioId || item.usuario.id : item.id}/status`
        : r.status === "escala"
          ? `${base}/${item.id}`
          : `${base}/${item.id}/status`,
      method: "PATCH",
      map: r.status === "escala" ? (d) => ({ ativa: d.ativo }) : undefined,
      help: "Desativar preserva os dados e o histórico. Vínculos em operação podem impedir a alteração.",
    });
  }
  async function history(item: RecordData) {
    try {
      setDetail({
        title: `Histórico · ${titleOf(item)}`,
        data: await all(`${base}/${item.id}/historico`),
      });
    } catch (e) {
      setError((e as Error).message);
    }
  }
  const visible = data.filter((item) =>
    titleOf(item)
      .toLocaleLowerCase("pt-BR")
      .includes(query.toLocaleLowerCase("pt-BR")),
  );
  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">COMUNIDADE UNIBUS</p>
          <h1>{r.title}</h1>
          <p>{r.description}</p>
        </div>
        <button
          className="primary"
          onClick={() =>
            setEdit({
              title: `Cadastrar ${r.singular}`,
              fields: r.fields,
              path: base,
              map:
                r.key === "usuarios"
                  ? (d) => ({ ...d, perfil: "OPERADOR" })
                  : undefined,
              help:
                r.key === "usuarios"
                  ? "A conta nasce aguardando ativação. Depois do cadastro, altere sua situação para Ativa."
                  : r.key === "estudantes"
                    ? "Cadastro acadêmico aprovado e carteira são criados juntos. Ative a conta em Operadores e contas para liberar o login."
                    : undefined,
            })
          }
        >
          <Plus size={18} />
          Cadastrar {r.singular}
        </button>
      </div>
      <section className="panel">
        <div className="toolbar">
          {r.key === "motoristas" && (
            <button
              className="secondary"
              onClick={() =>
                setEdit({
                  title: "Completar conta de motorista existente",
                  fields: [
                    field("usuarioId", "Conta de motorista", "select", {
                      source: "usuarios?perfil=MOTORISTA",
                    }),
                    ...r.fields.filter((f) =>
                      ["numeroCnh", "categoriaCnh", "validadeCnh"].includes(
                        f.name,
                      ),
                    ),
                    reason,
                  ],
                  path: "motoristas",
                  map: (d) => d,
                  help: "Use para uma conta MOTORISTA que já existe e ainda não tem CNH cadastrada.",
                })
              }
            >
              Completar conta existente
            </button>
          )}
          <div className="search">
            <Search size={18} />
            <input
              aria-label="Buscar nesta página"
              placeholder="Buscar nesta página…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          {["usuarios", "estudantes", "motoristas"].includes(r.key) && (
            <select
              aria-label="Filtrar situação"
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                setPagina(1);
              }}
            >
              <option value="">Todas as situações</option>
              {options(
                ...(r.key === "estudantes"
                  ? [
                      "PENDENTE",
                      "APROVADO",
                      "REJEITADO",
                      "SUSPENSO",
                      "ENCERRADO",
                    ]
                  : ["ATIVA", "AGUARDANDO_ATIVACAO", "BLOQUEADA", "INATIVA"]),
              ).map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          )}
          {r.key === "usuarios" && (
            <select
              aria-label="Filtrar perfil"
              value={profile}
              onChange={(e) => {
                setProfile(e.target.value);
                setPagina(1);
              }}
            >
              <option value="">Todos os perfis</option>
              {options("OPERADOR", "ESTUDANTE", "MOTORISTA").map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          )}
          <button className="icon" aria-label="Atualizar lista" onClick={load}>
            <RefreshCw size={18} />
          </button>
        </div>
        {error && (
          <div className="error" role="alert">
            {error}
            <button className="text-button" onClick={load}>
              Tentar novamente
            </button>
          </div>
        )}
        {busy ? (
          <div className="empty" role="status">
            Buscando os registros…
          </div>
        ) : (
          <>
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    {r.columns.map(([key, label]) => (
                      <th key={key}>{label}</th>
                    ))}
                    <th className="actions-head">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {visible.map((item) => (
                    <tr key={item.id}>
                      {r.columns.map(([key]) => {
                        const value = get(item, key);
                        return (
                          <td key={key}>
                            {[
                              "status",
                              "usuario.status",
                              "statusCadastro",
                              "ativo",
                              "ativa",
                            ].includes(key) ? (
                              <Badge value={value} />
                            ) : key.endsWith("Id") ? (
                              lookup[value] || "—"
                            ) : key === "validadeCnh" ? (
                              date(value)
                            ) : ["inicio", "fim"].includes(key) ? (
                              dateTime(value)
                            ) : (
                              labels[value] || value || "—"
                            )}
                          </td>
                        );
                      })}
                      <td>
                        <div className="row-actions">
                          <button
                            className="icon"
                            title="Ver detalhes"
                            aria-label={`Ver ${titleOf(item)}`}
                            onClick={() => inspect(item)}
                          >
                            <Eye size={17} />
                          </button>
                          {r.key !== "semestres" && (
                            <button
                              className="icon"
                              title="Editar"
                              aria-label={`Editar ${titleOf(item)}`}
                              onClick={() => editing(item)}
                            >
                              <Pencil size={16} />
                            </button>
                          )}
                          {r.status && (
                            <button
                              className="icon"
                              title="Alterar situação"
                              aria-label={`Alterar situação de ${titleOf(item)}`}
                              onClick={() => changeStatus(item)}
                            >
                              <Power size={16} />
                            </button>
                          )}
                          {r.history && (
                            <button
                              className="icon"
                              title="Histórico"
                              aria-label={`Histórico de ${titleOf(item)}`}
                              onClick={() => history(item)}
                            >
                              <History size={16} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {!visible.length && (
              <div className="empty">
                <Search size={30} />
                <h3>
                  {query
                    ? "Nenhum resultado nesta página"
                    : "Tudo pronto para começar"}
                </h3>
                <p>
                  {query
                    ? "Tente outro nome ou avance para outra página."
                    : `Os registros de ${r.title.toLowerCase()} vão aparecer aqui.`}
                </p>
              </div>
            )}
          </>
        )}
        <div className="pagination">
          <span>
            Página {pagina} · {data.length} registros carregados
          </span>
          <div>
            <button
              className="secondary"
              disabled={pagina === 1 || busy}
              onClick={() => setPagina((p) => p - 1)}
            >
              <ChevronLeft size={16} />
              Anterior
            </button>
            <button
              className="secondary"
              disabled={!next || busy}
              onClick={() => setPagina((p) => p + 1)}
            >
              Próxima
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </section>
      {detail && (
        <Modal
          title={detail.title}
          close={() => {
            setDetail(null);
            setSelected(null);
          }}
        >
          <div className="modal-content">
            <Detail data={detail.data} />
            {selected &&
              ["usuarios", "estudantes", "motoristas"].includes(r.key) && (
                <div className="action-grid">
                  <button
                    className="secondary"
                    onClick={() => {
                      setPhoto(
                        r.key === "usuarios"
                          ? selected.id
                          : selected.usuario.id,
                      );
                      setDetail(null);
                    }}
                  >
                    Alterar ou remover foto
                  </button>
                </div>
              )}
            {selected && r.key === "estudantes" && (
              <div className="action-grid">
                {[
                  "aprovar",
                  "rejeitar",
                  "suspender",
                  "reativar",
                  "encerrar",
                  "reabrir",
                ].map((action) => (
                  <button
                    className="secondary"
                    key={action}
                    onClick={() => {
                      setDetail(null);
                      setEdit({
                        title: `${action[0].toUpperCase() + action.slice(1)} cadastro`,
                        fields: [reason],
                        path: `estudantes/${selected.id}/${action}`,
                      });
                    }}
                  >
                    {action[0].toUpperCase() + action.slice(1)} cadastro
                  </button>
                ))}
                <button
                  className="secondary"
                  onClick={() => {
                    setDetail(null);
                    setEdit({
                      title: "Corrigir dados pessoais e acadêmicos",
                      fields: [
                        ...identity.filter(
                          (f) => !["cpf", "senha"].includes(f.name),
                        ),
                        field("curso", "Curso", "text", { required: false }),
                        field("cidadeOrigemId", "Cidade de origem", "select", {
                          source: "cidades",
                          required: false,
                        }),
                        field("unidadeEnsinoId", "Unidade", "select", {
                          source: "unidades-ensino",
                        }),
                        reason,
                      ],
                      initial: {
                        ...selected.usuario,
                        curso: selected.curso,
                        cidadeOrigemId: selected.cidadeOrigem?.id,
                        unidadeEnsinoId: selected.unidadeEnsino.id,
                      },
                      path: `usuarios/${selected.usuario.id}/dados`,
                      method: "PATCH",
                      map: (d) => {
                        const {
                          curso,
                          cidadeOrigemId,
                          unidadeEnsinoId,
                          ...pessoa
                        } = d;
                        return {
                          ...pessoa,
                          estudante: { curso, cidadeOrigemId, unidadeEnsinoId },
                        };
                      },
                    });
                  }}
                >
                  Corrigir dados pessoais e acadêmicos
                </button>
                <button
                  className="secondary"
                  onClick={async () => {
                    try {
                      setDetail({
                        title: "Acompanhamento disciplinar",
                        data: await api(
                          `operacao/estudantes/${selected.id}/disciplina?limite=100`,
                        ),
                      });
                    } catch (e) {
                      setError((e as Error).message);
                    }
                  }}
                >
                  Consultar faltas e advertências
                </button>
              </div>
            )}
          </div>
        </Modal>
      )}
      {photo && (
        <Photo id={photo} close={() => setPhoto(null)} notify={notify} />
      )}
      {edit && (
        <Editor
          {...edit}
          close={() => setEdit(null)}
          save={async (d) => {
            const mapped = edit.map ? edit.map(d) : d;
            if (edit.title === "Completar conta de motorista existente") {
              const { usuarioId, ...body } = mapped;
              await api(`motoristas/usuarios/${usuarioId}`, "POST", body);
            } else await api(edit.path, edit.method || "POST", mapped);
            notify("Tudo certo! Os dados foram salvos.");
            void load();
          }}
        />
      )}
    </>
  );
}
