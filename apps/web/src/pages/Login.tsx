import { Lock } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router";
import { Button, Card, Form, Input } from "antd";
import { login, register, saveToken } from "@/lib/auth.ts";

export function LoginPage() {
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
          <h1 className="text-lg font-semibold text-slate-100">登录 ADui Forge</h1>
          <p className="text-sm text-slate-500">使用平台账号访问你的 Agent 会话</p>
        </div>
        <Form
          form={form}
          layout="vertical"
          onFinish={(values) => submit("login", values)}
          requiredMark={false}
        >
          <Form.Item
            name="username"
            label="用户名"
            rules={[{ required: true, message: "请输入用户名" }]}
          >
            <Input placeholder="用户名" />
          </Form.Item>
          <Form.Item
            name="password"
            label="密码"
            rules={[
              { required: true, message: "请输入密码" },
              { min: 8, message: "密码至少 8 位" },
            ]}
          >
            <Input.Password placeholder="至少 8 位" />
          </Form.Item>
          {/* §46 字段错误带原因，由 rules 提供 */}
          {error !== null && (
            <p role="alert" className="mb-3 text-sm text-red-600">
              {error}
            </p>
          )}
          <div className="flex flex-col gap-2">
            <Button type="primary" htmlType="submit" block loading={busy}>
              登录
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
              注册并登录
            </Button>
          </div>
        </Form>
      </Card>
    </div>
  );
}
