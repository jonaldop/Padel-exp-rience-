# 04 — Modèle de données principal

Relationnel (PostgreSQL). JSONB pour les payloads bruts de webhooks. Tout horodaté en UTC,
fuseau métier `Europe/Paris`.

## Schéma logique (entités principales)

```
ACCOUNT (entreprise cliente)
  id, company_name, siret, address, country='FR'
  stripe_customer_id, plan ('starter'|'pro'), status ('trial'|'active'|'suspended')
  created_at, updated_at

USER (membre d'un compte)
  id, account_id → ACCOUNT
  email, phone_perso, password_hash, role ('owner'|'admin'|'agent')
  status, last_seen_at, created_at

PHONE_NUMBER (numéro pro)
  id, account_id → ACCOUNT
  e164 (ex +331...), type ('geographic'|'non_geo'|'mobile')
  provider ('telnyx'), provider_number_id
  origin ('new'|'ported'), status ('active'|'porting'|'suspended')
  assigned_user_id → USER (qui sonne, nullable)
  created_at

PORTING_REQUEST (demande de portabilité)
  id, account_id, phone_number_id
  number_e164, rio, holder_name, holder_address, document_url, mandate_signed_at
  status ('submitted'|'in_progress'|'scheduled'|'completed'|'rejected')
  scheduled_date, rejection_reason, provider_ref
  created_at, updated_at

BUSINESS_HOURS (horaires par numéro)
  id, phone_number_id → PHONE_NUMBER
  timezone='Europe/Paris'
  weekly_schedule (JSONB: {mon:[{08:00-12:00},{14:00-18:00}], ...})
  holidays (JSONB: liste de dates fermées)

CALL_FLOW / SETTINGS (comportement d'un numéro)
  id, phone_number_id
  greeting_open_url, greeting_closed_url (S3, ou texte TTS)
  ring_timeout_s, forward_to_mobile (bool), forward_number_e164
  voicemail_enabled (bool), recording_enabled (bool)
  ai_enabled (bool, default false)

CALL (journal d'appels)
  id, account_id, phone_number_id
  direction ('inbound'|'outbound'), from_e164, to_e164
  user_id → USER (qui a traité, nullable)
  status ('completed'|'missed'|'voicemail'|'forwarded'|'failed'|'busy')
  started_at, answered_at, ended_at, duration_s
  recording_url (S3, nullable), cost_amount, cost_currency
  provider_call_id, raw_events (JSONB)
  created_at

VOICEMAIL (message vocal)
  id, call_id → CALL, account_id, phone_number_id
  audio_url (S3), duration_s
  transcription_text, transcription_status ('pending'|'done'|'failed')
  is_read (bool)
  created_at

AI_INSIGHT (V2 — sortie IA sur un appel)
  id, call_id → CALL
  summary, qualification (JSONB: {intent, budget, urgency, lead_score})
  recap_email_sent_at
  created_at

NOTIFICATION
  id, account_id, user_id, type ('missed_call'|'voicemail'|'porting_update'|...)
  channel ('push'|'email'), payload (JSONB), read_at, created_at

DEVICE (terminal pour le push)
  id, user_id → USER
  platform ('ios'|'android'|'web'), push_token, voip_token (PushKit, iOS)
  app_version, last_seen_at

SUBSCRIPTION / USAGE (facturation)
  id, account_id, stripe_subscription_id, plan
  period_start, period_end
  included_minutes, used_minutes_in, used_minutes_out, overage_amount

AUDIT_LOG (traçabilité / RGPD)
  id, account_id, actor_user_id, action, target, metadata (JSONB), created_at
```

## Relations clés

```
ACCOUNT 1───n USER
ACCOUNT 1───n PHONE_NUMBER
PHONE_NUMBER 1───1 BUSINESS_HOURS
PHONE_NUMBER 1───1 CALL_FLOW
PHONE_NUMBER 1───n CALL
CALL 1───0..1 VOICEMAIL
CALL 1───0..1 AI_INSIGHT
USER 1───n DEVICE
ACCOUNT 1───1 SUBSCRIPTION
PHONE_NUMBER 0..1───0..1 PORTING_REQUEST
```

## Notes de conception

- **`CALL.raw_events` (JSONB)** : on garde le payload brut du fournisseur → debug + recalcul de coût
  sans dépendre d'eux.
- **Idempotence** : table `webhook_events (provider_event_id UNIQUE)` pour ignorer les rejeux.
- **Soft delete + rétention** : voicemails/enregistrements ont une durée de rétention configurable
  (RGPD, cf. doc 05) → job de purge.
- **Multi-numéros dès le schéma** (un account a n PHONE_NUMBER) même si le MVP n'en gère qu'un par
  user — évite une migration douloureuse.
- **Coût stocké par appel** (`cost_amount`) → agrégé pour la facturation à l'usage et le suivi de marge.
