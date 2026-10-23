import { lazy, Suspense, useEffect, useLayoutEffect, useMemo, useState } from "react";
import {
  Alert,
  Avatar,
  Box,
  Button,
  Chip,
  CircularProgress,
  CssBaseline,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  IconButton,
  MenuItem,
  Switch,
  TextField,
  ThemeProvider,
  createTheme,
} from "@mui/material";
import {
  Activity,
  ArrowUpRight,
  ChevronRight,
  Heart,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageSquare,
  Moon,
  Plus,
  Server,
  Settings,
  Sun,
  Users,
  UsersRound,
} from "lucide-react";
import { Client, createId, serverUrl, type Access, type Profile } from "./api";
import { readProfiles, saveProfiles } from "./preferences";
const Workspace = lazy(() => import("./Workspace"));
export type Translate = (pt: string, en: string) => string;
export type Page =
  | "sessions"
  | "chat"
  | "contacts"
  | "groups"
  | "settings"
  | "about";

export default function App() {
  const [profiles, setProfiles] = useState(readProfiles);
  const [profileId, setProfileId] = useState(profiles[0].id);
  const profile = profiles.find((p) => p.id === profileId) || profiles[0];
  const [access, setAccess] = useState<Access | null>(null);
  const [page, setPage] = useState<Page>("sessions");
  const [mobile, setMobile] = useState(false);
  const [dark, setDark] = useState(
    localStorage.getItem("wpp-manager-theme") === "dark",
  );
  const [lang, setLang] = useState(
    localStorage.getItem("wpp-manager-language") || "pt",
  );
  const [edit, setEdit] = useState<Profile | null>(null);
  const [removeTarget, setRemoveTarget] = useState<Profile | null>(null);
  const [error, setError] = useState("");
  const t: Translate = (pt, en) => (lang === "pt" ? pt : en);
  useLayoutEffect(() => {
    localStorage.setItem("wpp-manager-theme", dark ? "dark" : "light");
    document.documentElement.dataset.theme = dark ? "dark" : "light";
  }, [dark]);
  useEffect(() => {
    localStorage.setItem("wpp-manager-language", lang);
    document.documentElement.lang = lang === "pt" ? "pt-BR" : "en";
  }, [lang]);
  useEffect(() => {
    const titles: Record<Page, [string, string]> = {
      sessions: ["Visão geral", "Overview"],
      chat: ["Conversas", "Conversations"],
      contacts: ["Contatos", "Contacts"],
      groups: ["Grupos", "Groups"],
      settings: ["Servidores", "Servers"],
      about: ["Sobre", "About"],
    };
    const [pt, en] = titles[page];
    document.title = `${lang === "pt" ? pt : en} · WPPConnect Manager`;
  }, [page, lang]);
  const theme = useMemo(
    () =>
      createTheme({
        palette: {
          mode: dark ? "dark" : "light",
          primary: { main: dark ? "#6cdbb9" : "#087f61" },
          background: {
            default: dark ? "#101916" : "#f4f7f5",
            paper: dark ? "#17241f" : "#ffffff",
          },
        },
        typography: {
          fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif",
          button: { textTransform: "none", fontWeight: 650 },
        },
        shape: { borderRadius: 12 },
        components: {
          MuiButton: { defaultProps: { disableElevation: true } },
          MuiTextField: { defaultProps: { size: "small" } },
        },
      }),
    [dark],
  );
  const nav: [Page, string, typeof Server][] = [
    ["sessions", t("Visão geral", "Overview"), LayoutDashboard],
    ["chat", t("Conversas", "Conversations"), MessageSquare],
    ["contacts", t("Contatos", "Contacts"), Users],
    ["groups", t("Grupos", "Groups"), UsersRound],
    ["settings", t("Servidores", "Servers"), Settings],
  ];
  function updateProfile() {
    if (!edit) return;
    try {
      const next = {
        ...edit,
        name: edit.name.trim(),
        url: serverUrl(edit.url),
      };
      if (!next.name) throw Error();
      const updated = profiles.some((p) => p.id === next.id)
        ? profiles.map((p) => (p.id === next.id ? next : p))
        : [...profiles, next];
      saveProfiles(updated);
      setProfiles(updated);
      setProfileId(next.id);
      setAccess(null);
      setEdit(null);
      setError("");
    } catch {
      setError(
        t(
          "Informe um nome e uma URL HTTP(S) válida, sem credenciais.",
          "Enter a name and a valid HTTP(S) URL without credentials.",
        ),
      );
    }
  }
  function removeProfile() {
    const target = removeTarget;
    if (!target) return;
    const next = profiles.filter((x) => x.id !== target.id);
    saveProfiles(next);
    setProfiles(next);
    if (target.id === profile.id) {
      setAccess(null);
      setProfileId(next[0].id);
    }
    setRemoveTarget(null);
  }
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <div className="app-shell">
        {mobile && (
          <button
            className="nav-overlay"
            aria-label={t("Fechar menu", "Close menu")}
            onClick={() => setMobile(false)}
          />
        )}
        <aside className={`sidebar ${mobile ? "visible" : ""}`}>
          <a
            className="brand"
            href="#"
            onClick={(e) => {
              e.preventDefault();
              setPage("sessions");
            }}
          >
            <img src="/manager/favicon.svg" alt="" />
            <span>
              WPPConnect<small>MANAGER</small>
            </span>
          </a>
          <div className="workspace-label">
            WORKSPACE <span>2.0</span>
          </div>
          <TextField
            select
            fullWidth
            label={t("Servidor ativo", "Active server")}
            value={profile.id}
            onChange={(e) => {
              setAccess(null);
              setProfileId(e.target.value);
            }}
          >
            {profiles.map((p) => (
              <MenuItem key={p.id} value={p.id}>
                {p.name}
              </MenuItem>
            ))}
          </TextField>
          <nav>
            {nav.map(([id, label, Icon]) => (
              <button
                key={id}
                className={page === id ? "active" : ""}
                onClick={() => {
                  setPage(id);
                  setMobile(false);
                }}
              >
                <Icon size={19} />
                {label}
                {page === id && <ChevronRight size={15} />}
              </button>
            ))}
          </nav>
          <div className="sidebar-bottom">
            <div className="community-card">
              <Heart size={21} />
              <strong>
                {t("Construído em comunidade", "Built by the community")}
              </strong>
              <p>
                {t(
                  "Código aberto. Conexões reais.",
                  "Open source. Real connections.",
                )}
              </p>
              <Button size="small" onClick={() => setPage("about")}>
                {t("Apoie o projeto", "Support the project")}{" "}
                <ArrowUpRight size={15} />
              </Button>
            </div>
            <small>WPPConnect Manager · Apache 2.0</small>
          </div>
        </aside>
        <div className="main-shell">
          <header className="topbar">
            <div className="topbar-left">
              <IconButton
                className="mobile-menu"
                aria-label="Menu"
                onClick={() => setMobile(true)}
              >
                <Menu />
              </IconButton>
              <span className="breadcrumb">
                Workspace /{" "}
                <b>
                  {nav.find((n) => n[0] === page)?.[1] || t("Sobre", "About")}
                </b>
              </span>
            </div>
            <div className="toolbar">
              <Chip
                size="small"
                icon={<Activity size={14} />}
                label={
                  access
                    ? t("Acesso autorizado", "Authorized access")
                    : t("Não autenticado", "Not authenticated")
                }
                variant="outlined"
              />
              <Button
                size="small"
                onClick={() => setLang(lang === "pt" ? "en" : "pt")}
                aria-label={t("Alterar idioma", "Change language")}
              >
                {lang.toUpperCase()}
              </Button>
              <IconButton
                aria-label={t("Alternar tema", "Toggle theme")}
                onClick={() => setDark(!dark)}
              >
                {dark ? <Sun size={19} /> : <Moon size={19} />}
              </IconButton>
              {access && (
                <IconButton
                  aria-label={t("Sair", "Sign out")}
                  onClick={() => setAccess(null)}
                >
                  <LogOut size={19} />
                </IconButton>
              )}
              <Avatar
                sx={{
                  width: 32,
                  height: 32,
                  bgcolor: "primary.main",
                  fontSize: 12,
                }}
              >
                WP
              </Avatar>
            </div>
          </header>
          <main>
            {page === "settings" ? (
              <>
                <div className="page-heading">
                  <div>
                    <span className="eyebrow">WORKSPACE</span>
                    <h1>{t("Seus servidores", "Your servers")}</h1>
                    <p>
                      {t(
                        "Uma visão organizada de todas as suas conexões.",
                        "An organized view of all your connections.",
                      )}
                    </p>
                  </div>
                  <Button
                    variant="contained"
                    startIcon={<Plus size={18} />}
                    onClick={() =>
                      setEdit({ id: createId(), name: "", url: "" })
                    }
                  >
                    {t("Adicionar servidor", "Add server")}
                  </Button>
                </div>
                <div className="server-grid">
                  {profiles.map((p) => (
                    <article className="panel server-card" key={p.id}>
                      <Server />
                      <h2>{p.name}</h2>
                      <p className="url-text">{p.url}</p>
                      <Button
                        onClick={() => {
                          setEdit(p);
                          setError("");
                        }}
                      >
                        {t("Editar", "Edit")}
                      </Button>
                      <Button
                        disabled={profiles.length === 1}
                        color="error"
                        onClick={() => setRemoveTarget(p)}
                      >
                        {t("Remover", "Remove")}
                      </Button>
                    </article>
                  ))}
                </div>
                <Alert severity="info" sx={{ mt: 3 }}>
                  {t(
                    "Somente nomes e URLs são salvos. Credenciais são solicitadas novamente ao recarregar.",
                    "Only names and URLs are saved. Credentials are requested again on reload.",
                  )}
                </Alert>
              </>
            ) : page === "about" ? (
              <div className="panel about">
                <img src="/manager/favicon.svg" width="64" alt="" />
                <h1>WPPConnect Manager</h1>
                <p>
                  {t(
                    "Gerencie sessões, converse e conecte suas ferramentas com software livre.",
                    "Manage sessions, chat and connect your tools with open source software.",
                  )}
                </p>
                <p>React · TypeScript · WPPConnect Server</p>
                <h2>
                  {t("Patrocine o desenvolvimento", "Sponsor development")}
                </h2>
                <div className="toolbar">
                  <Button
                    href="https://github.com/sponsors/joaosouz4dev"
                    target="_blank"
                    rel="noreferrer"
                  >
                    joaosouz4dev <ArrowUpRight size={16} />
                  </Button>
                  <Button
                    href="https://github.com/sponsors/manfe"
                    target="_blank"
                    rel="noreferrer"
                  >
                    manfe <ArrowUpRight size={16} />
                  </Button>
                  <Button
                    href="https://opencollective.com/wppconnect"
                    target="_blank"
                    rel="noreferrer"
                  >
                    Open Collective <ArrowUpRight size={16} />
                  </Button>
                </div>
                <Button
                  href="https://github.com/wppconnect-team/wppconnect-manager"
                  target="_blank"
                  rel="noreferrer"
                >
                  GitHub · Apache-2.0
                </Button>
              </div>
            ) : !access ? (
              <Login
                key={profile.id}
                profile={profile}
                t={t}
                onAccess={setAccess}
                onSettings={() => setPage("settings")}
              />
            ) : (
              <Suspense
                fallback={
                  <div className="panel empty-state">
                    <CircularProgress size={28} />
                  </div>
                }
              >
                <Workspace
                  key={`${profile.id}:${access.credential}:${access.session}`}
                  profile={profile}
                  access={access}
                  page={page}
                  setPage={setPage}
                  t={t}
                />
              </Suspense>
            )}
          </main>
        </div>
        <Dialog
          open={!!edit}
          onClose={() => setEdit(null)}
          fullWidth
          maxWidth="sm"
        >
          <DialogTitle>
            {t("Configurar servidor", "Configure server")}
          </DialogTitle>
          <DialogContent>
            <Box sx={{ display: "grid", gap: 2, pt: 1 }}>
              <TextField
                autoFocus
                label={t("Nome", "Name")}
                value={edit?.name || ""}
                onChange={(e) =>
                  setEdit(edit && { ...edit, name: e.target.value })
                }
              />
              <TextField
                label="URL"
                placeholder="https://server.example.com"
                value={edit?.url || ""}
                onChange={(e) =>
                  setEdit(edit && { ...edit, url: e.target.value })
                }
              />
              {error && <Alert severity="error">{error}</Alert>}
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setEdit(null)}>
              {t("Cancelar", "Cancel")}
            </Button>
            <Button variant="contained" onClick={updateProfile}>
              {t("Salvar", "Save")}
            </Button>
          </DialogActions>
        </Dialog>
        <Dialog open={!!removeTarget} onClose={() => setRemoveTarget(null)}>
          <DialogTitle>{t("Remover perfil", "Remove profile")}</DialogTitle>
          <DialogContent>
            {t(
              "Remover este perfil local? As credenciais não são afetadas.",
              "Remove this local profile? Credentials are not affected.",
            )}
            <p>
              <strong>{removeTarget?.name}</strong>
            </p>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setRemoveTarget(null)}>
              {t("Cancelar", "Cancel")}
            </Button>
            <Button color="error" onClick={removeProfile}>
              {t("Remover", "Remove")}
            </Button>
          </DialogActions>
        </Dialog>
      </div>
    </ThemeProvider>
  );
}

