

# Assistant E-mail IA — Plan par étapes

## Architecture cible

```text
┌─────────────┐    OAuth2     ┌──────────────────┐    fetch     ┌─────────────┐
│  Gmail API  │ ◄──────────── │  sync-gmail-inbox │ ──────────► │ inbox_emails│
│  (readonly) │               │  (edge function)  │             │   (table)   │
└─────────────┘               └──────────────────┘             └──────┬──────┘
                                                                      │
                                                        ┌─────────────┘
                                                        ▼
                                                ┌───────────────┐
                                                │ ai-email-reply│ (existant, à enrichir)
                                                │ Lovable AI    │
                                                └───────┬───────┘
                                                        │
                                                        ▼
                                                ┌───────────────┐
                                                │  UI Inbox     │
                                                │  side-by-side │
                                                └───────────────┘
```

## Phase 1 — Gmail API OAuth2 + Sync (cette étape)

### 1.1 Prérequis utilisateur (Google Cloud Console)
Vous devrez créer un projet Google Cloud et configurer :
- Activer l'API Gmail
- Créer des identifiants OAuth2 (type "Web application")
- Redirect URI : `https://dozejdvuztxlyqkipbae.supabase.co/functions/v1/gmail-oauth-callback`
- Scope : `https://www.googleapis.com/auth/gmail.readonly`

Secrets à fournir : `GMAIL_CLIENT_ID`, `GMAIL_CLIENT_SECRET`

### 1.2 Table `gmail_tokens` (migration)
Stocker les tokens OAuth2 (access_token chiffré, refresh_token, expiry) liés au host_id.

```sql
CREATE TABLE public.gmail_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  host_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  access_token text NOT NULL,
  refresh_token text NOT NULL,
  token_expiry timestamptz NOT NULL,
  gmail_email text,
  last_sync_at timestamptz,
  last_history_id text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.gmail_tokens ENABLE ROW LEVEL SECURITY;
-- RLS: only owner can read their own tokens
```

### 1.3 Edge functions Gmail OAuth
- **`gmail-oauth-start`** : Génère l'URL d'autorisation Google et redirige l'utilisateur
- **`gmail-oauth-callback`** : Reçoit le code, échange contre access/refresh tokens, stocke dans `gmail_tokens`

### 1.4 Edge function `sync-gmail-inbox`
- Lit le refresh token depuis `gmail_tokens`
- Rafraîchit l'access token si expiré
- Appelle Gmail API `messages.list` (filtré sur les nouveaux messages depuis `last_history_id`)
- Pour chaque message : `messages.get` → extrait from, subject, body, date
- Insère dans `inbox_emails` (en évitant les doublons via `gmail_message_id`)
- Met à jour `last_history_id` et `last_sync_at`

### 1.5 Colonne `gmail_message_id` sur `inbox_emails`
Ajout d'une colonne unique pour éviter les doublons lors des syncs répétés.

### 1.6 Ajout de colonnes de statut sur `inbox_emails`
```sql
ALTER TABLE inbox_emails ADD COLUMN status text DEFAULT 'new'; -- new, pending, handled
ALTER TABLE inbox_emails ADD COLUMN ai_draft text;
ALTER TABLE inbox_emails ADD COLUMN gmail_message_id text UNIQUE;
```

## Phase 2 — UI améliorée (même étape ou suivante)

### 2.1 Bouton "Connecter Gmail" dans les paramètres ou l'onglet Emails
- Déclenche le flux OAuth (`gmail-oauth-start`)
- Affiche l'état de connexion (connecté / non connecté)

### 2.2 Bouton "Synchroniser" dans l'onglet Emails
- Appelle `sync-gmail-inbox` manuellement
- Loader pendant la sync

### 2.3 Refonte du panneau de détail email → side-by-side
- **Gauche** : email original (existant)
- **Droite** : panneau IA avec :
  - Champ "Objet" de la réponse (pré-rempli `Re: {sujet}`)
  - Corps du brouillon IA (editable)
  - Bouton "Copier la réponse"
  - Bouton "Regénérer"
  - Sélecteur de statut (Nouveau → En cours → Traité)

### 2.4 Filtres dans la liste des emails
- Filtre par statut (Nouveau / En attente / Traité)
- Badge de statut coloré sur chaque email dans la liste

## Phase 3 — Améliorations futures (hors scope initial)
- Envoi automatique via Resend avec From personnalisé
- Sync automatique par cron (toutes les 5 min)
- Détection de langue automatique dans le prompt IA

---

## Fichiers impactés

| Fichier | Action |
|---|---|
| Migration SQL | Nouvelle table `gmail_tokens` + colonnes `inbox_emails` |
| `supabase/functions/gmail-oauth-start/index.ts` | Nouveau |
| `supabase/functions/gmail-oauth-callback/index.ts` | Nouveau |
| `supabase/functions/sync-gmail-inbox/index.ts` | Nouveau |
| `supabase/config.toml` | Ajouter les 3 nouvelles functions (verify_jwt = false) |
| `src/hooks/useInboxEmails.tsx` | Ajouter statut, ai_draft, bouton sync |
| `src/components/inbox/EmailDetailPanel.tsx` | Refonte side-by-side |
| `src/components/inbox/EmailList.tsx` | Badges de statut, filtre |
| `src/pages/host/Inbox.tsx` | Boutons Connecter Gmail + Synchroniser |

## Première étape proposée
Commencer par la **configuration Google Cloud** de votre côté + stockage des secrets (`GMAIL_CLIENT_ID`, `GMAIL_CLIENT_SECRET`), puis j'implémente les edge functions OAuth + sync + la migration DB.

