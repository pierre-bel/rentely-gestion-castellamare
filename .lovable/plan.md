

# Plan : Intégration GoCardless Bank Account Data

## Objectif
Permettre au host de connecter son compte bancaire via GoCardless (Open Banking), voir les virements entrants, et les assigner manuellement à des réservations pour rapprocher paiements reçus et échéances dues.

## Architecture

```text
┌─────────────┐     ┌──────────────────────┐     ┌──────────────┐
│  Frontend   │────▶│  Edge Function        │────▶│  GoCardless  │
│  (Host UI)  │     │  bank-sync/index.ts   │     │  Bank API    │
│             │◀────│                       │◀────│              │
└─────────────┘     └──────────┬───────────┘     └──────────────┘
                               │
                    ┌──────────▼───────────┐
                    │  bank_transactions   │
                    │  bank_connections    │
                    └──────────────────────┘
```

## Étapes d'implémentation

### 1. Secret GoCardless
- Ajouter le secret `GOCARDLESS_SECRET_ID` et `GOCARDLESS_SECRET_KEY` via l'outil secrets
- Le host n'a rien à configurer côté code

### 2. Tables DB (migration)

**`bank_connections`** — Stocke la connexion bancaire du host
- `id`, `host_user_id`, `requisition_id` (GoCardless), `institution_id`, `institution_name`, `status` (pending/active/expired), `account_id`, `created_at`, `expires_at`
- RLS : host voit/gère uniquement ses connexions

**`bank_transactions`** — Virements importés
- `id`, `host_user_id`, `bank_connection_id`, `external_id` (dedupe), `date`, `amount`, `currency`, `description`, `debtor_name`, `debtor_iban`
- `matched_booking_id` (nullable) — assignation manuelle
- `matched_payment_item_id` (nullable) — assignation à une échéance spécifique
- `matched_at`, `created_at`
- RLS : host voit uniquement ses transactions

### 3. Edge Function `bank-sync/index.ts`

Endpoints via query param `action` :

| Action | Description |
|--------|-------------|
| `get-institutions` | Liste banques FR via GoCardless |
| `create-requisition` | Initie la connexion bancaire (retourne URL de consentement) |
| `check-requisition` | Vérifie le statut après redirection |
| `sync-transactions` | Récupère les virements des 90 derniers jours, upsert dans `bank_transactions` |
| `disconnect` | Supprime la connexion |

Authentification JWT obligatoire. Toutes les clés API restent côté serveur.

### 4. Interface Host — Nouvel onglet "Virements"

Ajout dans `HostPayments.tsx` d'un 3e onglet **"Virements bancaires"** :

**État non connecté :**
- Bouton "Connecter ma banque" → appelle `get-institutions` → affiche liste banques → redirige vers GoCardless pour consentement

**État connecté :**
- Résumé : banque connectée, dernière synchro, bouton "Synchroniser"
- Table des virements entrants : date, montant, description, émetteur
- Colonne "Réservation" avec bouton d'assignation → ouvre un dialog pour matcher avec une réservation existante (recherche par nom/montant)
- Badge vert "Assigné" / gris "Non assigné"
- Bouton "Déconnecter" pour révoquer l'accès

### 5. Composants à créer

| Fichier | Rôle |
|---------|------|
| `src/components/host/BankConnectionCard.tsx` | Statut connexion + boutons sync/déconnexion |
| `src/components/host/BankTransactionsList.tsx` | Table des virements avec filtres |
| `src/components/host/MatchTransactionDialog.tsx` | Dialog pour assigner un virement à une réservation |
| `supabase/functions/bank-sync/index.ts` | Edge Function GoCardless |

### 6. Fichiers modifiés

- `src/components/host/HostPayments.tsx` — Ajout onglet "Virements"
- `src/layouts/HostLayout.tsx` — Titre pour la route (déjà couvert par "Paiements")

### 7. Flux utilisateur

1. Host va dans Paiements → onglet "Virements bancaires"
2. Clique "Connecter ma banque" → choisit sa banque → redirigé vers GoCardless
3. Revient sur l'app → la connexion est confirmée
4. Clique "Synchroniser" → les virements apparaissent
5. Pour chaque virement, clique "Assigner" → cherche la réservation → valide
6. Le virement est marqué comme assigné

### Prérequis

Avant de coder, il faudra que vous créiez un compte GoCardless Bank Account Data (gratuit jusqu'à 100 connexions) sur https://bankaccountdata.gocardless.com et que vous récupériez votre Secret ID + Secret Key.

