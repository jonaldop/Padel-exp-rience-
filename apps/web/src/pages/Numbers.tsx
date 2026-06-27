import { useEffect, useState } from 'react';
import { api } from '../api';
import { Badge, Button, Card, Field, IconChip, Input, PageTitle, colors } from '../ui';
import { formatFr } from '../format';

interface Settings {
  forwardToMobile: boolean;
  forwardNumber?: string;
  voicemailEnabled: boolean;
  recordingEnabled: boolean;
  greetingClosed?: string;
  greetingVoice?: string;
  weeklySchedule?: string;
}

const VOICES = [
  { id: 'Polly.Lea-Neural', label: 'Léa — féminine, naturelle ✨' },
  { id: 'Polly.Remi-Neural', label: 'Rémi — masculine, naturelle ✨' },
  { id: 'Polly.Celine', label: 'Céline — féminine' },
  { id: 'Polly.Mathieu', label: 'Mathieu — masculine' },
  { id: 'female', label: 'Standard féminine' },
];

/** Aperçu via la synthèse vocale du navigateur (voix de l'appareil). */
function previewVoice(text: string) {
  try {
    const u = new SpeechSynthesisUtterance(text || 'Bonjour, vous êtes bien chez nous.');
    u.lang = 'fr-FR';
    const fr = window.speechSynthesis.getVoices().find((v) => v.lang.startsWith('fr'));
    if (fr) u.voice = fr;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(u);
  } catch {
    /* non supporté */
  }
}

const DAYS: [string, string][] = [
  ['mon', 'Lundi'],
  ['tue', 'Mardi'],
  ['wed', 'Mercredi'],
  ['thu', 'Jeudi'],
  ['fri', 'Vendredi'],
  ['sat', 'Samedi'],
  ['sun', 'Dimanche'],
];

type DayState = { open: boolean; start: string; end: string };

function parseSchedule(json?: string): Record<string, DayState> {
  let obj: Record<string, string[]> = {};
  try {
    obj = JSON.parse(json || '{}');
  } catch {
    obj = {};
  }
  const res: Record<string, DayState> = {};
  for (const [key] of DAYS) {
    const slots = obj[key] || [];
    if (slots.length) {
      const start = slots[0].split('-')[0];
      const end = slots[slots.length - 1].split('-')[1];
      res[key] = { open: true, start, end };
    } else {
      res[key] = { open: false, start: '09:00', end: '18:00' };
    }
  }
  return res;
}

