import { useEffect, useState } from 'react';
import { api } from '../api';
import { Button, Card, GlassBackground, Input, colors, glass } from '../ui';
import { formatFr } from '../format';

type Tab = 'dashboard' | 'plans' | 'accounts';

export function Admin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [token, setToken] = useState(localStorage.getItem('stp_admin_token') || '');
  const [tab, setTab] = useState<Tab>('dashboard');
  const [dashboard, setDashboard] = useState<any>(null);
  const [plans, setPlans] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState<Record<string, boolean>>({});

  async function loadAll(tok = token) {
    if (!tok) return;
    setError(null);
    setLoading(true);
    try {
      const [d, p, a] = await Promise.all([
        api.adminDashboard(tok),
        api.adminPlans(tok),
        api.adminAccounts(tok),
      ]);
      setDashboard(d);
      setPlans((p as any).plans || []);
      setAccounts((a as any).accounts || []);
    } catch (e: any) {
      localStorage.removeItem('stp_admin_token');
      setToken('');
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function login() {
    setError(null);
    setLoading(true);
    try {
      const res = await api.adminLogin(email, password);
      localStorage.setItem('stp_admin_token', res.token);
      setToken(res.token);
      setPassword('');
      await loadAll(res.token);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  function logout() {
    localStorage.removeItem('stp_admin_token');
    setToken('');
    setDashboard(null);
    setAccounts([]);
    setPlans([]);
  }

  useEffect(() => {
    if (token) loadAll(token);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const eur = (n: number) => `${(n ?? 0).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;

  return (
    <div style={{ minHeight: '100vh', position: 'relative' }}>
      <GlassBackground />
      <div style={{ position: 'relative', zIndex: 1, maxWidth: 1000, margin: '0 auto', padding: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h1 style={{ fontSize: 28, fontWeight: 800 }}>🛠️ Administration Joe</h1>
          {token && (
            <Button onClick={logout} style={{ background: 'transparent', color: colors.muted }}>Se déconnecter</Button>
          )}
        </div>

        {error && (
          <div style={{ background: colors.redSoft, color: colors.red, padding: 12, borderRadius: 10, margin: '12px 0' }}>⚠️ {error}</div>
        )}

        {!token ? (
          <div style={{ ...glass, borderRadius: 16, padding: 16, marginTop: 16, maxWidth: 420 }}>
            <p style={{ fontWeight: 700, marginTop: 0 }}>Connexion administrateur</p>
            <Input type="email" placeholder="Email admin" value={email} autoFocus onChange={(e) => setEmail(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && login()} style={{ width: '100%', marginBottom: 8 }} />
            <Input type="password" placeholder="Mot de passe" value={password} onChange={(e) => setPassword(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && login()} style={{ width: '100%', marginBottom: 12 }} />
            <Button onClick={login} disabled={loading} style={{ width: '100%' }}>{loading ? '…' : 'Se connecter'}</Button>
          </div>
        ) : (
          <>
            {/* Onglets */}
            <div style={{ display: 'flex', gap: 8, margin: '16px 0' }}>
              {([['dashboard', '📊 Tableau de bord'], ['plans', '💳 Formules'], ['accounts', '👥 Comptes']] as [Tab, string][]).map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => setTab(key)}
                  style={{
                    border: 'none', cursor: 'pointer', padding: '8px 14px', borderRadius: 12, fontWeight: 700, fontSize: 14,
                    background: tab === key ? colors.primary : 'rgba(255,255,255,0.7)',
                    color: tab === key ? '#fff' : colors.text,
                  }}
                >
                  {label}
                </button>
              ))}
            </div>

            {tab === 'dashboard' && dashboard && (
              <>
                <Dashboard dashboard={dashboard} eur={eur} />
                <DebugCalls token={token} />
                <PushSetup token={token} />
              </>
            )}
            {tab === 'plans' && <Plans token={token} plans={plans} onChange={() => loadAll()} eur={eur} />}
            {tab === 'accounts' && <Accounts accounts={accounts} open={open} setOpen={setOpen} eur={eur} />}
          </>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div style={{ ...glass, borderRadius: 14, padding: 16, minWidth: 150, flex: '1 1 150px' }}>
      <div style={{ fontSize: 12.5, color: colors.muted }}>{label}</div>
      <div style={{ fontWeight: 800, fontSize: 22, color: color || colors.text, marginTop: 4 }}>{value}</div>
    </div>
  );
}

function Dashboard({ dashboard, eur }: { dashboard: any; eur: (n: number) => string }) {
  const s = dashboard.summary || {};
  const t = dashboard.telnyx;
  return (
    <div>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <Stat label="Comptes (dont actifs)" value={`${s.nbComptes} (${s.nbActifs})`} />
        <Stat label="Revenu mensuel (MRR)" value={eur(s.mrr)} color={colors.primary} />
        <Stat label="Coût télécom estimé" value={eur(s.coutTotal)} color={colors.amber} />
        <Stat label="Marge mensuelle" value={eur(s.margeTotale)} color={(s.margeTotale ?? 0) >= 0 ? colors.green : colors.red} />
        <Stat label="Minutes consommées" value={`${s.minutesTotal} min`} />
        <Stat label="Appels / Numéros" value={`${s.nbAppels} / ${s.nbNumeros}`} />
        <Stat
          label="Solde Telnyx"
          value={t ? `${t.balance} ${t.currency}` : '—'}
          color={colors.primary}
        />
      </div>
      <p style={{ color: colors.muted, fontSize: 12.5, marginTop: 12 }}>
        Coût estimé sur la base de {eur(dashboard.costPerMinute)} / minute (modifiable via la variable COST_PER_MINUTE).
        {!t && ' Solde Telnyx indisponible (clé non configurée).'}
      </p>
    </div>
  );
}

function DebugCalls({ token }: { token: string }) {
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const res: any = await api.adminDebugCalls(token);
      setEvents(res.events || []);
    } catch { /* ignore */ } finally {
      setLoading(false);
    }
  }
  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  return (
    <div style={{ ...glass, borderRadius: 16, padding: 16, marginTop: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontWeight: 800 }}>🩺 Diagnostic appels entrants</div>
        <Button onClick={load} disabled={loading} style={{ padding: '6px 12px' }}>{loading ? '…' : 'Rafraîchir'}</Button>
      </div>
      <p style={{ color: colors.muted, fontSize: 12.5, marginTop: 6 }}>Décision de routage des derniers appels reçus (pour debug).</p>
      {events.length === 0 ? (
        <div style={{ color: colors.muted, fontSize: 13 }}>Aucun appel entrant récent.</div>
      ) : (
        <div style={{ display: 'grid', gap: 6 }}>
          {events.map((e, i) => (
            <div key={i} style={{ fontFamily: 'monospace', fontSize: 12, background: 'rgba(255,255,255,0.6)', borderRadius: 8, padding: 8 }}>
              <b>{e.decision || e.type || '?'}</b> · de {e.from} → {e.to}
              {e.dir ? ` · ${e.dir}` : ''}
              {typeof e.open !== 'undefined' ? ` · ouvert=${String(e.open)}` : ''}
              {e.sipUser ? ` · sip=${e.sipUser}` : ''}
              {e.cause ? ` · cause=${e.cause}` : ''}
              {e.sipCause ? ` · sip=${e.sipCause}` : ''}
              {e.transferErr ? ` · ⚠️ ${e.transferErr}` : ''}
              {' · '}{new Date(e.at).toLocaleTimeString('fr-FR')}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function PushSetup({ token }: { token: string }) {
  const [cert, setCert] = useState('');
  const [key, setKey] = useState('');
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [show, setShow] = useState(false);

  async function go() {
    setMsg(null);
    setBusy(true);
    try {
      const res: any = await api.adminIosPush(token, cert.trim(), key.trim());
      setMsg(res.error ? `⚠️ ${res.error}` : `✅ Push iOS configuré (id ${res.id}).`);
    } catch (e: any) {
      setMsg(`⚠️ ${e.message}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ ...glass, borderRadius: 16, padding: 16, marginTop: 16 }}>
      <button onClick={() => setShow((s) => !s)} style={{ border: 'none', background: 'transparent', cursor: 'pointer', fontWeight: 800, fontSize: 15, padding: 0 }}>
        📲 Configuration push iOS {show ? '▲' : '▼'}
      </button>
      {show && (
        <div style={{ marginTop: 10 }}>
          <p style={{ color: colors.muted, fontSize: 13, marginTop: 0 }}>Colle cert.pem et key.pem (certificat VoIP Apple) — utile au renouvellement.</p>
          <textarea placeholder="cert.pem" value={cert} onChange={(e) => setCert(e.target.value)} style={{ width: '100%', minHeight: 80, fontFamily: 'monospace', fontSize: 12, padding: 10, borderRadius: 10, border: `1px solid ${colors.border}`, marginBottom: 8 }} />
          <textarea placeholder="key.pem" value={key} onChange={(e) => setKey(e.target.value)} style={{ width: '100%', minHeight: 80, fontFamily: 'monospace', fontSize: 12, padding: 10, borderRadius: 10, border: `1px solid ${colors.border}`, marginBottom: 8 }} />
          <Button onClick={go} disabled={busy || !cert || !key}>{busy ? '…' : 'Configurer le push iOS'}</Button>
          {msg && <p style={{ marginTop: 10, fontWeight: 600 }}>{msg}</p>}
        </div>
      )}
    </div>
  );
}

function Plans({ token, plans, onChange, eur }: { token: string; plans: any[]; onChange: () => void; eur: (n: number) => string }) {
  const [draft, setDraft] = useState<Record<string, any>>({});
  const [saving, setSaving] = useState<string>('');
  const [newPlan, setNewPlan] = useState({ key: '', name: '', monthlyPrice: '', includedMinutes: '' });

  function field(key: string, f: string, current: any) {
    return draft[key]?.[f] !== undefined ? draft[key][f] : current;
  }
  function setField(key: string, f: string, v: any) {
    setDraft((d) => ({ ...d, [key]: { ...d[key], [f]: v } }));
  }

  async function save(p: any) {
    setSaving(p.key);
    try {
      await api.adminUpsertPlan(token, {
        key: p.key,
        name: field(p.key, 'name', p.name),
        monthlyPrice: parseFloat(field(p.key, 'monthlyPrice', p.monthlyPrice)) || 0,
        includedMinutes: parseInt(field(p.key, 'includedMinutes', p.includedMinutes), 10) || 0,
        active: field(p.key, 'active', p.active),
      });
      onChange();
    } finally {
      setSaving('');
    }
  }

  async function addPlan() {
    if (!newPlan.key) return;
    setSaving('__new');
    try {
      await api.adminUpsertPlan(token, {
        key: newPlan.key.trim().toLowerCase(),
        name: newPlan.name || newPlan.key,
        monthlyPrice: parseFloat(newPlan.monthlyPrice) || 0,
        includedMinutes: parseInt(newPlan.includedMinutes, 10) || 0,
        active: true,
      });
      setNewPlan({ key: '', name: '', monthlyPrice: '', includedMinutes: '' });
      onChange();
    } finally {
      setSaving('');
    }
  }

  async function del(key: string) {
    if (!confirm(`Supprimer la formule "${key}" ?`)) return;
    await api.adminDeletePlan(token, key);
    onChange();
  }

  const inp = { padding: 8, borderRadius: 8, border: `1px solid ${colors.border}`, fontSize: 14 } as const;

  return (
    <div style={{ display: 'grid', gap: 12 }}>
      {plans.map((p) => (
        <Card key={p.key} style={{ padding: 16 }}>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <div>
              <div style={{ fontSize: 12, color: colors.muted }}>Clé</div>
              <div style={{ fontWeight: 800 }}>{p.key}</div>
            </div>
            <label style={{ flex: '1 1 140px' }}>
              <div style={{ fontSize: 12, color: colors.muted }}>Nom</div>
              <input style={{ ...inp, width: '100%' }} value={field(p.key, 'name', p.name)} onChange={(e) => setField(p.key, 'name', e.target.value)} />
            </label>
            <label style={{ width: 110 }}>
              <div style={{ fontSize: 12, color: colors.muted }}>Prix €/mois</div>
              <input style={{ ...inp, width: '100%' }} type="number" value={field(p.key, 'monthlyPrice', p.monthlyPrice)} onChange={(e) => setField(p.key, 'monthlyPrice', e.target.value)} />
            </label>
            <label style={{ width: 130 }}>
              <div style={{ fontSize: 12, color: colors.muted }}>Minutes incluses</div>
              <input style={{ ...inp, width: '100%' }} type="number" value={field(p.key, 'includedMinutes', p.includedMinutes)} onChange={(e) => setField(p.key, 'includedMinutes', e.target.value)} />
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 14 }}>
              <input type="checkbox" checked={Boolean(field(p.key, 'active', p.active))} onChange={(e) => setField(p.key, 'active', e.target.checked)} />
              Active
            </label>
            <Button onClick={() => save(p)} disabled={saving === p.key}>{saving === p.key ? '…' : 'Enregistrer'}</Button>
            <button onClick={() => del(p.key)} style={{ border: 'none', background: 'transparent', color: colors.red, cursor: 'pointer', fontSize: 13 }}>Supprimer</button>
          </div>
          {p.features?.length > 0 && (
            <div style={{ fontSize: 12.5, color: colors.muted, marginTop: 8 }}>{p.features.join(' · ')}</div>
          )}
        </Card>
      ))}

      <Card style={{ padding: 16 }}>
        <div style={{ fontWeight: 700, marginBottom: 8 }}>➕ Nouvelle formule</div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <input style={{ ...inp, width: 110 }} placeholder="clé (ex. solo)" value={newPlan.key} onChange={(e) => setNewPlan({ ...newPlan, key: e.target.value })} />
          <input style={{ ...inp, width: 140 }} placeholder="Nom" value={newPlan.name} onChange={(e) => setNewPlan({ ...newPlan, name: e.target.value })} />
          <input style={{ ...inp, width: 100 }} type="number" placeholder="€/mois" value={newPlan.monthlyPrice} onChange={(e) => setNewPlan({ ...newPlan, monthlyPrice: e.target.value })} />
          <input style={{ ...inp, width: 120 }} type="number" placeholder="Min. incluses" value={newPlan.includedMinutes} onChange={(e) => setNewPlan({ ...newPlan, includedMinutes: e.target.value })} />
          <Button onClick={addPlan} disabled={saving === '__new' || !newPlan.key}>Ajouter</Button>
        </div>
      </Card>
    </div>
  );
}

