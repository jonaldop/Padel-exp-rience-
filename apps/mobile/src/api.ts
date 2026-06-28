import Constants from 'expo-constants';
import * as SecureStore from 'expo-secure-store';

const API_URL =
  (Constants.expoConfig?.extra as any)?.apiUrl ||
  'https://padel-exp-rience-production.up.railway.app';

const TOKEN_KEY = 'stp_token';
let token: string | null = null;

export const auth = {
  async load() {
    token = await SecureStore.getItemAsync(TOKEN_KEY);
    return token;
  },
  get token() {
    return token;
  },
  async set(t: string | null) {
    token = t;
    if (t) await SecureStore.setItemAsync(TOKEN_KEY, t);
    else await SecureStore.deleteItemAsync(TOKEN_KEY);
  },
};

async function request<T = any>(path: string, opts: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...opts,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(opts.headers || {}),
    },
  });
  if (!res.ok) {
    let message = `Erreur ${res.status}`;
    try {
      const b = await res.json();
      message = b.message || b.error || message;
    } catch {}
    throw new Error(Array.isArray(message) ? message.join(', ') : message);
  }
  return res.json();
}

export const api = {
  register: (data: { email: string; password: string; companyName: string; firstName?: string }) =>
    request('/auth/register', { method: 'POST', body: JSON.stringify(data) }),
  login: (email: string, password: string) =>
    request('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  me: () => request('/auth/me'),

  myNumbers: () => request('/numbers'),
  history: () => request('/calls'),
  voicemails: () => request('/calls/voicemails'),

  clients: (search?: string) =>
    request('/clients' + (search ? `?search=${encodeURIComponent(search)}` : '')),
  addClient: (data: { name: string; phone: string }) =>
    request('/clients', { method: 'POST', body: JSON.stringify(data) }),
};

export { API_URL };
