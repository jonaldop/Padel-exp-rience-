import { Platform, Alert } from 'react-native';
import { TelnyxRTC } from '@telnyx/react-native-voice-sdk';
import { api } from '../api';

function loadInCall(): any {
  try { return require('react-native-incall-manager').default; } catch { return null; }
}

/**
 * Réception d'appels ENTRANTS dans l'app (VoIP) — iOS d'abord.
 *
 * Chaîne : transfert serveur -> SIP WebRTC -> le client connecté reçoit l'appel
 * (ou VoIP Push si app fermée) -> on AFFICHE l'écran d'appel système (CallKit)
 * -> on décroche en WebRTC.
 *
 * Tout est encapsulé dans des try/catch pour ne JAMAIS casser le reste de l'app.
 */

let client: any = null;
let currentCall: any = null;
let currentUuid: string | null = null;
let voipToken: string | null = null;
let started = false;
let stopping = false;
let reconnectTimer: any = null;
let heartbeat: any = null;
let CallKeep: any = null;
let VoipPush: any = null;

export type LineStatus = 'offline' | 'connecting' | 'connected' | 'unsupported';
let lineStatus: LineStatus = 'offline';
let statusListener: ((s: LineStatus) => void) | null = null;

export function getLineStatus(): LineStatus {
  return lineStatus;
}
export function setLineStatusListener(cb: ((s: LineStatus) => void) | null) {
  statusListener = cb;
  if (cb) cb(lineStatus);
}
function setStatus(s: LineStatus) {
  lineStatus = s;
  try { statusListener?.(s); } catch { /* noop */ }
}

function loadCallKeep(): any {
  try { return require('react-native-callkeep').default; } catch { return null; }
}
function loadVoipPush(): any {
  try { return require('react-native-voip-push-notification').default; } catch { return null; }
}

// UUID v4 simple (runtime app : Math.random est OK ici).
function uuidv4(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function callerNumberOf(call: any): string {
  const o = call?.options || {};
  return (
    o.remoteCallerNumber ||
    o.remoteCallerIdNumber ||
    o.callerNumber ||
    o.callerIdNumber ||
    call?.remoteCallerNumber ||
    'Appel entrant'
  );
}

function endCallKit() {
  if (CallKeep && currentUuid) {
    try { CallKeep.endCall(currentUuid); } catch { /* noop */ }
  }
  currentUuid = null;
  currentCall = null;
}

function answerCurrent() {
  try {
    const InCall = loadInCall();
    InCall?.startRingtone?.('_BUNDLE_');
    InCall?.stopRingtone?.();
    InCall?.start?.({ media: 'audio' });
  } catch { /* noop */ }
  try { currentCall?.answer(); } catch { /* noop */ }
}

/** Affiche l'appel entrant (CallKit + alerte in-app fiable) en foreground. */
function presentIncoming(call: any) {
  currentCall = call;
  currentUuid = uuidv4();
  const from = String(callerNumberOf(call));

  // 1) Écran d'appel système (utile surtout app fermée / arrière-plan).
  if (CallKeep) {
    try { CallKeep.displayIncomingCall(currentUuid, from, from, 'generic', false); } catch { /* noop */ }
  }

  // 2) Alerte in-app : visible et fiable quand l'app est ouverte.
  try {
    Alert.alert(
      'Appel entrant',
      from,
      [
        { text: 'Refuser', style: 'cancel', onPress: () => { try { currentCall?.hangup(); } catch {} endCallKit(); } },
        { text: 'Répondre', onPress: () => answerCurrent() },
      ],
      { cancelable: false },
    );
  } catch { /* noop */ }

  try {
    call.on?.('telnyx.call.state', (_c: any, state: string) => {
      if (state === 'ended' || state === 'dropped') endCallKit();
    });
  } catch { /* noop */ }
}

async function connectClient() {
  try {
    setStatus('connecting');
    const { token } = await api.webrtcToken();
    const opts: any = { login_token: token };
    if (voipToken) opts.pushNotificationDeviceToken = voipToken;
    client = new (TelnyxRTC as any)(opts);
    client.on('telnyx.client.ready', () => setStatus('connected'));
    client.on('telnyx.call.incoming', (call: any) => {
      presentIncoming(call);
    });
    // En cas d'erreur/déconnexion, on tente de se reconnecter (la ligne ne
    // doit pas rester "hors ligne" : elle doit pouvoir recevoir en continu).
    client.on('telnyx.client.error', () => { setStatus('connecting'); scheduleReconnect(); });
    client.on('telnyx.client.disconnected', () => { setStatus('connecting'); scheduleReconnect(); });
    client.on('telnyx.socket.close', () => { setStatus('connecting'); scheduleReconnect(); });
    await client.connect();
  } catch {
    scheduleReconnect();
  }
}

function scheduleReconnect() {
  if (stopping || reconnectTimer) return;
  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    if (!stopping) connectClient();
  }, 4000);
}

export function startIncomingCalls() {
  if (started || Platform.OS !== 'ios') { setStatus('unsupported'); return; }
  started = true;
  stopping = false;

  CallKeep = loadCallKeep();
  VoipPush = loadVoipPush();
  if (!CallKeep || !VoipPush) {
    started = false;
    setStatus('unsupported'); // modules pas dans ce build
    return;
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

    // Décrocher depuis l'écran d'appel système
    CallKeep.addEventListener('answerCall', () => {
      try { currentCall?.answer(); } catch { /* noop */ }
    });
    // Raccrocher / refuser
    CallKeep.addEventListener('endCall', () => {
      try { currentCall?.hangup(); } catch { /* noop */ }
      endCallKit();
    });
  } catch { /* noop */ }

  try {
    VoipPush.addEventListener('register', (token: string) => {
      voipToken = token;
      connectClient();
    });
    VoipPush.addEventListener('notification', (notification: any) => {
      // Push reçu (app en arrière-plan) -> le SDK établit l'appel ; l'écran
      // CallKit est déjà affiché par l'AppDelegate (reportNewIncomingCall).
      try { client?.processVoIPNotification?.(notification); } catch { /* noop */ }
    });
    VoipPush.registerVoipToken();
  } catch { /* noop */ }

  // Connexion initiale (reçoit les appels quand l'app est ouverte)
  connectClient();

  // Filet de sécurité : si la ligne tombe (et qu'aucun événement d'erreur n'a
  // déclenché la reconnexion), on se reconnecte tout seul.
  heartbeat = setInterval(() => {
    if (!stopping && lineStatus !== 'connected' && !reconnectTimer) connectClient();
  }, 20000);
}

export function stopIncomingCalls() {
  stopping = true;
  if (reconnectTimer) { clearTimeout(reconnectTimer); reconnectTimer = null; }
  if (heartbeat) { clearInterval(heartbeat); heartbeat = null; }
  try { currentCall?.hangup(); } catch { /* noop */ }
  try { client?.disconnect(); } catch { /* noop */ }
  endCallKit();
  client = null;
  started = false;
  setStatus('offline');
}
