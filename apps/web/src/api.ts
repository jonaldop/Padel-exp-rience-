const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

const TOKEN_KEY = 'stp_token';

export const auth = {
  get token() {
    return localStorage.getItem(TOKEN_KEY);
  },
  set token(t: string | null) {
    if (t) localStorage.setItem(TOKEN_KEY, t);
    else localStorage.removeItem(TOKEN_KEY);
  },
};

async function request<T = any>(path: string, opts: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...opts,
    headers: {
      'Content-Type': 'application/json',
      ...(auth.token ? { Authorization: `Bearer ${auth.token}` } : {}),
      ...(opts.headers || {}),
    },
  });
  if (!res.ok) {
    let message = `Erreur ${res.status}`;
    try {
      const body = await res.json();
      message = body.message || body.error || message;
    } catch {
      /* ignore */
    }
    throw new Error(Array.isArray(message) ? message.join(', ') : message);
  }
  return res.json();
}

export const api = {
  register: (data: {
    email: string;
    password: string;
    companyName: string;
    firstName?: string;
  }) => request('/auth/register', { method: 'POST', body: JSON.stringify(data) }),

  login: (email: string, password: string) =>
    request('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),

  me: () => request('/auth/me'),

  // Numéros
  availableNumbers: (type?: string, contains?: string) => {
    const p = new URLSearchParams();
    if (type) p.set('type', type);
    if (contains) p.set('contains', contains);
    const qs = p.toString();
    return request('/numbers/available' + (qs ? `?${qs}` : ''));
  },
  myNumbers: () => request('/numbers'),
  numberStatus: (id: string) => request(`/numbers/${id}/status`),
  buyNumber: (e164: string, type?: string) =>
    request('/numbers/buy', { method: 'POST', body: JSON.stringify({ e164, type }) }),
  importNumbers: () => request('/numbers/import', { method: 'POST', body: '{}' }),
  updateSettings: (id: string, patch: any) =>
    request(`/numbers/${id}/settings`, { method: 'PATCH', body: JSON.stringify(patch) }),

  // Appels
  history: () => request('/calls'),
  voicemails: () => request('/calls/voicemails'),
  dial: (to: string) => request('/calls/dial', { method: 'POST', body: JSON.stringify({ to }) }),

  // Clients (carnet)
  clients: (search?: string) =>
    request('/clients' + (search ? `?search=${encodeURIComponent(search)}` : '')),
  addClient: (data: { name: string; phone: string; email?: string; notes?: string }) =>
    request('/clients', { method: 'POST', body: JSON.stringify(data) }),
  importClients: (items: { name: string; phone: string }[]) =>
    request('/clients/import', { method: 'POST', body: JSON.stringify({ items }) }),
  updateClient: (id: string, data: any) =>
    request(`/clients/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteClient: (id: string) => request(`/clients/${id}`, { method: 'DELETE' }),

  // Softphone
  webrtcToken: () => request('/telnyx/webrtc-token', { method: 'POST', body: '{}' }),
};

export { API_URL };
