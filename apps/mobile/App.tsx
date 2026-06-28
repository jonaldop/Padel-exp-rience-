import { useEffect, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { NavigationContainer, useNavigation, useRoute } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { api, auth } from './src/api';
import { colors } from './src/theme';
import { LoginScreen } from './src/screens/LoginScreen';
import { HomeScreen } from './src/screens/HomeScreen';
import { RecentsScreen } from './src/screens/RecentsScreen';
import { ClientsScreen } from './src/screens/ClientsScreen';
import { DialerScreen } from './src/screens/DialerScreen';
import { MessagesScreen } from './src/screens/MessagesScreen';
import { StatsScreen } from './src/screens/StatsScreen';
import { PlusScreen } from './src/screens/PlusScreen';
import { CallScreen } from './src/screens/CallScreen';
import { LineSettingsScreen } from './src/screens/LineSettingsScreen';
import { ProfileScreen } from './src/screens/ProfileScreen';
import { PlanScreen } from './src/screens/PlanScreen';
import { TabBar } from './src/components/TabBar';
import { startIncomingCalls, stopIncomingCalls } from './src/call/incomingCalls';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

function DialerTab() {
  const route = useRoute<any>();
  return <DialerScreen initialNumber={route.params?.number} />;
}

function ClientsRoute() {
  const navigation = useNavigation<any>();
  return <ClientsScreen onCall={(phone) => navigation.navigate('Clavier', { number: phone })} />;
}

function Tabs({ onLogout }: { onLogout: () => void }) {
  return (
    <Tab.Navigator
      tabBar={(props) => <TabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tab.Screen name="Accueil" component={HomeScreen} />
      <Tab.Screen name="Appels" component={RecentsScreen} />
      <Tab.Screen name="Clavier" component={DialerTab} />
      <Tab.Screen name="Messages" component={MessagesScreen} />
      <Tab.Screen name="Plus">{() => <PlusScreen onLogout={onLogout} />}</Tab.Screen>
    </Tab.Navigator>
  );
}

export default function App() {
  const [ready, setReady] = useState(false);
  const [authed, setAuthed] = useState(false);

  useEffect(() => {
    auth.load().then((t) => {
      setAuthed(!!t);
      setReady(true);
    });
  }, []);

  // Active la réception d'appels entrants une fois connecté (iOS).
  useEffect(() => {
    if (authed) startIncomingCalls();
    else stopIncomingCalls();
  }, [authed]);

  async function logout() {
    await auth.set(null);
    stopIncomingCalls();
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
          <Stack.Navigator>
            <Stack.Screen name="Tabs" options={{ headerShown: false }}>
              {() => <Tabs onLogout={logout} />}
            </Stack.Screen>
            <Stack.Screen
              name="Statistiques"
              component={StatsScreen}
              options={{ headerShown: true, headerTitle: '', headerTransparent: true, headerTintColor: colors.primary }}
            />
            <Stack.Screen
              name="Clients"
              component={ClientsRoute}
              options={{ headerShown: true, headerTitle: '', headerTransparent: true, headerTintColor: colors.primary }}
            />
            <Stack.Screen
              name="Reglages"
              component={LineSettingsScreen}
              options={{ headerShown: true, headerTitle: '', headerTransparent: true, headerTintColor: colors.primary }}
            />
            <Stack.Screen
              name="Profil"
              component={ProfileScreen}
              options={{ headerShown: true, headerTitle: '', headerTransparent: true, headerTintColor: colors.primary }}
            />
            <Stack.Screen
              name="Formule"
              component={PlanScreen}
              options={{ headerShown: true, headerTitle: '', headerTransparent: true, headerTintColor: colors.primary }}
            />
            <Stack.Screen
              name="Appel"
              component={CallScreen}
              options={{ headerShown: false, presentation: 'fullScreenModal', gestureEnabled: false }}
            />
          </Stack.Navigator>
        </NavigationContainer>
      )}
    </SafeAreaProvider>
  );
}
