import { useEffect, useState } from 'react';
import { api } from '../api';
import { Button, Card, Field, IconChip, Input, PageTitle, colors } from '../ui';
import { formatFr } from '../format';

interface Client {
  id: string;
  name: string;
  phone: string;
  email?: string;
  notes?: string;
}

export function Clients({ onCall }: { onCall: (phone: string) => void }) {
  const [list, setList] = useState<Client[]>([]);
  const [search, setSearch] = useState('');
  const [adding, setAdding] = useState(false);
  const [importing, setImporting] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [bulk, setBulk] = useState('');

  async function refresh(q = search) {
    setList(await api.clients(q));
  }
  useEffect(() => {
    refresh('');
  }, []);

  async function add() {
    if (!phone) return;
    await api.addClient({ name: name || phone, phone });
    setName('');
    setPhone('');
    setAdding(false);
    refresh();
  }

  async function doImport() {
    // Parse : une ligne = "Nom, +33..." ou "Nom ; numéro" ou juste un numéro
    const items = bulk
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean)
      .map((l) => {
        const parts = l.split(/[,;\t]/).map((p) => p.trim());
        if (parts.length >= 2) {
          // détecte lequel est le numéro
          const phoneIdx = parts.findIndex((p) => /\d{6,}/.test(p));
          const ph = phoneIdx >= 0 ? parts[phoneIdx] : parts[1];
          const nm = parts.filter((_, i) => i !== phoneIdx).join(' ') || ph;
          return { name: nm, phone: ph.replace(/[^\d+]/g, '') };
        }
        return { name: l, phone: l.replace(/[^\d+]/g, '') };
      })
      .filter((it) => it.phone.length >= 6);

    const r = await api.importClients(items);
    setBulk('');
    setImporting(false);
    refresh();
    alert(`${r.imported} contact(s) importé(s)`);
  }

  async function del(id: string) {
    await api.deleteClient(id);
    refresh();
  }

  return (
    <div>
      <PageTitle subtitle="Votre annuaire — appelez en un tap">Clients</PageTitle>

      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <Input
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            refresh(e.target.value);
          }}
          placeholder="Rechercher un client…"
          style={{ flex: 1 }}
        />
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <Button variant="soft" onClick={() => { setAdding(!adding); setImporting(false); }}>＋ Ajouter</Button>
        <Button variant="soft" onClick={() => { setImporting(!importing); setAdding(false); }}>⇪ Importer</Button>
      </div>

      {adding && (
        <Card style={{ marginBottom: 16 }}>
          <Field label="Nom">
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="M. Dupont" />
          </Field>
          <Field label="Numéro">
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="06 12 34 56 78" />
          </Field>
          <Button onClick={add} full>Enregistrer le client</Button>
        </Card>
      )}

      {importing && (
        <Card style={{ marginBottom: 16 }}>
          <Field label="Coller une liste (une ligne par contact : « Nom, numéro »)">
            <textarea
              value={bulk}
              onChange={(e) => setBulk(e.target.value)}
              rows={6}
              placeholder={'Jean Dupont, 0612345678\nMarie Martin, +33698765432\n...'}
              style={{ width: '100%', padding: 12, fontSize: 15, borderRadius: 12, border: `1px solid ${colors.border}`, fontFamily: 'inherit' }}
            />
          </Field>
          <Button onClick={doImport} full>Importer ces contacts</Button>
          <p style={{ fontSize: 12, color: colors.muted, marginTop: 8 }}>
            💡 Import depuis les contacts du téléphone : disponible avec l'app native (à venir).
          </p>
        </Card>
      )}

      {list.length === 0 ? (
        <Card>
          <p style={{ color: colors.muted, margin: 0 }}>Aucun client. Ajoutez-en ou importez une liste 👆</p>
        </Card>
      ) : (
        <div style={{ display: 'grid', gap: 10 }}>
          {list.map((c) => (
            <Card key={c.id} style={{ padding: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
                  <IconChip icon={(c.name[0] || '?').toUpperCase()} bg="#eef0ff" color={colors.primary} />
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.name}</div>
                    <div style={{ fontSize: 13, color: colors.muted }}>{formatFr(c.phone)}</div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                  <button
                    onClick={() => onCall(c.phone)}
                    style={{ width: 42, height: 42, borderRadius: '50%', border: 'none', background: colors.green, color: '#fff', fontSize: 18, cursor: 'pointer' }}
                  >
                    📞
                  </button>
                  <button
                    onClick={() => del(c.id)}
                    style={{ width: 42, height: 42, borderRadius: '50%', border: `1px solid ${colors.border}`, background: 'transparent', color: colors.muted, fontSize: 16, cursor: 'pointer' }}
                  >
                    🗑
                  </button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
