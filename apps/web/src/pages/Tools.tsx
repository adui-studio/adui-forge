import { useQuery } from "@tanstack/react-query";
import { ShieldAlert, ShieldCheck, Wrench } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Card, Empty, Spin, Tag, Tooltip } from "antd";
import { fetchTools } from "@/lib/api.ts";

/** Tools 管理页（REQUIREMENTS §12）：启动工具池全量清单，标注权限等级。 */
export function ToolsPage() {
  const { t } = useTranslation();
  const {
    data: tools,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ["agent-tools"],
    queryFn: fetchTools,
  });

  return (
    <>
      <div className="mb-4 flex items-center gap-2">
        <Wrench className="h-5 w-5 text-brand-300" />
        <h1 className="text-xl font-semibold text-slate-100">{t("tools.title")}</h1>
      </div>
      <p className="mb-4 text-sm text-slate-400">{t("tools.subtitle")}</p>

      {isLoading && (
        <div className="flex justify-center py-12">
          <Spin />
        </div>
      )}
      {isError && (
        <p role="alert" className="text-sm text-red-600">
          {String(error)}
        </p>
      )}
      {tools !== undefined && tools.length === 0 && (
        <Card>
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={
              <span className="text-slate-500">
                {t("tools.empty1")}
                <br />
                {t("tools.empty2")}
              </span>
            }
          />
        </Card>
      )}

      <div className="grid gap-3 md:grid-cols-2">
        {tools?.map((tool) => (
          <Card key={tool.name} size="small">
            <div className="flex flex-wrap items-center gap-2">
              <span className="forge-code text-sm font-semibold text-slate-100">{tool.name}</span>
              {tool.permission === "approval" ? (
                <Tooltip title={t("tools.approvalTip")}>
                  <Tag color="warning" className="ml-auto">
                    <ShieldAlert className="mr-1 inline h-3 w-3" />
                    {t("tools.approval")}
                  </Tag>
                </Tooltip>
              ) : (
                <Tooltip title={t("tools.freeTip")}>
                  <Tag color="green" className="ml-auto">
                    <ShieldCheck className="mr-1 inline h-3 w-3" />
                    {t("tools.free")}
                  </Tag>
                </Tooltip>
              )}
            </div>
            <p className="mt-2 text-sm text-slate-400">{tool.description}</p>
          </Card>
        ))}
      </div>
    </>
  );
}
