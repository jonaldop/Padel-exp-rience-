# 07 — Planning MVP, fonctionnalités à éviter & roadmap

## 1. Planning MVP par étapes (≈ 4–5 mois à 2–3 devs)

Hypothèse d'équipe : 1 back/télécom, 1 mobile RN, 1 fullstack/web (ou toi + 2 devs).

### Phase 0 — Cadrage & socle (semaines 1–2)
- Compte Telnyx, achat d'un DID FR de test, premier appel API qui sonne.
- Repo, CI/CD, environnements, infra UE, schéma DB de base, auth.
- **Spike critique** : prouver « app fermée qui sonne » sur iOS (PushKit/CallKit) **et** Android.
  → si ça ne marche pas, tout le reste est inutile. À dérisquer en premier.

### Phase 1 — Appels de bout en bout (semaines 3–6)
- App mobile RN : login, recevoir un appel entrant (CallKit/ConnectionService), passer un appel sortant.
- Web : login admin minimal.
- Back : routage entrant (résoudre DID → compte → user), webhooks, call_logs.
- **Critère de sortie : 50 appels in/out fiables sur réseaux réels.**

### Phase 2 — Logique standard téléphonique (semaines 7–10)
- Horaires d'ouverture + bascule ouvert/fermé.
- Répondeur hors horaires + message d'accueil (TTS/upload).
- Messagerie vocale (enregistrement → S3) + lecture dans l'app/web.
- Renvoi vers mobile perso.
- Notifications appel manqué (push + email).
- Historique des appels (app + web).

### Phase 3 — Compte, facturation, polish (semaines 11–14)
- Création de compte complète + gestion des utilisateurs + rôles.
- Choix numéro neuf (self-service) ; portabilité « assistée » (formulaire + traitement manuel).
- Stripe Billing (abonnement + essai), metering minutes.
- Dashboard web (KPIs simples : appels, manqués, durée).
- Transcription des voicemails (plomberie IA câblée, IA inactive).

### Phase 4 — Durcissement & beta (semaines 15–18)
- Tests de charge, qualité d'appel, monitoring, anti-fraude.
- Conformité : consentement enregistrement, CGV, RGPD, mentions urgences.
- Beta fermée avec 5–10 clients réels payants.
- **Critère de lancement : 200 appels sans incident + 0 bug bloquant.**

## 2. Fonctionnalités à ÉVITER au départ (anti-scope-creep)

| À NE PAS faire au MVP | Pourquoi |
|---|---|
| IA qui « parle » en temps réel (V3) | Très dur (latence), risqué, pas indispensable pour vendre |
| IVR / SVI multi-niveaux (« tapez 1 ») | Complexité élevée, peu utile pour un artisan solo |
| Files d'attente / call center | Hors cible TPE |
| SMS / messagerie écrite | Autre produit, autres règles (10DLC, A2P) |
| Intégrations CRM (HubSpot, etc.) | Plus tard, après product-market fit |
| Multi-pays / numéros internationaux | Complexité réglementaire ×N |
| Softphone desktop natif | Le web suffit |
| Multi-provider télécom | Abstraction prématurée (cf. doc 02) |
| Analytics avancées / reporting fin | Dashboard simple suffit au début |
| Sonnerie simultanée sur N agents | V2 |

## 3. Roadmap 3 / 6 / 12 mois

### 🎯 3 mois — Valider & poser le socle
- **Test marché** réalisé (MVP concierge, cf. doc 09) → ≥ 5 clients payants confirment la demande.
- Socle technique : appels in/out fiables, horaires, répondeur, voicemail, historique, renvoi.
- Onboarding self-service + numéro neuf + Stripe.
- Beta fermée lancée.

### 🚀 6 mois — Produit vendable & IA V2
- MVP complet en production, premiers clients payants stables.
- **IA V2** activée : résumé d'appel, qualification prospect, récap email automatique.
- Portabilité semi-automatisée (workflow + suivi de statut).
- Multi-users robuste, dashboard enrichi.
- Premiers efforts d'acquisition (SEO, partenariats artisans, bouche-à-oreille).

### 📈 12 mois — Scale & différenciation IA
- **IA V3** : répondeur intelligent (prise de message conversationnelle, **prise de RDV Google
  Calendar**) — déployée prudemment.
- Sonnerie multi-agents / petites équipes, files simples.
- Portabilité 100 % automatisée.
- Intégrations clés (Google Agenda, peut-être 1 CRM).
- Industrialisation : SLA, monitoring qualité, support, plan B Twilio activable.
- Objectif : product-market fit confirmé + base clients en croissance régulière.
