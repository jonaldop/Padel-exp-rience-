import { useCallback, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, RefreshControl } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { api } from '../api';
import { colors } from '../theme';
import { GradientBg, Glass, Delta, BarChart } from '../ui';

const DAY_LABELS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

export function StatsScreen() {
  const insets = useSafeAreaInsets();
  const [calls, setCalls] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    api.history().then((c) => setCalls(Array.isArray(c) ? c : [])).catch(() => {}).finally(() => setLoading(false));
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const now = new Date();
  const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  // 7 derniers jours
  const last7: any[] = [];
  const prev7: any[] = [];
  for (const c of calls) {
    const d = new Date(c.startedAt);
    const diffDays = Math.floor((dayStart.getTime() - new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()) / 86400000);
    if (diffDays >= 0 && diffDays < 7) last7.push(c);
    else if (diffDays >= 7 && diffDays < 14) prev7.push(c);
  }

  const total = last7.length;
  const prevTotal = prev7.length;
  const totalDelta = prevTotal === 0 ? null : Math.round(((total - prevTotal) / prevTotal) * 100);

  const answered = (c: any) => ['answered', 'completed', 'forwarded'].includes(c.status);
  const inbound = last7.filter((c) => c.direction === 'inbound');
  const taux = inbound.length === 0 ? 0 : Math.round((inbound.filter(answered).length / inbound.length) * 100);
  const prevInbound = prev7.filter((c) => c.direction === 'inbound');
  const prevTaux = prevInbound.length === 0 ? 0 : Math.round((prevInbound.filter(answered).length / prevInbound.length) * 100);
  const tauxDelta = prevTaux === 0 ? null : Math.round(((taux - prevTaux) / prevTaux) * 100);

  // Série par jour (Lun..Dim) sur 7 jours glissants alignés sur la semaine
  const perDay = [0, 0, 0, 0, 0, 0, 0];
  for (const c of last7) {
    const jsDay = new Date(c.startedAt).getDay(); // 0=dim..6=sam
    const idx = (jsDay + 6) % 7; // -> 0=lun..6=dim
    perDay[idx]++;
  }

  // Heures les plus actives (8h-20h par tranches de 2h)
  const hourBuckets = [8, 10, 12, 14, 16, 18];
  const perHour = hourBuckets.map((h) => last7.filter((c) => {
    const hr = new Date(c.startedAt).getHours();
    return hr >= h && hr < h + 2;
  }).length);

  return (
    <GradientBg>
      <ScrollView
        contentContainerStyle={{ paddingTop: insets.top + 52, paddingHorizontal: 16, paddingBottom: 130 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={colors.primary} />}
      >
        <Text style={s.title}>Statistiques</Text>
        <View style={s.range}>
          <Text style={s.rangeTxt}>7 derniers jours</Text>
        </View>

        <Glass strong style={{ marginTop: 16 }}>
          <Text style={s.label}>Nombre d'appels</Text>
          <Text style={s.big}>{total}</Text>
          {totalDelta !== null && (
            <Text style={s.vs}>
              <Delta value={totalDelta} /> <Text style={{ color: colors.muted }}>vs semaine précédente</Text>
            </Text>
          )}
          <View style={{ marginTop: 14 }}>
            <BarChart data={perDay} labels={DAY_LABELS} color={colors.primaryBlue} height={80} />
          </View>
        </Glass>

        <Glass strong style={{ marginTop: 14 }}>
          <Text style={s.label}>Taux de réponse</Text>
          <Text style={s.big}>{taux}%</Text>
          {tauxDelta !== null && (
            <Text style={s.vs}>
              <Delta value={tauxDelta} /> <Text style={{ color: colors.muted }}>vs semaine précédente</Text>
            </Text>
          )}
        </Glass>

        <Glass strong style={{ marginTop: 14 }}>
          <Text style={s.label}>Heures les plus actives</Text>
          <View style={{ marginTop: 14 }}>
            <BarChart data={perHour} labels={hourBuckets.map((h) => `${h}h`)} color={colors.primary} height={90} />
          </View>
        </Glass>
      </ScrollView>
    </GradientBg>
  );
}

const s = StyleSheet.create({
  title: { fontSize: 28, fontWeight: '800', color: colors.text, paddingHorizontal: 4 },
  range: { alignSelf: 'flex-start', marginTop: 10, marginLeft: 4, backgroundColor: 'rgba(255,255,255,0.8)', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 7, borderWidth: 1, borderColor: 'rgba(0,0,0,0.05)' },
  rangeTxt: { fontSize: 13.5, fontWeight: '700', color: colors.primary },
  label: { fontSize: 14, fontWeight: '700', color: colors.text },
  big: { fontSize: 34, fontWeight: '800', color: colors.text, marginTop: 4 },
  vs: { fontSize: 13, marginTop: 2 },
});
