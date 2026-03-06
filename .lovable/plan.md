

## Plan : Refonte du volet Paiements

### Contexte actuel
- L'onglet **Paiements** (`HostPaymentsBookingsList`) affiche déjà les réservations avec leurs `booking_payment_items` et un statut (Payé/Acompte payé/Non payé).
- Le `BookingPaymentDetailDialog` permet de cocher les échéances et d'en ajouter.
- Le `BookingDetailDialog` (dans Réservations) affiche les infos de base mais **pas** les échéances de paiement ni les infos complètes du locataire.
- L'import (`ImportBookingsDialog`) ne gère pas les colonnes "acompte payé" / "solde payé".

### Ce qui va être fait

#### 1. Onglet Paiements : recherche, tri par retard, statut "En retard"

**`HostPaymentsBookingsList.tsx`** :
- Ajouter un champ de **recherche** (par nom de locataire, nom du bien).
- Ajouter un 4e statut de paiement **"En retard"** (rouge clignotant) : une échéance est "en retard" si `due_date < today` et `is_paid = false`.
- **Trier** les réservations : en retard en premier, puis non payé, puis acompte payé, puis payé.
- Ajouter une 4e carte résumé "En retard" avec le montant total des échéances en retard.

#### 2. BookingDetailDialog : ajouter infos locataire + échéances de paiement

**`BookingDetailDialog.tsx`** :
- Fetch les données du **locataire** depuis la table `tenants` (via `pricing_breakdown.tenant_id`) : téléphone, adresse complète, email, genre.
- Fetch les **`booking_payment_items`** pour cette réservation.
- Afficher une section "Échéances de paiement" avec la possibilité de :
  - **Cocher** acompte/solde comme payé.
  - **Modifier** la date d'échéance.
  - **Ajouter/supprimer** une échéance.
- Afficher un badge de statut de paiement (Payé / Acompte payé / Non payé / En retard).

#### 3. Import : colonnes "Acompte payé" et "Solde payé"

**`ImportBookingsDialog.tsx`** :
- Ajouter 2 colonnes au template : `Acompte payé (oui/non)` et `Solde payé (oui/non)`.
- Lors de l'import, après création des `booking_payment_items`, marquer les items correspondants comme `is_paid = true` + `paid_at = now()` selon les valeurs oui/non.

### Fichiers modifiés

| Fichier | Action |
|---|---|
| `src/components/host/HostPaymentsBookingsList.tsx` | Recherche, statut "En retard", tri, carte résumé |
| `src/components/host/BookingDetailDialog.tsx` | Infos locataire, échéances de paiement éditables |
| `src/components/host/ImportBookingsDialog.tsx` | Colonnes acompte/solde payé |
| `src/components/host/BookingPaymentDetailDialog.tsx` | Ajout modification de date d'échéance inline |

Aucune migration SQL nécessaire -- les tables `booking_payment_items` et `tenants` existent déjà avec les colonnes requises.

