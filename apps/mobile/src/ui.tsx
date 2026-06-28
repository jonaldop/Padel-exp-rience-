import { ReactNode } from 'react';
import { View, Text, StyleSheet, ViewStyle, StyleProp } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, gradients, glass } from './theme';

/** Fond d'écran dégradé lavande/bleu, commun à toute l'app. */
export function GradientBg({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return (
    <LinearGradient colors={gradients.screen} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[{ flex: 1 }, style]}>
      {children}
    </LinearGradient>
  );
}

/** Carte "verre dépoli" : translucide, bord clair, ombre douce. */
export function Glass({
  children,
  style,
  strong,
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  strong?: boolean;
}) {
  return (
    <View
      style={[
        ui.glass,
        { backgroundColor: strong ? glass.fillStrong : glass.fill },
        style,
      ]}
    >
      {children}
    </View>
  );
}

/** Pastille de variation (+12% en vert, -2% en rouge). */
export function Delta({ value }: { value: number | null }) {
  if (value === null || Number.isNaN(value)) return null;
  const positive = value >= 0;
  return (
    <Text style={{ fontSize: 12.5, fontWeight: '700', color: positive ? colors.green : colors.red }}>
      {positive ? '+' : ''}
      {value}%
    </Text>
  );
}

/** Mini visualisation type "ondes vocales" (barres verticales). */
export function Waveform({ bars = 40, color = colors.primary }: { bars?: number; color?: string }) {
  // Hauteurs pseudo-aléatoires mais déterministes (pas de Math.random au render).
  const heights = Array.from({ length: bars }, (_, i) => {
    const v = Math.abs(Math.sin(i * 1.7) * Math.cos(i * 0.6));
    return 4 + Math.round(v * 22);
  });
  return (
    <View style={ui.wave}>
      {heights.map((h, i) => (
        <View
          key={i}
          style={{
            width: 3,
            height: h,
            borderRadius: 2,
            marginHorizontal: 1.5,
            backgroundColor: color,
            opacity: 0.35 + (h / 26) * 0.65,
          }}
        />
      ))}
    </View>
  );
}

/** Barres verticales pour un graphique simple (heures, jours...). */
export function BarChart({
  data,
  labels,
  color = colors.primary,
  height = 90,
}: {
  data: number[];
  labels?: string[];
  color?: string;
  height?: number;
}) {
  const max = Math.max(1, ...data);
  return (
    <View>
      <View style={[ui.barRow, { height }]}>
        {data.map((v, i) => (
          <View key={i} style={ui.barCol}>
            <View
              style={{
                width: '70%',
                height: Math.max(4, (v / max) * height),
                borderRadius: 6,
                backgroundColor: color,
                opacity: 0.55 + (v / max) * 0.45,
              }}
            />
          </View>
        ))}
      </View>
      {labels && (
        <View style={ui.barRow}>
          {labels.map((l, i) => (
            <View key={i} style={ui.barCol}>
              <Text style={ui.barLabel}>{l}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

const ui = StyleSheet.create({
  glass: {
    borderRadius: 22,
    borderWidth: 1,
    borderColor: glass.border,
    padding: 16,
    shadowColor: glass.shadow,
    shadowOpacity: 1,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
  },
  wave: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 30,
  },
  barRow: { flexDirection: 'row', alignItems: 'flex-end' },
  barCol: { flex: 1, alignItems: 'center', justifyContent: 'flex-end' },
  barLabel: { fontSize: 11, color: colors.muted, marginTop: 6 },
});
