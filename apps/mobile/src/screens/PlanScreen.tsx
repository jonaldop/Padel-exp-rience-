import { useCallback, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert, RefreshControl, ActivityIndicator } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api } from '../api';
import { colors } from '../theme';
import { GradientBg, Glass } from '../ui';

type Plan = { key: string; name: string; monthlyPrice: number; includedMinutes: number; features: string[] };
type Usage = {
  plan: Plan;
  billing: { aJour: boolean; libelle: string };
  thisMonth: {
    month: string; minutes: number; calls: number; inbound: number; outbound: number;
    includedMinutes: number; remainingMinutes: number; overMinutes: number; percentUsed: number; extraCost: number;
  };
  totals: { minutes: number; calls: number };
  history: { month: string; minutes: number; calls: number; inbound: number; outbound: number }[];
};

const eur = (n?: number) =>
  (n ?? 0).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';

function monthLabel(ym: string) {
  // ym = "YYYY-MM"
  const [y, m] = ym.split('-').map(Number);
  const d = new Date(y, (m || 1) - 1, 1);
  return d.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
}

export function PlanScreen() {
  const insets = useSafeAreaInsets();
  const [usage, setUsage] = useState<Usage | null>(null);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState<string>('');

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([api.usage().catch(() => null), api.plans().catch(() => ({ plans: [] }))])
      .then(([u, p]: any[]) => {
        if (u) setUsage(u);
        setPlans(Array.isArray(p?.plans) ? p.plans : []);
      })
      .finally(() => setLoading(false));
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  function choose(plan: Plan) {
    if (plan.key === usage?.plan?.key) return;
    Alert.alert(
      'Changer de formule',
      `Passer à la formule ${plan.name} (${eur(plan.monthlyPrice)}/mois) ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Confirmer',
          onPress: async () => {
            setSaving(plan.key);
            try {
              await api.updatePlan(plan.key);
              Alert.alert('Formule mise à jour', `Vous êtes maintenant en formule ${plan.name}.`);
              load();
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

  const tm = usage?.thisMonth;
  const barPct = tm?.percentUsed ?? 0;
  const barColor = barPct >= 100 ? colors.red : barPct >= 80 ? colors.amber : colors.green;

  return (
    <GradientBg>
      <ScrollView
        contentContainerStyle={{ paddingTop: insets.top + 52, paddingHorizontal: 16, paddingBottom: 60 }}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={colors.primary} />}
      >
        <Text style={s.title}>Mon forfait</Text>

        {loading && !usage ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
        ) : (
          <>
            {/* Forfait courant + consommation du mois */}
            {usage && (
              <Glass strong style={s.current}>
                <View style={s.curHead}>
                  <View>
                    <Text style={s.curPlan}>{usage.plan.name}</Text>
                    <Text style={s.curBilling}>{usage.billing?.libelle}</Text>
                  </View>
                  <Text style={s.curPrice}>{eur(usage.plan.monthlyPrice)}<Text style={s.month}>/mois</Text></Text>
                </View>

                {/* Jauge minutes */}
                <View style={{ marginTop: 14 }}>
                  <View style={s.gaugeRow}>
                    <Text style={s.gaugeTxt}>
                      <Text style={{ fontWeight: '800', color: colors.text }}>{tm?.minutes ?? 0} min</Text>
                      {usage.plan.includedMinutes ? ` / ${usage.plan.includedMinutes} min incluses` : ' ce mois-ci'}
                    </Text>
                    {!!usage.plan.includedMinutes && (
                      <Text style={[s.gaugeTxt, { fontWeight: '700', color: barColor }]}>{barPct}%</Text>
                    )}
                  </View>
                  {!!usage.plan.includedMinutes && (
                    <View style={s.track}><View style={[s.fill, { width: `${barPct}%`, backgroundColor: barColor }]} /></View>
                  )}
                  {!!usage.plan.includedMinutes && (
                    <Text style={s.gaugeSub}>
                      {tm && tm.overMinutes > 0
                        ? `Dépassement : ${tm.overMinutes} min (~${eur(tm.extraCost)})`
                        : `Il vous reste ${tm?.remainingMinutes ?? 0} min ce mois-ci`}
                    </Text>
                  )}
                </View>

                {/* Mini stats du mois */}
                <View style={s.statsRow}>
                  <Stat label="Appels" value={String(tm?.calls ?? 0)} />
                  <Stat label="Entrants" value={String(tm?.inbound ?? 0)} />
                  <Stat label="Sortants" value={String(tm?.outbound ?? 0)} />
                </View>
              </Glass>
            )}

            {/* Historique de consommation */}
            <Text style={s.section}>Historique de consommation</Text>
            <Glass style={{ paddingVertical: 4 }}>
              {usage?.history?.length ? (
                usage.history.map((h, i) => (
                  <View key={h.month} style={[s.histRow, i > 0 && s.histDivider]}>
                    <Text style={s.histMonth}>{monthLabel(h.month)}</Text>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={s.histMin}>{h.minutes} min</Text>
                      <Text style={s.histSub}>{h.calls} appel{h.calls > 1 ? 's' : ''} · ↙{h.inbound} ↗{h.outbound}</Text>
                    </View>
                  </View>
                ))
              ) : (
                <Text style={s.empty}>Aucune consommation pour le moment.</Text>
              )}
            </Glass>

            {/* Changer de formule */}
            <Text style={s.section}>Changer de formule</Text>
            {plans.map((p) => {
              const active = p.key === usage?.plan?.key;
              return (
                <Glass key={p.key} strong style={[s.card, active && s.cardActive]}>
                  <View style={s.cardHead}>
                    <Text style={s.planName}>{p.name}</Text>
                    <Text style={s.price}>{eur(p.monthlyPrice)}<Text style={s.month}>/mois</Text></Text>
                  </View>
                  <Text style={s.included}>{p.includedMinutes ? `${p.includedMinutes} min incluses` : 'Minutes à l’usage'}</Text>
                  {(p.features || []).map((f) => (
                    <Text key={f} style={s.feature}>• {f}</Text>
                  ))}
                  <TouchableOpacity
                    style={[s.btn, active ? s.btnActive : null]}
                    onPress={() => choose(p)}
                    disabled={active || saving === p.key}
                  >
                    <Text style={[s.btnTxt, active ? { color: colors.primary } : null]}>
                      {active ? '✓ Formule actuelle' : saving === p.key ? '…' : 'Choisir cette formule'}
                    </Text>
                  </TouchableOpacity>
                </Glass>
              );
            })}
            <Text style={s.note}>Le paiement et la facturation seront ajoutés prochainement. Le changement de formule est appliqué immédiatement.</Text>
          </>
        )}
      </ScrollView>
    </GradientBg>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={s.stat}>
      <Text style={s.statValue}>{value}</Text>
      <Text style={s.statLabel}>{label}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  title: { fontSize: 28, fontWeight: '800', color: colors.text, marginBottom: 14, paddingHorizontal: 4 },
  section: { fontSize: 16, fontWeight: '800', color: colors.text, marginTop: 22, marginBottom: 10, paddingHorizontal: 4 },
  current: { marginBottom: 4 },
  curHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  curPlan: { fontSize: 22, fontWeight: '800', color: colors.text },
  curBilling: { fontSize: 13, color: colors.muted, marginTop: 2 },
  curPrice: { fontSize: 22, fontWeight: '800', color: colors.primary },
  gaugeRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  gaugeTxt: { fontSize: 14, color: colors.muted },
  gaugeSub: { fontSize: 12.5, color: colors.muted, marginTop: 6 },
  track: { height: 10, borderRadius: 5, backgroundColor: 'rgba(0,0,0,0.07)', marginTop: 8, overflow: 'hidden' },
  fill: { height: 10, borderRadius: 5 },
  statsRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 16 },
  stat: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: 20, fontWeight: '800', color: colors.text },
  statLabel: { fontSize: 12, color: colors.muted, marginTop: 2 },
  histRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 14 },
  histDivider: { borderTopWidth: 1, borderTopColor: 'rgba(0,0,0,0.06)' },
  histMonth: { fontSize: 15, fontWeight: '700', color: colors.text, textTransform: 'capitalize' },
  histMin: { fontSize: 15, fontWeight: '800', color: colors.primary },
  histSub: { fontSize: 12, color: colors.muted, marginTop: 2 },
  empty: { color: colors.muted, textAlign: 'center', padding: 18 },
  card: { marginBottom: 14 },
  cardActive: { borderColor: colors.primary, borderWidth: 2 },
  cardHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4 },
  planName: { fontSize: 20, fontWeight: '800', color: colors.text },
  price: { fontSize: 22, fontWeight: '800', color: colors.primary },
  month: { fontSize: 13, color: colors.muted, fontWeight: '600' },
  included: { fontSize: 13, color: colors.muted, marginBottom: 6, fontWeight: '600' },
  feature: { fontSize: 14, color: colors.text, marginTop: 4 },
  btn: { marginTop: 14, borderRadius: 12, padding: 13, alignItems: 'center', backgroundColor: colors.primary },
  btnActive: { backgroundColor: 'rgba(108,92,231,0.12)' },
  btnTxt: { color: '#fff', fontWeight: '800', fontSize: 15 },
  note: { fontSize: 12.5, color: colors.muted, marginTop: 6, paddingHorizontal: 4 },
});
