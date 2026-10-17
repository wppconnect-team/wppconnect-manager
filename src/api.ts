export interface Profile {
  id: string;
  name: string;
  url: string;
}
export interface Session {
  session: string;
  status: string;
}
export interface Access {
  mode: "admin" | "session";
  credential: string;
  session: string;
}
export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
export function serverUrl(value: string): string {
  const url = new URL(value);
  if (
    !["http:", "https:"].includes(url.protocol) ||
    url.username ||
    url.password ||
    url.search ||
    url.hash
  )
    throw new Error("Invalid server URL");
  return url.href.replace(/\/$/, "").replace(/\/api$/, "");
}
export function createId(): string {
  const crypto = globalThis.crypto;
  if (typeof crypto?.randomUUID === "function") return crypto.randomUUID();
  if (typeof crypto?.getRandomValues === "function") {
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    const hex = Array.from(bytes, (byte) =>
      byte.toString(16).padStart(2, "0"),
    ).join("");
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
  }
  return `id-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}
export class Client {
  private controller = new AbortController();
  constructor(
    public url: string,
    public access: Access,
  ) {}
  dispose() {
    this.controller.abort();
  }
  get signal() {
    return this.controller.signal;
  }
  async request<T = any>(
    path: string,
    options: {
      method?: string;
      body?: unknown;
      token?: string;
      blob?: boolean;
    } = {},
  ): Promise<T> {
    const response = await fetch(`${this.url}/api/${path}`, {
      method: options.method || "GET",
      signal: AbortSignal.any([this.signal, AbortSignal.timeout(60000)]),
      headers: {
        Authorization: `Bearer ${options.token ?? this.access.credential}`,
        ...(options.body !== undefined
          ? { "Content-Type": "application/json" }
          : {}),
      },
      body:
        options.body === undefined ? undefined : JSON.stringify(options.body),
      cache: "no-store",
      credentials: "omit",
      redirect: "error",
    });
    if (
      options.blob &&
      response.ok &&
      response.headers.get("content-type")?.startsWith("image/")
    )
      return (await response.blob()) as T;
    const content = await response.text();
    let data: any;
    try {
      data = JSON.parse(content);
    } catch {
      throw new ApiError(response.status, "Invalid server response");
    }
    if (
      !response.ok ||
      data?.status === "error" ||
      data?.success === false ||
      data?.status === false
    )
      throw new ApiError(response.status, data?.message || "Request failed");
    if (options.blob) throw new ApiError(409, "QR unavailable");
    return data as T;
  }
  async token(session: string): Promise<string> {
    if (this.access.mode === "session") {
      if (this.access.session !== session)
        throw new ApiError(403, "Session denied");
      return this.access.credential;
    }
    return (
      await this.request<{ token: string }>(
        `manager/sessions/${encodeURIComponent(session)}/token`,
        { method: "POST" },
      )
    ).token;
  }
  session(session: string, token: string, path: string, body?: unknown) {
    return this.request(`${encodeURIComponent(session)}/${path}`, {
      token,
      method: body === undefined ? "GET" : "POST",
      body,
    });
  }
}
export function list(data: any): any[] {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.response)) return data.response;
  if (Array.isArray(data?.data)) return data.data;
  throw new ApiError(502, "Unexpected list response");
}
export function wid(value: any): string {
  return typeof value === "string"
    ? value
    : value?._serialized ||
        (value?.user && value?.server ? `${value.user}@${value.server}` : "");
}
const syntheticMessageIds = new WeakMap<object, string>();
export function mergeMessages(
  previous: any[],
  incoming: any[],
  limit = 0,
): any[] {
  const messages = new Map<string, any>();
  for (const item of [...previous, ...incoming]) {
    let id = wid(item?.id);
    if (!id && item && typeof item === "object") {
      id = syntheticMessageIds.get(item) || "";
      if (!id) {
        id = `local:${createId()}`;
        syntheticMessageIds.set(item, id);
      }
    }
    if (!id) id = `local:${createId()}`;
    messages.set(id, item);
  }
  const merged = [...messages.values()].sort(
    (a, b) => (a.t || a.timestamp || 0) - (b.t || b.timestamp || 0),
  );
  return limit > 0 && merged.length > limit ? merged.slice(-limit) : merged;
}
export function belongsToChat(message: any, chat: string) {
  if (
    wid(message?.chatId) === chat ||
    (message?.fromMe ? wid(message?.to) : wid(message?.from)) === chat
  )
    return true;
  return (
    chat.endsWith("@g.us") &&
    (wid(message?.from) === chat || wid(message?.to) === chat)
  );
}
