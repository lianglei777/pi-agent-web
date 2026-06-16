import { describe, expect, it } from "vitest";
import { en } from "./dictionaries/en";
import { zh } from "./dictionaries/zh";
import { DEFAULT_LOCALE, resolveLocale } from "./locales";

describe("resolveLocale", () => {
  it("prefers a stored supported locale", () => {
    expect(
      resolveLocale({
        storedLocale: "en",
        browserLanguages: ["zh-CN"],
      }),
    ).toBe("en");
  });

  it("matches browser language prefixes", () => {
    expect(resolveLocale({ browserLanguages: ["zh-CN", "en-US"] })).toBe("zh");
    expect(resolveLocale({ browserLanguages: ["en-US", "zh-CN"] })).toBe("en");
  });

  it("falls back to the default locale", () => {
    expect(
      resolveLocale({
        storedLocale: "fr",
        browserLanguages: ["fr-FR"],
      }),
    ).toBe(DEFAULT_LOCALE);
  });
});

describe("dictionaries", () => {
  it("keep zh and en keys in sync", () => {
    expect(flattenKeys(zh)).toEqual(flattenKeys(en));
  });
});

function flattenKeys(value: unknown, prefix = ""): string[] {
  if (!value || typeof value !== "object") return [prefix];
  return Object.entries(value)
    .flatMap(([key, child]) =>
      flattenKeys(child, prefix ? `${prefix}.${key}` : key),
    )
    .sort();
}