function Accounts({ accounts, open, setOpen, eur }: { accounts: any[]; open: Record<string, boolean>; setOpen: (f: any) => void; eur: (n: number) => string }) {
  return (
    <>
      <p style={{ fontWeight: 700, fontSize: 18 }}>{accounts.length} compte(s)</p>
      <div style={{ display: 'grid', gap: 12 }}>
        {accounts.map((a) => (
          <Card key={a.id} style={{ padding: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontWeight: 800, fontSize: 16 }}>{a.entreprise || '—'}</div>
                <div style={{ fontSize: 14, marginTop: 4 }}>📧 {a.emails.join(', ') || '—'}</div>
                <div style={{ fontSize: 13, color: colors.muted, marginTop: 4 }}>
                  ☎️ {a.numeros.length ? a.numeros.map((n: any) => formatFr(n.e164)).join(', ') : 'aucun numéro'}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontWeight: 700, color: colors.primary }}>{a.plan} · {eur(a.prixMensuel)}</div>
                <div style={{ fontSize: 12.5, fontWeight: 600, color: a.paiementAJour ? colors.green : colors.red }}>
                  {a.paiementAJour ? '✓ ' : '⚠️ '}{a.paiementLibelle}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginTop: 10, fontSize: 13 }}>
              <span>📞 <b>{a.nbAppels}</b> appels</span>
              <span>⏱️ <b>{a.minutes}</b> min</span>
              <span style={{ color: colors.amber }}>💸 coût ~<b>{eur(a.coutEstime)}</b></span>
              <span style={{ color: (a.marge ?? 0) >= 0 ? colors.green : colors.red }}>📈 marge <b>{eur(a.marge)}</b></span>
              <span>👤 {a.nbClients} clients</span>
            </div>

            <button onClick={() => setOpen((o: any) => ({ ...o, [a.id]: !o[a.id] }))} style={{ marginTop: 10, background: 'transparent', border: 'none', color: colors.primary, cursor: 'pointer', fontSize: 13, padding: 0 }}>
              {open[a.id] ? '▲ Masquer' : '▼ Détails (utilisateurs, clients)'}
            </button>

            {open[a.id] && (
              <div style={{ marginTop: 12, borderTop: `1px solid ${colors.border}`, paddingTop: 12 }}>
                <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 6 }}>Utilisateurs</div>
                {a.utilisateurs?.map((u: any, i: number) => (
                  <div key={i} style={{ fontSize: 13 }}>{u.nom || u.email} <span style={{ color: colors.muted }}>· {u.email}{u.telPerso ? ` · ${u.telPerso}` : ''} · {u.role}</span></div>
                ))}
                <div style={{ fontWeight: 700, fontSize: 13, margin: '12px 0 6px' }}>Clients ({a.nbClients})</div>
                {a.clients?.length ? a.clients.map((c: any, i: number) => (
                  <div key={i} style={{ fontSize: 13 }}>{c.nom} <span style={{ color: colors.muted }}>· {formatFr(c.tel)}{c.email ? ` · ${c.email}` : ''}</span></div>
                )) : <div style={{ fontSize: 13, color: colors.muted }}>Aucun client</div>}
              </div>
            )}
          </Card>
        ))}
      </div>
    </>
  );
}
