import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, User as UserIcon } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { StatusDot } from '@/components/status-indicator';
import { authApi } from '@/features/auth/api';
import { clearAuth, getUser } from '@/lib/auth';
import { cn } from '@/lib/utils';

export function AppHeader() {
  const navigate = useNavigate();
  const user = getUser();
  const [wsStatus, setWsStatus] = useState<'connected' | 'disconnected'>(
    'disconnected'
  );

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<'connected' | 'disconnected'>).detail;
      setWsStatus(detail);
    };
    window.addEventListener('ws-status', handler);
    return () => window.removeEventListener('ws-status', handler);
  }, []);

  const initials = (user?.username ?? '??').slice(0, 2).toUpperCase();

  async function onLogout() {
    try {
      await authApi.logout();
    } catch {
      /* ignore */
    }
    clearAuth();
    navigate('/login', { replace: true });
  }

  return (
    <header className="sticky top-0 z-10 flex h-14 items-center justify-between gap-4 border-b border-border bg-background/80 px-4 backdrop-blur lg:pl-64">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <StatusDot tone={wsStatus === 'connected' ? 'success' : 'muted'} pulse={wsStatus === 'connected'} />
        <span>{wsStatus === 'connected' ? 'Live' : 'Offline'}</span>
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="h-9 gap-2 px-2">
            <Avatar className="h-7 w-7">
              <AvatarFallback className="text-xs">{initials}</AvatarFallback>
            </Avatar>
            <div className="hidden md:flex flex-col items-start leading-tight">
              <span className="text-sm font-medium">{user?.username ?? 'User'}</span>
              <span
                className={cn(
                  'text-[10px] uppercase tracking-wider',
                  user?.role === 'admin'
                    ? 'text-primary'
                    : 'text-muted-foreground'
                )}
              >
                {user?.role ?? 'viewer'}
              </span>
            </div>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>
            <div className="flex flex-col">
              <span className="font-medium">{user?.username}</span>
              <span className="text-xs font-normal text-muted-foreground">{user?.email}</span>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => navigate('/settings')}>
            <UserIcon className="h-4 w-4" />
            Profile & Settings
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={onLogout}>
            <LogOut className="h-4 w-4" />
            Sign out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
