import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, Printer, TriangleAlert } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { authApi } from '@/features/auth/api';
import { ApiError } from '@/lib/api';
import { isAuthenticated, setToken, setUser } from '@/lib/auth';

export function LoginPage() {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isAuthenticated()) navigate('/dashboard', { replace: true });
  }, [navigate]);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const { token, username: u, email } = await authApi.login(username, password);
      setToken(token);
      try {
        const me = await authApi.me();
        setUser(me);
      } catch {
        setUser({
          username: u,
          email: email ?? '',
          first_name: '',
          last_name: '',
          date_joined: '',
          last_login: null,
          role: 'viewer',
        });
      }
      navigate('/dashboard', { replace: true });
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        setError('Invalid credentials. Please try again.');
      } else if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Cannot reach the server. Is the backend running?');
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-full items-center justify-center p-6">
      <div className="w-full max-w-sm space-y-6">
        <div className="flex items-center justify-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/15 text-primary">
            <Printer className="h-5 w-5" />
          </div>
          <div>
            <p className="text-base font-semibold leading-none">PrinterFleet</p>
            <p className="text-xs text-muted-foreground mt-0.5">NOC Console</p>
          </div>
        </div>

        <Card className="p-6">
          <h1 className="mb-1 text-xl font-semibold">Sign in</h1>
          <p className="mb-5 text-sm text-muted-foreground">
            Enter your credentials to access the fleet.
          </p>

          {error && (
            <Alert variant="destructive" className="mb-4">
              <TriangleAlert className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                autoComplete="username"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="admin"
                disabled={loading}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                disabled={loading}
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              {loading ? 'Signing in…' : 'Sign in'}
            </Button>
          </form>
        </Card>

        <p className="text-center text-xs text-muted-foreground">
          Internal tool · v0.2
        </p>
      </div>
    </div>
  );
}
