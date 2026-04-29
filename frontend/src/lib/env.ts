const API_URL = import.meta.env.VITE_API_URL ?? '/api';
const WS_URL =
  import.meta.env.VITE_WS_URL ??
  (typeof window !== 'undefined'
    ? `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}`
    : '');

export const env = {
  API_URL,
  WS_URL,
};
