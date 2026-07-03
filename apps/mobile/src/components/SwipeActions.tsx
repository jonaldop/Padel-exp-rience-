import { useEffect, useRef, useState } from 'react';
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

// Une seule ligne ouverte à la fois (comportement iOS) : registre des
// fermetures, la ligne qui s'ouvre referme les autres.
const closers = new Set<() => void>();

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
  // Les cartes sont en verre SEMI-TRANSPARENT : les actions ne doivent exister
  // dans l'arbre QUE pendant le glissement, sinon elles se voient à travers.
  const [engaged, setEngaged] = useState(false);

  const snap = (open: boolean) => {
    isOpen.current = open;
    Animated.spring(tx, { toValue: open ? -width : 0, useNativeDriver: true, bounciness: 4 }).start(
      () => {
        if (!open) {
          // Remise à zéro DURE : même si l'animation a été interrompue par un
          // re-rendu de la liste, une ligne fermée est toujours à sa place.
          tx.setValue(0);
          setEngaged(false);
        }
      },
    );
  };

  const close = () => { if (isOpen.current) snap(false); };

  const pan = useRef(
    PanResponder.create({
      // Ne capte que les gestes clairement HORIZONTAUX (laisse défiler la liste).
      onMoveShouldSetPanResponder: (_e, g) => {
        const take = Math.abs(g.dx) > 12 && Math.abs(g.dx) > Math.abs(g.dy) * 1.5;
        if (take) {
          setEngaged(true);
          // Referme les autres lignes (une seule ouverte à la fois).
          closers.forEach((c) => { if (c !== closeRef.current) c(); });
        }
        return take;
      },
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

  // Registre "une seule ligne ouverte" : inscription au montage, retrait au démontage.
  const closeRef = useRef(close);
  closeRef.current = close;
  useEffect(() => {
    const c = () => closeRef.current();
    closers.add(c);
    return () => { closers.delete(c); };
  }, []);

  return (
    <View style={{ position: 'relative' }}>
      {engaged && (
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
      )}
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
