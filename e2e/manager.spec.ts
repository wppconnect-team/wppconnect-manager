import { expect, test, type Page } from "@playwright/test";
import { mkdir } from "node:fs/promises";

test("expired QR is removed and closed state remains explicit", async ({
  page,
}) => {
  await fixtures(page);
  let available = true;
  await page.route("**/status-session", (route) =>
    route.fulfill({ json: { status: "QRCODE" } }),
  );
  await page.route("**/qrcode-session", (route) =>
    available
      ? route.fulfill({
          contentType: "image/png",
          body: Buffer.from(
            "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jWlEAAAAASUVORK5CYII=",
            "base64",
          ),
        })
      : route.fulfill({ status: 409, json: { message: "QR expired" } }),
  );
  await login(page);
  await page
    .locator(".session-row")
    .filter({ hasText: "atendimento" })
    .getByRole("button", { name: "Gerenciar" })
    .click();
  await expect(
    page.getByRole("img", { name: "QR Code para conectar o WhatsApp" }),
  ).toBeVisible();
  available = false;
  await expect(
    page.getByRole("img", { name: "QR Code para conectar o WhatsApp" }),
  ).toHaveCount(0, { timeout: 10000 });
  await expect(
    page.getByText("QR indisponível", { exact: true }),
  ).toBeVisible();
});

test("switching sessions discards delayed history from the previous session", async ({
  page,
}) => {
  await fixtures(page);
  let release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route("**/atendimento/all-messages-in-chat/**", async (route) => {
    await gate;
    await route
      .fulfill({
        json: {
          response: [{ id: "old", body: "Must never leak", type: "chat" }],
        },
      })
      .catch(() => {});
  });
  await login(page);
  await page
    .locator(".session-row")
    .filter({ hasText: "atendimento" })
    .getByRole("button", { name: "Gerenciar" })
    .click();
  await page.getByRole("button", { name: "Abrir conversas" }).click();
  const oldRequest = page.waitForRequest(
    "**/atendimento/all-messages-in-chat/**",
  );
  await page.getByRole("button", { name: /Contato de demonstração/ }).click();
  await oldRequest;
  await page.getByRole("combobox", { name: "Sessão selecionada" }).click();
  await page.getByRole("option", { name: "comercial", exact: true }).click();
  await page.getByRole("button", { name: /Contato de demonstração/ }).click();
  await expect(
    page.getByText("Olá! Esta é uma conversa de demonstração."),
  ).toBeVisible();
  release();
  await expect(page.getByText("Must never leak")).toHaveCount(0);
});

test("attachment and group creation use the server contracts", async ({
  page,
  isMobile,
}) => {
  await fixtures(page);
  await login(page);
  await page
    .locator(".session-row")
    .filter({ hasText: "atendimento" })
    .getByRole("button", { name: "Gerenciar" })
    .click();
  await page.getByRole("button", { name: "Abrir conversas" }).click();
  await page.getByRole("button", { name: /Contato de demonstração/ }).click();
  const upload = page.waitForRequest("**/send-file-base64");
  await page
    .locator("input[type=file]")
    .setInputFiles({
      name: "fixture.txt",
      mimeType: "text/plain",
      buffer: Buffer.from("test attachment"),
    });
  expect((await upload).postDataJSON()).toMatchObject({
    filename: "fixture.txt",
    base64: "data:text/plain;base64,dGVzdCBhdHRhY2htZW50",
    phone: "5511999999999@c.us",
  });
  await navigate(page, "Grupos", isMobile);
  await page.getByRole("button", { name: "Criar grupo", exact: true }).click();
  await page.getByLabel("Nome do grupo").fill("Test group");
  await page
    .getByLabel("Telefones dos participantes")
    .fill("5511999999999,5511888888888");
  const create = page.waitForRequest("**/create-group");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Criar grupo", exact: true })
    .click();
  expect((await create).postDataJSON()).toEqual({
    name: "Test group",
    participants: ["5511999999999", "5511888888888"],
  });
});

