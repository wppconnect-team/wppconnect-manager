import { afterEach, describe, expect, it, vi } from "vitest";
import { readProfiles, saveProfiles } from "./preferences";
function stubStorage(value: string, setItem?: (key: string, data: string) => void) {
  vi.stubGlobal("localStorage", {
    getItem: () => value,
    setItem: setItem || vi.fn(),
  });
  vi.stubGlobal("window", {});
  vi.stubGlobal("location", { origin: "https://host.example" });
}
afterEach(() => vi.unstubAllGlobals());
describe("profile persistence", () => {
  it("keeps valid profiles when one stored URL is unusable", () => {
    stubStorage(
      JSON.stringify([
        { id: "a", name: "Good", url: "https://good.example" },
        { id: "b", name: "Bad", url: "javascript:alert(1)" },
      ]),
    );
    const profiles = readProfiles();
    expect(profiles).toHaveLength(1);
    expect(profiles[0].url).toBe("https://good.example");
  });
  it("returns a usable default instead of throwing on opaque origins", () => {
    stubStorage("[]");
    vi.stubGlobal("location", { origin: "null" });
    expect(() => readProfiles()).not.toThrow();
    expect(readProfiles()[0].url).toBe("");
  });
  it("assigns unique ids when stored ids are missing or duplicated", () => {
    stubStorage(
      JSON.stringify([
        { url: "https://a.example" },
        { id: "x", url: "https://b.example" },
        { id: "x", url: "https://c.example" },
      ]),
    );
    const ids = readProfiles().map((profile) => profile.id);
    expect(ids).toHaveLength(3);
    expect(new Set(ids).size).toBe(3);
  });
  it("survives localStorage write failures", () => {
    stubStorage("[]", () => {
      throw new Error("QuotaExceeded");
    });
    expect(() =>
      saveProfiles([{ id: "a", name: "n", url: "https://a.example" }]),
    ).not.toThrow();
  });
});
