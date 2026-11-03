"use client";
import { useState } from "react";
import { api } from "../lib/api";
import { Modal } from "./form";
export function Photo({
  id,
  close,
  notify,
}: {
  id: string;
  close: () => void;
  notify: (s: string) => void;
}) {
  const [file, setFile] = useState<File | null>(null),
    [reason, setReason] = useState(""),
    [remove, setRemove] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  return (
    <Modal
      title="Foto do cadastro"
      close={() => {
        if (!busy) close();
      }}
    >
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setError("");
          try {
            if (remove)
              await api(`usuarios/${id}/foto`, "DELETE", { motivo: reason });
            else {
              const data = new FormData();
              data.append("motivo", reason);
              data.append("foto", file!);
              await api(`usuarios/${id}/foto`, "PUT", data);
            }
            notify(remove ? "Foto removida." : "Foto atualizada.");
            close();
          } catch (e) {
            setError((e as Error).message);
          } finally {
            setBusy(false);
          }
        }}
      >
        <div className="form-grid">
          <div className="field wide">
            <p className="muted">
              Escolha uma foto ou remova a foto atual. JPEG ou PNG, até 5 MB e
              16 megapixels.
            </p>
            <label className="inline">
              <input
                type="checkbox"
                checked={remove}
                onChange={(e) => setRemove(e.target.checked)}
              />
              Remover foto atual
            </label>
            {!remove && (
              <>
                <label htmlFor="user-photo">Nova foto</label>
                <input
                  id="user-photo"
                  type="file"
                  accept="image/jpeg,image/png"
                  required
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                />
              </>
            )}
            <label htmlFor="photo-reason">Motivo</label>
            <textarea
              id="photo-reason"
              required
              minLength={3}
              maxLength={1000}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
            {error && (
              <div className="error" role="alert">
                {error}
              </div>
            )}
          </div>
        </div>
        <footer>
          <button
            type="button"
            className="secondary"
            disabled={busy}
            onClick={close}
          >
            Cancelar
          </button>
          <button className="primary" disabled={busy}>
            {busy ? "Salvando…" : "Confirmar alteração"}
          </button>
        </footer>
      </form>
    </Modal>
  );
}
