import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { requireOptionalNativeModule } from 'expo-modules-core';
import { api } from './api';
import { navigate } from './nav';

/**
 * Notifications push (alertes) : appel manqué, nouveau message vocal, etc.
 *
 * ⚠️ expo-notifications est un module NATIF : il n'existe qu'à partir d'un build
 * natif qui l'inclut. Sur un ANCIEN binaire (reçu par OTA), charger le JS
 * d'expo-notifications plante l'app. On vérifie donc d'abord que le module NATIF
 * est réellement présent via requireOptionalNativeModule (qui renvoie null sans
 * planter). Tant qu'il n'y est pas, le push est simplement inactif.
 */

function loadModules(): { Notifications: any; Device: any } | null {
  try {
    if (!requireOptionalNativeModule('ExpoNotificationsEmitter')) return null; // ancien binaire
    return { Notifications: require('expo-notifications'), Device: require('expo-device') };
  } catch {
    return null;
  }
}

let started = false;

export async function registerPush() {
  if (started) return;
  const mods = loadModules();
  if (!mods) return;
  const { Notifications, Device } = mods;
  started = true;

  try {
    // Affiche l'alerte même app au 1er plan.
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
      }),
    });

    if (!Device.isDevice) return; // simulateur : pas de push

    const current = await Notifications.getPermissionsAsync();
    let status = current.status;
    if (status !== 'granted') {
      status = (await Notifications.requestPermissionsAsync()).status;
    }
    if (status !== 'granted') return;

    const projectId =
      (Constants.expoConfig as any)?.extra?.eas?.projectId ||
      (Constants as any)?.easConfig?.projectId;
    const tokenResp = await Notifications.getExpoPushTokenAsync(projectId ? { projectId } : undefined);
    const token = tokenResp?.data;
    if (token) {
      await api.registerDevice(token, Platform.OS).catch(() => {});
    }

    // Tap sur une notification -> navigation vers l'écran concerné.
    Notifications.addNotificationResponseReceivedListener((resp: any) => {
      const data = resp?.notification?.request?.content?.data || {};
      try {
        if (data?.screen) navigate(data.screen, data.params || {});
      } catch {
        /* noop */
      }
    });
  } catch {
    /* ne jamais casser l'app pour une notif */
  }
}
