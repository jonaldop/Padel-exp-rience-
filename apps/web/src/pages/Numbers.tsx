import { useEffect, useState } from 'react';
import { api } from '../api';
import { Badge, Button, Card, Field, IconChip, Input, PageTitle, colors } from '../ui';

interface Settings {
  forwardToMobile: boolean;
  forwardNumber?: string;
  voicemailEnabled: boolean;
  recordingEnabled: boolean;
  greetingClosed?: string;
}
interface PhoneNumber {
  id: string;
  e164: string;
  type: string;
  status: string;
  origin: string;
  settings: Settings;
}

const TYPES = [
  { key: '', label: 'Tous' },
  { key: 'geographic', label: 'Géographique' },
  { key: 'mobile', label: 'Mobile' },
  { key: 'non_geo', label: 'National (09)' },
];

export function Numbers() {
  const [numbers, setNumbers] = useState<PhoneNumber[]>([]);
  const [available, setAvailable] = useState<any[]>([]);
  const [msg, setMsg] = useState<string | null>(null);
  const [type, setType] = useState('');
  const [contains, setContains] = useState('');
  const [searching, setSearching] = useState(false);
  const [buying, setBuying] = useState<string | null>(null);

  async function refresh() {
    setNumbers(await api.myNumbers());
  }
  async function search(t = type, c = contains) {
    setSearching(true);
    try {
      setAvailable(await api.availableNumbers(t, c));
    } catch {
      setAvailable([]);
    } finally {
      setSearching(false);
    }
  }
  useEffect(() => {
    refresh();
    search('', '');
  }, []);

  async function buy(e164: string, type: string) {
    setMsg(null);
    setBuying(e164);
    try {
      await api.buyNumber(e164, type);
      setMsg(`✅ Numéro ${e164} ajouté à votre compte`);
      refresh();
    } catch (e: any) {
      setMsg(`⚠️ ${e.message}`);
    } finally {
      setBuying(null);
    }
  }

  return (
    <div>
      <PageTitle subtitle="Gérez vos lignes professionnelles">Mes numéros</PageTitle>

      {msg && (
        <div style={{ background: '#eef0ff', color: colors.primary, padding: '10px 14px', borderRadius: 12, marginBottom: 14, fontSize: 14, fontWeight: 600 }}>
          {msg}
        </div>
      )}

      {numbers.length === 0 && (
        <Card style={{ marginBottom: 20 }}>
          <p style={{ color: colors.muted, margin: 0 }}>
            Vous n'avez pas encore de numéro. Choisissez-en un ci-dessous 👇
          </p>
        </Card>
      )}

      <div style={{ display: 'grid', gap: 14, marginBottom: 28 }}>
        {numbers.map((n) => (
          <NumberCard key={n.id} number={n} onSaved={refresh} />
        ))}
      </div>

      <h3 style={{ fontSize: 17, marginBottom: 6 }}>Obtenir un numéro</h3>
      <p style={{ color: colors.muted, fontSize: 14, marginTop: 0 }}>
        Choisissez le type et/ou tapez des chiffres (indicatif, numéro facile à retenir…).
      </p>

      {/* Filtres */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 10 }}>
        {TYPES.map((t) => (
          <button
            key={t.key}
            onClick={() => {
              setType(t.key);
              search(t.key, contains);
            }}
            style={{
              border: `1px solid ${type === t.key ? colors.primary : colors.border}`,
              background: type === t.key ? '#eef0ff' : '#fff',
              color: type === t.key ? colors.primary : colors.text,
              fontWeight: type === t.key ? 700 : 500,
              borderRadius: 999,
              padding: '7px 14px',
              fontSize: 13,
              cursor: 'pointer',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
        <Input
          value={contains}
          onChange={(e) => setContains(e.target.value)}
          placeholder="Chiffres (ex. 01, 06, 4242…)"
          onKeyDown={(e) => e.key === 'Enter' && search()}
          style={{ flex: 1 }}
        />
        <Button onClick={() => search()}>Rechercher</Button>
      </div>

      {searching ? (
        <p style={{ color: colors.muted }}>Recherche…</p>
      ) : available.length === 0 ? (
        <Card>
          <p style={{ color: colors.muted, margin: 0 }}>
            Aucun numéro trouvé pour ces critères. Essayez un autre type ou d'autres chiffres.
          </p>
        </Card>
      ) : (
        <div style={{ display: 'grid', gap: 10 }}>
          {available.map((a) => (
            <Card key={a.e164} style={{ padding: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <IconChip icon="☎️" />
                  <div>
                    <div style={{ fontWeight: 700 }}>{a.e164}</div>
                    <div style={{ color: colors.muted, fontSize: 12.5 }}>
                      {a.type} · {a.monthlyCost} €/mois
                    </div>
                  </div>
                </div>
                <Button variant="green" disabled={buying === a.e164} onClick={() => buy(a.e164, a.type)}>
                  {buying === a.e164 ? '…' : 'Choisir'}
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function NumberCard({ number, onSaved }: { number: PhoneNumber; onSaved: () => void }) {
  const [s, setS] = useState<Settings>(number.settings);
  const [saved, setSaved] = useState(false);
  const [open, setOpen] = useState(false);

  async function save() {
    await api.updateSettings(number.id, s);
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
    onSaved();
  }

  return (
    <Card>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <IconChip icon="📱" bg="#eef0ff" color={colors.primary} />
          <div>
            <div style={{ fontWeight: 800, fontSize: 16 }}>{number.e164}</div>
            <div style={{ marginTop: 3 }}>
              <Badge color={colors.green} bg={colors.greenSoft}>
                {number.status === 'active' ? 'Actif' : number.status}
              </Badge>{' '}
              <span style={{ color: colors.muted, fontSize: 12.5 }}>
                {number.origin === 'ported' ? 'porté' : 'nouveau'}
              </span>
            </div>
          </div>
        </div>
        <Button variant="soft" onClick={() => setOpen(!open)}>
          {open ? 'Fermer' : 'Régler'}
        </Button>
      </div>

      {open && (
        <div className="fade-up" style={{ marginTop: 16, borderTop: `1px solid ${colors.border}`, paddingTop: 16 }}>
          <Toggle
            label="Renvoi vers mon mobile"
            hint="Pour la fiabilité (chantier, zone sans data)"
            checked={s.forwardToMobile}
            onChange={(v) => setS({ ...s, forwardToMobile: v })}
          />
          {s.forwardToMobile && (
            <Field label="Numéro de renvoi">
              <Input value={s.forwardNumber || ''} onChange={(e) => setS({ ...s, forwardNumber: e.target.value })} placeholder="+33 6 ..." />
            </Field>
          )}
          <Toggle
            label="Répondeur / messagerie"
            checked={s.voicemailEnabled}
            onChange={(v) => setS({ ...s, voicemailEnabled: v })}
          />
          <Toggle
            label="Enregistrement des appels"
            hint="Consentement requis (RGPD)"
            checked={s.recordingEnabled}
            onChange={(v) => setS({ ...s, recordingEnabled: v })}
          />
          <Field label="Message d'accueil hors horaires">
            <Input value={s.greetingClosed || ''} onChange={(e) => setS({ ...s, greetingClosed: e.target.value })} />
          </Field>
          <Button onClick={save} full>
            {saved ? '✅ Enregistré' : 'Enregistrer les réglages'}
          </Button>
        </div>
      )}
    </Card>
  );
}

function Toggle({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string;
  hint?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div
      onClick={() => onChange(!checked)}
      style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', cursor: 'pointer' }}
    >
      <div>
        <div style={{ fontWeight: 600, fontSize: 15 }}>{label}</div>
        {hint && <div style={{ fontSize: 12.5, color: colors.muted }}>{hint}</div>}
      </div>
      <div
        style={{
          width: 46,
          height: 28,
          borderRadius: 999,
          background: checked ? colors.primary : '#d1d5db',
          position: 'relative',
          transition: 'background 0.15s',
          flexShrink: 0,
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: 3,
            left: checked ? 21 : 3,
            width: 22,
            height: 22,
            borderRadius: '50%',
            background: '#fff',
            transition: 'left 0.15s',
            boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
          }}
        />
      </div>
    </div>
  );
}
