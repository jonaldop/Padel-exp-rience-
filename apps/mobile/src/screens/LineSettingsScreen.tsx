import { useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Switch, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api } from '../api';
import { colors } from '../theme';
import { GradientBg, Glass } from '../ui';

const DAYS: { key: string; label: string }[] = [
  { key: 'mon', label: 'Lundi' },
  { key: 'tue', label: 'Mardi' },
  { key: 'wed', label: 'Mercredi' },
  { key: 'thu', label: 'Jeudi' },
  { key: 'fri', label: 'Vendredi' },
  { key: 'sat', label: 'Samedi' },
  { key: 'sun', label: 'Dimanche' },
];

const VOICES = [
  { id: 'Polly.Lea-Neural', label: 'Léa (féminine, naturelle)' },
  { id: 'Polly.Remi-Neural', label: 'Rémi (masculine, naturelle)' },
  { id: 'Polly.Celine', label: 'Céline (standard)' },
];

type DayCfg = { open: boolean; am: [string, string]; pm: [string, string] };

function parseSchedule(raw?: string): Record<string, DayCfg> {
  let obj: Record<string, string[]> = {};
  try { obj = raw ? JSON.parse(raw) : {}; } catch { obj = {}; }
  const out: Record<string, DayCfg> = {};
  for (const d of DAYS) {
    const ranges = obj[d.key] || [];
    const am = (ranges[0] || '').split('-');
    const pm = (ranges[1] || '').split('-');
    out[d.key] = {
      open: ranges.length > 0,
      am: [am[0] || '', am[1] || ''],
      pm: [pm[0] || '', pm[1] || ''],
    };
  }
  return out;
}

function buildSchedule(days: Record<string, DayCfg>): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  for (const d of DAYS) {
    const c = days[d.key];
    const ranges: string[] = [];
    if (c.open) {
      if (c.am[0] && c.am[1]) ranges.push(`${c.am[0]}-${c.am[1]}`);
      if (c.pm[0] && c.pm[1]) ranges.push(`${c.pm[0]}-${c.pm[1]}`);
      // Jour ouvert mais aucune heure valide -> plage par défaut (sécurité).
      if (ranges.length === 0) ranges.push('09:00-18:00');
    }
    out[d.key] = ranges;
  }
  return out;
}

