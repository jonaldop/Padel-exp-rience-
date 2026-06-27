# Business Plan — Standard Pro (SaaS standard téléphonique pour TPE)

> Document de travail. Les chiffres sont des **hypothèses réalistes** à affiner avec tes vrais
> coûts (devis Telnyx/Stripe) et tes premiers clients. Objectif : cadrer le modèle économique,
> la rentabilité et la trajectoire.

---

## 1. Résumé exécutif

**Standard Pro** est un standard téléphonique professionnel en SaaS pour les **TPE, artisans,
indépendants et petites PME françaises**. Le client garde son mobile perso et gère sa **ligne pro**
(numéro pro, horaires, répondeur, messagerie, renvoi, IA) depuis une application — sans devenir
opérateur, sans matériel.

- **Cible** : TPE/artisans FR qui utilisent leur mobile perso pour le pro et ratent des appels.
- **Promesse** : « Ne ratez plus jamais un appel client, séparez pro et perso, sans changer de tél. »
- **Modèle** : abonnement mensuel par utilisateur (SaaS récurrent).
- **Avantage** : nettement moins cher qu'Aircall/Ringover, pensé pour les **petits**, mobile-first, IA progressive.
- **Économie** : marge brute ~55 %, pas d'avance de trésorerie (le client paie avant la conso).

---

## 2. Problème & marché

### Le problème
- Des millions d'artisans/indépendants utilisent leur **numéro perso** pour le travail.
- Conséquences : appels ratés (= clients perdus), pas de séparation vie pro/perso, image peu pro,
  aucun outil (horaires, répondeur, historique, qualification).
- Les solutions existantes (Aircall, Ringover) ciblent des **équipes** et sont **trop chères/complexes**
  pour un artisan seul.

### Le marché (France)
| Segment | Ordre de grandeur |
|---|---|
| Entreprises en France | ~4 millions |
| **TPE / micro-entreprises** | ~3,8 millions |
| Artisans (bâtiment, services…) | ~1,7 million |
| Indépendants / professions libérales | ~1,5 million |

- **TAM** (marché total adressable) : plusieurs millions de micro-entreprises « phone-dependent ».
- **SAM** (réaliste, FR, métiers où le téléphone est vital) : ~1,5–2 millions (plombiers, électriciens,
  artisans BTP, coachs, kinés, agences, dépanneurs, taxis/VTC, commerces…).
- **SOM** (cible atteignable 3 ans) : 3 000–5 000 clients = **<0,3 % du SAM** → modeste et crédible.

---

## 3. Produit

- **App mobile + dashboard web** : numéro pro, appels entrants/sortants, horaires, répondeur,
  messagerie vocale, renvoi mobile, historique, notifications.
- **IA (progressive)** : transcription, résumé d'appel, qualification de prospect, récap email,
  prise de RDV Google (V2/V3).
- **Sans matériel, sans être opérateur** : on s'appuie sur Telnyx (fournisseur télécom API).

État actuel : back-end + dashboard en ligne, intégration Telnyx fonctionnelle (numéro, réception,
répondeur). Reste : facturation, sécurité, app native, conformité (cf. roadmap).

---

## 4. Modèle économique & pricing

**Stratégie de prix : casser les prix du marché.** On se positionne volontairement **2 à 3× moins cher**
que Aircall/Ringover pour rafler le segment TPE/artisans qu'ils négligent. On compense la marge plus
faible par unité par le **volume** et un **CAC plus bas** (le prix attire).

| Plan | Cible | Prix HT/mois | Inclus | Concurrents |
|---|---|---|---|---|
| **Essentiel** | Indépendant / artisan solo | **14,99 €** | 1 numéro, app+web, horaires, répondeur, messagerie + transcription, renvoi, historique. ~250 min incluses. | Aircall/Ringover : 20–40 € |
| **Pro** | TPE (1–5 users) | **29 €/user** | Tout Essentiel + **IA** (résumé, qualif, récap email), ~1000 min, multi-users. | Aircall : ~30–40 €/user (min 3) |
| **Business** | PME | **49 €/user** | Tout Pro + appels « illimités raisonnables », support prioritaire, intégrations. | Ringover Pro : ~39–54 € |
| **Add-ons** | — | à l'usage | Minutes sup. (~0,03 €/min), numéros additionnels, IA répondeur, international. | — |

**ARPU cible (revenu moyen/client) : ~22 €/mois** (mix Essentiel/Pro), soit **largement sous le
prix d'entrée d'Aircall/Ringover.**

