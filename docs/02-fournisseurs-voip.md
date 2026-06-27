# 02 — Comparatif des fournisseurs télécom / API

On a besoin d'un fournisseur qui offre : **numéros FR (DID)**, **portabilité FR**, **API d'appel
programmable** (call control), **SDK WebRTC mobile + web**, **enregistrement**, et de bons **webhooks**.

## Tableau comparatif

| Critère | **Telnyx** ✅ | **Twilio** | **OVH Télécom** | **Plivo** |
|---|---|---|---|---|
| Numéros FR (DID) | Oui | Oui | Oui (FR natif) | Oui |
| Portabilité FR | Oui, support OK | Oui, très rodé | Oui (acteur FR) | Limitée/variable |
| API Call Control programmable | **Excellent** | Excellent (TwiML/Voice) | Faible / orienté télécom classique | Bon |
| SDK WebRTC mobile + web | Oui (iOS/Android/JS) | Oui (mûr, doc++) | **Non/limité** | Oui |
| Prix appels/numéros | **Le moins cher** | Le plus cher | Compétitif FR | Pas cher |
| Qualité réseau | Très bonne (réseau IP privé) | Très bonne | Bonne (FR) | Bonne |
| Maturité / doc / communauté | Bonne | **La meilleure** | Faible (dev) | Moyenne |
| Conformité UE / hébergement | Oui (region EU) | Oui (region EU/Irlande) | **FR natif** ✅ | Oui |
| Support des petits comptes | Bon, réactif | Correct mais « gros » | Variable | Correct |
| Facturation à la seconde/usage | Oui | Oui | Moins granulaire | Oui |

## Recommandation

### 🥇 Choix MVP : **Telnyx**
- Meilleur **rapport contrôle / prix / qualité**. API « Call Control v2 » très propre pour ce qu'on
  veut faire (sonner, transférer, enregistrer, voicemail).
- SDK WebRTC mobile **et** web → indispensable pour notre app et le web.
- Réseau IP privé = bonne qualité voix, moins cher que Twilio (≈ 30–50 % moins cher sur l'usage).
- Region UE disponible (RGPD). Support correct pour les jeunes boîtes.

### 🥈 Plan B / fallback : **Twilio**
- Plus cher mais **le plus mature** : doc, SDK, communauté, recrutement. Si on a un blocage technique
  critique chez Telnyx, on peut basculer une fonction.
- Pertinent si on lève des fonds et qu'on privilégie la vitesse/fiabilité au coût.

### Pourquoi pas OVH / Plivo au MVP
- **OVH Télécom** : excellent comme opérateur FR (et atout souveraineté/portabilité FR), **mais**
  l'API programmable et surtout le **SDK WebRTC mobile** sont faibles/inexistants pour notre usage app.
  → À garder en tête pour la **portabilité** ou un futur axe « 100 % FR souverain », pas pour piloter
  les appels dans l'app au MVP.
- **Plivo** : bon et pas cher, mais portabilité FR moins fiable et écosystème WebRTC mobile moins
  complet que Telnyx. Moins de raisons de le préférer à Telnyx.

## Décision d'architecture : éviter le multi-provider trop tôt

Tentant de « s'abstraire du fournisseur » dès le départ. **Ne pas le faire.** Chaque fournisseur a
sa propre logique d'appel (TwiML ≠ Call Control), ses SDK, ses webhooks. Une couche d'abstraction
prématurée double le coût et fuit toujours.

→ **MVP = Telnyx en dur.** On isole proprement le code télécom dans **un module NestJS** (`telecom/`)
avec une interface interne, mais on n'implémente qu'un seul adaptateur. Le jour où on veut Twilio en
secours, l'interface existe déjà.

## Coûts indicatifs fournisseur (ordre de grandeur, à re-vérifier au devis)

| Poste | Telnyx (ordre de grandeur) |
|---|---|
| Numéro FR (DID) local | ~ 0,50–1 € / mois |
| Appel entrant vers DID | ~ 0,002–0,005 € / min |
| Appel sortant FR fixe/mobile | ~ 0,005–0,02 € / min |
| Enregistrement / stockage | faible (qq centimes/h) + notre S3 |
| Portabilité (frais one-shot) | ~ variable, souvent 0–15 € / numéro |

> ⚠️ Ces chiffres sont des **ordres de grandeur** pour dimensionner. Avant lancement : demander des
> devis fermes Telnyx **et** Twilio, et tester la qualité réelle sur 2 semaines.
