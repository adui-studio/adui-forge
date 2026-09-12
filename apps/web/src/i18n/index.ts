import i18next from "i18next";
import { initReactI18next } from "react-i18next";
import { en } from "./locales/en.ts";
import { zhCN } from "./locales/zh-CN.ts";

export const SUPPORTED_LANGUAGES = ["zh-CN", "en"] as const;
export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

const LANGUAGE_STORAGE_KEY = "forge.language";

/** 读取持久化语言；未设置时跟随浏览器，均不支持则回退 zh-CN。 */
export const detectLanguage = (): SupportedLanguage => {
  const stored = globalThis.localStorage?.getItem(LANGUAGE_STORAGE_KEY);
  if (stored !== null && (SUPPORTED_LANGUAGES as readonly string[]).includes(stored)) {
    return stored as SupportedLanguage;
  }
  const candidates = typeof navigator === "undefined" ? [] : (navigator.languages ?? []);
  for (const candidate of candidates) {
    const match = SUPPORTED_LANGUAGES.find(
      (language) =>
        candidate.toLowerCase() === language.toLowerCase() ||
        candidate.toLowerCase().startsWith(`${language.toLowerCase()}-`),
    );
    if (match !== undefined) return match;
  }
  return "zh-CN";
};

export const changeLanguage = (language: SupportedLanguage): void => {
  void i18next.changeLanguage(language);
  globalThis.localStorage?.setItem(LANGUAGE_STORAGE_KEY, language);
  if (typeof document !== "undefined") {
    document.documentElement.lang = language;
  }
};

void i18next.use(initReactI18next).init({
  resources: { "zh-CN": { translation: zhCN }, en: { translation: en } },
  lng: detectLanguage(),
  fallbackLng: "zh-CN",
  interpolation: { escapeValue: false },
});

// 首帧同步 <html lang>（node 测试环境无 DOM）
if (typeof document !== "undefined") {
  document.documentElement.lang = i18next.language;
}
