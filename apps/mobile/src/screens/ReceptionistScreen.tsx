import { useCallback, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Switch, TextInput,
  TouchableOpacity, ActivityIndicator, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../api';
import { colors } from '../theme';
import { GradientBg, Glass } from '../ui';

/**
 * RÉCEPTIONNISTE IA — réglages du répondeur intelligent :
 * conversation IA (questions/réponses), messages d'accueil, voix.
 * + statistiques réelles (messages qualifiés).
 */
export function ReceptionistScreen() {
  const insets = useSafeAreaInsets();
  const [num, setNum] = useState<any>(null);
  const [vms, setVms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  // Réglages édités
  const [conversational, setConversational] = useState(true);
  const [greetingOpen, setGreetingOpen] = useState('');
  const [greetingClosed, setGreetingClosed] = useState('');
  const [voice, setVoice] = useState('Polly.Lea-Neural');
  const [testTo, setTestTo] = useState('');
  const [testing, setTesting] = useState<'open' | 'closed' | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([
      api.myNumbers().then((n: any[]) => {
        const first = n?.[0];
        setNum(first || null);
        const st = first?.settings || {};
        setConversational(st.aiConversational === true);
        setGreetingOpen(st.greetingOpen || '');
        setGreetingClosed(st.greetingClosed || '');
        setVoice(st.greetingVoice || 'Polly.Lea-Neural');
        setTestTo((prev: string) => prev || st.forwardNumber || '');
      }),
      api.voicemails().then((v) => setVms(Array.isArray(v) ? v : [])).catch(() => {}),
    ]).catch(() => {}).finally(() => setLoading(false));
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  async function save(patch: any, optimistic?: () => void) {
    if (!num) return;
    optimistic?.();
    setSaving(true);
    try {
      await api.updateNumberSettings(num.id, patch);
    } catch (e: any) {
      Alert.alert('Oups', e.message || 'Réglage non enregistré');
      load();
    } finally {
      setSaving(false);
    }
  }

  /** Joe appelle l'artisan et joue le message (voix + texte réels). */
  async function testGreeting(which: 'open' | 'closed') {
    if (!testTo.trim()) {
      Alert.alert('Numéro manquant', 'Indiquez le numéro de mobile à appeler pour le test.');
      return;
    }
    setTesting(which);
    try {
      const res = await api.previewGreeting({
        numberId: num?.id,
        which,
        text: which === 'open' ? greetingOpen : greetingClosed,
        voice,
        to: testTo.trim(),
      });
      if (res.error) Alert.alert('Test impossible', res.error);
      else Alert.alert('📞 Joe vous appelle !', 'Décrochez pour écouter votre message exactement comme vos clients l’entendront.');
    } catch (e: any) {
      Alert.alert('Oups', e.message || 'Test impossible');
    } finally {
      setTesting(null);
    }
  }

  // Stats réelles : messages qualifiés (7 derniers jours)
  const weekAgo = Date.now() - 7 * 86400000;
  const qualified = vms.filter((v) => v.aiSummary && new Date(v.createdAt).getTime() > weekAgo).length;
  const urgent = vms.filter((v) => v.aiUrgency === 'haute' && new Date(v.createdAt).getTime() > weekAgo).length;

  const VOICES: [string, string][] = [
    ['Polly.Lea-Neural', '👩 Léa'],
    ['Polly.Remi-Neural', '👨 Rémi'],
  ];

  return (
    <GradientBg>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
      <ScrollView
        contentContainerStyle={{ paddingTop: insets.top + 8, paddingHorizontal: 16, paddingBottom: 140 }}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={st.title}>Réceptionniste IA</Text>

        {loading ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
        ) : !num ? (
          <Glass><Text style={{ color: colors.muted, textAlign: 'center' }}>
            Configurez d'abord un numéro pro pour activer la réceptionniste.
          </Text></Glass>
        ) : (
          <>
            {/* Statut + stats réelles */}
            <Glass strong>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <View style={st.statusIcon}><Ionicons name="sparkles" size={20} color="#fff" /></View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={st.statusTitle}>En ligne, 24 h/24</Text>
                  <Text style={st.statusSub}>
                    Quand vous ne répondez pas, je prends le relais : j'accueille, j'écoute,
                    je transcris et je qualifie chaque demande.
                  </Text>
                </View>
              </View>
              <View style={st.statsRow}>
                <View style={st.stat}>
                  <Text style={st.statVal}>{qualified}</Text>
                  <Text style={st.statLbl}>messages qualifiés{'\n'}sur 7 jours</Text>
                </View>
                <View style={st.stat}>
                  <Text style={[st.statVal, { color: urgent ? colors.red : colors.text }]}>{urgent}</Text>
                  <Text style={st.statLbl}>urgences{'\n'}détectées</Text>
                </View>
              </View>
            </Glass>

            {/* Conversation IA */}
            <Glass style={{ marginTop: 14 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <View style={{ flex: 1, paddingRight: 10 }}>
                  <Text style={st.rowTitle}>Conversation intelligente (bêta)</Text>
                  <Text style={st.rowSub}>
                    La réceptionniste pose des questions au lieu d'un simple répondeur.
                    ⚠️ Encore lente entre les phrases (technologie opérateur) — nous
                    recommandons le répondeur classique pour l'instant.
                  </Text>
                </View>
                <Switch
                  value={conversational}
                  onValueChange={(v) => save({ aiConversational: v }, () => setConversational(v))}
                  trackColor={{ true: colors.green }}
                />
              </View>
            </Glass>

            {/* Voix */}
            <Glass style={{ marginTop: 14 }}>
              <Text style={st.rowTitle}>Voix de la réceptionniste</Text>
              <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
                {VOICES.map(([key, label]) => {
                  const on = voice === key;
                  return (
                    <TouchableOpacity
                      key={key}
                      style={[st.voiceBtn, on && st.voiceBtnOn]}
                      onPress={() => save({ greetingVoice: key }, () => setVoice(key))}
                    >
                      <Text style={[st.voiceTxt, on && st.voiceTxtOn]}>{label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </Glass>

            {/* Messages d'accueil */}
            <Glass style={{ marginTop: 14 }}>
              <Text style={st.rowTitle}>Message d'accueil — horaires d'ouverture</Text>
              <Text style={st.rowSub}>Vide = message automatique avec le nom de votre entreprise.</Text>
              <TextInput
                style={st.input}
                multiline
                placeholder={num?.defaultGreetings?.open || 'Message automatique avec le nom de votre entreprise'}
                placeholderTextColor={colors.muted}
                value={greetingOpen}
                onChangeText={setGreetingOpen}
                onEndEditing={() => save({ greetingOpen })}
              />
              <Text style={[st.rowTitle, { marginTop: 16 }]}>Message — en dehors des horaires</Text>
              <TextInput
                style={st.input}
                multiline
                placeholder={num?.defaultGreetings?.closed || 'Message automatique (version fermé)'}
                placeholderTextColor={colors.muted}
                value={greetingClosed}
                onChangeText={setGreetingClosed}
                onEndEditing={() => save({ greetingClosed })}
              />
            </Glass>

            {/* Tester en conditions réelles : Joe appelle et joue le message */}
            <Glass style={{ marginTop: 14 }}>
              <Text style={st.rowTitle}>🔊 Écouter mes messages</Text>
              <Text style={st.rowSub}>
                Joe appelle votre mobile et joue le message avec la voix choisie —
                exactement ce qu'entendront vos clients.
              </Text>
              <TextInput
                style={[st.input, { minHeight: 0, marginTop: 10 }]}
                placeholder="06 12 34 56 78"
                placeholderTextColor={colors.muted}
                keyboardType="phone-pad"
                value={testTo}
                onChangeText={setTestTo}
              />
              <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
                <TouchableOpacity
                  style={[st.testBtn, testing === 'open' && { opacity: 0.6 }]}
                  onPress={() => testGreeting('open')}
                  disabled={testing !== null}
                >
                  <Text style={st.testBtnTxt}>{testing === 'open' ? 'Appel…' : '▶️ Accueil'}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[st.testBtn, testing === 'closed' && { opacity: 0.6 }]}
                  onPress={() => testGreeting('closed')}
                  disabled={testing !== null}
                >
                  <Text style={st.testBtnTxt}>{testing === 'closed' ? 'Appel…' : '▶️ Fermé'}</Text>
                </TouchableOpacity>
              </View>
            </Glass>

            <Text style={st.note}>
              {saving ? 'Enregistrement…' : 'Les modifications sont appliquées immédiatement sur votre ligne.'}
            </Text>
          </>
        )}
      </ScrollView>
      </KeyboardAvoidingView>
    </GradientBg>
  );
}

const st = StyleSheet.create({
  title: { fontSize: 28, fontWeight: '800', color: colors.text, marginBottom: 14, paddingHorizontal: 4 },
  statusIcon: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: colors.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  statusTitle: { fontSize: 17, fontWeight: '800', color: colors.text },
  statusSub: { fontSize: 13, color: colors.muted, marginTop: 3, lineHeight: 18 },
  statsRow: { flexDirection: 'row', marginTop: 16, gap: 10 },
  stat: {
    flex: 1, backgroundColor: 'rgba(255,255,255,0.6)', borderRadius: 14,
    paddingVertical: 12, alignItems: 'center',
  },
  statVal: { fontSize: 24, fontWeight: '800', color: colors.text },
  statLbl: { fontSize: 11.5, color: colors.muted, textAlign: 'center', marginTop: 3, lineHeight: 14 },
  rowTitle: { fontSize: 15.5, fontWeight: '700', color: colors.text },
  rowSub: { fontSize: 12.5, color: colors.muted, marginTop: 3, lineHeight: 17 },
  voiceBtn: {
    flex: 1, paddingVertical: 11, borderRadius: 12, alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.6)', borderWidth: 1, borderColor: colors.border,
  },
  voiceBtnOn: { borderWidth: 2, borderColor: colors.primary, backgroundColor: '#EFEBFF' },
  voiceTxt: { fontSize: 14.5, fontWeight: '700', color: colors.muted },
  voiceTxtOn: { color: colors.primary },
  input: {
    marginTop: 10, backgroundColor: 'rgba(255,255,255,0.75)', borderRadius: 12,
    borderWidth: 1, borderColor: colors.border, padding: 12, minHeight: 72,
    fontSize: 14.5, color: colors.text, textAlignVertical: 'top',
  },
  note: { textAlign: 'center', color: colors.muted, fontSize: 12.5, marginTop: 16 },
  testBtn: {
    flex: 1, paddingVertical: 12, borderRadius: 12, alignItems: 'center',
    backgroundColor: colors.primary,
  },
  testBtnTxt: { color: '#fff', fontSize: 14.5, fontWeight: '800' },
});
