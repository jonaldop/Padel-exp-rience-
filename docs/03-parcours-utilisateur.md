# 03 — Parcours utilisateur & portabilité du numéro (France)

## 1. Parcours d'inscription / onboarding (client)

```
1. Découverte (site web) → "Essai 14 jours" ou démo.
2. Création de compte :
      - Email + mot de passe (ou OTP SMS).
      - Infos entreprise : raison sociale, SIRET, adresse (utile pour numéro géographique + facture).
3. Choix de l'offre (Starter / Pro) + carte bancaire (Stripe) — essai sans débit.
4. Choix du numéro :
      ┌─ Option A : NOUVEAU numéro pro
      │     → l'utilisateur choisit un indicatif/format (01–05 géographique, 09 non géo, 06/07 mobile),
      │       on réserve un DID Telnyx instantanément → numéro actif en quelques minutes.
      │
      └─ Option B : PORTER mon numéro existant
            → formulaire de portabilité (cf. §3) → numéro provisoire en attendant,
              ou renvoi temporaire vers l'app.
5. Configuration express (wizard) :
      - Message d'accueil (texte→TTS ou enregistrement).
      - Horaires d'ouverture.
      - Comportement hors horaires (répondeur).
      - Renvoi vers mobile perso oui/non.
6. Installation app mobile (lien SMS/QR) → connexion → autoriser micro + notifications.
7. Appel test guidé ("appelez votre nouveau numéro pro") → validation que ça sonne dans l'app.
8. Prêt. Dashboard web disponible pour l'admin.
```

### Gestion des utilisateurs (multi-users)
- Rôles : **Owner** (facturation, tout), **Admin** (config), **Agent** (passe/reçoit les appels).
- Un compte = 1 entreprise = 1+ numéros + 1..N utilisateurs.
- Un numéro peut sonner sur 1 user (MVP) ; « sonner plusieurs agents » = V2.

## 2. Parcours d'usage quotidien (agent)

- **Recevoir un appel :** notification d'appel (CallKit/ConnectionService) même app fermée →
  décrocher → parler → fin → log auto.
- **Passer un appel :** ouvrir l'app → clavier/contacts → présente le numéro pro → appel.
- **Appel manqué :** notif push + email, visible dans l'historique, message vocal écoutable + transcrit.
- **Hors horaires :** l'app ne sonne pas, le répondeur prend le message.
- **Absence ponctuelle :** bascule « renvoi vers mon mobile perso » en 1 tap.

## 3. Parcours de PORTABILITÉ d'un numéro (France) — le point sensible

> En France la portabilité fixe et mobile passe par le **RIO** (Relevé d'Identité Opérateur) et un
> mandat de portage. Le processus est **normé mais lent** et dépend du fournisseur (Telnyx/Twilio/OVH
> font l'interface avec les opérateurs FR). On **délègue** l'exécution au fournisseur ; nous, on gère
> l'expérience et l'attente.

### Étapes côté client

```
1. Le client obtient son RIO :
      - Mobile : composer le 3179 (gratuit) → reçoit le RIO par SMS.
      - Fixe : le RIO figure sur la facture / via le service client de l'opérateur actuel.
2. Le client fournit dans notre app :
      - Numéro à porter, RIO, titulaire exact de la ligne, adresse, justificatif,
      - Mandat de portage signé (signature électronique dans l'app).
3. On transmet la demande de portabilité au fournisseur (API/portail Telnyx).
4. Le fournisseur traite avec les opérateurs FR :
      - Délais typiques : quelques jours ouvrés (souvent ~ 3 à 10 j selon ligne fixe/mobile/opérateur).
      - Une DATE de bascule est fixée.
5. Pendant l'attente :
      - Le client peut déjà utiliser un numéro provisoire OU faire un renvoi de son numéro actuel
        vers un numéro temporaire chez nous (selon ce que permet son opérateur).
6. Jour J : la bascule s'effectue (souvent une fenêtre horaire). Le numéro arrive chez nous → routé
   vers l'app. ⚠️ courte coupure possible le jour de bascule.
7. Confirmation au client + test d'appel.
```

### Règles à anticiper (sinon ça casse)
- **Le titulaire doit correspondre** exactement (nom/raison sociale) — première cause de rejet.
- **Ne pas résilier l'ancienne ligne avant** la bascule (la résiliation annule la portabilité).
- **Numéros fixes géographiques** liés à une zone : contraintes sur l'indicatif.
- **Portabilité = demande de l'opérateur receveur** : c'est nous (via le fournisseur) qui initions,
  pas le client qui résilie.
- Prévoir un **statut de portabilité** visible dans le dashboard (soumis / en cours / planifié /
  terminé / rejeté + motif) et des notifications à chaque étape.

### Recommandation MVP
Au tout début, proposer **« nouveau numéro »** par défaut (instantané, zéro friction) et traiter la
**portabilité en « best effort » manuel/assisté** pour les premiers clients. Automatiser le workflow
de portabilité seulement quand le volume le justifie (c'est un epic à part entière).
