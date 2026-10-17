import {
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Alert,
  Avatar,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  TextField,
} from "@mui/material";
import {
  ArrowLeft,
  Download,
  MessageSquare,
  Paperclip,
  Plus,
  RefreshCw,
  Send,
  Users,
} from "lucide-react";
import { belongsToChat, Client, list, mergeMessages, wid } from "./api";
import type { Page, Translate } from "./App";
const MESSAGE_LIMIT = 300;
const LIST_LIMIT = 200;

export default function Chat({
  client: parent,
  token,
  session,
  page,
  t,
  event,
  revision,
}: {
  client: Client;
  token: string;
  session: string;
  page: Page;
  t: Translate;
  event: any;
  revision: number;
}) {
  const [client] = useState(() => new Client(parent.url, parent.access));
  const [items, setItems] = useState<any[]>([]);
  const [selected, setSelected] = useState("");
  const [search, setSearch] = useState("");
  const [messages, setMessages] = useState<any[]>([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [refresh, setRefresh] = useState(0);
  const [newChat, setNewChat] = useState(false);
  const [phone, setPhone] = useState("");
  const [group, setGroup] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [participants, setParticipants] = useState("");
  const listRef = useRef<HTMLDivElement>(null);
  useEffect(() => () => client.dispose(), [client]);
  useEffect(() => {
    let alive = true;
    setLoading(true);
    client
      .session(
        session,
        token,
        page === "contacts"
          ? "all-contacts"
          : page === "groups"
            ? "all-groups"
            : "all-chats",
      )
      .then((data) => {
        if (alive) {
          setItems(list(data));
          setError("");
        }
      })
      .catch((e) => {
        if (alive && !client.signal.aborted) setError(String(e));
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [client, session, token, page, revision, refresh]);
  useEffect(() => {
    setMessages([]);
    setText("");
  }, [selected]);
  useEffect(() => {
    let alive = true;
    if (!selected) return;
    client
      .session(
        session,
        token,
        `all-messages-in-chat/${encodeURIComponent(selected)}?isGroup=${selected.endsWith("@g.us")}&includeMe=true&includeNotifications=false`,
      )
      .then((data) => {
        if (alive)
          setMessages((previous) =>
            mergeMessages(list(data), previous, MESSAGE_LIMIT),
          );
      })
      .catch((e) => {
        if (alive && !client.signal.aborted) setError(String(e));
      });
    return () => {
      alive = false;
    };
  }, [client, session, token, selected, refresh]);
  useEffect(() => {
    if (event && selected && belongsToChat(event, selected))
      setMessages((prev) => mergeMessages(prev, [event], MESSAGE_LIMIT));
  }, [event, selected]);
  useEffect(() => {
    const element = listRef.current;
    if (element) element.scrollTop = element.scrollHeight;
  }, [messages]);
  async function send(file?: File) {
    const destination = selected;
    const body = text;
    if (!destination || (!file && !body.trim())) return;
    setSending(true);
    setError("");
    try {
      const payload: any = {
        phone: destination,
        isGroup: destination.endsWith("@g.us"),
      };
      if (file) {
        if (file.size > 20 * 1024 * 1024)
          throw Error(
            t("O limite de anexo é 20 MB.", "Attachment limit is 20 MB."),
          );
        payload.base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(String(reader.result));
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
        payload.filename = file.name;
        if (body.trim()) payload.caption = body;
      } else payload.message = body;
      await client.session(
        session,
        token,
        file ? "send-file-base64" : "send-message",
        payload,
      );
      if (!client.signal.aborted) {
        setText("");
        setRefresh((r) => r + 1);
      }
    } catch (e) {
      if (!client.signal.aborted) setError(String(e));
    } finally {
      if (!client.signal.aborted) setSending(false);
    }
  }
  async function createGroup() {
    setSending(true);
    setError("");
    try {
      await client.session(session, token, "create-group", {
        name: groupName,
        participants: participants.split(/[\s,;]+/).filter(Boolean),
      });
      if (!client.signal.aborted) {
        setGroup(false);
        setGroupName("");
        setParticipants("");
        setRefresh((r) => r + 1);
      }
    } catch (e) {
      if (!client.signal.aborted) setError(String(e));
    } finally {
      if (!client.signal.aborted) setSending(false);
    }
  }
  const active = items.find((item) => wid(item.id) === selected);
  const display = (item: any) =>
    item.name ||
    item.formattedName ||
    item.pushname ||
    item.contact?.name ||
    wid(item.id);
  const deferredSearch = useDeferredValue(search);
  const filtered = useMemo(() => {
    const term = deferredSearch.toLowerCase();
    return items
      .filter((item) =>
        `${display(item)} ${wid(item.id)}`.toLowerCase().includes(term),
      )
      .slice(0, LIST_LIMIT);
  }, [items, deferredSearch]);
  return (
    <>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError("")}>
          {error}
        </Alert>
      )}
      <section className={`panel chat-layout ${selected ? "has-chat" : ""}`}>
        <aside className="chat-list">
          <div className="section-heading">
            <h2>
              {page === "contacts"
                ? t("Contatos", "Contacts")
                : page === "groups"
                  ? t("Grupos", "Groups")
                  : t("Conversas", "Conversations")}
            </h2>
            <div>
              <IconButton
                aria-label={t("Atualizar lista", "Refresh list")}
                onClick={() => setRefresh((r) => r + 1)}
              >
                <RefreshCw size={17} />
              </IconButton>
              <IconButton
                aria-label={
                  page === "groups"
                    ? t("Criar grupo", "Create group")
                    : t("Nova conversa", "New conversation")
                }
                onClick={() =>
                  page === "groups" ? setGroup(true) : setNewChat(true)
                }
              >
                <Plus size={18} />
              </IconButton>
            </div>
          </div>
          <TextField
            fullWidth
            placeholder={t("Buscar...", "Search...")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            slotProps={{
              htmlInput: {
                "aria-label": t("Buscar conversas", "Search conversations"),
              },
            }}
          />
          <div className="chat-list-scroll">
            {loading && <CircularProgress size={20} sx={{ m: 2 }} />}
            {filtered.map((item) => (
              <button
                className={`chat-item ${selected === wid(item.id) ? "active" : ""}`}
                key={wid(item.id)}
                onClick={() => setSelected(wid(item.id))}
              >
                <Avatar
                  sx={{ bgcolor: "action.selected", color: "text.primary" }}
                >
                  {String(display(item)).slice(0, 2).toUpperCase()}
                </Avatar>
                <div>
                  <strong>{display(item)}</strong>
                  <small>{wid(item.id)}</small>
                </div>
              </button>
            ))}
            {!loading && !filtered.length && (
              <div className="empty-state">
                <Users size={26} />
                <p>
                  {t("Nenhum resultado disponível.", "No results available.")}
                </p>
              </div>
            )}
          </div>
        </aside>
        <div className="chat-conversation">
          {!selected ? (
            <div className="empty-state chat-welcome">
              <MessageSquare size={42} />
              <h2>
                {t(
                  "Abra espaço para uma conversa.",
                  "Make room for a conversation.",
                )}
              </h2>
              <p>
                {t(
                  "Selecione um contato ou inicie uma nova conversa.",
                  "Select a contact or start a new conversation.",
                )}
              </p>
            </div>
          ) : (
            <>
              <div className="conversation-heading">
                <IconButton
                  className="chat-back"
                  aria-label={t("Voltar", "Back")}
                  onClick={() => setSelected("")}
                >
                  <ArrowLeft size={18} />
                </IconButton>
                <Avatar sx={{ bgcolor: "primary.main" }}>
                  {String(active ? display(active) : selected)
                    .slice(0, 2)
                    .toUpperCase()}
                </Avatar>
                <div>
                  <strong>{active ? display(active) : selected}</strong>
                  <small>
                    {selected} · {session}
                  </small>
                </div>
              </div>
              <div className="message-list" aria-live="polite" ref={listRef}>
                {!messages.length && (
                  <div className="empty-state">
                    <p>
                      {t(
                        "Nenhuma mensagem carregada. O histórico depende do que está disponível no WhatsApp.",
                        "No messages loaded. History depends on what is available in WhatsApp.",
                      )}
                    </p>
                  </div>
                )}
                {messages.map((message) => (
                  <article
                    className={`message ${message.fromMe ? "outgoing" : ""}`}
                    key={wid(message.id)}
                  >
                    {!message.fromMe && message.sender?.pushname && (
                      <strong>{message.sender.pushname}</strong>
                    )}
                    {[
                      "image",
                      "sticker",
                      "video",
                      "audio",
                      "ptt",
                      "document",
                    ].includes(message.type) ? (
                      <Media
                        key={wid(message.id)}
                        client={client}
                        token={token}
                        session={session}
                        message={message}
                        t={t}
                      />
                    ) : (
                      <p>
                        {message.body ||
                          message.content ||
                          `[${message.type || "message"}]`}
                      </p>
                    )}
                    {message.caption && <p>{message.caption}</p>}
                    <small>
                      {message.t || message.timestamp
                        ? new Date(
                            (message.t || message.timestamp) * 1000,
                          ).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })
                        : ""}
                    </small>
                  </article>
                ))}
              </div>
              <form
                className="composer"
                onSubmit={(e) => {
                  e.preventDefault();
                  void send();
                }}
              >
                <IconButton
                  component="label"
                  aria-label={t("Anexar arquivo", "Attach file")}
                  disabled={sending}
                >
                  <Paperclip size={20} />
                  <input
                    hidden
                    type="file"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      e.target.value = "";
                      if (file) void send(file);
                    }}
                  />
                </IconButton>
                <TextField
                  fullWidth
                  multiline
                  maxRows={4}
                  placeholder={t(
                    "Escreva uma mensagem...",
                    "Write a message...",
                  )}
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  disabled={sending}
                  slotProps={{
                    htmlInput: { "aria-label": t("Mensagem", "Message") },
                  }}
                />
                <Button
                  variant="contained"
                  type="submit"
                  disabled={sending || !text.trim()}
                  aria-label={t("Enviar mensagem", "Send message")}
                >
                  {sending ? (
                    <CircularProgress size={18} />
                  ) : (
                    <Send size={19} />
                  )}
                </Button>
              </form>
            </>
          )}
        </div>
      </section>
      <Dialog
        open={newChat}
        onClose={() => setNewChat(false)}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle>{t("Nova conversa", "New conversation")}</DialogTitle>
        <DialogContent>
          <TextField
            sx={{ mt: 1 }}
            autoFocus
            fullWidth
            label={t("Telefone com código do país", "Phone with country code")}
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="5511999999999"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setNewChat(false)}>
            {t("Cancelar", "Cancel")}
          </Button>
          <Button
            disabled={!/^\+?\d{7,15}$/.test(phone)}
            onClick={() => {
              setSelected(`${phone.replace("+", "")}@c.us`);
              setNewChat(false);
              setPhone("");
            }}
          >
            {t("Abrir", "Open")}
          </Button>
        </DialogActions>
      </Dialog>
      <Dialog
        open={group}
        onClose={() => !sending && setGroup(false)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>{t("Criar grupo", "Create group")}</DialogTitle>
        <DialogContent>
          <div className="form-fields">
            <TextField
              autoFocus
              label={t("Nome do grupo", "Group name")}
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
            />
            <TextField
              multiline
              label={t(
                "Telefones dos participantes",
                "Participant phone numbers",
              )}
              helperText={t(
                "Com código do país, separados por vírgula.",
                "With country code, separated by commas.",
              )}
              value={participants}
              onChange={(e) => setParticipants(e.target.value)}
            />
            {error && <Alert severity="error">{error}</Alert>}
          </div>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setGroup(false)} disabled={sending}>
            {t("Cancelar", "Cancel")}
          </Button>
          <Button
            disabled={sending || !groupName.trim() || !participants.trim()}
            onClick={() => void createGroup()}
          >
            {t("Criar grupo", "Create group")}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

