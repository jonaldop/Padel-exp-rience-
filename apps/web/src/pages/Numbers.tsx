import { useEffect, useState } from 'react';
import { api } from '../api';
import { Button, Card, Field, Input, colors } from '../ui';

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

export function Numbers() {
  const [numbers, setNumbers] = useState<PhoneNumber[]>([]);
  const [available, setAvailable] = useState<any[]>([]);
  const [msg, setMsg] = useState<string | null>(null);

  async function refresh() {
    setNumbers(await api.myNumbers());
  }

  useEffect(() => {
    refresh();
    api.availableNumbers().then(setAvailable).catch(() => setAvailable([]));
  }, []);

  async function buy(e164: string, type: string) {
    setMsg(null);
    try {
      await api.buyNumber(e164, type);
      setMsg(`✅ Numéro ${e164} attribué à votre compte`);
      refresh();
    } catch (e: any) {
      setMsg(`⚠️ ${e.message}`);
    }
  }

  return (
    <div>
      <h2 style={{ marginTop: 0 }}>Mes numéros</h2>
      {msg && <p style={{ color: colors.text }}>{msg}</p>}

      {numbers.length === 0 && <p style={{ color: colors.muted }}>Aucun numéro. Choisissez-en un ci-dessous.</p>}

      <div style={{ display: 'grid', gap: 14, marginBottom: 24 }}>
        {numbers.map((n) => (
          <NumberCard key={n.id} number={n} onSaved={refresh} />
        ))}
      </div>

      <Card>
        <h3 style={{ marginTop: 0 }}>Obtenir un nouveau numéro</h3>
        <p style={{ color: colors.muted, fontSize: 14 }}>
          Numéros français disponibles immédiatement.
        </p>
        {available.map((a) => (
          <div
            key={a.e164}
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '10px 0',
              borderTop: `1px solid ${colors.border}`,
            }}
          >
            <div>
              <strong>{a.e164}</strong>{' '}
              <span style={{ color: colors.muted, fontSize: 13 }}>({a.type}) — {a.monthlyCost} €/mois</span>
            </div>
            <Button variant="green" onClick={() => buy(a.e164, a.type)}>
              Choisir
            </Button>
          </div>
        ))}
      </Card>
    </div>
  );
}

function NumberCard({ number, onSaved }: { number: PhoneNumber; onSaved: () => void }) {
  const [s, setS] = useState<Settings>(number.settings);
  const [saved, setSaved] = useState(false);

  async function save() {
    await api.updateSettings(number.id, s);
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
    onSaved();
  }

  return (
    <Card>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ margin: 0 }}>
          {number.e164}{' '}
          <span style={{ fontSize: 13, color: colors.muted }}>
            ({number.origin === 'ported' ? 'porté' : 'nouveau'} · {number.status})
          </span>
        </h3>
      </div>

      <div style={{ marginTop: 14 }}>
        <label style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 10 }}>
          <input
            type="checkbox"
            checked={s.forwardToMobile}
            onChange={(e) => setS({ ...s, forwardToMobile: e.target.checked })}
          />
          Renvoi vers mon mobile (fiabilité)
        </label>
        {s.forwardToMobile && (
          <Field label="Numéro de renvoi">
            <Input
              value={s.forwardNumber || ''}
              onChange={(e) => setS({ ...s, forwardNumber: e.target.value })}
              placeholder="+33 6 ..."
            />
          </Field>
        )}

        <label style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 10 }}>
          <input
            type="checkbox"
            checked={s.voicemailEnabled}
            onChange={(e) => setS({ ...s, voicemailEnabled: e.target.checked })}
          />
          Répondeur / messagerie vocale
        </label>
        <label style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 10 }}>
          <input
            type="checkbox"
            checked={s.recordingEnabled}
            onChange={(e) => setS({ ...s, recordingEnabled: e.target.checked })}
          />
          Enregistrement des appels (consentement requis)
        </label>

        <Field label="Message d'accueil hors horaires">
          <Input
            value={s.greetingClosed || ''}
            onChange={(e) => setS({ ...s, greetingClosed: e.target.value })}
          />
        </Field>

        <Button onClick={save}>{saved ? '✅ Enregistré' : 'Enregistrer'}</Button>
      </div>
    </Card>
  );
}
