export const SUPPORTED_LOCALES = ["zh", "en"] as const;

export type Locale = (typeof SUPPORTED_LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "zh";
export const LOCALE_STORAGE_KEY = "pi-locale";

export function isLocale(value: string | null | undefined): value is Locale {
  return SUPPORTED_LOCALES.some((locale) => locale === value);
}

export function localeLabel(locale: Locale) {
  return locale === "zh" ? "中文" : "EN";
}

export function resolveLocale({
  storedLocale,
  browserLanguages = [],
}: {
  storedLocale?: string | null;
  browserLanguages?: readonly string[];
} = {}): Locale {
  if (isLocale(storedLocale)) return storedLocale;

  for (const language of browserLanguages) {
    const normalized = language.toLowerCase();
    if (normalized.startsWith("zh")) return "zh";
    if (normalized.startsWith("en")) return "en";
  }

  return DEFAULT_LOCALE;
}
