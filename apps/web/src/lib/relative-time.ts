import i18next from "i18next";

const formatterCache = new Map<string, Intl.RelativeTimeFormat>();

const formatter = (): Intl.RelativeTimeFormat => {
  const locale = i18next.language || "zh-CN";
  let instance = formatterCache.get(locale);
  if (instance === undefined) {
    instance = new Intl.RelativeTimeFormat(locale, { numeric: "always" });
    formatterCache.set(locale, instance);
  }
  return instance;
};

/** 相对时间(DesignGuidelines §161:列表显示相对时间,详情用绝对时间)。按当前语言输出。 */
export const timeAgo = (iso: string): string => {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return iso;
  const diffSeconds = (then - Date.now()) / 1000;
  const absSeconds = Math.abs(diffSeconds);
  const rtf = formatter();
  if (absSeconds < 60) return rtf.format(Math.round(diffSeconds), "second");
  if (absSeconds < 3_600) return rtf.format(Math.round(diffSeconds / 60), "minute");
  if (absSeconds < 86_400) return rtf.format(Math.round(diffSeconds / 3_600), "hour");
  if (absSeconds < 2_592_000) return rtf.format(Math.round(diffSeconds / 86_400), "day");
  return new Date(iso).toLocaleDateString();
};
