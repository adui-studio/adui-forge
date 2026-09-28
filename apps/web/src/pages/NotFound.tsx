import { SearchX } from "lucide-react";
import { Link } from "react-router";
import { useTranslation } from "react-i18next";
import { Button } from "antd";

/** 404 页：catch-all 路由兜底，文案走 i18n。 */
export function NotFoundPage() {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col items-center gap-4 py-24 text-center">
      <SearchX className="h-10 w-10 text-slate-600" aria-hidden />
      <h1 className="text-3xl font-semibold text-slate-300">404</h1>
      <p className="text-sm text-slate-500">{t("notFound.title")}</p>
      <Link to="/">
        <Button type="primary">{t("notFound.backHome")}</Button>
      </Link>
    </div>
  );
}
