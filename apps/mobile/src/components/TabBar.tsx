import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, gradients, glass } from '../theme';

const ICONS: Record<string, string> = {
  Accueil: '🏠',
  Appels: '📞',
  Messages: '💬',
  Plus: '☰',
};

/** Grille 3x3 (clavier) dessinée en points blancs, pour le FAB central. */
function DialpadGlyph() {
  return (
    <View style={s.dialpad}>
      {Array.from({ length: 9 }).map((_, i) => (
        <View key={i} style={s.dot} />
      ))}
    </View>
  );
}

export function TabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const centerIndex = Math.floor(state.routes.length / 2);

  return (
    <View style={[s.wrap, { paddingBottom: Math.max(insets.bottom, 10) }]}>
      <View style={s.bar}>
        {state.routes.map((route, index) => {
          const focused = state.index === index;
          const { options } = descriptors[route.key];
          const badge = options.tabBarBadge as number | undefined;

          const onPress = () => {
            const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
            if (!focused && !event.defaultPrevented) navigation.navigate(route.name);
          };

          // FAB central (clavier)
          if (index === centerIndex) {
            return (
              <TouchableOpacity key={route.key} onPress={onPress} activeOpacity={0.85} style={s.fabSlot}>
                <LinearGradient colors={gradients.brand} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.fab}>
                  <DialpadGlyph />
                </LinearGradient>
              </TouchableOpacity>
            );
          }

          return (
            <TouchableOpacity key={route.key} onPress={onPress} activeOpacity={0.7} style={s.item}>
              <View>
                <Text style={{ fontSize: 21, opacity: focused ? 1 : 0.45 }}>{ICONS[route.name] || '•'}</Text>
                {!!badge && (
                  <View style={s.badge}>
                    <Text style={s.badgeTxt}>{badge}</Text>
                  </View>
                )}
              </View>
              <Text style={[s.label, { color: focused ? colors.primary : colors.muted }]}>{route.name}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 14,
    backgroundColor: 'transparent',
  },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: glass.fillStrong,
    borderRadius: 26,
    borderWidth: 1,
    borderColor: glass.border,
    paddingVertical: 8,
    paddingHorizontal: 6,
    shadowColor: glass.shadow,
    shadowOpacity: 1,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 8,
  },
  item: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 4 },
  label: { fontSize: 11, fontWeight: '600', marginTop: 3 },
  fabSlot: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  fab: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -34,
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.85)',
    shadowColor: colors.primary,
    shadowOpacity: 0.5,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 10,
  },
  dialpad: { width: 26, height: 26, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center' },
  dot: { width: 5, height: 5, borderRadius: 3, backgroundColor: '#fff', margin: 2 },
  badge: {
    position: 'absolute',
    top: -6,
    right: -10,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  badgeTxt: { color: '#fff', fontSize: 10, fontWeight: '800' },
});
