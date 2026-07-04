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
  register: (data: { email: string; password: string; companyName: string; firstName?: string; plan?: string }) =>
    request('/auth/register', { method: 'POST', body: JSON.stringify(data) }),
  login: (email: string, password: string) =>
    request('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  me: () => request('/auth/me'),
  changePassword: (currentPassword: string, newPassword: string) =>
    request('/auth/change-password', { method: 'POST', body: JSON.stringify({ currentPassword, newPassword }) }),

  // Profil + formule
  updateProfile: (data: { firstName?: string; lastName?: string; phonePerso?: string }) =>
    request('/auth/profile', { method: 'PATCH', body: JSON.stringify(data) }),
  updatePlan: (plan: string) =>
    request('/auth/plan', { method: 'PATCH', body: JSON.stringify({ plan }) }),
  // Forfaits disponibles (public) + consommation + factures du compte.
  plans: () => request<{ plans: any[] }>('/plans'),
  usage: () => request<any>('/auth/usage'),
  invoices: () => request<any[]>('/auth/invoices'),
  billingStatus: () => request<{ enabled: boolean; subscribed: boolean }>('/billing/status'),
  subscribe: () =>
    request<{ url?: string; error?: string }>('/billing/subscribe', { method: 'POST', body: '{}' }),
  checkoutInvoice: (invoiceId: string) =>
    request<{ url?: string; error?: string }>('/billing/checkout', {
      method: 'POST',
      body: JSON.stringify({ invoiceId }),
    }),

  // Notifications push : enregistrer le token du device.
  registerDevice: (token: string, platform: string) =>
    request('/push/register', { method: 'POST', body: JSON.stringify({ token, platform }) }),

  // Messagerie (conversations avec les clients, canal SMS/WhatsApp selon config).
  threads: () => request<any[]>('/messages/threads'),
  thread: (peer: string) => request<any[]>(`/messages/thread?peer=${encodeURIComponent(peer)}`),
  sendMessage: (to: string, body: string) =>
    request<any>('/messages/send', { method: 'POST', body: JSON.stringify({ to, body }) }),

  myNumbers: () => request('/numbers'),
  availableNumbers: (type?: string, contains?: string) => {
    const p = new URLSearchParams();
    if (type) p.set('type', type);
    if (contains) p.set('contains', contains);
    const qs = p.toString();
    return request<any[]>('/numbers/available' + (qs ? `?${qs}` : ''));
  },
  buyNumber: (e164: string, type?: string) =>
    request<any>('/numbers/buy', { method: 'POST', body: JSON.stringify({ e164, type }) }),
  updateNumberSettings: (id: string, patch: any) =>
    request(`/numbers/${id}/settings`, { method: 'PATCH', body: JSON.stringify(patch) }),
  previewGreeting: (body: { numberId?: string; which: 'open' | 'closed'; text?: string; voice?: string; to: string }) =>
    request<{ ok?: boolean; calling?: string; error?: string }>('/calls/preview-greeting', {
      method: 'POST', body: JSON.stringify(body),
    }),
  history: () => request('/calls'),
  voicemails: () => request('/calls/voicemails'),
  deleteVoicemail: (id: string) => request(`/calls/voicemails/${id}`, { method: 'DELETE' }),
  markVoicemailsRead: () => request('/calls/voicemails/mark-read', { method: 'POST', body: '{}' }),
  reportCall: (body: { to: string; durationS: number; status?: string }) =>
    request('/calls/report', { method: 'POST', body: JSON.stringify(body) }),

  // Softphone WebRTC : token court (sortant) + identifiants connexion (entrant).
  webrtcToken: () => request<{ token: string }>('/telnyx/webrtc-token', { method: 'POST', body: '{}' }),
  webrtcCredentials: () =>
    request<{ login: string; password: string }>('/telnyx/webrtc-credentials', { method: 'POST', body: '{}' }),

  clients: (search?: string) =>
    request('/clients' + (search ? `?search=${encodeURIComponent(search)}` : '')),
  addClient: (data: { name: string; phone: string }) =>
    request('/clients', { method: 'POST', body: JSON.stringify(data) }),
  importClients: (items: { name: string; phone: string }[]) =>
    request<{ imported: number }>('/clients/import', {
      method: 'POST',
      body: JSON.stringify({ items }),
    }),
};

export { API_URL };
