import { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Linking } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../api';
import { colors } from '../theme';
import { GradientBg, Glass } from '../ui';
import { formatFr, toE164Fr } from '../format';

export function ContactDetailScreen() {
  const insets = useSafeAreaInsets();
  const nav = useNavigation<any>();
  const route = useRoute<any>();
  const contact = route.params?.contact || { name: '', phones: [], emails: [] };
  const [proNumber, setProNumber] = useState<string | undefined>(undefined);

  useEffect(() => {
    api.myNumbers().then((n: any[]) => setProNumber(n?.[0]?.e164)).catch(() => {});
  }, []);

  const initial = (contact.name?.[0] || '?').toUpperCase();

  const callNumber = (num: string) => {
    nav.navigate('Appel', { number: toE164Fr(num), callerId: proNumber, name: contact.name });
  };

  return (
    <GradientBg>
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + 8, paddingHorizontal: 16, paddingBottom: 50 }}>
        {/* Barre retour */}
        <TouchableOpacity style={s.back} onPress={() => nav.goBack()}>
          <Ionicons name="chevron-back" size={26} color={colors.primary} />
          <Text style={s.backTxt}>Répertoire</Text>
        </TouchableOpacity>

        {/* En-tête fiche */}
        <View style={s.head}>
          <View style={s.avatar}><Text style={s.avatarTxt}>{initial}</Text></View>
          <Text style={s.name}>{contact.name}</Text>
          {!!contact.company && <Text style={s.company}>{contact.company}</Text>}
        </View>

        {/* Actions rapides */}
        {contact.phones?.[0] && (
          <View style={s.quick}>
            <QuickAction icon="call" label="Appeler" onPress={() => callNumber(contact.phones[0])} />
            {/* Conversation PRO dans Joe (depuis le numéro pro, pas le perso). */}
            <QuickAction
              icon="chatbubble"
              label="Message"
              onPress={() => nav.navigate('Conversation', { peer: toE164Fr(contact.phones[0]), name: contact.name })}
            />
            {contact.emails?.[0] && (
              <QuickAction icon="mail" label="E-mail" onPress={() => Linking.openURL(`mailto:${contact.emails[0]}`)} />
            )}
          </View>
        )}

        {/* Numéros */}
        {contact.phones?.length > 0 && (
          <>
            <Text style={s.section}>Téléphone{contact.phones.length > 1 ? 's' : ''}</Text>
            <Glass style={{ paddingVertical: 4 }}>
              {contact.phones.map((p: string, i: number) => (
                <TouchableOpacity key={p + i} style={[s.row, i > 0 && s.divider]} onPress={() => callNumber(p)}>
                  <View style={{ flex: 1 }}>
                    <Text style={s.rowLabel}>mobile</Text>
                    <Text style={s.rowValue}>{formatFr(p)}</Text>
                  </View>
                  <View style={s.callDot}><Ionicons name="call" size={18} color={colors.green} /></View>
                </TouchableOpacity>
              ))}
            </Glass>
          </>
        )}

        {/* Emails */}
        {contact.emails?.length > 0 && (
          <>
            <Text style={s.section}>E-mail{contact.emails.length > 1 ? 's' : ''}</Text>
            <Glass style={{ paddingVertical: 4 }}>
              {contact.emails.map((e: string, i: number) => (
                <TouchableOpacity key={e + i} style={[s.row, i > 0 && s.divider]} onPress={() => Linking.openURL(`mailto:${e}`)}>
                  <View style={{ flex: 1 }}>
                    <Text style={s.rowLabel}>e-mail</Text>
                    <Text style={s.rowValue}>{e}</Text>
                  </View>
                  <View style={s.callDot}><Ionicons name="mail" size={17} color={colors.primary} /></View>
                </TouchableOpacity>
              ))}
            </Glass>
          </>
        )}
      </ScrollView>
    </GradientBg>
  );
}

function QuickAction({ icon, label, onPress }: { icon: any; label: string; onPress: () => void }) {
  return (
    <TouchableOpacity style={s.qa} onPress={onPress} activeOpacity={0.85}>
      <View style={s.qaBtn}><Ionicons name={icon} size={22} color={colors.primary} /></View>
      <Text style={s.qaLabel}>{label}</Text>
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  back: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  backTxt: { color: colors.primary, fontSize: 16, fontWeight: '600' },
  head: { alignItems: 'center', marginTop: 8, marginBottom: 18 },
  avatar: {
    width: 96, height: 96, borderRadius: 48, backgroundColor: '#E8EEFF',
    alignItems: 'center', justifyContent: 'center', marginBottom: 12,
  },
  avatarTxt: { fontSize: 40, fontWeight: '800', color: colors.primary },
  name: { fontSize: 24, fontWeight: '800', color: colors.text, textAlign: 'center' },
  company: { fontSize: 15, color: colors.muted, marginTop: 4 },
  quick: { flexDirection: 'row', justifyContent: 'center', gap: 28, marginBottom: 20 },
  qa: { alignItems: 'center' },
  qaBtn: {
    width: 54, height: 54, borderRadius: 27, backgroundColor: 'rgba(108,92,231,0.12)',
    alignItems: 'center', justifyContent: 'center', marginBottom: 6,
  },
  qaLabel: { fontSize: 12.5, color: colors.primary, fontWeight: '600' },
  section: { fontSize: 14, fontWeight: '800', color: colors.muted, marginTop: 14, marginBottom: 8, paddingHorizontal: 4, textTransform: 'uppercase', letterSpacing: 0.5 },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 14 },
  divider: { borderTopWidth: 1, borderTopColor: 'rgba(0,0,0,0.06)' },
  rowLabel: { fontSize: 12.5, color: colors.muted },
  rowValue: { fontSize: 16, color: colors.text, fontWeight: '600', marginTop: 2 },
  callDot: { width: 38, height: 38, borderRadius: 19, backgroundColor: '#E7F7EE', alignItems: 'center', justifyContent: 'center' },
});
