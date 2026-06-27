# 00 — Analyse de faisabilité

## Verdict

**Le projet est faisable** avec une petite équipe, à condition de tenir deux disciplines :

1. **Ne pas devenir opérateur.** On s'appuie à 100 % sur un fournisseur télécom/API (Telnyx ou
   Twilio) qui porte le réseau, la réglementation lourde et la portabilité. On reste un éditeur SaaS.
2. **Garder un périmètre MVP étroit.** Aircall/Ringover ont 10 ans et des dizaines de devs.
   On ne réplique pas ça. On vise **« un standard pro fiable + un numéro pro »**, pas un centre
   d'appels complet.

Le vrai risque n'est **pas** technique (les briques existent et sont matures), c'est :
- **la fiabilité perçue des appels** (un appel raté = client perdu),
- **la complexité de la portabilité en France** (lente, paperasse, dépendante du fournisseur),
- **la tentation du scope creep** (CRM, SMS, IVR avancé, multi-pays… plus tard).

## Ce qui est FACILE (briques matures, peu de risque)

| Brique | Pourquoi c'est facile |
|--------|----------------------|
| Numéro pro neuf | Achat d'un DID FR en 1 appel API (Telnyx/Twilio), dispo en minutes |
| Appels entrants/sortants | SDK WebRTC fournis (mobile + web), signalisation gérée par le fournisseur |
| Répondeur / messagerie vocale | TwiML / Telnyx Call Control = quelques lignes, stockage S3 |
| Horaires d'ouverture | Pure logique métier dans notre back-end |
| Historique d'appels | Webhooks fournisseur → notre DB |
| Renvoi vers mobile | Forward natif du fournisseur (« dial » vers le mobile perso) |
| Notification appel manqué | Push (FCM/APNs) + email |
| Tableau de bord web | CRUD classique React |
| Transcription | API Whisper / Deepgram, prêtes à l'emploi |

## Ce qui est DUR (où on met l'attention et le budget)

| Sujet | Difficulté | Stratégie |
|-------|-----------|-----------|
| **Qualité d'appel mobile** (push-to-call, réveil de l'app, CallKit/ConnectionService, codecs, réseau dégradé) | ⭐⭐⭐⭐ | C'est LE chantier. VoIP push (PushKit iOS), ICE/TURN, tests réseau réels. Ne pas sous-estimer. |
| **Appels en arrière-plan / app fermée** | ⭐⭐⭐⭐ | iOS PushKit + CallKit obligatoires ; Android FCM high-priority + ConnectionService |
| **Portabilité du numéro (FR)** | ⭐⭐⭐ | Déléguée au fournisseur, mais process lent (cf. doc 03). Gérer l'attente client. |
| **Conformité (RGPD, enregistrement, ARCEP)** | ⭐⭐⭐ | Consentement enregistrement, hébergement UE, registre des traitements (cf. doc 05) |
| **Facturation à l'usage + abonnement** | ⭐⭐ | Stripe Billing + comptage des minutes |
| **IA fiable sur appels réels** | ⭐⭐⭐ | V2. Latence, langue FR, faux positifs. À itérer, pas à promettre au MVP. |

## Périmètre réaliste du MVP

**Dedans :** compte client + utilisateurs, 1 numéro pro (neuf, portabilité « best effort »),
appels entrants/sortants via app + web, horaires, répondeur, messagerie vocale, historique,
notif appel manqué, renvoi vers mobile, dashboard web, enregistrement + transcription (sans IA active).

**Dehors (V2+) :** IA conversationnelle qui « répond » aux appels, IVR/SVI multi-niveaux, SMS,
multi-numéros avancés, files d'attente, intégrations CRM, multi-pays, softphone desktop natif,
analytics avancées, équipes > 10 users.

## Conditions de succès

- 1 fournisseur télécom unique au départ (Telnyx). Pas d'abstraction multi-provider prématurée.
- Un banc de test « réseau réel » (4G/5G/Wi-Fi, app fermée) dès la 1ʳᵉ semaine.
- Le MVP doit passer 200 appels de bout en bout sans glitch avant d'ouvrir aux clients payants.
- Valider la demande **avant** le gros build (cf. doc 09 — MVP concierge).
