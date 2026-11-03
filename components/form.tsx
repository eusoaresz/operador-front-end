"use client";
import { useEffect, useId, useRef, useState } from "react";
import { ArrowDown, ArrowUp, Plus, X } from "lucide-react";
import { all, ApiError, iso, localInput } from "../lib/api";
import { Field, Option, RecordData, titleOf } from "../lib/catalog";

export function Modal({
  title,
  children,
  close,
}: {
  title: string;
  children: React.ReactNode;
  close: () => void;
}) {
  const titleId = useId();
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current!;
    dialog.showModal();
    return () => dialog.close();
  }, []);
  return (
    <dialog
      ref={ref}
      onCancel={(e) => {
        e.preventDefault();
        close();
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) close();
      }}
      aria-labelledby={titleId}
    >
      <header>
        <h2 id={titleId}>{title}</h2>
        <button
          type="button"
          className="icon"
          onClick={close}
          aria-label="Fechar"
        >
          <X size={20} />
        </button>
      </header>
      {children}
    </dialog>
  );
}
export function Editor({
  title,
  fields,
  initial = {},
  save,
  close,
  help,
  partial = false,
}: {
  title: string;
  fields: Field[];
  initial?: RecordData;
  save: (data: RecordData) => Promise<void>;
  close: () => void;
  help?: string;
  partial?: boolean;
}) {
  const [values, setValues] = useState<RecordData>(() =>
    Object.fromEntries(
      fields.map((f) => {
        let v = initial[f.name];
        if (f.type === "datetime-local" && v) v = localInput(v);
        if (f.type === "timeMinutes" && v != null)
          v = `${String(Math.floor(v / 60)).padStart(2, "0")}:${String(v % 60).padStart(2, "0")}`;
        return [
          f.name,
          v ??
            (f.type === "ordered"
              ? []
              : f.type === "checkbox"
                ? false
                : f.name.endsWith("DiaOffset")
                  ? "0"
                  : ""),
        ];
      }),
    ),
  );
  const [choices, setChoices] = useState<Record<string, Option[]>>({});
  const [error, setError] = useState("");
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(fields.some((f) => f.source));
  const [candidate, setCandidate] = useState("");
  const [changed, setChanged] = useState<Set<string>>(new Set());
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const result: Record<string, Option[]> = {};
        for (const source of new Set(
          fields.map((f) => f.source).filter(Boolean),
        )) {
          let items = await all(source!);
          if (
            source === "pontos-parada" &&
            fields.some((f) => f.name === "pontoParadaId")
          )
            items = items.filter(
              (item) =>
                !item.unidadeEnsino || item.id === initial.pontoParadaId,
            );
          result[source!] = items
            .sort((a, b) => titleOf(a).localeCompare(titleOf(b), "pt-BR"))
            .map((item) => ({
              value: item.id,
              label: `${titleOf(item)}${item.cidade ? ` · ${item.cidade}` : ""}${item.ativa === false || item.ativo === false || (item.usuario?.status && item.usuario.status !== "ATIVA") ? " (inativo)" : ""}`,
            }));
        }
        if (active) setChoices(result);
      } catch (e) {
        if (active) setError((e as Error).message);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [fields]);
  const change = (name: string, value: any) => {
    setValues((v) => ({ ...v, [name]: value }));
    setChanged((s) => new Set([...s, name]));
  };
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setErrors({});
    try {
      const data: RecordData = {};
      for (const f of fields) {
        if (partial && !changed.has(f.name) && f.name !== "motivo") continue;
        const v = values[f.name];
        if ((v === "" || v === undefined) && !f.required) {
          if (
            initial[f.name] != null ||
            f.name === "publicoPerfil" ||
            f.name === "expiraEm"
          )
            data[f.name] = null;
          continue;
        }
        data[f.name] =
          f.type === "number" || f.name.endsWith("DiaOffset")
            ? Number(v)
            : f.type === "datetime-local" && v
              ? iso(v)
              : f.type === "timeMinutes"
                ? v
                  ? Number(v.split(":")[0]) * 60 + Number(v.split(":")[1])
                  : null
                : v;
      }
      await save(data);
      close();
    } catch (e) {
      setError((e as Error).message);
      if (e instanceof ApiError) setErrors(e.campos);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal
      title={title}
      close={() => {
        if (!busy) close();
      }}
    >
      <form onSubmit={submit}>
        {help && <p className="form-help">{help}</p>}
        {error && (
          <div className="error" role="alert">
            {error}
            {errors &&
              Object.entries(errors)
                .filter(([k]) => !fields.some((f) => f.name === k))
                .map(([k, v]) => <p key={k}>{v.join(". ")}</p>)}
          </div>
        )}
        {loading && <p role="status">Carregando opções…</p>}
        <div className="form-grid">
          {fields.map((f) => (
            <div
              className={`field ${["textarea", "ordered"].includes(f.type || "") ? "wide" : ""}`}
              key={f.name}
            >
              <label htmlFor={`f-${f.name}`}>
                {f.label}
                {f.required && <span className="required"> *</span>}
              </label>
              {f.type === "ordered" ? (
                <div className="ordered">
                  <ol>
                    {(values[f.name] as string[]).map((id, i, ids) => (
                      <li key={id}>
                        <span>
                          {(choices[f.source!] || []).find(
                            (c) => c.value === id,
                          )?.label || "Ponto indisponível"}
                        </span>
                        <button
                          type="button"
                          className="icon"
                          aria-label="Mover para cima"
                          disabled={i === 0}
                          onClick={() => {
                            const copy = [...ids];
                            [copy[i - 1], copy[i]] = [copy[i], copy[i - 1]];
                            change(f.name, copy);
                          }}
                        >
                          <ArrowUp size={16} />
                        </button>
                        <button
                          type="button"
                          className="icon"
                          aria-label="Mover para baixo"
                          disabled={i === ids.length - 1}
                          onClick={() => {
                            const copy = [...ids];
                            [copy[i + 1], copy[i]] = [copy[i], copy[i + 1]];
                            change(f.name, copy);
                          }}
                        >
                          <ArrowDown size={16} />
                        </button>
                        <button
                          type="button"
                          className="icon"
                          aria-label="Remover parada"
                          onClick={() =>
                            change(
                              f.name,
                              ids.filter((x) => x !== id),
                            )
                          }
                        >
                          <X size={16} />
                        </button>
                      </li>
                    ))}
                  </ol>
                  <div className="inline">
                    <select
                      aria-label="Escolher parada"
                      value={candidate}
                      onChange={(e) => setCandidate(e.target.value)}
                    >
                      <option value="">Escolha um ponto…</option>
                      {(choices[f.source!] || [])
                        .filter((o) => !values[f.name].includes(o.value))
                        .map((o) => (
                          <option key={o.value} value={o.value}>
                            {o.label}
                          </option>
                        ))}
                    </select>
                    <button
                      type="button"
                      className="secondary"
                      disabled={!candidate}
                      onClick={() => {
                        change(f.name, [...values[f.name], candidate]);
                        setCandidate("");
                      }}
                    >
                      <Plus size={16} />
                      Adicionar
                    </button>
                  </div>
                </div>
              ) : f.type === "select" ? (
                <select
                  id={`f-${f.name}`}
                  value={values[f.name]}
                  required={f.required}
                  onChange={(e) => change(f.name, e.target.value)}
                  aria-describedby={f.hint ? `hint-${f.name}` : undefined}
                >
                  <option value="">
                    {f.required ? "Selecione…" : "Todos / sem informação"}
                  </option>
                  {(f.options || choices[f.source!] || []).map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              ) : f.type === "textarea" ? (
                <textarea
                  id={`f-${f.name}`}
                  rows={4}
                  required={f.required}
                  minLength={f.min}
                  maxLength={f.max || 5000}
                  value={values[f.name]}
                  onChange={(e) => change(f.name, e.target.value)}
                />
              ) : f.type === "checkbox" ? (
                <input
                  id={`f-${f.name}`}
                  type="checkbox"
                  checked={!!values[f.name]}
                  onChange={(e) => change(f.name, e.target.checked)}
                />
              ) : (
                <input
                  id={`f-${f.name}`}
                  type={f.type === "timeMinutes" ? "time" : f.type || "text"}
                  required={f.required}
                  value={values[f.name]}
                  min={f.type === "number" ? f.min : undefined}
                  max={f.type === "number" ? f.max : undefined}
                  minLength={f.type !== "number" ? f.min : undefined}
                  maxLength={f.type !== "number" ? f.max : undefined}
                  step={f.type === "number" ? 1 : undefined}
                  pattern={f.pattern}
                  autoComplete={f.type === "password" ? "new-password" : "off"}
                  onChange={(e) => change(f.name, e.target.value)}
                />
              )}
              {f.hint && <small id={`hint-${f.name}`}>{f.hint}</small>}
              {errors[f.name] && (
                <small className="field-error">
                  {errors[f.name].join(". ")}
                </small>
              )}
            </div>
          ))}
        </div>
        <footer>
          <button
            className="secondary"
            type="button"
            disabled={busy}
            onClick={close}
          >
            Cancelar
          </button>
          <button className="primary" disabled={busy || loading}>
            {busy ? "Salvando…" : "Confirmar e salvar"}
          </button>
        </footer>
      </form>
    </Modal>
  );
}
