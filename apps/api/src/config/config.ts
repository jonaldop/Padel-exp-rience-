import * as dotenv from 'dotenv';
import * as path from 'path';

// Charge le .env situé à la racine du monorepo
dotenv.config({ path: path.resolve(__dirname, '../../../../.env') });
// + un .env local à l'API (utile en dev/CI)
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

export const config = {
  // Railway/Render/Fly injectent PORT ; en local on utilise API_PORT (def. 3001)
  port: parseInt(process.env.PORT || process.env.API_PORT || '3001', 10),
  // URL publique : explicite, sinon déduite du domaine Railway, sinon local.
  publicApiUrl:
    process.env.PUBLIC_API_URL ||
    (process.env.RAILWAY_PUBLIC_DOMAIN
      ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}`
      : 'http://localhost:3001'),
  webOrigin: process.env.WEB_ORIGIN || 'http://localhost:5173',
  jwtSecret: process.env.JWT_SECRET || 'dev-secret-change-me',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  adminKey: process.env.ADMIN_KEY || 'standardpro-admin',
  // Back-office propriétaire : login + mot de passe (à définir en prod via env).
  admin: {
    email: (process.env.ADMIN_EMAIL || 'johan@webmarketing-services.com').toLowerCase(),
    password: process.env.ADMIN_PASSWORD || 'standardpro-admin',
  },
  // Coût télécom moyen estimé par minute (€) pour calculer le coût par client.
  costPerMinute: parseFloat(process.env.COST_PER_MINUTE || '0.02'),
  email: {
    resendApiKey: process.env.RESEND_API_KEY || '',
    from: process.env.EMAIL_FROM || 'Joe <onboarding@resend.dev>',
    get configured() {
      return Boolean(process.env.RESEND_API_KEY);
    },
  },
  telnyx: {
    apiKey: process.env.TELNYX_API_KEY || '',
    connectionId: process.env.TELNYX_CONNECTION_ID || '',
    callControlAppId: process.env.TELNYX_CALL_CONTROL_APP_ID || '',
    fromNumber: process.env.TELNYX_FROM_NUMBER || '',
    publicKey: process.env.TELNYX_PUBLIC_KEY || '',
    apiBase: 'https://api.telnyx.com/v2',
    /** true si la clé est configurée -> sinon mode dégradé (démo sans Telnyx). */
    get configured() {
      return Boolean(process.env.TELNYX_API_KEY);
    },
  },
};
