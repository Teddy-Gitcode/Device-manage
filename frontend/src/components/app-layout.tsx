import { Outlet } from 'react-router-dom';
import { useEffect } from 'react';
import { AppSidebar } from './app-sidebar';
import { AppHeader } from './app-header';
import { connectWebSocket, disconnectWebSocket } from '@/lib/ws';

export function AppLayout() {
  useEffect(() => {
    connectWebSocket();
    return () => disconnectWebSocket();
  }, []);

  return (
    <div className="min-h-full bg-background">
      <AppSidebar />
      <div className="lg:pl-60">
        <AppHeader />
        <main className="p-4 sm:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
