import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import ts from "typescript";
const source = await readFile(
  new URL("../lib/api.ts", import.meta.url),
  "utf8",
);
const js = ts.transpileModule(source, {
  compilerOptions: {
    target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.ES2022,
  },
}).outputText;
const { api, all, setToken, ApiError, localInput, iso } = await import(
  `data:text/javascript;base64,${Buffer.from(js).toString("base64")}`
);
beforeEach(() => setToken(null));
test("paginação reúne todas as opções e preserva os filtros", async () => {
  const urls = [];
  globalThis.fetch = async (url) => {
    urls.push(url);
    return Response.json({
      dados: [{ id: urls.length }],
      meta: { temProxima: urls.length < 3 },
    });
  };
  const result = await all("usuarios?perfil=MOTORISTA");
  assert.equal(result.length, 3);
  assert.match(urls[2], /perfil=MOTORISTA&limite=100&pagina=3/);
});
test("listas operacionais em array avançam até a última página", async () => {
  let count = 0;
  globalThis.fetch = async () =>
    Response.json(
      ++count === 1
        ? Array.from({ length: 100 }, (_, id) => ({ id }))
        : [{ id: 100 }],
    );
  assert.equal((await all("operacao/trechos/exemplo/fila")).length, 101);
});
test("semestres sem paginação não são solicitados em laço", async () => {
  let count = 0;
  globalThis.fetch = async () => {
    count++;
    return Response.json(Array(100).fill({ nome: "Semestre" }));
  };
  assert.equal((await all("operacao/semestres")).length, 100);
  assert.equal(count, 1);
});
test("envia Bearer e JSON; aceita logout 204", async () => {
  setToken("token-de-teste");
  globalThis.fetch = async (url, init) => {
    assert.equal(init.headers.Authorization, "Bearer token-de-teste");
    assert.equal(init.body, '{"nome":"Campus"}');
    return new Response(null, { status: 204 });
  };
  assert.equal(await api("auth/logout", "POST", { nome: "Campus" }), null);
});
test("validação preserva campos e conflitos preservam mensagem em português", async () => {
  globalThis.fetch = async () =>
    Response.json(
      { erro: "Dados inválidos", campos: { placa: ["Placa inválida"] } },
      { status: 400 },
    );
  await assert.rejects(
    api("veiculos", "POST", {}),
    (e) => e instanceof ApiError && e.campos.placa[0] === "Placa inválida",
  );
  globalThis.fetch = async () =>
    Response.json({ erro: "Veículo em uso" }, { status: 409 });
  await assert.rejects(
    api("veiculos/x", "PATCH", {}),
    (e) => e.status === 409 && e.message === "Veículo em uso",
  );
});
test("sessão expirada avisa a interface; senha incorreta não dispara expiração global", async () => {
  const events = [];
  globalThis.window = { dispatchEvent: (e) => events.push(e.type) };
  globalThis.fetch = async () =>
    Response.json({ erro: "Token expirado" }, { status: 401 });
  await assert.rejects(api("usuarios/me"));
  assert.deepEqual(events, ["unibus:sessao-expirada"]);
  await assert.rejects(api("auth/login", "POST", {}));
  assert.equal(events.length, 1);
});
test("horários usam Brasília independentemente do fuso do computador", () => {
  assert.equal(localInput("2026-11-02T10:30:00Z"), "2026-11-02T07:30");
  assert.equal(iso("2026-11-02T07:30"), "2026-11-02T07:30:00-03:00");
});

 test("rota ausente em servidor incorreto orienta revisar a conexão", async () => {
 globalThis.fetch = async () => new Response("<html>Cannot POST /api/v1/auth/login</html>", {status:404,headers:{"Content-Type":"text/html"}});
 await assert.rejects(api("auth/login","POST",{}), e => e.status === 404 && e.message.includes("BACKEND_URL"));
 });
