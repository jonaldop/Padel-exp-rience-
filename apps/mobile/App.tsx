import { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, TouchableOpacity, StyleSheet } from 'react-native';
import { NavigationContainer, useNavigation, useRoute } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { api, auth } from './src/api';
import { colors } from './src/theme';
import { LoginScreen } from './src/screens/LoginScreen';
import { RecentsScreen } from './src/screens/RecentsScreen';
import { ClientsScreen } from './src/screens/ClientsScreen';
import { DialerScreen } from './src/screens/DialerScreen';
import { MessagesScreen } from './src/screens/MessagesScreen';

const Tab = createBottomTabNavigator();

function ClientsTab() {
  const navigation = useNavigation<any>();
  return <ClientsScreen onCall={(phone) => navigation.navigate('Clavier', { number: phone })} />;
}

function DialerTab() {
  const route = useRoute<any>();
  return <DialerScreen initialNumber={route.params?.number} />;
}

function ProfileScreen({ onLogout }: { onLogout: () => void }) {
  const [me, setMe] = useState<any>(null);
  useEffect(() => {
    api.me().then(setMe).catch(() => {});
  }, []);
  return (
    <View style={ps.container}>
      <Text style={ps.title}>Compte</Text>
      <View style={ps.card}>
        <Text style={ps.label}>Entreprise</Text>
        <Text style={ps.value}>{me?.account?.companyName || '—'}</Text>
        <Text style={[ps.label, { marginTop: 14 }]}>Email</Text>
        <Text style={ps.value}>{me?.user?.email || '—'}</Text>
      </View>
      <TouchableOpacity style={ps.logout} onPress={onLogout}>
        <Text style={{ color: colors.red, fontWeight: '700', fontSize: 16 }}>Déconnexion</Text>
      </TouchableOpacity>
    </View>
  );
}

const ICONS: Record<string, string> = {
  Récents: '🕓',
  Clients: '👤',
  Clavier: '🔢',
  Messagerie: '🎙️',
  Compte: '⚙️',
};

export default function App() {
  const [ready, setReady] = useState(false);
  const [authed, setAuthed] = useState(false);

  useEffect(() => {
    auth.load().then((t) => {
      setAuthed(!!t);
      setReady(true);
    });
  }, []);

  async function logout() {
    await auth.set(null);
    setAuthed(false);
  }

  if (!ready) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', backgroundColor: colors.bg }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      {!authed ? (
        <LoginScreen onLoggedIn={() => setAuthed(true)} />
      ) : (
        <NavigationContainer>
          <Tab.Navigator
            screenOptions={({ route }) => ({
              headerShown: false,
              tabBarActiveTintColor: colors.primary,
              tabBarInactiveTintColor: colors.muted,
              tabBarIcon: ({ color }) => (
                <Text style={{ fontSize: 20, opacity: color === colors.primary ? 1 : 0.6 }}>
                  {ICONS[route.name]}
                </Text>
              ),
            })}
          >
            <Tab.Screen name="Récents" component={RecentsScreen} />
            <Tab.Screen name="Clients" component={ClientsTab} />
            <Tab.Screen name="Clavier" component={DialerTab} />
            <Tab.Screen name="Messagerie" component={MessagesScreen} />
            <Tab.Screen name="Compte">
              {() => <ProfileScreen onLogout={logout} />}
            </Tab.Screen>
          </Tab.Navigator>
        </NavigationContainer>
      )}
    </SafeAreaProvider>
  );
}

const ps = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg, padding: 16, paddingTop: 60 },
  title: { fontSize: 30, fontWeight: '800', marginBottom: 16 },
  card: {
    backgroundColor: colors.card, borderRadius: 14, padding: 16, borderWidth: 1,
    borderColor: colors.border,
  },
  label: { fontSize: 13, color: colors.muted },
  value: { fontSize: 17, fontWeight: '600', marginTop: 2 },
  logout: {
    backgroundColor: colors.card, borderRadius: 14, padding: 16, alignItems: 'center',
    marginTop: 16, borderWidth: 1, borderColor: colors.border,
  },
});
