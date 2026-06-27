# Guide développeur — lancer & tester l'application

Le dépôt contient le **code réel et fonctionnel** du MVP :

```
apps/
  api/   → back-end NestJS (inscription, numéros, appels, messagerie, webhooks)
  web/   → dashboard React (connexion, tableau de bord, numéros, softphone)
docs/    → conception (00→09) + déploiement
```

## 1. Lancer en local (sans compte Telnyx) — tout de suite

Prérequis : Node.js 20+.

```bash
# À la racine du repo
npm install

# Terminal 1 — back-end (port 3001)
npm run dev:api

# Terminal 2 — créer un compte de démo (optionnel)
npm run seed --workspace apps/api
#   → identifiants : demo@standardpro.fr / demo1234

# Terminal 3 — front (port 5173)
npm run dev:web
```

Ouvre **http://localhost:5173** :
- **Crée un compte** (ou connecte-toi avec le compte démo).
- **Tableau de bord** : KPIs + historique des appels.
- **Mes numéros** : choisis un numéro (catalogue de démo), configure horaires/renvoi/répondeur.
- **Softphone** : visible (la connexion d'appel réel nécessite Telnyx, cf. §3).

> En **mode démo** (sans clé Telnyx) : tout fonctionne sauf les vrais appels voix.
> Les numéros « achetés » sont des numéros de démonstration, les appels sont enregistrés
> dans l'historique mais ne sonnent pas réellement.

## 2. Tester la logique (sans rien)

```bash
npm test --workspace apps/api      # tests unitaires horaires d'ouverture
npm run build --workspace apps/api # vérifie la compilation back
npm run build --workspace apps/web # vérifie la compilation front
```

## 3. Activer les VRAIS appels (avec compte Telnyx)

1. Crée les ressources Telnyx (clé API, numéro FR, Credential Connection WebRTC,
   Call Control Application) — cf. dashboard Telnyx.
2. Copie `.env.example` → `.env` à la racine et remplis les `TELNYX_*`.
3. Expose ton API à Telnyx (webhooks) : `npx ngrok http 3001` → mets l'URL dans
   `PUBLIC_API_URL` **et** comme Webhook de la Call Control App (`/calls/webhook`).
4. Relance `npm run dev:api`. Au démarrage il affiche `Telnyx: configuré ✅`.
5. Dans l'app : **Softphone → Se connecter** → appelle / reçois.

## 4. État du code

| Fonction | État |
|---|---|
| Inscription client (compte + utilisateur) | ✅ |
| Connexion / JWT | ✅ |
| Achat / provisioning de numéro (via API Telnyx) | ✅ |
| Horaires d'ouverture (Europe/Paris) + tests | ✅ |
| Routage entrant (horaires → softphone / renvoi / répondeur) | ✅ |
| Appel sortant | ✅ |
| Messagerie vocale (enregistrement) | ✅ (transcription = V2) |
| Historique + dashboard + KPIs | ✅ |
| Réglages par numéro (renvoi, répondeur, message) | ✅ |
| Softphone web (WebRTC) | ✅ (nécessite Telnyx pour le son) |
| Persistance | ✅ fichier JSON (→ Postgres/Supabase pour le scale) |
| App mobile (React Native + CallKit) | ⬜ à venir (réutilise cette API) |
| Notifications push, IA, portabilité auto | ⬜ V2 (cf. docs/08) |

Déploiement : voir [DEPLOIEMENT.md](DEPLOIEMENT.md).
