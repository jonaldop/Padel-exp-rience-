# 06 — Coûts par client & modèle de pricing

> Chiffres en **ordres de grandeur** pour raisonner sur la marge. À recaler avec les devis fermes
> Telnyx/Twilio/Stripe/IA avant lancement.

## 1. Structure de coûts par client (mensuel)

Hypothèse : 1 client = 1 numéro pro, 1–2 utilisateurs, **~ 500 minutes/mois** (entrant + sortant).

| Poste | Coût mensuel estimé / client |
|---|---|
| Numéro DID FR | ~ 0,50–1 € |
| Minutes (entrant + sortant FR, ~500 min) | ~ 2–6 € |
| Stockage média (voicemails/enregistrements) | ~ 0,10–0,50 € |
| Push/SMS (notifs, OTP) | ~ 0,10–0,50 € |
| Transcription (Whisper/Deepgram, optionnel) | ~ 0,5–2 € selon volume |
| Stripe (frais ~1,5 % + 0,25 €/transaction) | ~ 0,5–1 € |
| Infra mutualisée (back, DB, S3) amortie | ~ 1–3 € |
| **IA (résumé/qualif, V2, si activée)** | ~ 1–4 € selon usage |
| **Total coût variable (MVP, sans IA active)** | **~ 5–12 € / client / mois** |
| **Total avec IA (V2)** | **~ 8–18 € / client / mois** |

> Le poste qui dérape le plus = **les minutes** (gros utilisateurs) et **l'IA**. → metering + quotas.

## 2. Coûts fixes (à amortir sur la base clients)

- Dev & maintenance (le gros poste réel).
- Apple Developer (99 $/an) + Google Play (25 $ one-shot).
- Hébergement UE de base (~ 100–400 €/mois selon charge).
- Outils (Sentry, monitoring, email…).
- **Juridique** (avocat télécom/RGPD, CGV) : poste one-shot non négligeable.

## 3. Modèle de pricing recommandé

**Abonnement mensuel par utilisateur, avec minutes incluses + dépassement à l'usage.** Simple,
prévisible pour des TPE, et protège la marge.

| Plan | Cible | Prix indicatif | Inclus |
|---|---|---|---|
| **Starter** | Indépendant / artisan solo | **~ 19–24 €/mois HT / user** | 1 numéro, appels app+web, horaires, répondeur, messagerie + transcription, historique, renvoi mobile, ~500 min FR incluses |
| **Pro** | TPE/PME (2–10 users) | **~ 35–45 €/mois HT / user** | Tout Starter + multi-users, **IA (résumé, qualif, récap email)**, plus de minutes (~1500), support prioritaire |
| **Add-ons** | — | à l'usage | Minutes supplémentaires, numéros additionnels, **IA répondeur (V3)**, international (sur demande) |

### Principes de pricing
- **Par utilisateur** (logique SaaS, scale avec la valeur, comme Aircall/Ringover mais moins cher).
- **Minutes incluses raisonnables** + dépassement transparent → évite les clients « gouffres ».
- **IA = levier de montée en gamme** (Pro), pas dans l'entrée de gamme.
- **Essai 14 jours** avec numéro neuf instantané (zéro friction).
- **Engagement mensuel** (pas d'annuel forcé) → réduit la barrière pour des TPE méfiantes.
- Positionnement **nettement moins cher qu'Aircall/Ringover** (qui démarrent plus haut et ciblent
  des équipes plus grosses) : c'est notre angle « TPE/artisans ».

### Marge attendue
- Starter à ~20 €, coût variable ~5–10 € → **marge brute ~ 50–75 %** (hors coûts fixes).
- La marge se construit sur le **logiciel et l'IA**, pas sur les minutes (qu'on revend quasi à prix
  coûtant pour rester compétitif).

## 4. Garde-fous économiques
- **Bloquer l'international par défaut** (fraude + coûts).
- **Plafond de dépense par compte** + alertes.
- **Quota de transcription/IA** par plan.
- Surveiller le **coût par client réel** (dashboard interne) dès les premiers clients.