Principes : prix d'appel **agressif** (14,99 €), minutes incluses raisonnables (protège la marge),
**essai 14 jours**, **sans engagement** (mensuel) → on lève la méfiance des TPE et on se démarque
des concurrents qui imposent souvent 3 utilisateurs minimum / engagement annuel.

---

## 5. Économie unitaire (unit economics)

### Minutes incluses par offre (entrant + sortant mobile)

Tarifs Telnyx retenus (ordres de grandeur, à confirmer) : **entrant 0,005 €/min**, **sortant mobile FR
0,018 €/min**. Le sortant mobile étant le poste cher, c'est lui qui dimensionne les forfaits.

| Offre | Min. **entrantes** incluses | Min. **sortantes mobile** incluses | Total min/mois |
|---|---|---|---|
| **Essentiel** (14,99 €) | 200 | 100 | 300 |
| **Pro** (29 €/user) | 600 | 400 | 1 000 |
| **Business** (49 €/user) | 1 200 | 800 | 2 000 |

> Au-delà : **dépassement facturé ~0,03 €/min** (sortant mobile) — au-dessus de ton coût (0,018 €),
> donc même les gros consommateurs restent **rentables**. International **bloqué par défaut** (anti-fraude).

### Coût & marge détaillés par offre (par client / mois)

| Poste | Essentiel | Pro | Business |
|---|---|---|---|
| **Revenu** | **14,99 €** | **29,00 €** | **49,00 €** |
| Entrant (×0,005 €) | −1,00 € (200) | −3,00 € (600) | −6,00 € (1200) |
| Sortant mobile (×0,018 €) | −1,80 € (100) | −7,20 € (400) | −14,40 € (800) |
| Numéro (DID) | −1,00 € | −1,00 € | −1,00 € |
| Frais Stripe (~1,5 %+0,25 €) | −0,47 € | −0,69 € | −1,00 € |
| Infra amortie | −1,00 € | −1,50 € | −2,00 € |
| Transcription / IA | — | −1,50 € | −2,00 € |
| **Coût total (COGS)** | **−5,27 €** | **−14,89 €** | **−26,40 €** |
| **Marge brute** | **≈ 9,72 € (65 %)** | **≈ 14,11 € (49 %)** | **≈ 22,60 € (46 %)** |

> Conclusion : **moins cher que les concurrents ET rentable sur les 3 offres.** L'entrée à 14,99 €
> garde **65 % de marge** grâce à des minutes incluses calibrées ; le sortant mobile est le levier
> qui sépare les paliers.

