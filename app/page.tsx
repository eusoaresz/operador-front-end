"use client";
import { useCallback, useEffect, useState } from "react";
import {
  Bell,
  Bus,
  CalendarDays,
  ChevronRight,
  CircleUserRound,
  ClipboardList,
  Eye,
  EyeOff,
  GraduationCap,
  Home,
  Landmark,
  LogOut,
  MapPin,
  Megaphone,
  Menu,
  Route,
  ShieldCheck,
  Truck,
  Users,
  Wallet,
  X,
} from "lucide-react";
import { api, rows, setToken } from "../lib/api";
import { Field, RecordData, field, resources, titleOf } from "../lib/catalog";
import { Editor, Modal } from "../components/form";
import { Detail } from "../components/data-view";
import { ResourcePage } from "../components/resource-page";
import { Dashboard } from "../components/dashboard";
import { Trips } from "../components/trips";
import { Discipline } from "../components/discipline";
import { Finance } from "../components/finance";

const navigation = [
  {
    label: "VISÃO GERAL",
    items: [
      { key: "inicio", label: "Início", icon: Home },
      { key: "viagens", label: "Viagens e operação", icon: Bus },
      { key: "escalas", label: "Escalas semanais", icon: CalendarDays },
      { key: "avisos", label: "Avisos", icon: Megaphone },
    ],
  },
  {
    label: "NOSSA COMUNIDADE",
    items: [
      { key: "estudantes", label: "Estudantes", icon: GraduationCap },
      { key: "motoristas", label: "Motoristas", icon: CircleUserRound },
      { key: "usuarios", label: "Operadores e contas", icon: Users },
      {
        key: "disciplina",
        label: "Faltas e advertências",
        icon: ClipboardList,
      },
      { key: "financeiro", label: "Carteiras e recargas", icon: Wallet },
    ],
  },
  {
    label: "CAMINHOS E ESTRUTURA",
    items: [
      { key: "instituicoes", label: "Instituições", icon: Landmark },
      { key: "unidades", label: "Unidades de ensino", icon: GraduationCap },
      { key: "pontos", label: "Pontos de parada", icon: MapPin },
      { key: "rotas", label: "Rotas", icon: Route },
      { key: "veiculos", label: "Veículos", icon: Truck },
      { key: "cidades", label: "Cidades", icon: MapPin },
      { key: "semestres", label: "Semestres letivos", icon: CalendarDays },
    ],
  },
];
function Logo() {
  return (
    <div className="logo">
      <span>
        <Bus size={26} />
      </span>
      <div>
        Uni<span>Bus</span>
        <small>PAINEL DO OPERADOR</small>
      </div>
    </div>
  );
}
export default function Page() {
  const [user, setUser] = useState<RecordData | null>(null),
    [checking, setChecking] = useState(true),
    [section, setSection] = useState("inicio"),
    [mobile, setMobile] = useState(false),
    [toast, setToast] = useState("");
  const [authError, setAuthError] = useState(""),
    [busy, setBusy] = useState(false),
    [visible, setVisible] = useState(false),
    [loginMode, setLoginMode] = useState("login");
  const [notices, setNotices] = useState<any[] | null>(null),
    [noticePage, setNoticePage] = useState(1),
    [noticeNext, setNoticeNext] = useState(false),
    [profile, setProfile] = useState(false);
  const [editor, setEditor] = useState<{
    title: string;
    fields: Field[];
    initial?: RecordData;
    save: (d: RecordData) => Promise<void>;
  } | null>(null);
  const notify = useCallback((message: string) => setToast(message), []);
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(""), 6000);
    return () => clearTimeout(timer);
  }, [toast]);
  useEffect(() => {
    const saved = sessionStorage.getItem("unibus-token");
    if (saved) {
      setToken(saved);
      api("usuarios/me")
        .then((value) => {
          if (value.perfil !== "OPERADOR")
            throw new Error("Este painel é exclusivo para operadores.");
          setUser(value);
        })
        .catch((e) => {
          setToken(null);
          sessionStorage.removeItem("unibus-token");
          setAuthError(e.message);
        })
        .finally(() => setChecking(false));
    } else setChecking(false);
    const expired = () => {
      setToken(null);
      sessionStorage.removeItem("unibus-token");
      setUser(null);
      setSection("inicio");
      setAuthError("Sua sessão expirou. Entre novamente para continuar.");
      setNotices(null);
      setEditor(null);
      setProfile(false);
    };
    window.addEventListener("unibus:sessao-expirada", expired);
    return () => window.removeEventListener("unibus:sessao-expirada", expired);
  }, []);
  function navigate(key: string) {
    setSection(key);
    setMobile(false);
    window.history.replaceState(null, "", `#${key}`);
  }
  useEffect(() => {
    const hash = window.location.hash.slice(1);
    if (navigation.flatMap((g) => g.items).some((i) => i.key === hash))
      setSection(hash);
  }, []);
  async function login(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setAuthError("");
    const values = Object.fromEntries(new FormData(e.currentTarget));
    try {
      if (loginMode === "recover") {
        await api("auth/recuperar-senha", "POST", { email: values.email });
        notify("Se o e-mail estiver cadastrado, as instruções serão enviadas.");
        setLoginMode("reset");
      } else if (loginMode === "reset") {
        await api("auth/redefinir-senha", "POST", {
          email: values.email,
          codigo: values.codigo,
          novaSenha: values.senha,
        });
        notify("Senha atualizada. Você já pode entrar.");
        setLoginMode("login");
      } else {
        const { token } = await api("auth/login", "POST", {
          email: values.email,
          senha: values.senha,
        });
        setToken(token);
        const value = await api("usuarios/me");
        if (value.perfil !== "OPERADOR") {
          await api("auth/logout", "POST");
          setToken(null);
          throw new Error("Este painel é exclusivo para operadores.");
        }
        sessionStorage.setItem("unibus-token", token);
        setUser(value);
      }
    } catch (e) {
      setAuthError((e as Error).message);
      if (loginMode === "login") {
        setToken(null);
        sessionStorage.removeItem("unibus-token");
      }
    } finally {
      setBusy(false);
    }
  }
  async function logout() {
    setBusy(true);
    try {
      await api("auth/logout", "POST");
      sessionStorage.removeItem("unibus-token");
      setToken(null);
      setUser(null);
      setProfile(false);
      setNotices(null);
      setEditor(null);
      setSection("inicio");
    } catch (e) {
      notify(
        (e as Error).message +
          " Não foi possível confirmar a saída; tente novamente.",
      );
    } finally {
      setBusy(false);
    }
  }
  async function notifications(pagina = 1) {
    try {
      const result = await api(`notificacoes?pagina=${pagina}&limite=20`);
      setNotices(rows(result));
      setNoticePage(pagina);
      setNoticeNext(
        Array.isArray(result)
          ? result.length === 20
          : !!result.meta?.temProxima,
      );
    } catch (e) {
      notify((e as Error).message);
    }
  }
  const resource = resources.find((r) => r.key === section);
  const title =
    navigation.flatMap((g) => g.items).find((i) => i.key === section)?.label ||
    "Início";
  if (checking)
    return (
      <div className="loading-screen">
        <Logo />
        <p>Preparando seu painel…</p>
      </div>
    );
  return (
    <>
      {!user ? (
        <div className="login-page">
          <section className="login-story">
            <Logo />
            <div>
              <p className="eyebrow">
                UNIVERSIDADE É UM CAMINHO.
                <br />A GENTE VAI JUNTO.
              </p>
              <h1>
                Conectando
                <br />
                pessoas.
                <br />
                <span>Movendo futuros.</span>
              </h1>
              <p>
                Um lugar para cuidar das viagens e das pessoas
                <br />
                que fazem parte da nossa comunidade.
              </p>
            </div>
            <div className="login-road">
              <MapPin size={30} />
              <span />
              <Bus size={42} />
              <span />
              <GraduationCap size={40} />
            </div>
            <small>Pedro Osório · Comunidade universitária</small>
          </section>
          <main className="login-main">
            <div className="login-box">
              <span className="login-badge">
                <ShieldCheck size={17} /> Acesso do operador
              </span>
              <h2>
                {loginMode === "recover"
                  ? "Vamos recuperar seu acesso"
                  : loginMode === "reset"
                    ? "Uma nova senha, um novo começo"
                    : "Bom ter você por aqui."}
              </h2>
              <p>
                {loginMode === "login"
                  ? "Entre para organizar o dia e cuidar de cada caminho."
                  : "Use o e-mail da sua conta UniBus para continuar."}
              </p>
              <form onSubmit={login} key={loginMode}>
                {authError && (
                  <div className="error" role="alert">
                    {authError}
                  </div>
                )}
                <label htmlFor="email">E-mail</label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="voce@exemplo.com"
                  required
                  autoComplete="username"
                />
                {loginMode === "reset" && (
                  <>
                    <label htmlFor="code">Código de recuperação</label>
                    <input
                      id="code"
                      name="codigo"
                      inputMode="numeric"
                      pattern="[0-9]{6}"
                      maxLength={6}
                      required
                    />
                  </>
                )}
                {loginMode !== "recover" && (
                  <>
                    <label htmlFor="password">
                      {loginMode === "reset" ? "Nova senha" : "Senha"}
                    </label>
                    <div className="password">
                      <input
                        id="password"
                        name="senha"
                        type={visible ? "text" : "password"}
                        placeholder="Sua senha de acesso"
                        required
                        minLength={loginMode === "reset" ? 8 : undefined}
                        autoComplete={
                          loginMode === "reset"
                            ? "new-password"
                            : "current-password"
                        }
                      />
                      <button
                        className="icon"
                        type="button"
                        aria-label={visible ? "Ocultar senha" : "Mostrar senha"}
                        onClick={() => setVisible((v) => !v)}
                      >
                        {visible ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </>
                )}
                {loginMode === "login" && (
                  <button
                    type="button"
                    className="text-button forgot"
                    onClick={() => {
                      setLoginMode("recover");
                      setAuthError("");
                    }}
                  >
                    Esqueci minha senha
                  </button>
                )}
                <button className="primary login-submit" disabled={busy}>
                  {busy
                    ? "Só um instante…"
                    : loginMode === "login"
                      ? "Entrar no painel"
                      : loginMode === "recover"
                        ? "Enviar código"
                        : "Redefinir senha"}
                  <ChevronRight size={18} />
                </button>
                {loginMode !== "login" && (
                  <button
                    type="button"
                    className="text-button"
                    onClick={() => {
                      setLoginMode("login");
                      setAuthError("");
                    }}
                  >
                    Voltar ao login
                  </button>
                )}
              </form>
              <div className="login-note">
                <GraduationCap size={20} />
                <span>
                  Cada viagem ajuda alguém a chegar mais perto do seu futuro.
                </span>
              </div>
            </div>
          </main>
        </div>
      ) : (
        <div className="app-shell">
          <aside className={mobile ? "sidebar open" : "sidebar"}>
            <Logo />
            <button
              className="mobile-close icon"
              aria-label="Fechar menu"
              onClick={() => setMobile(false)}
            >
              <X size={20} />
            </button>
            <nav aria-label="Navegação principal">
              {navigation.map((group) => (
                <div className="nav-group" key={group.label}>
                  <p>{group.label}</p>
                  {group.items.map(({ key, label, icon: Icon }) => (
                    <button
                      key={key}
                      className={
                        section === key ? "nav-item active" : "nav-item"
                      }
                      aria-current={section === key ? "page" : undefined}
                      onClick={() => navigate(key)}
                    >
                      <Icon size={19} />
                      {label}
                      {section === key && <span className="nav-dot" />}
                    </button>
                  ))}
                </div>
              ))}
            </nav>
            <div className="sidebar-bottom">
              <span className="community-dot" /> Juntos no mesmo caminho.
            </div>
          </aside>
          {mobile && (
            <button
              className="sidebar-overlay"
              aria-label="Fechar menu"
              onClick={() => setMobile(false)}
            />
          )}
          <div className="workspace">
            <header className="topbar">
              <div className="inline">
                <button
                  className="icon mobile-menu"
                  aria-label="Abrir menu"
                  onClick={() => setMobile(true)}
                >
                  <Menu size={22} />
                </button>
                <span>Seu espaço de gestão</span>
                <ChevronRight size={14} />
                <strong>{title}</strong>
              </div>
              <div className="inline">
                <button
                  className="icon notification-button"
                  aria-label="Abrir notificações"
                  onClick={() => notifications()}
                >
                  <Bell size={21} />
                </button>
                <button
                  className="profile-button"
                  onClick={() => setProfile(true)}
                >
                  <span className="avatar">
                    {user.nome
                      .split(" ")
                      .map((s: string) => s[0])
                      .slice(0, 2)
                      .join("")}
                  </span>
                  <div>
                    <strong>{user.nome}</strong>
                    <small>Operador UniBus</small>
                  </div>
                </button>
                <button
                  className="icon"
                  aria-label="Sair do painel"
                  disabled={busy}
                  onClick={logout}
                >
                  <LogOut size={19} />
                </button>
              </div>
            </header>
            <main className="content" key={section}>
              {section === "inicio" ? (
                <Dashboard name={user.nome} navigate={navigate} />
              ) : section === "viagens" ? (
                <Trips notify={notify} />
              ) : section === "disciplina" ? (
                <Discipline notify={notify} />
              ) : section === "financeiro" ? (
                <Finance notify={notify} />
              ) : resource ? (
                <ResourcePage resource={resource} notify={notify} />
              ) : null}
              <footer className="page-footer">
                <span>UniBus · Conectando a comunidade universitária</span>
                <span>Feito para facilitar o caminho.</span>
              </footer>
            </main>
          </div>
        </div>
      )}
      {toast && (
        <div className="toast" role="status">
          {toast}
          <button
            className="icon"
            aria-label="Fechar mensagem"
            onClick={() => setToast("")}
          >
            <X size={16} />
          </button>
        </div>
      )}
      {profile && user && (
        <Modal title="Seu perfil" close={() => setProfile(false)}>
          <div className="modal-content">
            <Detail data={user} />
            <button
              className="primary"
              onClick={() => {
                setProfile(false);
                setEditor({
                  title: "Editar meu perfil",
                  fields: [
                    field("nome", "Nome completo"),
                    field("telefone", "Telefone", "tel"),
                  ],
                  initial: user,
                  save: async (d) => {
                    setUser(await api("usuarios/me", "PATCH", d));
                    notify("Seu perfil foi atualizado.");
                  },
                });
              }}
            >
              Editar nome e telefone
            </button>
          </div>
        </Modal>
      )}
      {notices && (
        <Modal title="Suas notificações" close={() => setNotices(null)}>
          <div className="modal-content">
            {notices.length ? (
              notices.map((n) => (
                <article className="segment" key={n.id}>
                  <Detail data={n} />
                  {!n.lidaEm && (
                    <button
                      className="text-button"
                      onClick={async () => {
                        try {
                          await api(`notificacoes/${n.id}/lida`, "PATCH");
                          await notifications(noticePage);
                        } catch (e) {
                          notify((e as Error).message);
                        }
                      }}
                    >
                      Marcar como lida
                    </button>
                  )}
                </article>
              ))
            ) : (
              <p className="empty">Tudo em dia por aqui.</p>
            )}
            <div className="pagination">
              <span>Página {noticePage}</span>
              <div>
                <button
                  className="secondary"
                  disabled={noticePage === 1}
                  onClick={() => notifications(noticePage - 1)}
                >
                  Anterior
                </button>
                <button
                  className="secondary"
                  disabled={!noticeNext}
                  onClick={() => notifications(noticePage + 1)}
                >
                  Próxima
                </button>
              </div>
            </div>
          </div>
        </Modal>
      )}
      {editor && <Editor {...editor} close={() => setEditor(null)} />}
    </>
  );
}
