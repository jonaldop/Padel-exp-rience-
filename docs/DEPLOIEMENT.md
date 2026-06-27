# Déploiement — Vercel, Supabase & hébergement back-end

Réponse directe aux questions « on peut utiliser Vercel ? » et « Supabase c'est gratuit ? ».

## Vue d'ensemble : 2 morceaux à héberger

```
   FRONT (apps/web)  →  Vercel   ✅ parfait, gratuit
   BACK  (apps/api)  →  PAS Vercel ❌  →  Railway / Render / Fly / Scaleway
   DONNÉES           →  fichier JSON (MVP)  →  plus tard : Supabase/Postgres
```

## 1. Le FRONT sur Vercel ✅

Vercel est **idéal** pour le dashboard web (React/Vite, fichiers statiques).

- Connecte le repo GitHub à Vercel.
- **Root Directory** : `apps/web`
- Build auto (le `apps/web/vercel.json` est déjà configuré).
- Variable d'environnement : `VITE_API_URL` = l'URL publique de ton back-end.
- Gratuit pour ton usage. ✅

## 2. Le BACK-END : PAS sur Vercel ❌ — voici pourquoi

Vercel est **serverless** (petites fonctions sans état, qui s'arrêtent après chaque requête, durée limitée). Or notre back-end est un **serveur qui tourne en permanence** :
- il reçoit les **webhooks d'appel** Telnyx à tout moment,
- il gère l'**état des appels** en cours,
- il fera tourner des **tâches de fond** (transcription, notifications),
- (plus tard) des **WebSockets** temps réel.

➡️ Ça demande un hébergement **« serveur persistant »**, pas du serverless. Options (toutes avec offre gratuite/à bas coût pour démarrer) :

| Hébergeur | Pour | Note |
|---|---|---|
| **Railway** | démarrer vite | déploiement Git en 2 clics, simple ✅ |
| **Render** | démarrer vite | offre gratuite, simple |
| **Fly.io** | proche des users | bon réseau, régions EU |
| **Scaleway / OVH** | **RGPD / souveraineté FR** | recommandé quand tu auras des clients (données en France) |

Le back-end est **dockerisé** (`apps/api/Dockerfile`) → déployable tel quel sur n'importe lequel.
Variables à régler : `JWT_SECRET`, `PUBLIC_API_URL`, `WEB_ORIGIN`, et les `TELNYX_*`.

> ⚠️ Pour les **vrais appels**, le back doit être joignable par Telnyx (URL publique HTTPS) →
> configure cette URL comme **Webhook** de ta Call Control Application Telnyx : `https://<back>/calls/webhook`.

## 3. Supabase — oui, gratuit, mais pour PLUS TARD

Supabase = **PostgreSQL hébergé** (+ extras), avec une offre gratuite. Bon choix **quand on passe à une vraie base de données**.

- **Aujourd'hui (MVP)** : on stocke dans un **fichier JSON** (`DbService`). Zéro install, parfait pour démarrer et tester. Suffisant pour une beta de quelques clients.
- **Quand migrer vers Supabase/Postgres ?** dès que tu as plusieurs clients réels / besoin de fiabilité / requêtes complexes. Le schéma cible existe déjà : `apps/api/prisma/schema.prisma`.
- Migration = réimplémenter les méthodes de `DbService` avec Prisma + pointer `DATABASE_URL` sur Supabase. Le reste du code ne bouge pas.

> 💡 Supabase héberge surtout aux US/EU — pour des clients FR, choisis la **région EU** (RGPD).

## 4. Récapitulatif de l'archi de déploiement cible

```
        Utilisateur
            │
     ┌──────┴───────┐
     ▼              ▼
  Vercel        (mobile app plus tard)
  (front web)
     │  appels API (HTTPS)
     ▼
  Railway/Render/Scaleway  ◄──webhooks── Telnyx
  (back NestJS, Docker)
     │
     ▼
  Fichier JSON (MVP)  →  Supabase/Postgres (scale)
```

## 5. Pour tester MAINTENANT sans déployer
Voir [DEV.md](DEV.md) — lancement local en quelques commandes (back + front), avec ou sans Telnyx.