### LTV / CAC (sur ARPU blended ~22 €)
| Indicateur | Hypothèse | Valeur |
|---|---|---|
| Marge brute mensuelle/client | mix Essentiel/Pro | ~10 € |
| Churn mensuel | 4 % (micro-SaaS) | durée de vie ~25 mois |
| **LTV** (valeur vie client) | 10 € × 25 | **~250 €** |
| **CAC** (coût d'acquisition) | SEO/partenariats (prix bas = CAC bas) | **~60–100 €** |
| **Ratio LTV/CAC** | | **~2,5–4×** ✅ (sain : viser >3) |
| **Payback CAC** | | **~6–9 mois** |

> Le prix bas est une **arme d'acquisition** : il réduit le CAC (les gens convertissent plus
> facilement à 14,99 € qu'à 30 €) et augmente le volume. On échange un peu de marge unitaire contre
> beaucoup plus de clients — exactement la bonne stratégie pour dominer le segment TPE.

---

## 6. Go-to-market (acquisition)

| Canal | Pourquoi | Coût/effort |
|---|---|---|
| **SEO local + Google Ads** | « numéro professionnel », « ne plus rater ses appels » | moyen |
| **Partenariats** | fédérations d'artisans, chambres de métiers, experts-comptables, logiciels de devis/factu (ex. Tolteck, Obat) | élevé ROI |
| **Bouche-à-oreille / parrainage** | les artisans se parlent ; offrir 1 mois offert par filleul | faible coût |
| **Contenu / réseaux** | LinkedIn, TikTok/Insta pour indépendants | faible coût |
| **Marketplaces** | Shopify-like des artisans, app stores | moyen |

Stratégie : **MVP concierge** d'abord (cf. `docs/09`) → 5–10 clients pilotes payants → preuve →
acquisition payante une fois le tunnel validé.

---

## 7. Concurrence & positionnement

| Acteur | Cible | Prix d'entrée | Notre angle |
|---|---|---|---|
| **Aircall** | équipes/centres d'appels | ~30–40 €/user (souvent 3 users min) | trop cher/complexe pour un solo |
| **Ringover** | PME/équipes | ~20–40 €/user | idem, orienté équipes |
| **OVH Téléphonie** | pro classique | variable | pas d'app mobile moderne/IA |
| **Kavkom, Dstny…** | PME | variable | moins « mobile-first » |

**Notre positionnement** : le **moins cher et le plus simple pour les TPE/artisans solo**, mobile-first,
installation en minutes, IA qui prend les messages. On ne cherche pas les centres d'appels.

---

## 8. Projections financières (3 ans, prudentes)

Hypothèses : ARPU 22 € (prix cassé), marge brute ~10 €/client/mois, churn 4 %/mois, acquisition progressive.

| Fin d'année | Clients payants | MRR | ARR | Revenu annuel (ramping) |
|---|---|---|---|---|
| **Année 1** | ~300 | ~6 600 € | ~79 k€ | ~38 k€ |
| **Année 2** | ~1 500 | ~33 000 € | ~396 k€ | ~210 k€ |
| **Année 3** | ~5 000 | ~110 000 € | ~1,3 M€ | ~800 k€ |

> Le **prix bas vise le volume** : on prévoit plus de clients (300/1500/5000) qu'un concurrent premium,
> car la barrière à l'entrée est plus faible.

### Coûts & seuil de rentabilité
| Poste fixe (mensuel) | An 1 | An 2 |
|---|---|---|
| Équipe (toi + 1–2 devs, support) | 6–12 k€ | 15–25 k€ |
| Infra, outils, Stripe fixe | ~0,5–1 k€ | ~1–2 k€ |
| Marketing / acquisition | 1–3 k€ | 5–15 k€ |
| Juridique (one-shot) | ~3–8 k€ | — |

- **Seuil de rentabilité (break-even)** : quand la **marge brute couvre les coûts fixes**.
  Avec ~10 €/client de marge et ~10 k€/mois de fixes → **~1 000 clients** → atteignable **fin année 2**.
- Année 1 : investissement net (perte) — normal en phase d'amorçage.
- À partir de ~700–1000 clients : **cash-flow positif** et autofinancé.

> ⚠️ Ces chiffres sont des **scénarios**, pas des promesses. Le levier clé = le **rythme d'acquisition**
> et le **churn**. Un churn à 4 % vs 7 % change tout → soigner la fiabilité des appels (rétention).

---

## 9. Roadmap (rappel)
- **3 mois** : valider le marché (concierge), socle technique, beta.
- **6 mois** : produit vendable + facturation Stripe + IA V2 (résumé/qualif).
- **12 mois** : app native (TestFlight/stores), IA V3 (RDV), portabilité auto, premières centaines de clients.

(Détail : `docs/07-roadmap-planning.md`.)

---

## 10. Besoins & financement

Deux voies possibles :
1. **Bootstrap** : l'économie unitaire (LTV/CAC ~3–4×, pas d'avance de tréso) permet de
   s'autofinancer lentement à partir des premiers clients. Idéal si tu veux garder 100 %.
2. **Seed (~150–400 k€)** : pour accélérer dev + acquisition et viser plus vite les 1 000+ clients.
   Justifiable avec une beta qui montre rétention + unit economics.

**Besoins immédiats** (avant lancement payant) :
- Finir : facturation, sécurité (webhooks, anti-fraude), conformité (CGV/RGPD/ARCEP — avocat télécom).
- Sortir Telnyx du mode essai (compte vérifié + crédité).
- App native pour la fiabilité des appels (rétention).

---

## 11. Risques principaux
| Risque | Impact | Mitigation |
|---|---|---|
| Fiabilité des appels insuffisante | churn élevé | app native (CallKit), monitoring qualité, renvoi de secours |
| Acquisition trop chère (CAC) | rentabilité repoussée | partenariats, bouche-à-oreille, SEO avant ads |
| Réglementaire (ARCEP/RGPD/urgences) | blocage légal | avocat télécom dès le lancement payant |
| Dépendance Telnyx | risque fournisseur | adaptateur isolé, plan B Twilio |
| Fraude télécom | perte financière | international bloqué, plafonds, vérif signatures |

---

## 12. Synthèse
- **Marché large** (millions de TPE/artisans FR), **besoin réel** (appels ratés), **concurrents chers/complexes**.
- **Modèle SaaS sain** : récurrent, marge ~55 %, LTV/CAC ~3–4×, pas d'avance de tréso.
- **Trajectoire crédible** : break-even vers ~700 clients (mi-année 2), ~1,4 M€ ARR potentiel à 3 ans.
- **Clés du succès** : fiabilité des appels (rétention) + acquisition maîtrisée (partenariats) + conformité.
