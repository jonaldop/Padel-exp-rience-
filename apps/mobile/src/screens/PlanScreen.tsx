import { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api } from '../api';
import { colors } from '../theme';
import { GradientBg, Glass } from '../ui';

const PLANS = [
  { key: 'essentiel', name: 'Essentiel', price: '14,99 €', features: ['1 numéro pro', 'Appels & messagerie', 'Horaires & répondeur'] },
  { key: 'pro', name: 'Pro', price: '29 €', features: ['Tout Essentiel', 'Transcription', 'Renvoi avancé'] },
  { key: 'business', name: 'Business', price: '49 €', features: ['Tout Pro', 'Assistant IA', 'Multi-utilisateurs'] },
];

export function PlanScreen() {
  const insets = useSafeAreaInsets();
  const [current, setCurrent] = useState<string>('');
  const [saving, setSaving] = useState<string>('');

  useEffect(() => {
    api.me().then((me: any) => setCurrent(me?.account?.plan || 'starter')).catch(() => {});
  }, []);

  function choose(plan: string) {
    if (plan === current) return;
    Alert.alert(
      'Changer de formule',
      `Passer à la formule ${plan} ?\n\n(La facturation réelle sera mise en place séparément.)`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Confirmer',
          onPress: async () => {
            setSaving(plan);
            try {
              await api.updatePlan(plan);
              setCurrent(plan);
              Alert.alert('Formule mise à jour', `Vous êtes maintenant en formule ${plan}.`);
            } catch (e: any) {
              Alert.alert('Erreur', e.message);
            } finally {
              setSaving('');
            }
          },
        },
      ],
    );
  }

  return (
    <GradientBg>
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + 52, paddingHorizontal: 16, paddingBottom: 60 }}>
        <Text style={s.title}>Ma formule</Text>
        <Text style={s.sub}>Formule actuelle : <Text style={{ fontWeight: '800', color: colors.primary }}>{current || '—'}</Text></Text>

        {PLANS.map((p) => {
          const active = p.key === current;
          return (
            <Glass key={p.key} strong style={[s.card, active && s.cardActive]}>
              <View style={s.cardHead}>
                <Text style={s.planName}>{p.name}</Text>
                <Text style={s.price}>{p.price}<Text style={s.month}>/mois</Text></Text>
              </View>
              {p.features.map((f) => (
                <Text key={f} style={s.feature}>• {f}</Text>
              ))}
              <TouchableOpacity
                style={[s.btn, active ? s.btnActive : null]}
                onPress={() => choose(p.key)}
                disabled={active || saving === p.key}
              >
                <Text style={[s.btnTxt, active ? { color: colors.primary } : null]}>
                  {active ? '✓ Formule actuelle' : saving === p.key ? '…' : 'Choisir cette formule'}
                </Text>
              </TouchableOpacity>
            </Glass>
          );
        })}
        <Text style={s.note}>Le paiement et la facturation seront ajoutés prochainement. Pour l'instant, le changement est appliqué immédiatement.</Text>
      </ScrollView>
    </GradientBg>
  );
}

const s = StyleSheet.create({
  title: { fontSize: 28, fontWeight: '800', color: colors.text, marginBottom: 6, paddingHorizontal: 4 },
  sub: { fontSize: 14, color: colors.muted, marginBottom: 14, paddingHorizontal: 4 },
  card: { marginBottom: 14 },
  cardActive: { borderColor: colors.primary, borderWidth: 2 },
  cardHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 },
  planName: { fontSize: 20, fontWeight: '800', color: colors.text },
  price: { fontSize: 22, fontWeight: '800', color: colors.primary },
  month: { fontSize: 13, color: colors.muted, fontWeight: '600' },
  feature: { fontSize: 14, color: colors.text, marginTop: 4 },
  btn: { marginTop: 14, borderRadius: 12, padding: 13, alignItems: 'center', backgroundColor: colors.primary },
  btnActive: { backgroundColor: 'rgba(108,92,231,0.12)' },
  btnTxt: { color: '#fff', fontWeight: '800', fontSize: 15 },
  note: { fontSize: 12.5, color: colors.muted, marginTop: 6, paddingHorizontal: 4 },
});