async function fixtures(page: Page) {
  const sessions = [
    { session: "atendimento", status: "CONNECTED" },
    { session: "comercial", status: "CLOSED" },
    { session: "operacoes", status: "CONNECTED" },
  ];
  await page.route("**/api/**", async (route) => {
    const url = new URL(route.request().url());
    const pathname = url.pathname;
    let data: any = { success: true };
    let status = 200;
    if (pathname.endsWith("/manager/info")) data = { protocol: 1 };
    else if (route.request().headers().authorization === "Bearer invalid") {
      data = { message: "Unauthorized" };
      status = 401;
    } else if (pathname.endsWith("/manager/sessions")) data = { sessions };
    else if (pathname.endsWith("/token"))
      data = { token: "fixture-session-token" };
    else if (pathname.endsWith("/status-session"))
      data = { status: "CONNECTED" };
    else if (
      pathname.endsWith("/all-chats") ||
      pathname.endsWith("/all-contacts") ||
      pathname.endsWith("/all-groups")
    )
      data = {
        response: [
          {
            id: { _serialized: "5511999999999@c.us" },
            name: "Contato de demonstração",
          },
        ],
      };
    else if (pathname.includes("/all-messages-in-chat/"))
      data = {
        response: [
          {
            id: "fixture-1",
            from: "5511999999999@c.us",
            body: "Olá! Esta é uma conversa de demonstração.",
            type: "chat",
            t: 1700000000,
          },
          {
            id: "fixture-2",
            fromMe: true,
            to: "5511999999999@c.us",
            body: "Tudo pronto para conectar.",
            type: "chat",
            t: 1700000100,
          },
        ],
      };
    await route.fulfill({
      status,
      contentType: "application/json",
      body: JSON.stringify(data),
    });
  });
}
async function login(page: Page) {
  await page.goto("/manager/");
  await page.getByLabel("Secret key").fill("fixture-admin-key");
  await page.getByRole("button", { name: "Entrar no workspace" }).click();
  await expect(
    page.getByRole("heading", { name: "Suas conexões, em dia." }),
  ).toBeVisible();
}
async function navigate(page: Page, name: string, mobile: boolean) {
  if (mobile)
    await page.getByRole("button", { name: "Menu", exact: true }).click();
  await page.getByRole("button", { name, exact: true }).click();
}

