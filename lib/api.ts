export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public campos: Record<string, string[]> = {},
  ) {
    super(message);
  }
}
let token: string | null = null;
export function setToken(value: string | null) {
  token = value;
}
export async function api(
  path: string,
  method = "GET",
  body?: unknown,
): Promise<any> {
  let response: Response;
  try {
    response = await fetch(`/api/v1/${path}`, {
      method,
      cache: "no-store",
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(body !== undefined && !(body instanceof FormData)
          ? { "Content-Type": "application/json" }
          : {}),
      },
      body:
        body === undefined
          ? undefined
          : body instanceof FormData
            ? body
            : JSON.stringify(body),
    });
  } catch {
    throw new ApiError(
      "Não conseguimos conectar. Confira sua conexão e tente novamente.",
      0,
    );
  }
  const data =
    response.status === 204 ? null : await response.json().catch(() => null);
  if (!response.ok) {
    if (response.status === 401 && !path.startsWith("auth/"))
      window.dispatchEvent(new Event("unibus:sessao-expirada"));
    throw new ApiError(
      typeof data?.erro === "string"
        ? data.erro
        : response.status === 404 && !data
          ? "O servidor configurado não possui esta rota. Confira BACKEND_URL e reinicie o front-end."
          : response.status >= 500
          ? "Não foi possível acessar o servidor. Confira se o back-end está iniciado."
          : "Não foi possível concluir a ação.",
      response.status,
      data?.campos || (typeof data?.erro === "object" ? data.erro : {}),
    );
  }
  return data;
}
export const rows = (value: any): any[] =>
  Array.isArray(value) ? value : value?.dados || [];
export async function all(path: string): Promise<any[]> {
  if (path === "operacao/semestres") return rows(await api(path));
  const result: any[] = [];
  for (let pagina = 1; ; pagina++) {
    const page = await api(
      `${path}${path.includes("?") ? "&" : "?"}limite=100&pagina=${pagina}`,
    );
    const items = rows(page);
    result.push(...items);
    if (Array.isArray(page) ? items.length < 100 : !page?.meta?.temProxima)
      return result;
  }
}
export const dateTime = (value: string) =>
  value
    ? new Intl.DateTimeFormat("pt-BR", {
        timeZone: "America/Sao_Paulo",
        dateStyle: "short",
        timeStyle: "short",
      }).format(new Date(value))
    : "—";
export const date = (value: string) =>
  value
    ? new Date(`${value.slice(0, 10)}T12:00:00Z`).toLocaleDateString("pt-BR", {
        timeZone: "America/Sao_Paulo",
      })
    : "—";
export const localInput = (value: string) => {
  if (!value) return "";
  const parts = new Intl.DateTimeFormat("sv-SE", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(new Date(value));
  return parts.replace(" ", "T");
};
export const iso = (value: string) => `${value}:00-03:00`;
