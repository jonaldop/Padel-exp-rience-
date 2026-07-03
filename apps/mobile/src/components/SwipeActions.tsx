import { useRef } from 'react';
import { Animated, PanResponder, View, Text, TouchableOpacity, StyleSheet } from 'react-native';

/**
 * Glisser vers la gauche façon iOS : révèle des actions (Partager, Supprimer…).
 * En pur JS (PanResponder + Animated) : aucun module natif requis, donc
 * compatible OTA avec tous les binaires.
 */
export type SwipeAction = {
  label: string;
  color: string; // fond du bouton
  onPress: () => void;
};

export function SwipeActions({
  children,
  actions,
  bottomGap = 10,
}: {
  children: React.ReactNode;
  actions: SwipeAction[];
  bottomGap?: number; // aligne le fond révélé avec la marge basse de la ligne
}) {
  const BTN_W = 82;
  const width = BTN_W * actions.length;
  const tx = useRef(new Animated.Value(0)).current;
  const isOpen = useRef(false);

  const snap = (open: boolean) => {
    isOpen.current = open;
    Animated.spring(tx, { toValue: open ? -width : 0, useNativeDriver: true, bounciness: 4 }).start();
  };

  const pan = useRef(
    PanResponder.create({
      // Ne capte que les gestes clairement HORIZONTAUX (laisse défiler la liste).
      onMoveShouldSetPanResponder: (_e, g) =>
        Math.abs(g.dx) > 12 && Math.abs(g.dx) > Math.abs(g.dy) * 1.5,
      onPanResponderMove: (_e, g) => {
        const base = isOpen.current ? -width : 0;
        tx.setValue(Math.min(0, Math.max(-width - 24, base + g.dx)));
      },
      onPanResponderRelease: (_e, g) => {
        const v = (isOpen.current ? -width : 0) + g.dx;
        snap(v < -width / 2);
      },
      onPanResponderTerminate: () => snap(isOpen.current),
    }),
  ).current;

  return (
    <View style={{ position: 'relative' }}>
      <View style={[s.actionsBg, { bottom: bottomGap }]}>
        {actions.map((a) => (
          <TouchableOpacity
            key={a.label}
            style={[s.actionBtn, { backgroundColor: a.color, width: BTN_W }]}
            onPress={() => {
              snap(false);
              a.onPress();
            }}
          >
            <Text style={s.actionTxt}>{a.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <Animated.View style={{ transform: [{ translateX: tx }] }} {...pan.panHandlers}>
        {children}
      </Animated.View>
    </View>
  );
}

const s = StyleSheet.create({
  actionsBg: {
    position: 'absolute',
    right: 0,
    top: 0,
    flexDirection: 'row',
    borderRadius: 18,
    overflow: 'hidden',
  },
  actionBtn: { alignItems: 'center', justifyContent: 'center', height: '100%' },
  actionTxt: { color: '#fff', fontWeight: '700', fontSize: 13.5 },
});
