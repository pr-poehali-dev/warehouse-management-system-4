import { useState } from 'react';
import Icon from '@/components/ui/icon';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/context/AuthContext';

function LoginScreen() {
  const { login } = useAuth();
  const [loginValue, setLoginValue] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await login(loginValue.trim(), password);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка входа');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid-bg flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-md animate-scale-in rounded-3xl border bg-card p-8 shadow-xl">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground glow-primary">
            <Icon name="Warehouse" size={24} />
          </div>
          <div>
            <div className="font-display text-xl font-bold">СкладOS</div>
            <div className="text-xs text-muted-foreground">вход для сотрудников</div>
          </div>
        </div>

        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium">Логин</label>
            <Input value={loginValue} onChange={(e) => setLoginValue(e.target.value)}
              placeholder="email или логин" autoComplete="username" />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium">Пароль</label>
            <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••" autoComplete="current-password" />
          </div>
          {error && (
            <div className="flex items-center gap-2 rounded-xl bg-destructive/10 p-3 text-sm text-destructive">
              <Icon name="CircleAlert" size={16} /> {error}
            </div>
          )}
          <Button type="submit" disabled={busy} className="w-full gap-2">
            {busy ? <Icon name="LoaderCircle" size={16} className="animate-spin" /> : <Icon name="LogIn" size={16} />}
            Войти
          </Button>
        </form>

        <p className="mt-5 text-center text-xs text-muted-foreground">
          Доступ выдаёт администратор склада
        </p>
      </div>
    </div>
  );
}

export default LoginScreen;
