import { useCallback, useEffect, useRef, useState } from 'react';
import {
  View, Text, FlatList, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../api';
import { colors } from '../theme';
import { GradientBg } from '../ui';
import { formatFr } from '../format';
import { lookupContact } from '../contacts';

/** Conversation avec un client (bulles + composeur), style Messages iOS. */
export function ConversationScreen() {
  const insets = useSafeAreaInsets();
  const nav = useNavigation<any>();
  const route = useRoute<any>();
  const peer: string = route.params?.peer || '';
  const name: string | undefined = route.params?.name || lookupContact(peer) || undefined;

  const [messages, setMessages] = useState<any[]>([]);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const listRef = useRef<FlatList>(null);

  const load = useCallback(() => {
    api.thread(peer).then((m) => setMessages(Array.isArray(m) ? m : [])).catch(() => {});
  }, [peer]);

  // Chargement initial + rafraîchissement léger (les réponses entrantes apparaissent).
  useEffect(() => {
    load();
    const id = setInterval(load, 5000);
    return () => clearInterval(id);
  }, [load]);

  async function send() {
    const text = draft.trim();
    if (!text || sending) return;
    setSending(true);
    setSendError(null);
    setDraft('');
    try {
      const res = await api.sendMessage(peer, text);
      if (res?.error) setSendError(res.error);
    } catch (e: any) {
      setSendError(e?.message || "Échec de l'envoi");
    } finally {
      setSending(false);
      load();
    }
  }

  return (
    <GradientBg>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* En-tête */}
        <View style={[s.header, { paddingTop: insets.top + 6 }]}>
          <TouchableOpacity style={s.back} onPress={() => nav.goBack()}>
            <Ionicons name="chevron-back" size={26} color={colors.primary} />
          </TouchableOpacity>
          <View style={{ flex: 1, alignItems: 'center' }}>
            <Text style={s.headName} numberOfLines={1}>{name || formatFr(peer)}</Text>
            {!!name && <Text style={s.headSub}>{formatFr(peer)}</Text>}
          </View>
          <TouchableOpacity
            style={s.callBtn}
            onPress={() => nav.navigate('Clavier', { number: peer })}
          >
            <Ionicons name="call" size={18} color={colors.green} />
          </TouchableOpacity>
        </View>

        {/* Fil de messages */}
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(m) => m.id}
          contentContainerStyle={{ padding: 16, paddingBottom: 8 }}
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
          ListEmptyComponent={
            <Text style={s.empty}>
              Aucun message pour l'instant.{'\n'}Écrivez le premier message ci-dessous.
            </Text>
          }
          renderItem={({ item: m }) => {
            const out = m.direction === 'outbound';
            return (
              <View style={[s.bubbleRow, out ? { justifyContent: 'flex-end' } : null]}>
                <View style={[s.bubble, out ? s.bubbleOut : s.bubbleIn]}>
                  <Text style={[s.bubbleTxt, out ? { color: '#fff' } : null]}>{m.body}</Text>
                  <Text style={[s.bubbleMeta, out ? { color: 'rgba(255,255,255,0.75)' } : null]}>
                    {new Date(m.createdAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                    {out && m.status === 'failed' ? '  ·  échec' : ''}
                  </Text>
                </View>
              </View>
            );
          }}
        />

        {!!sendError && <Text style={s.sendError}>{sendError}</Text>}

        {/* Composeur */}
        <View style={[s.composer, { paddingBottom: insets.bottom + 8 }]}>
          <TextInput
            style={s.input}
            placeholder="Votre message…"
            placeholderTextColor={colors.muted}
            value={draft}
            onChangeText={setDraft}
            multiline
          />
          <TouchableOpacity
            style={[s.sendBtn, (!draft.trim() || sending) && { opacity: 0.4 }]}
            onPress={send}
            disabled={!draft.trim() || sending}
          >
            <Ionicons name="arrow-up" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </GradientBg>
  );
}

const s = StyleSheet.create({
  header: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingBottom: 10,
    borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  back: { width: 40, alignItems: 'flex-start' },
  headName: { fontSize: 17, fontWeight: '800', color: colors.text },
  headSub: { fontSize: 12, color: colors.muted, marginTop: 1 },
  callBtn: {
    width: 36, height: 36, borderRadius: 18, backgroundColor: '#E7F7EE',
    alignItems: 'center', justifyContent: 'center',
  },
  empty: { color: colors.muted, textAlign: 'center', marginTop: 60, lineHeight: 22 },
  bubbleRow: { flexDirection: 'row', marginBottom: 8 },
  bubble: { maxWidth: '78%', borderRadius: 18, paddingHorizontal: 14, paddingVertical: 9 },
  bubbleIn: { backgroundColor: 'rgba(255,255,255,0.85)', borderBottomLeftRadius: 6 },
  bubbleOut: { backgroundColor: colors.primary, borderBottomRightRadius: 6 },
  bubbleTxt: { fontSize: 15.5, color: colors.text },
  bubbleMeta: { fontSize: 10.5, color: colors.muted, marginTop: 4, alignSelf: 'flex-end' },
  sendError: { color: colors.red, fontSize: 12.5, textAlign: 'center', paddingHorizontal: 20, marginBottom: 4 },
  composer: {
    flexDirection: 'row', alignItems: 'flex-end', paddingHorizontal: 12, paddingTop: 8, gap: 8,
  },
  input: {
    flex: 1, backgroundColor: 'rgba(255,255,255,0.85)', borderRadius: 20, paddingHorizontal: 15,
    paddingTop: 10, paddingBottom: 10, fontSize: 15.5, color: colors.text, maxHeight: 110,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.9)',
  },
  sendBtn: {
    width: 38, height: 38, borderRadius: 19, backgroundColor: colors.primary,
    alignItems: 'center', justifyContent: 'center', marginBottom: 1,
  },
});
