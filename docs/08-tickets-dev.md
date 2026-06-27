# 08 — Backlog de développement (tickets prêts pour l'équipe)

Format : **EPIC** → tickets avec critères d'acceptation. Estimation en points (1 = ~½j, 2 = ~1j,
3 = ~2j, 5 = ~3–4j, 8 = ~1 semaine). Priorité : P0 (bloquant), P1, P2.

---

## EPIC 0 — Socle technique & infra

- **[P0,3] INFRA-1** : Monorepo (back NestJS, web React, mobile RN) + CI GitHub Actions (lint, test, build).
- **[P0,2] INFRA-2** : Provisionner Postgres + Redis + S3 (UE) ; migrations (Prisma/TypeORM).
- **[P0,2] INFRA-3** : Auth JWT (access/refresh) + OTP SMS mobile + rôles (owner/admin/agent).
  - *AC* : login web + mobile, refresh, garde de rôle sur les routes.
- **[P0,2] INFRA-4** : Module `telecom/` (interface + adaptateur Telnyx) ; config secrets.
- **[P0,2] INFRA-5** : Réception webhooks Telnyx : vérif signature + idempotence (`webhook_events`).
- **[P1,2] INFRA-6** : Observabilité : Sentry, logs structurés, dashboard santé.

## EPIC 1 — Appels (cœur, le plus risqué → en premier)

- **[P0,8] CALL-1 (SPIKE)** : App fermée qui sonne. iOS PushKit→CallKit + Android FCM→ConnectionService.
  - *AC* : appel reçu app fermée sur device réel iOS **et** Android, écran d'appel natif.
- **[P0,5] CALL-2** : Appel entrant bout-en-bout (résolution DID→compte→user→sonnerie WebRTC→décroché).
- **[P0,5] CALL-3** : Appel sortant depuis l'app avec présentation du DID pro (caller ID).
- **[P0,3] CALL-4** : Web softphone (recevoir/passer un appel depuis le navigateur).
- **[P0,3] CALL-5** : `CALL` log complet (durée, statut, coût) depuis les webhooks.
- **[P1,3] CALL-6** : Gestion robuste : pas de réponse, occupé, échec, raccrochage, double-appel.
- **[P1,2] CALL-7** : Mesure qualité d'appel (MOS/latence) + alertes.
- **[P1,3] CALL-8** : Anti-fraude : international bloqué par défaut + plafond de dépense compte.

## EPIC 2 — Logique de standard téléphonique

- **[P0,3] FLOW-1** : Horaires d'ouverture (modèle hebdo + fériés FR, fuseau Europe/Paris) + éditeur.
  - *AC* : un appel à 22h tombe sur « fermé », un appel à 10h un mardi ouvré sonne.
- **[P0,2] FLOW-2** : Message d'accueil (upload audio + TTS texte) ouvert/fermé.
- **[P0,3] FLOW-3** : Répondeur hors horaires (joue message + enregistre).
- **[P0,3] FLOW-4** : Messagerie vocale : enregistrement → S3 → lecture app/web + statut lu/non lu.
- **[P0,2] FLOW-5** : Renvoi vers mobile perso (toggle + numéro) + bascule en 1 tap.
- **[P0,2] FLOW-6** : Notification appel manqué (push + email).
- **[P1,2] FLOW-7** : Timeout de sonnerie configurable + ordre (app → renvoi → voicemail).

## EPIC 3 — Compte, utilisateurs, numéros, portabilité

- **[P0,3] ACC-1** : Inscription entreprise (raison sociale, SIRET, adresse) + wizard onboarding.
- **[P0,3] ACC-2** : Gestion des utilisateurs (CRUD, invitations, rôles).
- **[P0,3] NUM-1** : Achat self-service d'un DID FR neuf (recherche dispo → réservation Telnyx).
- **[P1,5] NUM-2** : Workflow de portabilité (formulaire RIO/mandat + signature + suivi de statut).
  - *AC* : statut visible (soumis→en cours→planifié→terminé/rejeté) + notifications.
- **[P0,3] DEV-1** : Enregistrement des devices (push tokens APNs/PushKit/FCM) + cycle de vie.

## EPIC 4 — Facturation

- **[P0,5] BILL-1** : Stripe Billing (plans Starter/Pro, essai 14j, CB, webhooks Stripe).
- **[P0,3] BILL-2** : Metering minutes (in/out) + agrégation période + dépassement.
- **[P1,2] BILL-3** : Page facturation (factures, conso, changement de plan).

## EPIC 5 — Dashboard & historique

- **[P0,3] DASH-1** : Historique des appels (filtres, recherche, détail appel).
- **[P0,2] DASH-2** : KPIs simples (appels, manqués, durée moyenne, taux de réponse).
- **[P1,2] DASH-3** : Lecture/transcription des voicemails dans le dashboard.

## EPIC 6 — IA (plomberie MVP, activation V2)

- **[P1,3] AI-1** : Pipeline enregistrement → transcription (Whisper/Deepgram) async (BullMQ).
- **[P1,2] AI-2** : Stockage transcription + affichage (voicemail-to-text).
- **[P2,3] AI-3 (V2)** : Résumé d'appel (LLM) sur transcription.
- **[P2,3] AI-4 (V2)** : Qualification prospect (extraction structurée : besoin/budget/urgence/score).
- **[P2,2] AI-5 (V2)** : Récap automatique par email au client.
- **[P2,8] AI-6 (V3)** : Répondeur IA temps réel (STT+LLM+TTS streaming) + prise de RDV Google Calendar.

## EPIC 7 — Conformité & lancement

- **[P0,2] LEGAL-1** : Consentement enregistrement (message + opt-in) + enregistrement off par défaut.
- **[P0,2] LEGAL-2** : RGPD : politique de rétention + purge automatique + export/suppression données.
- **[P0,2] LEGAL-3** : CGV/CGU, mentions légales, info « complément au mobile / urgences ».
- **[P1,2] LEGAL-4** : Audit log des actions sensibles.

---

### Ordre d'attaque recommandé
**INFRA-1..5 → CALL-1 (spike) → CALL-2/3/4/5 → FLOW-* → ACC/NUM → BILL → DASH → AI plomberie → LEGAL → beta.**
Le spike CALL-1 conditionne tout : le faire en semaine 1–2.
