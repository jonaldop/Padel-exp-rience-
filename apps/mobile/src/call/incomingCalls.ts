import { Platform } from 'react-native';
import { TelnyxRTC } from '@telnyx/react-native-voice-sdk';
import { api } from '../api';

/**
 * Réception d'appels ENTRANTS dans l'app (VoIP) — iOS d'abord.
 *
 * Chaîne : VoIP Push (PushKit) -> CallKit (écran d'appel système) -> SDK Telnyx
 * (processVoIPNotification) -> on décroche en WebRTC.
 *
 * ⚠️ Brique délicate à fiabiliser sur appareil réel. Tout est encapsulé dans
 * des try/catch pour ne JAMAIS casser le reste de l'app si un module manque.
 */

let client: any = null;
let currentCall: any = null;
let voipToken: string | null = null;
let started = false;

// Imports paresseux : si les modules natifs ne sont pas dans le build, on ignore.
function loadCallKeep(): any {
  try { return require('react-native-callkeep').default; } catch { return null; }
}
function loadVoipPush(): any {
  try { return require('react-native-voip-push-notification').default; } catch { return null; }
}

async function connectClient() {
  try {
    const { token } = await api.webrtcToken();
    const opts: any = { login_token: token };
    if (voipToken) opts.pushNotificationDeviceToken = voipToken;
    client = new (TelnyxRTC as any)(opts);
    client.on('telnyx.call.incoming', (call: any) => {
      currentCall = call;
    });
    client.on('telnyx.client.error', () => {});
    await client.connect();
  } catch {
    /* pas bloquant : on retentera au prochain lancement */
  }
}

export function startIncomingCalls() {
  if (started || Platform.OS !== 'ios') return;
  started = true;

  const CallKeep = loadCallKeep();
  const VoipPush = loadVoipPush();
  if (!CallKeep || !VoipPush) {
    started = false;
    return; // modules pas dans ce build -> on n'active pas (pas d'erreur)
  }

  try {
    CallKeep.setup({
      ios: {
        appName: 'Joe',
        supportsVideo: false,
        maximumCallGroups: '1',
        maximumCallsPerCallGroup: '1',
      },
      android: {
        alertTitle: 'Autorisations',
        alertDescription: 'Joe a besoin d’accéder aux appels',
        cancelButton: 'Annuler',
        okButton: 'OK',
        foregroundService: {
          channelId: 'com.webmarketingservices.standardpro',
          channelName: 'Appels',
          notificationTitle: 'Joe est actif',
        },
      },
    }).catch(() => {});
    CallKeep.setAvailable(true);

    // Décrocher / raccrocher depuis l'écran d'appel système (CallKit)
    CallKeep.addEventListener('answerCall', () => {
      try { currentCall?.answer(); } catch {}
    });
    CallKeep.addEventListener('endCall', () => {
      try { currentCall?.hangup(); } catch {}
      try { client?.disconnect(); } catch {}
    });
  } catch {
    /* noop */
  }

  try {
    // Token VoIP (PushKit) -> on (re)connecte le client avec ce token
    VoipPush.addEventListener('register', (token: string) => {
      voipToken = token;
      connectClient();
    });
    // Push d'appel entrant reçu -> on passe la charge utile au SDK Telnyx
    VoipPush.addEventListener('notification', (notification: any) => {
      try { client?.processVoIPNotification?.(notification); } catch {}
    });
    VoipPush.registerVoipToken();
  } catch {
    /* noop */
  }

  // Connexion initiale (au cas où le token arrive plus tard, on reconnectera)
  connectClient();
}

export function stopIncomingCalls() {
  try { currentCall?.hangup(); } catch {}
  try { client?.disconnect(); } catch {}
  client = null;
  currentCall = null;
  started = false;
}
