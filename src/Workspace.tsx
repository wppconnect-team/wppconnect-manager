import { useEffect, useState } from "react";
import {
  Alert,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  TextField,
} from "@mui/material";
import {
  Activity,
  ArrowUpRight,
  CircleCheck,
  Plus,
  RefreshCw,
  Search,
  Server,
  Unplug,
} from "lucide-react";
import { io } from "socket.io-client";
import { Client, type Access, type Profile, type Session } from "./api";
import type { Page, Translate } from "./App";
import Chat from "./Chat";

export default function Workspace({
  profile,
  access,
  page,
  setPage,
  t,
}: {
  profile: Profile;
  access: Access;
  page: Page;
  setPage: (p: Page) => void;
  t: Translate;
}) {
  const [client] = useState(() => new Client(profile.url, access));
  const [sessions, setSessions] = useState<Session[]>(
    access.mode === "session"
      ? [{ session: access.session, status: "UNKNOWN" }]
      : [],
  );
  const [selected, setSelected] = useState(access.session);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [busy, setBusy] = useState(false);
  async function refresh() {
    setLoading(true);
    try {
      const data =
        access.mode === "admin"
          ? await client.request<{ sessions: Session[] }>("manager/sessions")
          : {
              sessions: [
                {
                  session: access.session,
                  status: String(
                    (
                      await client.session(
                        access.session,
                        access.credential,
                        "status-session",
                      )
                    ).status || "CLOSED",
                  ),
                },
              ],
            };
      if (!client.signal.aborted) {
        setSessions(data.sessions);
        setError("");
      }
    } catch (e) {
      if (!client.signal.aborted) setError(String(e));
    } finally {
      if (!client.signal.aborted) setLoading(false);
    }
  }
  useEffect(() => {
    void refresh();
    const timer = setInterval(() => void refresh(), 10000);
    return () => {
      clearInterval(timer);
      client.dispose();
    };
  }, [client]);
  async function create() {
    setBusy(true);
    setError("");
    try {
      const token = await client.token(newName);
      await client.session(newName, token, "start-session", {
        waitQrCode: false,
      });
      if (!client.signal.aborted) {
        setSelected(newName);
        setCreating(false);
        setNewName("");
        await refresh();
      }
    } catch (e) {
      if (!client.signal.aborted) setError(String(e));
    } finally {
      if (!client.signal.aborted) setBusy(false);
    }
  }
  const connected = sessions.filter((s) =>
    ["CONNECTED", "OPEN"].includes(s.status),
  ).length;
  const visible = sessions.filter(
    (s) =>
      s.session.toLowerCase().includes(query.toLowerCase()) &&
      (filter === "all" ||
        (filter === "connected"
          ? ["CONNECTED", "OPEN"].includes(s.status)
          : !["CONNECTED", "OPEN"].includes(s.status))),
  );
  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">{profile.name}</span>
          <h1>
            {page === "sessions"
              ? t("Suas conexões, em dia.", "Stay connected.")
              : page === "chat"
                ? t("Conversas", "Conversations")
                : page === "contacts"
                  ? t("Contatos", "Contacts")
                  : t("Grupos", "Groups")}
          </h1>
          <p>
            {page === "sessions"
              ? t(
                  "Acompanhe suas sessões e dê o próximo passo.",
                  "Follow your sessions and take the next step.",
                )
              : t(
                  "Escolha uma sessão para começar.",
                  "Choose a session to get started.",
                )}
          </p>
        </div>
        {access.mode === "admin" && (
          <Button
            variant="contained"
            startIcon={<Plus size={18} />}
            onClick={() => {
              setCreating(true);
              setError("");
            }}
          >
            {t("Nova sessão", "New session")}
          </Button>
        )}
      </div>
      {error && (
        <Alert severity="error" onClose={() => setError("")} sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      {page === "sessions" && (
        <>
          <div className="stats-grid">
            {[
              [
                Server,
                t("Total de sessões", "Total sessions"),
                sessions.length,
              ],
              [CircleCheck, t("Conectadas", "Connected"), connected],
              [
                Unplug,
                t("Outros estados", "Other states"),
                sessions.length - connected,
              ],
            ].map(([Icon, label, count]) => {
              const Symbol = Icon as typeof Server;
              return (
                <article className="panel stat" key={String(label)}>
                  <span className="icon-tile">
                    <Symbol size={21} />
                  </span>
                  <div>
                    <span>{String(label)}</span>
                    <strong>{String(count)}</strong>
                  </div>
                </article>
              );
            })}
          </div>
          <section className="panel sessions-panel">
            <div className="section-heading">
              <div>
                <h2>{t("Sessões", "Sessions")}</h2>
                <p>
                  {t(
                    "O status é atualizado automaticamente.",
                    "Status updates automatically.",
                  )}
                </p>
              </div>
              <Button
                onClick={() => void refresh()}
                disabled={loading}
                startIcon={<RefreshCw size={16} />}
              >
                {t("Atualizar", "Refresh")}
              </Button>
            </div>
            <div className="filterbar">
              <Search size={18} />
              <TextField
                placeholder={t("Buscar sessão...", "Search sessions...")}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                fullWidth
                slotProps={{
                  htmlInput: {
                    "aria-label": t("Buscar sessão", "Search sessions"),
                  },
                }}
              />
              <TextField
                select
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                sx={{ minWidth: 160 }}
                label={t("Status", "Status")}
              >
                <MenuItem value="all">{t("Todos", "All")}</MenuItem>
                <MenuItem value="connected">
                  {t("Conectadas", "Connected")}
                </MenuItem>
                <MenuItem value="other">
                  {t("Outros estados", "Other states")}
                </MenuItem>
              </TextField>
            </div>
            <div className="session-table">
              <div className="table-head">
                <span>{t("NOME DA SESSÃO", "SESSION NAME")}</span>
                <span>STATUS</span>
                <span>{t("AÇÕES", "ACTIONS")}</span>
              </div>
              {visible.map((s) => (
                <div
                  className={`session-row ${selected === s.session ? "selected" : ""}`}
                  key={s.session}
                >
                  <div className="session-name">
                    <span className="session-avatar">
                      {s.session.slice(0, 2).toUpperCase()}
                    </span>
                    <div>
                      <strong>{s.session}</strong>
                      <small>WPPConnect</small>
                    </div>
                  </div>
                  <Chip
                    size="small"
                    color={
                      ["CONNECTED", "OPEN"].includes(s.status)
                        ? "success"
                        : "default"
                    }
                    variant="outlined"
                    label={s.status}
                  />
                  <Button
                    endIcon={<ArrowUpRight size={16} />}
                    onClick={() => setSelected(s.session)}
                  >
                    {t("Gerenciar", "Manage")}
                  </Button>
                </div>
              ))}
              {!visible.length && (
                <div className="empty-state">
                  <Server size={34} />
                  <h3>
                    {loading
                      ? t("Carregando sessões", "Loading sessions")
                      : t("Nenhuma sessão por aqui", "No sessions here yet")}
                  </h3>
                  <p>
                    {t(
                      "Crie uma sessão ou ajuste os filtros para continuar.",
                      "Create a session or adjust the filters to continue.",
                    )}
                  </p>
                </div>
              )}
            </div>
          </section>
        </>
      )}
      <div className="session-selector">
        <TextField
          select
          label={t("Sessão selecionada", "Selected session")}
          value={selected}
          onChange={(e) => setSelected(e.target.value)}
          sx={{ minWidth: 240 }}
        >
          <MenuItem value="">{t("Selecione...", "Select...")}</MenuItem>
          {[
            ...new Set([
              ...sessions.map((s) => s.session),
              ...(selected ? [selected] : []),
            ]),
          ].map((name) => (
            <MenuItem value={name} key={name}>
              {name}
            </MenuItem>
          ))}
        </TextField>
      </div>
      {selected ? (
        <SessionScope
          key={selected}
          url={profile.url}
          access={access}
          name={selected}
          page={page}
          t={t}
          onChanged={refresh}
          openChat={() => setPage("chat")}
        />
      ) : (
        page !== "sessions" && (
          <div className="panel empty-state">
            <MessagePlaceholder />
            <h3>{t("Selecione uma sessão", "Select a session")}</h3>
            <p>
              {t(
                "As conversas ficam separadas por servidor e sessão.",
                "Conversations stay separate by server and session.",
              )}
            </p>
          </div>
        )
      )}
      <Dialog
        open={creating}
        onClose={() => !busy && setCreating(false)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>{t("Nova sessão", "New session")}</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            fullWidth
            sx={{ mt: 1 }}
            label={t("Nome da sessão", "Session name")}
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            helperText={t(
              "Letras, números, hífen e sublinhado; até 100 caracteres.",
              "Letters, numbers, hyphens and underscores; up to 100 characters.",
            )}
          />
          {error && <Alert severity="error">{error}</Alert>}
        </DialogContent>
        <DialogActions>
          <Button disabled={busy} onClick={() => setCreating(false)}>
            {t("Cancelar", "Cancel")}
          </Button>
          <Button
            variant="contained"
            disabled={busy || !/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,99}$/.test(newName)}
            onClick={() => void create()}
          >
            {t("Criar e conectar", "Create and connect")}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
function MessagePlaceholder() {
  return <Activity size={32} />;
}

function SessionScope({
  url,
  access,
  name,
  page,
  t,
  onChanged,
  openChat,
}: {
  url: string;
  access: Access;
  name: string;
  page: Page;
  t: Translate;
  onChanged: () => Promise<void>;
  openChat: () => void;
}) {
  const [client] = useState(() => new Client(url, access));
  const [token, setToken] = useState("");
  const [error, setError] = useState("");
  useEffect(() => {
    client
      .token(name)
      .then((value) => {
        if (!client.signal.aborted) setToken(value);
      })
      .catch((e) => {
        if (!client.signal.aborted) setError(String(e));
      });
    return () => client.dispose();
  }, [client, name]);
  return error ? (
    <Alert severity="error">{error}</Alert>
  ) : !token ? (
    <CircularProgress size={24} />
  ) : (
    <SessionContent
      client={client}
      name={name}
      token={token}
      page={page}
      t={t}
      onChanged={onChanged}
      openChat={openChat}
    />
  );
}

function SessionContent({
  client,
  name,
  token,
  page,
  t,
  onChanged,
  openChat,
}: {
  client: Client;
  name: string;
  token: string;
  page: Page;
  t: Translate;
  onChanged: () => Promise<void>;
  openChat: () => void;
}) {
  const [status, setStatus] = useState("UNKNOWN");
  const [qr, setQr] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [confirmAction, setConfirmAction] = useState("");
  const [socketState, setSocketState] = useState(false);
  const [revision, setRevision] = useState(0);
  const [event, setEvent] = useState<any>(null);
  useEffect(() => {
    let alive = true;
    let inFlight = false;
    let objectUrl = "";
    async function update() {
      if (inFlight) return;
      inFlight = true;
      try {
        const data = await client.session(name, token, "status-session");
        if (!alive) return;
        const next = String(data.status).toUpperCase();
        setStatus(next);
        setError("");
        if (
          next === "QRCODE" ||
          next === "INITIALIZING" ||
          next === "UNPAIRED"
        ) {
          try {
            const blob = await client.request<Blob>(
              `${encodeURIComponent(name)}/qrcode-session`,
              { token, blob: true },
            );
            if (!alive) return;
            if (objectUrl) URL.revokeObjectURL(objectUrl);
            objectUrl = URL.createObjectURL(blob);
            setQr(objectUrl);
          } catch {
            if (alive) setQr("");
          }
        } else setQr("");
      } catch (e) {
        if (alive && !client.signal.aborted) {
          setStatus("UNKNOWN");
          setQr("");
          setError(String(e));
        }
      } finally {
        inFlight = false;
      }
    }
    const socket = io(`${client.url}/manager`, {
      path: `${new URL(client.url).pathname.replace(/\/$/, "")}/socket.io`,
      auth: { session: name, token },
      transports: ["websocket", "polling"],
    });
    socket.on("connect", () => {
      setSocketState(true);
      setRevision((r) => r + 1);
      void update();
    });
    socket.on("disconnect", () => setSocketState(false));
    socket.on("connect_error", () => setSocketState(false));
    socket.on("message", (payload) => {
      if (payload.session === name) setEvent(payload.data);
    });
    socket.on("status", (payload) => {
      if (payload.session === name) void update();
    });
    void update();
    const timer = setInterval(() => void update(), 4000);
    return () => {
      alive = false;
      clearInterval(timer);
      socket.disconnect();
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [client, name, token]);
  async function action(operation: string) {
    setBusy(true);
    setError("");
    setConfirmAction("");
    setQr("");
    try {
      if (operation === "clear")
        await client.request(`manager/sessions/${encodeURIComponent(name)}`, {
          method: "DELETE",
        });
      else
        await client.session(
          name,
          token,
          operation,
          operation === "start-session" ? { waitQrCode: false } : {},
        );
      if (!client.signal.aborted) {
        setRevision((r) => r + 1);
        await onChanged();
      }
    } catch (e) {
      if (!client.signal.aborted) setError(String(e));
    } finally {
      if (!client.signal.aborted) setBusy(false);
    }
  }
  return (
    <>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      {page === "sessions" ? (
        <section className="panel session-detail">
          <div>
            <span className="eyebrow">
              {t("DETALHES DA SESSÃO", "SESSION DETAILS")}
            </span>
            <h2>{name}</h2>
            <div className="toolbar">
              <Chip label={status} size="small" />
              <Chip
                size="small"
                variant="outlined"
                color={socketState ? "success" : "warning"}
                label={
                  socketState
                    ? t("Eventos conectados", "Events connected")
                    : t("Reconectando eventos", "Reconnecting events")
                }
              />
            </div>
            <div className="session-actions">
              <Button
                variant="contained"
                disabled={busy}
                onClick={() => void action("start-session")}
              >
                {t("Conectar / reconectar", "Connect / reconnect")}
              </Button>
              <Button onClick={openChat}>
                {t("Abrir conversas", "Open conversations")}
              </Button>
              <Button
                disabled={busy}
                onClick={() => setConfirmAction("close-session")}
              >
                {t("Encerrar", "Close")}
              </Button>
              <Button
                color="warning"
                disabled={busy}
                onClick={() => setConfirmAction("logout-session")}
              >
                Logout WhatsApp
              </Button>
              {client.access.mode === "admin" && (
                <Button
                  color="error"
                  disabled={busy}
                  onClick={() => setConfirmAction("clear")}
                >
                  {t("Limpar dados", "Clear data")}
                </Button>
              )}
            </div>
            <p className="field-help">
              {t(
                "Encerrar para o processo; logout desvincula o WhatsApp. Limpar remove os dados de uma sessão encerrada.",
                "Close stops the process; logout unlinks WhatsApp. Clear removes data from a closed session.",
              )}
            </p>
          </div>
          <div className="qr-panel">
            {qr ? (
              <>
                <img
                  src={qr}
                  alt={t(
                    "QR Code para conectar o WhatsApp",
                    "QR code to connect WhatsApp",
                  )}
                />
                <small>
                  {t(
                    "WhatsApp → Aparelhos conectados",
                    "WhatsApp → Linked devices",
                  )}
                </small>
              </>
            ) : (
              <>
                <Activity size={38} />
                <strong>
                  {["CONNECTED", "OPEN"].includes(status)
                    ? t("Sessão conectada", "Session connected")
                    : t("QR indisponível", "QR unavailable")}
                </strong>
                <small>
                  {t(
                    "O QR aparece aqui quando disponível.",
                    "The QR appears here when available.",
                  )}
                </small>
              </>
            )}
          </div>
        </section>
      ) : (
        <>
          <div className="toolbar" style={{ marginBottom: 12 }}>
            <Chip
              size="small"
              variant="outlined"
              color={socketState ? "success" : "warning"}
              label={
                socketState
                  ? t("Eventos conectados", "Events connected")
                  : t("Reconectando eventos", "Reconnecting events")
              }
            />
          </div>
          <Chat
            key={`${name}:${page}`}
            client={client}
            token={token}
            session={name}
            page={page}
            t={t}
            event={event}
            revision={revision}
          />
        </>
      )}
      <Dialog open={!!confirmAction} onClose={() => setConfirmAction("")}>
        <DialogTitle>{t("Confirmar ação", "Confirm action")}</DialogTitle>
        <DialogContent>
          {confirmAction === "clear"
            ? t(
                "Os dados de autenticação serão removidos. Será necessário parear novamente.",
                "Authentication data will be removed. You will need to pair again.",
              )
            : t(
                "Esta ação interrompe a conexão da sessão com o WhatsApp.",
                "This action interrupts the session’s WhatsApp connection.",
              )}
          <p>
            <strong>{name}</strong> · {confirmAction}
          </p>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmAction("")}>
            {t("Cancelar", "Cancel")}
          </Button>
          <Button color="error" onClick={() => void action(confirmAction)}>
            {t("Confirmar", "Confirm")}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
