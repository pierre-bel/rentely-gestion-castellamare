

# Plan d'implémentation : Avis Host, Statistiques, Contrats

## Phase 1 — Gestion des avis côté Host

**Migration SQL :**
- Ajouter `host_response` (text, nullable) et `host_response_at` (timestamptz, nullable) à la table `reviews`
- Créer une RPC `get_host_reviews` (SECURITY DEFINER) qui retourne les avis des biens du host avec infos profil guest et nom du bien
- RLS policy pour permettre au host de UPDATE `host_response` sur les avis de ses biens

**Fichiers à créer :**
- `src/pages/host/Reviews.tsx` — page wrapper
- `src/components/host/HostReviews.tsx` — dashboard principal avec KPI (note moyenne, répartition étoiles), filtres (par bien, par note), liste des avis
- `src/components/host/HostReviewResponseDialog.tsx` — dialog pour écrire/modifier une réponse

**Fichiers à modifier :**
- `HostSidebar.tsx` — ajouter entrée "Avis" (icone `Star`)
- `HostLayout.tsx` — ajouter titre "Avis" dans `getPageTitle`
- `App.tsx` — ajouter route `/host/reviews`
- `ReviewCard.tsx` — afficher la réponse du host sous l'avis (côté public)

---

## Phase 2 — Statistiques et taux d'occupation

**Migration SQL :**
- Créer une RPC `get_host_statistics` qui calcule par mois et par bien : taux d'occupation (nuits réservées / nuits disponibles), ADR, RevPAR, avec paramètre d'année pour comparaison N vs N-1

**Fichiers à créer :**
- `src/pages/host/Statistics.tsx` — page wrapper
- `src/components/host/HostStatistics.tsx` — 4 KPI cards en haut, graphique linéaire occupation mensuelle (Recharts), graphique barres revenus par bien, toggle comparaison N-1, filtre par bien

**Fichiers à modifier :**
- `HostSidebar.tsx` — ajouter entrée "Statistiques" (icone `BarChart3`)
- `HostLayout.tsx` — ajouter titre
- `App.tsx` — ajouter route `/host/statistics`

---

## Phase 3 — Contrats et documents

**Migration SQL :**
- Table `contract_templates` : `id`, `host_user_id`, `name`, `body_html`, `created_at`, `updated_at` + RLS host-only
- Table `booking_contracts` : `id`, `booking_id`, `template_id`, `generated_html`, `signed_at`, `signature_data`, `created_at` + RLS host + guest via booking
- Bucket storage `contracts` (public: false)

**Fichiers à créer :**
- `src/pages/host/Contracts.tsx` — page wrapper
- `src/components/host/HostContracts.tsx` — 2 onglets : Templates et Contrats générés
- `src/components/host/ContractTemplateEditor.tsx` — éditeur TipTap avec boutons d'insertion de variables (`{{guest_name}}`, `{{checkin_date}}`, `{{total_price}}`, etc.)
- `src/components/host/ContractGenerateDialog.tsx` — sélection template + réservation, prévisualisation, génération
- `src/components/host/ContractPreviewDialog.tsx` — aperçu du contrat généré

**Fichiers à modifier :**
- `HostSidebar.tsx` — ajouter entrée "Contrats" (icone `FileText`)
- `HostLayout.tsx` — ajouter titre
- `App.tsx` — ajouter route `/host/contracts`
- `BookingPortal.tsx` — section "Documents" pour que le locataire voie et signe le contrat
- `BookingDetailDialog.tsx` — bouton "Générer contrat" depuis le détail réservation

---

## Ordre d'exécution

1. **Avis** (le plus léger : 2 colonnes + UI)
2. **Statistiques** (1 RPC + graphiques Recharts)
3. **Contrats** (2 tables + storage + éditeur + portail)