function Login({
  profile,
  t,
  onAccess,
  onSettings,
}: {
  profile: Profile;
  t: Translate;
  onAccess: (a: Access) => void;
  onSettings: () => void;
}) {
  const [restricted, setRestricted] = useState(false);
  const [credential, setCredential] = useState("");
  const [session, setSession] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [pending, setPending] = useState<Client | null>(null);
  useEffect(() => () => pending?.dispose(), [pending]);
  async function connect(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const access: Access = {
      mode: restricted ? "session" : "admin",
      credential,
      session,
    };
    const client = new Client(profile.url, access);
    setPending(client);
    try {
      const info = await client.request("manager/info");
      if (info.protocol !== 1) throw Error("upgrade");
      await client.request(
        restricted ? "manager/verify" : "manager/sessions",
        restricted ? { method: "POST", body: { session } } : {},
      );
      if (!client.signal.aborted) onAccess(access);
    } catch (err) {
      if (!client.signal.aborted)
        setError(
          t(
            "Não foi possível conectar. Verifique URL, credencial e se o server tem suporte ao Manager v2.",
            "Could not connect. Check the URL, credential and Manager v2 server support.",
          ) + (err instanceof Error ? ` (${err.message})` : ""),
        );
    } finally {
      if (!client.signal.aborted) setBusy(false);
    }
  }
  return (
    <div className="welcome-grid">
      <section className="welcome-copy">
        <span className="eyebrow">WPPConnect Manager</span>
        <h1>
          {t("Suas conexões.", "Your connections.")}
          <br />
          <em>{t("Em um só lugar.", "All in one place.")}</em>
        </h1>
        <p>
          {t(
            "Do primeiro QR Code à próxima conversa. Um espaço para acompanhar suas sessões e manter tudo conectado.",
            "From the first QR code to the next conversation. A workspace to follow your sessions and keep everything connected.",
          )}
        </p>
        <div className="welcome-features">
          <span>
            <Server size={18} />
            {t("Múltiplos servidores", "Multiple servers")}
          </span>
          <span>
            <MessageSquare size={18} />
            {t("Conversas em tempo real", "Real-time conversations")}
          </span>
          <span>
            <Activity size={18} />
            {t("Controle de sessões", "Session control")}
          </span>
        </div>
        <div className="connection-art" aria-hidden="true">
          <div className="art-node">W</div>
          <div className="art-line" />
          <div className="art-hub">
            <Activity size={35} />
          </div>
          <div className="art-line" />
          <div className="art-node">
            <MessageSquare />
          </div>
        </div>
        <small>
          {t(
            "Feito pela comunidade WPPConnect.",
            "Made by the WPPConnect community.",
          )}
        </small>
      </section>
      <section className="panel login-panel">
        <span className="icon-tile">
          <Server size={24} />
        </span>
        <h2>{t("Conecte seu servidor", "Connect your server")}</h2>
        <p>{profile.name}</p>
        <div className="endpoint">
          <span className="status-dot" />
          {profile.url}
          <IconButton
            size="small"
            onClick={onSettings}
            aria-label={t("Editar servidor", "Edit server")}
          >
            <Settings size={16} />
          </IconButton>
        </div>
        <form onSubmit={connect}>
          <FormControlLabel
            control={
              <Switch
                checked={restricted}
                onChange={(e) => setRestricted(e.target.checked)}
              />
            }
            label={t("Acesso a uma sessão", "Single-session access")}
          />
          {restricted && (
            <TextField
              required
              fullWidth
              label={t("Nome da sessão", "Session name")}
              value={session}
              onChange={(e) => setSession(e.target.value)}
            />
          )}
          <TextField
            required
            fullWidth
            type="password"
            label={
              restricted ? t("Token da sessão", "Session token") : "Secret key"
            }
            value={credential}
            onChange={(e) => setCredential(e.target.value)}
            autoComplete="off"
          />
          <p className="field-help">
            {t(
              "A credencial fica apenas na memória desta página.",
              "The credential stays only in this page’s memory.",
            )}
          </p>
          {error && <Alert severity="error">{error}</Alert>}
          <Button
            fullWidth
            size="large"
            variant="contained"
            type="submit"
            disabled={busy}
            endIcon={
              busy ? <CircularProgress size={18} /> : <ChevronRight size={18} />
            }
          >
            {t("Entrar no workspace", "Enter workspace")}
          </Button>
        </form>
        <div className="login-footer">
          <Heart size={14} />{" "}
          {t("CÓDIGO ABERTO · AUTO-HOSPEDADO", "OPEN SOURCE · SELF-HOSTED")}
        </div>
      </section>
    </div>
  );
}
