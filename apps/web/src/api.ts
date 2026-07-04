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
    plan?: string;
  }) => request('/auth/register', { method: 'POST', body: JSON.stringify(data) }),

  // Site commercial : formules publiques + abonnement en ligne (Stripe)
  plans: () => request<{ plans: any[] }>('/plans'),
  billingStatus: () => request<{ enabled: boolean; subscribed: boolean }>('/billing/status'),
  subscribe: () =>
    request<{ url?: string; error?: string }>('/billing/subscribe', { method: 'POST', body: '{}' }),

  login: (email: string, password: string) =>
    request('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),

  me: () => request('/auth/me'),
  forgot: (email: string) =>
    request('/auth/forgot', { method: 'POST', body: JSON.stringify({ email }) }),
  reset: (token: string, password: string) =>
    request('/auth/reset', { method: 'POST', body: JSON.stringify({ token, password }) }),

  // Numéros
  availableNumbers: (type?: string, contains?: string) => {
    const p = new URLSearchParams();
    if (type) p.set('type', type);
    if (contains) p.set('contains', contains);
    const qs = p.toString();
    // Endpoint public : la recherche marche aussi avant la création du compte
    // (tunnel d'inscription "choisissez votre numéro d'abord").
    return request('/public/numbers/available' + (qs ? `?${qs}` : ''));
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

  // Admin (back-office propriétaire) — login + mot de passe
  adminLogin: (email: string, password: string) =>
    request<{ token: string; email: string }>('/admin/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),
  adminAccounts: (token: string) =>
    request('/admin/accounts', { headers: { Authorization: `Bearer ${token}` } }),
  adminDashboard: (token: string) =>
    request('/admin/dashboard', { headers: { Authorization: `Bearer ${token}` } }),
  adminDebugCalls: (token: string) =>
    request<{ events: any[] }>('/admin/debug-calls', { headers: { Authorization: `Bearer ${token}` } }),
  adminFixInbound: (token: string) =>
    request('/admin/fix-inbound', { method: 'POST', headers: { Authorization: `Bearer ${token}` } }),
  adminPlans: (token: string) =>
    request<{ plans: any[] }>('/admin/plans', { headers: { Authorization: `Bearer ${token}` } }),
  adminUpsertPlan: (token: string, plan: any) =>
    request('/admin/plans', { method: 'PATCH', headers: { Authorization: `Bearer ${token}` }, body: JSON.stringify(plan) }),
  adminDeletePlan: (token: string, key: string) =>
    request(`/admin/plans/${encodeURIComponent(key)}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } }),
  adminIosPush: (token: string, certificate: string, privateKey: string) =>
    request('/admin/ios-push', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({ certificate, privateKey }),
    }),
  // Actions sur les comptes clients
  adminAccountDetail: (token: string, id: string) =>
    request<{ usage: any; calls: any[]; notes: any[] }>(`/admin/accounts/${id}/detail`, {
      headers: { Authorization: `Bearer ${token}` },
    }),
  adminAccountStatus: (token: string, id: string, status: string) =>
    request(`/admin/accounts/${id}/status`, {
      method: 'PATCH', headers: { Authorization: `Bearer ${token}` }, body: JSON.stringify({ status }),
    }),
  adminAccountPlan: (token: string, id: string, plan: string) =>
    request(`/admin/accounts/${id}/plan`, {
      method: 'PATCH', headers: { Authorization: `Bearer ${token}` }, body: JSON.stringify({ plan }),
    }),
  adminResetPassword: (token: string, id: string, email: string, newPassword?: string) =>
    request<{ ok?: boolean; newPassword?: string; error?: string }>(`/admin/accounts/${id}/reset-password`, {
      method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: JSON.stringify({ email, newPassword }),
    }),
  adminAddNote: (token: string, id: string, text: string) =>
    request(`/admin/accounts/${id}/notes`, {
      method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: JSON.stringify({ text }),
    }),
  adminDeleteNote: (token: string, noteId: string) =>
    request(`/admin/notes/${noteId}`, {
      method: 'DELETE', headers: { Authorization: `Bearer ${token}` },
    }),
  // Essai / remise / factures
  adminSetTrial: (token: string, id: string, body: { days?: number; until?: string; unlimited?: boolean }) =>
    request<{ ok?: boolean; trial?: any; error?: string }>(`/admin/accounts/${id}/trial`, {
      method: 'PATCH', headers: { Authorization: `Bearer ${token}` }, body: JSON.stringify(body),
    }),
  adminSetDiscount: (token: string, id: string, discountPct: number) =>
    request<{ ok?: boolean; prixEffectif?: number; error?: string }>(`/admin/accounts/${id}/discount`, {
      method: 'PATCH', headers: { Authorization: `Bearer ${token}` }, body: JSON.stringify({ discountPct }),
    }),
  adminSetInvoiceStatus: (token: string, invoiceId: string, status: 'due' | 'paid' | 'void') =>
    request(`/admin/invoices/${invoiceId}`, {
      method: 'PATCH', headers: { Authorization: `Bearer ${token}` }, body: JSON.stringify({ status }),
    }),
  // Réglages plateforme (Stripe)
  adminGetSettings: (token: string) =>
    request<{
      stripe: { configured: boolean; source: string | null; keyMasked: string | null };
      ai: { configured: boolean; source: string | null; provider: string | null; keyMasked: string | null };
    }>('/admin/settings', {
      headers: { Authorization: `Bearer ${token}` },
    }),
  adminSetStripeKey: (token: string, secretKey: string) =>
    request<{ ok?: boolean; configured?: boolean; keyMasked?: string; error?: string }>('/admin/settings/stripe', {
      method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: JSON.stringify({ secretKey }),
    }),
  adminSetAiKey: (token: string, apiKey: string) =>
    request<{ ok?: boolean; configured?: boolean; provider?: string; keyMasked?: string; error?: string }>('/admin/settings/ai', {
      method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: JSON.stringify({ apiKey }),
    }),

  // Softphone
  webrtcToken: () => request('/telnyx/webrtc-token', { method: 'POST', body: '{}' }),
};

export { API_URL };
