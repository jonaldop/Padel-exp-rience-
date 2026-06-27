# 01 — Architecture technique, technologies & flux d'appels

## 1. Principes d'architecture

- **Monolithe modulaire** au départ (NestJS modules), pas de microservices prématurés. On découpe
  plus tard si besoin (le service « média/appel » est le candidat n°1 à extraire).
- **Le fournisseur télécom porte la voix.** Notre back-end ne route pas de RTP : il pilote le
  fournisseur via API (« Call Control » Telnyx / TwiML Twilio) et reçoit ses webhooks. La voix
  transite entre le terminal (SDK WebRTC) et l'infra du fournisseur.
- **Event-driven en interne.** Les webhooks d'appel alimentent une file (Redis/BullMQ) qui déclenche
  transcription, notifications, facturation. Le chemin critique (établir l'appel) reste synchrone et court.
- **Stateless API + état dans Postgres/Redis** → scalable horizontalement.

## 2. Stack recommandée

| Couche | Choix | Pourquoi |
|--------|-------|----------|
| **Back-end** | **NestJS (Node.js + TypeScript)** | Écosystème télécom (SDK Telnyx/Twilio en JS), TS partout, structure claire, websockets natifs. Plan B : Go si besoin de perf média (pas au MVP). |
| **Front web (admin)** | **React + TypeScript + Vite**, UI **shadcn/Tailwind**, data **TanStack Query** | Standard, rapide, recrutable |
| **App mobile** | **React Native + Expo (dev client)** | Un seul code iOS/Android, partage TS avec le web. ⚠️ besoin de modules natifs : `@config-plugins/react-native-callkeep` (CallKit/ConnectionService) + VoIP push |
| **SDK voix** | **Telnyx WebRTC SDK** (ou Twilio Voice SDK) | Fourni par l'opérateur, gère signalisation/ICE |
| **Base de données** | **PostgreSQL 16** (managé : Scaleway/OVH/Neon UE) | Relationnel, transactions, JSONB pour les payloads webhooks |
| **Cache / files / présence** | **Redis** (+ **BullMQ**) | Sessions, rate-limit, jobs async (transcription, emails), état « en ligne » |
| **Stockage média** | **S3 compatible UE** (Scaleway Object Storage) | Voicemails, enregistrements, chiffré au repos |
| **Notifications** | **APNs (+ PushKit VoIP)** & **FCM** ; email via **Brevo** (ex-Sendinblue, FR) | Push appel + appel manqué + récap |
| **Auth** | **Auth maison JWT** (access court + refresh) ou **Clerk/Auth0** si on veut aller vite | OTP SMS pour le mobile |
| **Paiement** | **Stripe Billing** (abonnement + usage metering) | Standard SaaS, gère TVA UE |
| **IA / transcription** | **Whisper** (large-v3, auto-hébergé ou API) ou **Deepgram** (FR, temps réel) ; résumé/qualif via **Claude** | FR de qualité, latence maîtrisable |
| **Infra / déploiement** | **Docker** + **Scaleway/OVH (UE)** ou Fly.io ; **GitHub Actions** CI/CD | Hébergement UE = argument RGPD |
| **Observabilité** | **Sentry** (erreurs) + **Grafana/Prometheus** + logs structurés + **call quality metrics** | La qualité d'appel se mesure, sinon on est aveugle |

> **Règle d'or hébergement : tout en UE** (Postgres, S3, back). Argument commercial + RGPD pour des
> clients FR.

## 3. Diagramme de composants (haut niveau)

```
                 ┌──────────────────────────────────────────────┐
                 │                  CLIENTS                       │
   App mobile RN │  CallKeep + VoIP Push   │   Web Admin (React)  │
                 └───────┬─────────────────┴──────────┬──────────┘
                         │  REST/WebSocket             │  REST
                         ▼                             ▼
                 ┌──────────────────────────────────────────────┐
                 │            API BACK-END (NestJS)              │
                 │  Auth · Comptes · Numéros · Appels · Horaires │
                 │  Voicemail · Facturation · Webhooks · IA-jobs │
                 └───┬──────────┬───────────┬──────────┬─────────┘
                     │          │           │          │
            ┌────────▼──┐  ┌────▼────┐  ┌───▼────┐ ┌───▼─────────┐
            │ PostgreSQL│  │  Redis  │  │  S3 UE │ │ Stripe      │
            │           │  │ BullMQ  │  │ média  │ │ Billing     │
            └───────────┘  └─────────┘  └────────┘ └─────────────┘
                     ▲
        webhooks     │  Call Control API
                     ▼
            ┌─────────────────────────┐      voix (RTP/SRTP)
            │   FOURNISSEUR TÉLÉCOM    │◄────────────────────────► terminaux
            │   (Telnyx / Twilio)      │      via SDK WebRTC
            │   DID FR · SIP · PSTN    │
            └─────────────────────────┘
                     ▲
                     │  RTC public (PSTN)
              ┌──────┴───────┐
              │ Appelant /   │
              │ appelé tiers │
              └──────────────┘
```

## 4. Flux d'appel ENTRANT (logique détaillée)

Cas : un prospect appelle le numéro pro du client.

```
1.  Prospect compose le numéro pro (DID FR).
2.  Le fournisseur reçoit l'appel → envoie un webhook "call.initiated" à notre back.
3.  Back-end → résout : à quel COMPTE / NUMÉRO appartient ce DID ?
4.  Back-end évalue les RÈGLES :
       ├─ Sommes-nous dans les HORAIRES d'ouverture (fuseau Europe/Paris, jours fériés) ?
       │
       ├─ OUI (ouvert) :
       │     a. Sonner le(s) terminal(aux) de l'utilisateur via push VoIP + WebRTC.
       │        - iOS : PushKit → CallKit affiche l'appel (même app fermée).
       │        - Android : FCM high-priority → ConnectionService.
       │     b. Si DÉCROCHE → conversation. (enregistrement si activé + consentement)
       │     c. Si PAS de réponse après N s :
       │            → option RENVOI vers mobile perso (dial PSTN), OU
       │            → bascule RÉPONDEUR / messagerie vocale.
       │
       └─ NON (fermé) :
             → message d'accueil hors horaires → RÉPONDEUR (enregistre un message).
5.  Fin d'appel → webhook "call.hangup" → on enregistre dans call_logs (durée, statut, coût).
6.  Si message vocal laissé → fichier stocké S3 → job transcription → notif push + email.
7.  Si appel manqué → notification appel manqué (push + email).
8.  (V2) Job IA : résumé / qualification / récap email.
```

**Points durs côté entrant :** réveiller l'app fermée de façon fiable (PushKit/FCM), gérer le délai
de sonnerie, le « parallel ring » web+mobile, et le fallback propre si le terminal ne répond pas.

## 5. Flux d'appel SORTANT

Cas : le client appelle un prospect depuis l'app, en présentant son numéro pro.

```
1.  Utilisateur compose un numéro dans l'app → demande "passer un appel".
2.  App établit la session WebRTC avec le fournisseur (SDK).
3.  Back-end (ou JWT télécom) autorise : présenter le DID pro comme CALLER ID.
4.  Fournisseur route vers le PSTN → sonne chez le destinataire.
5.  Conversation (SRTP). Enregistrement optionnel (consentement).
6.  Hangup → webhook → call_logs + calcul du coût (minutes sortantes).
```

**Caller ID :** présenter le numéro pro du client (DID nous appartenant) — simple. Présenter un
numéro **non hébergé chez nous** (ex. le mobile perso) = usurpation, **interdit/contrôlé** (STIR/SHAKEN,
règles ARCEP). On ne le fait pas.

## 6. Stratégie d'intégration de l'IA (progressive, sans refonte)

On câble la **plomberie** dès le MVP, on **active** l'IA en V2 :

```
MVP   : Appel → enregistrement (S3) → transcription (Whisper/Deepgram) → stockée.
        (Pas d'action automatique, juste de la donnée prête.)

V2    : Sur la transcription, jobs asynchrones :
        - Résumé d'appel (LLM)
        - Qualification prospect (extraction structurée : besoin, budget, urgence)
        - Récap par email au client
        - Voicemail-to-text + alerte

V3    : IA "répondeur intelligent" qui PARLE en temps réel :
        - STT temps réel (Deepgram/Whisper streaming)
        - LLM (Claude) orchestre la conversation
        - TTS (ElevenLabs/Cartesia) voix FR naturelle
        - Prise de RDV Google Calendar
        ⚠️ Latence < 800 ms bout-en-bout sinon inutilisable. Vrai chantier.
```

Clé d'architecture : **la transcription et le résumé sont des jobs BullMQ découplés**. Ajouter l'IA
= ajouter des consumers, pas réécrire le cœur d'appel.

## 7. Sécurité & robustesse (transverses)

- TLS partout, SRTP pour la voix, secrets en vault, JWT courts + refresh.
- **Vérification de signature des webhooks** fournisseur (sinon n'importe qui peut forger un appel).
- TURN/STUN pour traverser les NAT (fourni par l'opérateur).
- Idempotence des webhooks (Telnyx/Twilio peuvent rejouer).
- Rate limiting + détection de fraude (toll fraud : numéros premium internationaux → **bloquer
  l'international par défaut**, whitelist sur demande).
