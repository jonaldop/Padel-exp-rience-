import { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { api } from '../api';
import { colors } from '../theme';
import { GradientBg, Glass } from '../ui';
import { formatFr } from '../format';

export function PlusScreen({ onLogout }: { onLogout: () => void }) {
  const insets = useSafeAreaInsets();
  const nav = useNavigation<any>();
  const [me, setMe] = useState<any>(null);
  const [proNumber, setProNumber] = useState<string>('');

  useEffect(() => {
    api.me().then(setMe).catch(() => {});
    api.myNumbers().then((n: any[]) => setProNumber(n?.[0]?.e164 || '')).catch(() => {});
  }, []);

  const items: { icon: string; label: string; sub: string; onPress: () => void }[] = [
    { icon: '📊', label: 'Statistiques', sub: 'Appels, taux de réponse, heures actives', onPress: () => nav.navigate('Statistiques') },
    { icon: '👥', label: 'Clients', sub: 'Votre carnet de contacts', onPress: () => nav.navigate('Clients') },
  ];

  return (
    <GradientBg>
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + 8, paddingHorizontal: 16, paddingBottom: 130 }}>
        <Text style={s.title}>Plus</Text>

        <Glass strong style={s.account}>
          <View style={s.avatar}>
            <Text style={{ color: '#fff', fontWeight: '800', fontSize: 20 }}>
              {(me?.account?.companyName?.[0] || 'J').toUpperCase()}
            </Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.company}>{me?.account?.companyName || '—'}</Text>
            <Text style={s.email}>{me?.user?.email || '—'}</Text>
            {!!proNumber && <Text style={s.proLine}>📞 Ligne pro : {formatFr(proNumber)}</Text>}
            <View style={s.planPill}>
              <Text style={s.planTxt}>Formule {me?.account?.plan || 'starter'}</Text>
            </View>
          </View>
        </Glass>

        {items.map((it) => (
          <TouchableOpacity key={it.label} activeOpacity={0.85} onPress={it.onPress}>
            <Glass style={s.item}>
              <View style={s.itemIcon}><Text style={{ fontSize: 18 }}>{it.icon}</Text></View>
              <View style={{ flex: 1 }}>
                <Text style={s.itemLabel}>{it.label}</Text>
                <Text style={s.itemSub}>{it.sub}</Text>
              </View>
              <Text style={{ fontSize: 20, color: colors.muted }}>›</Text>
            </Glass>
          </TouchableOpacity>
        ))}

        <TouchableOpacity activeOpacity={0.85} onPress={onLogout}>
          <Glass style={[s.item, { justifyContent: 'center' }]}>
            <Text style={{ color: colors.red, fontWeight: '700', fontSize: 16 }}>Déconnexion</Text>
          </Glass>
        </TouchableOpacity>

        <Text style={s.version}>Joe — Ta ligne pro · v1.0</Text>
      </ScrollView>
    </GradientBg>
  );
}

const s = StyleSheet.create({
  title: { fontSize: 28, fontWeight: '800', color: colors.text, marginBottom: 14, paddingHorizontal: 4 },
  account: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  avatar: { width: 52, height: 52, borderRadius: 26, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', marginRight: 14 },
  company: { fontSize: 18, fontWeight: '800', color: colors.text },
  email: { fontSize: 13.5, color: colors.muted, marginTop: 2 },
  proLine: { fontSize: 13.5, color: colors.primary, fontWeight: '700', marginTop: 4 },
  planPill: { alignSelf: 'flex-start', marginTop: 8, backgroundColor: '#EFEAFF', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4 },
  planTxt: { fontSize: 12.5, fontWeight: '700', color: colors.primary },
  item: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, paddingVertical: 14 },
  itemIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#E8EEFF', alignItems: 'center', justifyContent: 'center', marginRight: 14 },
  itemLabel: { fontSize: 16, fontWeight: '700', color: colors.text },
  itemSub: { fontSize: 13, color: colors.muted, marginTop: 1 },
  version: { textAlign: 'center', color: colors.muted, fontSize: 12.5, marginTop: 10 },
});
