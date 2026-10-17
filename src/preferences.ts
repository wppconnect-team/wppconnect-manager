import { createId, serverUrl, type Profile } from "./api";
declare global {
  interface Window {
    WPP_MANAGER_CONFIG?: { serverUrl?: string };
  }
}
function normalizeUrl(value: unknown): string | null {
  if (typeof value !== "string" || !value) return null;
  try {
    return serverUrl(value);
  } catch {
    return null;
  }
}
export function readProfiles(): Profile[] {
  let stored: unknown = [];
  try {
    stored = JSON.parse(localStorage.getItem("wpp-manager-profiles") || "[]");
  } catch {
    /* Recover corrupt or legacy settings without importing credentials. */
  }
  const profiles: Profile[] = [];
  const seen = new Set<string>();
  if (Array.isArray(stored))
    for (const entry of stored) {
      const url = normalizeUrl(entry?.url);
      if (!url) continue;
      let id = typeof entry?.id === "string" && entry.id ? entry.id : createId();
      if (seen.has(id)) id = createId();
      seen.add(id);
      profiles.push({
        id,
        name:
          typeof entry?.name === "string" && entry.name ? entry.name : url,
        url,
      });
    }
  if (profiles.length) return profiles;
  let url = "";
  try {
    url = serverUrl(window.WPP_MANAGER_CONFIG?.serverUrl || location.origin);
  } catch {
    /* Opaque origins (file://, sandboxed iframe) fall back to an empty base. */
  }
  return [{ id: createId(), name: "WPPConnect Server", url }];
}
export function saveProfiles(profiles: Profile[]) {
  try {
    localStorage.setItem(
      "wpp-manager-profiles",
      JSON.stringify(profiles.map(({ id, name, url }) => ({ id, name, url }))),
    );
  } catch {
    /* Ignore quota/private-mode write failures; state still lives in memory. */
  }
}
