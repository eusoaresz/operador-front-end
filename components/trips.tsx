"use client";
import { useCallback, useEffect, useState } from "react";
import {
  ArrowRight,
  Bus,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Plus,
  RefreshCw,
} from "lucide-react";
import { all, api, date, dateTime, rows } from "../lib/api";
import {
  Field,
  RecordData,
  field,
  options,
  reason,
  labels,
} from "../lib/catalog";
import { Editor, Modal } from "./form";
import { Badge, Detail } from "./data-view";

type Action = {
  title: string;
  fields: Field[];
  initial?: RecordData;
  path: string;
  method?: string;
  help?: string;
  map?: (d: RecordData) => RecordData;
};
const tripFields = [
  field("data", "Data da ida", "date"),
  field("turno", "Turno", "select", {
    options: options("MANHA", "TARDE", "NOITE"),
  }),
  field("rotaId", "Rota", "select", { source: "rotas" }),
  field("idaSaida", "Saída da ida", "datetime-local"),
  field("idaChegada", "Chegada da ida", "datetime-local"),
  field("voltaSaida", "Saída da volta", "datetime-local"),
  field("voltaChegada", "Chegada da volta", "datetime-local"),
];
const draftBody = (d: RecordData) => {
  const { idaSaida, idaChegada, voltaSaida, voltaChegada, ...rest } = d;
  return {
    ...rest,
    trechos: [
      {
        sentido: "IDA",
        saidaPrevistaEm: idaSaida,
        chegadaPrevistaEm: idaChegada,
      },
      {
        sentido: "VOLTA",
        saidaPrevistaEm: voltaSaida,
        chegadaPrevistaEm: voltaChegada,
      },
    ],
  };
};
export function Trips({ notify }: { notify: (s: string) => void }) {
  const [items, setItems] = useState<RecordData[]>([]),
    [selected, setSelected] = useState<RecordData | null>(null),
    [page, setPage] = useState(1),
    [next, setNext] = useState(false),
    [status, setStatus] = useState(""),
    [day, setDay] = useState("");
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [action, setAction] = useState<Action | null>(null),
    [view, setView] = useState<{
      title: string;
      data: any;
      type?: string;
      trecho?: RecordData;
    } | null>(null);
  const [listPage, setListPage] = useState(1);
  const load = useCallback(async () => {
    setBusy(true);
    setError("");
    try {
      const p = new URLSearchParams({ pagina: String(page), limite: "12" });
      if (status) p.set("status", status);
      if (day) p.set("data", day);
      const response = await api(`viagens?${p}`);
      setItems(rows(response));
      setNext(response.meta.temProxima);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }, [page, status, day]);
  useEffect(() => {
    void load();
  }, [load]);
  async function detail(id: string) {
    try {
      setSelected(await api(`viagens/${id}`));
    } catch (e) {
      setError((e as Error).message);
    }
  }
  function confirm(
    title: string,
    path: string,
    withReason = false,
    help?: string,
  ) {
    setAction({
      title,
      path,
      fields: withReason ? [reason] : [],
      help:
        help ||
        "Confirme para executar esta ação. As regras operacionais serão verificadas pelo UniBus.",
    });
  }
  async function list(t: RecordData, type: string, pagina = 1) {
    try {
      const result = await api(
        `operacao/trechos/${t.id}/${type}?pagina=${pagina}&limite=20`,
      );
      setView({
        title: type === "fila" ? "Fila de espera" : "Passageiros e embarques",
        data: rows(result),
        type,
        trecho: t,
      });
      setListPage(pagina);
    } catch (e) {
      setError((e as Error).message);
    }
  }
  async function routeChange(v: RecordData) {
    try {
      const rotas = await all("rotas");
      const choices = rotas
        .filter((r) => r.id !== v.rotaId && r.ativa)
        .map((r) => ({ value: r.id, label: r.nome }));
      setAction({
        title: "Trocar rota da viagem",
        path: `operacao/viagens/${v.id}/rota`,
        method: "PATCH",
        fields: [
          field("rotaId", "Nova rota", "select", { options: choices }),
          reason,
        ],
        help: "Se alguma parada deixar de existir na nova rota, escolha abaixo como resolver cada participação. A troca só será feita quando todas estiverem resolvidas.",
        map: (d) => ({ ...d, resolucoes: [] }),
      });
    } catch (e) {
      setError((e as Error).message);
    }
  }
  async function resolveRoute(v: RecordData) {
    try {
      const allParts: RecordData[] = [];
      for (const t of v.trechos)
        for (const type of ["passageiros", "fila"]) {
          const parts = await all(`operacao/trechos/${t.id}/${type}`);
          allParts.push(...parts.map((p) => ({ ...p, trecho: t })));
        }
      const fields: Field[] = [
        field("rotaId", "Nova rota", "select", { source: "rotas" }),
        reason,
      ];
      allParts.forEach((p, i) => {
        const name =
          p.estudante?.usuario?.nome ||
          p.estudante?.matricula ||
          `Passageiro ${i + 1}`;
        fields.push(
          field(
            `acao_${i}`,
            `${name} · ${labels[p.trecho.sentido]}`,
            "select",
            {
              options: [
                { value: "MANTER", label: "Manter paradas (se compatíveis)" },
                { value: "REALOCAR", label: "Trocar paradas" },
                {
                  value: "CANCELAR",
                  label: "Cancelar e estornar se confirmado",
                },
              ],
            },
          ),
          field(`origem_${i}`, `Novo embarque · ${name}`, "select", {
            source: "pontos-parada",
            required: false,
          }),
          field(`destino_${i}`, `Novo desembarque · ${name}`, "select", {
            source: "pontos-parada",
            required: false,
          }),
        );
      });
      setAction({
        title: "Trocar rota e resolver passageiros",
        path: `operacao/viagens/${v.id}/rota`,
        method: "PATCH",
        fields,
        initial: Object.fromEntries(
          allParts.map((_, i) => [`acao_${i}`, "MANTER"]),
        ),
        help: "Selecione pontos que pertençam à nova rota e respeitem o sentido do trecho. Cancelamentos estornam confirmações. Toda a troca ocorre em conjunto.",
        map: (d) => ({
          rotaId: d.rotaId,
          motivo: d.motivo,
          resolucoes: allParts.flatMap((p, i) =>
            d[`acao_${i}`] === "MANTER"
              ? []
              : [
                  d[`acao_${i}`] === "CANCELAR"
                    ? {
                        participacaoId: p.id,
                        acao: "CANCELAR",
                        motivo: d.motivo,
                      }
                    : {
                        participacaoId: p.id,
                        acao: "REALOCAR",
                        origemPontoId: d[`origem_${i}`],
                        destinoPontoId: d[`destino_${i}`],
                      },
                ],
          ),
        }),
      });
    } catch (e) {
      setError((e as Error).message);
    }
  }
  const act = (t: RecordData, suffix: string) =>
    `operacao/trechos/${t.id}/${suffix}`;
  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">CADA CAMINHO CONTA</p>
          <h1>Viagens e operação</h1>
          <p>
            Da preparação ao último desembarque, cuide de cada etapa por aqui.
          </p>
        </div>
        <button
          className="primary"
          onClick={() =>
            setAction({
              title: "Planejar viagem",
              fields: tripFields,
              path: "viagens",
              map: draftBody,
              help: "Horários de Pedro Osório (Brasília). A viagem começa como rascunho; aloque os recursos antes de publicar.",
            })
          }
        >
          <Plus size={18} />
          Planejar viagem
        </button>
      </div>
      <div className="toolbar panel">
        <label className="inline">
          <CalendarDays size={18} />
          <input
            aria-label="Filtrar por data"
            type="date"
            value={day}
            onChange={(e) => {
              setDay(e.target.value);
              setPage(1);
            }}
          />
        </label>
        <select
          aria-label="Filtrar situação da viagem"
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setPage(1);
          }}
        >
          <option value="">Todas as situações</option>
          {options(
            "RASCUNHO",
            "PROGRAMADA",
            "EM_ANDAMENTO",
            "CONCLUIDA",
            "CANCELADA",
          ).map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <button className="icon" aria-label="Atualizar viagens" onClick={load}>
          <RefreshCw size={18} />
        </button>
        <button
          className="text-button"
          onClick={() =>
            confirm(
              "Processar filas e prazos",
              "operacao/prazos/processar",
              false,
              "Reavalia filas elegíveis e prazos operacionais. O processamento também acontece automaticamente no servidor.",
            )
          }
        >
          Processar filas e prazos
        </button>
      </div>
      {error && (
        <div className="error" role="alert">
          {error}
        </div>
      )}
      {busy ? (
        <div className="empty" role="status">
          Buscando as viagens…
        </div>
      ) : (
        <div className="trip-grid">
          {items.map((v) => (
            <button
              className="trip-card"
              key={v.id}
              onClick={() => detail(v.id)}
            >
              <div className="spread">
                <span className="route-icon">
                  <Bus size={23} />
                </span>
                <Badge value={v.status} />
              </div>
              <h3>{v.nomeRota}</h3>
              <p>
                {date(v.data)} · {labels[v.turno]}
              </p>
              <div className="trip-times">
                {v.trechos.map((t: RecordData) => (
                  <div key={t.id}>
                    <small>{labels[t.sentido]}</small>
                    <strong>{dateTime(t.saidaPrevistaEm)}</strong>
                    <span>{labels[t.status]}</span>
                  </div>
                ))}
              </div>
              {v.revisaoRotaPendente && (
                <p className="field-error">
                  Revise o itinerário antes de publicar.
                </p>
              )}
              <span className="card-link">
                Acompanhar viagem <ArrowRight size={17} />
              </span>
            </button>
          ))}
        </div>
      )}
      {!busy && !items.length && (
        <div className="empty panel">
          <Bus size={36} />
          <h3>Seu próximo caminho começa aqui</h3>
          <p>
            Planeje uma viagem ou ajuste os filtros para encontrar as
            anteriores.
          </p>
        </div>
      )}
      <div className="pagination">
        <span>Página {page}</span>
        <div>
          <button
            className="secondary"
            disabled={page === 1 || busy}
            onClick={() => setPage((p) => p - 1)}
          >
            <ChevronLeft size={16} />
            Anterior
          </button>
          <button
            className="secondary"
            disabled={!next || busy}
            onClick={() => setPage((p) => p + 1)}
          >
            Próxima
            <ChevronRight size={16} />
          </button>
        </div>
      </div>
      {selected && (
        <Modal title={selected.nomeRota} close={() => setSelected(null)}>
          <div className="modal-content">
            <div className="spread">
              <p>
                {date(selected.data)} · {labels[selected.turno]}
              </p>
              <Badge value={selected.status} />
            </div>
            <div className="action-grid">
              {selected.status === "RASCUNHO" && (
                <>
                  <button
                    className="primary"
                    onClick={() =>
                      confirm(
                        "Publicar viagem",
                        `operacao/viagens/${selected.id}/publicar`,
                      )
                    }
                  >
                    Publicar viagem
                  </button>
                  <button
                    className="secondary"
                    onClick={() => {
                      const ida = selected.trechos.find(
                          (t: RecordData) => t.sentido === "IDA",
                        ),
                        volta = selected.trechos.find(
                          (t: RecordData) => t.sentido === "VOLTA",
                        );
                      setAction({
                        title: "Revisar rascunho",
                        fields: [...tripFields, reason],
                        initial: {
                          ...selected,
                          idaSaida: ida.saidaPrevistaEm,
                          idaChegada: ida.chegadaPrevistaEm,
                          voltaSaida: volta.saidaPrevistaEm,
                          voltaChegada: volta.chegadaPrevistaEm,
                        },
                        path: `viagens/${selected.id}`,
                        method: "PUT",
                        map: draftBody,
                      });
                    }}
                  >
                    Editar rascunho
                  </button>
                </>
              )}
              {selected.status === "PROGRAMADA" && (
                <>
                  <button
                    className="secondary"
                    onClick={() => routeChange(selected)}
                  >
                    Trocar rota mantendo paradas
                  </button>
                  <button
                    className="secondary"
                    onClick={() => resolveRoute(selected)}
                  >
                    Trocar rota e resolver passageiros
                  </button>
                </>
              )}
              {["RASCUNHO", "PROGRAMADA"].includes(selected.status) && (
                <button
                  className="danger-outline"
                  onClick={() =>
                    confirm(
                      "Cancelar viagem",
                      `operacao/viagens/${selected.id}/cancelar`,
                      true,
                      "Cancela ida e volta e estorna as confirmações permitidas. Revise antes de confirmar.",
                    )
                  }
                >
                  Cancelar viagem completa
                </button>
              )}
            </div>
            {selected.trechos.map((t: RecordData) => (
              <section className="segment" key={t.id}>
                <div className="spread">
                  <h3>{labels[t.sentido]}</h3>
                  <Badge value={t.status} />
                </div>
                <p>
                  {dateTime(t.saidaPrevistaEm)} <ArrowRight size={13} />{" "}
                  {dateTime(t.chegadaPrevistaEm)}
                </p>
                <p className="muted">
                  Capacidade: {t.capacidade ?? "a alocar"}
                  {t.capacidadeExtra ? ` + ${t.capacidadeExtra} extras` : ""} ·
                  Tarifa: R$ {t.tarifa}
                </p>
                <ol className="stops">
                  {t.paradas.map((p: RecordData) => (
                    <li key={p.id}>
                      {p.nome}
                      <small>{p.cidade}</small>
                    </li>
                  ))}
                </ol>
                <div className="action-grid">
                  {["RASCUNHO", "ABERTO", "FECHADO"].includes(t.status) && (
                    <button
                      className="secondary"
                      onClick={() =>
                        setAction({
                          title: "Alocar motorista e veículo",
                          fields: [
                            field("motoristaId", "Motorista", "select", {
                              source: "motoristas",
                            }),
                            field("veiculoId", "Veículo", "select", {
                              source: "veiculos",
                            }),
                            field(
                              "motoristaExtraId",
                              "Motorista extra",
                              "select",
                              { source: "motoristas", required: false },
                            ),
                            field("veiculoExtraId", "Veículo extra", "select", {
                              source: "veiculos",
                              required: false,
                            }),
                            reason,
                          ],
                          initial: t,
                          path: act(t, "recursos"),
                          method: "PATCH",
                          help: "Se houver recurso extra, preencha motorista e veículo extras juntos. A API verifica habilitação, capacidade e conflitos de horário.",
                        })
                      }
                    >
                      Alocar recursos
                    </button>
                  )}
                  {t.status !== "RASCUNHO" && (
                    <>
                      <button
                        className="secondary"
                        onClick={() => list(t, "passageiros")}
                      >
                        Passageiros e embarques
                      </button>
                      <button
                        className="secondary"
                        onClick={() => list(t, "fila")}
                      >
                        Fila de espera
                      </button>
                    </>
                  )}
                  {["ABERTO", "FECHADO"].includes(t.status) && (
                    <>
                      <button
                        className="secondary"
                        onClick={() =>
                          setAction({
                            title: "Incluir estudante",
                            fields: [
                              field("estudanteId", "Estudante", "select", {
                                source: "estudantes",
                              }),
                              field("origemId", "Embarque", "select", {
                                options: t.paradas.map((p: RecordData) => ({
                                  value: p.id,
                                  label: p.nome,
                                })),
                              }),
                              field("destinoId", "Desembarque", "select", {
                                options: t.paradas.map((p: RecordData) => ({
                                  value: p.id,
                                  label: p.nome,
                                })),
                              }),
                              reason,
                            ],
                            path: act(t, "inclusoes-excepcionais"),
                            help: "A inclusão respeita a fila, o saldo e a capacidade. Sem vaga ou saldo, o estudante permanece em espera.",
                          })
                        }
                      >
                        Incluir estudante
                      </button>
                      <button
                        className="secondary"
                        onClick={() =>
                          setAction({
                            title: "Confirmar estudante da fila",
                            fields: [
                              field("estudanteId", "Estudante", "select", {
                                source: "estudantes",
                              }),
                              reason,
                            ],
                            path: act(t, "confirmacoes"),
                            help: "Esta confirmação pode cobrar a tarifa na carteira. A ordem da fila e as regras de saldo continuam valendo.",
                          })
                        }
                      >
                        Confirmar da fila
                      </button>
                      <button
                        className="secondary"
                        onClick={() =>
                          setAction({
                            title: "Ajustar horários",
                            fields: [
                              field(
                                "saidaPrevistaEm",
                                "Saída prevista",
                                "datetime-local",
                              ),
                              field(
                                "chegadaPrevistaEm",
                                "Chegada prevista",
                                "datetime-local",
                              ),
                              field(
                                "reabrir",
                                "Reabrir prazos de confirmação e cancelamento",
                                "checkbox",
                                { required: false },
                              ),
                              reason,
                            ],
                            initial: t,
                            path: act(t, "horario"),
                            method: "PATCH",
                          })
                        }
                      >
                        Ajustar horários
                      </button>
                      <button
                        className="secondary"
                        onClick={() =>
                          setAction({
                            title: "Convocar van extra",
                            fields: [
                              field("motoristaId", "Motorista", "select", {
                                source: "motoristas",
                              }),
                              field("veiculoId", "Van", "select", {
                                source: "veiculos",
                              }),
                              field(
                                "prazoMinutos",
                                "Prazo de resposta (minutos)",
                                "number",
                                { min: 1, max: 20 },
                              ),
                            ],
                            initial: { prazoMinutos: 20 },
                            path: act(t, "convocacoes"),
                            help: "O motorista receberá uma convocação interna. A resposta deve ser dada na conta dele.",
                          })
                        }
                      >
                        Convocar van extra
                      </button>
                      <button
                        className="secondary"
                        onClick={() =>
                          confirm(
                            "Comunicar indisponibilidade",
                            act(t, "indisponibilidade"),
                            true,
                          )
                        }
                      >
                        Comunicar indisponibilidade
                      </button>
                      <button
                        className="primary"
                        onClick={() =>
                          confirm(
                            "Iniciar trecho",
                            act(t, "iniciar"),
                            false,
                            "Inicia a execução e encerra as janelas operacionais. Confira os recursos antes de continuar.",
                          )
                        }
                      >
                        Iniciar trecho
                      </button>
                      <button
                        className="danger-outline"
                        onClick={() =>
                          confirm("Cancelar trecho", act(t, "cancelar"), true)
                        }
                      >
                        Cancelar trecho
                      </button>
                    </>
                  )}
                  {t.status === "EM_ANDAMENTO" && (
                    <>
                      <button
                        className="primary"
                        onClick={() =>
                          confirm(
                            "Concluir trecho",
                            act(t, "concluir"),
                            false,
                            "A conclusão apura faltas dos estudantes confirmados sem embarque. Confira os registros de presença antes de confirmar.",
                          )
                        }
                      >
                        Concluir e apurar faltas
                      </button>
                      <button
                        className="secondary"
                        onClick={() =>
                          setAction({
                            title: "Registrar embarque por código",
                            fields: [
                              field(
                                "qr",
                                "Conteúdo do QR de embarque",
                                "textarea",
                              ),
                            ],
                            path: act(t, "embarques"),
                          })
                        }
                      >
                        Registrar código de embarque
                      </button>
                    </>
                  )}
                </div>
              </section>
            ))}
          </div>
        </Modal>
      )}
      {view && (
        <Modal title={view.title} close={() => setView(null)}>
          <div className="modal-content">
            {view.type ? (
              <>
                {view.data.length ? (
                  view.data.map((p: RecordData) => (
                    <div className="passenger" key={p.id}>
                      <div>
                        <strong>
                          {p.estudante?.usuario?.nome || "Estudante"}
                        </strong>
                        <p className="muted">
                          Matrícula {p.estudante?.matricula} ·{" "}
                          {p.alocacao || "Em espera"}
                        </p>
                      </div>
                      {view.type === "passageiros" &&
                        (p.embarques?.length ? (
                          <Badge value="CONFIRMADA" />
                        ) : view.trecho?.status === "EM_ANDAMENTO" ? (
                          <button
                            className="secondary"
                            onClick={() =>
                              setAction({
                                title: "Confirmar embarque",
                                fields: [],
                                path: act(view.trecho!, "embarques"),
                                map: () => ({ participacaoId: p.id }),
                                help: `Registrar o embarque de ${p.estudante?.usuario?.nome}?`,
                              })
                            }
                          >
                            Registrar embarque
                          </button>
                        ) : (
                          <span className="muted">Sem embarque</span>
                        ))}
                    </div>
                  ))
                ) : (
                  <p className="empty">Nenhum estudante nesta página.</p>
                )}
                <div className="pagination">
                  <span>Página {listPage}</span>
                  <div>
                    <button
                      className="secondary"
                      disabled={listPage === 1}
                      onClick={() =>
                        list(view.trecho!, view.type!, listPage - 1)
                      }
                    >
                      Anterior
                    </button>
                    <button
                      className="secondary"
                      disabled={view.data.length < 20}
                      onClick={() =>
                        list(view.trecho!, view.type!, listPage + 1)
                      }
                    >
                      Próxima
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <Detail data={view.data} />
            )}
          </div>
        </Modal>
      )}
      {action && (
        <Editor
          {...action}
          close={() => setAction(null)}
          save={async (d) => {
            await api(
              action.path,
              action.method || "POST",
              action.map ? action.map(d) : d,
            );
            notify("Ação concluída. Tudo atualizado por aqui.");
            void load();
            if (selected) await detail(selected.id);
            if (view?.type && view.trecho)
              await list(view.trecho, view.type, listPage);
          }}
        />
      )}
    </>
  );
}
