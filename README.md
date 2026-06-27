# Standard téléphonique pro VoIP + IA — Dossier de conception (MVP)

SaaS de standard téléphonique professionnel pour **TPE, artisans, indépendants et PME françaises**.
Le client garde son forfait mobile perso et gère sa **ligne pro** via une app VoIP : numéro neuf
ou portabilité, appels entrants/sortants, horaires, répondeur, messagerie vocale, transferts, et
une **IA optionnelle** (prise de message, résumé, qualification, récap email, RDV Google).

> Positionnement : **on n'est pas opérateur**. On s'appuie sur un fournisseur télécom/API
> (Telnyx / Twilio). On vend du logiciel + de l'usage, pas du réseau.

## Document de conception (lecture dans l'ordre)

| # | Document | Contenu |
|---|----------|---------|
| 00 | [Faisabilité](docs/00-faisabilite.md) | Verdict, ce qui est dur/facile, périmètre réaliste |
| 01 | [Architecture & techno & flux d'appels](docs/01-architecture.md) | Stack, schémas appels entrants/sortants, IA |
| 02 | [Fournisseurs VoIP](docs/02-fournisseurs-voip.md) | Twilio vs Telnyx vs OVH vs Plivo + recommandation |
| 03 | [Parcours utilisateur & portabilité](docs/03-parcours-utilisateur.md) | Onboarding, parcours portabilité FR |
| 04 | [Modèle de données](docs/04-modele-donnees.md) | Entités principales, schéma logique |
| 05 | [Risques techniques & réglementaires](docs/05-risques.md) | VoIP, RGPD, ARCEP, conformité |
| 06 | [Coûts & pricing](docs/06-couts-pricing.md) | Coût par client, marge, grille tarifaire |
| 07 | [Planning & roadmap](docs/07-roadmap-planning.md) | MVP par étapes, roadmap 3/6/12 mois, à éviter |
| 08 | [Tickets de dev](docs/08-tickets-dev.md) | Backlog prêt pour l'équipe (epics + tickets) |
| 09 | [MVP ultra-simplifié & test marché](docs/09-mvp-simplifie-test-marche.md) | Le lancement le plus rapide possible |

## TL;DR du CTO

- **Faisable**, mais le piège n°1 c'est de vouloir copier Aircall. On fait **un MVP étroit et fiable**.
- **Fournisseur : Telnyx** (meilleur rapport qualité/prix/contrôle, SDK WebRTC, support portabilité FR).
  Twilio en plan B (plus cher, plus mûr). OVH/Plivo écartés pour le MVP.
- **Stack : NestJS (Node/TS) + PostgreSQL + Redis** au back, **React** en admin web,
  **React Native (Expo)** en mobile, **CallKit/ConnectionService + push (APNs/FCM)** pour les appels.
- **IA en V2**, pas en MVP. On câble juste l'enregistrement + transcription (Whisper) dès le départ
  pour pouvoir l'ajouter sans refonte.
- **Avant de coder 6 mois** : valider le marché avec un MVP « concierge » (numéro Telnyx + renvoi +
  transcription manuelle) sur 5–10 clients payants. Cf. doc 09.
