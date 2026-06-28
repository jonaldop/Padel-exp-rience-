# Build de l'app mobile sur GitHub (TestFlight, depuis ton téléphone)

Tout est prêt côté code : une **GitHub Action** (`.github/workflows/eas-ios.yml`) build l'app
iOS dans le cloud (EAS) et l'envoie sur **TestFlight**. Tu la déclenches d'un bouton, **depuis
ton téléphone**. Il te reste juste à **ajouter 5 secrets** (tes clés — toi seul peux le faire).

## Étape 1 — Ajouter les secrets GitHub
GitHub → ton repo → **Settings → Secrets and variables → Actions → New repository secret**.
Crée ces 5 secrets :

| Secret | Où l'obtenir |
|---|---|
| `EXPO_TOKEN` | https://expo.dev → (crée un compte gratuit) → **Account settings → Access tokens → Create token** |
| `ASC_API_KEY_ID` | App Store Connect → **Users and Access → Integrations → App Store Connect API → Generate API Key** (rôle **App Manager**) → c'est le **Key ID** |
| `ASC_API_KEY_ISSUER_ID` | Même page → **Issuer ID** (en haut de la liste des clés) |
| `ASC_API_KEY_BASE64` | Le fichier **`.p8`** téléchargé (une seule fois) à cette même étape, **encodé en base64** (voir note ci-dessous) |
| `APPLE_TEAM_ID` | https://developer.apple.com/account → **Membership** → **Team ID** (10 caractères) |

> **Note base64 du `.p8`** : le fichier `.p8` doit être collé en base64 dans le secret.
> Le plus simple est de le faire sur un **ordinateur** (commande `base64 AuthKey_XXXX.p8`) une
> seule fois, puis coller le résultat. ⚠️ Ne mets jamais ce `.p8` en ligne ailleurs (c'est une clé privée).

## Étape 2 — Lancer le build (depuis le téléphone)
GitHub → onglet **Actions** → workflow **« Build iOS → TestFlight »** → bouton **Run workflow**
→ laisse « submit » coché → **Run**.

- Le build tourne dans le cloud (~15-25 min).
- À la fin, la version apparaît dans **App Store Connect → TestFlight**.
- Ajoute-toi comme **testeur interne** → installe via l'app **TestFlight** sur ton iPhone. 🎉

## Si le tout-en-ligne coince (1ʳᵉ fois)
La 1ʳᵉ génération de certificats iOS est parfois capricieuse en mode 100 % automatique.
Plan B (15 min sur un ordinateur, une seule fois) :
```bash
cd apps/mobile && npm install
npm i -g eas-cli && eas login
eas build --platform ios --profile production   # se connecte à Apple, crée les certifs (stockés chez EAS)
```
Une fois les certifs créés chez EAS, **tous les builds suivants** se font via la GitHub Action
depuis le téléphone, sans rien d'autre.

## Ce que ça NE fait pas encore
- L'**appel PRO natif** (WebRTC Telnyx + CallKit / sonnerie tél verrouillé) = phase suivante
  (SDK natif + dev build + tests device). La V1 valide auth, clients, historique, messagerie, clavier.
