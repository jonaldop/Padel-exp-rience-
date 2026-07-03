import { useCallback, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, RefreshControl, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { api } from '../api';
import { colors } from '../theme';
import { GradientBg, Glass, Delta, BarChart } from '../ui';

const DAY_LABELS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
const DAY_MS = 86400000;

type PeriodKey = 'today' | 'yesterday' | '7d' | 'month' | 'lastMonth';
const PERIODS: [PeriodKey, string][] = [
  ['today', "Aujourd'hui"],
  ['yesterday', 'Hier'],
  ['7d', '7 jours'],
  ['month', 'Mois en cours'],
  ['lastMonth', 'Mois dernier'],
];

export function StatsScreen() {
  const insets = useSafeAreaInsets();
  const [calls, setCalls] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [period, setPeriod] = useState<PeriodKey>('7d');

  const load = useCallback(() => {
    setLoading(true);
    api.history().then((c) => setCalls(Array.isArray(c) ? c : [])).catch(() => {}).finally(() => setLoading(false));
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const now = new Date();
  const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).getTime();
  const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 2, 1).getTime();

  // Bornes [début, fin) de la période choisie + période précédente (pour l'évolution)
  const RANGES: Record<PeriodKey, { cur: [number, number]; prev: [number, number]; vs: string }> = {
    today: { cur: [dayStart, dayStart + DAY_MS], prev: [dayStart - DAY_MS, dayStart], vs: 'vs hier' },
    yesterday: { cur: [dayStart - DAY_MS, dayStart], prev: [dayStart - 2 * DAY_MS, dayStart - DAY_MS], vs: 'vs avant-hier' },
    '7d': { cur: [dayStart - 6 * DAY_MS, dayStart + DAY_MS], prev: [dayStart - 13 * DAY_MS, dayStart - 6 * DAY_MS], vs: 'vs semaine précédente' },
    month: { cur: [monthStart, dayStart + DAY_MS], prev: [lastMonthStart, monthStart], vs: 'vs mois dernier' },
    lastMonth: { cur: [lastMonthStart, monthStart], prev: [prevMonthStart, lastMonthStart], vs: 'vs mois précédent' },
  };
  const range = RANGES[period];
  const inRange = (c: any, [a, b]: [number, number]) => {
    const t = new Date(c.startedAt).getTime();
    return t >= a && t < b;
  };
  const cur = calls.filter((c) => inRange(c, range.cur));
  const prev = calls.filter((c) => inRange(c, range.prev));

  const total = cur.length;
  const prevTotal = prev.length;
  const totalDelta = prevTotal === 0 ? null : Math.round(((total - prevTotal) / prevTotal) * 100);

  const answered = (c: any) => ['answered', 'completed', 'forwarded'].includes(c.status);
  const inbound = cur.filter((c) => c.direction === 'inbound');
  const taux = inbound.length === 0 ? 0 : Math.round((inbound.filter(answered).length / inbound.length) * 100);
  const prevInbound = prev.filter((c) => c.direction === 'inbound');
  const prevTaux = prevInbound.length === 0 ? 0 : Math.round((prevInbound.filter(answered).length / prevInbound.length) * 100);
  const tauxDelta = prevTaux === 0 ? null : Math.round(((taux - prevTaux) / prevTaux) * 100);

  const hourBuckets = [8, 10, 12, 14, 16, 18];
  const perHour = hourBuckets.map((h) => cur.filter((c) => {
    const hr = new Date(c.startedAt).getHours();
    return hr >= h && hr < h + 2;
  }).length);

  // Graphique principal adapté à la période : heures (jour), jours (semaine), semaines (mois)
  const singleDay = period === 'today' || period === 'yesterday';
  let chartData: number[];
  let chartLabels: string[];
  if (singleDay) {
    chartData = perHour;
    chartLabels = hourBuckets.map((h) => `${h}h`);
  } else if (period === '7d') {
    const perDay = [0, 0, 0, 0, 0, 0, 0];
    for (const c of cur) {
      const idx = (new Date(c.startedAt).getDay() + 6) % 7; // 0=lun..6=dim
      perDay[idx]++;
    }
    chartData = perDay;
    chartLabels = DAY_LABELS;
  } else {
    const base = range.cur[0];
    const monthEnd = period === 'month'
      ? new Date(now.getFullYear(), now.getMonth() + 1, 1).getTime()
      : monthStart;
    const nWeeks = Math.ceil((monthEnd - base) / (7 * DAY_MS));
    const perWeek = Array(nWeeks).fill(0);
    for (const c of cur) {
      const idx = Math.min(nWeeks - 1, Math.floor((new Date(c.startedAt).getTime() - base) / (7 * DAY_MS)));
      if (idx >= 0) perWeek[idx]++;
    }
    chartData = perWeek;
    chartLabels = perWeek.map((_, i) => `S${i + 1}`);
  }

  return (
    <GradientBg>
      <ScrollView
        contentContainerStyle={{ paddingTop: insets.top + 52, paddingHorizontal: 16, paddingBottom: 130 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={colors.primary} />}
      >
        <Text style={s.title}>Statistiques</Text>

        {/* Filtres de période */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 10 }} contentContainerStyle={{ gap: 8, paddingHorizontal: 4 }}>
          {PERIODS.map(([key, label]) => {
            const on = period === key;
            return (
              <TouchableOpacity key={key} style={[s.chip, on && s.chipOn]} onPress={() => setPeriod(key)}>
                <Text style={[s.chipTxt, on && s.chipTxtOn]}>{label}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        <Glass strong style={{ marginTop: 16 }}>
          <Text style={s.label}>Nombre d'appels</Text>
          <Text style={s.big}>{total}</Text>
          {totalDelta !== null && (
            <Text style={s.vs}>
              <Delta value={totalDelta} /> <Text style={{ color: colors.muted }}>{range.vs}</Text>
            </Text>
          )}
          <View style={{ marginTop: 14 }}>
            <BarChart data={chartData} labels={chartLabels} color={colors.primaryBlue} height={80} />
          </View>
        </Glass>

        <Glass strong style={{ marginTop: 14 }}>
          <Text style={s.label}>Taux de réponse</Text>
          <Text style={s.big}>{taux}%</Text>
          {tauxDelta !== null && (
            <Text style={s.vs}>
              <Delta value={tauxDelta} /> <Text style={{ color: colors.muted }}>{range.vs}</Text>
            </Text>
          )}
        </Glass>

        {!singleDay && (
          <Glass strong style={{ marginTop: 14 }}>
            <Text style={s.label}>Heures les plus actives</Text>
            <View style={{ marginTop: 14 }}>
              <BarChart data={perHour} labels={hourBuckets.map((h) => `${h}h`)} color={colors.primary} height={90} />
            </View>
          </Glass>
        )}
      </ScrollView>
    </GradientBg>
  );
}

const s = StyleSheet.create({
  title: { fontSize: 28, fontWeight: '800', color: colors.text, paddingHorizontal: 4 },
  chip: {
    backgroundColor: 'rgba(255,255,255,0.8)', borderRadius: 12, paddingHorizontal: 14,
    paddingVertical: 8, borderWidth: 1, borderColor: 'rgba(0,0,0,0.05)',
  },
  chipOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipTxt: { fontSize: 13.5, fontWeight: '700', color: colors.primary },
  chipTxtOn: { color: '#fff' },
  label: { fontSize: 14, fontWeight: '700', color: colors.text },
  big: { fontSize: 34, fontWeight: '800', color: colors.text, marginTop: 4 },
  vs: { fontSize: 13, marginTop: 2 },
});
