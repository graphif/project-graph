import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { authClient } from "@/core/service/AuthClient";
import { FeatureFlags } from "@/core/service/FeatureFlags";
import { UserState } from "@/core/service/UserState";
import type { AuthUser } from "@/state";
import { currentUserAtom, store } from "@/state";
import { getAppVersion, getDeviceId } from "@/utils/otherApi";
import { open } from "@tauri-apps/plugin-shell";
import { useAtom } from "jotai";
import { ExternalLink, LoaderCircle, LogIn, LogOut, Mail } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export default function AccountTab() {
  const [user] = useAtom(currentUserAtom);

  if (!FeatureFlags.USER || !authClient) {
    return (
      <div className="text-muted-foreground flex h-full items-center justify-center text-sm">
        云服务功能未启用（缺少 LR_API_BASE_URL 环境变量）
      </div>
    );
  }

  if (user) {
    return (
      <UserInfo
        user={user}
        onSignOut={async () => {
          try {
            await authClient!.signOut();
          } catch {
            /* ignore */
          }
          await UserState.clearSession();
          store.set(currentUserAtom, null);
          toast.success("已退出登录");
        }}
      />
    );
  }

  return <LoginForm onLogin={(u) => store.set(currentUserAtom, u as AuthUser)} />;
}

function LoginForm({ onLogin }: { onLogin: (user: AuthUser) => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async () => {
    if (!email.trim()) {
      setError("请输入邮箱");
      return;
    }
    if (!password) {
      setError("请输入密码");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const { data, error: authError } = await authClient!.signIn.email(
        { email, password },
        {
          headers: {
            "x-app-name": "Project Graph",
            "x-app-version": await getAppVersion(),
            "x-device-id": await getDeviceId(),
          },
        },
      );
      if (authError) {
        setError(authError.message ?? "登录失败，请检查邮箱和密码");
        return;
      }
      if (data?.user) {
        await UserState.setSession({ user: data.user as AuthUser, token: data.token ?? "" });
        onLogin(data.user as AuthUser);
      }
      toast.success("登录成功");
    } catch (e) {
      console.error("Login error", e);
      setError(e instanceof Error ? e.message : "网络错误，请稍后重试");
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = () => {
    open(import.meta.env.LR_API_BASE_URL!);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleLogin();
  };

  return (
    <div className="mx-auto flex h-full max-w-sm flex-col items-center justify-center gap-5">
      <div className="space-y-1 text-center">
        <LogIn className="mx-auto size-8 opacity-50" />
        <h2 className="text-lg font-medium">登录</h2>
        <p className="text-muted-foreground text-xs">登录后可同步和备份你的数据</p>
      </div>

      <div className="w-full space-y-3">
        <div className="space-y-1">
          <label className="text-muted-foreground text-xs">邮箱</label>
          <Input
            placeholder="your@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={handleKeyDown}
            autoFocus
          />
        </div>
        <div className="space-y-1">
          <label className="text-muted-foreground text-xs">密码</label>
          <Input
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={handleKeyDown}
          />
        </div>
      </div>

      {error && <p className="text-destructive text-sm">{error}</p>}

      <Button className="w-full" onClick={handleLogin} disabled={loading}>
        {loading ? <LoaderCircle className="animate-spin" /> : <LogIn />}
        {loading ? "登录中..." : "登录"}
      </Button>

      <Button className="w-full" onClick={handleRegister} variant="outline" disabled={loading}>
        <ExternalLink />
        前往注册
      </Button>
    </div>
  );
}

function UserInfo({ user, onSignOut }: { user: AuthUser; onSignOut: () => void }) {
  const avatarChar = (user.name || user.email || "").charAt(0).toUpperCase();

  return (
    <div className="mx-auto flex h-full max-w-sm flex-col items-center justify-center gap-6">
      <div className="bg-primary/15 flex size-16 items-center justify-center rounded-full text-2xl font-medium">
        {avatarChar}
      </div>

      <div className="space-y-2 text-center">
        {user.name && <h2 className="text-lg font-medium">{user.name}</h2>}
        <div className="text-muted-foreground flex items-center justify-center gap-1.5 text-sm">
          <Mail className="size-3.5" />
          {user.email}
        </div>
        {user.emailVerified && (
          <span className="inline-block rounded-full bg-green-500/15 px-2.5 py-0.5 text-xs text-green-600">已验证</span>
        )}
      </div>

      <Button variant="outline" className="w-full" onClick={onSignOut}>
        <LogOut className="mr-1.5 size-4" />
        退出登录
      </Button>
    </div>
  );
}
