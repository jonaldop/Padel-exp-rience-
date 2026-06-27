# 09 — MVP ultra-simplifié & stratégie de test marché

## Principe directeur

**Ne construis pas 5 mois d'app avant de savoir si des gens paient.** La techno est maîtrisée ; le
vrai risque, c'est qu'une TPE/artisan n'achète pas ou n'utilise pas. On valide ça **avant** le gros
build, avec un minimum de code.

---

## 1. MVP ultra-simplifié — « le standard en 2 semaines »

Objectif : un produit **vendable et utilisable** sans app native complexe, en s'appuyant au maximum
sur le fournisseur.

### Version « concierge / no-app » (le plus rapide — quelques jours)
1. **Numéro Telnyx FR** acheté par client.
2. **Routage 100 % côté Telnyx** (Call Control, sans app mobile) :
   - Horaires → message d'accueil → **renvoi vers le mobile perso** du client pendant les heures
     d'ouverture ; **répondeur** hors horaires.
   - Messagerie vocale enregistrée → **transcription Whisper** → **email + SMS** au client avec le
     message + le numéro du prospect.
3. **Dashboard ultra-léger** (ou même : juste des emails/Notion au début) : historique des appels,
   voicemails transcrits.
4. **Facturation manuelle** (lien de paiement Stripe) au début.

> Ici, **pas d'app à installer**, pas de CallKit, pas de WebRTC. Tu vends « un numéro pro + standard
> intelligent + messages transcrits par email ». Ça se livre en **jours**, pas en mois. Tu apprends
> énormément et tu encaisses.

### Version « MVP app light » (l'étape d'après — 4–6 semaines)
- App mobile minimaliste (ou même PWA web) pour **passer/recevoir** les appels dans l'app au lieu du
  renvoi, + historique + voicemails.
- Le reste (horaires, répondeur, transcription) déjà éprouvé en mode concierge.

### Ce qu'on coupe explicitement dans le MVP simplifié
- Pas d'IA active, pas d'IVR, pas de multi-users, pas de portabilité auto (numéros neufs only),
  pas de dashboard riche, pas de softphone web complet. Renvoi mobile > WebRTC tant que possible.

---

## 2. Stratégie de test marché (avant de tout développer)

### Étape A — Validation problème/offre (1–2 semaines, ~0 code)
- **15–20 entretiens** avec des artisans/TPE (plombier, électricien, coach, kiné, agence…) :
  - Combien d'appels manqués ? Que se passe-t-il quand ils sont en intervention ?
  - Utilisent-ils leur mobile perso pour le pro ? Ça les gêne ?
  - Seraient-ils prêts à payer ~20 €/mois pour ne plus rater d'appels + recevoir les messages par écrit ?
- **Landing page** + offre claire (« Ne ratez plus jamais un appel client ») + bouton « Réserver mon
  numéro pro » → mesurer le taux de clic/inscription (Stripe payment link ou liste d'attente).

### Étape B — Pré-vente / pilote payant (2–4 semaines)
- Recruter **5–10 clients pilotes payants** (même à tarif réduit) via le MVP **concierge** ci-dessus.
- Critère de go : **des gens paient ET utilisent** (appels routés, voicemails lus). Si personne ne
  paie à 20 €, le problème n'est pas la techno.

### Étape C — Mesurer les bons signaux
- Rétention (utilisent-ils encore après 4 semaines ?).
- Volume d'appels réellement traités.
- Demandes spontanées (« est-ce que ça fait X ? ») → priorise la roadmap.
- Coût réel par client (valider la marge de la doc 06).

### Étape D — Décision
- **Signaux verts** → lancer le build de l'app native (doc 07/08).
- **Signaux faibles** → pivoter l'offre/le segment **avant** d'avoir dépensé le budget dev.

---

## 3. Canaux d'acquisition à tester (cible TPE/artisans FR)
- SEO local + Google Ads (« numéro professionnel », « ne plus rater ses appels »).
- Partenariats : fédérations d'artisans, experts-comptables, chambres de métiers, logiciels de devis/factu.
- Bouche-à-oreille + parrainage (les artisans se parlent).
- LinkedIn/contenu pour les indépendants.

---

## 4. Résumé de la recommandation CTO

| Quand | Quoi |
|---|---|
| **Semaines 1–2** | Entretiens + landing + offre. Zéro app. |
| **Semaines 3–6** | MVP **concierge** (numéro Telnyx + routage + renvoi + voicemail transcrit par email). 5–10 clients payants. |
| **Mois 2–3** | Si ça marche : MVP app light (appels dans l'app). |
| **Mois 3–6** | App complète + facturation + IA V2 (résumé/qualif/récap). |
| **Mois 6–12** | IA V3 (répondeur + RDV Google), scale, portabilité auto. |

> **La discipline qui te fait gagner du temps et de l'argent :** vendre d'abord avec le minimum de
> code (concierge), construire l'app seulement une fois la demande prouvée, et garder l'IA pour la
> montée en gamme — pas pour le lancement.
