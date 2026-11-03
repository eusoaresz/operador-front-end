"use client";
import { useEffect, useState } from "react";
import { all, api } from "../lib/api";
import { Field, RecordData, field, reason, titleOf } from "../lib/catalog";
import { Editor } from "./form";
import { Detail } from "./data-view";
export function Discipline({ notify }: { notify: (s: string) => void }) {
  const [students, setStudents] = useState<RecordData[]>([]),
    [id, setId] = useState(""),
    [data, setData] = useState<RecordData | null>(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [page, setPage] = useState(1);
  const [action, setAction] = useState<{
    title: string;
    path: string;
    fields: Field[];
    initial?: RecordData;
  } | null>(null);
  useEffect(() => {
    all("estudantes")
      .then(setStudents)
      .catch((e) => setError(e.message));
  }, []);
  async function load(value = id, pagina = 1) {
    setId(value);
    setPage(pagina);
    setBusy(true);
    setError("");
    try {
      setData(
        await api(
          `operacao/estudantes/${value}/disciplina?pagina=${pagina}&limite=20`,
        ),
      );
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">ACOMPANHAMENTO COM CUIDADO</p>
          <h1>Faltas e advertências</h1>
          <p>
            Consulte o histórico, analise justificativas e registre cada
            decisão.
          </p>
        </div>
      </div>
      <section className="panel modal-content">
        <label htmlFor="discipline-student">Estudante</label>
        <select
          id="discipline-student"
          value={id}
          onChange={(e) => {
            if (e.target.value) void load(e.target.value);
            else {
              setId("");
              setData(null);
            }
          }}
        >
          <option value="">Selecione um estudante…</option>
          {students.map((s) => (
            <option key={s.id} value={s.id}>
              {titleOf(s)} · {s.matricula}
            </option>
          ))}
        </select>
        {error && (
          <div className="error" role="alert">
            {error}
          </div>
        )}
        {busy ? (
          <p role="status">Consultando histórico…</p>
        ) : (
          data && (
            <>
              <div className="section-heading">
                <h2>Faltas</h2>
                <button
                  className="secondary"
                  onClick={() =>
                    setAction({
                      title: "Revisar e liberar advertências",
                      path: `operacao/estudantes/${id}/disciplina/liberar`,
                      fields: [
                        field("semestreId", "Semestre", "select", {
                          source: "operacao/semestres",
                        }),
                        reason,
                      ],
                    })
                  }
                >
                  Liberar advertências do semestre
                </button>
              </div>
              {data.faltas.length ? (
                data.faltas.map((f: RecordData) => (
                  <article className="segment" key={f.id}>
                    <Detail data={f} />
                    <button
                      className="secondary"
                      onClick={() =>
                        setAction({
                          title: "Analisar justificativa",
                          path: `operacao/faltas/${f.id}/analisar`,
                          fields: [
                            field(
                              "aprovar",
                              "Aceitar justificativa e retirar da contagem",
                              "checkbox",
                              { required: false },
                            ),
                            reason,
                          ],
                        })
                      }
                    >
                      Analisar justificativa
                    </button>
                  </article>
                ))
              ) : (
                <p className="empty">Nenhuma falta nesta página.</p>
              )}
              <div className="pagination">
                <span>Página {page}</span>
                <div>
                  <button
                    className="secondary"
                    disabled={page === 1}
                    onClick={() => load(id, page - 1)}
                  >
                    Anterior
                  </button>
                  <button
                    className="secondary"
                    disabled={data.faltas.length < 20}
                    onClick={() => load(id, page + 1)}
                  >
                    Próxima
                  </button>
                </div>
              </div>
              <h2>Advertências</h2>
              <Detail data={data.advertencias} />
            </>
          )
        )}
        {!id && (
          <p className="empty">
            Escolha um estudante para acompanhar seu histórico.
          </p>
        )}
      </section>
      {action && (
        <Editor
          {...action}
          close={() => setAction(null)}
          save={async (d) => {
            await api(action.path, "POST", d);
            notify("Análise registrada.");
            await load(id, page);
          }}
        />
      )}
    </>
  );
}
