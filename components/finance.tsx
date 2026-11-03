"use client";
import { useCallback, useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { all, api, rows } from "../lib/api";
import {
  Field,
  RecordData,
  field,
  reason,
  titleOf,
  options,
} from "../lib/catalog";
import { Editor, Modal } from "./form";
import { Badge, Detail } from "./data-view";
export function Finance({ notify }: { notify: (s: string) => void }) {
  const [tab, setTab] = useState("carteiras"),
    [items, setItems] = useState<RecordData[]>([]),
    [page, setPage] = useState(1),
    [next, setNext] = useState(false),
    [status, setStatus] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const [detail, setDetail] = useState<any>(null),
    [action, setAction] = useState<{
      title: string;
      path: string;
      fields: Field[];
      key: string;
    } | null>(null);
  const load = useCallback(async () => {
    setBusy(true);
    setError("");
    try {
      const result = await api(
        `operador/${tab}?pagina=${page}&limite=20${tab === "recargas" && status ? `&status=${status}` : ""}`,
      );
      setItems(rows(result));
      setNext(
        Array.isArray(result)
          ? result.length === 20
          : !!result.meta?.temProxima,
      );
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }, [page, tab, status]);
  useEffect(() => {
    void load();
  }, [load]);
  const open = (title: string, path: string, fields: Field[]) =>
    setAction({ title, path, fields, key: crypto.randomUUID() });
  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">TRANSPARÊNCIA EM CADA PASSAGEM</p>
          <h1>Carteiras e recargas</h1>
          <p>Consulte saldos e registre os movimentos com responsabilidade.</p>
        </div>
        <button
          className="primary"
          onClick={() =>
            open(
              "Registrar recarga em dinheiro",
              "operador/recargas/dinheiro",
              [
                field("estudanteId", "Estudante", "select", {
                  source: "estudantes",
                }),
                field("valor", "Valor recebido (R$)", "text", {
                  pattern: "[0-9]+([.][0-9]{1,2})?",
                  hint: "Use ponto para centavos. Mínimo R$ 2,00.",
                }),
              ],
            )
          }
        >
          <Plus size={18} />
          Recarga em dinheiro
        </button>
      </div>
      <section className="panel">
        <div className="toolbar">
          <button
            className={tab === "carteiras" ? "primary" : "secondary"}
            onClick={() => {
              setTab("carteiras");
              setPage(1);
            }}
          >
            Carteiras
          </button>
          <button
            className={tab === "recargas" ? "primary" : "secondary"}
            onClick={() => {
              setTab("recargas");
              setPage(1);
            }}
          >
            Recargas
          </button>
          {tab === "recargas" && (
            <select
              aria-label="Filtrar recargas"
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                setPage(1);
              }}
            >
              <option value="">Todas as situações</option>
              {options("PENDENTE", "APROVADA", "REJEITADA", "CANCELADA").map(
                (o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ),
              )}
            </select>
          )}
        </div>
        {error && (
          <div className="error" role="alert">
            {error}
          </div>
        )}
        {busy ? (
          <p className="empty" role="status">
            Consultando…
          </p>
        ) : (
          items.map((item) => (
            <article className="finance-row" key={item.id}>
              <div>
                <strong>
                  {item.estudante?.usuario?.nome ||
                    item.carteira?.estudante?.usuario?.nome ||
                    titleOf(item)}
                </strong>
                <p className="muted">
                  {tab === "carteiras"
                    ? `Saldo: R$ ${item.saldo} · Limite: R$ ${item.limiteCredito}`
                    : `R$ ${item.valor} · ${item.formaPagamento || ""}`}
                </p>
                {item.status && <Badge value={item.status} />}
              </div>
              <div className="row-actions">
                <button className="secondary" onClick={() => setDetail(item)}>
                  Detalhes
                </button>
                {tab === "carteiras" && (
                  <button
                    className="secondary"
                    onClick={async () => {
                      try {
                        setDetail(
                          await all(
                            `operador/carteiras/${item.estudanteId || item.estudante?.id}/extrato`,
                          ),
                        );
                      } catch (e) {
                        setError((e as Error).message);
                      }
                    }}
                  >
                    Extrato
                  </button>
                )}
                {tab === "recargas" && item.status === "PENDENTE" && (
                  <>
                    <button
                      className="secondary"
                      onClick={() =>
                        open(
                          "Aprovar recarga",
                          `operador/recargas/${item.id}/aprovar`,
                          [],
                        )
                      }
                    >
                      Aprovar
                    </button>
                    <button
                      className="danger-outline"
                      onClick={() =>
                        open(
                          "Rejeitar recarga",
                          `operador/recargas/${item.id}/rejeitar`,
                          [reason],
                        )
                      }
                    >
                      Rejeitar
                    </button>
                  </>
                )}
                {tab === "recargas" && item.status === "APROVADA" && (
                  <button
                    className="danger-outline"
                    onClick={() =>
                      open(
                        "Estornar recarga",
                        `operador/recargas/${item.id}/estornar`,
                        [reason],
                      )
                    }
                  >
                    Estornar
                  </button>
                )}
              </div>
            </article>
          ))
        )}
        {!busy && !items.length && (
          <p className="empty">Nenhum registro nesta página.</p>
        )}
        <div className="pagination">
          <span>Página {page}</span>
          <div>
            <button
              className="secondary"
              disabled={page === 1 || busy}
              onClick={() => setPage((p) => p - 1)}
            >
              Anterior
            </button>
            <button
              className="secondary"
              disabled={!next || busy}
              onClick={() => setPage((p) => p + 1)}
            >
              Próxima
            </button>
          </div>
        </div>
      </section>
      {detail && (
        <Modal title="Consulta financeira" close={() => setDetail(null)}>
          <div className="modal-content">
            <Detail data={detail} />
          </div>
        </Modal>
      )}
      {action && (
        <Editor
          title={action.title}
          fields={action.fields}
          help="Confira os dados antes de confirmar. Esta ação movimenta ou analisa crédito da carteira."
          close={() => setAction(null)}
          save={async (d) => {
            await api(action.path, "POST", {
              ...d,
              chaveIdempotencia: action.key,
            });
            notify("Movimentação registrada.");
            await load();
          }}
        />
      )}
    </>
  );
}
