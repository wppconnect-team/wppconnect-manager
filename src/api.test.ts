import { afterEach, describe, expect, it, vi } from "vitest";
import {
  ApiError,
  belongsToChat,
  Client,
  list,
  mergeMessages,
  serverUrl,
} from "./api";
afterEach(() => vi.unstubAllGlobals());
describe("server boundary", () => {
  it("normalizes API suffixes and rejects credentials or unsafe schemes", () => {
    expect(serverUrl("https://host.example/proxy/api/")).toBe(
      "https://host.example/proxy",
    );
    for (const url of [
      "javascript:alert(1)",
      "https://secret@host",
      "https://host/?key=secret",
    ])
      expect(() => serverUrl(url)).toThrow();
  });
  it("keeps credentials in headers and cancels pending work on disposal", async () => {
    const fetch = vi.fn(async (_url, init) => {
      expect(init.headers.Authorization).toBe("Bearer private-key");
      return new Response('{"sessions":[]}');
    });
    vi.stubGlobal("fetch", fetch);
    const client = new Client("https://server", {
      mode: "admin",
      credential: "private-key",
      session: "",
    });
    await client.request("manager/sessions");
    client.dispose();
    expect(fetch.mock.calls[0][0]).toBe("https://server/api/manager/sessions");
    expect(fetch.mock.calls[0][1].signal.aborted).toBe(true);
  });
  it("refuses another session with a restricted credential", async () => {
    const client = new Client("https://server", {
      mode: "session",
      credential: "token",
      session: "a",
    });
    await expect(client.token("b")).rejects.toThrow("Session denied");
  });
  it.each([401, 404, 409, 501, 500])(
    "does not convert HTTP %s into success",
    async (status) => {
      vi.stubGlobal(
        "fetch",
        vi.fn(
          async () => new Response('{"message":"Unavailable"}', { status }),
        ),
      );
      await expect(
        new Client("https://server", {
          mode: "admin",
          credential: "key",
          session: "",
        }).request("manager/sessions"),
      ).rejects.toBeInstanceOf(ApiError);
    },
  );
  it("rejects logical errors and unexpected list shapes", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response('{"status":"error"}')),
    );
    await expect(
      new Client("https://server", {
        mode: "admin",
        credential: "key",
        session: "",
      }).request("s/send-message"),
    ).rejects.toThrow();
    expect(() => list({ response: null })).toThrow();
  });
});
describe("message isolation", () => {
  it("deduplicates serialized identifiers on reconnect and preserves time order", () => {
    expect(
      mergeMessages(
        [{ id: "one", t: 1, body: "old" }],
        [
          { id: { _serialized: "one" }, t: 1, body: "updated" },
          { id: "two", t: 2 },
        ],
      ),
    ).toHaveLength(2);
  });
  it("routes group and outgoing messages only to their chat", () => {
    expect(
      belongsToChat({ from: "group@g.us", to: "me@c.us" }, "group@g.us"),
    ).toBe(true);
    expect(
      belongsToChat(
        { fromMe: true, from: "me@c.us", to: "one@c.us" },
        "two@c.us",
      ),
    ).toBe(false);
  });
});