export function LineSettingsScreen() {
  const insets = useSafeAreaInsets();
  const [numberId, setNumberId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [voicemailEnabled, setVoicemailEnabled] = useState(true);
  const [greetingOpen, setGreetingOpen] = useState('');
  const [greetingClosed, setGreetingClosed] = useState('');
  const [greetingVoice, setGreetingVoice] = useState('Polly.Lea-Neural');
  const [forwardToMobile, setForwardToMobile] = useState(false);
  const [forwardNumber, setForwardNumber] = useState('');
  const [days, setDays] = useState<Record<string, DayCfg>>(parseSchedule());

  useEffect(() => {
    api.myNumbers().then((list: any[]) => {
      const n = list?.[0];
      if (!n) return;
      setNumberId(n.id);
      const st = n.settings || {};
      setVoicemailEnabled(st.voicemailEnabled !== false);
      setGreetingOpen(st.greetingOpen || '');
      setGreetingClosed(st.greetingClosed || '');
      setGreetingVoice(st.greetingVoice || 'Polly.Lea-Neural');
      setForwardToMobile(Boolean(st.forwardToMobile));
      setForwardNumber(st.forwardNumber || '');
      setDays(parseSchedule(st.weeklySchedule));
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  function setDay(key: string, patch: Partial<DayCfg>) {
    setDays((d) => ({ ...d, [key]: { ...d[key], ...patch } }));
  }
  function setRange(key: string, slot: 'am' | 'pm', idx: 0 | 1, val: string) {
    setDays((d) => {
      const cur = d[key][slot].slice() as [string, string];
      cur[idx] = val;
      return { ...d, [key]: { ...d[key], [slot]: cur } };
    });
  }
  // En activant un jour, on pré-remplit des heures par défaut pour qu'une vraie
  // plage soit toujours enregistrée (sinon le jour repartait "fermé").
  function toggleDay(key: string, open: boolean) {
    setDays((d) => {
      const c = d[key];
      if (open) {
        const am: [string, string] = c.am[0] && c.am[1] ? c.am : ['09:00', '18:00'];
        return { ...d, [key]: { ...c, open: true, am } };
      }
      return { ...d, [key]: { ...c, open: false } };
    });
  }

  async function save() {
    if (!numberId) { Alert.alert('Aucun numéro', "Aucun numéro pro à configurer."); return; }
    setSaving(true);
    try {
      await api.updateNumberSettings(numberId, {
        voicemailEnabled,
        greetingOpen,
        greetingClosed,
        greetingVoice,
        forwardToMobile,
        forwardNumber,
        weeklySchedule: buildSchedule(days),
      });
      Alert.alert('Enregistré', 'Les réglages de votre ligne ont été mis à jour.');
    } catch (e: any) {
      Alert.alert('Erreur', e.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <GradientBg>
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + 52, paddingHorizontal: 16, paddingBottom: 60 }}>
        <Text style={s.title}>Réglages de la ligne</Text>
        {loading ? (
          <Text style={s.muted}>Chargement…</Text>
        ) : (
          <>
            {/* Répondeur */}
            <Glass strong style={s.section}>
              <Text style={s.h2}>Répondeur</Text>
              <View style={s.rowBetween}>
                <Text style={s.rowLabel}>Activer la messagerie vocale</Text>
                <Switch value={voicemailEnabled} onValueChange={setVoicemailEnabled} trackColor={{ true: colors.primary }} />
              </View>
              <Text style={s.label}>Message (ouvert)</Text>
              <TextInput style={s.area} value={greetingOpen} onChangeText={setGreetingOpen} multiline placeholder="Bonjour, merci de laisser un message…" placeholderTextColor={colors.muted} />
              <Text style={s.label}>Message (fermé)</Text>
              <TextInput style={s.area} value={greetingClosed} onChangeText={setGreetingClosed} multiline placeholder="Nos bureaux sont fermés…" placeholderTextColor={colors.muted} />
              <Text style={s.label}>Voix du répondeur</Text>
              {VOICES.map((v) => (
                <TouchableOpacity key={v.id} style={s.voiceRow} onPress={() => setGreetingVoice(v.id)}>
                  <Text style={{ fontSize: 16, marginRight: 8 }}>{greetingVoice === v.id ? '🔘' : '⚪️'}</Text>
                  <Text style={s.rowLabel}>{v.label}</Text>
                </TouchableOpacity>
              ))}
            </Glass>

            {/* Renvoi d'appel */}
            <Glass strong style={s.section}>
              <Text style={s.h2}>Renvoi d'appel</Text>
              <View style={s.rowBetween}>
                <Text style={s.rowLabel}>Renvoyer vers mon mobile</Text>
                <Switch value={forwardToMobile} onValueChange={setForwardToMobile} trackColor={{ true: colors.primary }} />
              </View>
              {forwardToMobile && (
                <>
                  <Text style={s.label}>Numéro de renvoi</Text>
                  <TextInput style={s.input} value={forwardNumber} onChangeText={setForwardNumber} placeholder="06 …" placeholderTextColor={colors.muted} keyboardType="phone-pad" />
                </>
              )}
            </Glass>

            {/* Horaires */}
            <Glass strong style={s.section}>
              <Text style={s.h2}>Horaires d'ouverture</Text>
              {DAYS.map((d) => {
                const c = days[d.key];
                return (
                  <View key={d.key} style={s.day}>
                    <View style={s.rowBetween}>
                      <Text style={s.dayLabel}>{d.label}</Text>
                      <Switch value={c.open} onValueChange={(v) => toggleDay(d.key, v)} trackColor={{ true: colors.primary }} />
                    </View>
                    {c.open && (
                      <>
                        <View style={s.timeRow}>
                          <Text style={s.timeTag}>Matin</Text>
                          <TextInput style={s.time} value={c.am[0]} onChangeText={(t) => setRange(d.key, 'am', 0, t)} placeholder="09:00" placeholderTextColor={colors.muted} />
                          <Text style={s.dash}>→</Text>
                          <TextInput style={s.time} value={c.am[1]} onChangeText={(t) => setRange(d.key, 'am', 1, t)} placeholder="12:00" placeholderTextColor={colors.muted} />
                        </View>
                        <View style={s.timeRow}>
                          <Text style={s.timeTag}>A-m.</Text>
                          <TextInput style={s.time} value={c.pm[0]} onChangeText={(t) => setRange(d.key, 'pm', 0, t)} placeholder="14:00" placeholderTextColor={colors.muted} />
                          <Text style={s.dash}>→</Text>
                          <TextInput style={s.time} value={c.pm[1]} onChangeText={(t) => setRange(d.key, 'pm', 1, t)} placeholder="18:00" placeholderTextColor={colors.muted} />
                        </View>
                      </>
                    )}
                  </View>
                );
              })}
              <Text style={s.hint}>Laissez l'après-midi vide pour une journée continue. Hors de ces horaires, le répondeur prend le relais.</Text>
            </Glass>

            <TouchableOpacity style={s.save} onPress={save} disabled={saving}>
              <Text style={s.saveTxt}>{saving ? '…' : 'Enregistrer'}</Text>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </GradientBg>
  );
}

const s = StyleSheet.create({
  title: { fontSize: 28, fontWeight: '800', color: colors.text, marginBottom: 14, paddingHorizontal: 4 },
  muted: { color: colors.muted, paddingHorizontal: 4 },
  section: { marginBottom: 14 },
  h2: { fontSize: 17, fontWeight: '800', color: colors.text, marginBottom: 8 },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 8 },
  rowLabel: { fontSize: 15, color: colors.text, flex: 1 },
  label: { fontSize: 13, color: colors.muted, marginTop: 12, marginBottom: 4, fontWeight: '600' },
  input: { backgroundColor: '#fff', borderWidth: 1, borderColor: colors.border, borderRadius: 12, padding: 13, fontSize: 16, color: colors.text },
  area: { backgroundColor: '#fff', borderWidth: 1, borderColor: colors.border, borderRadius: 12, padding: 13, fontSize: 15, color: colors.text, minHeight: 64, textAlignVertical: 'top' },
  voiceRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8 },
  day: { borderTopWidth: 1, borderTopColor: 'rgba(0,0,0,0.06)', paddingTop: 6 },
  dayLabel: { fontSize: 15, fontWeight: '700', color: colors.text },
  timeRow: { flexDirection: 'row', alignItems: 'center', marginTop: 6 },
  timeTag: { width: 54, fontSize: 13, color: colors.muted, fontWeight: '600' },
  time: { flex: 1, backgroundColor: '#fff', borderWidth: 1, borderColor: colors.border, borderRadius: 10, padding: 10, fontSize: 15, textAlign: 'center', color: colors.text },
  dash: { marginHorizontal: 8, color: colors.muted },
  hint: { fontSize: 12.5, color: colors.muted, marginTop: 12 },
  save: { backgroundColor: colors.primary, borderRadius: 14, padding: 16, alignItems: 'center', marginTop: 4 },
  saveTxt: { color: '#fff', fontWeight: '800', fontSize: 16 },
});
