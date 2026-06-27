import * as dotenv from 'dotenv';
import * as path from 'path';

// Charge le .env situé à la racine du monorepo
dotenv.config({ path: path.resolve(__dirname, '../../../../.env') });

function required(name: string): string {
  const v = process.env[name];
  if (!v) {
    // En dev on ne crashe pas : on log, pour pouvoir démarrer sans Telnyx configuré.
    // eslint-disable-next-line no-console
    console.warn(`[config] Variable d'environnement manquante: ${name}`);
    return '';
  }
  return v;
}

export const config = {
  port: parseInt(process.env.API_PORT || '3001', 10),
  publicApiUrl: process.env.PUBLIC_API_URL || 'http://localhost:3001',
  telnyx: {
    apiKey: required('TELNYX_API_KEY'),
    connectionId: required('TELNYX_CONNECTION_ID'),
    callControlAppId: required('TELNYX_CALL_CONTROL_APP_ID'),
    fromNumber: required('TELNYX_FROM_NUMBER'),
    publicKey: process.env.TELNYX_PUBLIC_KEY || '',
    apiBase: 'https://api.telnyx.com/v2',
  },
};
