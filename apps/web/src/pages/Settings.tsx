import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Database, LogOut, Server } from "lucide-react";
import { Link, useNavigate } from "react-router";
import { useTranslation } from "react-i18next";
import { changeLanguage, SUPPORTED_LANGUAGES, type SupportedLanguage } from "@/i18n/index.ts";
import { App as AntApp, Button, Card, Descriptions, Popconfirm, Select, Spin } from "antd";
import { clearToken } from "@/lib/auth.ts";
import { fetchHealth } from "@/lib/approvals-metrics.ts";

export function SettingsPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { message } = AntApp.useApp();
  const {
    data: health,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ["settings-health"],
    queryFn: fetchHealth,
    refetchInterval: 10_000,
  });

  return (
    <>
      <h1 className="mb-6 text-xl font-semibold text-slate-100">{t("settings.title")}</h1>

      <Card title={t("settings.apiStatus")}>
        {isLoading && (
          <div className="flex justify-center py-12">
            <Spin />
          </div>
        )}
        {isError && (
          <p className="text-sm text-red-600">
            {t("settings.cannotConnect")}
            {String(error)}
          </p>
        )}
        {health !== undefined && (
          <Descriptions
            column={1}
            items={[
              {
                key: "service",
                label: (
                  <span className="flex items-center gap-1.5">
                    <Server className="h-3.5 w-3.5" /> {t("settings.service")}
                  </span>
                ),
                children: health.status,
              },
              {
                key: "db",
                label: (
                  <span className="flex items-center gap-1.5">
                    <Database className="h-3.5 w-3.5" /> {t("settings.db")}
                  </span>
                ),
                children:
                  health.db === "up"
                    ? t("settings.dbUp")
                    : health.db === "down"
                      ? t("settings.dbDown")
                      : t("settings.dbNone"),
              },
            ]}
          />
        )}
      </Card>

      <Card title={t("settings.language")} className="mt-4">
        <Select
          aria-label={t("settings.language")}
          value={i18n.language}
          options={SUPPORTED_LANGUAGES.map((language) => ({
            value: language,
            label: language === "zh-CN" ? "简体中文" : "English",
          }))}
          onChange={(value) => changeLanguage(value as SupportedLanguage)}
          className="w-48"
        />
        <p className="mt-2 text-xs text-slate-500">{t("settings.languageHint")}</p>
      </Card>

      <Card title={t("settings.loginState")} className="mt-4">
        <div className="flex gap-2">
          <Link to="/login">
            <Button>{t("settings.gotoLogin")}</Button>
          </Link>
          {/* 破坏性操作先确认 */}
          <Popconfirm
            title={t("settings.clearTitle")}
            description={t("settings.clearDesc")}
            okText={t("settings.clearOk")}
            cancelText={t("common.cancel")}
            onConfirm={() => {
              clearToken();
              queryClient.clear();
              void message.success(t("settings.cleared"));
              void navigate("/");
            }}
          >
            <Button type="text" icon={<LogOut className="h-4 w-4" />}>
              {t("settings.clearToken")}
            </Button>
          </Popconfirm>
        </div>
      </Card>
    </>
  );
}
