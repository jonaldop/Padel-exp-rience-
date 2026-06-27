# Guide développeur — lancer & tester l'app

Ce dépôt contient le **code réel** du MVP, pas seulement la conception :

```
apps/
  api/   → back-end NestJS (token WebRTC + routage d'appels Telnyx + historique)
  web/   → softphone web React (appeler / décrocher dans le navigateur)
docs/    → dossier de conception (00 à 09)
```

> ⚠️ **Ce qui se teste SANS rien** : la logique (tests unitaires des horaires) et la compilation.
> **Ce qui exige un compte Telnyx** : passer/recevoir de vrais appels (la voix transite par Telnyx).
> C'est normal : on n'est pas opérateur, Telnyx fournit le réseau.

---

## 1. Tester tout de suite, sans compte Telnyx

```bash
npm install                       # installe les 2 apps (workspaces)
npm test --workspace apps/api     # tests unitaires (horaires d'ouverture)
npm run build --workspace apps/api  # vérifie que le back compile
```

Tu peux aussi démarrer l'API et vérifier qu'elle répond :

```bash
npm run dev:api
# puis dans un autre terminal :
curl http://localhost:3001/health
# -> {"status":"ok",...}
```

---

## 2. Tester de VRAIS appels (avec compte Telnyx) — ~30 min de setup

### a) Créer le compte et les ressources Telnyx
1. Compte sur https://telnyx.com (mode test/dev).
2. **Acheter un numéro FR** (Numbers > Search & Buy), au format `+33…`.
3. **Créer une "Credential Connection"** (Voice > SIP Connections, type *Credentials* / WebRTC).
   → note son **Connection ID**.
4. **Créer une "Call Control Application"** (Voice > Call Control > Applications).
   → note son **App ID**, et règle son **Webhook URL** sur `https://<ton-tunnel>/calls/webhook`.
5. **Rattacher le numéro** à la Call Control Application (pour le routage entrant).
6. **API Key** : Account > API Keys → crée une clé V2.

### b) Exposer ton API locale à Telnyx (webhooks)
Telnyx doit pouvoir appeler ton back. En local, utilise un tunnel :

```bash
npx ngrok http 3001
# copie l'URL https://xxxx.ngrok.io dans PUBLIC_API_URL et dans le webhook Telnyx
```

### c) Configurer l'environnement
```bash
cp .env.example .env
# remplis : TELNYX_API_KEY, TELNYX_CONNECTION_ID, TELNYX_CALL_CONTROL_APP_ID,
#           TELNYX_FROM_NUMBER, PUBLIC_API_URL (= URL ngrok)
```

### d) Lancer
```bash
npm run dev:api      # terminal 1 — API sur :3001
npm run dev:web      # terminal 2 — softphone sur http://localhost:5173
```

### e) Tester
- **Appel SORTANT** : ouvre http://localhost:5173 → "Se connecter" → tape un n° → "Appeler".
  Ton téléphone perso sonne, tu réponds, tu te parles. ✅
- **Appel ENTRANT** : depuis ton mobile, appelle ton **numéro Telnyx**.
  - En **horaires d'ouverture** (lun–ven 9h–12h/14h–18h par défaut) → le softphone web sonne
    → "Décrocher". ✅
  - **Hors horaires** → message d'accueil + répondeur (le message est enregistré). ✅
- **Historique** : `curl http://localhost:3001/calls`

---

## 3. Où on en est (état du code)

| Fonction | État |
|---|---|
| Token WebRTC (connexion softphone) | ✅ implémenté |
| Appel sortant depuis le navigateur | ✅ implémenté |
| Appel entrant → softphone (horaires) | ✅ implémenté |
| Répondeur hors horaires + enregistrement | ✅ implémenté |
| Horaires d'ouverture (Europe/Paris) + tests | ✅ implémenté |
| Historique d'appels | ✅ (en mémoire — à passer en Postgres) |
| Auth / comptes / utilisateurs | ⬜ à faire (tickets INFRA-3, ACC-*) |
| Persistance Postgres | ⬜ à faire (remplace `calls.store.ts`) |
| App mobile (React Native + CallKit) | ⬜ à faire (réutilise cette API) |
| Transcription / IA | ⬜ V2 (plomberie prévue) |

Prochaines étapes : voir [docs/08-tickets-dev.md](08-tickets-dev.md).
