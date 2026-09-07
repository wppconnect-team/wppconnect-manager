import { serverUrl, type Profile } from "./api";
declare global {
  interface Window {
    WPP_MANAGER_CONFIG?: { serverUrl?: string };
  }
}
export function readProfiles(): Profile[] {
  try {
    const profiles = JSON.parse(
      localStorage.getItem("wpp-manager-profiles") || "[]",
    );
    if (Array.isArray(profiles) && profiles.length)
      return profiles.map(({ id, name, url }) => ({
        id: String(id),
        name: String(name),
        url: serverUrl(url),
      }));
  } catch {
    /* Recover corrupt or legacy settings without importing credentials. */
  }
  return [
    {
      id: "local",
      name: "WPPConnect Server",
      url: serverUrl(window.WPP_MANAGER_CONFIG?.serverUrl || location.origin),
    },
  ];
}
export function saveProfiles(profiles: Profile[]) {
  localStorage.setItem(
    "wpp-manager-profiles",
    JSON.stringify(profiles.map(({ id, name, url }) => ({ id, name, url }))),
  );
}