function Media({
  client,
  session,
  token,
  message,
  t,
}: {
  client: Client;
  session: string;
  token: string;
  message: any;
  t: Translate;
}) {
  const [source, setSource] = useState("");
  const mounted = useRef(true);
  useEffect(
    () => () => {
      mounted.current = false;
    },
    [],
  );
  const [mime, setMime] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  useEffect(
    () => () => {
      if (source) URL.revokeObjectURL(source);
    },
    [source],
  );
  async function load() {
    setLoading(true);
    setError("");
    try {
      const data = await client.session(session, token, "download-media", {
        messageId: wid(message.id),
      });
      if (!data.base64 || !data.mimetype)
        throw Error(t("Mídia indisponível", "Media unavailable"));
      if (client.signal.aborted || !mounted.current) return;
      const blob = await (
        await fetch(`data:${data.mimetype};base64,${data.base64}`)
      ).blob();
      if (client.signal.aborted || !mounted.current) return;
      setSource(URL.createObjectURL(blob));
      setMime(data.mimetype);
    } catch (e) {
      if (!client.signal.aborted && mounted.current) setError(String(e));
    } finally {
      if (!client.signal.aborted && mounted.current) setLoading(false);
    }
  }
  return (
    <div className="media">
      {!source ? (
        <Button
          onClick={() => void load()}
          disabled={loading}
          startIcon={
            loading ? <CircularProgress size={16} /> : <Download size={16} />
          }
        >
          {message.filename || t("Carregar mídia", "Load media")} ·{" "}
          {message.type}
        </Button>
      ) : (
        <>
          {/^image\/(png|jpeg|webp|gif)$/.test(mime) ? (
            <a href={source} target="_blank" rel="noreferrer">
              <img
                src={source}
                alt={message.caption || t("Imagem recebida", "Received image")}
              />
            </a>
          ) : mime.startsWith("audio/") ? (
            <audio controls src={source} />
          ) : mime.startsWith("video/") ? (
            <video controls src={source} />
          ) : null}
          <Button
            component="a"
            href={source}
            download={message.filename || "attachment"}
            startIcon={<Download size={15} />}
          >
            {t("Baixar arquivo", "Download file")}
          </Button>
        </>
      )}
      {error && <Alert severity="error">{error}</Alert>}
    </div>
  );
}
