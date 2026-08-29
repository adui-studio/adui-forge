import { useState } from "react";
import { useNavigate } from "react-router";
import { login, register, saveToken } from "../lib/auth.ts";

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
      navigate("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <main>
      <h1>登录 ADui Forge</h1>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          void submit("login");
        }}
      >
        <input
          value={username}
          placeholder="用户名"
          onChange={(e) => setUsername(e.target.value)}
        />
        <input
          type="password"
          value={password}
          placeholder="密码（至少 8 位）"
          onChange={(e) => setPassword(e.target.value)}
        />
        <button type="submit" disabled={busy || username.length < 3 || password.length < 8}>
          登录
        </button>{" "}
        <button
          type="button"
          disabled={busy || username.length < 3 || password.length < 8}
          onClick={() => void submit("register")}
        >
          注册并登录
        </button>
      </form>
      {error !== null && <p role="alert">{error}</p>}
      <p>
        <a href="/">← 返回首页</a>
      </p>
    </main>
  );
}