test("login, responsive overview, session details, chat, no persisted credentials", async ({
  page,
  isMobile,
}, info) => {
  await fixtures(page);
  await page.goto("/manager/");
  await mkdir("docs/screenshots", { recursive: true });
  await page.screenshot({
    path: `docs/screenshots/login-${info.project.name}.png`,
    fullPage: true,
  });
  await login(page);
  await expect(page.getByText("atendimento", { exact: true })).toBeVisible();
  await expect(page.locator("body")).not.toHaveJSProperty("scrollWidth", 0);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: `docs/screenshots/overview-${info.project.name}.png`,
    fullPage: true,
  });
  await page
    .locator(".session-row")
    .filter({ hasText: "atendimento" })
    .getByRole("button", { name: "Gerenciar" })
    .click();
  await expect(
    page.getByRole("button", { name: "Conectar / reconectar" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Encerrar", exact: true }).click();
  await expect(page.getByRole("dialog")).toContainText("atendimento");
  await page.getByRole("button", { name: "Cancelar", exact: true }).click();
  await page.getByRole("button", { name: "Abrir conversas" }).click();
  await page.getByRole("button", { name: /Contato de demonstração/ }).click();
  await expect(
    page.getByText("Olá! Esta é uma conversa de demonstração."),
  ).toBeVisible();
  await page.screenshot({
    path: `docs/screenshots/chat-${info.project.name}.png`,
    fullPage: true,
  });
  await page.getByLabel("Mensagem", { exact: true }).fill("Mensagem de teste");
  const send = page.waitForRequest((r) => r.url().endsWith("/send-message"));
  await page
    .getByRole("button", { name: "Enviar mensagem", exact: true })
    .click();
  expect((await send).postDataJSON()).toMatchObject({
    phone: "5511999999999@c.us",
    message: "Mensagem de teste",
    isGroup: false,
  });
  expect(await page.evaluate(() => JSON.stringify(localStorage))).not.toContain(
    "fixture-admin-key",
  );
  await page.getByRole("button", { name: "Alternar tema" }).click();
  await page.screenshot({
    path: `docs/screenshots/chat-dark-${info.project.name}.png`,
    fullPage: true,
  });
  await navigate(page, "Servidores", isMobile);
  await page.getByRole("button", { name: "Adicionar servidor" }).click();
  await page.getByLabel("Nome", { exact: true }).fill("Segundo servidor");
  await page.getByLabel("URL", { exact: true }).fill("http://127.0.0.1:21465");
  await page.getByRole("button", { name: "Salvar", exact: true }).click();
  await navigate(page, "Visão geral", isMobile);
  await expect(page.getByLabel("Secret key")).toBeVisible();
  await expect(page.getByLabel("Secret key")).toHaveValue("");
});

test("invalid credential, restricted login, language and reload", async ({
  page,
}) => {
  await fixtures(page);
  await page.goto("/manager/");
  await page.getByLabel("Secret key").fill("invalid");
  await page.getByRole("button", { name: "Entrar no workspace" }).click();
  await expect(page.getByRole("alert")).toContainText(
    "Não foi possível conectar",
  );
  await page.getByRole("switch").check();
  await page.getByLabel("Nome da sessão").fill("atendimento");
  await page.getByLabel("Token da sessão").fill("fixture-session-token");
  await page.getByRole("button", { name: "Entrar no workspace" }).click();
  await expect(page.getByRole("button", { name: "Nova sessão" })).toHaveCount(
    0,
  );
  await expect(page.getByRole("button", { name: "Limpar dados" })).toHaveCount(
    0,
  );
  await page.getByRole("button", { name: "Alterar idioma" }).click();
  await expect(
    page.getByRole("heading", { name: "Stay connected." }),
  ).toBeVisible();
  await page.reload();
  await expect(page.getByLabel("Secret key")).toBeVisible();
});

test("media failure remains visible and does not become a broken download", async ({
  page,
}) => {
  await fixtures(page);
  await page.route("**/all-messages-in-chat/**", (route) =>
    route.fulfill({
      json: {
        response: [
          { id: "media-1", type: "image", from: "5511999999999@c.us", t: 1 },
        ],
      },
    }),
  );
  await page.route("**/download-media", (route) =>
    route.fulfill({ status: 500, json: { message: "Media unavailable" } }),
  );
  await login(page);
  await page
    .locator(".session-row")
    .filter({ hasText: "atendimento" })
    .getByRole("button", { name: "Gerenciar" })
    .click();
  await page.getByRole("button", { name: "Abrir conversas" }).click();
  await page.getByRole("button", { name: /Contato de demonstração/ }).click();
  await page.getByRole("button", { name: /Carregar mídia/ }).click();
  await expect(page.getByRole("alert")).toContainText("Media unavailable");
  await expect(page.getByRole("link", { name: "Baixar arquivo" })).toHaveCount(
    0,
  );
});

test("session status polling pauses while off the sessions page", async ({
  page,
}) => {
  await fixtures(page);
  let statusCalls = 0;
  await page.route("**/status-session", (route) => {
    statusCalls += 1;
    return route.fulfill({ json: { status: "CONNECTED" } });
  });
  await login(page);
  await page
    .locator(".session-row")
    .filter({ hasText: "atendimento" })
    .getByRole("button", { name: "Gerenciar" })
    .click();
  await page.getByRole("button", { name: "Abrir conversas" }).click();
  await page.waitForTimeout(1000);
  const baseline = statusCalls;
  await page.waitForTimeout(5000);
  expect(statusCalls).toBe(baseline);
});

test("a late QRCODE response cannot overwrite a newer CONNECTED status", async ({
  page,
  isMobile,
}) => {
  await fixtures(page);
  let statusCalls = 0;
  let qrCalls = 0;
  let releaseFirst!: () => void;
  let firstHandled!: () => void;
  const firstGate = new Promise<void>((resolve) => {
    releaseFirst = resolve;
  });
  const firstResponse = new Promise<void>((resolve) => {
    firstHandled = resolve;
  });
  await page.route("**/qrcode-session", (route) => {
    qrCalls += 1;
    return route.fulfill({
      contentType: "image/png",
      body: Buffer.from(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jWlEAAAAASUVORK5CYII=",
        "base64",
      ),
    });
  });
  await page.route("**/status-session", async (route) => {
    statusCalls += 1;
    if (statusCalls === 1) {
      await firstGate;
      await route.fulfill({ json: { status: "QRCODE" } });
      firstHandled();
    } else await route.fulfill({ json: { status: "CONNECTED" } });
  });
  await login(page);
  await page
    .locator(".session-row")
    .filter({ hasText: "atendimento" })
    .getByRole("button", { name: "Gerenciar" })
    .click();
  await expect.poll(() => statusCalls).toBeGreaterThanOrEqual(1);
  await navigate(page, "Conversas", isMobile);
  await navigate(page, "Visão geral", isMobile);
  await expect.poll(() => statusCalls).toBeGreaterThanOrEqual(2);
  releaseFirst();
  await firstResponse;
  await page.waitForTimeout(250);
  await expect(page.locator(".session-detail")).toContainText("CONNECTED");
  await expect(
    page.getByRole("img", { name: "QR Code para conectar o WhatsApp" }),
  ).toHaveCount(0);
  expect(qrCalls).toBe(0);
});

test("document title tracks the page and profile removal uses a dialog", async ({
  page,
  isMobile,
}) => {
  await fixtures(page);
  await login(page);
  await expect(page).toHaveTitle(/Visão geral · WPPConnect Manager/);
  await navigate(page, "Conversas", isMobile);
  await expect(page).toHaveTitle(/Conversas · WPPConnect Manager/);
  await navigate(page, "Servidores", isMobile);
  await page.getByRole("button", { name: "Adicionar servidor" }).click();
  await page.getByLabel("Nome", { exact: true }).fill("Segundo servidor");
  await page.getByLabel("URL", { exact: true }).fill("http://127.0.0.1:21465");
  await page.getByRole("button", { name: "Salvar", exact: true }).click();
  const card = page
    .locator("article.server-card")
    .filter({ hasText: "Segundo servidor" });
  await card.getByRole("button", { name: "Remover", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Remover", exact: true })
    .click();
  await expect(
    page.locator("article.server-card").filter({ hasText: "Segundo servidor" }),
  ).toHaveCount(0);
});

