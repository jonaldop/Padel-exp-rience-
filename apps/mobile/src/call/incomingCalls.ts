import { Platform, Vibration } from 'react-native';
import { TelnyxRTC } from '@telnyx/react-native-voice-sdk';
import { api } from '../api';
import { navigate, goBackIfPossible } from '../nav';

function loadInCall(): any {
  try { return require('react-native-incall-manager').default; } catch { return null; }
}

// ── État de l'appel entrant (pour l'écran d'appel) ──────────────────────────
export type IncomingState = 'idle' | 'ringing' | 'active' | 'ended';
let incomingState: IncomingState = 'idle';
let incomingListener: ((s: IncomingState, from: string) => void) | null = null;
let currentFrom = '';

export function setIncomingListener(cb: ((s: IncomingState, from: string) => void) | null) {
  incomingListener = cb;
  if (cb) cb(incomingState, currentFrom);
}
function setIncoming(s: IncomingState) {
  incomingState = s;
  try { incomingListener?.(s, currentFrom); } catch { /* noop */ }
}

function startRinging() {
  try { loadInCall()?.startRingtone?.('_DEFAULT_'); } catch { /* noop */ }
  try { Vibration.vibrate([0, 1000, 2000], true); } catch { /* noop */ }
}
function stopRinging() {
  try { loadInCall()?.stopRingtone?.(); } catch { /* noop */ }
  try { Vibration.cancel(); } catch { /* noop */ }
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

/** Décrocher l'appel entrant (depuis l'écran d'appel). */
export function answerIncoming() {
  stopRinging();
  try { loadInCall()?.start?.({ media: 'audio' }); } catch { /* noop */ }
  try { currentCall?.answer(); } catch { /* noop */ }
  setIncoming('active');
}

/** Refuser / raccrocher l'appel entrant. */
export function declineIncoming() {
  stopRinging();
  try { currentCall?.hangup(); } catch { /* noop */ }
  try { loadInCall()?.stop?.(); } catch { /* noop */ }
  endCallKit();
  setIncoming('ended');
}

/** Affiche un VRAI écran d'appel entrant (plein écran + sonnerie + vibreur). */
function presentIncoming(call: any) {
  currentCall = call;
  currentUuid = uuidv4();
  currentFrom = String(callerNumberOf(call));

  // Sonnerie + vibreur + écran d'appel plein écran (app ouverte).
  startRinging();
  setIncoming('ringing');
  navigate('AppelEntrant', { from: currentFrom });

  // Écran d'appel système iOS (surtout utile app fermée via push).
  if (CallKeep) {
    try { CallKeep.displayIncomingCall(currentUuid, currentFrom, currentFrom, 'generic', false); } catch { /* noop */ }
  }

  try {
    call.on?.('telnyx.call.state', (_c: any, state: string) => {
      if (state === 'active' || state === 'held') {
        stopRinging();
        setIncoming('active');
      } else if (state === 'ended' || state === 'dropped') {
        stopRinging();
        endCallKit();
        setIncoming('ended');
      }
    });
  } catch { /* noop */ }
}

let connecting = false;

async function connectClient() {
  if (connecting || stopping) return; // une seule connexion à la fois
  connecting = true;
  // Ferme proprement l'ancienne connexion avant d'en ouvrir une nouvelle
  // (sinon le même identifiant s'enregistre en double et ne se stabilise pas).
  try { client?.disconnect(); } catch { /* noop */ }
  client = null;
  try {
    setStatus('connecting');
    // Réception entrante : on se connecte avec les IDENTIFIANTS DE CONNEXION
    // (les tokens jetables ne reçoivent pas d'appels entrants chez Telnyx).
    const creds = await api.webrtcCredentials();
    const opts: any = { login: creds.login, password: creds.password };
    if (voipToken) opts.pushNotificationDeviceToken = voipToken;
    const c = new (TelnyxRTC as any)(opts);
    client = c;
    c.on('telnyx.client.ready', () => { connecting = false; setStatus('connected'); });
    c.on('telnyx.call.incoming', (call: any) => presentIncoming(call));
    const onDrop = () => {
      connecting = false;
      if (client === c) { setStatus('connecting'); scheduleReconnect(); }
    };
    c.on('telnyx.client.error', onDrop);
    c.on('telnyx.client.disconnected', onDrop);
    c.on('telnyx.socket.close', onDrop);
    await c.connect();
  } catch {
    connecting = false;
    scheduleReconnect();
  }
}

function scheduleReconnect() {
  if (stopping || reconnectTimer || connecting) return;
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
    if (!stopping && !connecting && lineStatus !== 'connected' && !reconnectTimer) connectClient();
  }, 30000);
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
