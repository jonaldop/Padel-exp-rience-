import { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Image,
  ScrollView,
  Linking,
  Alert,
} from 'react-native';
import { api, auth } from '../api';
import { colors } from '../theme';
import { formatFr } from '../format';

// Formules affichées à l'inscription (remplacées par l'API au chargement)
const FALLBACK_PLANS = [
  { key: 'essentiel', name: 'Essentiel', monthlyPrice: 12.99 },
  { key: 'pro', name: 'Pro', monthlyPrice: 29 },
  { key: 'business', name: 'Business', monthlyPrice: 45 },
];

// Types de numéros proposés (les 06/07 n'existent pas en VoIP)
const NUM_TYPES: [string, string][] = [
  ['geographic', 'Régional (01-05)'],
  ['non_geo', 'National (09)'],
];

export function LoginScreen({ onLoggedIn }: { onLoggedIn: () => void }) {
  const [mode, setMode] = useState<'login' | 'register' | 'number'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  // Forfait choisi à l'inscription
  const [plans, setPlans] = useState<any[]>(FALLBACK_PLANS);
  const [plan, setPlan] = useState('pro');
  // Étape "choisissez votre numéro"
  const [numType, setNumType] = useState('geographic');
  const [numContains, setNumContains] = useState('');
  const [numAvailable, setNumAvailable] = useState<any[]>([]);
  const [numLoading, setNumLoading] = useState(false);
  const [numBuying, setNumBuying] = useState<string | null>(null);
  // Numéro choisi AVANT la création du compte (réservé à l'inscription)
  const [draftNumber, setDraftNumber] = useState<any | null>(null);
  const [accountCreated, setAccountCreated] = useState(false);
  const [billingOn, setBillingOn] = useState(false);

  useEffect(() => {
    api.plans().then((r) => { if (r?.plans?.length) setPlans(r.plans); }).catch(() => {});
  }, []);

  async function submit() {
    setError(null);
    setLoading(true);
    try {
      if (mode === 'login') {
        const res = await api.login(email, password);
        await auth.set(res.token);
        onLoggedIn();
      } else {
        const res = await api.register({ email, password, companyName, plan });
        await auth.set(res.token);
        setAccountCreated(true);
        let billing = false;
        try {
          const b = await api.billingStatus();
          billing = Boolean(b?.enabled);
          setBillingOn(billing);
        } catch { /* billing indisponible → mode sans paiement */ }
        if (draftNumber) {
          // PAIEMENT D'ABORD : Stripe branché -> réservation, achat après
          // confirmation du paiement ; sinon achat direct (mode test).
          try {
            const r = billing
              ? await api.reserveNumber(draftNumber.e164, draftNumber.type)
              : await api.buyNumber(draftNumber.e164, draftNumber.type);
            if (!r?.error || r?.reserved) {
              if (billing) await paySubscription(draftNumber.e164);
              onLoggedIn();
              return;
            }
          } catch { /* numéro pris entre-temps → on repropose */ }
          setDraftNumber(null);
          setError("Ce numéro vient d'être pris — choisissez-en un autre 👇");
          setMode('number');
          loadNumbers(numType, numContains);
        } else {
          setMode('number');
          loadNumbers('geographic', '');
        }
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function loadNumbers(t = numType, c = numContains) {
    setNumLoading(true);
    try {
      const r = await api.availableNumbers(t, c);
      setNumAvailable(Array.isArray(r) ? r : []);
    } catch {
      setNumAvailable([]);
    } finally {
      setNumLoading(false);
    }
  }

  async function chooseNumber(a: any) {
    if (!accountCreated) {
      // Avant le compte : on mémorise le choix, réservation à l'inscription.
      setDraftNumber(a);
      setError(null);
      setMode('register');
      return;
    }
    setError(null);
    setNumBuying(a.e164);
    try {
      const r = billingOn
        ? await api.reserveNumber(a.e164, a.type)
        : await api.buyNumber(a.e164, a.type);
      if (r?.error && !r?.reserved) { setError(r.error); return; }
      if (billingOn) await paySubscription(a.e164);
      onLoggedIn();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setNumBuying(null);
    }
  }

  /** Ouvre la page de paiement Stripe (Safari) : le numéro réservé est
   *  acheté et mis en service automatiquement après le paiement. */
  async function paySubscription(e164: string) {
    // App Store 3.1.1 : l'app iOS ne vend rien — l'activation se fait sur le web.
    if (Platform.OS === 'ios') {
      Alert.alert(
        '📞 Numéro réservé !',
        `Votre compte est créé et le ${formatFr(e164)} est réservé. Pour le mettre en service, activez votre abonnement depuis votre espace sur www.allojoe.fr.`,
      );
      return;
    }
    try {
      const r = await api.subscribe();
      if (r?.url) {
        Alert.alert(
          '📞 Numéro réservé !',
          'Réglez votre abonnement sur la page qui s\u2019ouvre : votre ligne est mise en service immédiatement après le paiement.',
        );
        await Linking.openURL(r.url);
      }
    } catch { /* le paiement reste possible depuis l'espace web */ }
  }

  /** Bouton S'inscrire : le choix du numéro est la première étape. */
  function startSignup() {
    setError(null);
    setMode('number');
    if (!numAvailable.length) loadNumbers('geographic', '');
  }

  const priceOf = (n: number) => n?.toLocaleString('fr-FR', { minimumFractionDigits: n % 1 ? 2 : 0 });

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={s.container}
    >
      <ScrollView
        contentContainerStyle={s.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
      <View style={s.logo}>
        <Image source={require('../../assets/mascotte.png')} style={s.logoImg} resizeMode="contain" />
      </View>
      <Text style={s.title}>Joe</Text>
      <Text style={s.tag}>Ta ligne pro</Text>
      <Text style={s.subtitle}>
        {mode === 'login'
          ? 'Connexion à votre espace'
          : mode === 'register'
            ? 'Créez votre compte'
            : 'Choisissez votre numéro pro 📞'}
      </Text>

      {mode === 'number' ? (
        <View style={s.card}>
          <Text style={s.numIntro}>
            {accountCreated
              ? '✅ Compte créé ! Choisissez votre numéro — il est mis en service dès le paiement de votre abonnement.'
              : 'Étape 1 sur 2 — votre numéro est inclus dans votre forfait et mis en service dès le paiement.'}
          </Text>

          <View style={s.numTypes}>
            {NUM_TYPES.map(([key, label]) => {
              const on = numType === key;
              return (
                <TouchableOpacity
                  key={key}
                  style={[s.numType, on && s.numTypeOn]}
                  onPress={() => { setNumType(key); loadNumbers(key, numContains); }}
                >
                  <Text style={[s.numTypeTxt, on && s.numTypeTxtOn]}>{label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
            <TextInput
              style={[s.input, { flex: 1, marginBottom: 0 }]}
              placeholder="Chiffres : 01, 4242…"
              placeholderTextColor={colors.muted}
              value={numContains}
              onChangeText={setNumContains}
              keyboardType="number-pad"
              returnKeyType="search"
              onSubmitEditing={() => loadNumbers()}
            />
            <TouchableOpacity style={s.searchBtn} onPress={() => loadNumbers()}>
              <Text style={{ fontSize: 18 }}>🔍</Text>
            </TouchableOpacity>
          </View>

          {error && <Text style={[s.error, { marginTop: 10 }]}>⚠️ {error}</Text>}

          {numLoading ? (
            <ActivityIndicator color={colors.primary} style={{ marginVertical: 22 }} />
          ) : numAvailable.length === 0 ? (
            <Text style={s.numEmpty}>Aucun numéro trouvé — essayez d'autres chiffres ou l'autre type.</Text>
          ) : (
            <View style={{ marginTop: 12, gap: 8 }}>
              {numAvailable.slice(0, 5).map((a) => (
                <View key={a.e164} style={s.numRow}>
                  <View>
                    <Text style={s.numE164}>{formatFr(a.e164)}</Text>
                    <Text style={s.numSub}>Inclus dans votre forfait</Text>
                  </View>
                  <TouchableOpacity
                    style={[s.numChoose, numBuying !== null && { opacity: 0.5 }]}
                    disabled={numBuying !== null}
                    onPress={() => chooseNumber(a)}
                  >
                    <Text style={s.numChooseTxt}>{numBuying === a.e164 ? '…' : 'Choisir'}</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}

          <TouchableOpacity
            onPress={accountCreated ? onLoggedIn : () => { setDraftNumber(null); setMode('register'); }}
          >
            <Text style={[s.link, { marginTop: 16, marginBottom: 2 }]}>Choisir mon numéro plus tard →</Text>
          </TouchableOpacity>
          {!accountCreated && (
            <TouchableOpacity onPress={() => { setError(null); setMode('login'); }}>
              <Text style={[s.link, { marginTop: 12, marginBottom: 2 }]}>Déjà inscrit ? Se connecter</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <>
          <View style={s.card}>
            {mode === 'register' && (
              <>
                {draftNumber && (
                  <View style={s.draftNum}>
                    <View>
                      <Text style={s.draftLbl}>Votre numéro</Text>
                      <Text style={s.draftE164}>📞 {formatFr(draftNumber.e164)}</Text>
                    </View>
                    <TouchableOpacity onPress={() => { setError(null); setMode('number'); }}>
                      <Text style={{ color: colors.primary, fontWeight: '700', fontSize: 13.5 }}>Changer</Text>
                    </TouchableOpacity>
                  </View>
                )}
                <View style={s.plans}>
                  {plans.map((p) => {
                    const on = plan === p.key;
                    return (
                      <TouchableOpacity
                        key={p.key}
                        style={[s.plan, on && s.planOn]}
                        onPress={() => setPlan(p.key)}
                      >
                        <Text style={[s.planName, on && { color: colors.primary }]}>{p.name}</Text>
                        <Text style={s.planPrice}>{priceOf(p.monthlyPrice)} € HT/mois</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
                <TextInput
                  style={s.input}
                  placeholder="Nom de l'entreprise"
                  placeholderTextColor={colors.muted}
                  value={companyName}
                  onChangeText={setCompanyName}
                  autoCapitalize="words"
                />
              </>
            )}
            <TextInput
              style={s.input}
              placeholder="Email"
              placeholderTextColor={colors.muted}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
            />
            <TextInput
              style={s.input}
              placeholder="Mot de passe"
              placeholderTextColor={colors.muted}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />
            {error && <Text style={s.error}>⚠️ {error}</Text>}
            <TouchableOpacity style={s.button} onPress={submit} disabled={loading}>
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={s.buttonText}>
                  {mode === 'login'
                    ? 'Se connecter'
                    : draftNumber
                      ? 'Réserver mon numéro'
                      : 'Créer mon compte'}
                </Text>
              )}
            </TouchableOpacity>
            {mode === 'register' && (
              <Text style={s.reassure}>✓ Sans engagement · ✓ Résiliable en 1 clic</Text>
            )}
          </View>

          <TouchableOpacity
            onPress={() => {
              if (mode === 'login') startSignup();
              else { setError(null); setMode('login'); }
            }}
          >
            <Text style={s.link}>
              {mode === 'login' ? "Pas de compte ? S'inscrire" : 'Déjà inscrit ? Se connecter'}
            </Text>
          </TouchableOpacity>
        </>
      )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  scroll: { flexGrow: 1, justifyContent: 'center', padding: 24, paddingVertical: 48 },
  logo: {
    alignSelf: 'center',
    width: 84,
    height: 84,
    borderRadius: 22,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
    shadowColor: colors.primary,
    shadowOpacity: 0.25,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  logoImg: { width: 72, height: 46 },
  title: { fontSize: 26, fontWeight: '800', textAlign: 'center', color: colors.text },
  tag: { fontSize: 13, fontWeight: '600', color: colors.muted, textAlign: 'center', marginTop: -2 },
  subtitle: { fontSize: 15, color: colors.muted, textAlign: 'center', marginTop: 8, marginBottom: 24 },
  card: {
    backgroundColor: colors.card,
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: colors.border,
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    marginBottom: 12,
    color: colors.text,
  },
  button: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    padding: 15,
    alignItems: 'center',
    marginTop: 4,
  },
  buttonText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  error: { color: colors.red, marginBottom: 10 },
  link: { color: colors.primary, textAlign: 'center', marginTop: 18, fontWeight: '600' },
  reassure: { textAlign: 'center', color: colors.muted, fontSize: 12.5, marginTop: 12 },
  // Forfaits (inscription)
  plans: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  plan: {
    flex: 1, borderRadius: 12, paddingVertical: 10, paddingHorizontal: 6, alignItems: 'center',
    borderWidth: 1, borderColor: colors.border, backgroundColor: '#fff',
  },
  planOn: { borderWidth: 2, borderColor: colors.primary, backgroundColor: '#EFEBFF' },
  planName: { fontSize: 13.5, fontWeight: '800', color: colors.text },
  planPrice: { fontSize: 11.5, color: colors.muted, marginTop: 2 },
  // Étape numéro
  numIntro: { fontSize: 13.5, color: '#1a7f37', backgroundColor: '#e7f9ec', borderRadius: 10, padding: 10, lineHeight: 18 },
  numTypes: { flexDirection: 'row', gap: 8, marginTop: 12 },
  numType: {
    flex: 1, paddingVertical: 10, borderRadius: 12, alignItems: 'center',
    borderWidth: 1, borderColor: colors.border, backgroundColor: '#fff',
  },
  numTypeOn: { borderWidth: 2, borderColor: colors.primary, backgroundColor: '#EFEBFF' },
  numTypeTxt: { fontSize: 13, fontWeight: '700', color: colors.muted },
  numTypeTxtOn: { color: colors.primary },
  searchBtn: {
    width: 50, borderRadius: 12, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: colors.border, backgroundColor: '#fff',
  },
  numEmpty: { color: colors.muted, fontSize: 13.5, textAlign: 'center', marginVertical: 18, lineHeight: 19 },
  numRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#fff', borderRadius: 13, borderWidth: 1, borderColor: colors.border,
    paddingVertical: 11, paddingHorizontal: 13,
  },
  numE164: { fontSize: 16, fontWeight: '800', color: colors.text, letterSpacing: 0.3 },
  numSub: { fontSize: 11.5, color: colors.muted, marginTop: 1 },
  numChoose: { backgroundColor: colors.primary, borderRadius: 11, paddingVertical: 9, paddingHorizontal: 16 },
  numChooseTxt: { color: '#fff', fontSize: 13.5, fontWeight: '800' },
  // Numéro choisi avant l'inscription (rappel dans le formulaire)
  draftNum: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    borderWidth: 2, borderColor: colors.primary, backgroundColor: '#EFEBFF',
    borderRadius: 13, paddingVertical: 10, paddingHorizontal: 13, marginBottom: 12,
  },
  draftLbl: { fontSize: 11.5, color: colors.muted, fontWeight: '600' },
  draftE164: { fontSize: 16, fontWeight: '800', color: colors.text, marginTop: 1 },
});
