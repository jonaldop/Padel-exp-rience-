import { useCallback, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert, RefreshControl, ActivityIndicator, Linking, Platform,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api } from '../api';
import { colors } from '../theme';
import { GradientBg, Glass } from '../ui';

type Plan = { key: string; name: string; monthlyPrice: number; includedMinutes: number; features: string[] };

/** Formules « illimitées » : les minutes incluses sont un sentinel très élevé. */
const isUnlimited = (min?: number) => (min ?? 0) >= 99999;
type Usage = {
  plan: Plan;
  billing: { aJour: boolean; libelle: string };
  trial?: { isTrial: boolean; unlimited: boolean; endsAt: string | null; daysLeft: number | null; expired: boolean } | null;
  discountPct?: number;
  effectiveMonthlyPrice?: number;
  thisMonth: {
    month: string; minutes: number; calls: number; inbound: number; outbound: number;
    includedMinutes: number; remainingMinutes: number; overMinutes: number; percentUsed: number; extraCost: number;
  };
  totals: { minutes: number; calls: number };
  history: { month: string; minutes: number; calls: number; inbound: number; outbound: number }[];
};

/** Durée lisible : 213 -> « 3 h 33 », 45 -> « 45 min ». */
const fmtDur = (min?: number) => {
  const m = Math.max(0, Math.round(min ?? 0));
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  const r = m % 60;
  return r ? `${h} h ${String(r).padStart(2, '0')}` : `${h} h`;
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
  const [invoices, setInvoices] = useState<any[]>([]);
  const [payEnabled, setPayEnabled] = useState(false);
  const [subscribed, setSubscribed] = useState(false);
  const [subscribing, setSubscribing] = useState(false);
  const [paying, setPaying] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState<string>('');

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([
      api.usage().catch(() => null),
      api.plans().catch(() => ({ plans: [] })),
      api.invoices().catch(() => []),
      api.billingStatus().catch(() => ({ enabled: false })),
    ])
      .then(([u, p, inv, bs]: any[]) => {
        if (u) setUsage(u);
        setPlans(Array.isArray(p?.plans) ? p.plans : []);
        setInvoices(Array.isArray(inv) ? inv : []);
        setPayEnabled(Boolean(bs?.enabled));
        setSubscribed(Boolean(bs?.subscribed));
      })
      .finally(() => setLoading(false));
  }, []);

  // Met en place le prélèvement automatique mensuel (Stripe, carte enregistrée).
  async function startSubscription() {
    setSubscribing(true);
    try {
      const r = await api.subscribe();
      if (r?.url) await Linking.openURL(r.url);
      else if (r?.error) Alert.alert('Abonnement', r.error);
    } catch (e: any) {
      Alert.alert('Abonnement', e?.message || 'Erreur');
    } finally {
      setSubscribing(false);
    }
  }

  // Paiement Stripe : ouvre la page de paiement sécurisée dans le navigateur.
  async function payInvoice(inv: any) {
    setPaying(inv.id);
    try {
      const r = await api.checkoutInvoice(inv.id);
      if (r?.url) await Linking.openURL(r.url);
      else if (r?.error) Alert.alert('Paiement', r.error);
    } catch (e: any) {
      Alert.alert('Paiement', e?.message || 'Erreur');
    } finally {
      setPaying('');
    }
  }

  useFocusEffect(useCallback(() => { load(); }, [load]));

  function choose(plan: Plan) {
    if (plan.key === usage?.plan?.key) return;
    Alert.alert(
      'Changer de formule',
      `Passer à la formule ${plan.name} (${eur(plan.monthlyPrice)} HT/mois) ?`,
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
            {/* Bandeau période d'essai */}
            {usage?.trial?.isTrial && (
              <Glass strong style={[s.trialBanner, usage.trial.expired && { borderColor: colors.red, borderWidth: 1.5 }]}>
                <Text style={{ fontSize: 22, marginRight: 10 }}>🎁</Text>
                <View style={{ flex: 1 }}>
                  {usage.trial.unlimited ? (
                    <Text style={s.trialTxt}>Période d'essai <Text style={{ color: colors.green }}>illimitée</Text></Text>
                  ) : usage.trial.expired ? (
                    <Text style={[s.trialTxt, { color: colors.red }]}>Période d'essai expirée</Text>
                  ) : (
                    <Text style={s.trialTxt}>
                      Période d'essai — <Text style={{ color: colors.primary }}>{usage.trial.daysLeft} jour{(usage.trial.daysLeft || 0) > 1 ? 's' : ''} restant{(usage.trial.daysLeft || 0) > 1 ? 's' : ''}</Text>
                    </Text>
                  )}
                  {!!usage.trial.endsAt && !usage.trial.expired && (
                    <Text style={s.trialSub}>Fin le {new Date(usage.trial.endsAt).toLocaleDateString('fr-FR')}</Text>
                  )}
                  {usage.trial.expired && (
                    <Text style={s.trialSub}>Choisissez une formule pour continuer, ou contactez-nous.</Text>
                  )}
                </View>
              </Glass>
            )}

            {/* Forfait courant + consommation du mois */}
            {usage && (
              <Glass strong style={s.current}>
                <View style={s.curHead}>
                  <View style={{ flex: 1, paddingRight: 10 }}>
                    <Text style={s.curPlan}>{usage.plan.name}</Text>
                    <Text style={s.curBilling}>{usage.billing?.libelle}{(usage.discountPct || 0) > 0 ? ` · remise -${usage.discountPct}%` : ''}</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    {(usage.discountPct || 0) > 0 && (
                      <Text style={s.priceStruck}>{eur(usage.plan.monthlyPrice)}</Text>
                    )}
                    <Text style={s.curPrice}>
                      {eur((usage.discountPct || 0) > 0 ? usage.effectiveMonthlyPrice : usage.plan.monthlyPrice)}
                    </Text>
                    <Text style={s.month}>HT/mois</Text>
                  </View>
                </View>

                {/* Jauge minutes */}
                <View style={{ marginTop: 14 }}>
                  <View style={s.gaugeRow}>
                    <Text style={s.gaugeTxt}>
                      <Text style={{ fontWeight: '800', color: colors.text }}>{fmtDur(tm?.minutes)}</Text>
                      {isUnlimited(usage.plan.includedMinutes)
                        ? ' — appels illimités en France ∞'
                        : usage.plan.includedMinutes ? ` / ${fmtDur(usage.plan.includedMinutes)} sortantes (reçus illimités)` : ' ce mois-ci'}
                    </Text>
                    {!!usage.plan.includedMinutes && !isUnlimited(usage.plan.includedMinutes) && (
                      <Text style={[s.gaugeTxt, { fontWeight: '700', color: barColor }]}>{barPct}%</Text>
                    )}
                  </View>
                  {!!usage.plan.includedMinutes && !isUnlimited(usage.plan.includedMinutes) && (
                    <View style={s.track}><View style={[s.fill, { width: `${barPct}%`, backgroundColor: barColor }]} /></View>
                  )}
                  {!!usage.plan.includedMinutes && !isUnlimited(usage.plan.includedMinutes) && (
                    <Text style={s.gaugeSub}>
                      {tm && (tm.remainingMinutes ?? 0) <= 0
                        ? 'Temps d’appels sortants épuisé — passez à la formule supérieure ci-dessous pour continuer à appeler (appels reçus toujours illimités).'
                        : `Il vous reste ${fmtDur(tm?.remainingMinutes)} d’appels sortants ce mois-ci`}
                    </Text>
                  )}
                </View>

                {/* Mini stats du mois */}
                <View style={s.statsRow}>
                  <Stat label="Appels" value={String(tm?.calls ?? 0)} />
                  <Stat label="Entrants" value={String(tm?.inbound ?? 0)} />
                  <Stat label="Sortants" value={String(tm?.outbound ?? 0)} />
                </View>

                {/* Prélèvement automatique (abonnement Stripe) */}
                {subscribed ? (
                  <View style={s.autoOk}>
                    <Text style={{ color: colors.green, fontWeight: '800', fontSize: 13.5 }}>
                      ✓ Prélèvement automatique actif
                    </Text>
                    <Text style={{ color: colors.muted, fontSize: 12, marginTop: 2 }}>
                      Votre formule est prélevée chaque mois ; la facture apparaît ci-dessous, déjà réglée.
                    </Text>
                  </View>
                ) : payEnabled && (usage.plan.monthlyPrice || 0) > 0 ? (
                  Platform.OS === 'ios' ? (
                    /* App Store 3.1.1 : aucune vente dans l'app iOS — gestion sur le web. */
                    <View style={s.autoOk}>
                      <Text style={{ color: colors.muted, fontSize: 12.5, lineHeight: 17 }}>
                        Gérez votre abonnement et son règlement depuis votre espace web
                        sur www.allojoe.fr.
                      </Text>
                    </View>
                  ) : (
                    <TouchableOpacity style={s.subscribeBtn} onPress={startSubscription} disabled={subscribing}>
                      <Text style={s.subscribeBtnTxt}>
                        {subscribing ? '…' : `💳 Activer le prélèvement automatique (${eur(usage.effectiveMonthlyPrice ?? usage.plan.monthlyPrice)} HT/mois)`}
                      </Text>
                    </TouchableOpacity>
                  )
                ) : null}
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
                      <Text style={s.histMin}>{fmtDur(h.minutes)}</Text>
                      <Text style={s.histSub}>{h.calls} appel{h.calls > 1 ? 's' : ''} · ↙{h.inbound} ↗{h.outbound}</Text>
                    </View>
                  </View>
                ))
              ) : (
                <Text style={s.empty}>Aucune consommation pour le moment.</Text>
              )}
            </Glass>

            {/* Factures */}
            <Text style={s.section}>Mes factures</Text>
            <Glass style={{ paddingVertical: 4 }}>
              {invoices.length ? (
                invoices.map((inv, i) => (
                  <View key={inv.id} style={[s.histRow, i > 0 && s.histDivider]}>
                    <View>
                      <Text style={s.histMonth}>{monthLabel(inv.period)}</Text>
                      <Text style={s.invNum}>{inv.number}{inv.discountPct ? ` · remise -${inv.discountPct}%` : ''}</Text>
                      {!!inv.overageAmount && (
                        <Text style={s.invNum}>dont dépassement : {eur(inv.overageAmount)} ({inv.overageMinutes} min)</Text>
                      )}
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={s.histMin}>{eur(inv.total)}</Text>
                      <Text style={[s.invStatus, { color: inv.status === 'paid' ? colors.green : inv.status === 'void' ? colors.muted : colors.amber }]}>
                        {inv.status === 'paid' ? '✓ Payée' : inv.status === 'void' ? 'Annulée' : 'À payer'}
                      </Text>
                      {inv.status === 'due' && payEnabled && Platform.OS !== 'ios' && (
                        <TouchableOpacity
                          style={s.payBtn}
                          onPress={() => payInvoice(inv)}
                          disabled={paying === inv.id}
                        >
                          <Text style={s.payBtnTxt}>{paying === inv.id ? '…' : '💳 Payer'}</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                ))
              ) : (
                <Text style={s.empty}>
                  {usage?.trial?.isTrial ? "Aucune facture pendant la période d'essai." : 'Aucune facture pour le moment.'}
                </Text>
              )}
            </Glass>

            {/* Changer de formule */}
            <Text style={s.section}>Changer de formule</Text>
            {plans.map((p) => {
              const active = p.key === usage?.plan?.key;
              return (
                <Glass key={p.key} strong style={[s.card, active && s.cardActive]}>
                  <View style={s.cardHead}>
                    <Text style={[s.planName, { flex: 1, paddingRight: 10 }]}>{p.name}</Text>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={s.price}>{eur(p.monthlyPrice)}</Text>
                      <Text style={s.month}>HT/mois</Text>
                    </View>
                  </View>
                  <Text style={s.included}>
                    {isUnlimited(p.includedMinutes)
                      ? 'Appels illimités en France'
                      : p.includedMinutes
                        ? `Reçus illimités + ${p.includedMinutes % 60 === 0 ? `${p.includedMinutes / 60} h` : `${p.includedMinutes} min`} d’appels sortants`
                        : 'Minutes à l’usage'}
                  </Text>
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
  trialBanner: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  trialTxt: { fontSize: 15.5, fontWeight: '800', color: colors.text },
  trialSub: { fontSize: 12.5, color: colors.muted, marginTop: 2 },
  priceStruck: { fontSize: 14, color: colors.muted, textDecorationLine: 'line-through' },
  invNum: { fontSize: 11.5, color: colors.muted, marginTop: 2 },
  invStatus: { fontSize: 12, fontWeight: '700', marginTop: 2 },
  payBtn: { backgroundColor: colors.primary, borderRadius: 9, paddingHorizontal: 12, paddingVertical: 5, marginTop: 6 },
  payBtnTxt: { color: '#fff', fontSize: 12.5, fontWeight: '800' },
  subscribeBtn: { backgroundColor: colors.primary, borderRadius: 12, padding: 13, alignItems: 'center', marginTop: 16 },
  subscribeBtnTxt: { color: '#fff', fontWeight: '800', fontSize: 14 },
  autoOk: { marginTop: 16, backgroundColor: '#E7F7EE', borderRadius: 12, padding: 12 },
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
