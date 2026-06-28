/**
 * Déclaration de types minimale pour @telnyx/react-native-voice-sdk.
 *
 * Le paquet publie son code source TypeScript brut (et a quelques erreurs de
 * types internes + des imports non déclarés). Pour garder `tsc` propre côté app,
 * on mappe ce module vers ce shim via tsconfig `paths`. À l'exécution, Metro
 * résout évidemment le vrai paquet — ce fichier ne sert qu'au typage.
 *
 * On ne déclare que la surface que l'app utilise réellement.
 */
declare module '@telnyx/react-native-voice-sdk' {
  export type CallState =
    | 'new'
    | 'ringing'
    | 'connecting'
    | 'active'
    | 'ended'
    | 'held'
    | 'dropped';

  export interface ClientOptions {
    login?: string;
    password?: string;
    login_token?: string;
    logLevel?: string;
    debug?: boolean;
  }

  export interface CallOptions {
    destinationNumber?: string;
    callerIdName?: string;
    callerIdNumber?: string;
    audio?: boolean;
  }

  export class Call {
    state: CallState;
    answer(): Promise<void> | void;
    hangup(): void;
    mute(): void;
    unmute(): void;
    dtmf(digits: string): void;
    on(event: string, listener: (...args: any[]) => void): this;
    off(event: string, listener: (...args: any[]) => void): this;
  }

  export class TelnyxRTC {
    constructor(opts: ClientOptions);
    connect(): Promise<void>;
    disconnect(): void;
    newCall(options: CallOptions): Promise<Call>;
    on(event: string, listener: (...args: any[]) => void): this;
    off(event: string, listener: (...args: any[]) => void): this;
  }
}
