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
export function mergeMessages(previous: any[], incoming: any[]): any[] {
  const messages = new Map<string, any>();
  for (const item of [...previous, ...incoming]) {
    const id = wid(item.id);
    if (id) messages.set(id, item);
  }
  return [...messages.values()].sort(
    (a, b) => (a.t || a.timestamp || 0) - (b.t || b.timestamp || 0),
  );
}
export function belongsToChat(message: any, chat: string) {
  return (
    wid(message.chatId) === chat ||
    (message.fromMe ? wid(message.to) : wid(message.from)) === chat
  );
}
