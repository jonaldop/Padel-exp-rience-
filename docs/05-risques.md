# 05 — Risques techniques & réglementaires

## 1. Risques TECHNIQUES

| # | Risque | Impact | Mitigation |
|---|--------|--------|-----------|
| T1 | **App ne sonne pas (app fermée / arrière-plan)** | Critique (perte client) | PushKit VoIP + CallKit (iOS), FCM high-priority + ConnectionService (Android). Tests sur vrais appareils, vrais réseaux. Fallback renvoi mobile. |
| T2 | **Qualité voix dégradée** (latence, écho, coupures) | Élevé | Codecs Opus, TURN/STUN du fournisseur, mesure du MOS, alertes qualité, choix réseau IP privé (Telnyx) |
| T3 | **Latence de l'IA temps réel** (V3) | Élevé (feature inutilisable) | STT/TTS streaming, budget < 800 ms, n'activer que si ça tient. Ne pas promettre avant. |
| T4 | **Dépendance fournisseur unique** | Élevé | Isoler le module `telecom/` derrière une interface ; plan B Twilio documenté ; garder les données d'appel chez nous |
| T5 | **Fraude télécom (toll fraud)** : appels surtaxés/internationaux | Financier direct | International **bloqué par défaut**, plafonds de dépense/compte, détection d'anomalies, whitelist |
| T6 | **Webhooks perdus / rejoués** | Données d'appel incohérentes | Signature vérifiée, idempotence (event_id unique), file de retry, réconciliation via API |
| T7 | **Pics de charge** | Moyen | Stateless + autoscale, file BullMQ pour l'asynchrone, le média est chez le fournisseur (pas chez nous) |
| T8 | **Coûts qui dérivent** (minutes, stockage, IA) | Financier | Metering par appel, alertes de coût, quotas par plan |
| T9 | **Bugs de routage horaires / fuseaux / jours fériés** | Moyen | Tests sur `Europe/Paris`, DST, fériés FR ; suite de tests dédiée au call routing |
| T10 | **Mise en conformité store (Apple/Google)** pour la VoIP | Moyen | Respect PushKit/CallKit, permissions micro, review guidelines dès le départ |

## 2. Risques RÉGLEMENTAIRES (France / UE)

> ⚠️ Je ne suis pas juriste — ces points doivent être validés avec un **avocat télécom/RGPD** avant
> le lancement commercial. Voici la cartographie des sujets à couvrir.

| # | Sujet | Obligation / risque | Action |
|---|-------|---------------------|--------|
| R1 | **Statut ARCEP** | Fournir des services de comm. électroniques peut impliquer une **déclaration d'opérateur auprès de l'ARCEP**. En s'appuyant sur Telnyx/OVH (qui sont opérateurs), on limite l'exposition, mais le statut de revendeur/MVNO-like doit être clarifié. | Conseil juridique télécom dès que le modèle se précise |
| R2 | **RGPD** | On traite des données perso + **contenu d'appels** (sensible). Base légale, registre des traitements, DPA avec sous-traitants (Telnyx, Stripe, IA), durée de conservation, droit d'accès/suppression. | Registre RGPD, DPA signés, hébergement UE, politique de rétention |
| R3 | **Enregistrement des appels** | Enregistrer un appel **sans consentement** est illégal. Information des deux parties requise. | Message d'info au début d'appel + consentement, enregistrement **off par défaut**, configurable |
| R4 | **Transcription / IA sur la voix** | Données potentiellement sensibles envoyées à un service IA. | IA UE ou auto-hébergée si possible, anonymisation, DPA, opt-in client |
| R5 | **Numéros d'urgence (112/15/17/18)** | Un service de téléphonie peut être tenu d'**acheminer les appels d'urgence** et de fournir une localisation. Sujet juridique majeur. | Clarifier avec le fournisseur + avocat ; au minimum **informer le client** que le service ne remplace pas une ligne d'urgence (cf. mobile perso) |
| R6 | **Conservation des données de trafic** | Obligations légales de conservation de certaines métadonnées de communication. | Politique de rétention conforme, en s'appuyant sur le fournisseur |
| R7 | **Démarchage / présentation du numéro** | Règles ARCEP sur le caller ID (lutte anti-spam vocal, STIR/SHAKEN, plages 09/01x). Interdiction d'usurper un numéro. | Ne présenter que des DID qu'on détient ; respecter le plan de numérotation |
| R8 | **Facturation & TVA UE** | TVA, mentions légales, CGV/CGU, rétractation pro. | Stripe Tax + CGV rédigées par un juriste |
| R9 | **Accessibilité / consommateur** | CGV claires, droit de résiliation. | CGV/CGU conformes droit FR |

### Synthèse réglementaire (priorités)
1. **Avocat télécom + RGPD** avant lancement payant (ARCEP, urgences, enregistrement).
2. **Tout héberger en UE**, DPA avec chaque sous-traitant.
3. **Enregistrement off par défaut** + consentement explicite.
4. **Documenter clairement** que le service est complémentaire au mobile perso (notamment urgences).

Ces sujets ne bloquent pas le **prototype/test marché** (cf. doc 09), mais doivent être réglés avant
de facturer à grande échelle.
