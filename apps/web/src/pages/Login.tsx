import { Lock } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router";
import { useTranslation } from "react-i18next";
import { Button, Card, Form, Input } from "antd";
import { login, register, saveToken } from "@/lib/auth.ts";

export function LoginPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [form] = Form.useForm<{ username: string; password: string }>();
  const [error, setError] = useState<string | null>(null);

  const submit = async (
    kind: "login" | "register",
    values: { username: string; password: string },
  ): Promise<void> => {
    setBusy(true);
    setError(null);
    try {
      const result =
        kind === "login"
          ? await login(values.username, values.password)
          : await register(values.username, values.password);
      saveToken(result.accessToken);
      void navigate("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-sm pt-8">
      <Card>
        <div className="mb-4 flex flex-col items-center gap-2 text-center">
          <Lock className="h-6 w-6 text-accent-300" />
          <h1 className="text-lg font-semibold text-slate-100">{t("login.title")}</h1>
          <p className="text-sm text-slate-500">{t("login.subtitle")}</p>
        </div>
        <Form
          form={form}
          layout="vertical"
          onFinish={(values) => submit("login", values)}
          requiredMark={false}
        >
          <Form.Item
            name="username"
            label={t("login.username")}
            rules={[{ required: true, message: t("login.usernameRequired") }]}
          >
            <Input placeholder={t("login.usernamePlaceholder")} />
          </Form.Item>
          <Form.Item
            name="password"
            label={t("login.password")}
            rules={[
              { required: true, message: t("login.passwordRequired") },
              { min: 8, message: t("login.passwordMin") },
            ]}
          >
            <Input.Password placeholder={t("login.passwordPlaceholder")} />
          </Form.Item>
          {/* §46 字段错误带原因，由 rules 提供 */}
          {error !== null && (
            <p role="alert" className="mb-3 text-sm text-red-600">
              {error}
            </p>
          )}
          <div className="flex flex-col gap-2">
            <Button type="primary" htmlType="submit" block loading={busy}>
              {t("login.submit")}
            </Button>
            <Button
              block
              loading={busy}
              onClick={(event) => {
                event.preventDefault();
                form
                  ?.validateFields()
                  .then((values) => submit("register", values))
                  .catch(() => {});
              }}
            >
              {t("login.register")}
            </Button>
          </div>
        </Form>
      </Card>
    </div>
  );
}
