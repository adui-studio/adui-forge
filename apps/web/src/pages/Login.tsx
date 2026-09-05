import { Bot } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router";
import { AppShell } from "@/components/app-shell.tsx";
import { Button } from "@/components/ui/button.tsx";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card.tsx";
import { Input, Label } from "@/components/ui/input.tsx";
import { login, register, saveToken } from "@/lib/auth.ts";

export function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();

  const submit = async (kind: "login" | "register"): Promise<void> => {
    setBusy(true);
    setError(null);
    try {
      const result =
        kind === "login" ? await login(username, password) : await register(username, password);
      saveToken(result.accessToken);
      void navigate("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <AppShell>
      <div className="mx-auto max-w-sm">
        <Card>
          <CardHeader className="items-center text-center">
            <span className="mx-auto mb-1 flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-r from-brand-500 to-violet-500 text-white">
              <Bot className="h-5 w-5" />
            </span>
            <CardTitle>登录 ADui Forge</CardTitle>
            <CardDescription>使用平台账号访问你的 Agent 会话</CardDescription>
          </CardHeader>
          <CardContent>
            <form
              className="flex flex-col gap-3"
              onSubmit={(event) => {
                event.preventDefault();
                void submit("login");
              }}
            >
              <Label htmlFor="username">用户名</Label>
              <Input
                id="username"
                value={username}
                placeholder="用户名"
                onChange={(event) => setUsername(event.target.value)}
              />
              <Label htmlFor="password">密码</Label>
              <Input
                id="password"
                type="password"
                value={password}
                placeholder="至少 8 位"
                onChange={(event) => setPassword(event.target.value)}
              />
              <Button type="submit" disabled={busy || username.length < 3 || password.length < 8}>
                登录
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={busy || username.length < 3 || password.length < 8}
                onClick={() => void submit("register")}
              >
                注册并登录
              </Button>
              {error !== null && (
                <p role="alert" className="text-sm text-red-600">
                  {error}
                </p>
              )}
            </form>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
