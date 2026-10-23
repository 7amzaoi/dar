"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import ar from "./ar";
import en, { type Dictionary } from "./en";

import { LOCALE_COOKIE, type Locale } from "./config";

export type { Locale } from "./config";

const dictionaries: Record<Locale, Dictionary> = { ar, en };

type Leaves<T, P extends string = ""> = {
  [K in keyof T & string]: T[K] extends string ? `${P}${K}` : Leaves<T[K], `${P}${K}.`>;
}[keyof T & string];

export type TKey = Leaves<Dictionary>;
export type TParams = Record<string, string | number>;

function lookup(dict: Dictionary, key: string): string | undefined {
  const parts = key.split(".");
  let node: unknown = dict;
  for (let i = 0; i < parts.length; i++) {
    if (!node || typeof node !== "object") return undefined;
    const obj = node as Record<string, unknown>;
    if (parts[i] in obj) {
      node = obj[parts[i]];
      continue;
    }
    // leaf names may contain dots, e.g. notifications["order.rfq"]
    const rest = parts.slice(i).join(".");
    return typeof obj[rest] === "string" ? (obj[rest] as string) : undefined;
  }
  return typeof node === "string" ? node : undefined;
}

function interpolate(s: string, params?: TParams) {
  if (!params) return s;
  return s.replace(/\{(\w+)\}/g, (m, k: string) => (params[k] != null ? String(params[k]) : m));
}

interface I18nValue {
  locale: Locale;
  dir: "rtl" | "ltr";
  setLocale: (l: Locale) => void;
  /** typed dictionary lookup */
  t: (key: TKey, params?: TParams) => string;
  /** lookup for runtime keys (falls back to `fallback`, then the key) */
  tDynamic: (key: string, params?: TParams, fallback?: string) => string;
  /** pick the field for the current locale */
  tx: (arText: string | undefined, enText: string | undefined) => string;
  formatPrice: (value: number, currency?: string) => string;
  formatNumber: (value: number, opts?: Intl.NumberFormatOptions) => string;
  formatDate: (iso: string, opts?: Intl.DateTimeFormatOptions) => string;
  relativeTime: (iso: string) => string;
  country: (code: string) => string;
  city: (name: string) => string;
  material: (key: string) => string;
  color: (key: string) => string;
}

const I18nContext = createContext<I18nValue | null>(null);

/** Latin digits in both locales keep prices and quantities easy to scan. */
const intlLocale = (l: Locale) => (l === "ar" ? "ar-u-nu-latn" : "en-GB");

export function I18nProvider({ initialLocale, children }: { initialLocale: Locale; children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(initialLocale);

  const setLocale = useCallback((l: Locale) => {
    setLocaleState(l);
    document.documentElement.lang = l;
    document.documentElement.dir = l === "ar" ? "rtl" : "ltr";
    document.cookie = `${LOCALE_COOKIE}=${l}; path=/; max-age=31536000; samesite=lax`;
  }, []);

  const value = useMemo<I18nValue>(() => {
    const dict = dictionaries[locale];
    const il = intlLocale(locale);
    const tDynamic = (key: string, params?: TParams, fallback?: string) => {
      const s = lookup(dict, key) ?? lookup(en, key);
      return s != null ? interpolate(s, params) : fallback ?? key;
    };
    const rtf = new Intl.RelativeTimeFormat(il, { numeric: "auto" });
    return {
      locale,
      dir: locale === "ar" ? "rtl" : "ltr",
      setLocale,
      t: (key, params) => tDynamic(key, params),
      tDynamic,
      tx: (a, e) => (locale === "ar" ? a || e : e || a) ?? "",
      // Trade prices use the compact Latin form ("$2,150") in both locales; Arabic CLDR would render "US$".
      formatPrice: (v, currency = "USD") =>
        new Intl.NumberFormat("en-US", { style: "currency", currency, currencyDisplay: "narrowSymbol", maximumFractionDigits: v % 1 === 0 ? 0 : 2 }).format(v),
      formatNumber: (v, opts) => new Intl.NumberFormat(il, opts).format(v),
      formatDate: (iso, opts = { day: "numeric", month: "short", year: "numeric" }) => new Intl.DateTimeFormat(il, opts).format(new Date(iso)),
      relativeTime: (iso) => {
        const diff = (new Date(iso).getTime() - Date.now()) / 1000;
        const abs = Math.abs(diff);
        if (abs < 60) return dict.common.justNow;
        if (abs < 3600) return rtf.format(Math.round(diff / 60), "minute");
        if (abs < 86400) return rtf.format(Math.round(diff / 3600), "hour");
        if (abs < 86400 * 30) return rtf.format(Math.round(diff / 86400), "day");
        return new Intl.DateTimeFormat(il, { day: "numeric", month: "short" }).format(new Date(iso));
      },
      country: (code) => (dict.countries as Record<string, string>)[code] ?? code,
      city: (name) => (dict.cities as Record<string, string>)[name] ?? name,
      material: (k) => (dict.materials as Record<string, string>)[k] ?? k,
      color: (k) => (dict.colors as Record<string, string>)[k] ?? k,
    };
  }, [locale, setLocale]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useT() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useT must be used inside <I18nProvider>");
  return ctx;
}
