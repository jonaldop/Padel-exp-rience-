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
                <UsageAlerts alerts={dashboard.usageAlerts || []} />
                <Dashboard dashboard={dashboard} eur={eur} />
                <CostsPanel token={token} eur={eur} />
                <StripeSetup token={token} />
                <AiSetup token={token} />
                <DebugCalls token={token} />
                <PushSetup token={token} />
              </>
            )}
            {tab === 'plans' && <Plans token={token} plans={plans} onChange={() => loadAll()} eur={eur} />}
            {tab === 'accounts' && (
              <Accounts accounts={accounts} open={open} setOpen={setOpen} eur={eur} token={token} plans={plans} onChange={() => loadAll()} />
            )}
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

/** Pare-feu usage : comptes >80 % du plafond mensuel ou bloqués. */
function UsageAlerts({ alerts }: { alerts: any[] }) {
  if (!alerts.length) return null;
  return (
    <Card style={{ padding: 16, marginBottom: 16, border: '1.5px solid #f5c6c3', background: '#fff7f6' }}>
      <p style={{ fontWeight: 800, margin: '0 0 10px' }}>🚨 Alertes consommation ({alerts.length})</p>
      {alerts.map((a) => (
        <div key={a.accountId} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap', padding: '8px 0', borderTop: `1px solid ${colors.border}` }}>
          <div>
            <b>{a.companyName}</b>{' '}
            <span style={{ color: colors.muted, fontSize: 13 }}>{a.email} · {a.plan}</span>
          </div>
          <div style={{ fontSize: 13.5, fontWeight: 700, color: a.blocked ? colors.red : colors.amber }}>
            {a.usedMinutes} / {a.capMinutes} min
            {a.blocked ? ' — ⛔ appels sortants BLOQUÉS' : ' — approche du plafond'}
          </div>
        </div>
      ))}
      <p style={{ color: colors.muted, fontSize: 12.5, margin: '10px 0 0' }}>
        Seules les minutes SORTANTES décomptent le forfait (appels reçus illimités). Plafond dur :
        2× les minutes incluses (fair-use 3 000 min sortantes sur l'illimité). Au-delà, les appels
        sortants sont coupés automatiquement. Passez le compte sur une formule supérieure pour débloquer.
      </p>
    </Card>
  );
}

/** Coûts & marges réels : barème modifiable + détail par compte + totaux. */
function CostsPanel({ token, eur }: { token: string; eur: (n: number) => string }) {
  const [data, setData] = useState<any>(null);
  const [edit, setEdit] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [openDetail, setOpenDetail] = useState(false);

  const load = () => api.adminCosts(token).then(setData).catch(() => {});
  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  if (!data) return null;
  const r = data.rates;
  const t = data.totals;

  const RATE_FIELDS: [string, string, number][] = [
    ['costInboundPerMin', 'Min. entrante (€)', r.inboundPerMin],
    ['costOutFixedPerMin', 'Min. sortante fixe (€)', r.outFixedPerMin],
    ['costOutMobilePerMin', 'Min. sortante mobile (€)', r.outMobilePerMin],
    ['costNumberPerMonth', 'Numéro (€/mois)', r.numberPerMonth],
    ['costVoicemailEach', 'Vocal+IA (€/message)', r.voicemailEach],
    ['costStripePct', 'Stripe (%)', r.stripePct],
    ['costStripeFixed', 'Stripe fixe (€)', r.stripeFixed],
    ['costFixedMonthly', 'Infra fixe (€/mois)', r.fixedMonthly],
  ];

  async function saveRates() {
    setSaving(true);
    try {
      await api.adminSetCosts(token, edit);
      setEdit({});
      await load();
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card style={{ padding: 16, marginTop: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
        <p style={{ fontWeight: 700, margin: 0 }}>💰 Coûts & marges réels — {data.period}</p>
        <span style={{ fontSize: 13, fontWeight: 800, color: t.net >= 0 ? colors.green : colors.red }}>
          Net : {eur(t.net)}{t.netPct !== null ? ` (${t.netPct} % du CA)` : ''}
        </span>
      </div>

      {/* Totaux */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', margin: '12px 0' }}>
        {[
          ['Revenu encaissé (abonnés)', eur(t.revenue), colors.primary],
          ['Coûts variables (télécom+Stripe)', eur(t.variableCosts), colors.amber],
          ['Coûts fixes (infra)', eur(t.fixedMonthly), colors.muted],
          ['Résultat net du mois', eur(t.net), t.net >= 0 ? colors.green : colors.red],
        ].map(([label, value, color]) => (
          <div key={label as string} style={{ flex: '1 1 150px', background: '#fbfbfd', border: `1px solid ${colors.border}`, borderRadius: 12, padding: '10px 12px' }}>
            <div style={{ fontSize: 11.5, color: colors.muted }}>{label}</div>
            <div style={{ fontWeight: 800, fontSize: 17, color: color as string }}>{value}</div>
          </div>
        ))}
      </div>

      {/* Détail par compte */}
      <button onClick={() => setOpenDetail(!openDetail)} style={{ background: 'transparent', border: 'none', color: colors.primary, fontWeight: 700, cursor: 'pointer', padding: 0, fontSize: 13.5 }}>
        {openDetail ? '▾ Masquer le détail par compte' : `▸ Détail par compte (${data.accounts.length})`}
      </button>
      {openDetail && (
        <div style={{ overflowX: 'auto', marginTop: 8 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
            <thead>
              <tr style={{ color: colors.muted, textAlign: 'left' }}>
                {['Compte', 'Statut', 'Revenu', 'Min ↙', 'Min ↗fixe', 'Min ↗mobile', 'N°', 'Vocaux', 'Coût total', 'Marge'].map((h) => (
                  <th key={h} style={{ padding: '6px 8px', borderBottom: `1px solid ${colors.border}` }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.accounts.map((a: any) => (
                <tr key={a.accountId}>
                  <td style={{ padding: '6px 8px', fontWeight: 700 }}>{a.entreprise}</td>
                  <td style={{ padding: '6px 8px', color: colors.muted }}>{a.statut === 'active' ? 'Abonné' : a.statut === 'trial' ? 'Non payé' : a.statut}</td>
                  <td style={{ padding: '6px 8px' }}>{eur(a.revenue)}</td>
                  <td style={{ padding: '6px 8px' }}>{a.minutes.in}</td>
                  <td style={{ padding: '6px 8px' }}>{a.minutes.outFixed}</td>
                  <td style={{ padding: '6px 8px' }}>{a.minutes.outMobile}</td>
                  <td style={{ padding: '6px 8px' }}>{a.numbers}</td>
                  <td style={{ padding: '6px 8px' }}>{a.voicemails}</td>
                  <td style={{ padding: '6px 8px' }}>{eur(a.total)}</td>
                  <td style={{ padding: '6px 8px', fontWeight: 800, color: a.margin >= 0 ? colors.green : colors.red }}>
                    {eur(a.margin)}{a.marginPct !== null ? ` (${a.marginPct} %)` : ''}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Barème modifiable */}
      <p style={{ fontWeight: 700, fontSize: 13.5, margin: '16px 0 6px' }}>Barème unitaire (tarifs Telnyx/Stripe — modifiable)</p>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {RATE_FIELDS.map(([key, label, val]) => (
          <label key={key} style={{ fontSize: 11.5, color: colors.muted }}>
            {label}
            <Input
              type="number"
              step="0.0001"
              value={edit[key] ?? String(val)}
              onChange={(e) => setEdit({ ...edit, [key]: e.target.value })}
              style={{ display: 'block', width: 130, marginTop: 3 }}
            />
          </label>
        ))}
      </div>
      <Button onClick={saveRates} disabled={saving || !Object.keys(edit).length} style={{ marginTop: 10 }}>
        {saving ? '…' : 'Enregistrer le barème'}
      </Button>
      <p style={{ color: colors.muted, fontSize: 12, marginTop: 10, marginBottom: 0 }}>
        Revenu compté uniquement sur les comptes <b>abonnés</b> (un compte en essai/non payé rapporte 0).
        Sortant mobile détecté sur les destinations +33 6/7. Le « net » déduit aussi les coûts fixes d'infrastructure.
      </p>
    </Card>
  );
}

function StripeSetup({ token }: { token: string }) {
  const [info, setInfo] = useState<any>(null);
  const [key, setKey] = useState('');
  const [acctId, setAcctId] = useState('');
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const load = () => api.adminGetSettings(token).then((r) => setInfo(r.stripe)).catch(() => {});
  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  async function save() {
    setSaving(true);
    setMsg(null);
    try {
      const r = await api.adminSetStripeKey(token, key.trim(), acctId.trim() || undefined);
      if (r.error) setMsg(`⚠️ ${r.error}`);
      else {
        setMsg(r.configured
          ? `✅ Clé vérifiée auprès de Stripe et enregistrée${(r as any).accountId ? ` (compte détecté : ${(r as any).accountId})` : ''}. Le bouton « Payer » est actif dans l’app.`
          : 'Clé retirée : paiement en ligne désactivé.');
        setKey('');
        load();
      }
    } catch (e: any) {
      setMsg(`⚠️ ${e.message}`);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card style={{ padding: 16, marginTop: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
        <p style={{ fontWeight: 700, margin: 0 }}>💳 Paiement en ligne (Stripe)</p>
        {info && (
          <span style={{ fontSize: 12.5, fontWeight: 700, color: info.configured ? colors.green : colors.muted }}>
            {info.configured ? `✅ Configuré (${info.keyMasked}${info.source === 'env' ? ' · via variable env' : ''})` : '○ Non configuré'}
          </span>
        )}
      </div>
      <p style={{ color: colors.muted, fontSize: 13, margin: '8px 0 10px' }}>
        Collez votre <b>clé secrète Stripe</b> (sk_live_…, sk_test_… ou sk_org_live_… — Dashboard Stripe → Développeurs → Clés API).
        Elle est vérifiée auprès de Stripe avant d'être enregistrée. Une fois posée, chaque facture « À payer »
        affiche un bouton <b>Payer</b> dans l'app, et le paiement marque la facture payée automatiquement.
        <br />Clé d'<b>organisation</b> (sk_org_…) : indiquez aussi l'ID du compte à encaisser
        (acct_… — visible dans Stripe → compte → Paramètres).
      </p>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <Input
          type="password"
          placeholder="sk_live_… ou sk_org_live_…"
          value={key}
          onChange={(e) => setKey(e.target.value)}
          style={{ flex: 1, minWidth: 260 }}
        />
        <Input
          placeholder="acct_… (si clé sk_org_)"
          value={acctId}
          onChange={(e) => setAcctId(e.target.value)}
          style={{ width: 210 }}
        />
        <Button onClick={save} disabled={saving}>{saving ? 'Vérification…' : 'Enregistrer'}</Button>
      </div>
      {info?.configured && info?.source !== 'env' && (
        <button
          onClick={() => { setKey(''); api.adminSetStripeKey(token, '').then(() => { setMsg('Clé retirée.'); load(); }); }}
          style={{ marginTop: 8, background: 'transparent', border: 'none', color: colors.red, cursor: 'pointer', fontSize: 12.5, padding: 0 }}
        >
          Retirer la clé (désactiver le paiement en ligne)
        </button>
      )}
      {msg && <p style={{ fontSize: 13, marginTop: 10, marginBottom: 0 }}>{msg}</p>}
    </Card>
  );
}

function AiSetup({ token }: { token: string }) {
  const [info, setInfo] = useState<any>(null);
  const [key, setKey] = useState('');
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const load = () => api.adminGetSettings(token).then((r) => setInfo(r.ai)).catch(() => {});
  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  async function save() {
    setSaving(true);
    setMsg(null);
    try {
      const r = await api.adminSetAiKey(token, key.trim());
      if (r.error) setMsg(`⚠️ ${r.error}`);
      else {
        setMsg(r.configured
          ? `✅ Clé ${r.provider} enregistrée : les messages vocaux sont maintenant analysés par l'IA (résumé, urgence, type de demande).`
          : 'Clé retirée : le secrétariat repasse en analyse par mots-clés.');
        setKey('');
        load();
      }
    } catch (e: any) {
      setMsg(`⚠️ ${e.message}`);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card style={{ padding: 16, marginTop: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
        <p style={{ fontWeight: 700, margin: 0 }}>🤖 Secrétariat IA</p>
        {info && (
          <span style={{ fontSize: 12.5, fontWeight: 700, color: info.configured ? colors.green : colors.muted }}>
            {info.configured ? `✅ IA active — ${info.provider} (${info.keyMasked}${info.source === 'env' ? ' · via variable env' : ''})` : '○ Mode mots-clés (sans clé)'}
          </span>
        )}
      </div>
      <p style={{ color: colors.muted, fontSize: 13, margin: '8px 0 10px' }}>
        Le secrétariat répond, enregistre et <b>transcrit</b> chaque message vocal, puis le <b>qualifie</b>
        (devis / urgence / rendez-vous / rappel) et notifie le client avec un résumé. Sans clé, l'analyse
        utilise des mots-clés. Collez une clé <b>Anthropic</b> (sk-ant-…) ou <b>OpenAI</b> (sk-…) pour des
        résumés de qualité maximale.
      </p>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <Input
          type="password"
          placeholder="sk-ant-… ou sk-…"
          value={key}
          onChange={(e) => setKey(e.target.value)}
          style={{ flex: 1, minWidth: 260 }}
        />
        <Button onClick={save} disabled={saving}>{saving ? 'Enregistrement…' : 'Enregistrer'}</Button>
      </div>
      {info?.configured && info?.source !== 'env' && (
        <button
          onClick={() => { setKey(''); api.adminSetAiKey(token, '').then(() => { setMsg('Clé retirée.'); load(); }); }}
          style={{ marginTop: 8, background: 'transparent', border: 'none', color: colors.red, cursor: 'pointer', fontSize: 12.5, padding: 0 }}
        >
          Retirer la clé (repasser en mode mots-clés)
        </button>
      )}
      {msg && <p style={{ fontSize: 13, marginTop: 10, marginBottom: 0 }}>{msg}</p>}
    </Card>
  );
}

function DebugCalls({ token }: { token: string }) {
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [fixing, setFixing] = useState(false);
  const [fixResult, setFixResult] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const res: any = await api.adminDebugCalls(token);
      setEvents(res.events || []);
    } catch { /* ignore */ } finally {
      setLoading(false);
    }
  }
  async function fixInbound() {
    setFixing(true);
    setFixResult(null);
    try {
      const res: any = await api.adminFixInbound(token);
      setFixResult(JSON.stringify(res, null, 2));
    } catch (e: any) {
      setFixResult('Erreur: ' + e.message);
    } finally {
      setFixing(false);
    }
  }
  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  return (
    <div style={{ ...glass, borderRadius: 16, padding: 16, marginTop: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
        <div style={{ fontWeight: 800 }}>🩺 Diagnostic appels entrants</div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Button onClick={fixInbound} disabled={fixing} style={{ padding: '6px 12px' }}>{fixing ? '…' : '🔧 Réparer réception'}</Button>
          <Button onClick={load} disabled={loading} style={{ padding: '6px 12px' }}>{loading ? '…' : 'Rafraîchir'}</Button>
        </div>
      </div>
      {fixResult && (
        <pre style={{ fontFamily: 'monospace', fontSize: 11, background: 'rgba(0,0,0,0.05)', borderRadius: 8, padding: 10, overflow: 'auto', marginTop: 10 }}>{fixResult}</pre>
      )}
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

const STATUS_FILTERS: [string, string][] = [
  ['', 'Tous'], ['active', 'Actifs'], ['trial', 'Essai'],
  ['past_due', 'Impayés'], ['suspended', 'Suspendus'], ['canceled', 'Résiliés'],
];
const STATUS_LABEL: Record<string, string> = {
  active: 'Actif', trial: 'Essai', past_due: 'Impayé', suspended: 'Suspendu', canceled: 'Résilié',
};

function Accounts({ accounts, open, setOpen, eur, token, plans, onChange }: {
  accounts: any[]; open: Record<string, boolean>; setOpen: (f: any) => void; eur: (n: number) => string;
  token: string; plans: any[]; onChange: () => void;
}) {
  const [q, setQ] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [sort, setSort] = useState<'recent' | 'mrr' | 'minutes'>('recent');
  const [busy, setBusy] = useState('');
  const [details, setDetails] = useState<Record<string, any>>({});
  const [noteDraft, setNoteDraft] = useState<Record<string, string>>({});

  const needle = q.trim().toLowerCase();
  const filtered = accounts
    .filter((a) => !statusFilter || a.statut === statusFilter)
    .filter((a) => {
      if (!needle) return true;
      const hay = [a.entreprise, ...(a.emails || []), ...(a.numeros || []).map((n: any) => n.e164)]
        .join(' ').toLowerCase();
      return hay.includes(needle);
    })
    .sort((x, y) => {
      if (sort === 'mrr') return (y.prixMensuel || 0) - (x.prixMensuel || 0);
      if (sort === 'minutes') return (y.minutes || 0) - (x.minutes || 0);
      return (y.créé || '').localeCompare(x.créé || '');
    });

  async function toggleDetail(a: any) {
    const next = !open[a.id];
    setOpen((o: any) => ({ ...o, [a.id]: next }));
    if (next && !details[a.id]) {
      try {
        const d = await api.adminAccountDetail(token, a.id);
        setDetails((m) => ({ ...m, [a.id]: d }));
      } catch { /* silencieux */ }
    }
  }

  async function refreshDetail(id: string) {
    try {
      const d = await api.adminAccountDetail(token, id);
      setDetails((m) => ({ ...m, [id]: d }));
    } catch { /* noop */ }
  }

  async function setStatus(a: any, status: string) {
    const labels: any = { suspended: 'SUSPENDRE (connexion bloquée)', active: 'réactiver', canceled: 'RÉSILIER' };
    if (!window.confirm(`${labels[status] || status} le compte « ${a.entreprise} » ?`)) return;
    setBusy(a.id);
    try { await api.adminAccountStatus(token, a.id, status); onChange(); } finally { setBusy(''); }
  }

  async function setPlan(a: any, plan: string) {
    if (!plan || plan === a.plan) return;
    setBusy(a.id);
    try { await api.adminAccountPlan(token, a.id, plan); onChange(); } finally { setBusy(''); }
  }

  async function resetPassword(a: any, email: string) {
    if (!window.confirm(`Générer un nouveau mot de passe pour ${email} ?`)) return;
    setBusy(a.id);
    try {
      const r = await api.adminResetPassword(token, a.id, email);
      if (r.error) alert(`Erreur : ${r.error}`);
      else alert(`Nouveau mot de passe pour ${email} :\n\n${r.newPassword}\n\nCommuniquez-le au client (affiché une seule fois).`);
    } finally { setBusy(''); }
  }

  async function addNote(a: any) {
    const text = (noteDraft[a.id] || '').trim();
    if (!text) return;
    await api.adminAddNote(token, a.id, text);
    setNoteDraft((m) => ({ ...m, [a.id]: '' }));
    refreshDetail(a.id);
  }

  async function extendTrial(a: any) {
    const raw = window.prompt(`Prolonger l'essai de « ${a.entreprise} » de combien de jours ?\n(La prolongation part de la fin actuelle si l'essai court encore.)`, '15');
    if (!raw) return;
    const days = parseInt(raw, 10);
    if (isNaN(days) || days <= 0) { alert('Nombre de jours invalide'); return; }
    setBusy(a.id);
    try { const r = await api.adminSetTrial(token, a.id, { days }); if (r.error) alert(r.error); onChange(); } finally { setBusy(''); }
  }

  async function unlimitedTrial(a: any) {
    if (!window.confirm(`Passer « ${a.entreprise} » en essai ILLIMITÉ (jamais facturé) ?`)) return;
    setBusy(a.id);
    try { const r = await api.adminSetTrial(token, a.id, { unlimited: true }); if (r.error) alert(r.error); onChange(); } finally { setBusy(''); }
  }

  async function setDiscount(a: any) {
    const raw = window.prompt(`Remise permanente (%) sur la formule de « ${a.entreprise} »\n(0 pour retirer la remise)`, String(a.remisePct || 0));
    if (raw === null) return;
    const pct = parseInt(raw, 10);
    if (isNaN(pct) || pct < 0 || pct > 100) { alert('Remise invalide (0-100)'); return; }
    setBusy(a.id);
    try { const r = await api.adminSetDiscount(token, a.id, pct); if (r.error) alert(r.error); onChange(); refreshDetail(a.id); } finally { setBusy(''); }
  }

  async function markInvoice(a: any, invoiceId: string, status: 'paid' | 'due' | 'void') {
    await api.adminSetInvoiceStatus(token, invoiceId, status);
    refreshDetail(a.id);
  }

  async function deleteNote(a: any, noteId: string) {
    await api.adminDeleteNote(token, noteId);
    refreshDetail(a.id);
  }

  return (
    <>
      {/* Recherche + filtres + tri */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginBottom: 12 }}>
        <Input
          placeholder="🔍 Rechercher (entreprise, email, numéro)…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          style={{ flex: 1, minWidth: 220 }}
        />
        <select value={sort} onChange={(e) => setSort(e.target.value as any)} style={selStyle}>
          <option value="recent">Plus récents</option>
          <option value="mrr">MRR décroissant</option>
          <option value="minutes">Minutes décroissantes</option>
        </select>
      </div>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14 }}>
        {STATUS_FILTERS.map(([key, label]) => (
          <button key={key} onClick={() => setStatusFilter(key)} style={{
            border: 'none', cursor: 'pointer', padding: '5px 12px', borderRadius: 20, fontSize: 12.5, fontWeight: 700,
            background: statusFilter === key ? colors.primary : 'rgba(255,255,255,0.7)',
            color: statusFilter === key ? '#fff' : colors.text,
          }}>{label}</button>
        ))}
        <span style={{ fontSize: 12.5, color: colors.muted, alignSelf: 'center', marginLeft: 'auto' }}>
          {filtered.length} / {accounts.length} compte(s)
        </span>
      </div>

      <div style={{ display: 'grid', gap: 12 }}>
        {filtered.map((a) => {
          const det = details[a.id];
          return (
            <Card key={a.id} style={{ padding: 16, opacity: busy === a.id ? 0.6 : 1 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 800, fontSize: 16 }}>
                    {a.entreprise || '—'}{' '}
                    <span style={{
                      fontSize: 11.5, fontWeight: 700, padding: '2px 8px', borderRadius: 10, verticalAlign: 'middle',
                      background: a.statut === 'suspended' || a.statut === 'canceled' ? colors.redSoft : a.paiementAJour ? '#E7F7EE' : colors.redSoft,
                      color: a.statut === 'suspended' || a.statut === 'canceled' ? colors.red : a.paiementAJour ? colors.green : colors.red,
                    }}>{STATUS_LABEL[a.statut] || a.statut}</span>
                  </div>
                  <div style={{ fontSize: 14, marginTop: 4 }}>📧 {a.emails.join(', ') || '—'}</div>
                  <div style={{ fontSize: 13, color: colors.muted, marginTop: 4 }}>
                    ☎️ {a.numeros.length ? a.numeros.map((n: any) => formatFr(n.e164)).join(', ') : 'aucun numéro'}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontWeight: 700, color: colors.primary }}>
                    {a.plan} · {(a.remisePct || 0) > 0 ? (
                      <>
                        <span style={{ textDecoration: 'line-through', color: colors.muted, fontWeight: 500 }}>{eur(a.prixMensuel)}</span>{' '}
                        {eur(a.prixEffectif)} <span style={{ fontSize: 11.5, color: colors.amber }}>(-{a.remisePct}%)</span>
                      </>
                    ) : eur(a.prixMensuel)}
                  </div>
                  <div style={{ fontSize: 12.5, fontWeight: 600, color: a.paiementAJour ? colors.green : colors.red }}>
                    {a.paiementAJour ? '✓ ' : '⚠️ '}{a.paiementLibelle}
                  </div>
                  {a.essai?.isTrial && (
                    <div style={{ fontSize: 12, fontWeight: 700, marginTop: 2, color: a.essai.expired ? colors.red : colors.primary }}>
                      🎁 {a.essai.unlimited ? 'Essai illimité'
                        : a.essai.expired ? 'Essai expiré'
                        : `Essai : ${a.essai.daysLeft} j restants${a.essai.endsAt ? ` (fin ${new Date(a.essai.endsAt).toLocaleDateString('fr-FR')})` : ''}`}
                    </div>
                  )}
                </div>
              </div>

              <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginTop: 10, fontSize: 13 }}>
                <span>📞 <b>{a.nbAppels}</b> appels</span>
                <span>⏱️ <b>{a.minutes}</b> min</span>
                <span style={{ color: colors.amber }}>💸 coût ~<b>{eur(a.coutEstime)}</b></span>
                <span style={{ color: (a.marge ?? 0) >= 0 ? colors.green : colors.red }}>📈 marge <b>{eur(a.marge)}</b></span>
                <span>👤 {a.nbClients} clients</span>
              </div>

              {/* Barre d'actions */}
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 12, alignItems: 'center' }}>
                <select value={a.plan} onChange={(e) => setPlan(a, e.target.value)} style={selStyle} disabled={busy === a.id}>
                  {plans.map((p: any) => <option key={p.key} value={p.key}>Formule : {p.name}</option>)}
                  {!plans.some((p: any) => p.key === a.plan) && <option value={a.plan}>Formule : {a.plan}</option>}
                </select>
                {a.statut !== 'suspended' ? (
                  <Button onClick={() => setStatus(a, 'suspended')} disabled={busy === a.id}
                    style={{ background: colors.redSoft, color: colors.red, padding: '6px 12px', fontSize: 13 }}>
                    ⛔ Suspendre
                  </Button>
                ) : (
                  <Button onClick={() => setStatus(a, 'active')} disabled={busy === a.id}
                    style={{ background: '#E7F7EE', color: colors.green, padding: '6px 12px', fontSize: 13 }}>
                    ✅ Réactiver
                  </Button>
                )}
                <Button onClick={() => extendTrial(a)} disabled={busy === a.id}
                  style={{ background: 'rgba(108,92,231,0.12)', color: colors.primary, padding: '6px 12px', fontSize: 13 }}>
                  🎁 Prolonger essai
                </Button>
                <Button onClick={() => unlimitedTrial(a)} disabled={busy === a.id}
                  style={{ background: 'rgba(108,92,231,0.12)', color: colors.primary, padding: '6px 12px', fontSize: 13 }}>
                  ∞ Illimité
                </Button>
                <Button onClick={() => setDiscount(a)} disabled={busy === a.id}
                  style={{ background: '#FFF6E5', color: colors.amber, padding: '6px 12px', fontSize: 13 }}>
                  % Remise
                </Button>
                <button onClick={() => toggleDetail(a)} style={{ marginLeft: 'auto', background: 'transparent', border: 'none', color: colors.primary, cursor: 'pointer', fontSize: 13, padding: 0 }}>
                  {open[a.id] ? '▲ Masquer la fiche' : '▼ Fiche client'}
                </button>
              </div>

              {open[a.id] && (
                <div style={{ marginTop: 12, borderTop: `1px solid ${colors.border}`, paddingTop: 12 }}>
                  {/* Utilisateurs + reset mot de passe */}
                  <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 6 }}>Utilisateurs</div>
                  {a.utilisateurs?.map((u: any, i: number) => (
                    <div key={i} style={{ fontSize: 13, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <span>{u.nom || u.email} <span style={{ color: colors.muted }}>· {u.email}{u.telPerso ? ` · ${u.telPerso}` : ''} · {u.role}</span></span>
                      <button onClick={() => resetPassword(a, u.email)} style={{ background: 'transparent', border: `1px solid ${colors.border}`, borderRadius: 8, cursor: 'pointer', fontSize: 11.5, padding: '2px 8px', color: colors.primary }}>
                        🔑 Réinitialiser le mot de passe
                      </button>
                    </div>
                  ))}

                  {/* Conso mensuelle */}
                  <div style={{ fontWeight: 700, fontSize: 13, margin: '14px 0 6px' }}>Consommation (12 derniers mois)</div>
                  {det?.usage?.history?.length ? (
                    <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', fontSize: 12.5 }}>
                      {det.usage.history.map((h: any) => (
                        <span key={h.month}><b>{h.month}</b> : {h.minutes} min · {h.calls} appels</span>
                      ))}
                    </div>
                  ) : <div style={{ fontSize: 13, color: colors.muted }}>{det ? 'Aucune consommation.' : 'Chargement…'}</div>}

                  {/* Derniers appels */}
                  <div style={{ fontWeight: 700, fontSize: 13, margin: '14px 0 6px' }}>Derniers appels</div>
                  {det?.calls?.length ? det.calls.slice(0, 8).map((c: any) => (
                    <div key={c.id} style={{ fontSize: 12.5, color: colors.text }}>
                      {c.direction === 'inbound' ? '↙' : '↗'} {formatFr(c.direction === 'inbound' ? c.fromE164 : c.toE164)}
                      <span style={{ color: colors.muted }}> · {new Date(c.startedAt).toLocaleString('fr-FR')} · {c.status}{c.durationS ? ` · ${Math.round(c.durationS / 60)} min` : ''}</span>
                    </div>
                  )) : <div style={{ fontSize: 13, color: colors.muted }}>{det ? 'Aucun appel.' : ''}</div>}

                  {/* Factures */}
                  <div style={{ fontWeight: 700, fontSize: 13, margin: '14px 0 6px' }}>🧾 Factures</div>
                  {det?.invoices?.length ? det.invoices.map((inv: any) => (
                    <div key={inv.id} style={{ fontSize: 12.5, display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                      <span style={{ minWidth: 140 }}><b>{inv.period}</b> · {inv.number}</span>
                      <span>{eur(inv.total)}{inv.discountPct ? ` (-${inv.discountPct}%)` : ''}</span>
                      <span style={{ fontWeight: 700, color: inv.status === 'paid' ? colors.green : inv.status === 'void' ? colors.muted : colors.amber }}>
                        {inv.status === 'paid' ? '✓ Payée' : inv.status === 'void' ? 'Annulée' : 'À payer'}
                      </span>
                      {inv.status !== 'paid' && (
                        <button onClick={() => markInvoice(a, inv.id, 'paid')} style={miniBtn}>Marquer payée</button>
                      )}
                      {inv.status === 'due' && (
                        <button onClick={() => markInvoice(a, inv.id, 'void')} style={{ ...miniBtn, color: colors.red }}>Annuler</button>
                      )}
                      {inv.status === 'paid' && (
                        <button onClick={() => markInvoice(a, inv.id, 'due')} style={miniBtn}>Repasser à payer</button>
                      )}
                    </div>
                  )) : <div style={{ fontSize: 13, color: colors.muted }}>{det ? "Aucune facture (essai en cours ou formule gratuite)." : 'Chargement…'}</div>}

                  {/* Notes internes */}
                  <div style={{ fontWeight: 700, fontSize: 13, margin: '14px 0 6px' }}>📝 Notes internes (invisibles pour le client)</div>
                  {det?.notes?.map((n: any) => (
                    <div key={n.id} style={{ fontSize: 13, background: 'rgba(255,255,255,0.6)', borderRadius: 8, padding: '6px 10px', marginBottom: 6, display: 'flex', gap: 8 }}>
                      <span style={{ flex: 1 }}>{n.text} <span style={{ color: colors.muted, fontSize: 11.5 }}>· {new Date(n.createdAt).toLocaleString('fr-FR')}</span></span>
                      <button onClick={() => deleteNote(a, n.id)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: colors.red, fontSize: 12 }}>✕</button>
                    </div>
                  ))}
                  <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                    <Input
                      placeholder="Ajouter une note (ex. « rappelé le 12/03, souci de réception »)…"
                      value={noteDraft[a.id] || ''}
                      onChange={(e) => setNoteDraft((m) => ({ ...m, [a.id]: e.target.value }))}
                      onKeyDown={(e) => e.key === 'Enter' && addNote(a)}
                      style={{ flex: 1 }}
                    />
                    <Button onClick={() => addNote(a)} style={{ padding: '6px 14px', fontSize: 13 }}>Ajouter</Button>
                  </div>

                  {/* Clients du compte */}
                  <div style={{ fontWeight: 700, fontSize: 13, margin: '14px 0 6px' }}>Clients ({a.nbClients})</div>
                  {a.clients?.length ? a.clients.map((c: any, i: number) => (
                    <div key={i} style={{ fontSize: 13 }}>{c.nom} <span style={{ color: colors.muted }}>· {formatFr(c.tel)}{c.email ? ` · ${c.email}` : ''}</span></div>
                  )) : <div style={{ fontSize: 13, color: colors.muted }}>Aucun client</div>}
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </>
  );
}

const selStyle: React.CSSProperties = {
  padding: '8px 10px', borderRadius: 10, border: `1px solid rgba(0,0,0,0.1)`,
  background: 'rgba(255,255,255,0.8)', fontSize: 13, fontWeight: 600, cursor: 'pointer',
};

const miniBtn: React.CSSProperties = {
  background: 'transparent', border: '1px solid rgba(0,0,0,0.12)', borderRadius: 8,
  cursor: 'pointer', fontSize: 11.5, padding: '2px 8px', color: '#6C5CE7',
};