function buildSchedule(state: Record<string, DayState>): string {
  const obj: Record<string, string[]> = {};
  for (const [key] of DAYS) {
    const d = state[key];
    obj[key] = d.open ? [`${d.start}-${d.end}`] : [];
  }
  return JSON.stringify(obj);
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
          <p style={{ color: colors.muted, margin: '0 0 12px' }}>
            Vous n'avez pas encore de numéro. Choisissez-en un ci-dessous, ou réimportez un numéro
            déjà acheté chez Telnyx 👇
          </p>
          <Button
            variant="soft"
            onClick={async () => {
              const r = await api.importNumbers();
              setMsg(r.imported ? `✅ ${r.imported} numéro(s) importé(s)` : 'Aucun numéro à importer');
              refresh();
            }}
          >
            ↻ Importer mes numéros Telnyx
          </Button>
        </Card>
      )}

      <div style={{ display: 'grid', gap: 14, marginBottom: 28 }}>
        {numbers.map((n) => (
          <NumberCard key={n.id} number={n} onSaved={refresh} />
        ))}
      </div>

      <h3 style={{ fontSize: 17, marginBottom: 6 }}>Obtenir un numéro</h3>
      <p style={{ color: colors.muted, fontSize: 14, marginTop: 0 }}>
        Choisissez le type, puis tapez des chiffres pour un numéro précis ou{' '}
        <strong>facile à retenir</strong> (ex. <code>0000</code>, <code>1234</code>, un indicatif
        comme <code>01</code>…).
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
          <p style={{ color: colors.muted, margin: 0, lineHeight: 1.5 }}>
            {type === 'mobile' ? (
              <>
                ℹ️ En France, les <strong>numéros mobiles (06/07) ne sont pas disponibles</strong> chez
                les fournisseurs VoIP — ils sont réservés aux opérateurs mobiles. Pour un standard pro,
                choisissez plutôt <strong>Géographique</strong> (01-05) ou <strong>National (09)</strong>.
              </>
            ) : (
              <>Aucun numéro trouvé pour ces critères. Essayez un autre type ou d'autres chiffres.</>
            )}
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
                    <div style={{ fontWeight: 700, letterSpacing: '0.02em' }}>{formatFr(a.e164)}</div>
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
  const [hours, setHours] = useState<Record<string, DayState>>(parseSchedule(number.settings.weeklySchedule));
  const [saved, setSaved] = useState(false);
  const [open, setOpen] = useState(false);

  async function save() {
    await api.updateSettings(number.id, { ...s, weeklySchedule: buildSchedule(hours) });
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
            <div style={{ fontWeight: 800, fontSize: 16, letterSpacing: '0.02em' }}>{formatFr(number.e164)}</div>
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
          <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 8 }}>🕐 Horaires d'ouverture</div>
          <HoursEditor hours={hours} onChange={setHours} />
          <div style={{ height: 16 }} />

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

          <Field label="Voix du répondeur">
            <select
              value={s.greetingVoice || 'Polly.Lea-Neural'}
              onChange={(e) => setS({ ...s, greetingVoice: e.target.value })}
              style={{ width: '100%', padding: '12px 14px', fontSize: 16, borderRadius: 12, border: `1px solid ${colors.border}`, background: '#fff' }}
            >
              {VOICES.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.label}
                </option>
              ))}
            </select>
          </Field>
          <Button variant="soft" onClick={() => previewVoice(s.greetingClosed || '')} style={{ marginBottom: 14 }}>
            ▶︎ Écouter un aperçu
          </Button>

          <Button onClick={save} full>
            {saved ? '✅ Enregistré' : 'Enregistrer les réglages'}
          </Button>
        </div>
      )}
    </Card>
  );
}

function HoursEditor({
  hours,
  onChange,
}: {
  hours: Record<string, DayState>;
  onChange: (h: Record<string, DayState>) => void;
}) {
  function set(day: string, patch: Partial<DayState>) {
    onChange({ ...hours, [day]: { ...hours[day], ...patch } });
  }
  return (
    <div style={{ display: 'grid', gap: 6 }}>
      {DAYS.map(([key, label]) => {
        const d = hours[key];
        return (
          <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button
              onClick={() => set(key, { open: !d.open })}
              style={{
                width: 92,
                textAlign: 'left',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontSize: 14,
                fontWeight: 600,
                color: d.open ? colors.text : colors.muted,
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <span
                style={{
                  width: 16,
                  height: 16,
                  borderRadius: 5,
                  background: d.open ? colors.primary : '#fff',
                  border: `1.5px solid ${d.open ? colors.primary : '#cbd5e1'}`,
                  color: '#fff',
                  fontSize: 11,
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {d.open ? '✓' : ''}
              </span>
              {label}
            </button>
            {d.open ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
                <input
                  type="time"
                  value={d.start}
                  onChange={(e) => set(key, { start: e.target.value })}
                  style={{ border: `1px solid ${colors.border}`, borderRadius: 8, padding: '5px 6px' }}
                />
                <span style={{ color: colors.muted }}>→</span>
                <input
                  type="time"
                  value={d.end}
                  onChange={(e) => set(key, { end: e.target.value })}
                  style={{ border: `1px solid ${colors.border}`, borderRadius: 8, padding: '5px 6px' }}
                />
              </div>
            ) : (
              <span style={{ fontSize: 13, color: colors.muted }}>Fermé</span>
            )}
          </div>
        );
      })}
      <p style={{ fontSize: 12, color: colors.muted, margin: '4px 0 0' }}>
        Hors de ces horaires, les appels vont au répondeur. (Fuseau Europe/Paris)
      </p>
    </div>
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
