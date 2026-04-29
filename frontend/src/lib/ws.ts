import { queryClient } from './query';
import { getToken, clearAuth } from './auth';
import { env } from './env';
import type { WSMessage } from '@/types/api';

const INITIAL_DELAY = 1000;
const MAX_DELAY = 30_000;

let socket: WebSocket | null = null;
let shouldReconnect = true;
let delay = INITIAL_DELAY;
let listeners = new Set<(msg: WSMessage) => void>();

export function onPrinterUpdate(listener: (msg: WSMessage) => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function connectWebSocket(): void {
  const token = getToken();
  if (!token) return;
  if (socket && socket.readyState === WebSocket.OPEN) return;

  shouldReconnect = true;
  const url = `${env.WS_URL}/ws/printers/?token=${encodeURIComponent(token)}`;
  socket = new WebSocket(url);

  socket.onopen = () => {
    delay = INITIAL_DELAY;
    window.dispatchEvent(new CustomEvent('ws-status', { detail: 'connected' }));
  };

  socket.onmessage = (event) => {
    let msg: WSMessage;
    try {
      msg = JSON.parse(event.data) as WSMessage;
    } catch {
      return;
    }

    queryClient.invalidateQueries({ queryKey: ['printers'] });
    queryClient.invalidateQueries({ queryKey: ['sre-signals'] });
    if (msg.printer_id) {
      queryClient.invalidateQueries({ queryKey: ['printer', msg.printer_id] });
      queryClient.invalidateQueries({ queryKey: ['logs'] });
    }

    for (const listener of listeners) listener(msg);
  };

  socket.onclose = (event) => {
    window.dispatchEvent(new CustomEvent('ws-status', { detail: 'disconnected' }));
    if (event.code === 4001) {
      clearAuth();
      location.href = '/login';
      return;
    }
    if (!shouldReconnect) return;
    setTimeout(() => {
      delay = Math.min(delay * 2, MAX_DELAY);
      connectWebSocket();
    }, delay);
  };

  socket.onerror = () => {
    socket?.close();
  };
}

export function disconnectWebSocket(): void {
  shouldReconnect = false;
  socket?.close();
  socket = null;
}
