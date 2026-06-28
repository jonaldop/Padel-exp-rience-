# Standard Pro — App mobile (React Native / Expo)

App native iOS/Android qui **réutilise le back-end déjà en ligne** (Railway).
Mêmes comptes, mêmes données que le dashboard web.

## Écrans (V1)
- **Connexion / inscription** (même API que le web).
- **Récents** : historique des appels.
- **Clients** : carnet + recherche + ajout + appel en 1 tap.
- **Clavier** : pavé de numérotation (appel via la ligne du téléphone pour l'instant).
- **Messagerie** : messages vocaux.
- **Compte** : infos + déconnexion.

> ⚠️ **Appel PRO natif (WebRTC + CallKit / sonnerie même tél verrouillé)** = **prochaine phase**.
> Il nécessite le SDK Telnyx React Native + un *dev build* + des tests sur appareil réel.
> La V1 valide déjà toute la partie données + un clavier qui appelle via la ligne du téléphone.

## Prérequis
- Node 20+, et `npm install -g eas-cli`
- Un **compte Expo** (gratuit) : https://expo.dev
- Un **compte Apple Developer** (99 €/an) pour TestFlight/App Store
- (Android) un compte Google Play (25 € une fois) pour le Play Store

## Lancer en local (aperçu rapide)
```bash
cd apps/mobile
npm install
npx expo start         # puis ouvrir dans Expo Go (iOS/Android) en scannant le QR
```
> Expo Go suffit pour voir les écrans (connexion, clients, historique…). Les appels
> natifs avancés nécessiteront un *dev build* (étape suivante).

## Configurer l'URL du back-end
Dans `app.json` → `expo.extra.apiUrl` (déjà réglé sur l'URL Railway de prod).

## Builder pour TestFlight (iOS, sans Mac, dans le cloud)
```bash
cd apps/mobile
eas login
eas build:configure
eas build --platform ios --profile production
# puis envoyer sur TestFlight :
eas submit --platform ios --latest
```
- EAS gère la signature (il te connectera à ton compte Apple).
- Une fois soumis, la build apparaît dans **App Store Connect → TestFlight**.
- Ajoute-toi comme **testeur interne** → installe via l'app **TestFlight** sur ton iPhone.

## Android (piste interne Play Store)
```bash
eas build --platform android --profile production
eas submit --platform android --latest
```

## Prochaine étape : l'appel PRO natif
- Intégrer le **SDK WebRTC Telnyx React Native** (token via `/telnyx/webrtc-token`).
- Ajouter **CallKit (iOS)** / **ConnectionService (Android)** + **push VoIP** pour sonner
  même app fermée/téléphone verrouillé.
- Ça se fait avec un **dev build** (`eas build --profile development`) et des tests sur device.
